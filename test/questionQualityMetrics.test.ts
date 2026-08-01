import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import path from "node:path";

import { getAllQuestions } from "@/lib/questionBank/loader";
import { computeContentHash } from "@/lib/questionBank/contentHash";
import {
  UNANSWERED_KEY,
  aggregateQuestionMetrics,
  median,
  percentile,
  renderMetricsMarkdown,
  selectFirstAttempts,
  toEstimatedScale,
  toRecommendedDifficulty,
  toSampleStatus,
} from "@/lib/questionQuality/metrics";
import { SAMPLE_THRESHOLDS } from "@/lib/questionQuality/metricsThresholds";
import type { QuestionRecord } from "@/types/questionBank";
import type { QuestionAttemptRow } from "@/types/questionQuality";

// ============================================================================
// 実測難易度の集計（npm run validate:questions）。
// ----------------------------------------------------------------------------
// ここで守りたいこと:
//   1. 主指標が「同一ユーザー・同一問題・同一version の初回」だけで作られていること
//      （復習の正答が混ざると難易度が壊れる。これがこの機能の根幹）
//   2. 標本が足りないうちは何も断定しないこと
//   3. レポートに個人を識別できる値が出ないこと
//   4. 同じ入力なら同じ結果になること
// ============================================================================

const ROOT = process.cwd();

function makeQuestion(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  const base = {
    prompt: "サンプルの問題文です。",
    choices: [
      { key: "A" as const, text: "選択肢A" },
      { key: "B" as const, text: "選択肢B" },
      { key: "C" as const, text: "選択肢C" },
      { key: "D" as const, text: "選択肢D" },
    ],
    correctChoice: "A" as const,
    explanation: "選択肢Aが条件を満たす唯一の組合せです。",
  };

  const question: QuestionRecord = {
    id: "metrics-q1",
    version: 1,
    origin: "app_original",
    status: "draft",
    primaryTopicId: "tech-security-cia",
    questionPattern: "knowledge",
    ...base,
    estimatedDifficulty: 2,
    tags: [],
    contentHash: "",
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  };
  question.contentHash = computeContentHash(question);
  return question;
}

let sequence = 0;
function attempt(overrides: Partial<QuestionAttemptRow> = {}): QuestionAttemptRow {
  sequence += 1;
  return {
    attemptId: `attempt-${String(sequence).padStart(5, "0")}`,
    userId: "user-1",
    questionId: "metrics-q1",
    questionVersion: 1,
    selectedAnswer: "A",
    isCorrect: true,
    timeSpentSeconds: 30,
    answeredAt: new Date(Date.parse("2026-07-01T00:00:00.000Z") + sequence * 1000).toISOString(),
    ...overrides,
  };
}

/** users 人ぶんの初回回答を作る。correctCount 人が正解する。 */
function makeUsers(
  count: number,
  correctCount: number,
  overrides: Partial<QuestionAttemptRow> = {},
): QuestionAttemptRow[] {
  return Array.from({ length: count }, (_, i) =>
    attempt({
      userId: `user-${i}`,
      isCorrect: i < correctCount,
      selectedAnswer: i < correctCount ? "A" : "B",
      ...overrides,
    }),
  );
}

// ---------------------------------------------------------------------------
// 1. 初回回答の抽出
// ---------------------------------------------------------------------------

describe("初回回答の抽出", () => {
  it("同一ユーザー・同一問題・同一version の2回目以降を落とす", () => {
    const first = attempt({
      userId: "u1",
      isCorrect: false,
      selectedAnswer: "B",
      answeredAt: "2026-07-01T00:00:00.000Z",
    });
    const second = attempt({
      userId: "u1",
      isCorrect: true,
      selectedAnswer: "A",
      answeredAt: "2026-07-10T00:00:00.000Z",
    });

    const firsts = selectFirstAttempts([second, first]);
    expect(firsts).toHaveLength(1);
    expect(firsts[0].attemptId).toBe(first.attemptId);
    expect(firsts[0].isCorrect).toBe(false);
  });

  it("version が違えば別の回答として残す", () => {
    const v1 = attempt({ userId: "u1", questionVersion: 1 });
    const v2 = attempt({ userId: "u1", questionVersion: 2 });
    expect(selectFirstAttempts([v1, v2])).toHaveLength(2);
  });

  it("ユーザーが違えば残す", () => {
    expect(selectFirstAttempts([attempt({ userId: "u1" }), attempt({ userId: "u2" })])).toHaveLength(2);
  });

  it("同時刻なら attemptId の昇順で決める（入力順に依存しない）", () => {
    const a = attempt({ userId: "u1", attemptId: "a", answeredAt: "2026-07-01T00:00:00.000Z" });
    const b = attempt({ userId: "u1", attemptId: "b", answeredAt: "2026-07-01T00:00:00.000Z" });

    expect(selectFirstAttempts([a, b])[0].attemptId).toBe("a");
    expect(selectFirstAttempts([b, a])[0].attemptId).toBe("a");
  });
});

