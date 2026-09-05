"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppState, UserAnswer } from "@/types";
import { getAllTopics, getTopic } from "@/lib/content";
import {
  buildCheckpointExam,
  getCheckpointExamDefinition,
  recordCheckpointExamResult,
} from "@/lib/checkpointExam";
import { saveAppStateVerified } from "@/lib/storage";
import { isStrictOffsetIsoTimestamp } from "@/lib/strictIsoTimestamp";
import { useAppState } from "@/lib/useAppState";
import {
  assessmentAnswerIdempotencyKey,
  completeAssessmentSessionForCurrentSession,
  saveAnswersToDb,
  saveProgressToDb,
  saveAssessmentQuestionAttemptsForCurrentSession,
} from "@/lib/userSession";
import {
  beginAssessmentSession,
  finalizeAnonymousAssessment,
  type AssessmentExposureResult,
  type AssessmentMode,
} from "@/lib/examReadiness/assessmentMode";
import {
  clearPendingAssessmentFinalization,
  findPendingAssessmentFinalization,
  isValidAssessmentAppState,
  isValidAssessmentUserAnswers,
  resumePendingAssessmentFinalization,
  type PendingAssessmentFinalization,
} from "@/lib/examReadiness/pendingFinalization";
import TopicQuiz from "@/components/learn/TopicQuiz";
import LoadingScreen from "@/components/LoadingScreen";

function newAttemptId(): string {
  return crypto.randomUUID();
}

type CheckpointResult = { correct: number; total: number; passed: boolean };
type CheckpointFinalizationBase = {
  kind: "checkpoint";
  checkpointId: string;
  appState: AppState;
  tagged: UserAnswer[];
  exam: ReturnType<typeof buildCheckpointExam>;
};
type CheckpointFinalizationNext = {
  appState: ReturnType<typeof recordCheckpointExamResult>;
};
type CheckpointPendingFinalization = PendingAssessmentFinalization<
  CheckpointFinalizationBase,
  CheckpointFinalizationNext,
  CheckpointResult
>;

function isCheckpointPendingFinalization(
  value: PendingAssessmentFinalization<unknown, unknown, unknown>,
  checkpointId: string,
): value is CheckpointPendingFinalization {
  if (value.source !== "checkpoint" || typeof value.baseState !== "object" || value.baseState === null) {
    return false;
  }
  const baseState = value.baseState as { kind?: unknown; checkpointId?: unknown };
  return baseState.kind === "checkpoint" && baseState.checkpointId === checkpointId;
}

function isValidCheckpointFrozenFinalization(
  value: CheckpointPendingFinalization,
  expectedCheckpointId: string,
): boolean {
  const baseState = value.baseState;
  if (
    baseState.kind !== "checkpoint"
    || baseState.checkpointId !== expectedCheckpointId
    || !isValidAssessmentAppState(baseState.appState)
    || !isValidAssessmentUserAnswers(baseState.tagged)
    || rebuildCheckpointResult(value, expectedCheckpointId) === null
    || !isSameJson(value.result, rebuildCheckpointResult(value, expectedCheckpointId))
  ) return false;
  if (!Object.hasOwn(value, "nextState")) return true;
  return value.nextState !== undefined && isValidAssessmentAppState(value.nextState.appState);
}

/** Rebuilds score and validates the complete frozen checkpoint question frame. */
function rebuildCheckpointResult(
  value: Pick<CheckpointPendingFinalization, "sessionId" | "attempts" | "completion" | "baseState">,
  expectedCheckpointId: string,
): CheckpointResult | null {
  const { exam, tagged } = value.baseState;
  if (
    !isValidFrozenCheckpointExam(exam, expectedCheckpointId, value.sessionId)
    || new Set(tagged.map((answer) => answer.questionId)).size !== tagged.length
    || value.attempts.length !== tagged.length
    || new Set(value.attempts.map((attempt) => attempt.questionId)).size !== value.attempts.length
  ) return null;
  const questionsById = new Map(exam.questions.map((question) => [question.id, question]));
  const attemptsByQuestionId = new Map(value.attempts.map((attempt) => [attempt.questionId, attempt]));
  let correct = 0;
  for (const answer of tagged) {
    const question = questionsById.get(answer.questionId);
    const attempt = attemptsByQuestionId.get(answer.questionId);
    const isCorrect = answer.selectedChoice !== undefined
      && question !== undefined
      && answer.selectedChoice === question.correctChoice;
    if (
      question === undefined
      || answer.topicId !== question.topicId
      || answer.isCorrect !== isCorrect
      || attempt === undefined
      || attempt.questionType !== "mini_exam"
      || attempt.topicId !== question.topicId
      || attempt.selectedAnswer !== (answer.selectedChoice ?? null)
      || attempt.isCorrect !== isCorrect
      || attempt.answeredAt !== answer.answeredAt
      || attempt.attemptGroupId !== value.sessionId
      || !isStrictOffsetIsoTimestamp(attempt.answeredAt)
    ) return null;
    if (isCorrect) correct += 1;
  }
  return {
    correct,
    total: tagged.length,
    passed: Math.round((correct / tagged.length) * 100) >= exam.definition.passingScore,
  };
}

