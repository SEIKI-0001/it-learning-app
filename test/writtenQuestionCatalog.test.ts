import { describe, expect, it } from "vitest";
import { getWrittenQuestions, getWrittenQuestionsForTopic } from "@/data/writtenQuestions";
import {
  filterWrittenQuestionEntries,
  getAiGradingQuestionHref,
  getWrittenQuestionEntries,
  resolveRequestedQuestionId,
} from "@/lib/writtenQuestionCatalog";

describe("AI採点の問題一覧（索引）", () => {
  const entries = getWrittenQuestionEntries();

  it("全問題を1回ずつ含み、どの問題にも章・Topicが付く", () => {
    expect(entries.map((e) => e.question.id).sort()).toEqual(getWrittenQuestions().map((q) => q.id).sort());
    for (const entry of entries) {
      expect(entry.placements.length, entry.question.id).toBeGreaterThan(0);
      expect(entry.placements[0].themeTitle.length).toBeGreaterThan(0);
      expect(entry.placements[0].topicTitle.length).toBeGreaterThan(0);
    }
  });

  it("学ぶ画面の章の順に並ぶ（第1章が先頭、セキュリティ章が末尾側）", () => {
    const chapters = entries.map((e) => e.placements[0].chapterNumber);
    expect(chapters[0]).toBe(1);
    expect(chapters).toEqual([...chapters].sort((a, b) => a - b));
  });

  it("分野で絞り込める", () => {
    const strategy = filterWrittenQuestionEntries(entries, { field: "strategy" });
    expect(strategy.length).toBeGreaterThan(0);
    expect(strategy.every((e) => e.placements.some((p) => p.field === "strategy"))).toBe(true);
    expect(strategy.some((e) => e.question.id === "sec-01")).toBe(false);
  });

  it("章で絞り込める（複数トピックに紐づく問題はどちらの章でも出る）", () => {
    const database = filterWrittenQuestionEntries(entries, { themeSlug: "database" }).map((e) => e.question.id);
    expect(database).toEqual(expect.arrayContaining(["db-01", "db-02", "db-03", "db-04", "db-05", "sec-04"]));
    expect(database).not.toContain("net-01");
  });

  it("キーワードは題名・Topic名・採点キーワードにも当たる", () => {
    const byTitle = filterWrittenQuestionEntries(entries, { query: "ゼロトラスト" }).map((e) => e.question.id);
    expect(byTitle).toContain("sec-08");
    const byTopic = filterWrittenQuestionEntries(entries, { query: "稼働率とMTBF" }).map((e) => e.question.id);
    expect(byTopic).toEqual(expect.arrayContaining(["sys-01", "sys-02", "sys-03"]));
    const byKeyword = filterWrittenQuestionEntries(entries, { query: "lifo" }).map((e) => e.question.id);
    expect(byKeyword).toEqual(["alg-01"]);
  });

  it("回答状況で絞り込める", () => {
    const answered = new Set(["sec-01", "net-01"]);
    const done = filterWrittenQuestionEntries(entries, { status: "answered" }, answered).map((e) => e.question.id);
    expect(done.sort()).toEqual(["net-01", "sec-01"]);
    const todo = filterWrittenQuestionEntries(entries, { status: "unanswered" }, answered);
    expect(todo).toHaveLength(entries.length - 2);
  });
});

describe("URL指定で開く問題", () => {
  it("?questionId= はその問題を開く（topicId より優先）", () => {
    expect(resolveRequestedQuestionId({ questionId: "db-03", topicId: "tech-auth-authz-mfa" })).toBe("db-03");
  });

  it("存在しない questionId は無視して topicId を使う", () => {
    expect(resolveRequestedQuestionId({ questionId: "nope", topicId: "tech-auth-authz-mfa" })).toBe("sec-01");
  });

  it("?topicId= はそのトピックの問題を開き、未回答を優先する", () => {
    const [first, second] = getWrittenQuestionsForTopic("tech-ai-ml");
    expect(resolveRequestedQuestionId({ topicId: "tech-ai-ml" })).toBe(first.id);
    expect(resolveRequestedQuestionId({ topicId: "tech-ai-ml" }, new Set([first.id]))).toBe(second.id);
  });

  it("解決できなければ undefined（おまかせ出題に任せる）", () => {
    expect(resolveRequestedQuestionId({})).toBeUndefined();
    expect(resolveRequestedQuestionId({ topicId: "tech-binary-data" })).toBeUndefined();
  });

  it("問題への直接リンクを作れる", () => {
    expect(getAiGradingQuestionHref("sec-01")).toBe("/ai-grading?questionId=sec-01");
  });
});
