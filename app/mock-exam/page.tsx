"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppState, UserAnswer } from "@/types";
import { FIELD_LABELS, type TopicField } from "@/types/content";
import { getAllTopics, getTopic } from "@/lib/content";
import {
  generateMockExam,
  buildMockExamInsights,
  MOCK_EXAM_RULE,
  recordMockExamResult,
  scoreMockExam,
  type MockExam,
  type MockExamResult,
} from "@/lib/mockExam";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import {
  assessmentAnswerIdempotencyKey,
  completeAssessmentSessionForCurrentSession,
  createAssessmentSessionId,
  saveAnswersToDb,
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
import TopicQuiz from "@/components/learn/TopicQuiz";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import { getLessonHref } from "@/lib/learningCatalog";

const FIELDS: TopicField[] = ["strategy", "management", "technology"];

type MockFinalizationBase = {
  appState: AppState;
  tagged: UserAnswer[];
};

type MockFinalizationNext = { appState: AppState };
type MockPendingFinalization = PendingAssessmentFinalization<
  MockFinalizationBase,
  MockFinalizationNext,
  MockExamResult
>;

function isMockPendingFinalization(
  value: PendingAssessmentFinalization<unknown, unknown, unknown>,
): value is MockPendingFinalization {
  return value.source === "mock";
}

function isValidMockFrozenFinalization(value: MockPendingFinalization): boolean {
  const baseState = value.baseState;
  if (
    !isValidAssessmentAppState(baseState.appState)
    || !isValidAssessmentUserAnswers(baseState.tagged)
    || !isValidMockExamResult(value.result)
  ) return false;
  if (!Object.hasOwn(value, "nextState")) return true;
  return value.nextState !== undefined && isValidAssessmentAppState(value.nextState.appState);
}

function isValidMockExamResult(value: MockExamResult): boolean {
  if (
    !isNonNegativeInteger(value.correct)
    || !isNonNegativeInteger(value.total)
    || !isFieldScores(value.fieldScores)
    || !Array.isArray(value.topicScores)
    || !Array.isArray(value.weakTopics)
    || !isStringArray(value.wrongTopicIds)
  ) return false;
  return value.topicScores.every((score) => isNonEmptyString(score.topicId)
    && isNonNegativeInteger(score.correct)
    && isNonNegativeInteger(score.total)
    && isRate(score.rate))
    && value.weakTopics.every((topic) => isNonEmptyString(topic.topicId)
      && isRate(topic.severity)
      && isWeakTopicReason(topic.reason));
}

function isFieldScores(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return (["strategy", "management", "technology"] as const).every((field) => {
    const score = (value as Record<string, unknown>)[field];
    return typeof score === "object" && score !== null && !Array.isArray(score)
      && isNonNegativeInteger((score as Record<string, unknown>).correct)
      && isNonNegativeInteger((score as Record<string, unknown>).total);
  });
}

function isWeakTopicReason(value: unknown): boolean {
  return value === "low_mastery"
    || value === "summary_exam_miss"
    || value === "review_failure"
    || value === "repeated_miss";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export default function MockExamPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [exam, setExam] = useState<MockExam | null>(null);
  const [result, setResult] = useState<MockExamResult | null>(null);
  const [assessment, setAssessment] = useState<{ sessionId: string; startedAt: string } | null>(
    null,
  );
  const [starting, setStarting] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [pendingFinalization, setPendingFinalization] = useState<MockPendingFinalization | null>(null);
  const pendingStartRef = useRef<{
    assessment: { sessionId: string; startedAt: string };
    exam: MockExam;
  } | null>(null);
  const pendingFinalizationRef = useRef<MockPendingFinalization | null>(null);
  const finalizingRef = useRef(false);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  const resumeFinalization = useCallback(async (
    pending: MockPendingFinalization,
    isActive: () => boolean = () => true,
  ) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    pendingFinalizationRef.current = pending;
    setPendingFinalization(pending);
    setPersistenceError(null);
    try {
      const finalized = await resumePendingAssessmentFinalization(pending, {
        validate: isValidMockFrozenFinalization,
        saveAttempts: saveAssessmentQuestionAttemptsForCurrentSession,
        completeSession: async (completion) => {
          await completeAssessmentSessionForCurrentSession(completion);
        },
        deriveNextState: ({ baseState, completion, exposureResult, result: scored }) => ({
          appState: recordMockExamResult(
            baseState.appState,
            baseState.tagged,
            scored,
            exposureResult.exposures,
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
      if (finalized.nextState === undefined || finalized.exposureResult === undefined) {
        throw new Error("Assessment finalization was not fully persisted");
      }
      if (!clearPendingAssessmentFinalization(finalized.sessionId)) {
        throw new Error("Assessment finalization could not be cleared");
      }
      saveAppState(finalized.nextState.appState);
      setState(finalized.nextState.appState);
      setResult(finalized.result);
      if (finalized.exposureResult.userId) {
        saveAnswersToDb(
          finalized.exposureResult.userId,
          finalized.baseState.appState.progress.currentDay,
          finalized.baseState.tagged,
        );
      }
      pendingFinalizationRef.current = null;
      setPendingFinalization(null);
    } catch {
      if (isActive()) {
        setPersistenceError("採点結果を保存できませんでした。もう一度お試しください。");
      }
    } finally {
      finalizingRef.current = false;
    }
  }, [setState]);

  useEffect(() => {
    const pending = findPendingAssessmentFinalization("mock");
    if (pending === null || !isMockPendingFinalization(pending)) return;
    let active = true;
    pendingFinalizationRef.current = pending;
    const timer = window.setTimeout(() => {
      if (active) void resumeFinalization(pending, () => active);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [resumeFinalization]);

  if (state === undefined || state === null) return <LoadingScreen />;
  const appState: AppState = state;
  const insights = result ? buildMockExamInsights(result, getAllTopics()) : null;

  async function startExam() {
    if (starting || pendingFinalizationRef.current !== null) return;
    setStarting(true);
    setPersistenceError(null);
    // A failed response may still follow a committed start. Preserve the exact immutable
    // frame and question set so retry is idempotent.
    const pending = pendingStartRef.current ?? (() => {
      const startedAt = new Date().toISOString();
      const sessionId = createAssessmentSessionId();
      return {
        assessment: { sessionId, startedAt },
        exam: generateMockExam(appState, `${startedAt}:${appState.answers.length}`),
      };
    })();
    pendingStartRef.current = pending;
    try {
      await startAssessmentSessionForCurrentSession({
        action: "start",
        sessionId: pending.assessment.sessionId,
        source: "mock",
        mode: "exam",
        startedAt: pending.assessment.startedAt,
        questionCount: pending.exam.questions.length,
      });
      setAssessment(pending.assessment);
      setExam(pending.exam);
      setResult(null);
      pendingStartRef.current = null;
    } catch {
      setPersistenceError("評価セッションを開始できませんでした。もう一度お試しください。");
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete(answers: UserAnswer[]) {
    if (!exam || !assessment) return;
    const pending: MockPendingFinalization =
      pendingFinalizationRef.current ?? (() => {
          const tagged = answers.map((answer) => {
            const topicId = exam.topicIdByQuestionId[answer.questionId] ?? answer.topicId;
            const topic = topicId ? getTopic(topicId) : undefined;
            return {
              ...answer,
              topicId,
              tag: topic?.tags[0] ?? topic?.field ?? answer.tag,
            };
          });
          const completedAt = new Date().toISOString();
          const scored = scoreMockExam(exam, tagged);
          return {
            version: 1 as const,
            sessionId: assessment.sessionId,
            source: "mock" as const,
            attempts: tagged.map((answer) => ({
              questionId: answer.questionId,
              questionType: "mock_exam" as const,
              topicId: answer.topicId ?? "mock-exam",
              selectedAnswer: answer.selectedChoice ?? null,
              isCorrect: answer.isCorrect,
              mistakeReason: answer.isCorrect ? null : "模試の誤答",
              answeredAt: answer.answeredAt,
              attemptGroupId: assessment.sessionId,
            })),
            completion: {
              action: "complete" as const,
              sessionId: assessment.sessionId,
              completedAt,
              answers: tagged.flatMap((answer) => answer.selectedChoice === undefined ? [] : [{
                idempotencyKey: assessmentAnswerIdempotencyKey(
                  assessment.sessionId,
                  answer.questionId,
                ),
                canonicalQuestionId: answer.questionId,
                topicId: answer.topicId ?? "mock-exam",
                isCorrect: answer.isCorrect,
                answeredAt: answer.answeredAt,
              }]),
            },
            baseState: { appState, tagged },
            result: scored,
          };
        })();
    pendingFinalizationRef.current = pending;
    await resumeFinalization(pending);
  }

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/progress", label: "進捗へ戻る" }}
        title="本番形式 100問模試"
        description="3分野をバランスよく出題。結果は分野別の見直しに使えます。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {persistenceError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {persistenceError}
          </p>
        )}
        {persistenceError && pendingFinalization !== null && (
          <button
            type="button"
            onClick={() => void resumeFinalization(pendingFinalization)}
            className={buttonClass("secondary", "md", "w-full")}
          >
            保存を再試行する
          </button>
        )}
        {!exam && !result && <RecordingLockNotice />}
        {!exam && !result && (
          <section className="rounded-xl border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-4">
            <div className="flex items-start gap-3">
              <Icon name="flask" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-700">実力をまとめて確認</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {MOCK_EXAM_RULE.questionCount}問・{MOCK_EXAM_RULE.timeLimitSeconds / 60}分。途中で時間切れになった場合も、回答済みの結果を保存します。
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-brand-200 border-y border-brand-200 text-center">
              {FIELDS.map((field) => (
                <div key={field} className="px-2 py-3">
                  <p className="text-xs text-gray-600">{FIELD_LABELS[field]}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
                    {MOCK_EXAM_RULE.fieldQuestionCounts[field]}
                    <span className="ml-0.5 text-sm font-normal text-gray-500">問</span>
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void startExam()}
              disabled={starting || pendingFinalization !== null}
              className={buttonClass("primary", "lg", "mt-4 w-full")}
            >
              模試を始める
              <Icon name="arrow-right" className="h-5 w-5" />
            </button>
          </section>
        )}

        {exam && !result && (
          <TopicQuiz
            topicId="mock-exam"
            topicIdForQuestion={(question) => exam.topicIdByQuestionId[question.id]}
            questions={exam.questions}
            onComplete={handleComplete}
            completeLabel="模試を採点する"
            timeLimitSeconds={MOCK_EXAM_RULE.timeLimitSeconds}
          />
        )}

        {result && (
          <section className="animate-pop-in rounded-xl border border-gray-200 bg-white p-5 text-center">
            <Icon name="chart" className="mx-auto h-6 w-6 text-gray-400" />
            <h2 className="mt-2 text-base font-semibold text-gray-900">模試結果</h2>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">
              {result.correct}
              <span className="ml-0.5 text-base font-normal text-gray-500">
                {" "}/ {result.total}問正解
              </span>
            </p>
            <div className="mt-5 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200">
              {FIELDS.map((field) => {
                const score = result.fieldScores[field];
                const rate = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);
                return (
                  <div key={field} className="px-2 py-3">
                    <p className="text-[11px] text-gray-600">{FIELD_LABELS[field]}</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-gray-900">
                      {score.correct}/{score.total}
                    </p>
                    <p className="text-xs font-semibold tabular-nums text-brand-700">{rate}%</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              間違えた {result.wrongTopicIds.length} トピックを「復習」に追加しました。まず苦手分野を1つ解き直しましょう。
            </p>
            {insights && insights.topics.length > 0 && (
              <div className="mt-5 rounded-xl border border-accent-200 bg-accent-50 p-4 text-left">
                <h3 className="text-sm font-semibold text-gray-900">強化が必要なTopic</h3>
                <ol className="mt-2 space-y-2">
                  {insights.topics.map((topic) => (
                    <li key={topic.topicId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-gray-800">{topic.title}</span>
                      <span className="shrink-0 tabular-nums text-accent-700">{topic.rate}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {insights && (
              <div className="mt-4 text-left">
                <h3 className="text-sm font-semibold text-gray-900">次にやること</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{insights.message}</p>
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href={
                  insights?.primaryTopicId
                    ? getLessonHref(insights.primaryTopicId, {
                        from: "review",
                        activity: "review",
                        anchor: "lesson-quiz",
                      })
                    : "/review"
                }
                className={buttonClass("primary", "md")}
              >
                復習する
              </Link>
              <button
                type="button"
                onClick={() => void startExam()}
                disabled={starting || pendingFinalization !== null}
                className={buttonClass("soft", "md")}
              >
                もう一度挑戦
              </button>
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
