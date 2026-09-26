import { describe, expect, it } from "vitest";
import { inferMochitIntent } from "@/lib/mochitAi/intent";
import { pageKindForPath, quickActionsFor, topicIdFromPath } from "@/lib/mochitAi/pageContext";
import { buildMochitSystemPrompt, buildMochitUserPrompt, guardMochitReply } from "@/lib/mochitAi/prompt";

describe("guardMochitReply", () => {
  const facts = { readiness: { band: "あと一歩", score: 58 }, recent14Days: { accuracy: 64 } };

  it("アプリの段階が準備良好/安定でなければ、合格の断定を落とす", () => {
    const reply = "今は58点で、あと一歩の段階だよ。もう合格レベルだね！次はテクノロジ系の復習をしよう。";
    expect(guardMochitReply(reply, facts, { band: "あと一歩" })).toBe(
      "今は58点で、あと一歩の段階だよ。次はテクノロジ系の復習をしよう。",
    );
  });

  it("否定の文（まだ合格レベルではない）は残す", () => {
    const reply = "まだ合格レベルとは言えないよ。";
    expect(guardMochitReply(reply, facts, { band: "あと一歩" })).toBe(reply);
  });

  it("準備良好なら合格に触れてよい", () => {
    const reply = "この調子なら合格できる位置にいるよ。";
    expect(guardMochitReply(reply, facts, { band: "準備良好" })).toBe(reply);
  });

  it("事実に無い数字で実力を語る文を落とす（計算し直し・捏造の防止）", () => {
    const reply = "正答率は64%だよ。合格ラインの予測スコアは72点くらい。";
    expect(guardMochitReply(reply, facts, { band: "あと一歩" })).toBe("正答率は64%だよ。");
  });

  it("学習者が自分で書いた数字への言及は残す", () => {
    const reply = "80点を目指すなら、まず苦手を減らそう。";
    expect(guardMochitReply(reply, facts, { band: null, context: "80点取りたい" })).toBe(reply);
  });

  it("全部落ちたら null（定型文へ切り替える）", () => {
    expect(guardMochitReply("余裕で合格！", facts, { band: "要強化" })).toBeNull();
  });

  it("強調記号を取り除く", () => {
    expect(guardMochitReply("**ここが大事**だよ。", facts, { band: null })).toBe("ここが大事だよ。");
  });
});

describe("prompts", () => {
  it("システムプロンプトは判定の上書き禁止と呼び名を含む", () => {
    const system = buildMochitSystemPrompt("もっちー");
    expect(system).toContain("もっちー");
    expect(system).toContain("自分で計算し直したり、上書きしたりしない");
  });

  it("ユーザープロンプトは事実と会話を分けて渡す", () => {
    const prompt = buildMochitUserPrompt({
      intent: "status",
      facts: { a: 1 },
      history: [{ role: "user", text: "こんにちは" }],
      message: "今の実力は？",
    });
    expect(prompt).toContain('{"a":1}');
    expect(prompt).toContain("学習者: こんにちは");
    expect(prompt.endsWith("今の実力は？")).toBe(true);
  });
});

describe("inferMochitIntent", () => {
  const base = { page: "general" as const, hasQuestion: false, hasLearnTopic: false };
  it.each([
    ["今どれくらいできてる？", "status"],
    ["何が苦手？", "status"],
    ["試験まで間に合う？", "plan"],
    ["今週あまり勉強できないけど大丈夫？", "plan"],
    ["今日あと何をすればいい？", "today"],
    ["今日どうだった？", "reflection"],
    ["こんにちは", "general"],
  ])("%s → %s", (message, intent) => {
    expect(inferMochitIntent({ ...base, message })).toBe(intent);
  });

  it("問題を開いていれば「なんでBじゃないの？」は問題への質問", () => {
    expect(inferMochitIntent({ ...base, message: "なんでBじゃないの？", hasQuestion: true })).toBe("question");
    expect(inferMochitIntent({ ...base, message: "ふーん", page: "question", hasQuestion: true })).toBe("question");
  });

  it("学習ページでは表示中の内容の質問として扱う", () => {
    expect(inferMochitIntent({ ...base, message: "ここがよく分からない", page: "learn", hasLearnTopic: true })).toBe("learn");
  });
});

describe("pageContext", () => {
  it("パスからページの種類とトピックを決める", () => {
    expect(pageKindForPath("/today")).toBe("today");
    expect(pageKindForPath("/progress")).toBe("progress");
    expect(pageKindForPath("/learn/network/basics/tech-net-ip")).toBe("learn");
    expect(topicIdFromPath("/learn/network/basics/tech-net-ip")).toBe("tech-net-ip");
    expect(topicIdFromPath("/topics/tech-net-ip")).toBe("tech-net-ip");
    expect(topicIdFromPath("/learn/network")).toBeNull();
    expect(pageKindForPath("/review")).toBe("general");
  });

  it("ページごとに候補が変わる", () => {
    expect(quickActionsFor("today").map((a) => a.label)).toContain("今日あと何をすればいい？");
    expect(quickActionsFor("question").map((a) => a.label)).toContain("なぜ自分の回答ではダメ？");
    expect(quickActionsFor("progress").map((a) => a.label)).toContain("苦手なところを教えて");
    expect(quickActionsFor("learn").map((a) => a.label)).toContain("この内容を簡単に説明して");
    expect(quickActionsFor("general").map((a) => a.label)).toEqual([
      "今の学習状況を見る",
      "今日やることについて相談",
      "分からないことを聞く",
    ]);
  });
});
