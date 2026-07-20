"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReferenceBook } from "@/types/referenceBook";
import type { PlanAdjustmentProposal } from "@/types/planAdjustment";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics } from "@/lib/content";
import { getLessonHref } from "@/lib/learningCatalog";
import { generateLearningPlan, resolveWeeklyPlan } from "@/lib/studyPlanner";
import { saveAppState } from "@/lib/storage";
import {
  fetchLatestPlanAdjustment,
  generatePlanAdjustment,
  getUserId,
  saveProgressToDb,
  saveProfileToDb,
} from "@/lib/userSession";
import { loadReferenceBook, referenceBookProgress } from "@/lib/referenceBook";
import {
  buildCheckpointComparison,
  buildCheckpointRoadmap,
  getCheckpoint,
} from "@/lib/checkpoints";
import { useBadgeSync } from "@/lib/useBadgeSync";
import BottomNav from "@/components/BottomNav";
import RoadmapMap from "@/components/RoadmapMap";
import CheckpointGateCard from "@/components/checkpoints/CheckpointGateCard";
import PlanAdjustmentCard from "@/components/progress/PlanAdjustmentCard";
import LoadingScreen from "@/components/LoadingScreen";
import Icon from "@/components/ui/Icon";

// /plan = 合格までの全体ロードマップ（目標と道筋の画面）。
// 計画ロジックは lib/studyPlanner.ts / lib/checkpoints.ts（純粋関数）に閉じ込め、ここは表示だけを担う。
// CPクエスト → 全体ロードマップ（＋予定との比較）→ 今週のゴール → 過去問 → 参考書 → 立て直し提案。

