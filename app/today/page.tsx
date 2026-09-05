"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppState } from "@/types";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics, getTopic } from "@/lib/content";
import { getWrittenQuestionsForTopic } from "@/data/writtenQuestions";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { daysUntilExam } from "@/lib/aiPlanner";
import {
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import { buildTodayPrimaryAction } from "@/lib/todayPrimary";
import { buildActionImpact } from "@/lib/actionImpact";
import { evaluateGrowthCheckGate } from "@/lib/growthCheck";
import { buildComebackMission } from "@/lib/comebackMission";
import {
  clearStudyAmount,
  defaultDailyMinutes,
  getSelectedMinutes,
  setStudyAmount,
} from "@/lib/studyAmount";
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
import TodayPrimaryCard from "@/components/today/TodayPrimaryCard";
import GrowthCheckCard from "@/components/today/GrowthCheckCard";
import StudyAmountPicker from "@/components/today/StudyAmountPicker";
import ComebackMissionCard from "@/components/today/ComebackMissionCard";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
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
import ExamReadinessSummary from "@/components/today/ExamReadinessSummary";

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
  const [examReadiness, setExamReadiness] = useState(
    () => loadCachedProgressBootstrap()?.examReadiness ?? null,
  );

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  // 選ばれた学習量があればそれを予算にする。選んでいなければ従来どおり。
  const selectedMinutes = state ? getSelectedMinutes(state, todayLocalDate()) : null;
  const plan = useMemo(
    () =>
      state?.profile
        ? generateLearningPlan(state, topics, new Date(), selectedMinutes ?? undefined)
        : null,
    [selectedMinutes, state, topics],
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
    const savedTopicIds = new Set<string>();
    for (const item of menu.items) {
      savedTopicIds.add(item.topicId);
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
      if (savedTopicIds.has(review.topicId)) continue;
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
  const completionReactionSentRef = useRef(false);
  const nodes = useMemo(
    () => (state ? buildQuestRoute(state, tasks, storedRouteIds) : []),
    [state, tasks, storedRouteIds],
  );
  useEffect(() => {
    if (nodes.length > 0) {
      saveStoredRoute(todayLocalDate(), nodes.map((node) => node.topicId));
    }
  }, [nodes]);

  // Primary の推奨理由は既存キューが持つ reason をそのまま使う（文言を発明しない）。
  // 純粋な再計算のみで、新しいネットワーク往復は増やさない。
  const learningQueue = useMemo(
    () => (state ? buildTodaysLearningQueue({ progress: state.progress, topics }) : []),
    [state, topics],
  );


  useEffect(() => {
    if (!state?.profile || !menu || !plan) return;
    if (nodes.length > 0) {
      completionReactionSentRef.current = false;
      return;
    }
    if (completionReactionSentRef.current) return;
    completionReactionSentRef.current = true;
    emitMochitEvent("taskComplete");
  }, [menu, nodes.length, plan, state?.profile]);

  if (state === undefined || state === null || !menu || !plan) {
    return <LoadingScreen />;
  }

  const currentCheckpoint = getCheckpoint(getCheckpointProgress(state).currentCheckpointId);
  const gate = buildCheckpointGate(state, currentCheckpoint.id);

  // 成長確認（踊り場）はCPの中間で最大1回。緊急の復習が溜まっていれば延期する。
  const growthCheckGate = evaluateGrowthCheckGate({ state, gate });

  // 数日空いた人向けの短い再開点。対象外なら null で何も出さない。
  const comeback = buildComebackMission({ state });

  const persistState = (next: AppState) => {
    if (next === state) return;
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, next.progress);
  };

  // ホームの1画面目で「合格までの距離」と「今日のミッション」が分かるようにする。
  const examRemaining = daysUntilExam(state.profile);
  const totalMinutes = nodes.reduce((sum, node) => sum + node.estimatedMinutes, 0);

  // 今日の最優先1件（GF-P0-001）。候補は既存の推奨ロジックが選んだものだけを使い、
  // ここでは「どれを Primary として強調するか」しか決めない。
  const primary = buildTodayPrimaryAction({
    state,
    nodes,
    gate,
    queue: learningQueue,
    reviewItems: menu.reviewItems,
  });
  // 完了すると何が進むか（GF-P0-002）。確定している更新対象だけを最大3件。
  const impacts = primary
    ? buildActionImpact({ state, action: primary, gate, signals: getClientBadgeSignals() })
    : [];
  // 補助表示のXPは実際の付与式から算出する(架空の数字は出さない)。
  const primaryMaxXp =
    primary?.topicId !== null && primary?.topicId !== undefined
      ? estimateTaskXpMax(state, primary.topicId)
      : null;

  // 最終ノード=今日の宝箱(デイリーミッションの実報酬)
  const quests = resolveDailyQuests(state, todayLocalDate());
  const questDoneCount = quests.quests.filter((q) => q.progress >= q.goal).length;
  const finalReward = {
    progressLabel: `${questDoneCount}/${quests.quests.length} 達成`,
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
    <main className="min-h-screen pb-24">
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

          <div className="mt-4 grid grid-cols-2 divide-x divide-gray-200 border-y border-gray-200">
            <div className="py-3 pr-4">
              <p className="text-xs text-gray-600">試験まで</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {examRemaining === null ? (
                  <span className="text-base font-normal text-gray-500">未設定</span>
                ) : (
                  <>
                    あと{examRemaining}
                    <span className="ml-0.5 text-sm font-normal text-gray-500">日</span>
                  </>
                )}
              </p>
            </div>
            <ExamReadinessSummary result={examReadiness} />
          </div>

          {/* Primary: 画面で唯一の強調ブロック(brand-50面+brand-200境界+左端brand-500線) */}
          {primary ? (
            <TodayPrimaryCard action={primary} impacts={impacts} maxXp={primaryMaxXp} />
          ) : (
            /* 推奨対象が無い/取れないときは既存の学習導線へ安全にフォールバックする */
            <div className="mt-4 rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-4">
              <p className="text-xs font-semibold text-brand-700">今日の最優先</p>
              <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">
                今日のぶんは終わりました。復習やテーマ探索で上積みできます
              </p>
              <p className="mt-1 text-sm tabular-nums text-gray-600">
                次の目標はCP{currentCheckpoint.order}「{currentCheckpoint.title}」（必須バッジ{" "}
                {gate.earnedRequiredCount}/{gate.totalRequiredCount}）
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/review" className={buttonClass("warn", "md", "flex-1 justify-center")}>
                  復習を見る
                </Link>
                <Link href="/learn" className={buttonClass("primary", "md", "flex-1 justify-center")}>
                  テーマを探す
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {/* Secondary の先頭: 久しぶりの人へ、重いルートより先に短い再開点を出す */}
        {comeback && <ComebackMissionCard mission={comeback} />}

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">今日のルート</h2>
            <span className="text-xs tabular-nums text-gray-500">
              {nodes.length}件・約{totalMinutes}分
            </span>
          </div>

          {/* 学習量は任意。既定の「おまかせ」が最初から選ばれている。 */}
          <div className="mb-3">
            <StudyAmountPicker
              selectedMinutes={selectedMinutes}
              defaultMinutes={defaultDailyMinutes(state.profile)}
              onSelect={(minutes) =>
                persistState(setStudyAmount(state, todayLocalDate(), minutes))
              }
              onClear={() => persistState(clearStudyAmount(state, todayLocalDate()))}
            />
          </div>

          {nodes.length > 0 && (
            <QuestRoute
              nodes={nodes}
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
              <Icon
                name="circle-check"
                className="mx-auto h-7 w-7 text-emerald-600"
              />
              <p className="mt-3 text-base font-semibold text-gray-900">
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

        {/* Secondary: 今日の学習導線の下に置く。Primary と競合させない。 */}
        <GrowthCheckCard available={growthCheckGate.available} />

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
            <TodayPolicyStrip
              state={state}
              examReadiness={examReadiness}
              onExamReadiness={setExamReadiness}
            />
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
