import { describe, expect, it } from "vitest";
import type { MochitContext, MochitEvent } from "@/components/mochit/mochitEvents";
import {
  buildMochitMessage,
  getContextualMochitMessage,
} from "@/components/mochit/floatingMochitMessages";
import { createMochitEventSignal } from "@/components/mochit/mochitEventBus";

// GF-P0-004 の文言側。事実がある場合だけ具体的に語り、無ければ汎用へ戻る。

function signal(type: MochitEvent, context?: MochitContext) {
  return createMochitEventSignal(type, context);
}

describe("speaks only from facts", () => {
  it("says nothing specific without a context", () => {
    expect(getContextualMochitMessage("taskComplete", undefined)).toBeNull();
  });

  it("says nothing specific for an empty context", () => {
    expect(getContextualMochitMessage("taskComplete", {})).toBeNull();
  });

  it("stays generic for per-answer reactions", () => {
    const rich: MochitContext = { recoveredCount: 3 };

    expect(getContextualMochitMessage("correct", rich)).toBeNull();
    expect(getContextualMochitMessage("incorrect", rich)).toBeNull();
    expect(getContextualMochitMessage("encourage", rich)).toBeNull();
  });

  it("falls back to the generic line when there is no fact to tell", () => {
    const message = buildMochitMessage(signal("taskComplete", {}), null, () => 0);

    expect(message?.text).toBe("学習完了！おつかれさま！");
  });

  it("falls back to the generic line when no context was attached at all", () => {
    const message = buildMochitMessage(signal("taskComplete"), null, () => 0);

    expect(message?.text).toBe("学習完了！おつかれさま！");
  });
});

describe("what it says when it does have a fact", () => {
  it("leads with beating the past self", () => {
    const message = getContextualMochitMessage("taskComplete", {
      recoveredCount: 2,
      remainingRequiredBadges: 1,
    });

    expect(message?.text).toContain("前にまちがえた2問");
  });

  it("mentions the cleared review", () => {
    expect(getContextualMochitMessage("taskComplete", { reviewCleared: true })?.text).toContain(
      "復習を1つやりきった",
    );
  });

  it("announces the unlocked final exam", () => {
    expect(
      getContextualMochitMessage("taskComplete", { finalExamUnlocked: true })?.text,
    ).toContain("突破試験に挑戦できる");
  });

  it("counts down the remaining required badges", () => {
    expect(
      getContextualMochitMessage("taskComplete", { remainingRequiredBadges: 1 })?.text,
    ).toContain("あと1つ");
    expect(
      getContextualMochitMessage("taskComplete", { remainingRequiredBadges: 3 })?.text,
    ).toContain("あと3つ");
  });

  it("celebrates a personal best streak", () => {
    expect(
      getContextualMochitMessage("taskComplete", { personalBestStreak: 7 })?.text,
    ).toContain("7日連続は自己ベスト");
  });

  it("frames a spent shield as protection, not as a loss", () => {
    const text = getContextualMochitMessage("taskComplete", { streakShieldUsed: true })?.text ?? "";

    expect(text).toContain("おまもりが連続を守った");
    expect(text).toMatch(/大丈夫/);
  });
});

describe("no double notification with Celebration", () => {
  it("stays off badges when one was just earned", () => {
    const text = getContextualMochitMessage("taskComplete", {
      badgeJustEarned: true,
      remainingRequiredBadges: 1,
    });

    expect(text).toBeNull();
  });

  it("still tells a learning outcome even when a badge was earned", () => {
    const text = getContextualMochitMessage("taskComplete", {
      badgeJustEarned: true,
      recoveredCount: 2,
    })?.text;

    expect(text).toContain("前にまちがえた2問");
  });

  it("does not announce the final exam unlock alongside a badge celebration", () => {
    expect(
      getContextualMochitMessage("taskComplete", {
        badgeJustEarned: true,
        finalExamUnlocked: true,
      }),
    ).toBeNull();
  });
});

describe("tone and timing", () => {
  const contexts: MochitContext[] = [
    { recoveredCount: 2 },
    { reviewCleared: true },
    { finalExamUnlocked: true },
    { remainingRequiredBadges: 2 },
    { personalBestStreak: 7 },
    { streakShieldUsed: true },
  ];

  it("never blames the user", () => {
    for (const context of contexts) {
      const text = getContextualMochitMessage("taskComplete", context)?.text ?? "";
      expect(text).not.toMatch(/ダメ|失敗|残念|サボ|遅れ|まずい/);
    }
  });

  it("keeps every line short enough for a bubble", () => {
    for (const context of contexts) {
      const text = getContextualMochitMessage("taskComplete", context)?.text ?? "";
      expect(text.length).toBeLessThanOrEqual(40);
    }
  });

  it("shows a specific line long enough to read", () => {
    const message = getContextualMochitMessage("taskComplete", { recoveredCount: 1 });

    expect(message?.durationMs).toBeGreaterThanOrEqual(2_200);
  });

  it("does not repeat the very same line twice in a row", () => {
    const context: MochitContext = { reviewCleared: true };
    const first = buildMochitMessage(signal("taskComplete", context), null, () => 0);
    const second = buildMochitMessage(signal("taskComplete", context), first?.text ?? null, () => 0);

    expect(second?.text).not.toBe(first?.text);
  });
});
