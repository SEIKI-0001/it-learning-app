import { describe, expect, it } from "vitest";
import { buildMochitMessage, getFloatingMochitMessage, getGrowthMessageCandidates } from "@/components/mochit/floatingMochitMessages";

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
    ["badgeEarned", "学習をひとつ達成したね！", 2_800],
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

describe("floating Mochit growth messages", () => {
  const corpus = (event: Parameters<typeof getFloatingMochitMessage>[0], growth?: Parameters<typeof getFloatingMochitMessage>[3]) => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const m = getFloatingMochitMessage(event, null, () => i / 40, growth);
      if (m) seen.add(m.text);
    }
    return seen;
  };

  it("leaves candidates unchanged without growth", () => {
    expect(getGrowthMessageCandidates("correct", undefined)).toEqual([]);
    expect(corpus("correct")).toEqual(corpus("correct", undefined));
    expect(corpus("correct").has("わかってきたね！")).toBe(false);
  });

  it("mixes stage-3 lines into correct while keeping the originals", () => {
    const seen = corpus("correct", { stage: 3, personality: "undecided" });
    expect(seen.has("わかってきたね！")).toBe(true);
    expect(seen.has("ナイス！")).toBe(true);
    expect(corpus("correct", { stage: 2, personality: "undecided" }).has("わかってきたね！")).toBe(false);
  });

  it("adds the personality line only at stage 3+ and for correct / taskComplete", () => {
    const line = "回路がビリっときた！";
    expect(getGrowthMessageCandidates("correct", { stage: 3, personality: "technology" })).toContain(line);
    expect(getGrowthMessageCandidates("taskComplete", { stage: 5, personality: "technology" })).toContain(line);
    expect(getGrowthMessageCandidates("correct", { stage: 2, personality: "technology" })).not.toContain(line);
    expect(getGrowthMessageCandidates("incorrect", { stage: 5, personality: "technology" })).not.toContain(line);
    expect(getGrowthMessageCandidates("correct", { stage: 5, personality: "undecided" })).not.toContain(line);
  });

  it("still excludes previousText", () => {
    const growth = { stage: 5, personality: "technology" } as const;
    for (const prev of ["わかってきたね！", "ナイス！", "回路がビリっときた！"]) {
      for (let i = 0; i < 30; i++) {
        expect(getFloatingMochitMessage("correct", prev, () => i / 30, growth)?.text).not.toBe(prev);
      }
    }
  });

  it("is passed through buildMochitMessage", () => {
    const growth = { stage: 5, personality: "technology" } as const;
    const texts = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const m = buildMochitMessage({ type: "correct" } as never, null, () => i / 40, growth);
      if (m) texts.add(m.text);
    }
    expect(texts.has("さすが相棒！")).toBe(true);
  });
});
