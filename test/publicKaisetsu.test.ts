import { describe, expect, it } from "vitest";
import { TOPIC_WORD_LINKS } from "@/data/topicWordLinks";
import { getAllTopics } from "@/lib/content";
import { getAllKakomonQuestions } from "@/lib/publicPages/kakomon";
import {
  getKaisetsuQuizzes,
  getKaisetsuTopic,
  getKaisetsuTopics,
  getKaisetsuTopicsByField,
  getKakomonForTopic,
  getTopicsForWord,
  getWordsForTopic,
  kaisetsuDescription,
  kaisetsuPath,
  kaisetsuTitle,
  KAISETSU_FIELD_ORDER,
} from "@/lib/publicPages/kaisetsu";

describe("public topic explanation pages (/kaisetsu)", () => {
  it("publishes every topic once, grouped by field and category", () => {
    const topics = getKaisetsuTopics();
    expect(topics.length).toBe(getAllTopics().length);
    expect(new Set(topics.map((t) => kaisetsuPath(t.id))).size).toBe(topics.length);

    const grouped = KAISETSU_FIELD_ORDER.flatMap((f) => getKaisetsuTopicsByField(f).flatMap((g) => g.topics));
    expect(grouped.map((t) => t.id).sort()).toEqual(topics.map((t) => t.id).sort());
  });

  it("resolves only known topic ids", () => {
    expect(getKaisetsuTopic("strat-swot")?.title).toBe("SWOT分析");
    expect(getKaisetsuTopic("no-such-topic")).toBeNull();
  });

  it("links every public past-exam question to exactly one topic page", () => {
    const linked = getKaisetsuTopics().flatMap((t) => getKakomonForTopic(t.id));
    const all = getAllKakomonQuestions();
    expect(linked.length).toBe(all.length);
    expect(new Set(linked.map((q) => q.view.id))).toEqual(new Set(all.map((q) => q.view.id)));
  });

  it("links acronyms and topics in both directions", () => {
    for (const t of getKaisetsuTopics()) {
      const words = getWordsForTopic(t.id);
      expect(words.map((w) => w.id)).toEqual([...(TOPIC_WORD_LINKS[t.id] ?? [])]);
      for (const w of words) expect(getTopicsForWord(w.id).map((x) => x.id)).toContain(t.id);
    }
  });

  it("builds a searchable title and description", () => {
    const swot = getKaisetsuTopic("strat-swot")!;
    expect(kaisetsuTitle(swot)).toBe("SWOT分析とは？わかりやすく解説【ITパスポート】");
    expect(kaisetsuDescription(swot)).toContain("ストラテジ系「SWOT分析」");
  });

  it("shows only original check questions and moves the answer off a fixed position", () => {
    const positions = new Set<string>();
    for (const t of getKaisetsuTopics()) {
      const source = t.checkQuestions.filter((q) => !q.official);
      const quizzes = getKaisetsuQuizzes(t);
      expect(quizzes.length).toBe(source.length);
      quizzes.forEach((quiz, i) => {
        const original = source[i];
        const correctText = original.choices.find((c) => c.key === original.correctChoice)!.text;
        expect(quiz.choices.map((c) => c.key)).toEqual(["A", "B", "C", "D"]);
        expect(quiz.choices.find((c) => c.key === quiz.correctChoice)!.text).toBe(correctText);
        expect(quiz.choices.map((c) => c.text).sort()).toEqual(original.choices.map((c) => c.text).sort());
        positions.add(quiz.correctChoice);
      });
    }
    // 教材データは正解が常に A。公開ページでは4つの位置すべてに散らばる。
    expect(positions).toEqual(new Set(["A", "B", "C", "D"]));
  });
});
