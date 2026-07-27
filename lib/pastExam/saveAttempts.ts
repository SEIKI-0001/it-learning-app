"use client";

// 年度別演習の回答を question_attempts へ送る（クライアント側）。
//
// 方針:
//   - fire-and-forget。保存に失敗しても画面とローカルの結果は維持する
//     （採点結果は localStorage とメモリ上にあるので、DBが無くても学習は成立する）。
//   - 練習モードは1問ごと（回答は最初の1回で確定するので再送しない）、
//     本番モードは採点時にまとめて送る。
//   - 出所・版・年度・公式区分は送らない。サーバ側が問題IDから解決する。
//   - isCorrect も送るが、サーバ側は問題バンクの正答で計算し直す（この値は使わない）。
//     画面に出す正誤は gradePastExam の結果であって、この値ではない。

import { getUserId } from "@/lib/userSession";
import type { PastExamMode, PastExamAnswer } from "@/types/pastExam";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";

type AttemptPayload = {
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

async function post(attempts: AttemptPayload[]): Promise<void> {
  if (attempts.length === 0) return;
  try {
    await fetch("/api/question-attempts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getUserId(), attempts }),
      keepalive: true,
    });
  } catch {
    /* 保存できなくても演習は続行する */
  }
}

/** 練習モード: 1問ぶんを送る。 */
export function saveSingleAttempt(params: {
  question: PastExamQuestionView;
  answer: PastExamAnswer;
  mode: PastExamMode;
  sessionId: string;
}): void {
  const { question, answer, mode, sessionId } = params;
  void post([toPayload(question, answer, mode, sessionId)]);
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
}): void {
  const { questions, answers, mode, sessionId } = params;
  void post(
    questions.map((q) => toPayload(q, answers[q.questionNumber], mode, sessionId)),
  );
}
