"use client";

import { useEffect, useState } from "react";
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
  saveAnswersToDb,
  saveProgressToDb,
  saveQuestionAttemptsForCurrentSession,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import { getLessonHref } from "@/lib/learningCatalog";

const FIELDS: TopicField[] = ["strategy", "management", "technology"];

export default function MockExamPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [exam, setExam] = useState<MockExam | null>(null);
  const [result, setResult] = useState<MockExamResult | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  if (state === undefined || state === null) return <LoadingScreen />;
  const appState: AppState = state;
  const insights = result ? buildMockExamInsights(result, getAllTopics()) : null;

  function startExam() {
    // 同じ挑戦中は設問順を固定し、再挑戦時だけ新しい構成にする。
    const seed = `${new Date().toISOString()}:${appState.answers.length}`;
    setExam(generateMockExam(appState, seed));
    setResult(null);
  }

  async function handleComplete(answers: UserAnswer[]) {
    if (!exam) return;
    const now = new Date();
    const tagged = answers.map((answer) => {
      const topicId = exam.topicIdByQuestionId[answer.questionId] ?? answer.topicId;
      const topic = topicId ? getTopic(topicId) : undefined;
      return {
        ...answer,
        topicId,
        tag: topic?.tags[0] ?? topic?.field ?? answer.tag,
      };
    });
    const scored = scoreMockExam(exam, tagged);
    const questionAttempts = tagged.map((answer) => ({
      questionId: answer.questionId,
      questionType: "mock_exam" as const,
      topicId: answer.topicId ?? "mock-exam",
      selectedAnswer: answer.selectedChoice ?? null,
      isCorrect: answer.isCorrect,
      mistakeReason: answer.isCorrect ? null : "模試の誤答",
      answeredAt: answer.answeredAt,
    }));
    const exposureResult = await saveQuestionAttemptsForCurrentSession(
      questionAttempts,
      appState.answers,
    );
    const { exposures, userId } = exposureResult;
    const next = recordMockExamResult(appState, tagged, scored, exposures, now);
    saveAppState(next);
    setState(next);
    setResult(scored);

    if (userId) {
      saveProgressToDb(userId, next.progress);
      saveAnswersToDb(userId, appState.progress.currentDay, tagged);
    }
  }

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/progress", label: "進捗へ戻る" }}
        title="本番形式 100問模試"
        description="3分野をバランスよく出題。結果は分野別の見直しに使えます。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
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
              onClick={startExam}
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
              <button type="button" onClick={startExam} className={buttonClass("soft", "md")}>
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
