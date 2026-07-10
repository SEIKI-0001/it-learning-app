"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserAnswer } from "@/types";
import { FIELD_LABELS } from "@/types/content";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { getAllTopics, getQuestionsByTopic, getTopic } from "@/lib/content";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { completeStudySession } from "@/lib/studySession";
import { studyXpReward, XP_PER_CORRECT } from "@/lib/study";
import { emitUnlockNotice } from "@/lib/unlockNotice";
import { emitCelebration } from "@/lib/celebration";
import {
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import { getBadge } from "@/lib/badges";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { useBadgeSync } from "@/lib/useBadgeSync";
import {
  getUserId,
  reportTopicQuizResult,
  saveAnswersToDb,
  saveDailyTasksToDb,
  saveProgressToDb,
  todayLocalDate,
} from "@/lib/userSession";
import type { DailyStudyTaskInput } from "@/types/studyProgress";
import TopicQuiz from "@/components/learn/TopicQuiz";
import StreakFlame from "@/components/StreakFlame";
import StreakBanner from "@/components/today/StreakBanner";
import DailyQuestCard from "@/components/today/DailyQuestCard";
import NextGoalCard from "@/components/today/NextGoalCard";
import TopicContent, {
  TopicReviewSections,
} from "@/components/learn/TopicContent";
import DailyProgressReport from "@/components/learn/DailyProgressReport";
import TodayCheckPackCta from "@/components/checkPack/TodayCheckPackCta";
import TodayPolicyStrip from "@/components/today/TodayPolicyStrip";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

// 今日の学習メニュー。固定Dayではなく generateTodayMenu の結果を表示する。
export default function TodayPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  useBadgeSync(state, setState);
  const [completed, setCompleted] = useState(false);
  // 完了画面で「どれだけ進んだか」を実数で見せるための結果サマリ
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    gainedExp: number;
    streak: number;
    newlyBadges: string[]; // 今回獲得したバッジ名
    drop: string | null; // 追加ドロップの表示ラベル
    shieldConsumed: boolean; // おまもりがストリークを守ったか
    // 完了後の「次CPまでの残り条件」表示用（ロードマップ進行への効果を見せる）
    cpTitle: string;
    cpId: string;
    remainingRequired: number; // 最終問題解放まで必要な必須バッジ残数
    finalUnlocked: boolean; // 最終問題が解放済みか
    finalJustUnlocked: boolean; // 今回の学習で解放されたか
  } | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  // 長い問題リストが結果カードに置き換わるため、完了時は結果へスクロールして迷子を防ぐ
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (completed) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [completed]);

  // 今日のメニューを daily_study_tasks に保存する（fire-and-forget・1日1回）。
  // サーバー側で既存タスクは上書きしない（実績や達成度報告の巻き戻しは起きない）。
  const savedTasksDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state?.profile) return;
    const userId = getUserId();
    if (!userId) return; // 匿名は localStorage のみで継続
    const date = todayLocalDate();
    if (savedTasksDateRef.current === date) return;

    const p = generateLearningPlan(state, getAllTopics());
    const m = p.todayMenu;
    const reason = p.todayReasons.join(" / ") || undefined;
    const inputs: DailyStudyTaskInput[] = [];
    // learn item → topic_quiz
    for (const it of m.items) {
      inputs.push({
        taskType: it.kind === "review" ? "review" : "topic_quiz",
        topicId: it.topicId,
        title: it.title,
        estimatedMinutes: it.estimatedMinutes,
        reason,
        source: "today_menu",
      });
    }
    // review item → review
    for (const r of m.reviewItems) {
      const rt = getTopic(r.topicId);
      inputs.push({
        taskType: "review",
        topicId: r.topicId,
        title: rt?.title ?? "復習",
        estimatedMinutes: rt?.estimatedMinutes ?? 3,
        reason: r.reason || reason,
        source: "today_menu",
      });
    }

    if (inputs.length > 0) {
      savedTasksDateRef.current = date;
      saveDailyTasksToDb(userId, date, inputs);
    }
  }, [state]);

  const topics = getAllTopics();
  const plan = useMemo(
    () => (state?.profile ? generateLearningPlan(state, topics) : null),
    [state, topics],
  );
  const menu = plan?.todayMenu ?? null;

  if (state === undefined || state === null || !menu || !plan) {
    return <LoadingScreen />;
  }

  const learnItem = menu.items.find((i) => i.kind === "learn");
  const primary = learnItem ? getTopic(learnItem.topicId) : undefined;
  const questions = primary ? getQuestionsByTopic(primary.id) : [];
  const currentCp = getCheckpoint(getCheckpointProgress(state).currentCheckpointId);
  // 次に進む予定: トピックの nextTopicIds があればそれ、無ければ今週の重点分野。
  const nextTopic =
    primary?.nextTopicIds
      ?.map((id) => getTopic(id))
      .find((t) => t && !state.progress.completedTopics.includes(t.id)) ?? undefined;

  function handleComplete(answers: UserAnswer[]) {
    if (!state || !primary) return;
    // タグをトピックのタグに上書き(苦手タグの集計に使う)
    const tagged: UserAnswer[] = answers.map((a) => ({
      ...a,
      tag: primary.tags[0] ?? primary.field,
    }));
    // 完了・バッジ確定付与・追加ドロップまでを共通オーケストレータで一括処理する。
    const signals = getClientBadgeSignals();
    const session = completeStudySession(state, primary.id, tagged, signals);
    const finalState = session.state;
    const dropLabel = session.dropLabel;

    saveAppState(finalState);
    setState(finalState);
    // バッジは下の結果カードに出すので、グローバル通知は装備解放のみ。
    emitUnlockNotice(state, finalState);
    // XP獲得・レベル/ランクアップ・CP突破の達成演出（差分から自動検出）。
    // ストリーク節目は差分から判定できないため extras で明示的に渡す。
    emitCelebration(
      state,
      finalState,
      session.streakMilestone
        ? [{ kind: "streakMilestone", ...session.streakMilestone }]
        : [],
    );
    const correct = tagged.filter((a) => a.isCorrect).length;
    const total = tagged.length;

    // ロードマップ進行への効果を可視化する（学習前後で最終問題の解放が変わったか）。
    const currentCpId = getCheckpointProgress(finalState).currentCheckpointId;
    const cpDef = getCheckpoint(currentCpId);
    const gateBefore = buildCheckpointGate(state, currentCpId);
    const gateAfter = buildCheckpointGate(finalState, currentCpId);
    const remainingRequired = Math.max(
      0,
      gateAfter.requiredBadgeCount - gateAfter.earnedRequiredCount,
    );

    setResult({
      correct,
      total,
      gainedExp: finalState.progress.exp - state.progress.exp,
      streak: finalState.progress.streakCount,
      newlyBadges: session.newlyEarnedIds
        .map((id) => getBadge(id)?.label)
        .filter((v): v is string => !!v),
      drop: dropLabel,
      shieldConsumed: session.shieldConsumed,
      cpTitle: cpDef.title,
      cpId: currentCpId,
      remainingRequired,
      finalUnlocked: gateAfter.finalExamUnlocked,
      finalJustUnlocked:
        gateAfter.finalExamUnlocked && !gateBefore.finalExamUnlocked,
    });
    setCompleted(true);

    const userId = getUserId();
    if (userId) {
      saveProgressToDb(userId, finalState.progress);
      saveAnswersToDb(userId, 0, tagged);
      // 理解度（topic_progress）は確認問題結果でのみ更新する。
      if (total > 0) {
        reportTopicQuizResult(userId, primary.id, correct, total, todayLocalDate());
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-4 pt-4 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <p className="text-[11px] font-semibold text-white/80">今日の学習メニュー</p>
          <h1 className="mt-0.5 text-lg font-extrabold leading-tight">{menu.theme}</h1>
          <p className="mt-1 text-xs text-white/90">⏱️ 目安 {menu.totalMinutes}分</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md md:max-w-2xl space-y-7 px-4 py-6">
        {/* ストリークの現在地と損失回避の一言（今日やる理由を最初に作る） */}
        <StreakBanner progress={state.progress} />

        {/* 今日の方針: 立て直しプラン・推奨配分・次のバッジ・突破試験を1枚に集約 */}
        <TodayPolicyStrip state={state} signals={getClientBadgeSignals()} />

        {/* 今日の3ミッション（学習成果ベース・コンプリートで宝箱） */}
        <DailyQuestCard state={state} setState={setState} />

        {/* あと少しのゴール（目標勾配: 近いゴールをバーで見せて今日の目的を作る） */}
        <NextGoalCard state={state} />

        {/* 今日の学習ガイド: 現在CP・今日これをやる理由（必須）・ゴール・次の予定 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
              <span aria-hidden>{currentCp.emoji}</span>
              いまのチェックポイント：CP{currentCp.order} {currentCp.title}
            </p>
            <Link
              href="/plan"
              className="text-xs font-bold text-indigo-600 underline underline-offset-2"
            >
              ロードマップ
            </Link>
          </div>

          {/* 今日これをやる理由（必ず表示） */}
          <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2.5">
            <p className="text-xs font-bold text-indigo-600">💡 今日これをやる理由</p>
            <ul className="mt-1 space-y-1">
              {plan.todayReasons.map((r, i) => (
                <li key={i} className="text-sm font-semibold text-indigo-800">
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
              <p className="text-xs font-bold text-emerald-600">🎯 今日のゴール</p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-800">
                {primary
                  ? "確認問題まで解いて「完了」する"
                  : "復習で知識を定着させる"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2.5">
              <p className="text-xs font-bold text-gray-500">⏭️ 次に進む予定</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-700">
                {nextTopic
                  ? nextTopic.title
                  : plan.weeklyGoal.focusField
                    ? `${FIELD_LABELS[plan.weeklyGoal.focusField]}の続き`
                    : "復習・過去問"}
              </p>
            </div>
          </div>
        </section>

        {/* 今日のテーマ学習。内容はトピック詳細とまったく同じものを表示する
            （確認問題だけは下の「今日の学習を完了する」クイズに任せる）。 */}
        {primary ? (
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-gray-800">
              📖 今日のテーマ
            </h2>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-semibold text-indigo-500">
                {FIELD_LABELS[primary.field]}・{primary.category}
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-gray-800">
                {primary.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {primary.summary}
              </p>
            </div>

            <div className="mt-6">
              <TopicContent topic={primary} showCheckQuestions={false} />
            </div>

            <h3 className="mb-3 mt-8 text-base font-extrabold text-gray-800">
              ✏️ 今日の確認問題
            </h3>
            {completed ? (
              <div
                ref={resultRef}
                className="animate-pop-in rounded-2xl bg-green-50 p-5 text-center ring-1 ring-green-200"
              >
                <p className="text-3xl">{result && result.correct === result.total ? "🏆" : "🎉"}</p>
                <p className="mt-2 text-base font-extrabold text-green-700">
                  {result && result.correct === result.total
                    ? "全問正解！今日のぶん、おつかれさま！"
                    : "今日のぶん、おつかれさま！"}
                </p>
                {result && (
                  <>
                    <p className="mt-1 text-sm font-semibold text-green-600">
                      {result.total}問中 {result.correct}問正解
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100">
                        +{result.gainedExp} XP
                      </span>
                      <StreakFlame days={result.streak} className="bg-white" />
                    </div>
                    {result.shieldConsumed && (
                      <p className="mt-2 text-xs font-bold text-sky-600">
                        🛡️ おまもりがストリークを守りました
                      </p>
                    )}
                    {result.newlyBadges.length > 0 && (
                      <div className="animate-rise-in mt-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-emerald-100">
                        <p className="text-xs font-bold text-emerald-600">
                          🏅 新しいバッジを獲得！
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-700">
                          {result.newlyBadges.join(" ・ ")}
                        </p>
                        {result.drop && (
                          <p className="mt-1 text-xs font-semibold text-sky-600">
                            追加ドロップ：{result.drop}
                          </p>
                        )}
                        <Link
                          href="/badges"
                          className="mt-1 inline-block text-xs font-bold text-indigo-600 underline underline-offset-2"
                        >
                          バッジ一覧を見る →
                        </Link>
                      </div>
                    )}

                    {/* ロードマップ進行への効果: 次CPまでの残り条件 or 最終問題解放 */}
                    {result.finalJustUnlocked ? (
                      <Link
                        href={`/checkpoint/${result.cpId}/final`}
                        className="animate-sheen mt-3 block overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 px-3 py-3 text-left shadow-sm"
                      >
                        <p className="text-sm font-extrabold text-white">
                          ⚔️ 突破試験が解放されました！
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-white/90">
                          {result.cpTitle}の最終問題に挑めば CP を突破できます →
                        </p>
                      </Link>
                    ) : result.finalUnlocked ? (
                      <Link
                        href={`/checkpoint/${result.cpId}/final`}
                        className="mt-3 block rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-rose-100"
                      >
                        <p className="text-xs font-bold text-rose-600">
                          ⚔️ 突破試験は挑戦できます
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-700">
                          {result.cpTitle}の最終問題に挑む →
                        </p>
                      </Link>
                    ) : (
                      <div className="mt-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-indigo-100">
                        <p className="text-xs font-bold text-indigo-600">
                          🗺️ {result.cpTitle}の進行
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-700">
                          最終問題の解放まで、必須バッジあと
                          <span className="text-indigo-600">
                            {" "}
                            {result.remainingRequired} 個
                          </span>
                        </p>
                        <Link
                          href="/plan"
                          className="mt-1 inline-block text-xs font-bold text-indigo-600 underline underline-offset-2"
                        >
                          ロードマップで確認 →
                        </Link>
                      </div>
                    )}
                  </>
                )}
                <p className="mt-3 text-sm text-green-700">
                  今日も少し前に進みました。
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href="/progress"
                    className="rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
                  >
                    進捗を見る
                  </Link>
                  <Link
                    href="/topics"
                    className="rounded-2xl bg-white px-6 py-3 font-bold text-indigo-600 ring-1 ring-indigo-200"
                  >
                    別のトピックも学ぶ
                  </Link>
                </div>
              </div>
            ) : questions.length > 0 ? (
              <TopicQuiz
                topicId={primary.id}
                questions={questions}
                onComplete={handleComplete}
                completeLabel="今日の学習を完了する"
                dense
                xpPerCorrect={
                  state ? Math.round(XP_PER_CORRECT * studyXpReward(state, primary.id).multiplier) : undefined
                }
              />
            ) : (
              <p className="text-sm text-gray-500">このトピックの確認問題は準備中です。</p>
            )}

            {/* 完了ボタンより下：復習・参考書・過去問分野を最下部に表示 */}
            <div className="mt-10">
              <TopicReviewSections topic={primary} />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-3xl">🏅</p>
            <p className="mt-2 text-base font-extrabold text-gray-800">
              新しく学ぶトピックはひと段落！
            </p>
            <p className="mt-1 text-sm text-gray-500">
              復習で知識を定着させましょう。
            </p>
            <Link
              href="/review"
              className="mt-4 inline-block rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
            >
              復習へ
            </Link>
          </section>
        )}

        {/* 対象トピックの状態に応じた確認パック導線（パックが無ければ非表示） */}
        {primary && <TodayCheckPackCta topicId={primary.id} />}

        {/* 今日の達成度報告（低入力・1日1回・同日上書き） */}
        <DailyProgressReport date={todayLocalDate()} />
      </div>

      <BottomNav />
    </main>
  );
}