function isValidFrozenCheckpointExam(
  exam: ReturnType<typeof buildCheckpointExam>,
  checkpointId: string,
  sessionId: string,
): boolean {
  const definition = getCheckpointExamDefinition(checkpointId);
  if (
    definition === undefined
    || exam.attemptId !== sessionId
    || !isSameJson(exam.definition, definition)
    || exam.questions.length !== definition.questionCount
    || new Set(exam.questions.map((question) => question.id)).size !== exam.questions.length
  ) return false;
  const catalog = new Map(getAllTopics().flatMap((topic) => topic.checkQuestions.map((question) => [
    question.id,
    { question, topicId: topic.id },
  ])));
  return exam.questions.every((question) => {
    const source = catalog.get(question.id);
    return source !== undefined
      && source.topicId === question.topicId
      && isSameJson(question, { ...source.question, topicId: source.topicId });
  });
}

function isSameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function CheckpointExamRunner({ checkpointId }: { checkpointId: string }) {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [attemptId, setAttemptId] = useState(newAttemptId);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // 未ログインでも試験は完遂できる。認証の有無は開始時に一度だけ決める。
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>("authenticated");
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [pendingFinalization, setPendingFinalization] = useState<CheckpointPendingFinalization | null>(null);
  const pendingStartedAtRef = useRef<string | null>(null);
  const pendingFinalizationRef = useRef<CheckpointPendingFinalization | null>(null);
  const finalizingRef = useRef(false);
  const [result, setResult] = useState<CheckpointResult | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  const resumeFinalization = useCallback(async (
    pending: CheckpointPendingFinalization,
    isActive: () => boolean = () => true,
  ) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    pendingFinalizationRef.current = pending;
    setPendingFinalization(pending);
    setPersistenceError(null);
    // 認証あり/なしの両方で同じ導出を使う。
    const rederiveResult = ({ baseState, attempts, completion, sessionId }: {
      baseState: CheckpointPendingFinalization["baseState"];
      attempts: CheckpointPendingFinalization["attempts"];
      completion: CheckpointPendingFinalization["completion"];
      sessionId: string;
    }) => {
      const result = rebuildCheckpointResult(
        { baseState, attempts, completion, sessionId },
        checkpointId,
      );
      if (result === null) throw new Error("Assessment finalization result is inconsistent");
      return result;
    };
    const deriveNextState = ({ baseState, completion, exposureResult }: {
      baseState: CheckpointPendingFinalization["baseState"];
      completion: CheckpointPendingFinalization["completion"];
      exposureResult: AssessmentExposureResult;
    }) => ({
      appState: recordCheckpointExamResult(
        baseState.appState,
        baseState.tagged,
        exposureResult.exposures,
        new Date(completion.completedAt),
      ),
    });
    try {
      if (assessmentMode === "anonymous") {
        // 未ログイン: サーバーの受領証は無い。ローカルだけで確定させる。
        const finalized = finalizeAnonymousAssessment(
          {
            sessionId: pending.sessionId,
            baseState: pending.baseState,
            attempts: pending.attempts,
            completion: pending.completion,
            result: pending.result,
            answers: pending.baseState.appState.answers,
          },
          { rederiveResult, deriveNextState },
        );
        if (!isActive()) return;
        if (!saveAppStateVerified(finalized.nextState.appState)) {
          throw new Error("Assessment finalization local state could not be persisted");
        }
        setState(finalized.nextState.appState);
        setResult(finalized.result);
        pendingFinalizationRef.current = null;
        setPendingFinalization(null);
        return;
      }
      const finalized = await resumePendingAssessmentFinalization(pending, {
        validate: (value) => isValidCheckpointFrozenFinalization(value, checkpointId),
        rederiveResult,
        saveAttempts: saveAssessmentQuestionAttemptsForCurrentSession,
        completeSession: async (completion) => {
          await completeAssessmentSessionForCurrentSession(completion);
        },
        deriveNextState,
        saveProgress: async ({ exposureResult, nextState, sessionId }) =>
          saveProgressToDb(exposureResult.userId, nextState.appState.progress, {
            triggerType: "assessment",
            triggerId: sessionId,
          }),
      });
      pendingFinalizationRef.current = finalized;
      setPendingFinalization(finalized);
      if (!isActive()) return;
      if (finalized.nextState === undefined || finalized.exposureResult === undefined) {
        throw new Error("Assessment finalization was not fully persisted");
      }
      if (!saveAppStateVerified(finalized.nextState.appState)) {
        throw new Error("Assessment finalization local state could not be persisted");
      }
      if (!clearPendingAssessmentFinalization(finalized.sessionId)) {
        throw new Error("Assessment finalization could not be cleared");
      }
      setState(finalized.nextState.appState);
      saveAnswersToDb(
        finalized.exposureResult.userId,
        0,
        finalized.baseState.tagged,
      );
      setResult(finalized.result);
      pendingFinalizationRef.current = null;
      setPendingFinalization(null);
    } catch {
      if (isActive()) {
        setPersistenceError("採点結果を保存できませんでした。もう一度お試しください。");
      }
    } finally {
      finalizingRef.current = false;
    }
  }, [assessmentMode, checkpointId, setState]);

  useEffect(() => {
    const pending = findPendingAssessmentFinalization(
      "checkpoint",
      (value) => isCheckpointPendingFinalization(value, checkpointId),
    );
    if (pending === null || !isCheckpointPendingFinalization(pending, checkpointId)) return;
    let active = true;
    pendingFinalizationRef.current = pending;
    const timer = window.setTimeout(() => {
      if (active) void resumeFinalization(pending, () => active);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkpointId, resumeFinalization]);

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
    if (starting || startedAt !== null || pendingFinalizationRef.current !== null) return;
    setStarting(true);
    setPersistenceError(null);
    const nextStartedAt = pendingStartedAtRef.current ?? new Date().toISOString();
    pendingStartedAtRef.current = nextStartedAt;
    try {
      // 未ログインなら匿名モードで続行する（試験の失敗として見せない）。
      setAssessmentMode(await beginAssessmentSession({
        action: "start",
        sessionId: attemptId,
        source: "checkpoint",
        mode: "exam",
        startedAt: nextStartedAt,
        questionCount: exam.questions.length,
      }));
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
    const pending: CheckpointPendingFinalization =
      pendingFinalizationRef.current ?? (() => {
          const tagged = answers.map((answer) => {
            const question = exam.questions.find((item) => item.id === answer.questionId);
            const topicId = question?.topicId ?? answer.topicId;
            const topic = getTopic(topicId ?? "");
            return {
              ...answer,
              topicId,
              tag: topic?.tags[0] ?? topic?.field ?? answer.tag,
              isCorrect: answer.selectedChoice !== undefined
                && question !== undefined
                && answer.selectedChoice === question.correctChoice,
            };
          });
          const correct = tagged.filter((answer) => answer.isCorrect).length;
          const completedAt = new Date().toISOString();
          return {
            version: 1 as const,
            sessionId: attemptId,
            source: "checkpoint" as const,
            attempts: tagged.map((answer) => ({
              questionId: answer.questionId,
              questionType: "mini_exam" as const,
              topicId: answer.topicId ?? checkpointId,
              selectedAnswer: answer.selectedChoice ?? null,
              isCorrect: answer.isCorrect,
              answeredAt: answer.answeredAt,
              attemptGroupId: attemptId,
            })),
            completion: {
              action: "complete" as const,
              sessionId: attemptId,
              completedAt,
              answers: tagged.flatMap((answer) => answer.selectedChoice === undefined ? [] : [{
                idempotencyKey: assessmentAnswerIdempotencyKey(attemptId, answer.questionId),
                canonicalQuestionId: answer.questionId,
                topicId: answer.topicId ?? checkpointId,
                isCorrect: answer.isCorrect,
                answeredAt: answer.answeredAt,
              }]),
            },
            baseState: {
              kind: "checkpoint" as const,
              checkpointId,
              appState: state,
              tagged,
              exam,
            },
            result: {
              correct,
              total: tagged.length,
              passed: Math.round((correct / tagged.length) * 100) >= exam.definition.passingScore,
            },
          };
        })();
    pendingFinalizationRef.current = pending;
    await resumeFinalization(pending);
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
            pendingFinalizationRef.current = null;
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
      {persistenceError && pendingFinalization !== null && (
        <button
          type="button"
          onClick={() => void resumeFinalization(pendingFinalization)}
          className="w-full rounded-xl bg-white px-6 py-3 font-bold text-brand-600 ring-1 ring-brand-200"
        >
          保存を再試行する
        </button>
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
          disabled={starting || pendingFinalization !== null}
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
