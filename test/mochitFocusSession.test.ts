import { describe, expect, it } from "vitest";
import {
  advanceFocusSession,
  appendFocusRecords,
  clampFocusSessionConfig,
  createIdleFocusSession,
  dismissBreakOffer,
  DEFAULT_FOCUS_SESSION_CONFIG,
  endFocusSession,
  FOCUS_BREAK_OFFER_MS,
  FOCUS_LOG_MAX_RECORDS,
  FOCUS_RECORD_MIN_MS,
  FOCUS_SESSION_LIMITS,
  formatFocusRemaining,
  getFocusRemainingMs,
  nextFocusSessionBoundary,
  normalizeFocusLog,
  normalizeFocusSessionState,
  pauseFocusSession,
  resumeFocusSession,
  startBreak,
  startFocus,
  summarizeFocusLog,
  type FocusSessionRecord,
  type FocusSessionState,
} from "@/components/mochit/mochitFocusSession";

const MIN = 60_000;
const T0 = 1_700_000_000_000; // 適当な基準時刻

describe("mochitFocusSession: startFocus", () => {
  it("idle から始めると focus になり、endsAt = now + 25分、focusStarted を出す", () => {
    const idle = createIdleFocusSession();
    const { state, events } = startFocus(idle, T0);
    expect(state.phase).toBe("focus");
    expect(state.segment).toBe("focus");
    expect(state.endsAt).toBe(T0 + 25 * MIN);
    expect(state.segmentMs).toBe(25 * MIN);
    expect(state.focusStartedAt).toBe(T0);
    expect(events).toEqual([{ type: "focusStarted", at: T0 }]);
  });

  it("既に focus 中の startFocus は無変化（no-op）", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const result = startFocus(focusing, T0 + MIN);
    expect(result.state).toBe(focusing);
    expect(result.events).toEqual([]);
  });

  it("休憩中や休憩の一時停止中からも集中を開始できる", () => {
    const { state: breaking } = startBreak(createIdleFocusSession(), T0);
    const { state: focusedFromBreak, events } = startFocus(breaking, T0 + MIN);
    expect(focusedFromBreak.phase).toBe("focus");
    expect(events.some((e) => e.type === "focusStarted")).toBe(true);

    const { state: pausedBreak } = pauseFocusSession(breaking, T0 + MIN);
    expect(pausedBreak.phase).toBe("paused");
    expect(pausedBreak.segment).toBe("break");
    const { state: focusedFromPausedBreak } = startFocus(pausedBreak, T0 + 2 * MIN);
    expect(focusedFromPausedBreak.phase).toBe("focus");
  });
});

describe("mochitFocusSession: pause/resume", () => {
  it("focus を pause すると remainingMs = endsAt - now、resume で endsAt = now + remainingMs（停止時間は数えない）", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const pauseAt = T0 + 10 * MIN;
    const { state: paused } = pauseFocusSession(focusing, pauseAt);
    expect(paused.phase).toBe("paused");
    expect(paused.segment).toBe("focus");
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingMs).toBe(15 * MIN);

    const resumeAt = pauseAt + 3 * MIN; // 3分ポーズしていた
    const { state: resumed } = resumeFocusSession(paused, resumeAt);
    expect(resumed.phase).toBe("focus");
    expect(resumed.endsAt).toBe(resumeAt + 15 * MIN);
    expect(resumed.remainingMs).toBeNull();
  });

  it("break も pause/resume できる", () => {
    const { state: breaking } = startBreak(createIdleFocusSession(), T0);
    const pauseAt = T0 + MIN;
    const { state: paused } = pauseFocusSession(breaking, pauseAt);
    expect(paused.phase).toBe("paused");
    expect(paused.segment).toBe("break");
    expect(paused.remainingMs).toBe(4 * MIN);

    const resumeAt = pauseAt + 2 * MIN;
    const { state: resumed } = resumeFocusSession(paused, resumeAt);
    expect(resumed.phase).toBe("break");
    expect(resumed.endsAt).toBe(resumeAt + 4 * MIN);
  });

  it("idle での pause は無変化。paused でない状態での resume も無変化", () => {
    const idle = createIdleFocusSession();
    expect(pauseFocusSession(idle, T0).state).toBe(idle);
    expect(resumeFocusSession(idle, T0).state).toBe(idle);
  });

  it("resume で remainingMs が 0 ならその場で完了する", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    // pauseFocusSession は endsAt <= now だと先に完了させてしまうため、
    // 「remainingMs が 0 の paused」はここでは直接組み立てて検証する
    // （保存データの復元など、pause 操作以外の経路でも起こりうる状態）。
    const paused: FocusSessionState = { ...focusing, phase: "paused", endsAt: null, remainingMs: 0 };
    expect(paused.remainingMs).toBe(0);
    const { state: resumed, events, records } = resumeFocusSession(paused, T0 + 30 * MIN);
    expect(resumed.phase).toBe("idle");
    expect(events).toEqual([{ type: "focusCompleted", at: T0 + 30 * MIN, focusedMs: 25 * MIN }]);
    expect(records).toHaveLength(1);
    expect(records[0].completed).toBe(true);
  });
});