describe("反復練習が主指標に混ざらない", () => {
  it("初回不正解・2回目正解でも初回正答率は上がらない", () => {
    const question = makeQuestion();
    const rows: QuestionAttemptRow[] = [];

    // 100人が初回は40人だけ正解。そのあと全員が復習して正解する。
    for (let i = 0; i < 100; i += 1) {
      const correct = i < 40;
      rows.push(
        attempt({
          userId: `u${i}`,
          isCorrect: correct,
          selectedAnswer: correct ? "A" : "B",
          answeredAt: `2026-07-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`,
        }),
      );
      rows.push(
        attempt({
          userId: `u${i}`,
          isCorrect: true,
          selectedAnswer: "A",
          answeredAt: `2026-08-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`,
        }),
      );
    }

    const [metric] = aggregateQuestionMetrics(rows, [question]);
    expect(metric.firstAttemptCount).toBe(100);
    expect(metric.allAttemptCount).toBe(200);
    expect(metric.firstAttemptCorrectRate).toBe(0.4);
    // 参考値の方だけが復習の影響を受ける。
    expect(metric.allAttemptCorrectRate).toBe(0.7);
    // 難易度は初回正答率から出す。全回答（0.7）を使うと 2 になってしまう。
    expect(metric.recommendedDifficulty).toBe(4);
  });

  it("1人が同じ問題を何度解いてもユーザー数は1のまま", () => {
    const question = makeQuestion();
    const rows = Array.from({ length: 50 }, (_, i) =>
      attempt({ userId: "u1", answeredAt: `2026-07-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z` }),
    );

    const [metric] = aggregateQuestionMetrics(rows, [question]);
    expect(metric.uniqueUserCount).toBe(1);
    expect(metric.firstAttemptCount).toBe(1);
    expect(metric.allAttemptCount).toBe(50);
    expect(metric.sampleStatus).toBe("insufficient");
  });
});

// ---------------------------------------------------------------------------
// 2. 標本状態
// ---------------------------------------------------------------------------

