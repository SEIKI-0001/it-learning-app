import { describe, expect, it } from "vitest";
import type { AppState, ReviewItem, TopicMasteryStats, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import {
  buildGrowthChallenge,
  buildGrowthComparison,
  hasGrowthChallenge,
  GROWTH_CHALLENGE_COOLDOWN_DAYS,
  GROWTH_CHALLENGE_SIZE,
  REVIEW_OWNED_SEVERITY,
} from "@/lib/growthChallenge";

// GF-P0-003「成長確認チャレンジ」。要件書 §16.1 が求める
// 「過去結果なし・既出問題・canonical重複・日付境界」を固定する。

const DAY_MS = 86_400_000;
const NOW = new Date(2026, 7, 30, 12, 0, 0);

/** 実在するトピックと確認問題から fixture を作る（架空IDだと索引に載らないため）。 */
const TOPICS = getAllTopics().filter((topic) => topic.checkQuestions.length > 0);
const TOPIC_A = TOPICS[0];
const TOPIC_B = TOPICS[1];
const QUESTION_A1 = TOPIC_A.checkQuestions[0];
const QUESTION_B1 = TOPIC_B.checkQuestions[0];

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function answer(questionId: string, isCorrect: boolean, at: string, topicId?: string): UserAnswer {
  return {
    questionId,
    topicId,
    tag: "tag",
    selectedChoice: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt: at,
  };
}

function stats(topicId: string, masteryScore: number): Record<string, TopicMasteryStats> {
  return {
    [topicId]: {
      topicId,
      masteryScore,
      lastEvaluatedAt: daysAgo(10),
      correctCount: 3,
      incorrectCount: 2,
      reviewSuccessCount: 0,
      recentEvidence: [],
    },
  };
}

function state(
  answers: UserAnswer[],
  masteryStats: Record<string, TopicMasteryStats> = {},
  reviewQueue: ReviewItem[] = [],
): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      topicMasteryStats: masteryStats,
      reviewQueue,
      currentDay: 1,
      completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
    },
    answers,
  };
}

function build(appState: AppState) {
  return buildGrowthChallenge({ state: appState, now: NOW });
}

describe("no comparison material", () => {
  it("returns nothing for a user with no answer history", () => {
    expect(build(state([]))).toEqual([]);
    expect(hasGrowthChallenge({ state: state([]), now: NOW })).toBe(false);
  });

  it("returns nothing when every past answer was correct on a healthy topic", () => {
    expect(build(state([answer(QUESTION_A1.id, true, daysAgo(30))]))).toEqual([]);
  });

  it("ignores answers to questions that are not in the app content", () => {
    expect(build(state([answer("no-such-question", false, daysAgo(30))]))).toEqual([]);
  });
});

describe("cooldown", () => {
  it("skips a question answered more recently than the cooldown", () => {
    const recent = state([answer(QUESTION_A1.id, false, daysAgo(1))]);

    expect(build(recent)).toEqual([]);
  });

  it("includes a question once the cooldown has passed", () => {
    const aged = state([answer(QUESTION_A1.id, false, daysAgo(GROWTH_CHALLENGE_COOLDOWN_DAYS + 1))]);

    expect(build(aged).map((item) => item.questionId)).toEqual([QUESTION_A1.id]);
  });

  it("treats the exact cooldown boundary as elapsed", () => {
    // ちょうど N 日前は「N日が経過した」と見なして出題する。
    const boundary = state([answer(QUESTION_A1.id, false, daysAgo(GROWTH_CHALLENGE_COOLDOWN_DAYS))]);

    expect(build(boundary).map((item) => item.questionId)).toEqual([QUESTION_A1.id]);
  });

  it("excludes anything inside the cooldown window", () => {
    const inside = state([
      answer(QUESTION_A1.id, false, daysAgo(GROWTH_CHALLENGE_COOLDOWN_DAYS - 0.5)),
    ]);

    expect(build(inside)).toEqual([]);
  });

  it("accepts a custom cooldown", () => {
    const items = buildGrowthChallenge({
      state: state([answer(QUESTION_A1.id, false, daysAgo(1))]),
      now: NOW,
      cooldownDays: 0,
    });

    expect(items).toHaveLength(1);
  });
});

