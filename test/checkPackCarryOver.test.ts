import { describe, expect, it } from "vitest";
import type { ReviewItem, UserAnswer } from "@/types";
import type { CheckQuestion } from "@/types/content";
import { combinedQuizRate, planPackQuizQuestions } from "@/lib/checkPackCarryOver";

const TOPIC = "tech-binary-data";
// ローカル日付の判定なので、テストもローカル時刻で組み立てる。
const NOW = new Date(2026, 8, 25, 15, 0, 0);
const EARLIER_TODAY = new Date(2026, 8, 25, 14, 50, 0).toISOString();
const YESTERDAY = new Date(2026, 8, 24, 14, 50, 0).toISOString();

const questions: CheckQuestion[] = [1, 2, 3, 4].map((n) => ({
  id: `${TOPIC}-q${n}`,
  prompt: `問題${n}`,
  choices: [
    { key: "A", text: "A" },
    { key: "B", text: "B" },
  ],
  correctChoice: "A",
  explanation: "",
  difficulty: 1,
}));

function answer(n: number, isCorrect: boolean, answeredAt = EARLIER_TODAY): UserAnswer {
  return {
    questionId: `${TOPIC}-q${n}`,
    isCorrect,
    answeredAt,
    tag: "tech",
    topicId: TOPIC,
  };
}

const ids = (qs: CheckQuestion[]) => qs.map((q) => q.id);

describe("planPackQuizQuestions", () => {
  it("Case 1: 確認問題4問すべて正解なら出題0問（全問引き継ぎ）", () => {
    const plan = planPackQuizQuestions(
      questions, TOPIC, [1, 2, 3, 4].map((n) => answer(n, true)), [], NOW,
    );
    expect(plan.toAsk).toEqual([]);
    expect(plan.carried.map((c) => c.questionId)).toEqual(ids(questions));
  });

  it("Case 2: 3問正解・1問不正解なら不正解の1問だけ出題", () => {
    const plan = planPackQuizQuestions(
      questions, TOPIC, [answer(1, true), answer(2, false), answer(3, true), answer(4, true)], [], NOW,
    );
    expect(ids(plan.toAsk)).toEqual([`${TOPIC}-q2`]);
    expect(plan.carried).toHaveLength(3);
  });

  it("Case 3: 2問だけ回答して2問正解なら未回答の2問を出題（元の順序を保つ）", () => {
    const plan = planPackQuizQuestions(
      questions, TOPIC, [answer(1, true), answer(3, true)], [], NOW,
    );
    expect(ids(plan.toAsk)).toEqual([`${TOPIC}-q2`, `${TOPIC}-q4`]);
  });

  it("Case 4: 正解済みでもトピックの復習期限が来ていれば全問出題", () => {
    const due: ReviewItem[] = [
      { topicId: TOPIC, dueAt: new Date(2026, 8, 25, 9, 0, 0).toISOString(), reason: "復習期限" },
    ];
    const plan = planPackQuizQuestions(
      questions, TOPIC, [1, 2, 3, 4].map((n) => answer(n, true)), due, NOW,
    );
    expect(plan.toAsk).toEqual(questions);
    expect(plan.carried).toEqual([]);
  });

  it("まだ期限の来ていない復習予定は省略を妨げない", () => {
    const later: ReviewItem[] = [
      { topicId: TOPIC, dueAt: new Date(2026, 8, 28).toISOString(), reason: "定着確認" },
    ];
    const plan = planPackQuizQuestions(
      questions, TOPIC, [1, 2, 3, 4].map((n) => answer(n, true)), later, NOW,
    );
    expect(plan.toAsk).toEqual([]);
  });

  it("別日の正解は引き継がない（永久スキップにしない）", () => {
    const plan = planPackQuizQuestions(
      questions, TOPIC, [1, 2, 3, 4].map((n) => answer(n, true, YESTERDAY)), [], NOW,
    );
    expect(plan.toAsk).toEqual(questions);
  });

  it("同じ問題は最新の回答で判定する（正解の後に不正解なら出題）", () => {
    const plan = planPackQuizQuestions(
      questions,
      TOPIC,
      [answer(1, true, new Date(2026, 8, 25, 10).toISOString()), answer(1, false)],
      [],
      NOW,
    );
    expect(ids(plan.toAsk)).toContain(`${TOPIC}-q1`);
  });

  it("別トピックとして記録された同名IDや、記録なしでは省略しない", () => {
    const other = { ...answer(1, true), topicId: "other-topic" };
    expect(planPackQuizQuestions(questions, TOPIC, [other], [], NOW).toAsk).toEqual(questions);
    expect(planPackQuizQuestions(questions, TOPIC, undefined, undefined, NOW).toAsk).toEqual(questions);
  });
});

describe("combinedQuizRate", () => {
  it("省いた正解を含めた全設問で率を出す（問題数が減っても率は下がらない）", () => {
    expect(combinedQuizRate(4, 0, 0)).toBe(100);
    expect(combinedQuizRate(3, 1, 1)).toBe(100);
    expect(combinedQuizRate(3, 0, 1)).toBe(75);
    expect(combinedQuizRate(2, 1, 2)).toBe(75);
    expect(combinedQuizRate(0, 3, 4)).toBe(75);
    expect(combinedQuizRate(0, 0, 0)).toBeNull();
  });
});
