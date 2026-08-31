"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { AppState, UserAnswer } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { saveAppStateVerified } from "@/lib/storage";
import {
  assessmentAnswerIdempotencyKey,
  completeAssessmentSessionForCurrentSession,
  saveProgressToDb,
  saveAssessmentQuestionAttemptsForCurrentSession,
  startAssessmentSessionForCurrentSession,
} from "@/lib/userSession";
import {
  clearPendingAssessmentFinalization,
  findPendingAssessmentFinalization,
  isValidAssessmentAppState,
  isValidAssessmentUserAnswers,
  resumePendingAssessmentFinalization,
  type PendingAssessmentFinalization,
} from "@/lib/examReadiness/pendingFinalization";
import { getAllTopics, getTopic } from "@/lib/content";
import { getLessonHref } from "@/lib/learningCatalog";
import {
  CHECKPOINTS,
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
  getNextCheckpointId,
  recordFinalExamAttempt,
} from "@/lib/checkpoints";
import {
  buildFinalExamAttempt,
  generateFinalExam,
  scoreFinalExam,
  type FinalExam,
  type FinalExamResult,
} from "@/lib/finalExam";
import { emitCelebration } from "@/lib/celebration";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import { isStrictOffsetIsoTimestamp } from "@/lib/strictIsoTimestamp";
import FinalExamCard from "@/components/checkpoints/FinalExamCard";
import GateRequirementList from "@/components/checkpoints/GateRequirementList";
import MissingBadgeList from "@/components/checkpoints/MissingBadgeList";
import TopicQuiz from "@/components/learn/TopicQuiz";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

const VALID_IDS = new Set(CHECKPOINTS.map((c) => c.id));

type CheckpointFinalizationBase = {
  kind: "checkpoint-final";
  checkpointId: CheckpointId;
  appState: AppState;
  exam: FinalExam;
  answers: UserAnswer[];
  attempt: ReturnType<typeof buildFinalExamAttempt>;
  signals: ReturnType<typeof getClientBadgeSignals>;
};
type CheckpointFinalizationNext = {
  appState: ReturnType<typeof recordFinalExamAttempt>;
};
type CheckpointFinalPendingFinalization = PendingAssessmentFinalization<
  CheckpointFinalizationBase,
  CheckpointFinalizationNext,
  FinalExamResult
>;

function isCheckpointFinalPendingFinalization(
  value: PendingAssessmentFinalization<unknown, unknown, unknown>,
  checkpointId: CheckpointId,
): value is CheckpointFinalPendingFinalization {
  if (value.source !== "checkpoint" || typeof value.baseState !== "object" || value.baseState === null) {
    return false;
  }
  const baseState = value.baseState as { kind?: unknown; checkpointId?: unknown };
  return baseState.kind === "checkpoint-final" && baseState.checkpointId === checkpointId;
}

function isValidCheckpointFinalFrozenFinalization(
  value: CheckpointFinalPendingFinalization,
  expectedCheckpointId: CheckpointId,
): boolean {
  const baseState = value.baseState;
  if (
    baseState.kind !== "checkpoint-final"
    || baseState.checkpointId !== expectedCheckpointId
    || !isValidAssessmentAppState(baseState.appState)
    || !isValidFinalExam(baseState.exam, value.sessionId, expectedCheckpointId)
    || !isValidAssessmentUserAnswers(baseState.answers)
    || !isValidFinalExamAttempt(baseState.attempt, expectedCheckpointId)
    || !isValidBadgeSignals(baseState.signals)
    || rebuildCheckpointFinalResult(value, expectedCheckpointId) === null
    || !isSameJson(value.result, rebuildCheckpointFinalResult(value, expectedCheckpointId))
  ) return false;
  if (!Object.hasOwn(value, "nextState")) return true;
  return value.nextState !== undefined && isValidAssessmentAppState(value.nextState.appState);
}

/**
 * Re-derives the final score from the frozen exam/answers and binds the
 * durable strict-attempt payload to that same exact question frame.
 */