describe("selection", () => {
  it("uses only the most recent attempt per question", () => {
    // 昔まちがえたが、その後に正解している → もう「つまずき」ではない。
    const recovered = state([
      answer(QUESTION_A1.id, false, daysAgo(30)),
      answer(QUESTION_A1.id, true, daysAgo(20)),
    ]);

    expect(build(recovered)).toEqual([]);
  });

  it("does not use a topic that is merely low on mastery", () => {
    // いま解けない内容は復習の担当。成長を示す材料にもならないので扱わない。
    const lowMastery = state([answer(QUESTION_A1.id, true, daysAgo(20))], stats(TOPIC_A.id, 30));

    expect(build(lowMastery)).toEqual([]);
  });

  it("does not include a previously correct question on a healthy topic", () => {
    const healthy = state([answer(QUESTION_A1.id, true, daysAgo(20))], stats(TOPIC_A.id, 90));

    expect(build(healthy)).toEqual([]);
  });

  it("only offers questions that were actually missed", () => {
    const mixed = state([
      answer(QUESTION_A1.id, true, daysAgo(40)),
      answer(QUESTION_B1.id, false, daysAgo(10)),
    ]);

    expect(build(mixed).map((item) => item.questionId)).toEqual([QUESTION_B1.id]);
  });

  it("prefers the least recently answered", () => {
    const both = state([
      answer(QUESTION_A1.id, false, daysAgo(10)),
      answer(QUESTION_B1.id, false, daysAgo(40)),
    ]);

    expect(build(both).map((item) => item.questionId)).toEqual([QUESTION_B1.id, QUESTION_A1.id]);
  });

  it("keeps the challenge short (a visualization aid, not a study set)", () => {
    expect(GROWTH_CHALLENGE_SIZE).toBeLessThanOrEqual(3);
  });

  it("never returns more than the challenge size", () => {
    const many = TOPICS.flatMap((topic) =>
      topic.checkQuestions.map((question) => answer(question.id, false, daysAgo(20))),
    );

    expect(build(state(many)).length).toBeLessThanOrEqual(GROWTH_CHALLENGE_SIZE);
  });

  it("deduplicates repeat attempts of the same question into one item", () => {
    const repeated = state([
      answer(QUESTION_A1.id, false, daysAgo(40)),
      answer(QUESTION_A1.id, false, daysAgo(30)),
      answer(QUESTION_A1.id, false, daysAgo(20)),
    ]);
    const items = build(repeated);

    expect(items).toHaveLength(1);
    expect(items[0].previous.attemptCount).toBe(3);
    expect(items[0].previous.answeredAt).toBe(daysAgo(20));
  });

  it("resolves every item to a real topic and question", () => {
    const items = build(state([answer(QUESTION_A1.id, false, daysAgo(20))]));

    expect(items[0].topicId).toBe(TOPIC_A.id);
    expect(items[0].topicTitle).toBe(TOPIC_A.title);
    expect(items[0].question.id).toBe(QUESTION_A1.id);
  });
});

