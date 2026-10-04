import { describe, expect, it } from "vitest";
import {
  mergeCheckPackHistoryEntry,
  summarizeCheckPackAttempts,
  type CheckPackHistoryEntry,
} from "@/lib/checkPackHistorySummary";

const row = (topic_id: string, completed_at: string, result_status: string, exam = 50) => ({
  topic_id,
  completed_at,
  result_status,
  quiz_score_rate: 100,
  flashcard_score_rate: 80,
  exam_level_score_rate: exam,
});

describe("summarizeCheckPackAttempts", () => {
  it("トピックごとに最新の結果と回数・本番対応OK経験をまとめる", () => {
    const map = summarizeCheckPackAttempts([
      row("a", "2026-10-03T10:00:00+00:00", "review_needed", 50),
      row("a", "2026-10-01T10:00:00+00:00", "passed", 100),
      row("b", "2026-10-02T10:00:00+00:00", "weak", 0),
    ]);
    expect(map.a).toMatchObject({
      lastCompletedAt: "2026-10-03T10:00:00+00:00",
      lastResultStatus: "review_needed",
      examLevelRate: 50,
      count: 2,
      everPassed: true,
    });
    expect(map.b).toMatchObject({ count: 1, everPassed: false, lastResultStatus: "weak" });
  });

  it("完了時刻や結果が欠けた行は数えない", () => {
    const map = summarizeCheckPackAttempts([
      { ...row("a", "", "passed") },
      row("a", "2026-10-03T10:00:00+00:00", "unknown"),
    ]);
    expect(map.a).toBeUndefined();
  });
});

describe("mergeCheckPackHistoryEntry", () => {
  const entry = (at: string, count: number, everPassed = false): CheckPackHistoryEntry => ({
    lastCompletedAt: at,
    lastResultStatus: everPassed ? "passed" : "review_needed",
    quizRate: 100,
    flashcardRate: 100,
    examLevelRate: 0,
    count,
    everPassed,
  });

  it("書式の違う時刻でも新しいほうを採り、回数は多いほうを採る", () => {
    const local = entry("2026-10-03T10:00:01.000Z", 1);
    const server = entry("2026-10-03T10:00:00+00:00", 3, true);
    const merged = mergeCheckPackHistoryEntry(local, server);
    expect(merged?.lastCompletedAt).toBe(local.lastCompletedAt);
    expect(merged?.count).toBe(3);
    expect(merged?.everPassed).toBe(true);
  });

  it("片方しかなければそれを返す", () => {
    expect(mergeCheckPackHistoryEntry(null, undefined)).toBeNull();
    expect(mergeCheckPackHistoryEntry(undefined, entry("2026-10-01T00:00:00Z", 1))?.count).toBe(1);
  });
});
