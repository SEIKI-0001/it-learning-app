import { describe, expect, it } from "vitest";
import {
  getAllKakomonQuestions,
  getKakomonForWord,
  getKakomonQuestion,
  getKakomonYears,
  getWordsInKakomon,
  kakomonQuestionDescription,
  kakomonQuestionSeoTitle,
  kakomonQuestionTitle,
} from "@/lib/publicPages/kakomon";
import { isWordLikeEntry, wordTitle } from "@/lib/publicPages/words";
import { getPublishedOfficialQuestionsByYear } from "@/lib/questionBank";
import { getWord } from "@/lib/wordlist";

describe("public past-exam pages (/kakomon)", () => {
  it("publishes exactly the published official questions of playable years", () => {
    const all = getAllKakomonQuestions();
    const expected = getKakomonYears().flatMap((y) => getPublishedOfficialQuestionsByYear(y));
    expect(all.map((q) => q.view.id)).toEqual(expected.map((q) => q.id));
    expect(all.every((q) => q.view.origin === "official_past")).toBe(true);
    expect(new Set(all.map((q) => q.path)).size).toBe(all.length);
  });

  it("carries the IPA attribution and an explanation on every question", () => {
    for (const q of getAllKakomonQuestions()) {
      expect(q.view.attribution).toMatch(/^出典：.+ITパスポート試験 公開問題 問\d+$/);
      expect(q.view.explanation.length).toBeGreaterThan(0);
      expect(q.topicLabel.length).toBeGreaterThan(0);
    }
  });

  it("resolves only known year / question numbers", () => {
    const [year] = getKakomonYears();
    expect(getKakomonQuestion(year, 1)?.view.questionNumber).toBe(1);
    expect(getKakomonQuestion(year, 101)).toBeNull();
    expect(getKakomonQuestion(1999, 1)).toBeNull();
  });

  it("builds a title and description that name the year, number and topic", () => {
    const q = getKakomonQuestion(2025, 26)!;
    expect(kakomonQuestionTitle(q)).toBe(`令和7年度 ITパスポート 問26「${q.topicLabel}」の解説`);
    expect(kakomonQuestionSeoTitle(q)).toBe(`ITパスポート過去問 令和7年度 問26「${q.topicLabel}」正解と解説`);
    expect(kakomonQuestionDescription(q)).toContain("令和7年度 ITパスポート試験 問26");
  });

  it("starts the description with the question text so question-text searches match", () => {
    for (const q of getAllKakomonQuestions()) {
      const head = q.view.prompt.replace(/\s+/g, " ").trim();
      expect(kakomonQuestionDescription(q).startsWith(head.slice(0, 20))).toBe(true);
    }
  });

  it("links acronyms only when they appear as standalone words", () => {
    for (const q of getAllKakomonQuestions()) {
      const text = [q.view.prompt, ...q.view.choices.map((c) => c.text), q.view.explanation].join("\n");
      for (const w of getWordsInKakomon(q)) {
        expect(text).toContain(w.acronym);
      }
    }
    const kpi = getKakomonForWord("kpi");
    for (const q of kpi) expect(getWordsInKakomon(q).some((w) => w.id === "kpi")).toBe(true);
  });
});

describe("public acronym pages (/words)", () => {
  it("names acronyms by their full name and word-like entries by their Japanese name", () => {
    const kpi = getWord("kpi")!;
    expect(isWordLikeEntry(kpi)).toBe(false);
    expect(wordTitle(kpi)).toContain("KPI（Key Performance Indicator）とは？");

    const zeroTrust = getWord("zerotrust")!;
    expect(isWordLikeEntry(zeroTrust)).toBe(true);
    expect(wordTitle(zeroTrust)).toContain("Zero Trust（ゼロトラスト）とは？");
  });
});
