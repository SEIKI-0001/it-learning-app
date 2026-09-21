import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampMochitSleepTimeoutMs,
  createMochitSleepTracker,
  isMochitActivityEvent,
  MOCHIT_ACTIVITY_EVENTS,
  MOCHIT_SLEEP_MIN_TIMEOUT_MS,
  MOCHIT_SLEEP_TIMEOUT_MS,
  type MochitWakeReason,
} from "@/components/mochit/mochitSleep";

let wakes: MochitWakeReason[] = [];
let sleeps = 0;

function makeTracker(timeoutMs?: number) {
  return createMochitSleepTracker({
    timeoutMs,
    onSleep: () => {
      sleeps += 1;
    },
    onWake: (reason) => {
      wakes.push(reason);
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  wakes = [];
  sleeps = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("mochitSleep: 定数", () => {
  it("本番タイムアウトは60秒・30秒以下にはできない", () => {
    expect(MOCHIT_SLEEP_TIMEOUT_MS).toBe(60_000);
    expect(MOCHIT_SLEEP_MIN_TIMEOUT_MS).toBeGreaterThan(30_000);
    expect(clampMochitSleepTimeoutMs(5_000)).toBe(MOCHIT_SLEEP_MIN_TIMEOUT_MS);
    expect(clampMochitSleepTimeoutMs(30_000)).toBeGreaterThan(30_000);
    expect(clampMochitSleepTimeoutMs(undefined)).toBe(60_000);
    expect(clampMochitSleepTimeoutMs(Number.NaN)).toBe(60_000);
    expect(clampMochitSleepTimeoutMs(90_000)).toBe(90_000);
  });

  it("活動イベントは pointerdown/keydown/touchstart/scroll。mousemove は含めない", () => {
    expect([...MOCHIT_ACTIVITY_EVENTS].sort()).toEqual(["keydown", "pointerdown", "scroll", "touchstart"]);
    expect(isMochitActivityEvent("mousemove")).toBe(false);
    expect(isMochitActivityEvent("pointermove")).toBe(false);
    expect(isMochitActivityEvent("scroll")).toBe(true);
  });
});

describe("mochitSleep: inactivity", () => {
  it("60秒未満では sleepy にならず、60秒で sleepy になる", () => {
    const t = makeTracker();
    vi.advanceTimersByTime(59_999);
    expect(t.getPhase()).toBe("awake");
    expect(sleeps).toBe(0);
    vi.advanceTimersByTime(1);
    expect(t.getPhase()).toBe("sleepy");
    expect(sleeps).toBe(1);
    // sleepy 中はタイマーを張らない（何度も onSleep しない）
    expect(t.isTimerArmed()).toBe(false);
    vi.advanceTimersByTime(600_000);
    expect(sleeps).toBe(1);
  });

  it("活動で数え直す（最後の活動から60秒）", () => {
    const t = makeTracker();
    vi.advanceTimersByTime(50_000);
    t.activity();
    vi.advanceTimersByTime(50_000);
    expect(t.getPhase()).toBe("awake");
    vi.advanceTimersByTime(9_999);
    expect(t.getPhase()).toBe("awake");
    vi.advanceTimersByTime(1);
    expect(t.getPhase()).toBe("sleepy");
  });

  it("活動を連打してもタイマーは1本だけ（張り直さない）", () => {
    const setTimer = vi.fn((fn: () => void, ms: number) => setTimeout(fn, ms));
    const t = createMochitSleepTracker({ setTimer, onSleep: () => {}, onWake: () => {} });
    expect(setTimer).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 100; i += 1) t.activity();
    expect(setTimer).toHaveBeenCalledTimes(1);
  });
});

describe("mochitSleep: wake", () => {
  it("sleepy 中の活動は activity で起きる（wakeUp を出す理由）", () => {
    const t = makeTracker();
    vi.advanceTimersByTime(60_000);
    t.activity();
    expect(t.getPhase()).toBe("awake");
    expect(wakes).toEqual(["activity"]);
    // 起きたら新しく60秒数える
    vi.advanceTimersByTime(59_999);
    expect(t.getPhase()).toBe("awake");
    vi.advanceTimersByTime(1);
    expect(t.getPhase()).toBe("sleepy");
  });

  it("awake 中の活動では onWake しない", () => {
    const t = makeTracker();
    t.activity();
    t.learningEvent();
    expect(wakes).toEqual([]);
  });

  it("sleepy 中の学習イベントは learning で即起きる（同期）", () => {
    const t = makeTracker();
    vi.advanceTimersByTime(60_000);
    t.learningEvent();
    expect(t.getPhase()).toBe("awake");
    expect(wakes).toEqual(["learning"]);
  });
});

describe("mochitSleep: hidden", () => {
  it("非表示中は時間を積算せず、復帰時は awake から新しく数える", () => {
    const t = makeTracker();
    vi.advanceTimersByTime(30_000);
    t.setHidden(true);
    expect(t.isTimerArmed()).toBe(false);
    vi.advanceTimersByTime(20 * 60_000);
    expect(t.getPhase()).toBe("awake");
    t.setHidden(false);
    vi.advanceTimersByTime(59_999);
    expect(t.getPhase()).toBe("awake");
    vi.advanceTimersByTime(1);
    expect(t.getPhase()).toBe("sleepy");
  });

  it("sleepy のまま隠れて戻ったら awake（visible）から数え直す", () => {
    const t = makeTracker();
    vi.advanceTimersByTime(60_000);
    t.setHidden(true);
    t.setHidden(false);
    expect(t.getPhase()).toBe("awake");
    expect(wakes).toEqual(["visible"]);
    expect(t.isTimerArmed()).toBe(true);
  });
});

describe("mochitSleep: 抑制（Semantic Attention content/result）", () => {
  it("抑制中は眠らず、解除後に新しく60秒数える", () => {
    const t = makeTracker();
    t.setSuppressed(true);
    vi.advanceTimersByTime(10 * 60_000);
    expect(t.getPhase()).toBe("awake");
    t.setSuppressed(false);
    vi.advanceTimersByTime(59_999);
    expect(t.getPhase()).toBe("awake");
    vi.advanceTimersByTime(1);
    expect(t.getPhase()).toBe("sleepy");
  });

  it("sleepy 中に抑制が始まったら起こす（wakeUp は出さない理由）", () => {
    const t = makeTracker();
    vi.advanceTimersByTime(60_000);
    t.setSuppressed(true);
    expect(t.getPhase()).toBe("awake");
    expect(wakes).toEqual(["suppressed"]);
  });
});

describe("mochitSleep: dev 操作・dispose", () => {
  it("sleepNow / wakeNow", () => {
    const t = makeTracker();
    t.sleepNow();
    expect(t.getPhase()).toBe("sleepy");
    t.wakeNow("activity");
    expect(wakes).toEqual(["activity"]);
    t.sleepNow();
    t.wakeNow();
    expect(wakes).toEqual(["activity", "manual"]);
    expect(t.isTimerArmed()).toBe(true);
  });

  it("dispose 後は何もしない", () => {
    const t = makeTracker();
    t.dispose();
    vi.advanceTimersByTime(120_000);
    t.activity();
    t.sleepNow();
    expect(sleeps).toBe(0);
    expect(t.getPhase()).toBe("awake");
  });
});
