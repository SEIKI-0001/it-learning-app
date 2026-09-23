import { describe, expect, it } from "vitest";
import {
  CORRECT_STREAK_GAP_MS,
  createLearningStreakTracker,
  isCorrectStreakMilestone,
} from "@/components/mochit/mochitLearningStreak";
import type { MochitEvent, MochitEventSignal } from "@/components/mochit/mochitEvents";

function makeClock(start = 1_700_000_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

function signal(type: MochitEvent, id: number, context?: MochitEventSignal["context"]): MochitEventSignal {
  return context ? { type, id, context } : { type, id };
}

describe("mochitLearningStreak: isCorrectStreakMilestone", () => {
  it("3で最初の節目、その後は5の倍数ごと", () => {
    expect(isCorrectStreakMilestone(1)).toBe(false);
    expect(isCorrectStreakMilestone(2)).toBe(false);
    expect(isCorrectStreakMilestone(3)).toBe(true);
    expect(isCorrectStreakMilestone(4)).toBe(false);
    expect(isCorrectStreakMilestone(5)).toBe(true);
    expect(isCorrectStreakMilestone(6)).toBe(false);
    expect(isCorrectStreakMilestone(9)).toBe(false);
    expect(isCorrectStreakMilestone(10)).toBe(true);
    expect(isCorrectStreakMilestone(15)).toBe(true);
  });
});

describe("mochitLearningStreak: createLearningStreakTracker", () => {
  it("3問目の正解が correctStreak になり、id/context は保持される", () => {
    const clock = makeClock();
    const tracker = createLearningStreakTracker(clock.now);
    const context = { recoveredCount: 2 };

    const r1 = tracker.process(signal("correct", 1));
    expect(r1.type).toBe("correct");
    clock.advance(1000);
    const r2 = tracker.process(signal("correct", 2));
    expect(r2.type).toBe("correct");
    clock.advance(1000);
    const r3 = tracker.process(signal("correct", 3, context));
    expect(r3.type).toBe("correctStreak");
    expect(r3.id).toBe(3);
    expect(r3.context).toBe(context);
    expect(tracker.getCount()).toBe(3);
  });

  it("4問目は correct のまま（節目でない）、5問目は再び correctStreak", () => {
    const clock = makeClock();
    const tracker = createLearningStreakTracker(clock.now);
    for (let i = 1; i <= 3; i += 1) {
      tracker.process(signal("correct", i));
      clock.advance(1000);
    }
    const r4 = tracker.process(signal("correct", 4));
    expect(r4.type).toBe("correct");
    clock.advance(1000);
    const r5 = tracker.process(signal("correct", 5));
    expect(r5.type).toBe("correctStreak");
    expect(tracker.getCount()).toBe(5);
  });

  it("節目は3の後は5の倍数ごと（6〜9は correct、10で correctStreak）", () => {
    const clock = makeClock();
    const tracker = createLearningStreakTracker(clock.now);
    const results: MochitEventSignal[] = [];
    for (let i = 1; i <= 10; i += 1) {
      results.push(tracker.process(signal("correct", i)));
      clock.advance(1000);
    }
    const streakIndices = results
      .map((r, idx) => (r.type === "correctStreak" ? idx + 1 : null))
      .filter((v): v is number => v !== null);
    expect(streakIndices).toEqual([3, 5, 10]);
  });

  it("incorrect / allCorrect / taskComplete / checkpointClear で数え直しになる", () => {
    const resetEvents: MochitEvent[] = ["incorrect", "allCorrect", "taskComplete", "checkpointClear"];
    for (const resetEvent of resetEvents) {
      const clock = makeClock();
      const tracker = createLearningStreakTracker(clock.now);
      for (let i = 1; i <= 3; i += 1) {
        tracker.process(signal("correct", i));
        clock.advance(1000);
      }
      expect(tracker.getCount()).toBe(3);
      const resetResult = tracker.process(signal(resetEvent, 99));
      expect(resetResult.type).toBe(resetEvent);
      expect(tracker.getCount()).toBe(0);
      clock.advance(1000);
      // リセット後、次の正解からまた1問目として数える
      const next = tracker.process(signal("correct", 100));
      expect(next.type).toBe("correct");
      expect(tracker.getCount()).toBe(1);
    }
  });

  it("tap / encourage はカウントをリセットしない", () => {
    const clock = makeClock();
    const tracker = createLearningStreakTracker(clock.now);
    tracker.process(signal("correct", 1));
    clock.advance(1000);
    tracker.process(signal("correct", 2));
    expect(tracker.getCount()).toBe(2);

    clock.advance(1000);
    const tapResult = tracker.process(signal("tap", 3));
    expect(tapResult.type).toBe("tap");
    expect(tracker.getCount()).toBe(2);

    clock.advance(1000);
    const encourageResult = tracker.process(signal("encourage", 4));
    expect(encourageResult.type).toBe("encourage");
    expect(tracker.getCount()).toBe(2);

    clock.advance(1000);
    const r3 = tracker.process(signal("correct", 5));
    expect(r3.type).toBe("correctStreak");
    expect(tracker.getCount()).toBe(3);
  });

  it("CORRECT_STREAK_GAP_MS を超える間隔が空くと1から数え直す", () => {
    const clock = makeClock();
    const tracker = createLearningStreakTracker(clock.now);
    tracker.process(signal("correct", 1));
    clock.advance(1000);
    tracker.process(signal("correct", 2));
    expect(tracker.getCount()).toBe(2);

    clock.advance(CORRECT_STREAK_GAP_MS + 1);
    const afterGap = tracker.process(signal("correct", 3));
    expect(afterGap.type).toBe("correct");
    expect(tracker.getCount()).toBe(1);
  });

  it("間隔がちょうど CORRECT_STREAK_GAP_MS なら連続として数える", () => {
    const clock = makeClock();
    const tracker = createLearningStreakTracker(clock.now);
    tracker.process(signal("correct", 1));
    clock.advance(CORRECT_STREAK_GAP_MS);
    const r2 = tracker.process(signal("correct", 2));
    expect(r2.type).toBe("correct");
    expect(tracker.getCount()).toBe(2);
  });

  it("now を渡さない場合は Date.now を使う（デフォルト引数の確認）", () => {
    const tracker = createLearningStreakTracker();
    const result = tracker.process(signal("correct", 1));
    expect(result.type).toBe("correct");
    expect(tracker.getCount()).toBe(1);
  });
});