describe("mochitFocusSession: advanceFocusSession（focus 完了）", () => {
  it("endsAt ちょうど、または過ぎたら idle になり breakOfferUntil をセット、focusCompleted を at=endsAt で出す", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const endsAt = focusing.endsAt as number;

    const exact = advanceFocusSession(focusing, endsAt);
    expect(exact.state.phase).toBe("idle");
    expect(exact.state.breakOfferUntil).toBe(endsAt + FOCUS_BREAK_OFFER_MS);
    expect(exact.events).toEqual([{ type: "focusCompleted", at: endsAt, focusedMs: 25 * MIN }]);
    expect(exact.records).toEqual([
      {
        id: `focus-${T0}`,
        startedAt: T0,
        endedAt: endsAt,
        plannedMs: 25 * MIN,
        focusedMs: 25 * MIN,
        completed: true,
      },
    ]);
  });

  it("タブが3分隠れていても at は本来の endsAt のまま（now でずれない）", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const endsAt = focusing.endsAt as number;
    const muchLater = endsAt + 3 * MIN;
    const { events, records } = advanceFocusSession(focusing, muchLater);
    expect(events).toEqual([{ type: "focusCompleted", at: endsAt, focusedMs: 25 * MIN }]);
    expect(records[0].endedAt).toBe(endsAt);
  });

  it("endsAt 前は無変化（同一オブジェクト参照）", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const result = advanceFocusSession(focusing, (focusing.endsAt as number) - 1);
    expect(result.state).toBe(focusing);
    expect(result.events).toEqual([]);
    expect(result.records).toEqual([]);
  });
});

describe("mochitFocusSession: hidden tab シナリオ", () => {
  it("t0 開始 → t0+30分で一気に advance しても二重カウントなしの単発完了イベント", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const endsAt = focusing.endsAt as number; // T0 + 25min
    const { state, events, records } = advanceFocusSession(focusing, T0 + 30 * MIN);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "focusCompleted", at: endsAt, focusedMs: 25 * MIN });
    expect(records).toHaveLength(1);
    expect(state.phase).toBe("idle");
  });

  it("休憩提案の期限(endsAt+10分)も過ぎていれば breakOfferUntil は既に null", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const endsAt = focusing.endsAt as number;
    const farFuture = endsAt + FOCUS_BREAK_OFFER_MS + MIN;
    const { state } = advanceFocusSession(focusing, farFuture);
    expect(state.phase).toBe("idle");
    expect(state.breakOfferUntil).toBeNull();
  });
});

describe("mochitFocusSession: startBreak / break 完了", () => {
  it("idle(休憩提案あり)から休憩を始めると break になり5分、breakStarted を出す", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const endsAt = focusing.endsAt as number;
    const { state: idleWithOffer } = advanceFocusSession(focusing, endsAt);
    expect(idleWithOffer.breakOfferUntil).not.toBeNull();

    const startAt = endsAt + MIN;
    const { state: breaking, events } = startBreak(idleWithOffer, startAt);
    expect(breaking.phase).toBe("break");
    expect(breaking.segment).toBe("break");
    expect(breaking.endsAt).toBe(startAt + 5 * MIN);
    expect(breaking.segmentMs).toBe(5 * MIN);
    expect(events.some((e) => e.type === "breakStarted")).toBe(true);
  });

  it("休憩を最後まで終えると breakCompleted を出して idle に戻る（記録は残さない）", () => {
    const { state: breaking } = startBreak(createIdleFocusSession(), T0);
    const endsAt = breaking.endsAt as number;
    const { state, events, records } = advanceFocusSession(breaking, endsAt);
    expect(state.phase).toBe("idle");
    expect(state.breakOfferUntil).toBeNull();
    expect(events).toEqual([{ type: "breakCompleted", at: endsAt }]);
    expect(records).toEqual([]);
  });

  it("集中区間の途中では休憩を始められない（no-op）", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const result = startBreak(focusing, T0 + MIN);
    expect(result.state).toBe(focusing);
  });
});

