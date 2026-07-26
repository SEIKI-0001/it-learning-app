import { describe, expect, it } from "vitest";
import { getFloatingMochitMessage } from "@/components/mochit/floatingMochitMessages";

describe("floating Mochit reaction messages", () => {
  it("avoids immediately repeating a correct message when alternatives exist", () => {
    expect(getFloatingMochitMessage("correct", null, () => 0)).toEqual({
      text: "ナイス！",
      durationMs: 1_400,
    });
    expect(getFloatingMochitMessage("correct", "ナイス！", () => 0)).toEqual({
      text: "正解！",
      durationMs: 1_400,
    });
  });

  it("uses supportive incorrect messages for 1.4 seconds", () => {
    const candidates = [
      "ここで覚えればOK！",
      "解説を確認しよう",
      "次に活かそう！",
    ];
    for (const [index, text] of candidates.entries()) {
      const message = getFloatingMochitMessage(
        "incorrect",
        null,
        () => index / candidates.length,
      );
      expect(message).toEqual({ text, durationMs: 1_400 });
      expect(message?.text).not.toMatch(/ダメ|失敗|残念|泣/);
    }
  });

  it("varies encouragement for 1.8 seconds without immediate repetition", () => {
    expect(getFloatingMochitMessage("encourage", null, () => 0)).toEqual({
      text: "落ち着いていこう！",
      durationMs: 1_800,
    });
    expect(
      getFloatingMochitMessage("encourage", "落ち着いていこう！", () => 0),
    ).toEqual({
      text: "一歩ずついこう！",
      durationMs: 1_800,
    });
  });

  it.each([
    ["allCorrect", "全問正解！完璧！", 2_200],
    ["taskComplete", "学習完了！おつかれさま！", 2_200],
    ["badgeEarned", "新しいバッジを獲得！", 2_800],
    ["checkpointClear", "チェックポイント突破！", 2_800],
  ] as const)("%s has its fixed achievement copy and duration", (event, text, durationMs) => {
    expect(getFloatingMochitMessage(event, null, () => 0)).toEqual({
      text,
      durationMs,
    });
  });

  it("does not create bubbles for tap or wakeUp", () => {
    expect(getFloatingMochitMessage("tap", null)).toBeNull();
    expect(getFloatingMochitMessage("wakeUp", null)).toBeNull();
  });
});
