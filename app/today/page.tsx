"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppState } from "@/types";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics, getTopic } from "@/lib/content";
import { getWrittenQuestionsForTopic } from "@/data/writtenQuestions";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import { buildTodayPrimaryAction } from "@/lib/todayPrimary";
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
  refreshIntegratedStatus,
  saveDailyTasksToDb,
  saveProgressToDb,
  todayLocalDate,
} from "@/lib/userSession";
import type { DailyStudyTaskInput } from "@/types/studyProgress";
import { getLessonHref, getLessonLocation } from "@/lib/learningCatalog";
import {
  activityRouteTask,
  buildQuestRoute,
  loadStoredRoute,
  saveStoredRoute,
  type TodayRouteTask,
} from "@/lib/questRoute";
import { buildTodayActivities, mergeActivityLogs } from "@/lib/todayActivities";
import {
  loadTodayActivityLog,
  rememberOfferedActivities,
  saveTodayActivityLog,
  type TodayActivityLog,
} from "@/lib/todayActivityLog";
import {
  completeRemoteActivity,
  fetchRemoteActivities,
  offerRemoteActivities,
} from "@/lib/todayActivitySync";
import {
  getWordProgressMap,
  subscribeWordProgress,
  syncWordProgressOnce,
} from "@/lib/wordlistProgress";
import { loadCachedTopicStages, refreshTopicStages } from "@/lib/topicStageCache";
import { saveAppState } from "@/lib/storage";
import { pinDailyQuests, type DailyQuestContext } from "@/lib/dailyQuests";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import ComebackMissionCard from "@/components/today/ComebackMissionCard";
import GrowthCheckCard from "@/components/today/GrowthCheckCard";
import ReadingCheck from "@/components/today/ReadingCheck";
import TodayCueSheet from "@/components/today/TodayCueSheet";
import TodayFocusCta from "@/components/today/TodayFocusCta";
import { getMochitDisplayName } from "@/lib/mochitName";
import TodayHero from "@/components/today/TodayHero";
import TodayMissions from "@/components/today/TodayMissions";
import { buildTodaySlots, type TodaySlot } from "@/components/today/todaySlots";
import s from "@/components/today/todayView.module.css";

type TodayTask = TodayRouteTask & { reason: string };