function rebuildCheckpointFinalResult(
  value: Pick<CheckpointFinalPendingFinalization,
    "sessionId" | "attempts" | "completion" | "baseState"
  >,
  checkpointId: CheckpointId,
): FinalExamResult | null {
  const { exam, answers, attempt } = value.baseState;
  if (
    !isValidFinalExam(exam, value.sessionId, checkpointId)
    || new Set(answers.map((answer) => answer.questionId)).size !== answers.length
    || value.attempts.length !== answers.length
    || new Set(value.attempts.map((strictAttempt) => strictAttempt.questionId)).size
      !== value.attempts.length
  ) return null;
  const questionsById = new Map(exam.questions.map((question) => [question.id, question]));
  const attemptsByQuestionId = new Map(value.attempts.map((strictAttempt) => [
    strictAttempt.questionId,
    strictAttempt,
  ]));
  for (const answer of answers) {
    const question = questionsById.get(answer.questionId);
    const strictAttempt = attemptsByQuestionId.get(answer.questionId);
    const isCorrect = answer.selectedChoice !== undefined
      && question !== undefined
      && answer.selectedChoice === question.correctChoice;
    if (
      question === undefined
      || answer.topicId !== exam.topicIdByQuestionId[question.id]
      || answer.isCorrect !== isCorrect
      || strictAttempt === undefined
      || strictAttempt.questionType !== "mini_exam"
      || strictAttempt.topicId !== exam.topicIdByQuestionId[question.id]
      || strictAttempt.selectedAnswer !== (answer.selectedChoice ?? null)
      || strictAttempt.isCorrect !== isCorrect
      || strictAttempt.answeredAt !== answer.answeredAt
      || strictAttempt.attemptGroupId !== value.sessionId
      || !isStrictOffsetIsoTimestamp(strictAttempt.answeredAt)
    ) return null;
  }
  const result = scoreFinalExam(exam, answers);
  const canonicalAttempt = buildFinalExamAttempt(
    exam,
    result,
    new Date(value.completion.completedAt),
  );
  return isSameJson(attempt, canonicalAttempt) ? result : null;
}

function isValidFinalExam(
  value: FinalExam,
  sessionId: string,
  checkpointId: CheckpointId,
): boolean {
  const expectedRule = getCheckpoint(checkpointId).finalExam;
  if (
    value.checkpointId !== checkpointId
    || expectedRule === null
    || !isSameJson(value.rule, expectedRule)
    || value.attemptId !== sessionId
    || !isRecord(value.rule)
    || !isNonNegativeInteger(value.rule.questionCount)
    || !isNonNegativeInteger(value.rule.passThreshold)
    || !isUnitInterval(value.rule.weakRatio)
    || !isRecord(value.scope)
    || !isStringArray(value.scope.eligibleCategories)
    || !isValidDifficultyDistribution(value.scope.difficultyDistribution)
    || !isNonNegativeInteger(value.scope.recentQuestionExclusionCount)
    || !Array.isArray(value.questions)
    || value.questions.length === 0
    || !value.questions.every(isValidCheckQuestion)
    || !isStringRecord(value.topicIdByQuestionId)
    || !isStringArray(value.topicIds)
    || typeof value.reusedRecentQuestion !== "boolean"
  ) return false;
  const ids = value.questions.map((question) => question.id);
  const catalog = new Map(getAllTopics().flatMap((topic) => topic.checkQuestions.map((question) => [
    question.id,
    { question, topicId: topic.id },
  ])));
  return new Set(ids).size === ids.length
    && Object.keys(value.topicIdByQuestionId).length === ids.length
    && ids.every((id) => isNonEmptyString(value.topicIdByQuestionId[id]))
    && value.questions.every((question) => {
      const source = catalog.get(question.id);
      return source !== undefined
        && value.topicIdByQuestionId[question.id] === source.topicId
        && isSameJson(question, source.question);
    });
}

function isValidFinalExamAttempt(value: unknown, checkpointId: CheckpointId): boolean {
  return isRecord(value)
    && value.checkpointId === checkpointId
    && typeof value.passed === "boolean"
    && isNonNegativeInteger(value.correct)
    && isNonNegativeInteger(value.total)
    && isStrictOffsetIsoTimestamp(value.attemptedAt)
    && isStringArray(value.wrongTopicIds);
}