describe("標本状態の境界", () => {
  it("30未満は insufficient、30以上は provisional、100以上は reliable", () => {
    expect(toSampleStatus(SAMPLE_THRESHOLDS.provisional - 1)).toBe("insufficient");
    expect(toSampleStatus(SAMPLE_THRESHOLDS.provisional)).toBe("provisional");
    expect(toSampleStatus(SAMPLE_THRESHOLDS.reliable - 1)).toBe("provisional");
    expect(toSampleStatus(SAMPLE_THRESHOLDS.reliable)).toBe("reliable");
  });

  it("集計結果でも境界どおりになる", () => {
    const question = makeQuestion();
    for (const [users, expected] of [
      [29, "insufficient"],
      [30, "provisional"],
      [99, "provisional"],
      [100, "reliable"],
    ] as const) {
      const [metric] = aggregateQuestionMetrics(makeUsers(users, Math.floor(users / 2)), [question]);
      expect(metric.uniqueUserCount, `${users}人`).toBe(users);
      expect(metric.sampleStatus, `${users}人`).toBe(expected);
    }
  });

  it("insufficient のあいだは異常フラグを立てない", () => {
    const question = makeQuestion();
    // 全員正解・所要3秒。標本が足りていれば too_easy / unusually_fast が立つ内容。
    const rows = makeUsers(29, 29, { timeSpentSeconds: 3 });
    const [metric] = aggregateQuestionMetrics(rows, [question]);

    expect(metric.sampleStatus).toBe("insufficient");
    expect(metric.anomalyFlags).toEqual([]);
    // 推奨難易度は参考値として算出はする。
    expect(metric.recommendedDifficulty).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. 各指標
// ---------------------------------------------------------------------------

describe("選択肢別の割合・所要時間", () => {
  it("choice rates が初回回答の内訳になる", () => {
    const question = makeQuestion();
    const rows = [
      ...Array.from({ length: 50 }, (_, i) => attempt({ userId: `a${i}`, selectedAnswer: "A", isCorrect: true })),
      ...Array.from({ length: 30 }, (_, i) => attempt({ userId: `b${i}`, selectedAnswer: "B", isCorrect: false })),
      ...Array.from({ length: 20 }, (_, i) => attempt({ userId: `c${i}`, selectedAnswer: "C", isCorrect: false })),
    ];

    const [metric] = aggregateQuestionMetrics(rows, [question]);
    expect(metric.choiceCounts).toEqual({ A: 50, B: 30, C: 20, D: 0, [UNANSWERED_KEY]: 0 });
    expect(metric.choiceRates).toEqual({ A: 0.5, B: 0.3, C: 0.2, D: 0, [UNANSWERED_KEY]: 0 });
  });

  it("未回答を1回の回答として数える", () => {
    const question = makeQuestion();
    const rows = [
      ...makeUsers(80, 80),
      ...Array.from({ length: 20 }, (_, i) =>
        attempt({ userId: `x${i}`, selectedAnswer: null, isCorrect: false }),
      ),
    ];

    const [metric] = aggregateQuestionMetrics(rows, [question]);
    expect(metric.firstAttemptCount).toBe(100);
    expect(metric.unansweredRate).toBe(0.2);
    expect(metric.choiceCounts[UNANSWERED_KEY]).toBe(20);
    // 未回答を分母から外すと、難しい問題ほど簡単に見えてしまう。
    expect(metric.firstAttemptCorrectRate).toBe(0.8);
    expect(metric.anomalyFlags).toContain("high_unanswered_rate");
  });

  it("中央値と p90 を出す", () => {
    expect(median([])).toBeNull();
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);

    // nearest-rank。10件なら p90 は9番目の値。
    const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(ten, 0.9)).toBe(9);
    expect(percentile([5], 0.9)).toBe(5);
    expect(percentile([], 0.9)).toBeNull();
  });

  it("集計でも中央値・p90 が初回回答から出る", () => {
    const question = makeQuestion();
    const rows = Array.from({ length: 100 }, (_, i) =>
      attempt({ userId: `u${i}`, timeSpentSeconds: i + 1 }),
    );

    const [metric] = aggregateQuestionMetrics(rows, [question]);
    expect(metric.medianTimeSeconds).toBe(50.5);
    expect(metric.p90TimeSeconds).toBe(90);
  });

  it("所要時間が記録されていない回答は時間の統計から外す（正答率には残す）", () => {
    const question = makeQuestion();
    const rows = [
      ...Array.from({ length: 50 }, (_, i) =>
        attempt({ userId: `t${i}`, timeSpentSeconds: 40 }),
      ),
      ...Array.from({ length: 50 }, (_, i) =>
        attempt({ userId: `n${i}`, timeSpentSeconds: null }),
      ),
    ];

    const [metric] = aggregateQuestionMetrics(rows, [question]);
    expect(metric.firstAttemptCount).toBe(100);
    expect(metric.medianTimeSeconds).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// 4. 推奨難易度と異常フラグ
// ---------------------------------------------------------------------------

describe("推奨難易度", () => {
  it("正答率の帯どおりに1〜5を返す", () => {
    expect(toRecommendedDifficulty(0.95)).toBe(1);
    expect(toRecommendedDifficulty(0.9)).toBe(1);
    expect(toRecommendedDifficulty(0.89)).toBe(2);
    expect(toRecommendedDifficulty(0.75)).toBe(2);
    expect(toRecommendedDifficulty(0.74)).toBe(3);
    expect(toRecommendedDifficulty(0.55)).toBe(3);
    expect(toRecommendedDifficulty(0.54)).toBe(4);
    expect(toRecommendedDifficulty(0.35)).toBe(4);
    expect(toRecommendedDifficulty(0.34)).toBe(5);
    expect(toRecommendedDifficulty(null)).toBeNull();
  });

  it("作問時の1〜3へ丸められる", () => {
    expect(toEstimatedScale(1)).toBe(1);
    expect(toEstimatedScale(2)).toBe(1);
    expect(toEstimatedScale(3)).toBe(2);
    expect(toEstimatedScale(4)).toBe(3);
    expect(toEstimatedScale(5)).toBe(3);
  });

  it("QuestionRecord.estimatedDifficulty を書き換えない", () => {
    const question = makeQuestion({ estimatedDifficulty: 1 });
    const rows = makeUsers(100, 10); // 実測は難しい
    const [metric] = aggregateQuestionMetrics(rows, [question]);

    expect(metric.recommendedDifficulty).toBe(5);
    // 入力した問題オブジェクトは無傷。
    expect(question.estimatedDifficulty).toBe(1);
  });
});

describe("異常フラグ", () => {
  const question = makeQuestion();

  it("too_easy / too_hard", () => {
    const easy = aggregateQuestionMetrics(makeUsers(100, 96), [question])[0];
    expect(easy.anomalyFlags).toContain("too_easy");

    const hard = aggregateQuestionMetrics(makeUsers(100, 20), [question])[0];
    expect(hard.anomalyFlags).toContain("too_hard");

    const normal = aggregateQuestionMetrics(makeUsers(100, 60), [question])[0];
    expect(normal.anomalyFlags).not.toContain("too_easy");
    expect(normal.anomalyFlags).not.toContain("too_hard");
  });

  it("non_functioning_distractor", () => {
    // D を誰も選ばない。
    const rows = [
      ...Array.from({ length: 60 }, (_, i) => attempt({ userId: `a${i}`, selectedAnswer: "A", isCorrect: true })),
      ...Array.from({ length: 20 }, (_, i) => attempt({ userId: `b${i}`, selectedAnswer: "B", isCorrect: false })),
      ...Array.from({ length: 20 }, (_, i) => attempt({ userId: `c${i}`, selectedAnswer: "C", isCorrect: false })),
    ];
    expect(aggregateQuestionMetrics(rows, [question])[0].anomalyFlags).toContain(
      "non_functioning_distractor",
    );
  });

  it("dominant_wrong_choice", () => {
    // 正答 A が 25%、誤答 B が 55%。
    const rows = [
      ...Array.from({ length: 25 }, (_, i) => attempt({ userId: `a${i}`, selectedAnswer: "A", isCorrect: true })),
      ...Array.from({ length: 55 }, (_, i) => attempt({ userId: `b${i}`, selectedAnswer: "B", isCorrect: false })),
      ...Array.from({ length: 10 }, (_, i) => attempt({ userId: `c${i}`, selectedAnswer: "C", isCorrect: false })),
      ...Array.from({ length: 10 }, (_, i) => attempt({ userId: `d${i}`, selectedAnswer: "D", isCorrect: false })),
    ];
    expect(aggregateQuestionMetrics(rows, [question])[0].anomalyFlags).toContain(
      "dominant_wrong_choice",
    );
  });

  it("unusually_fast / unusually_slow", () => {
    const fast = aggregateQuestionMetrics(makeUsers(100, 60, { timeSpentSeconds: 4 }), [question])[0];
    expect(fast.anomalyFlags).toContain("unusually_fast");

    const slow = aggregateQuestionMetrics(makeUsers(100, 60, { timeSpentSeconds: 200 }), [question])[0];
    expect(slow.anomalyFlags).toContain("unusually_slow");
  });

  it("estimate_mismatch は2段階ずれたときだけ立つ", () => {
    // 作問時 1（やさしい）に対して実測は 5（かなり難しい）→ 丸めると 3。差2。
    const easyEstimate = makeQuestion({ estimatedDifficulty: 1 });
    const mismatch = aggregateQuestionMetrics(makeUsers(100, 20), [easyEstimate])[0];
    expect(mismatch.anomalyFlags).toContain("estimate_mismatch");

    // 作問時 2 に対して実測 3（丸めて 2）→ 差0。
    const aligned = aggregateQuestionMetrics(makeUsers(100, 60), [makeQuestion()])[0];
    expect(aligned.anomalyFlags).not.toContain("estimate_mismatch");
  });
});

// ---------------------------------------------------------------------------
// 5. 決定性・プライバシー・0件
// ---------------------------------------------------------------------------

describe("集計の性質", () => {
  const question = makeQuestion();

  it("回答が0件でも正常に終わる", () => {
    expect(aggregateQuestionMetrics([], [question])).toEqual([]);
    const markdown = renderMetricsMarkdown([]);
    expect(markdown).toContain("回答履歴がありません");
  });

  it("同じ入力なら同じ結果になる（入力の並びが変わっても）", () => {
    const rows = makeUsers(100, 55, { timeSpentSeconds: 42 });
    const first = aggregateQuestionMetrics(rows, [question]);
    const reversed = aggregateQuestionMetrics([...rows].reverse(), [question]);
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(first));
  });

  it("結果は問題ID・version の昇順で安定する", () => {
    const q1 = makeQuestion({ id: "b-question" });
    const q2 = makeQuestion({ id: "a-question" });
    const rows = [
      ...makeUsers(5, 3, { questionId: "b-question" }),
      ...makeUsers(5, 3, { questionId: "a-question" }),
      ...makeUsers(5, 3, { questionId: "a-question", questionVersion: 2 }),
    ];

    const metrics = aggregateQuestionMetrics(rows, [q1, q2]);
    expect(metrics.map((m) => `${m.questionId}@${m.questionVersion}`)).toEqual([
      "a-question@1",
      "a-question@2",
      "b-question@1",
    ]);
  });

  it("レポートに個人を識別できる値が出ない", () => {
    const rows = makeUsers(100, 60);
    const metrics = aggregateQuestionMetrics(rows, [question]);
    const serialized = JSON.stringify(metrics);
    const markdown = renderMetricsMarkdown(metrics);

    for (const output of [serialized, markdown]) {
      expect(output).not.toContain("user-");
      expect(output).not.toContain("attempt-");
      expect(output).not.toContain("2026-07-01");
    }
    // 集計結果のキーにも user_id 由来のものが無い。
    for (const metric of metrics) {
      expect(Object.keys(metric)).not.toContain("userId");
      expect(Object.keys(metric.choiceCounts).sort()).toEqual(["A", "B", "C", "D", UNANSWERED_KEY]);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. fixture を使った通し確認
// ---------------------------------------------------------------------------

describe("fixture による通し確認", () => {
  const fixture = JSON.parse(
    readFileSync(path.join(ROOT, "test/fixtures/questionAttempts.sample.json"), "utf8"),
  ) as { attempts: Record<string, unknown>[] };

  const rows: QuestionAttemptRow[] = fixture.attempts.map((row) => ({
    attemptId: String(row.attempt_id),
    userId: String(row.user_id),
    questionId: String(row.question_id),
    questionVersion: row.question_version === null ? null : Number(row.question_version),
    selectedAnswer: (row.selected_answer as string | null) ?? null,
    isCorrect: Boolean(row.is_correct),
    timeSpentSeconds: row.time_spent_seconds === null ? null : Number(row.time_spent_seconds),
    answeredAt: String(row.answered_at),
  }));

  const metrics = aggregateQuestionMetrics(rows, getAllQuestions());

  it("3段階の標本状態がそろっている", () => {
    expect(metrics.map((m) => m.sampleStatus).sort()).toEqual([
      "insufficient",
      "provisional",
      "reliable",
    ]);
  });

  it("復習を含む問題で初回正答率と全回答正答率が食い違う", () => {
    const metric = metrics.find((m) => m.questionId === "ipa-it-passport-2026-q001")!;
    expect(metric.allAttemptCount).toBeGreaterThan(metric.firstAttemptCount);
    expect(metric.allAttemptCorrectRate!).toBeGreaterThan(metric.firstAttemptCorrectRate!);
  });

  it("難しすぎる問題に異常フラグが立つ", () => {
    const metric = metrics.find((m) => m.questionId === "ipa-it-passport-2026-q002")!;
    expect(metric.anomalyFlags).toContain("too_hard");
    expect(metric.anomalyFlags).toContain("dominant_wrong_choice");
    expect(metric.anomalyFlags).toContain("high_unanswered_rate");
    expect(metric.recommendedDifficulty).toBe(5);
  });

  it("fixture のユーザーIDがレポートに出ない", () => {
    expect(JSON.stringify(metrics)).not.toContain("fixture-user");
    expect(renderMetricsMarkdown(metrics, "fixture")).not.toContain("fixture-user");
  });

  it("fixture 由来であることがレポートに明記される", () => {
    expect(renderMetricsMarkdown(metrics, "fixture")).toContain("実データではありません");
    expect(renderMetricsMarkdown(metrics, "supabase")).not.toContain("実データではありません");
  });
});