describe("mochitFocusSession: endFocusSession", () => {
  it("10分集中(途中2分ポーズ)して終了すると、経過は残り時間から計算され completed:false", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    // 4分集中 → 2分ポーズ → 再開 → 6分集中 → end (合計 wall clock 12分だが集中時間は10分)
    const { state: paused } = pauseFocusSession(focusing, T0 + 4 * MIN);
    expect(paused.remainingMs).toBe(21 * MIN);
    const resumeAt = T0 + 6 * MIN; // 2分ポーズ
    const { state: resumed } = resumeFocusSession(paused, resumeAt);
    const endAt = resumeAt + 6 * MIN; // さらに6分集中 (合計focused = 4+6=10分)
    const { state, records } = endFocusSession(resumed, endAt);
    expect(state.phase).toBe("idle");
    expect(records).toHaveLength(1);
    expect(records[0].completed).toBe(false);
    expect(records[0].focusedMs).toBe(10 * MIN);
    expect(records[0].startedAt).toBe(T0);
    expect(records[0].endedAt).toBe(endAt);
  });

  it("60秒未満で終了すると記録を残さない（FOCUS_RECORD_MIN_MS）", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const { records } = endFocusSession(focusing, T0 + FOCUS_RECORD_MIN_MS - 1);
    expect(records).toEqual([]);
  });

  it("ちょうど FOCUS_RECORD_MIN_MS なら記録される", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const { records } = endFocusSession(focusing, T0 + FOCUS_RECORD_MIN_MS);
    expect(records).toHaveLength(1);
  });

  it("idle(休憩提案あり)で end すると提案だけ消える", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const endsAt = focusing.endsAt as number;
    const { state: idleWithOffer } = advanceFocusSession(focusing, endsAt);
    const { state } = endFocusSession(idleWithOffer, endsAt + MIN);
    expect(state.phase).toBe("idle");
    expect(state.breakOfferUntil).toBeNull();
  });

  it("完全な idle（提案なし）で end しても無変化", () => {
    const idle = createIdleFocusSession();
    const result = endFocusSession(idle, T0);
    expect(result.state).toBe(idle);
  });

  it("休憩中に end しても記録は残さない", () => {
    const { state: breaking } = startBreak(createIdleFocusSession(), T0);
    const { state, records } = endFocusSession(breaking, T0 + 2 * MIN);
    expect(state.phase).toBe("idle");
    expect(records).toEqual([]);
  });
});

describe("mochitFocusSession: dismissBreakOffer", () => {
  it("休憩提案を取り下げる", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    const endsAt = focusing.endsAt as number;
    const { state: idleWithOffer } = advanceFocusSession(focusing, endsAt);
    const { state } = dismissBreakOffer(idleWithOffer);
    expect(state.phase).toBe("idle");
    expect(state.breakOfferUntil).toBeNull();
  });

  it("提案が無ければ無変化", () => {
    const idle = createIdleFocusSession();
    const result = dismissBreakOffer(idle);
    expect(result.state).toBe(idle);
  });
});

