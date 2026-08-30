"use client";

// 年度別演習の回答を question_attempts へ送る（クライアント側）。
//
// 方針:
//   - 保存APIのatomic RPCが返す初見状態をMasteryへ渡す。
//     失敗時はunknownとなり、初見加点を付けない。
//   - 練習モードは1問ごと（回答は最初の1回で確定するので再送しない）、
//     本番モードは採点時にまとめて送る。
//   - 出所・版・年度・公式区分は送らない。サーバ側が問題IDから解決する。
//   - isCorrect も送るが、サーバ側は問題バンクの正答で計算し直す（この値は使わない）。
//     画面に出す正誤は gradePastExam の結果であって、この値ではない。

import {
  saveAssessmentQuestionAttemptsForCurrentSession,
  type AuthenticatedQuestionExposureResult,
  type QuestionAttemptInput,
} from "@/lib/userSession";
import type { UserAnswer } from "@/types";
import type { PastExamMode, PastExamAnswer } from "@/types/pastExam";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";

type AttemptPayload = QuestionAttemptInput & {
  questionId: string;
  questionType: "official_past";
  topicId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number | null;
  answeredAt: string | null;
  attemptMode: PastExamMode;
  attemptGroupId: string;
};

function toPayload(
  question: PastExamQuestionView,
  answer: PastExamAnswer | undefined,
  mode: PastExamMode,
  sessionId: string,
): AttemptPayload {
  const selected = answer?.selected ?? null;
  return {
    questionId: question.id,
    questionType: "official_past",
    topicId: question.topicId,
    selectedAnswer: selected,
    isCorrect: selected !== null && selected === question.correctChoice,
    timeSpentSeconds: answer?.timeSpentSeconds ?? null,
    answeredAt: answer?.answeredAt ?? null,
    attemptMode: mode,
    attemptGroupId: sessionId,
  };
}

/** 練習モード: 1問ぶんを送る。 */
export function saveSingleAttempt(params: {
  question: PastExamQuestionView;
  answer: PastExamAnswer;
  mode: PastExamMode;
  sessionId: string;
  anonymousAnswers: UserAnswer[];
}): Promise<AuthenticatedQuestionExposureResult> {
  const { question, answer, mode, sessionId } = params;
  return saveAssessmentQuestionAttemptsForCurrentSession(
    [toPayload(question, answer, mode, sessionId)],
  );
}

/**
 * 本番モード: 採点時にまとめて送る。
 * 未回答の問題も「未回答だった」という事実として残す（selectedAnswer: null）。
 */
export function saveAllAttempts(params: {
  questions: PastExamQuestionView[];
  answers: Record<number, PastExamAnswer>;
  mode: PastExamMode;
  sessionId: string;
  anonymousAnswers: UserAnswer[];
}): Promise<AuthenticatedQuestionExposureResult> {
  const { questions, answers, mode, sessionId } = params;
  return saveAssessmentQuestionAttemptsForCurrentSession(
    questions.map((q) => toPayload(q, answers[q.questionNumber], mode, sessionId)),
  );
}