function isValidBadgeSignals(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (value.wordMasteredCount === undefined || isNonNegativeInteger(value.wordMasteredCount))
    && (value.examLevelClearedTopicCount === undefined
      || isNonNegativeInteger(value.examLevelClearedTopicCount))
    && (value.examReadiness === undefined || value.examReadiness === null || isRecord(value.examReadiness))
    && (value.examReadinessVerified === undefined || typeof value.examReadinessVerified === "boolean");
}

function isValidCheckQuestion(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.prompt)
    && Array.isArray(value.choices)
    && value.choices.length > 0
    && value.choices.every((choice) => isRecord(choice)
      && isChoice(choice.key)
      && isNonEmptyString(choice.text))
    && isChoice(value.correctChoice)
    && isNonEmptyString(value.explanation)
    && isDifficulty(value.difficulty)
    && (value.choiceExplanations === undefined || isStringRecord(value.choiceExplanations))
    && (value.relatedTopicIds === undefined || isStringArray(value.relatedTopicIds))
    && (value.reviewTags === undefined || isStringArray(value.reviewTags));
}

function isValidDifficultyDistribution(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isUnitInterval);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isNonEmptyString);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isChoice(value: unknown): boolean {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function isDifficulty(value: unknown): boolean {
  return value === 1 || value === 2 || value === 3;
}

function isSameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function FinalExamPage() {
  const router = useRouter();
  const params = useParams<{ checkpointId: string }>();
  const rawId = params?.checkpointId ?? "";
  const checkpointId = (VALID_IDS.has(rawId as CheckpointId)
    ? rawId
    : "cp1") as CheckpointId;

  const [state, setState] = useAppState();
  useBadgeSync(state, setState);
  const [exam, setExam] = useState<FinalExam | null>(null);
  const [result, setResult] = useState<FinalExamResult | null>(null);
  const [examError, setExamError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [pendingFinalization, setPendingFinalization] = useState<CheckpointFinalPendingFinalization | null>(null);
  const [starting, setStarting] = useState(false);
  const pendingExamRef = useRef<{ exam: FinalExam; startedAt: string } | null>(null);
  const pendingFinalizationRef = useRef<CheckpointFinalPendingFinalization | null>(null);
  const finalizingRef = useRef(false);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  const resumeFinalization = useCallback(async (
    pending: CheckpointFinalPendingFinalization,
    isActive: () => boolean = () => true,
  ) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    pendingFinalizationRef.current = pending;
    setPendingFinalization(pending);
    setPersistenceError(null);
    try {
      const finalized = await resumePendingAssessmentFinalization(pending, {
        validate: (value) => isValidCheckpointFinalFrozenFinalization(value, checkpointId),
        rederiveResult: ({ baseState, attempts, completion, sessionId }) => {
          const result = rebuildCheckpointFinalResult(
            { baseState, attempts, completion, sessionId },
            checkpointId,
          );
          if (result === null) throw new Error("Assessment finalization result is inconsistent");
          return result;
        },
        saveAttempts: saveAssessmentQuestionAttemptsForCurrentSession,
        completeSession: async (completion) => {
          await completeAssessmentSessionForCurrentSession(completion);
        },
        deriveNextState: ({ baseState, completion, exposureResult }) => ({
          appState: recordFinalExamAttempt(
            baseState.appState,
            baseState.attempt,
            baseState.answers,
            exposureResult.exposures,
            baseState.signals,
            new Date(completion.completedAt),
          ),
        }),
        saveProgress: async ({ exposureResult, nextState, sessionId }) =>
          saveProgressToDb(exposureResult.userId, nextState.appState.progress, {
            triggerType: "assessment",
            triggerId: sessionId,
          }),
      });
      pendingFinalizationRef.current = finalized;
      setPendingFinalization(finalized);
      if (!isActive()) return;
      if (finalized.nextState === undefined) {
        throw new Error("Assessment finalization was not fully persisted");
      }
      if (!saveAppStateVerified(finalized.nextState.appState)) {
        throw new Error("Assessment finalization local state could not be persisted");
      }
      if (!clearPendingAssessmentFinalization(finalized.sessionId)) {
        throw new Error("Assessment finalization could not be cleared");
      }
      setState(finalized.nextState.appState);
      setExam(finalized.baseState.exam);
      setResult(finalized.result);
      emitCelebration(finalized.baseState.appState, finalized.nextState.appState);
      emitMochitEvent(finalized.result.passed ? "checkpointClear" : "incorrect");
      pendingFinalizationRef.current = null;
      setPendingFinalization(null);
    } catch {
      if (isActive()) {
        setPersistenceError("採点結果を保存できませんでした。もう一度お試しください。");
      }
    } finally {
      finalizingRef.current = false;
    }
  }, [checkpointId, setState]);

  useEffect(() => {
    const pending = findPendingAssessmentFinalization(
      "checkpoint",
      (value) => isCheckpointFinalPendingFinalization(value, checkpointId),
    );
    if (pending === null || !isCheckpointFinalPendingFinalization(pending, checkpointId)) return;
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

  // 単語帳の進捗は AppState 外なので毎レンダー読み直す（軽量）。
  const signals = getClientBadgeSignals();

  const checkpoint = getCheckpoint(checkpointId);
  const rangeLabel = "このCPの対象範囲にある、完了済みトピックだけから出題";

  if (state === undefined || state === null) {
    return <LoadingScreen />;
  }

  // cp0 など最終問題を持たないチェックポイント。
  if (!checkpoint.finalExam) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="mx-auto max-w-md px-4 py-10 text-center">
          <p className="text-3xl">🧭</p>
          <p className="mt-2 text-base font-bold text-gray-800">
            このチェックポイントに最終問題はありません
          </p>
          <Link
            href="/plan"
            className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-3 font-bold text-white"
          >
            ロードマップへ
          </Link>
        </div>
        <BottomNav />
      </main>
    );
  }

  const gate = buildCheckpointGate(state, checkpointId);
  const cpProgress = getCheckpointProgress(state);
  const alreadyPassed =
    gate.finalExamPassed || cpProgress.clearedCheckpointIds.includes(checkpointId);
  const nextId = getNextCheckpointId(checkpointId);
  const next = nextId ? getCheckpoint(nextId) : null;

  async function startExam() {
    if (!state || starting || pendingFinalizationRef.current !== null) return;
    setStarting(true);
    setExamError(null);
    setPersistenceError(null);
    try {
      const pending = pendingExamRef.current ?? (() => {
        const recentQuestionIds = [...state.answers]
          .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
          .map((answer) => answer.questionId);
        return {
          exam: generateFinalExam(state, checkpointId, {
            attemptId: crypto.randomUUID(),
            recentQuestionIds,
          }),
          startedAt: new Date().toISOString(),
        };
      })();
      pendingExamRef.current = pending;
      try {
        await startAssessmentSessionForCurrentSession({
          action: "start",
          sessionId: pending.exam.attemptId,
          source: "checkpoint",
          mode: "exam",
          startedAt: pending.startedAt,
          questionCount: pending.exam.questions.length,
        });
      } catch {
        setPersistenceError("評価セッションを開始できませんでした。もう一度お試しください。");
        return;
      }
      // Keep the completed result authoritative until the replacement session frame
      // is durably in_progress. React batches this swap, so the terminal exam never
      // remounts between the result and the new question set.
      setExam(pending.exam);
      setResult(null);
      pendingExamRef.current = null;
      emitMochitEvent("encourage");
    } catch (error) {
      setExamError(
        error instanceof Error
          ? "この範囲で十分な問題を作れません。対象トピックをもう少し学習してから再挑戦してください。"
          : "問題の準備に失敗しました。",
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete(answers: UserAnswer[]) {
    if (!state || !exam) return;
    const pending: CheckpointFinalPendingFinalization =
      pendingFinalizationRef.current ?? (() => {
          const completedAt = new Date().toISOString();
          const frozenAnswers = answers.map((answer) => {
            const question = exam.questions.find((item) => item.id === answer.questionId);
            return {
              ...answer,
              topicId: question ? exam.topicIdByQuestionId[question.id] : answer.topicId,
              isCorrect: answer.selectedChoice !== undefined
                && question !== undefined
                && answer.selectedChoice === question.correctChoice,
            };
          });
          const scored = scoreFinalExam(exam, frozenAnswers);
          const attempt = buildFinalExamAttempt(exam, scored, new Date(completedAt));
          return {
            version: 1 as const,
            sessionId: exam.attemptId,
            source: "checkpoint" as const,
            attempts: frozenAnswers.map((answer) => ({
              questionId: answer.questionId,
              questionType: "mini_exam" as const,
              topicId: exam.topicIdByQuestionId[answer.questionId] ?? answer.topicId ?? checkpointId,
              selectedAnswer: answer.selectedChoice ?? null,
              isCorrect: answer.isCorrect,
              answeredAt: answer.answeredAt,
              attemptGroupId: exam.attemptId,
            })),
            completion: {
              action: "complete" as const,
              sessionId: exam.attemptId,
              completedAt,
              answers: frozenAnswers.flatMap((answer) => answer.selectedChoice === undefined ? [] : [{
                idempotencyKey: assessmentAnswerIdempotencyKey(exam.attemptId, answer.questionId),
                canonicalQuestionId: answer.questionId,
                topicId: exam.topicIdByQuestionId[answer.questionId] ?? answer.topicId ?? checkpointId,
                isCorrect: answer.isCorrect,
                answeredAt: answer.answeredAt,
              }]),
            },
            baseState: {
              kind: "checkpoint-final" as const,
              checkpointId,
              appState: state,
              exam,
              answers: frozenAnswers,
              attempt,
              signals,
            },
            result: scored,
          };
        })();
    pendingFinalizationRef.current = pending;
    await resumeFinalization(pending);
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-accent-600 px-4 pb-4 pt-4 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/plan" className="text-xs font-semibold text-white/80">
            ← ロードマップ
          </Link>
          <p className="mt-1 text-[11px] font-semibold text-white/80">
            突破試験（最終問題）
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-2xl">
        <FinalExamCard checkpoint={checkpoint} gate={gate} rangeLabel={rangeLabel} />

        {persistenceError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {persistenceError}
          </p>
        )}
        {persistenceError && pendingFinalization !== null && (
          <button
            type="button"
            onClick={() => void resumeFinalization(pendingFinalization)}
            className="w-full rounded-xl bg-white px-6 py-3 font-bold text-accent-700 ring-1 ring-accent-200"
          >
            保存を再試行する
          </button>
        )}

        {/* --- 採点結果 --- */}
        {result ? (
          result.passed ? (
            <section className="animate-pop-in overflow-hidden rounded-xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
              <p className="text-4xl">🏆</p>
              <p className="mt-2 text-lg font-bold text-emerald-700">
                CP{checkpoint.order} を突破しました！
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-600">
                {result.total}問中 {result.correct}問正解
              </p>

              {/* CP突破の達成感: いまのCP → 次のCP へ進んだことを見せる */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {checkpoint.emoji} CP{checkpoint.order}
                  <span className="ml-1 text-[10px] text-emerald-500">突破</span>
                </span>
                <span aria-hidden className="text-lg text-emerald-500">
                  →
                </span>
                {next ? (
                  <span className="animate-sheen rounded-xl bg-brand-700 px-3 py-2 text-sm font-bold text-white">
                    {next.emoji} CP{next.order}
                    <span className="ml-1 text-[10px] text-white/80">
                      {next.finalExam ? "解禁" : "ゴール"}
                    </span>
                  </span>
                ) : (
                  <span className="rounded-xl bg-accent-600 px-3 py-2 text-sm font-bold text-white">
                    🎓 合格へ
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-emerald-700">
                {next
                  ? `次のチェックポイント「${next.title}」へ進みます。`
                  : "すべてのチェックポイントを突破しました！合格へ向けて総仕上げを。"}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                {next && next.finalExam && (
                  <Link
                    href={`/checkpoint/${next.id}/final`}
                    className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white"
                  >
                    次のチェックポイントへ →
                  </Link>
                )}
                <Link
                  href="/plan"
                  className="rounded-xl bg-white px-6 py-3 font-bold text-emerald-700 ring-1 ring-emerald-200"
                >
                  🗺️ 地図で突破を確認する
                </Link>
                <Link
                  href="/badges"
                  className="rounded-xl bg-white px-6 py-3 font-bold text-brand-600 ring-1 ring-brand-200"
                >
                  獲得バッジを見る
                </Link>
              </div>
            </section>
          ) : (
            <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-amber-200">
              <p className="text-center text-4xl">💪</p>
              <p className="mt-2 text-center text-lg font-bold text-gray-800">
                あと少し！次で突破できます
              </p>
              <p className="mt-1 text-center text-sm font-semibold text-gray-600">
                {result.total}問中 {result.correct}問正解（合格まであと
                {Math.max(0, exam!.rule.passThreshold - result.correct)}問）
              </p>

              {result.wrongTopicIds.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-500">
                    間違えたテーマ（復習対象に追加しました）
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {result.wrongTopicIds.map((id) => {
                      const t = getTopic(id);
                      return (
                        <li key={id}>
                          <Link
                            href={getLessonHref(id, { from: "progress", activity: "learn", anchor: "lesson-content" })}
                            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700"
                          >
                            <span className="truncate">{t?.title ?? id}</span>
                            <span className="shrink-0 text-xs text-brand-600">
                              復習する →
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700">
                再挑戦条件：間違えたテーマを復習すれば、いつでも何度でも再挑戦できます。ペナルティはありません。
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void startExam()}
                  disabled={starting || pendingFinalization !== null}
                  className="rounded-xl bg-brand-600 px-6 py-3 font-bold text-white active:scale-[0.99]"
                >
                  もう一度挑戦する
                </button>
                <Link
                  href="/review"
                  className="rounded-xl bg-white px-6 py-3 text-center font-bold text-brand-600 ring-1 ring-brand-200"
                >
                  先に復習する
                </Link>
              </div>
            </section>
          )
        ) : exam ? (
          /* --- 出題中 --- */
          <section>
            <h2 className="mb-3 text-base font-bold text-gray-800">
              ⚔️ 突破試験（全{exam.questions.length}問）
            </h2>
            <TopicQuiz
              topicId={`final-${checkpointId}`}
              questions={exam.questions}
              onComplete={handleComplete}
              completeLabel="採点する"
              dense
            />
          </section>
        ) : gate.finalExamUnlocked ? (
          /* --- 解放済み・未開始 --- */
          <section className="rounded-xl bg-white p-5 text-center border border-gray-200">
            {alreadyPassed && (
              <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                このチェックポイントは突破済みです。実力確認にもう一度挑戦できます。
              </p>
            )}
            <p className="text-3xl">⚔️</p>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              必要な条件は揃いました。突破すれば次のチェックポイントへ進めます。
            </p>
            {examError && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                {examError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void startExam()}
              disabled={starting || pendingFinalization !== null}
              className="animate-glow-ring mt-4 w-full rounded-xl bg-rose-500 px-6 py-3 font-bold text-white active:scale-[0.99]"
            >
              突破試験に挑む
            </button>
          </section>
        ) : (
          /* --- ロック中 --- */
          <section className="rounded-xl bg-white p-5 border border-gray-200">
            <p className="text-sm font-bold text-gray-700">
              🔒 まだ解放されていません
            </p>
            <p className="mt-1 text-xs text-gray-500">
              下の条件を満たすと突破試験に挑戦できます。獲得条件は各バッジに表示しています。
            </p>

            {/* 解放条件チェックリスト（達成/未達を一目で） */}
            <div className="mt-3 rounded-xl bg-gray-50 px-3.5 py-3">
              <GateRequirementList gate={gate} />
            </div>

            <div className="mt-3">
              <MissingBadgeList badges={gate.missingBadges} />
            </div>

            <Link
              href="/badges"
              className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-600 ring-1 ring-brand-200"
            >
              バッジ一覧で条件を見る
            </Link>
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
