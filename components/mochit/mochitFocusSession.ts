// もちっとと一緒に集中する Focus Session（集中タイマー）の純粋ロジック。
// DOM/React/タイマー/保存に依存しない。永続化と完了検知は mochitFocusSessionStore.ts が担う。
//
// 時間は必ず絶対時刻（epoch ms）で持つ。走行中は「終わる時刻 endsAt」、一時停止中は
// 「残り時間 remainingMs」だけを保存し、setInterval の回数では数えない。
// そのためタブ非表示・ページ遷移・リロードを挟んでも now さえ渡せば正しい残り時間になる。
//
// 状態遷移（phase）:
//   idle ──startFocus──▶ focus ──(endsAt 到達)──▶ idle（休憩を提案＝breakOfferUntil）
//   focus / break ──pause──▶ paused ──resume──▶ focus / break
//   idle ──startBreak──▶ break ──(endsAt 到達)──▶ idle
//   どこからでも ──end──▶ idle（集中区間の途中なら「途中まで」の記録を残す）
// 休憩は自動では始めない（集中が終わったら休憩するかをユーザーが選ぶ）。

export type FocusTimerPhase = "idle" | "focus" | "paused" | "break";
export type FocusSegment = "focus" | "break";

export type FocusSessionConfig = {
  focusMs: number;
  breakMs: number;
};

export const DEFAULT_FOCUS_SESSION_CONFIG: Readonly<FocusSessionConfig> = Object.freeze({
  focusMs: 25 * 60_000,
  breakMs: 5 * 60_000,
});

/** 設定で受け付ける範囲（将来の設定画面用）。範囲外は端へ寄せる */
export const FOCUS_SESSION_LIMITS = Object.freeze({
  minMs: 60_000,
  maxFocusMs: 120 * 60_000,
  maxBreakMs: 60 * 60_000,
});

/** 集中完了後に「休憩する？」を出しておく時間。過ぎたら提案は消える */
export const FOCUS_BREAK_OFFER_MS = 10 * 60_000;

/** これより短い集中（誤タップで開始してすぐ終了など）は記録しない */
export const FOCUS_RECORD_MIN_MS = 60_000;

export type FocusSessionState = {
  version: 1;
  phase: FocusTimerPhase;
  /** 今の区間（focus / break）。paused ではどちらを止めているか。idle では null */
  segment: FocusSegment | null;
  /** 走行中の区間が終わる時刻（epoch ms）。paused / idle では null */
  endsAt: number | null;
  /** paused 中の残り時間。それ以外は null */
  remainingMs: number | null;
  /** 今の区間の計画上の長さ */
  segmentMs: number;
  /** 今の集中区間を始めた時刻（記録用）。集中区間の外では null */
  focusStartedAt: number | null;
  /** 集中完了後の休憩提案の期限（idle のみ）。提案が無ければ null */
  breakOfferUntil: number | null;
  config: FocusSessionConfig;
};

/** 1回の集中区間の記録（完了・途中終了とも）。既存の学習記録とは別の、端末ローカルの記録 */
export type FocusSessionRecord = {
  /** 重複記録（複数タブ）を防ぐための ID。集中開始時刻から作る */
  id: string;
  startedAt: number;
  endedAt: number;
  /** 計画した集中時間 */
  plannedMs: number;
  /** 実際に集中していた時間（一時停止中は含まない） */
  focusedMs: number;
  /** 計画どおり最後まで集中したか */
  completed: boolean;
};

export type FocusSessionEvent =
  /** 集中を始めた（ユーザー操作） */
  | { type: "focusStarted"; at: number }
  /** 休憩を始めた（ユーザー操作） */
  | { type: "breakStarted"; at: number }
  /** 集中区間が最後まで終わった。at は本来の終了時刻（タブ復帰で遅れて検知しても endsAt） */
  | { type: "focusCompleted"; at: number; focusedMs: number }
  /** 休憩区間が終わった */
  | { type: "breakCompleted"; at: number };

export type FocusSessionTransition = {
  state: FocusSessionState;
  events: FocusSessionEvent[];
  records: FocusSessionRecord[];
};

