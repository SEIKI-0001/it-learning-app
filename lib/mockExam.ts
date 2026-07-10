import type { AppState, UserAnswer } from "@/types";
import type { CheckQuestion, TopicField } from "@/types/content";
import { getAllTopics } from "@/lib/content";

export const MOCK_EXAM_RULE = {
  questionCount: 100,
  timeLimitSeconds: 120 * 60,
  fieldQuestionCounts: {
    strategy: 35,
    management: 20,
    technology: 45,
  } satisfies Record<TopicField, number>,
} as const;

export type MockExam = {
  questions: CheckQuestion[];
  topicIdByQuestionId: Record<string, string>;
  fieldByQuestionId: Record<string, TopicField>;
};

export type MockExamResult = {
  correct: number;
  total: number;
  fieldScores: Record<TopicField, { correct: number; total: number }>;
  wrongTopicIds: string[];
};

type QuestionSource = {
  question: CheckQuestion;
  topicId: string;
  field: TopicField;
};

/** 文字列から再現可能な疑似乱数を作る。模試の途中で設問順が変わらない。 */
function seedNumber(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function shuffled<T>(items: T[], seed: string): T[] {
  let value = seedNumber(seed) || 1;
  const random = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function selectFromField(
  pool: QuestionSource[],
  count: number,
  usedQuestionIds: Set<string>,
  recentQuestionIds: Set<string>,
  seed: string,
): QuestionSource[] {
  const randomized = shuffled(pool, seed);
  const selected: QuestionSource[] = [];
  // 直近に解いた設問を避け、同一トピックの連続出題も抑える。
  for (const skipRecent of [true, false]) {
    const lastTopicIds = new Set<string>();
    for (const item of randomized) {
      if (selected.length >= count) break;
      if (usedQuestionIds.has(item.question.id)) continue;
      if (skipRecent && recentQuestionIds.has(item.question.id)) continue;
      if (lastTopicIds.has(item.topicId) && selected.length < Math.min(count, 8)) continue;
      selected.push(item);
      usedQuestionIds.add(item.question.id);
      lastTopicIds.add(item.topicId);
    }
  }
  return selected;
}

/** 3分野のバランスを保ち、重複のない100問を生成する。 */
export function generateMockExam(state: AppState, seed = "mock-exam"): MockExam {
  const recentQuestionIds = new Set(state.answers.slice(-40).map((answer) => answer.questionId));
  const byField: Record<TopicField, QuestionSource[]> = {
    strategy: [],
    management: [],
    technology: [],
  };

  for (const topic of getAllTopics()) {
    for (const question of topic.checkQuestions) {
      byField[topic.field].push({ question, topicId: topic.id, field: topic.field });
    }
  }

  const usedQuestionIds = new Set<string>();
  const selected = (Object.keys(MOCK_EXAM_RULE.fieldQuestionCounts) as TopicField[]).flatMap(
    (field) =>
      selectFromField(
        byField[field],
        MOCK_EXAM_RULE.fieldQuestionCounts[field],
        usedQuestionIds,
        recentQuestionIds,
        `${seed}:${field}`,
      ),
  );

  if (selected.length !== MOCK_EXAM_RULE.questionCount) {
    throw new Error("100問模試に必要な重複なしの問題数が不足しています。");
  }

  const questions = shuffled(selected, `${seed}:order`);
  return {
    questions: questions.map((item) => item.question),
    topicIdByQuestionId: Object.fromEntries(
      questions.map((item) => [item.question.id, item.topicId]),
    ),
    fieldByQuestionId: Object.fromEntries(
      questions.map((item) => [item.question.id, item.field]),
    ),
  };
}

export function scoreMockExam(exam: MockExam, answers: UserAnswer[]): MockExamResult {
  const fieldScores: MockExamResult["fieldScores"] = {
    strategy: { correct: 0, total: 0 },
    management: { correct: 0, total: 0 },
    technology: { correct: 0, total: 0 },
  };
  const wrongTopicIds = new Set<string>();
  let correct = 0;

  for (const question of exam.questions) {
    const field = exam.fieldByQuestionId[question.id];
    fieldScores[field].total += 1;
    const answer = answers.find((item) => item.questionId === question.id);
    if (answer?.isCorrect) {
      correct += 1;
      fieldScores[field].correct += 1;
    } else {
      const topicId = exam.topicIdByQuestionId[question.id];
      if (topicId) wrongTopicIds.add(topicId);
    }
  }

  return {
    correct,
    total: exam.questions.length,
    fieldScores,
    wrongTopicIds: [...wrongTopicIds],
  };
}