describe("mochitFocusSession: getFocusRemainingMs / formatFocusRemaining", () => {
  it("getFocusRemainingMs は focus/break/paused/idle それぞれ正しい", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    expect(getFocusRemainingMs(focusing, T0)).toBe(25 * MIN);
    expect(getFocusRemainingMs(focusing, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(getFocusRemainingMs(focusing, (focusing.endsAt as number) + MIN)).toBe(0);

    const { state: paused } = pauseFocusSession(focusing, T0 + 10 * MIN);
    expect(getFocusRemainingMs(paused, T0 + 999_999)).toBe(15 * MIN);

    expect(getFocusRemainingMs(createIdleFocusSession(), T0)).toBe(0);
  });

  it("formatFocusRemaining: 開始直後は 25:00、端数は切り上げ、0/負は 00:00", () => {
    expect(formatFocusRemaining(25 * MIN)).toBe("25:00");
    expect(formatFocusRemaining(18 * MIN + 42_000)).toBe("18:42");
    expect(formatFocusRemaining(1)).toBe("00:01");
    expect(formatFocusRemaining(0)).toBe("00:00");
    expect(formatFocusRemaining(-100)).toBe("00:00");
    // 端数秒は切り上げ: 1000ms + 1ms 残っていれば 2 秒表示
    expect(formatFocusRemaining(1001)).toBe("00:02");
  });
});

describe("mochitFocusSession: clampFocusSessionConfig / createIdleFocusSession", () => {
  it("範囲外は端に寄せ、数値以外はデフォルトへ", () => {
    expect(clampFocusSessionConfig({})).toEqual(DEFAULT_FOCUS_SESSION_CONFIG);
    expect(clampFocusSessionConfig({ focusMs: 1 })).toEqual({
      focusMs: FOCUS_SESSION_LIMITS.minMs,
      breakMs: DEFAULT_FOCUS_SESSION_CONFIG.breakMs,
    });
    expect(clampFocusSessionConfig({ focusMs: 999 * MIN }).focusMs).toBe(FOCUS_SESSION_LIMITS.maxFocusMs);
    expect(clampFocusSessionConfig({ breakMs: 999 * MIN }).breakMs).toBe(FOCUS_SESSION_LIMITS.maxBreakMs);
    expect(clampFocusSessionConfig({ focusMs: Number.NaN }).focusMs).toBe(DEFAULT_FOCUS_SESSION_CONFIG.focusMs);
    expect(clampFocusSessionConfig({ focusMs: "abc" as unknown as number }).focusMs).toBe(
      DEFAULT_FOCUS_SESSION_CONFIG.focusMs,
    );
  });

  it("createIdleFocusSession のカスタム設定は startFocus に反映される", () => {
    const idle = createIdleFocusSession({ focusMs: 10 * MIN, breakMs: 2 * MIN });
    const { state: focusing } = startFocus(idle, T0);
    expect(focusing.segmentMs).toBe(10 * MIN);
    expect(focusing.endsAt).toBe(T0 + 10 * MIN);
    const endsAt = focusing.endsAt as number;
    const { state: idleAfter } = advanceFocusSession(focusing, endsAt);
    const { state: breaking } = startBreak(idleAfter, endsAt + MIN);
    expect(breaking.segmentMs).toBe(2 * MIN);
  });
});

describe("mochitFocusSession: normalizeFocusSessionState", () => {
  it("各 phase の JSON ラウンドトリップ", () => {
    const idle = createIdleFocusSession();
    expect(normalizeFocusSessionState(JSON.parse(JSON.stringify(idle)))).toEqual(idle);

    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    expect(normalizeFocusSessionState(JSON.parse(JSON.stringify(focusing)))).toEqual(focusing);

    const { state: breaking } = startBreak(createIdleFocusSession(), T0);
    expect(normalizeFocusSessionState(JSON.parse(JSON.stringify(breaking)))).toEqual(breaking);

    const { state: paused } = pauseFocusSession(focusing, T0 + MIN);
    expect(normalizeFocusSessionState(JSON.parse(JSON.stringify(paused)))).toEqual(paused);

    const endsAt = focusing.endsAt as number;
    const { state: idleWithOffer } = advanceFocusSession(focusing, endsAt);
    expect(normalizeFocusSessionState(JSON.parse(JSON.stringify(idleWithOffer)))).toEqual(idleWithOffer);
  });

  it("矛盾したデータ・不正なバージョン・NaN は idle に倒す", () => {
    expect(normalizeFocusSessionState(null)).toEqual(createIdleFocusSession());
    expect(normalizeFocusSessionState(undefined)).toEqual(createIdleFocusSession());
    expect(normalizeFocusSessionState("garbage")).toEqual(createIdleFocusSession());
    expect(normalizeFocusSessionState({})).toEqual(createIdleFocusSession());
    expect(normalizeFocusSessionState({ version: 2, phase: "focus" })).toEqual(createIdleFocusSession());
    expect(
      normalizeFocusSessionState({ version: 1, phase: "focus", segment: "focus", segmentMs: 1000 }), // endsAt 無し
    ).toEqual(createIdleFocusSession());
    expect(
      normalizeFocusSessionState({
        version: 1,
        phase: "focus",
        segment: "focus",
        segmentMs: 1000,
        endsAt: Number.NaN,
      }),
    ).toEqual(createIdleFocusSession());
    expect(
      normalizeFocusSessionState({ version: 1, phase: "paused", segment: "focus", segmentMs: 1000, remainingMs: -1 }),
    ).toEqual(createIdleFocusSession());
    expect(normalizeFocusSessionState({ version: 1, phase: "not-a-phase" })).toEqual(createIdleFocusSession());
  });

  it("paused の remainingMs は segmentMs を超えない範囲に丸める", () => {
    const raw = {
      version: 1,
      phase: "paused",
      segment: "focus",
      segmentMs: 1000,
      remainingMs: 5000,
    };
    const result = normalizeFocusSessionState(raw);
    expect(result.remainingMs).toBe(1000);
  });
});

describe("mochitFocusSession: appendFocusRecords / normalizeFocusLog / summarizeFocusLog", () => {
  const rec = (id: string, endedAt: number, focusedMs = 25 * MIN, completed = true): FocusSessionRecord => ({
    id,
    startedAt: endedAt - focusedMs,
    endedAt,
    plannedMs: 25 * MIN,
    focusedMs,
    completed,
  });

  it("id で重複を除き、上限を超えたら古いものから捨てる", () => {
    const log = [rec("a", 1)];
    const appended = appendFocusRecords(log, [rec("a", 1), rec("b", 2)]);
    expect(appended.map((r) => r.id)).toEqual(["a", "b"]);

    const bigLog = Array.from({ length: FOCUS_LOG_MAX_RECORDS }, (_, i) => rec(`r${i}`, i));
    const capped = appendFocusRecords(bigLog, [rec("new", 99999)]);
    expect(capped).toHaveLength(FOCUS_LOG_MAX_RECORDS);
    expect(capped[capped.length - 1].id).toBe("new");
    expect(capped[0].id).toBe("r1");
  });

  it("記録が空なら何もしない（新配列を返すが中身は同じ）", () => {
    const log = [rec("a", 1)];
    expect(appendFocusRecords(log, [])).toEqual(log);
  });

  it("normalizeFocusLog は不正な要素を除去する", () => {
    expect(normalizeFocusLog(null)).toEqual([]);
    expect(normalizeFocusLog("garbage")).toEqual([]);
    const good = rec("a", 1000);
    const result = normalizeFocusLog([good, {}, { id: "bad" }, null, 42]);
    expect(result).toEqual([good]);
  });

  it("summarizeFocusLog は [from,to) の完了数と集中時間を集計する", () => {
    const log = [rec("a", 1000, 10 * MIN, true), rec("b", 2000, 5 * MIN, false), rec("c", 5000, 25 * MIN, true)];
    const summary = summarizeFocusLog(log, { from: 0, to: 3000 });
    expect(summary.completedCount).toBe(1);
    expect(summary.focusedMs).toBe(15 * MIN);

    const summaryAll = summarizeFocusLog(log, { from: 0, to: 6000 });
    expect(summaryAll.completedCount).toBe(2);
    expect(summaryAll.focusedMs).toBe(40 * MIN);
  });
});

describe("mochitFocusSession: nextFocusSessionBoundary", () => {
  it("focus/break は endsAt、idle(提案あり)は breakOfferUntil、それ以外は null", () => {
    const { state: focusing } = startFocus(createIdleFocusSession(), T0);
    expect(nextFocusSessionBoundary(focusing)).toBe(focusing.endsAt);

    const { state: breaking } = startBreak(createIdleFocusSession(), T0);
    expect(nextFocusSessionBoundary(breaking)).toBe(breaking.endsAt);

    const endsAt = focusing.endsAt as number;
    const { state: idleWithOffer } = advanceFocusSession(focusing, endsAt);
    expect(nextFocusSessionBoundary(idleWithOffer)).toBe(idleWithOffer.breakOfferUntil);

    expect(nextFocusSessionBoundary(createIdleFocusSession())).toBeNull();

    const { state: paused } = pauseFocusSession(focusing, T0 + MIN);
    expect(nextFocusSessionBoundary(paused)).toBeNull();
  });
});