function formatDate(iso: string | null): string {
  if (!iso) return "未定";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "未定";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PlanPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  useBadgeSync(state, setState);
  const [book, setBook] = useState<ReferenceBook | null>(null);
  const [proposal, setProposal] = useState<PlanAdjustmentProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(true);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  // 立て直し提案の取得（無ければ最新の統合進捗から生成を試みる）。
  // 未ログイン・Supabase 未設定・提案不要・失敗なら非表示のまま学習を止めない。
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const uid = getUserId();
      if (!uid) {
        if (!cancelled) setProposalLoading(false);
        return;
      }
      const latest =
        (await fetchLatestPlanAdjustment(uid)) ??
        (await generatePlanAdjustment(uid));
      if (!cancelled) {
        setProposal(latest);
        setProposalLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // 今週のタスクリストの確定と、既存ユーザーの学習開始日の補完をまとめて永続化する。
  // - 週次リスト: 週初め/未確定のときだけ再生成（途中で内容が変わらない）。
  // - 学習開始日: プロフィールはあるが planStartDate 未設定なら当日で補完（実質「今日から」）。
  useEffect(() => {
    if (!state) return;
    const resolved = resolveWeeklyPlan(state);
    const needsWeekly = resolved !== state.progress.weeklyPlan;
    const needsStart = !!state.profile && !state.profile.planStartDate;
    if (!needsWeekly && !needsStart) return;

    const next = {
      ...state,
      profile:
        needsStart && state.profile
          ? {
              ...state.profile,
              planStartDate: new Date().toISOString().slice(0, 10),
            }
          : state.profile,
      progress: needsWeekly
        ? { ...state.progress, weeklyPlan: resolved }
        : state.progress,
    };
    saveAppState(next);
    setState(next);
    const uid = getUserId();
    if (uid) {
      if (needsWeekly) saveProgressToDb(uid, next.progress);
      if (needsStart && next.profile) saveProfileToDb(uid, next.profile);
    }
  }, [state, setState]);

  useEffect(() => {
    let cancelled = false;
    function init() {
      const b = loadReferenceBook();
      if (!cancelled) setBook(b);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const topics = getAllTopics();
  const plan = useMemo(
    () => (state ? generateLearningPlan(state, topics) : null),
    [state, topics],
  );

  if (state === undefined || state === null || !plan) {
    return <LoadingScreen />;
  }

  const bookProgress = referenceBookProgress(book);
  const weeklyDone = plan.weeklyItems.filter((i) => i.checked).length;
  // 予定（時間軸）と現在地（CP進行）の比較。試験日・開始日が未設定なら null。
  const comparison = buildCheckpointComparison(state);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="border-b border-gray-200 bg-white px-4 pb-5 pt-5">
        <div className="mx-auto w-full max-w-md md:max-w-3xl">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">学習計画</h1>
            <Link
              href="/settings"
              className="text-xs text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
            >
              設定
            </Link>
          </div>
          <div className="mt-4 border-y border-gray-200 py-3">
            <p className="text-xs text-gray-500">試験まで</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {plan.daysUntilExam === null ? (
                <span className="text-base font-normal text-gray-500">未設定</span>
              ) : (
                <>
                  あと{plan.daysUntilExam}
                  <span className="ml-0.5 text-sm font-normal text-gray-500">日</span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-3xl">
        {/* バッジゲート型ロードマップ: 現在CP・必要バッジ・不足・最終問題の解放状態（詳細） */}
        <CheckpointGateCard state={state} />

        {/* 全体ロードマップ（すごろく風マップ・CP進行で駆動＝現在地はゲートカードと一致） */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            合格までのロードマップ
          </h2>
          <RoadmapMap
            phases={buildCheckpointRoadmap(state)}
            expectedPhaseId={
              comparison ? getCheckpoint(comparison.expectedId).phaseId : null
            }
          />
          {comparison && (
            <p
              className={`mt-3 border-l-2 pl-3 text-sm ${
                comparison.delta < 0
                  ? "border-accent-600 text-accent-800"
                  : "border-emerald-600 text-emerald-700"
              }`}
            >
              {comparison.message}
            </p>
          )}
        </section>

        {/* 今週のゴール */}
        <section className="rounded-xl bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">今週のゴール</p>
            {plan.weeklyItems.length > 0 && (
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold tabular-nums text-gray-700">
                {weeklyDone}/{plan.weeklyItems.length} 完了
              </span>
            )}
          </div>
          <p className="mt-1 text-[15px] font-semibold text-gray-900">
            {plan.weeklyGoal.headline}
          </p>
          <p className="mt-1 text-sm text-gray-600">{plan.weeklyGoal.detail}</p>

          {plan.weeklyItems.length > 0 ? (
            <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100 md:grid md:grid-cols-2 md:gap-x-6">
              {plan.weeklyItems.map((item) => (
                <li key={`${item.kind}-${item.topicId}`}>
                  <Link
                    href={getLessonHref(item.topicId, { from: "plan", activity: item.kind === "review" ? "review" : "learn", anchor: "lesson-content" })}
                    className="flex items-center gap-3 px-1 py-2.5 transition hover:bg-gray-50 active:scale-[0.99]"
                  >
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        item.checked
                          ? "bg-emerald-600 text-white"
                          : "border border-gray-300"
                      }`}
                    >
                      {item.checked && (
                        <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />
                      )}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        item.checked
                          ? "text-gray-400 line-through"
                          : "text-gray-800"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.kind === "review" && (
                      <span className="shrink-0 rounded-full border border-accent-200 bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
                        復習
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] tabular-nums text-gray-400">
                      {item.minutes}分
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.weeklyGoal.targetTopicCount > 0 && (
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium tabular-nums text-gray-700">
                  テーマ {plan.weeklyGoal.targetTopicCount}件
                </span>
              )}
              {plan.weeklyGoal.reviewCount > 0 && (
                <span className="rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-medium tabular-nums text-accent-700">
                  復習 {plan.weeklyGoal.reviewCount}件
                </span>
              )}
            </div>
          )}
        </section>

        {/* 過去問開始予定・参考書進捗はPCでは横並びにする */}
        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          <section className="rounded-xl bg-white p-5 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500">過去問演習</p>
            <p className="mt-1 text-[15px] font-semibold text-gray-900">
              {plan.kakomonReady
                ? "今から過去問を始めてOK"
                : plan.kakomonStartDate
                  ? `開始目安：${formatDate(plan.kakomonStartDate)}ごろ`
                  : "主要テーマが進んだら始めましょう"}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              参考書を全部読み終えてからではなく、頻出テーマに一通り触れたら
              少しずつ過去問道場で解き始めます。
            </p>
          </section>

          {/* 参考書1周の進捗 */}
          <section className="rounded-xl bg-white p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">参考書の進捗</p>
              <Link
                href="/settings/reference-book"
                className="text-xs text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                {book && book.chapters.length > 0 ? "編集" : "登録する"}
              </Link>
            </div>
            {bookProgress ? (
              <>
                <p className="mt-1 text-[15px] font-semibold text-gray-900">
                  {book?.title || "参考書"}：<span className="tabular-nums">{bookProgress.done} / {bookProgress.total}</span> 章
                </p>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.round(bookProgress.ratio * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                参考書を登録すると、章ごとの進捗と「今日読む場所」を表示できます。
                未登録でも、各トピックの「探すキーワード」で学習できます。
              </p>
            )}
          </section>
        </div>

        {/* 計画の立て直し提案（遅れ・弱点・リスクを検知したときのみ表示） */}
        <PlanAdjustmentCard proposal={proposal} loading={proposalLoading} />

        {/* 設定変更への導線 */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            試験日・学習時間を変更
          </Link>
          <Link
            href="/settings/reference-book"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            参考書の設定
          </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
