// 公式過去問 年度別演習の採点。
//
// 区分別の集計には official.examField（公式問題冊子上の出題区分）を使う。
// syllabusNode.field（内容から見た分類）は使わない。年度別演習の目的は
// 「その年度の公式の区分ごとにどれだけ取れたか」を再現することなので、
// アプリ側の内容分類で集計すると公式の34/20/46という構成と合わなくなる。

import { OFFICIAL_EXAM_FIELDS } from "@/lib/questionBank/officialExamField";
import type { ChoiceKey } from "@/types";
import type { AppState, QuestionExposureMap, UserAnswer } from "@/types";
import type { QuestionRecord } from "@/types/questionBank";
import type { TopicField } from "@/types/content";
import type {
  PastExamAnswer,
  PastExamFieldSummary,
  PastExamMode,
  PastExamQuestionResult,
  PastExamResult,
} from "@/types/pastExam";
import { getTopic } from "@/lib/content";
import { updateLearningLoopProgress } from "@/lib/learningLoop";
import { exposureStateFor } from "@/lib/questionExposure";

/**
 * 採点に必要な情報だけを取り出した形。
 * QuestionRecord そのものではなく、この最小限の形を受け取る。
 * クライアント側は QuestionRecord を持たない（サーバから表示用の形で受け取る）ので、
 * 採点をサーバ・クライアントの両方から同じ実装で呼べるようにするため。
 * PastExamQuestionView はこの形をそのまま満たす。
 */
export type GradableQuestion = {
  id: string;
  questionNumber: number;
  examField: TopicField;
  correctChoice: ChoiceKey;
  topicId: string;
};

/** QuestionRecord を採点用の形にする（サーバ・テスト向け）。 */
export function toGradableQuestion(record: QuestionRecord): GradableQuestion {
  return {
    id: record.id,
    questionNumber: record.official?.questionNumber ?? 0,
    examField: (record.official?.examField ?? "strategy") as TopicField,
    correctChoice: record.correctChoice,
    topicId: record.primaryTopicId,
  };
}

/** 正答率（％）。小数第1位を四捨五入した整数。母数0は0を返す。 */
export function percentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * 採点する。
 * 未回答は不正解として正答数には数えないが、未回答数として別に集計する
 * （「間違えた」と「手が回らなかった」を結果画面で区別できるようにするため）。
 */
export function gradePastExam(params: {
  sessionId: string;
  year: number;
  mode: PastExamMode;
  questions: GradableQuestion[];
  answers: Record<number, PastExamAnswer>;
}): PastExamResult {
  const { sessionId, year, mode, questions, answers } = params;

  const results: PastExamQuestionResult[] = questions.map((q) => {
    const selected = answers[q.questionNumber]?.selected ?? null;
    return {
      questionId: q.id,
      questionNumber: q.questionNumber,
      // official_past の published 問題では examField は必須（validate で保証済み）。
      examField: q.examField,
      selected,
      correctChoice: q.correctChoice,
      isCorrect: selected !== null && selected === q.correctChoice,
      isUnanswered: selected === null,
      topicId: q.topicId,
    };
  });

  const correct = results.filter((r) => r.isCorrect).length;
  const unanswered = results.filter((r) => r.isUnanswered).length;

  const byField: PastExamFieldSummary[] = OFFICIAL_EXAM_FIELDS.map((field) => {
    const inField = results.filter((r) => r.examField === field);
    const correctInField = inField.filter((r) => r.isCorrect).length;
    return {
      field,
      total: inField.length,
      correct: correctInField,
      rate: percentage(correctInField, inField.length),
    };
  });

  const byTopicMap = new Map<string, { correct: number; total: number }>();
  for (const question of results) {
    if (!question.topicId) continue;
    const current = byTopicMap.get(question.topicId) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (question.isCorrect) current.correct += 1;
    byTopicMap.set(question.topicId, current);
  }
  const byTopic = [...byTopicMap.entries()]
    .map(([topicId, score]) => ({
      topicId,
      ...score,
      rate: percentage(score.correct, score.total),
    }))
    .sort((a, b) => a.rate - b.rate || b.total - a.total || a.topicId.localeCompare(b.topicId));

  return {
    sessionId,
    year,
    mode,
    total: results.length,
    correct,
    unanswered,
    rate: percentage(correct, results.length),
    byField,
    byTopic,
    questions: results,
  };
}

/** 公式過去問の採点結果をAppStateの共通学習ループへ反映する。 */
export function recordPastExamLearningResult(
  state: AppState,
  result: PastExamResult,
  sessionAnswers: Record<number, PastExamAnswer>,
  exposures: QuestionExposureMap,
  now: Date = new Date(),
): AppState {
  const answers: UserAnswer[] = result.questions.flatMap((question) => {
    const topic = getTopic(question.topicId);
    if (!topic) return [];
    return [{
      questionId: question.questionId,
      selectedChoice: question.selected ?? undefined,
      isCorrect: question.isCorrect,
      answeredAt:
        sessionAnswers[question.questionNumber]?.answeredAt || now.toISOString(),
      tag: topic.tags[0] ?? topic.field,
      topicId: topic.id,
    }];
  });
  const allAnswers = [...state.answers, ...answers];
  const progress = updateLearningLoopProgress(
    {
      ...state.progress,
      weakTags: Array.from(
        new Set(allAnswers.filter((answer) => !answer.isCorrect).map((answer) => answer.tag)),
      ),
      lastPlayedAt: now.toISOString(),
    },
    answers.map((answer) => ({
      topicId: answer.topicId!,
      questionId: answer.questionId,
      kind: "past_exam" as const,
      isCorrect: answer.isCorrect,
      exposureState: exposureStateFor(exposures, answer.questionId),
      answeredAt: answer.answeredAt,
    })),
    now,
  );
  return { ...state, answers: allAnswers, progress };
}

/** 誤答（未回答を含む）の問題だけ。復習導線と誤答フィルターに使う。 */
export function incorrectResults(result: PastExamResult): PastExamQuestionResult[] {
  return result.questions.filter((r) => !r.isCorrect);
}

/** 誤答した問題の復習先トピックID（重複なし・出題順）。 */
export function incorrectTopicIds(result: PastExamResult): string[] {
  const seen = new Set<string>();
  for (const r of incorrectResults(result)) {
    if (r.topicId) seen.add(r.topicId);
  }
  return [...seen];
}