// 今日の役割は「何を、どれくらいで、どこまで終えたか」を見せること。
// 試験日・合格準備度・ストリーク・CP などの進捗情報は /progress に置き、ここには出さない。
// 教材本文と確認問題は /learn のレッスンページだけに置く。
export default function TodayPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const topics = useMemo(() => getAllTopics(), []);
  const savedTasksDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  // 統合進捗（合格準備度など）を当日分に更新しておく。表示は /progress が担う。
  useEffect(() => {
    const userId = getUserId();
    if (userId) void refreshIntegratedStatus(userId);
  }, []);

  // 単語帳の進捗（端末＋DB同期）と、確認パックのトピック別ステージ。
  // どちらも Today の「関連用語を4択で確認」タスクを決める材料で、取れなければ出さないだけ。
  const [wordProgress, setWordProgress] = useState(() => getWordProgressMap());
  const [topicStages, setTopicStages] = useState(() => loadCachedTopicStages());
  useEffect(() => {
    const refresh = () => setWordProgress(getWordProgressMap());
    const unsubscribe = subscribeWordProgress(refresh);
    void syncWordProgressOnce().then(refresh);
    void refreshTopicStages().then(setTopicStages);
    return unsubscribe;
  }, []);

  // 今日のトピック以外のタスクの状態。正はサーバ（daily_study_tasks）で、端末のキャッシュを
  // 先に出しておき、サーバから取れたら置き換える。取れない（未ログイン・失敗）ときは端末だけで続ける。
  const [activityLog, setActivityLog] = useState<TodayActivityLog>(() =>
    loadTodayActivityLog(todayLocalDate()));
  const [activitySynced, setActivitySynced] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const date = todayLocalDate();
    void fetchRemoteActivities(date).then((remote) => {
      if (cancelled) return;
      const merged = mergeActivityLogs(loadTodayActivityLog(date), remote);
      if (remote) {
        saveTodayActivityLog(merged, date);
        // 端末では終えたがサーバへ届いていなかった完了を再送する。
        for (const activity of merged.unsyncedDone) void completeRemoteActivity(date, activity);
      }
      setActivityLog({ offered: merged.offered, done: merged.done });
      setActivitySynced(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 選ばれた学習量があればそれを予算にする。選んでいなければ従来どおり。
  const selectedMinutes = state ? getSelectedMinutes(state, todayLocalDate()) : null;
  // トピック以外のタスク（関連用語・公式過去問）。学習キューへ同じ優先度の物差しで並べる。
  const activities = useMemo(() => {
    if (!state?.profile) return { active: [], done: [], pinned: [] };
    const now = new Date();
    const upcomingTopicIds = buildTodaysLearningQueue({ state, progress: state.progress, topics, now })
      .flatMap((item) => (item.topicId ? [item.topicId] : []))
      .slice(0, 5);
    return buildTodayActivities({
      state,
      topics,
      now,
      budgetMinutes: selectedMinutes ?? defaultDailyMinutes(state.profile),
      wordProgress,
      topicStages,
      upcomingTopicIds,
      log: activityLog,
    });
  }, [activityLog, selectedMinutes, state, topicStages, topics, wordProgress]);
  const plan = useMemo(
    () =>
      state?.profile
        ? generateLearningPlan(
          state,
          topics,
          new Date(),
          selectedMinutes ?? undefined,
          activities.active,
        )
        : null,
    [activities.active, selectedMinutes, state, topics],
  );
  const menu = plan?.todayMenu;
  const learningQueue = useMemo(
    () => (state
      ? buildTodaysLearningQueue({
        state,
        progress: state.progress,
        topics,
        activities: activities.active,
      })
      : []),
    [activities.active, state, topics],
  );

  // 今日のメニューに初めて載ったタスクを保存し、その日のうちは中身（対象の単語・問題）を固定する。
  // サーバの状態を読み終えてから行う（別端末が先に出した中身を上書きしないため）。
  useEffect(() => {
    if (!activitySynced) return;
    const fresh = (menu?.sequence ?? []).flatMap((entry) =>
      entry.type === "activity" && !activityLog.offered[entry.activity.id] && !activityLog.done[entry.activity.id]
        ? [entry.activity]
        : []);
    if (fresh.length === 0) return;
    const date = todayLocalDate();
    rememberOfferedActivities(fresh, date);
    // サーバの保存結果（別端末と競合したらそちらの中身）で置き換える。
    // 保存できなかった（未ログイン・失敗）ときは端末の記録で固定する。
    void offerRemoteActivities(date, fresh).then((remote) => {
      const merged = mergeActivityLogs(loadTodayActivityLog(date), remote);
      if (remote) saveTodayActivityLog(merged, date);
      setActivityLog({ offered: merged.offered, done: merged.done });
    });
  }, [activityLog, activitySynced, menu]);

  // 既存の daily_study_tasks 保存を維持する。教材は保存せず、topicIdだけを参照する。
  useEffect(() => {
    if (!state?.profile || !menu) return;
    const userId = getUserId();
    if (!userId) return;
    const date = todayLocalDate();
    if (savedTasksDateRef.current === date) return;

    const defaultReason = plan?.todayReasons.join(" / ") || undefined;
    const reasons = new Map(learningQueue.flatMap((item) =>
      item.topicId ? [[item.topicId, item.reason] as const] : []));
    const inputs: DailyStudyTaskInput[] = [];
    const savedTopicIds = new Set<string>();
    for (const item of menu.items) {
      savedTopicIds.add(item.topicId);
      inputs.push({
        taskType: item.kind === "review" ? "review" : "topic_quiz",
        topicId: item.topicId,
        title: item.title,
        estimatedMinutes: item.estimatedMinutes,
        reason: reasons.get(item.topicId) ?? defaultReason,
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
  }, [menu, plan?.todayReasons, state?.profile, learningQueue]);

  const tasks = useMemo((): TodayTask[] => {
    if (!menu) return [];
    const seen = new Set<string>();
    const result: TodayTask[] = [];
    const defaultReason = plan?.todayReasons[0] ?? "今日の学習を進めましょう。";
    const reasons = new Map(learningQueue.flatMap((item) =>
      item.topicId ? [[item.topicId, item.reason] as const] : []));

    // activities を渡したメニューは sequence（トピックと関連用語・公式過去問を優先度順に並べたもの）を持つ。
    const sequence = menu.sequence ?? menu.items.map((item) => ({ type: "topic" as const, item }));
    for (const entry of sequence) {
      if (entry.type === "activity") {
        if (seen.has(entry.activity.id)) continue;
        seen.add(entry.activity.id);
        result.push({ ...activityRouteTask(entry.activity), reason: entry.activity.reason });
        continue;
      }
      const item = entry.item;
      if (seen.has(item.topicId) || !getLessonLocation(item.topicId)) continue;
      seen.add(item.topicId);
      result.push({
        topicId: item.topicId,
        title: item.title,
        estimatedMinutes: item.estimatedMinutes,
        reason: reasons.get(item.topicId) ?? defaultReason,
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
    // 今日いちど出したタスクは、予算の再計算で押し出されても当日中は残す。
    for (const activity of activities.pinned) {
      if (seen.has(activity.id)) continue;
      seen.add(activity.id);
      result.push({ ...activityRouteTask(activity), reason: activity.reason });
    }
    return result;
  }, [activities.pinned, menu, plan?.todayReasons, learningQueue]);

  // 今日のルート: メニューは進捗で毎回再生成され完了タスクが消えるため、
  // その日のルート順序をlocalStorageに固定し、完了した行を消さずに前進を見せる。
  const [storedRouteIds] = useState(() => loadStoredRoute(todayLocalDate()));
  const completionReactionSentRef = useRef(false);
  const nodes = useMemo(
    () => (state ? buildQuestRoute(state, tasks, storedRouteIds, new Date(), activities.done) : []),
    [activities.done, state, tasks, storedRouteIds],
  );
  useEffect(() => {
    if (nodes.length > 0) {
      saveStoredRoute(todayLocalDate(), nodes.map((node) => node.topicId));
    }
  }, [nodes]);

  // 今日の3ミッションは今日のルートと一致させる（用語タスクがある日だけ用語ミッション）。
  const questContext = useMemo((): DailyQuestContext => {
    const tasks = nodes.flatMap((node) => (node.task ? [node.task] : []));
    const vocab = tasks.find((task) => task.spec.kind === "vocab");
    return {
      todayActivityKinds: new Set(tasks.map((task) => task.kind)),
      todayVocabWordCount: vocab?.spec.kind === "vocab" ? vocab.spec.wordIds.length : undefined,
    };
  }, [nodes]);
  // タスクがサーバと同期できたら、その日の3ミッションを保存して固定する
  // （Today を経由しない学習完了でも同じ3件で進むように）。
  useEffect(() => {
    if (!activitySynced || !state?.profile) return;
    const date = todayLocalDate();
    const pinned = pinDailyQuests(state, date, questContext);
    if (pinned === state) return;
    saveAppState(pinned);
    setState(pinned);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, pinned.progress);
  }, [activitySynced, questContext, setState, state]);

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

  const gate = buildCheckpointGate(state, getCheckpointProgress(state).currentCheckpointId);
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

  // 今日の最優先1件（GF-P0-001）。候補は既存の推奨ロジックが選んだものだけを使う。
  const primary = buildTodayPrimaryAction({
    state,
    nodes,
    gate,
    queue: learningQueue,
    reviewItems: menu.reviewItems,
  });

  const slots = buildTodaySlots(nodes);
  const hrefFor = (slot: TodaySlot) =>
    getLessonHref(slot.topicId, {
      from: "today",
      activity: slot.activity,
      anchor: slot.activity === "review" ? "lesson-quiz" : "lesson-content",
    });
  const aiGradingHrefFor = (slot: TodaySlot) =>
    getWrittenQuestionsForTopic(slot.topicId).length > 0
      ? `/ai-grading?topicId=${encodeURIComponent(slot.topicId)}`
      : null;

  // 参考書の範囲は「今日の新規レッスン」のトピックで示す（なければ今日の全行）。
  // トピックは既存の学習ロジックが決めたもの。参考書はそれを章・節へ変換して見せるだけで、順序には関与しない。
  const newSlots = slots.filter((slot) => slot.kind === "new");
  const topicSlots = slots.filter((slot) => !slot.task);
  const readingTopics = (newSlots.length > 0 ? newSlots : topicSlots).flatMap((slot) => {
    const topic = getTopic(slot.topicId);
    return topic ? [topic] : [];
  });

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日（${"日月火水木金土"[now.getDay()]}）`;
  const date = todayLocalDate();

  return (
    <main className={s.view}>
      <TodayHero
        dateLabel={dateLabel}
        slots={slots}
        selectedMinutes={selectedMinutes}
        defaultMinutes={defaultDailyMinutes(state.profile)}
        onSelectMinutes={(minutes) => persistState(setStudyAmount(state, date, minutes))}
        onClearMinutes={() => persistState(clearStudyAmount(state, date))}
      />

      <div className={`${s.inner} ${s.body}`}>
        <div className={s.main}>
          {/* 久しぶりの人へ、重いルートより先に短い再開点を出す */}
          {comeback && (
            <div className={s.comeback}>
              <ComebackMissionCard mission={comeback} />
            </div>
          )}
          <TodayCueSheet
            slots={slots}
            primary={primary}
            hrefFor={hrefFor}
            aiGradingHrefFor={aiGradingHrefFor}
          />
          <TodayFocusCta displayName={getMochitDisplayName(state)} />
        </div>

        <div className={s.side}>
          <TodayMissions state={state} setState={setState} context={questContext} />
          <ReadingCheck date={date} topics={readingTopics} />
          {growthCheckGate.available && (
            <div className={s.sideExtra}>
              <GrowthCheckCard available />
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
