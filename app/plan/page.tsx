"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReferenceBook } from "@/types/referenceBook";
import type { PlanAdjustmentProposal } from "@/types/planAdjustment";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics } from "@/lib/content";
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
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-3xl">
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold">合格ロードマップ</span>
            <Link
              href="/settings"
              aria-label="設定"
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
            >
              ⚙️ 設定
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-xs text-white/80">試験日まで</p>
            <p className="text-3xl font-extrabold">
              {plan.daysUntilExam === null
                ? "未設定"
                : `あと${plan.daysUntilExam}日`}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-3xl">
        {/* バッジゲート型ロードマップ: 現在CP・必要バッジ・不足・最終問題の解放状態（詳細） */}
        <CheckpointGateCard state={state} />

        {/* 全体ロードマップ（すごろく風マップ・CP進行で駆動＝現在地はゲートカードと一致） */}
        <section>
          <h2 className="mb-3 text-base font-extrabold text-gray-800">
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
              className={`mt-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                comparison.delta < 0
                  ? "bg-amber-50 text-amber-800"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {comparison.delta < 0 ? "📍" : "✨"} {comparison.message}
            </p>
          )}
        </section>

        {/* 今週のゴール */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-600">今週のゴール</p>
            {plan.weeklyItems.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {weeklyDone}/{plan.weeklyItems.length} 完了
              </span>
            )}
          </div>
          <p className="mt-1 text-lg font-extrabold text-gray-800">
            {plan.weeklyGoal.headline}
          </p>
          <p className="mt-1 text-sm text-gray-600">{plan.weeklyGoal.detail}</p>

          {plan.weeklyItems.length > 0 ? (
            <ul className="mt-4 space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
              {plan.weeklyItems.map((item) => (
                <li key={`${item.kind}-${item.topicId}`}>
                  <Link
                    href={`/topics/${item.topicId}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 transition active:scale-[0.99]"
                  >
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        item.checked
                          ? "bg-emerald-500 text-white"
                          : "border-2 border-gray-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                        item.checked
                          ? "text-gray-400 line-through"
                          : "text-gray-800"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.kind === "review" && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                        🔁 復習
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] text-gray-400">
                      ⏱️{item.minutes}分
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.weeklyGoal.targetTopicCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  🎯 テーマ {plan.weeklyGoal.targetTopicCount}件
                </span>
              )}
              {plan.weeklyGoal.reviewCount > 0 && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  🔁 復習 {plan.weeklyGoal.reviewCount}件
                </span>
              )}
            </div>
          )}
        </section>

        {/* 過去問開始予定・参考書進捗はPCでは横並びにする */}
        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs font-bold text-rose-500">過去問演習</p>
            <p className="mt-1 text-base font-extrabold text-gray-800">
              {plan.kakomonReady
                ? "今から過去問を始めてOK 🎯"
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
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-indigo-500">参考書の進捗</p>
              <Link
                href="/settings/reference-book"
                className="text-xs font-bold text-indigo-600 underline underline-offset-2"
              >
                {book && book.chapters.length > 0 ? "編集" : "登録する"}
              </Link>
            </div>
            {bookProgress ? (
              <>
                <p className="mt-1 text-base font-extrabold text-gray-800">
                  {book?.title || "参考書"}：{bookProgress.done} / {bookProgress.total} 章
                </p>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-indigo-500"
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
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-indigo-600 ring-1 ring-indigo-200"
          >
            ⚙️ 試験日・学習時間を変更
          </Link>
          <Link
            href="/settings/reference-book"
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-indigo-600 ring-1 ring-indigo-200"
          >
            📚 参考書の設定
          </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
