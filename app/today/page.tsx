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
  saveProgressToDb,
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
import Icon from "@/components/ui/Icon";
import Mochit from "@/components/mochit/Mochit";
import { getMochitGrowthStage } from "@/lib/mochit";
import QuestRoute from "@/components/quest/QuestRoute";
import {
  buildQuestRoute,
  estimateTaskXpMax,
  loadStoredRoute,
  saveStoredRoute,
} from "@/lib/questRoute";
import {
  allQuestsDone,
  claimDailyQuestReward,
  resolveDailyQuests,
  DAILY_QUEST_CLEAR_XP,
} from "@/lib/dailyQuests";
import { emitCelebration } from "@/lib/celebration";
import { saveAppState } from "@/lib/storage";

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

  // 今日のルート: メニューは進捗で毎回再生成され完了タスクが消えるため、
  // その日のルート順序をlocalStorageに固定し、完了ノードを消さずに前進を見せる。
  const [storedRouteIds] = useState(() => loadStoredRoute(todayLocalDate()));
  const nodes = useMemo(
    () => (state ? buildQuestRoute(state, tasks, storedRouteIds) : []),
    [state, tasks, storedRouteIds],
  );
  useEffect(() => {
    if (nodes.length > 0) {
      saveStoredRoute(todayLocalDate(), nodes.map((node) => node.topicId));
    }
  }, [nodes]);

  if (state === undefined || state === null || !menu || !plan) {
    return <LoadingScreen />;
  }

  const currentCheckpoint = getCheckpoint(getCheckpointProgress(state).currentCheckpointId);
  const gate = buildCheckpointGate(state, currentCheckpoint.id);

  // ホームの1画面目で「合格までの距離」と「今日のミッション」が分かるようにする。
  const readiness =
    bootstrap?.integratedStatus?.readinessScore ??
    computeProgressSummary(topics, state.progress, state.answers).readinessPct;
  const examRemaining = daysUntilExam(state.profile);
  const totalMinutes = nodes.reduce((sum, node) => sum + node.estimatedMinutes, 0);
  const currentNode = nodes.find((node) => node.state === "current") ?? null;
  const doneCount = nodes.filter((node) => node.state === "done").length;
  const startHref = currentNode
    ? getLessonHref(currentNode.topicId, {
        from: "today",
        activity: currentNode.activity,
        anchor: currentNode.activity === "review" ? "lesson-quiz" : "lesson-content",
      })
    : null;
  // CTAには行動後の実際の成果を出す(実際の付与式から算出。架空の数字は出さない)
  const ctaXpMax = currentNode ? estimateTaskXpMax(state, currentNode.topicId) : null;

  // 今日の目的: 件数ではなく「何を達成するとどこへ進むか」を一文で示す
  const missionText = gate.finalExamUnlocked && !gate.finalExamPassed
    ? `CP${currentCheckpoint.order}「${currentCheckpoint.title}」の突破試験に挑戦できる状態です`
    : currentNode
      ? `「${currentNode.title}」${currentNode.activity === "review" ? "を復習して" : "を理解して"}、CP${currentCheckpoint.order}へのバッジを進める（${gate.earnedRequiredCount}/${gate.totalRequiredCount}）`
      : nodes.length > 0
        ? "今日のルートは踏破！復習やテーマ探索で上積みできます"
        : null;

  // 最終ノード=今日の宝箱(デイリーミッションの実報酬)
  const quests = resolveDailyQuests(state, todayLocalDate());
  const questDoneCount = quests.quests.filter((q) => q.progress >= q.goal).length;
  const finalReward = {
    progressLabel: `ミッション ${questDoneCount}/${quests.quests.length}`,
    xp: DAILY_QUEST_CLEAR_XP,
    state: quests.claimed
      ? ("claimed" as const)
      : allQuestsDone(quests)
        ? ("claimable" as const)
        : ("locked" as const),
    onClaim: () => {
      const claimed = claimDailyQuestReward(state);
      if (!claimed) return;
      saveAppState(claimed.state);
      setState(claimed.state);
      emitCelebration(state, claimed.state, [
        { kind: "questClear", label: "今日の3ミッション コンプリート！" },
      ]);
      const userId = getUserId();
      if (userId) saveProgressToDb(userId, claimed.state.progress);
    },
  };

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日(${"日月火水木金土"[now.getDay()]})`;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* 学習手帳: 日付・試験までの距離・準備度を数字で静かに示す */}
      <header className="border-b border-gray-200 bg-white px-4 pb-5 pt-5">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-gray-500">{dateLabel}</p>
            <p className="flex items-center gap-1 text-xs text-gray-600">
              <Icon
                name="flame"
                className={`h-3.5 w-3.5 ${state.progress.streakCount > 0 ? "text-accent-600" : "text-gray-400"}`}
              />
              <span className="tabular-nums">連続{state.progress.streakCount}日</span>
            </p>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">今日の学習</h1>

          <dl className="mt-4 grid grid-cols-2 divide-x divide-gray-200 border-y border-gray-200">
            <div className="py-3 pr-4">
              <dt className="text-xs text-gray-500">試験まで</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {examRemaining === null ? (
                  <span className="text-base font-normal text-gray-500">未設定</span>
                ) : (
                  <>
                    あと{examRemaining}
                    <span className="ml-0.5 text-sm font-normal text-gray-500">日</span>
                  </>
                )}
              </dd>
            </div>
            <div className="py-3 pl-4">
              <dt className="text-xs text-gray-500">合格準備度</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {readiness}
                <span className="ml-0.5 text-sm font-normal text-gray-500">%</span>
              </dd>
              <div
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-label="合格準備度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={readiness}
              >
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${readiness}%` }} />
              </div>
            </div>
          </dl>

          {missionText ? (
            <p className="mt-3 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">今日のミッション</span>{" "}
              <Link
                href="/plan"
                className="text-gray-700 underline decoration-gray-300 underline-offset-2 hover:decoration-brand-600 hover:text-brand-700"
              >
                {missionText}
              </Link>
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-600">
              今日は復習が中心。{" "}
              <Link
                href="/plan"
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                次の目標はCP{currentCheckpoint.order}「{currentCheckpoint.title}」（バッジ{" "}
                {gate.earnedRequiredCount}/{gate.totalRequiredCount}）
              </Link>
            </p>
          )}

          {/* 主CTA: 迷わず現在挑戦中のミッションから始める。行動後の成果(実XP)も示す */}
          {startHref && currentNode && (
            <Link
              href={startHref}
              className="mt-4 flex w-full items-center justify-between rounded-lg bg-brand-600 px-5 py-3.5 text-white transition hover:bg-brand-700 active:scale-[0.99]"
            >
              <span className="min-w-0">
                <span className="block text-base font-semibold">
                  {currentNode.activity === "review"
                    ? "復習ミッションから始める"
                    : doneCount > 0
                      ? "次のミッションに進む"
                      : "最初のミッションを始める"}
                </span>
                <span className="mt-0.5 block truncate text-xs tabular-nums text-white/75">
                  {currentNode.title}・約{currentNode.estimatedMinutes}分
                  {ctaXpMax !== null && `・全問正解で+${ctaXpMax} XP`}
                </span>
              </span>
              <Icon name="arrow-right" className="ml-3 h-5 w-5 shrink-0" />
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">今日のルート</h2>
            <span className="text-xs tabular-nums text-gray-500">
              {nodes.length}件・約{totalMinutes}分
            </span>
          </div>

          {nodes.length > 0 && (
            <QuestRoute
              nodes={nodes}
              growthStage={getMochitGrowthStage(state)}
              hrefFor={(node) =>
                getLessonHref(node.topicId, {
                  from: "today",
                  activity: node.activity,
                  anchor: node.activity === "review" ? "lesson-quiz" : "lesson-content",
                })
              }
              aiGradingHrefFor={(node) =>
                getWrittenQuestionsForTopic(node.topicId).length > 0
                  ? `/ai-grading?topicId=${encodeURIComponent(node.topicId)}`
                  : null
              }
              finalReward={finalReward}
            />
          )}

          {nodes.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="flex justify-center">
                <Mochit
                  state="normal"
                  size="small"
                  growthStage={getMochitGrowthStage(state)}
                  message="今日の予定はひと段落。復習を1つ確認しよう"
                />
              </div>
              <p className="mt-2 text-base font-semibold text-gray-900">
                今日の新しい学習はひと段落です
              </p>
              <p className="mt-1 text-sm text-gray-500">
                復習リストやテーマ一覧から、気になるレッスンを選べます。
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link href="/review" className={buttonClass("warn")}>復習を見る</Link>
                <Link href="/learn" className={buttonClass("primary")}>テーマを探す</Link>
              </div>
            </div>
          )}
        </section>

        <details className="rounded-xl border border-gray-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-gray-700 marker:content-none">
            <span className="flex items-center justify-between gap-3">
              <span>今日の状況</span>
              <span className="flex items-center gap-2 text-xs font-normal text-gray-500">
                <span className="tabular-nums">
                  CP{currentCheckpoint.order}・連続{state.progress.streakCount}日
                </span>
                <Icon name="chevron-down" className="h-4 w-4" />
              </span>
            </span>
          </summary>
          <div className="space-y-5 border-t border-gray-200 p-4">
            <StreakBanner progress={state.progress} />
            <TodayPolicyStrip state={state} signals={getClientBadgeSignals()} />
            <DailyQuestCard state={state} setState={setState} />
            <NextGoalCard state={state} />
            <Link
              href="/plan"
              className="block text-center text-xs text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
            >
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
