import { describe, expect, it } from "vitest";
import { nextMilestone, progressTrend, weeklyAnswerBuckets } from "@/lib/progressGrowth";
import type { UserAnswer } from "@/types";

// 2026-10-17 は土曜。今週の月曜は 10-12。
const TODAY = new Date(2026, 9, 17, 20, 0);

function answer(y: number, m: number, d: number, isCorrect: boolean): UserAnswer {
  return { questionId: `q-${m}-${d}`, isCorrect, answeredAt: new Date(y, m - 1, d, 12).toISOString(), tag: "t" };
}

describe("週ごとの回答", () => {
  it("月曜はじまりで直近8週に分け、範囲外は数えない", () => {
    const buckets = weeklyAnswerBuckets(
      [
        answer(2026, 10, 12, true), // 今週の月曜
        answer(2026, 10, 17, false), // 今日
        answer(2026, 10, 11, true), // 先週の日曜
        answer(2026, 8, 1, true), // 8週より前
      ],
      TODAY,
    );
    expect(buckets).toHaveLength(8);
    expect(buckets[7]).toEqual({ start: "2026-10-12", answers: 2, correct: 1, accuracy: 50 });
    expect(buckets[6]).toMatchObject({ start: "2026-10-05", answers: 1, accuracy: 100 });
    expect(buckets[0].start).toBe("2026-08-24");
    expect(buckets.reduce((s, b) => s + b.answers, 0)).toBe(3);
  });
});

describe("推移", () => {
  const history = [
    { date: "2026-09-01", readiness: null, understood: 2, examReady: 0 },
    { date: "2026-10-09", readiness: 50, understood: 6, examReady: 1 },
    { date: "2026-10-16", readiness: 55, understood: 8, examReady: 2 },
  ];

  it("7日前以前で最新の点と比べる・理解トピックは最古の点からの増加", () => {
    const trend = progressTrend(history, TODAY, { readiness: 58, understood: 9 });
    expect(trend.readinessWeekDelta).toBe(8); // 10-10 以前の最新 = 10-09 の 50
    expect(trend.readinessSeries.map((p) => p.value)).toEqual([50, 55]);
    expect(trend.understoodGrowth).toEqual({ delta: 7, since: "2026-09-01" });
  });

  it("比べる点が無ければ差は出さない", () => {
    const trend = progressTrend([], TODAY, { readiness: 58, understood: 9 });
    expect(trend.readinessWeekDelta).toBeNull();
    expect(trend.understoodGrowth).toBeNull();
    expect(progressTrend(history, TODAY, { readiness: null, understood: null }).readinessWeekDelta).toBeNull();
  });
});

describe("次の区切り", () => {
  it("10刻みの次の目標", () => {
    expect(nextMilestone(8)).toEqual({ target: 10, remaining: 2 });
    expect(nextMilestone(10)).toEqual({ target: 20, remaining: 10 });
    expect(nextMilestone(0)).toEqual({ target: 10, remaining: 10 });
  });
});
