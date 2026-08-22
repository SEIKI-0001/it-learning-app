"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserAnswer } from "@/types";
import { getTopic } from "@/lib/content";
import {
  buildCheckpointExam,
  recordCheckpointExamResult,
} from "@/lib/checkpointExam";
import { saveAppState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import {
  assessmentAnswerIdempotencyKey,
  completeAssessmentSessionForCurrentSession,
  saveAnswersToDb,
  saveProgressToDb,
  saveQuestionAttemptsForCurrentSession,
  startAssessmentSessionForCurrentSession,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import LoadingScreen from "@/components/LoadingScreen";

function newAttemptId(): string {
  return crypto.randomUUID();
}

export default function CheckpointExamRunner({ checkpointId }: { checkpointId: string }) {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [attemptId, setAttemptId] = useState(newAttemptId);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const pendingStartedAtRef = useRef<string | null>(null);
  const pendingCompletionAtRef = useRef<string | null>(null);
  const [result, setResult] = useState<{ correct: number; total: number; passed: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  const recentQuestionIds = useMemo(
    () =>
      [...(state?.answers ?? [])]
        .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
        .map((answer) => answer.questionId),
    [state?.answers],
  );
  const exam = useMemo(
    () =>
      buildCheckpointExam({
        checkpointId,
        attemptId,
        recentQuestionIds,
      }),
    [attemptId, checkpointId, recentQuestionIds],
  );

  if (state === undefined || state === null) return <LoadingScreen />;

  async function startExam() {
    if (starting || startedAt !== null) return;
    setStarting(true);
    setPersistenceError(null);
    const nextStartedAt = pendingStartedAtRef.current ?? new Date().toISOString();
    pendingStartedAtRef.current = nextStartedAt;
    try {
      await startAssessmentSessionForCurrentSession({
        action: "start",
        sessionId: attemptId,
        source: "checkpoint",
        mode: "exam",
        startedAt: nextStartedAt,
        questionCount: exam.questions.length,
      });
      setStartedAt(nextStartedAt);
      pendingStartedAtRef.current = null;
    } catch {
      setPersistenceError("評価セッションを開始できませんでした。もう一度お試しください。");
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete(answers: UserAnswer[]) {
    if (!state || startedAt === null) return;
    setPersistenceError(null);
    let factsCommitted = false;
    let committedResult: { correct: number; total: number; passed: boolean } | null = null;
    try {
      const tagged = answers.map((answer) => {
        const topic = getTopic(answer.topicId ?? "");
        return { ...answer, tag: topic?.tags[0] ?? topic?.field ?? answer.tag };
      });
      const exposureResult = await saveQuestionAttemptsForCurrentSession(
        tagged.map((answer) => ({
          questionId: answer.questionId,
          questionType: "mini_exam" as const,
          topicId: answer.topicId ?? checkpointId,
          selectedAnswer: answer.selectedChoice ?? null,
          isCorrect: answer.isCorrect,
          answeredAt: answer.answeredAt,
          attemptGroupId: attemptId,
        })),
        state.answers,
      );
      const { exposures, userId } = exposureResult;
      const completedAt = pendingCompletionAtRef.current ?? new Date().toISOString();
      pendingCompletionAtRef.current = completedAt;
      await completeAssessmentSessionForCurrentSession({
        action: "complete",
        sessionId: attemptId,
        completedAt,
        answers: tagged.flatMap((answer) => answer.selectedChoice === undefined ? [] : [{
          idempotencyKey: assessmentAnswerIdempotencyKey(attemptId, answer.questionId),
          canonicalQuestionId: answer.questionId,
          topicId: answer.topicId ?? checkpointId,
          isCorrect: answer.isCorrect,
          answeredAt: answer.answeredAt,
        }]),
      });
      factsCommitted = true;
      pendingCompletionAtRef.current = null;
      const next = recordCheckpointExamResult(state, tagged, exposures);
      saveAppState(next);
      setState(next);
      if (userId) {
        void saveProgressToDb(userId, next.progress);
        void saveAnswersToDb(userId, 0, tagged);
      }
      const correct = tagged.filter((answer) => answer.isCorrect).length;
      committedResult = {
        correct,
        total: tagged.length,
        passed: Math.round((correct / tagged.length) * 100) >= exam.definition.passingScore,
      };
      setResult(committedResult);
    } catch (error) {
      if (factsCommitted) {
        if (committedResult) setResult(committedResult);
        return;
      }
      setPersistenceError("採点結果を保存できませんでした。もう一度お試しください。");
      throw error;
    }
  }

  if (result) {
    const score = Math.round((result.correct / result.total) * 100);
    return (
      <div className="space-y-5">
        <section
          className={`rounded-xl p-5 text-center ring-1 ${
            result.passed
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-accent-50 text-accent-800 ring-accent-200"
          }`}
        >
          <p className="text-sm font-bold">{exam.definition.title} の結果</p>
          <p className="mt-1 text-3xl font-bold">
            {score}%（{result.correct}/{result.total}問）
          </p>
          <p className="mt-2 text-sm font-semibold">
            {result.passed
              ? "合格です。今回の範囲は根拠を持って選べています。"
              : `合格ラインは${exam.definition.passingScore}%です。間違えたトピックを復習に追加しました。`}
          </p>
        </section>
        <button
          type="button"
          onClick={() => {
            setAttemptId(newAttemptId());
            setStartedAt(null);
            setResult(null);
            setPersistenceError(null);
            pendingStartedAtRef.current = null;
            pendingCompletionAtRef.current = null;
          }}
          className="w-full rounded-xl bg-brand-600 px-6 py-3 font-bold text-white"
        >
          別の問題で再挑戦する
        </button>
        <Link
          href="/review"
          className="block w-full rounded-xl bg-white px-6 py-3 text-center font-bold text-brand-600 ring-1 ring-brand-200"
        >
          復習へ進む
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {persistenceError && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {persistenceError}
        </p>
      )}
      <section className="rounded-xl bg-white p-4 border border-gray-200">
        <p className="text-sm font-bold text-gray-800">
          {exam.questions.length}問・{exam.definition.passingScore}%で合格
        </p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          範囲はこのチェックポイントに定義されたトピックだけです。直近に答えた問題は優先して外します。
        </p>
        {exam.reusedRecentQuestion && (
          <p className="mt-2 text-xs font-semibold text-accent-700">
            この範囲の問題数が足りないため、一部の既出問題を含みます。
          </p>
        )}
      </section>
      {startedAt === null ? (
        <button
          type="button"
          onClick={() => void startExam()}
          disabled={starting}
          className="w-full rounded-xl bg-brand-600 px-6 py-3 font-bold text-white disabled:opacity-50"
        >
          チェックポイント試験を始める
        </button>
      ) : (
        <TopicQuiz
          topicId={checkpointId}
          questions={exam.questions}
          topicIdForQuestion={(question) =>
            (question as (typeof exam.questions)[number]).topicId
          }
          onComplete={handleComplete}
          completeLabel="採点して結果を見る"
        />
      )}
    </div>
  );
}
