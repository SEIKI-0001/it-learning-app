import { describe, expect, it } from "vitest";
import {
  countKakomonAskingWord,
  getKakomonByTag,
  getKakomonForWord,
  getKakomonForWordAskedFirst,
} from "@/lib/publicPages/kakomon";
import { getAllWordFamilies, getWordFamily } from "@/lib/publicPages/wordFamilies";
import { wordMiniQuiz, wordTitle } from "@/lib/publicPages/words";
import { getAllWords, getWord } from "@/lib/wordlist";

// 英略語ページ（/words）から登録へつなぐ部品：1問で確認・流れで覚える・過去問の並び。

describe("wordMiniQuiz", () => {
  it("makes a 4-choice question with exactly one correct answer for every word", () => {
    for (const w of getAllWords()) {
      const q = wordMiniQuiz(w);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices.map((c) => c.text)).size).toBe(4);
      expect(q.choices.filter((c) => c.key === q.correctKey)).toHaveLength(1);
      expect(q.takeaway.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic so server and browser render the same choices", () => {
    const w = getWord("rfq")!;
    expect(wordMiniQuiz(w)).toEqual(wordMiniQuiz(w));
  });

  it("asks RFQ against RFP and RFI, explaining each wrong choice", () => {
    const q = wordMiniQuiz(getWord("rfq")!);
    const texts = q.choices.map((c) => c.text);
    expect(texts).toEqual(expect.arrayContaining(["RFQ", "RFP", "RFI"]));
    expect(q.choices.find((c) => c.key === q.correctKey)?.text).toBe("RFQ");
    expect(q.choices.find((c) => c.text === "RFP")?.note).toContain("提案");
  });

  it("does not call non-acronym choices 略語", () => {
    expect(wordMiniQuiz(getWord("seo")!).prompt).toContain("用語は？");
    expect(wordMiniQuiz(getWord("rfq")!).prompt).toContain("略語は？");
  });
});

describe("RFI・RFP・RFQ", () => {
  it("compare all three in each title", () => {
    expect(wordTitle(getWord("rfi")!)).toContain("RFP・RFQとの違い");
    expect(wordTitle(getWord("rfp")!)).toContain("RFI・RFQとの違い");
    expect(wordTitle(getWord("rfq")!)).toContain("RFP・RFIとの違い");
  });

  it("belong to the procurement flow in order", () => {
    const family = getWordFamily("rfq");
    expect(family?.steps.map((s) => s.wordId)).toEqual(["rfi", "rfp", "rfq"]);
    expect(getWordFamily("kpi")).toBeNull();
  });

  it("only reference words that exist in the wordlist", () => {
    for (const f of getAllWordFamilies()) {
      for (const s of f.steps) expect(getWord(s.wordId)).toBeDefined();
    }
  });
});

describe("past exams on word pages", () => {
  it("lists questions that actually ask the word first, keeping the same set", () => {
    for (const w of getAllWords()) {
      const ordered = getKakomonForWordAskedFirst(w.id);
      expect(new Set(ordered.map((q) => q.view.id))).toEqual(
        new Set(getKakomonForWord(w.id).map((q) => q.view.id)),
      );
    }
    const kpiFirst = getKakomonForWordAskedFirst("kpi").slice(0, countKakomonAskingWord("kpi"));
    expect(kpiFirst.every((q) => /KPI/.test([q.view.prompt, ...q.view.choices.map((c) => c.text)].join("\n")))).toBe(
      true,
    );
  });

  it("finds the listing-ad question for the SEO page by its tag", () => {
    expect(getKakomonByTag("リスティング広告").length).toBeGreaterThan(0);
  });
});
