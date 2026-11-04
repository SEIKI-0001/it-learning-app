import { describe, expect, it } from "vitest";
import {
  getAllKakomonQuestions,
  getKakomonForWord,
  getKakomonQuestion,
  countKakomonAskingWord,
  getKakomonYears,
  getWordsInKakomon,
  RELATED_V2_YEARS,
  getRelatedKakomon,
  kakomonYearRangeLabel,
  kakomonQuestionDescription,
  kakomonQuestionSeoTitle,
  kakomonQuestionTitle,
} from "@/lib/publicPages/kakomon";
import { isWordLikeEntry, wordComparisonEntries, wordDescription, wordTitle } from "@/lib/publicPages/words";
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
        // 試行中の年度は、論点タグか問題文・選択肢の日本語名（4文字以上）での一致も認める
        const byV2 =
          RELATED_V2_YEARS.has(q.view.year) &&
          (q.tags.includes(w.acronym) || q.tags.includes(w.japanese) || (w.japanese.length >= 4 && text.includes(w.japanese)));
        expect(text.includes(w.acronym) || byV2, `${q.path} ${w.acronym}`).toBe(true);
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
    expect(wordTitle(zeroTrust)).toContain("ゼロトラスト（Zero Trust）とは？");

    // 英単語の見出しどうしの比較は、検索に合わせて日本語名で並べる
    expect(wordTitle(getWord("deepfake")!)).toBe("ディープフェイク（Deepfake）とは？意味とハルシネーション・GANとの違い");
    expect(wordDescription(getWord("deepfake")!).startsWith("ディープフェイク（Deepfake）とハルシネーション（Hallucination）の違い。")).toBe(true);
  });

  it("names up to two confused terms in the title and leads the description with the difference", () => {
    const rpo = getWord("rpo")!;
    expect(wordTitle(rpo)).toBe("RPO（Recovery Point Objective）とは？意味とRTO・BCPとの違い");
    expect(wordDescription(rpo).startsWith("RPOは「目標復旧時点」、RTOは「")).toBe(true);
    expect(wordComparisonEntries(rpo).map((w) => w.acronym)).toEqual(["RTO", "BCP"]);
  });

  it("compares only terms that exist in the wordlist", () => {
    const lan = getWord("lan")!;
    expect(lan.confusedWith).toContain("MAN");
    expect(wordComparisonEntries(lan).some((w) => w.acronym === "MAN")).toBe(false);
  });

  it("counts only questions whose prompt or choices contain the acronym", () => {
    expect(kakomonYearRangeLabel()).toMatch(/^令和\d+〜\d+年度$/);
    for (const id of ["kpi", "rpo", "sor"]) {
      const asked = countKakomonAskingWord(id);
      expect(asked).toBeLessThanOrEqual(getKakomonForWord(id).length);
    }
  });
});

describe("related past-exam links (試行中の選び方)", () => {
  const trial = getAllKakomonQuestions().filter((q) => RELATED_V2_YEARS.has(q.view.year));
  const others = getAllKakomonQuestions().filter((q) => !RELATED_V2_YEARS.has(q.view.year));

  it("is limited to the trial year (令和7年度)", () => {
    expect([...RELATED_V2_YEARS]).toEqual([2025]);
    expect(trial).toHaveLength(100);
  });

  it("shows only questions that share a tag or the topic, ranked by shared tags, other years first", () => {
    for (const q of trial) {
      const score = (x: (typeof trial)[number]) =>
        x.tags.filter((t) => q.tags.includes(t)).length * 2 + (x.view.topicId === q.view.topicId ? 1 : 0);
      const related = getRelatedKakomon(q);
      expect(related.length).toBeLessThanOrEqual(5);
      for (let i = 0; i < related.length; i++) {
        const x = related[i];
        expect(x.view.id).not.toBe(q.view.id);
        expect(score(x), `${q.path} → ${x.path}`).toBeGreaterThan(0);
        const prev = related[i - 1];
        if (prev && score(prev) === score(x)) {
          // 同点なら別年度が先（同年度の後に別年度が来ない）
          expect(!(prev.view.year === q.view.year && x.view.year !== q.view.year), `${q.path}`).toBe(true);
        }
        if (prev) expect(score(prev)).toBeGreaterThanOrEqual(score(x));
      }
    }
  });

  it("keeps the previous rule (same topic, newest first) outside the trial year", () => {
    for (const q of others) {
      for (const x of getRelatedKakomon(q)) expect(x.view.topicId).toBe(q.view.topicId);
    }
  });
});