export function clampFocusSessionConfig(config: Partial<FocusSessionConfig> = {}): FocusSessionConfig {
  const pick = (value: number | undefined, fallback: number, max: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(Math.min(max, Math.max(FOCUS_SESSION_LIMITS.minMs, value)))
      : fallback;
  return {
    focusMs: pick(config.focusMs, DEFAULT_FOCUS_SESSION_CONFIG.focusMs, FOCUS_SESSION_LIMITS.maxFocusMs),
    breakMs: pick(config.breakMs, DEFAULT_FOCUS_SESSION_CONFIG.breakMs, FOCUS_SESSION_LIMITS.maxBreakMs),
  };
}

export function createIdleFocusSession(config: Partial<FocusSessionConfig> = {}): FocusSessionState {
  return {
    version: 1,
    phase: "idle",
    segment: null,
    endsAt: null,
    remainingMs: null,
    segmentMs: 0,
    focusStartedAt: null,
    breakOfferUntil: null,
    config: clampFocusSessionConfig(config),
  };
}

const unchanged = (state: FocusSessionState): FocusSessionTransition => ({ state, events: [], records: [] });

function focusRecord(state: FocusSessionState, endedAt: number, focusedMs: number, completed: boolean): FocusSessionRecord[] {
  if (state.focusStartedAt === null || focusedMs < FOCUS_RECORD_MIN_MS) return [];
  return [
    {
      id: `focus-${state.focusStartedAt}`,
      startedAt: state.focusStartedAt,
      endedAt,
      plannedMs: state.segmentMs,
      focusedMs: Math.round(focusedMs),
      completed,
    },
  ];
}

/**
 * now までに終わった区間を確定させる。集中の完了・休憩の終了はここでだけ起きる。
 * タブ非表示で長く離れていても、終了時刻は本来の endsAt で記録する。
 */
export function advanceFocusSession(state: FocusSessionState, now: number): FocusSessionTransition {
  if ((state.phase === "focus" || state.phase === "break") && state.endsAt !== null && state.endsAt <= now) {
    const at = state.endsAt;
    const idle = createIdleFocusSession(state.config);
    if (state.phase === "focus") {
      const next: FocusSessionState = { ...idle, breakOfferUntil: at + FOCUS_BREAK_OFFER_MS };
      // 提案の期限も過ぎていれば続けて消す
      const settled = advanceFocusSession(next, now).state;
      return {
        state: settled,
        events: [{ type: "focusCompleted", at, focusedMs: state.segmentMs }],
        records: focusRecord(state, at, state.segmentMs, true),
      };
    }
    return { state: idle, events: [{ type: "breakCompleted", at }], records: [] };
  }
  if (state.phase === "idle" && state.breakOfferUntil !== null && state.breakOfferUntil <= now) {
    return unchanged({ ...state, breakOfferUntil: null });
  }
  return unchanged(state);
}

/** 集中を始める。idle からだけでなく、休憩中・休憩の一時停止中から「もう集中する」もできる */
export function startFocus(state: FocusSessionState, now: number): FocusSessionTransition {
  const settled = advanceFocusSession(state, now);
  const current = settled.state;
  if (current.phase === "focus" || (current.phase === "paused" && current.segment === "focus")) return settled;
  const focusMs = current.config.focusMs;
  return {
    ...settled,
    events: [...settled.events, { type: "focusStarted", at: now }],
    state: {
      ...createIdleFocusSession(current.config),
      phase: "focus",
      segment: "focus",
      endsAt: now + focusMs,
      segmentMs: focusMs,
      focusStartedAt: now,
    },
  };
}

/** 休憩を始める。集中区間の途中では始めない（先に終了してから） */
export function startBreak(state: FocusSessionState, now: number): FocusSessionTransition {
  const settled = advanceFocusSession(state, now);
  const current = settled.state;
  if (current.phase !== "idle") return settled;
  const breakMs = current.config.breakMs;
  return {
    ...settled,
    events: [...settled.events, { type: "breakStarted", at: now }],
    state: {
      ...createIdleFocusSession(current.config),
      phase: "break",
      segment: "break",
      endsAt: now + breakMs,
      segmentMs: breakMs,
    },
  };
}

export function pauseFocusSession(state: FocusSessionState, now: number): FocusSessionTransition {
  const settled = advanceFocusSession(state, now);
  const current = settled.state;
  if ((current.phase !== "focus" && current.phase !== "break") || current.endsAt === null) return settled;
  return {
    ...settled,
    state: { ...current, phase: "paused", endsAt: null, remainingMs: Math.max(0, current.endsAt - now) },
  };
}

export function resumeFocusSession(state: FocusSessionState, now: number): FocusSessionTransition {
  if (state.phase !== "paused" || state.segment === null || state.remainingMs === null) return unchanged(state);
  const resumed: FocusSessionState = {
    ...state,
    phase: state.segment,
    endsAt: now + state.remainingMs,
    remainingMs: null,
  };
  // 残り 0 で止めていた場合はその場で完了させる
  return advanceFocusSession(resumed, now);
}

/** セッションを終える。集中区間の途中なら、そこまでの集中時間を「途中まで」として記録する */
export function endFocusSession(state: FocusSessionState, now: number): FocusSessionTransition {
  const settled = advanceFocusSession(state, now);
  const current = settled.state;
  if (current.phase === "idle") {
    if (current.breakOfferUntil === null) return settled;
    return { ...settled, state: { ...current, breakOfferUntil: null } };
  }
  const records =
    current.segment === "focus"
      ? focusRecord(current, now, current.segmentMs - getFocusRemainingMs(current, now), false)
      : [];
  return {
    state: createIdleFocusSession(current.config),
    events: settled.events,
    records: [...settled.records, ...records],
  };
}

/** 休憩の提案だけを取り下げる（「今はいい」） */
export function dismissBreakOffer(state: FocusSessionState): FocusSessionTransition {
  if (state.phase !== "idle" || state.breakOfferUntil === null) return unchanged(state);
  return unchanged({ ...state, breakOfferUntil: null });
}

export function getFocusRemainingMs(state: FocusSessionState, now: number): number {
  if (state.phase === "paused") return Math.max(0, state.remainingMs ?? 0);
  if ((state.phase === "focus" || state.phase === "break") && state.endsAt !== null) {
    return Math.max(0, state.endsAt - now);
  }
  return 0;
}

/** 次に状態が自然に変わる時刻（区間の終了・休憩提案の期限）。無ければ null */
export function nextFocusSessionBoundary(state: FocusSessionState): number | null {
  if (state.phase === "focus" || state.phase === "break") return state.endsAt;
  if (state.phase === "idle") return state.breakOfferUntil;
  return null;
}

export function hasFocusBreakOffer(state: FocusSessionState): boolean {
  return state.phase === "idle" && state.breakOfferUntil !== null;
}

/** 残り時間の表示（mm:ss）。秒は切り上げ＝開始直後は 25:00、最後の1秒は 00:01 */
export function formatFocusRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ---- 保存形式の検証 ----

const PHASES: readonly FocusTimerPhase[] = ["idle", "focus", "paused", "break"];

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * 保存データ（JSON.parse 済み）を検証して状態へ戻す。形が壊れていれば idle。
 * 矛盾した組み合わせ（focus なのに endsAt が無い等）も idle に倒す。
 */
export function normalizeFocusSessionState(raw: unknown): FocusSessionState {
  if (!raw || typeof raw !== "object") return createIdleFocusSession();
  const value = raw as Record<string, unknown>;
  const configRaw = (value.config ?? {}) as Record<string, unknown>;
  const config = clampFocusSessionConfig({
    focusMs: finiteOrNull(configRaw.focusMs) ?? undefined,
    breakMs: finiteOrNull(configRaw.breakMs) ?? undefined,
  });
  const idle = createIdleFocusSession(config);
  if (value.version !== 1 || !PHASES.includes(value.phase as FocusTimerPhase)) return idle;
  const phase = value.phase as FocusTimerPhase;
  const segment = value.segment === "focus" || value.segment === "break" ? value.segment : null;
  const endsAt = finiteOrNull(value.endsAt);
  const remainingMs = finiteOrNull(value.remainingMs);
  const segmentMs = finiteOrNull(value.segmentMs);
  const focusStartedAt = finiteOrNull(value.focusStartedAt);
  if (phase === "idle") {
    return { ...idle, breakOfferUntil: finiteOrNull(value.breakOfferUntil) };
  }
  if (segment === null || segmentMs === null || segmentMs <= 0) return idle;
  if ((phase === "focus" || phase === "break") && (segment !== phase || endsAt === null)) return idle;
  if (phase === "paused" && (remainingMs === null || remainingMs < 0)) return idle;
  return {
    ...idle,
    phase,
    segment,
    endsAt: phase === "paused" ? null : endsAt,
    remainingMs: phase === "paused" ? Math.min(remainingMs as number, segmentMs) : null,
    segmentMs,
    focusStartedAt: segment === "focus" ? focusStartedAt : null,
  };
}

// ---- 記録（端末ローカル） ----

/** 保存しておく記録の上限（古いものから捨てる） */
export const FOCUS_LOG_MAX_RECORDS = 200;

export function appendFocusRecords(
  log: readonly FocusSessionRecord[],
  records: readonly FocusSessionRecord[],
  max = FOCUS_LOG_MAX_RECORDS,
): FocusSessionRecord[] {
  if (records.length === 0) return [...log];
  const ids = new Set(log.map((record) => record.id));
  const next = [...log];
  for (const record of records) {
    if (ids.has(record.id)) continue;
    ids.add(record.id);
    next.push(record);
  }
  return next.slice(Math.max(0, next.length - max));
}

export function normalizeFocusLog(raw: unknown): FocusSessionRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): FocusSessionRecord[] => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const startedAt = finiteOrNull(r.startedAt);
    const endedAt = finiteOrNull(r.endedAt);
    const plannedMs = finiteOrNull(r.plannedMs);
    const focusedMs = finiteOrNull(r.focusedMs);
    if (typeof r.id !== "string" || startedAt === null || endedAt === null || plannedMs === null || focusedMs === null) {
      return [];
    }
    return [{ id: r.id, startedAt, endedAt, plannedMs, focusedMs, completed: r.completed === true }];
  });
}

export type FocusLogSummary = {
  /** 最後まで集中できた回数 */
  completedCount: number;
  /** 集中していた合計時間（途中終了も含む） */
  focusedMs: number;
};

/** [from, to) に終わった記録を集計する（日単位の集計は呼び出し側がローカル日付の境界を渡す） */
export function summarizeFocusLog(
  log: readonly FocusSessionRecord[],
  range: { from: number; to: number },
): FocusLogSummary {
  let completedCount = 0;
  let focusedMs = 0;
  for (const record of log) {
    if (record.endedAt < range.from || record.endedAt >= range.to) continue;
    if (record.completed) completedCount += 1;
    focusedMs += record.focusedMs;
  }
  return { completedCount, focusedMs };
}