describe("review keeps ownership", () => {
  const past = () => [answer(QUESTION_A1.id, false, daysAgo(20))];

  it("skips a topic that is sitting in the review queue", () => {
    const queued = state(past(), {}, [
      { topicId: TOPIC_A.id, dueAt: new Date(NOW.getTime() + 5 * DAY_MS).toISOString(), reason: "復習" },
    ]);

    expect(build(queued)).toEqual([]);
  });

  it("skips a topic whose review is already overdue", () => {
    const overdue = state(past(), {}, [
      { topicId: TOPIC_A.id, dueAt: new Date(NOW.getTime() - DAY_MS).toISOString(), reason: "復習" },
    ]);

    expect(build(overdue)).toEqual([]);
  });

  it("skips a high-severity weak topic", () => {
    // summary_exam_miss は severity 95 で、しきい値を超える。
    const weak = state(past(), {
      [TOPIC_A.id]: {
        topicId: TOPIC_A.id,
        masteryScore: 30,
        lastEvaluatedAt: daysAgo(5),
        correctCount: 1,
        incorrectCount: 6,
        reviewSuccessCount: 0,
        recentEvidence: [
          { kind: "summary_exam", isCorrect: false, answeredAt: daysAgo(5), questionId: "q", exposureState: "seen" },
        ],
      } as TopicMasteryStats,
    });
    const items = build(weak);

    expect(items.every((item) => item.topicId !== TOPIC_A.id)).toBe(true);
  });

  it("keeps a past stumble that review has already released", () => {
    // 復習キューにも弱点にも無い＝復習系が手を離したもの。ここだけが対象。
    expect(build(state(past())).map((item) => item.questionId)).toEqual([QUESTION_A1.id]);
  });

  it("uses a severity threshold that covers the review-owned reasons", () => {
    // repeated_miss(80) / review_failure(90) / summary_exam_miss(95) を捕捉する。
    expect(REVIEW_OWNED_SEVERITY).toBeLessThanOrEqual(80);
  });
});

describe("purity", () => {
  it("does not mutate the state it reads", () => {
    const input = state([answer(QUESTION_A1.id, false, daysAgo(20))]);
    const snapshot = structuredClone(input);

    build(input);

    expect(input).toEqual(snapshot);
  });

  it("produces no progression state of its own", () => {
    const items = build(state([answer(QUESTION_A1.id, false, daysAgo(20))]));

    for (const item of items) {
      expect(item).not.toHaveProperty("xp");
      expect(item).not.toHaveProperty("badgeId");
      expect(item).not.toHaveProperty("exposure");
    }
  });
});

describe("comparison", () => {
  const challenge = () =>
    build(
      state([
        answer(QUESTION_A1.id, false, daysAgo(40)),
        answer(QUESTION_B1.id, false, daysAgo(30)),
      ]),
    );

  it("pairs each question with its previous result", () => {
    const items = challenge();
    const comparison = buildGrowthComparison(items, [
      answer(items[0].questionId, true, NOW.toISOString()),
      answer(items[1].questionId, false, NOW.toISOString()),
    ]);

    expect(comparison.total).toBe(2);
    expect(comparison.previousCorrectCount).toBe(0);
    expect(comparison.currentCorrectCount).toBe(1);
    expect(comparison.improvedCount).toBe(1);
  });

  it("marks a previously wrong answer that is now right as improved", () => {
    const items = challenge();
    const comparison = buildGrowthComparison(items, [
      answer(items[0].questionId, true, NOW.toISOString()),
    ]);

    expect(comparison.rows[0]).toMatchObject({
      previousCorrect: false,
      currentCorrect: true,
      improved: true,
    });
  });

  it("does not count a still-wrong answer as improved", () => {
    const items = challenge();
    const comparison = buildGrowthComparison(items, [
      answer(items[0].questionId, false, NOW.toISOString()),
    ]);

    expect(comparison.improvedCount).toBe(0);
  });

  it("only compares answers to the same question id", () => {
    const items = challenge();
    const comparison = buildGrowthComparison(items, [
      answer("unrelated-question", true, NOW.toISOString()),
    ]);

    expect(comparison.rows).toEqual([]);
    expect(comparison.total).toBe(0);
  });

  it("skips challenge items that were never answered", () => {
    const items = challenge();
    const comparison = buildGrowthComparison(items, [
      answer(items[0].questionId, true, NOW.toISOString()),
    ]);

    expect(comparison.total).toBe(1);
    expect(comparison.rows.map((row) => row.questionId)).toEqual([items[0].questionId]);
  });

  it("returns an empty comparison for an empty challenge", () => {
    expect(buildGrowthComparison([], [])).toEqual({
      rows: [],
      total: 0,
      previousCorrectCount: 0,
      currentCorrectCount: 0,
      improvedCount: 0,
    });
  });
});
