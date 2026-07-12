"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics, getTopic } from "@/lib/content";
import { getWrittenQuestionsForTopic } from "@/data/writtenQuestions";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { daysUntilExam } from "@/lib/aiPlanner";
import { computeProgressSummary } from "@/lib/progressSummary";
import {
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import {
  getUserId,
  loadCachedProgressBootstrap,
  saveDailyTasksToDb,
  todayLocalDate,
} from "@/lib/userSession";
import type { DailyStudyTaskInput } from "@/types/studyProgress";
import {
  getLessonHref,
  getLessonLocation,
} from "@/lib/learningCatalog";
import StreakBanner from "@/components/today/StreakBanner";
import DailyQuestCard from "@/components/today/DailyQuestCard";
import NextGoalCard from "@/components/today/NextGoalCard";
import DailyProgressReport from "@/components/learn/DailyProgressReport";
import TodayPolicyStrip from "@/components/today/TodayPolicyStrip";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import { buttonClass } from "@/components/ui/Button";

type TodayTask = {
  topicId: string;
  title: string;
  estimatedMinutes: number;
  reason: string;
  activity: "learn" | "review";
};

// 今日の役割は「何を、なぜ、どれくらい学ぶか」を決めること。
// 教材本文と確認問題は /learn のレッスンページだけに置く。
export default function TodayPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const topics = useMemo(() => getAllTopics(), []);
  const savedTasksDateRef = useRef<string | null>(null);
  // 合格準備度: /progress と同じくサーバー統合値のキャッシュを正とし、
  // 無ければローカル推定へフォールバックする（初回描画は LoadingScreen のため hydration は一致する）。
  const [bootstrap] = useState(() => loadCachedProgressBootstrap());

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  const plan = useMemo(
    () => (state?.profile ? generateLearningPlan(state, topics) : null),
    [state, topics],
  );
  const menu = plan?.todayMenu;

  // 既存の daily_study_tasks 保存を維持する。教材は保存せず、topicIdだけを参照する。
  useEffect(() => {
    if (!state?.profile || !menu) return;
    const userId = getUserId();
    if (!userId) return;
    const date = todayLocalDate();
    if (savedTasksDateRef.current === date) return;

    const defaultReason = plan?.todayReasons.join(" / ") || undefined;
    const inputs: DailyStudyTaskInput[] = [];
    for (const item of menu.items) {
      inputs.push({
        taskType: item.kind === "review" ? "review" : "topic_quiz",
        topicId: item.topicId,
        title: item.title,
        estimatedMinutes: item.estimatedMinutes,
        reason: defaultReason,
        source: "today_menu",
      });
    }
    for (const review of menu.reviewItems) {
      const topic = getTopic(review.topicId);
      inputs.push({
        taskType: "review",
        topicId: review.topicId,
        title: topic?.title ?? "復習",
        estimatedMinutes: topic?.estimatedMinutes ?? 3,
        reason: review.reason || defaultReason,
        source: "today_menu",
      });
    }
    if (inputs.length > 0) {
      savedTasksDateRef.current = date;
      void saveDailyTasksToDb(userId, date, inputs);
    }
  }, [menu, plan?.todayReasons, state?.profile]);

  const tasks = useMemo((): TodayTask[] => {
    if (!menu) return [];
    const seen = new Set<string>();
    const result: TodayTask[] = [];
    const defaultReason = plan?.todayReasons[0] ?? "今日の学習を進めましょう。";

    for (const item of menu.items) {
      if (seen.has(item.topicId) || !getLessonLocation(item.topicId)) continue;
      seen.add(item.topicId);
      result.push({
        topicId: item.topicId,
        title: item.title,
        estimatedMinutes: item.estimatedMinutes,
        reason: defaultReason,
        activity: item.kind === "review" ? "review" : "learn",
      });
    }
    for (const review of menu.reviewItems) {
      if (seen.has(review.topicId) || !getLessonLocation(review.topicId)) continue;
      const topic = getTopic(review.topicId);
      if (!topic) continue;
      seen.add(topic.id);
      result.push({
        topicId: topic.id,
        title: topic.title,
        estimatedMinutes: topic.estimatedMinutes,
        reason: review.reason || "復習予定日です。",
        activity: "review",
      });
    }
    return result;
  }, [menu, plan?.todayReasons]);

  if (state === undefined || state === null || !menu || !plan) {
    return <LoadingScreen />;
  }

  const currentCheckpoint = getCheckpoint(getCheckpointProgress(state).currentCheckpointId);
  const gate = buildCheckpointGate(state, currentCheckpoint.id);

  // ホームの1画面目で「合格までの距離」と「今日やること」が分かるようにする。
  const readiness =
    bootstrap?.integratedStatus?.readinessScore ??
    computeProgressSummary(topics, state.progress, state.answers).readinessPct;
  const examRemaining = daysUntilExam(state.profile);
  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const firstTask = tasks[0];
  const startHref = firstTask
    ? getLessonHref(firstTask.topicId, {
        from: "today",
        activity: firstTask.activity,
        anchor: firstTask.activity === "review" ? "lesson-quiz" : "lesson-content",
      })
    : null;
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日(${"日月火水木金土"[now.getDay()]})`;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white/80">{dateLabel}</p>
              <h1 className="mt-1 text-2xl font-extrabold">今日の学習</h1>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
              🔥 {state.progress.streakCount}日連続
            </span>
          </div>

          {/* 合格までの距離: 準備度リング + 試験日カウントダウン */}
          <div className="mt-4 flex items-center gap-4">
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
              role="img"
              aria-label={`合格準備度 ${readiness}パーセント`}
              style={{
                background: `conic-gradient(#fbbf24 ${readiness * 3.6}deg, rgba(255,255,255,0.2) 0deg)`,
              }}
            >
              <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-indigo-600">
                <span className="text-sm font-extrabold">{readiness}%</span>
              </div>
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-extrabold">合格準備度 {readiness}%</p>
              <p className="mt-0.5 text-white/85">
                {examRemaining === null
                  ? "試験日は未設定です"
                  : `試験日まで あと${examRemaining}日`}
                ・今日は{tasks.length > 0 ? `${tasks.length}件 / 約${totalMinutes}分` : "復習中心"}
              </p>
              <Link
                href="/plan"
                className="mt-0.5 inline-block text-xs font-bold text-white/80 underline underline-offset-2"
              >
                {currentCheckpoint.emoji} 次の目標 CP{currentCheckpoint.order}
                「{currentCheckpoint.title}」 バッジ {gate.earnedRequiredCount}/
                {gate.totalRequiredCount}
              </Link>
            </div>
          </div>

          {/* 主CTA: 迷わず最優先タスクから始める */}
          {startHref && firstTask && (
            <Link
              href={startHref}
              className="mt-4 flex w-full items-center justify-between rounded-2xl bg-amber-300 px-5 py-3.5 text-amber-950 shadow-md transition hover:bg-amber-200 active:scale-[0.99]"
            >
              <span className="min-w-0">
                <span className="block text-base font-extrabold">
                  {firstTask.activity === "review" ? "復習から始める" : "今日の学習を始める"}
                </span>
                <span className="mt-0.5 block truncate text-xs font-bold text-amber-800">
                  {firstTask.title}・約{firstTask.estimatedMinutes}分
                </span>
              </span>
              <span aria-hidden className="ml-3 shrink-0 text-xl font-extrabold">→</span>
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-gray-900">今日やること</h2>
            <span className="text-xs font-bold text-gray-500">
              {tasks.length}件・約{totalMinutes}分
            </span>
          </div>
          <div className="space-y-3">
            {tasks.map((task, index) => {
              const location = getLessonLocation(task.topicId);
              const hasWrittenQuestion = getWrittenQuestionsForTopic(task.topicId).length > 0;
              if (!location) return null;
              const href = getLessonHref(task.topicId, {
                from: "today",
                activity: task.activity,
                anchor: task.activity === "review" ? "lesson-quiz" : "lesson-content",
              });
              return (
                <article
                  key={task.topicId}
                  className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ${
                    index === 0 ? "ring-indigo-200" : "ring-gray-100"
                  }`}
                >
                  {index === 0 && <p className="text-xs font-extrabold text-indigo-600">最優先</p>}
                  <h3 className="mt-1 text-lg font-extrabold text-gray-900">{task.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {location.theme.title} ＞ {location.section.title}
                  </p>
                  <p className="mt-4 rounded-2xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-indigo-900">
                    {task.reason}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-bold text-gray-600">目安 {task.estimatedMinutes}分</span>
                    <div className="flex flex-wrap gap-2">
                      {hasWrittenQuestion && (
                        <Link
                          href={`/ai-grading?topicId=${encodeURIComponent(task.topicId)}`}
                          className="inline-flex items-center rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 active:scale-[0.98]"
                        >
                          自分の言葉で説明
                        </Link>
                      )}
                      <Link href={href} className={buttonClass(index === 0 ? "primary" : "secondary")}>
                        {task.activity === "review" ? "復習を始める" : "学習を始める"} <span aria-hidden className="ml-1">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            {tasks.length === 0 && (
              <article className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
                <p className="text-lg font-extrabold text-gray-900">今日の新しい学習はひと段落です</p>
                <p className="mt-1 text-sm text-gray-500">復習リストやテーマ一覧から、気になるレッスンを選べます。</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link href="/review" className={buttonClass("warn")}>復習を見る</Link>
                  <Link href="/learn" className={buttonClass("primary")}>テーマを探す</Link>
                </div>
              </article>
            )}
          </div>
        </section>

        <details className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold text-gray-700 marker:content-none">
            <span className="flex items-center justify-between gap-3">
              <span>今日の状況</span>
              <span className="text-xs font-semibold text-indigo-600">
                {currentCheckpoint.emoji} CP{currentCheckpoint.order}・🔥 {state.progress.streakCount}日
              </span>
            </span>
          </summary>
          <div className="space-y-4 border-t border-gray-100 p-4">
            <StreakBanner progress={state.progress} />
            <TodayPolicyStrip state={state} signals={getClientBadgeSignals()} />
            <DailyQuestCard state={state} setState={setState} />
            <NextGoalCard state={state} />
            <Link href="/plan" className="block text-center text-xs font-bold text-indigo-600 underline underline-offset-2">
              ロードマップを詳しく見る
            </Link>
          </div>
        </details>

        <DailyProgressReport date={todayLocalDate()} />
      </div>
      <BottomNav />
    </main>
  );
}
