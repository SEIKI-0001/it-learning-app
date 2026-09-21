// モチットの Sleep / Wake（無操作で眠くなり、ユーザーが戻ると起きる）の純粋ロジック。
// DOM/React に依存しない。ブラウザイベントの監視は useMochitSleep.ts が担い、
// ここへ「活動した」「学習イベントが来た」「タブの表示が変わった」だけを通知する。
//
// 状態遷移:
//   awake ──(timeoutMs 無操作)──▶ sleepy
//   sleepy ──(ユーザー活動)──▶ awake（reason="activity"＝wakeUp Reaction を出す）
//   sleepy ──(学習イベント)──▶ awake（reason="learning"＝wakeUp は出さず本来の Reaction を即再生）
//   sleepy ──(タブ復帰)──▶ awake（reason="visible"。非表示中は時間を積算しない）
//   sleepy ──(抑制開始＝Semantic Attention content/result)──▶ awake（reason="suppressed"）
//
// タイマーは「最後の活動時刻＋timeoutMs」に1本だけ張る。活動のたびに張り直さず、
// 発火時に経過時間を確かめて足りなければ残り時間で張り直す（scroll 連打でも軽い）。

export type MochitSleepPhase = "awake" | "sleepy";

export type MochitWakeReason = "activity" | "learning" | "visible" | "suppressed" | "manual";

/** 本番の無操作タイムアウト。読んでいるだけで頻繁に眠らないよう 60 秒。 */
export const MOCHIT_SLEEP_TIMEOUT_MS = 60_000;
/** これより短いタイムアウトは受け付けない（文章を読んでいる間に眠らせない） */
export const MOCHIT_SLEEP_MIN_TIMEOUT_MS = 31_000;

/**
 * ユーザー活動として扱う DOM イベント。mousemove は含めない
 * （マウスが机で少し動いただけ・画面を眺めているだけで起き続けないように）。
 */
export const MOCHIT_ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
export type MochitActivityEvent = (typeof MOCHIT_ACTIVITY_EVENTS)[number];

export function isMochitActivityEvent(type: string): type is MochitActivityEvent {
  return (MOCHIT_ACTIVITY_EVENTS as readonly string[]).includes(type);
}

export function clampMochitSleepTimeoutMs(ms: number | undefined): number {
  if (ms === undefined || !Number.isFinite(ms)) return MOCHIT_SLEEP_TIMEOUT_MS;
  return Math.max(MOCHIT_SLEEP_MIN_TIMEOUT_MS, ms);
}

export type MochitSleepTrackerDeps = {
  timeoutMs?: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** awake → sleepy */
  onSleep: () => void;
  /** sleepy → awake */
  onWake: (reason: MochitWakeReason) => void;
};

export type MochitSleepTracker = {
  /** pointerdown / keydown / touchstart / scroll 相当のユーザー活動 */
  activity(): void;
  /** 学習イベント（correct 等）。眠っていれば wakeUp を挟まず即起こす */
  learningEvent(): void;
  /** document.hidden。非表示中はタイマーを止め、復帰時は awake から数え直す */
  setHidden(hidden: boolean): void;
  /** 自動 sleep を抑制する（Semantic Attention が content/result の間など） */
  setSuppressed(suppressed: boolean): void;
  /** dev 用: すぐ眠らせる / 起こす */
  sleepNow(): void;
  wakeNow(reason?: MochitWakeReason): void;
  getPhase(): MochitSleepPhase;
  /** テスト・デバッグ用: タイマーが張られているか */
  isTimerArmed(): boolean;
  dispose(): void;
};

export function createMochitSleepTracker(deps: MochitSleepTrackerDeps): MochitSleepTracker {
  const timeoutMs = clampMochitSleepTimeoutMs(deps.timeoutMs);
  const now = deps.now ?? (() => Date.now());
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let phase: MochitSleepPhase = "awake";
  let hidden = false;
  let suppressed = false;
  let disposed = false;
  let lastActivityAt = now();
  let timer: unknown = null;

  const cancel = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };
  const canCount = () => !disposed && !hidden && !suppressed && phase === "awake";

  const arm = (ms: number) => {
    cancel();
    if (!canCount()) return;
    timer = setTimer(onTimer, Math.max(0, ms));
  };

  function onTimer() {
    timer = null;
    if (!canCount()) return;
    const remaining = lastActivityAt + timeoutMs - now();
    if (remaining > 0) {
      arm(remaining);
      return;
    }
    phase = "sleepy";
    deps.onSleep();
  }

  // 活動時刻を今にして、awake から新しく数え直す
  const restart = () => {
    lastActivityAt = now();
    if (timer === null) arm(timeoutMs);
  };

  const wake = (reason: MochitWakeReason) => {
    if (phase !== "sleepy") return false;
    phase = "awake";
    deps.onWake(reason);
    return true;
  };

  arm(timeoutMs);

  return {
    activity() {
      if (disposed) return;
      wake("activity");
      restart();
    },
    learningEvent() {
      if (disposed) return;
      wake("learning");
      restart();
    },
    setHidden(next) {
      if (disposed || hidden === next) return;
      hidden = next;
      if (hidden) {
        cancel();
        return;
      }
      wake("visible");
      cancel();
      restart();
    },
    setSuppressed(next) {
      if (disposed || suppressed === next) return;
      suppressed = next;
      if (suppressed) {
        cancel();
        wake("suppressed");
        return;
      }
      cancel();
      restart();
    },
    sleepNow() {
      if (disposed || phase === "sleepy") return;
      cancel();
      phase = "sleepy";
      deps.onSleep();
    },
    wakeNow(reason = "manual") {
      if (disposed) return;
      wake(reason);
      cancel();
      restart();
    },
    getPhase: () => phase,
    isTimerArmed: () => timer !== null,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
