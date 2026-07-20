"use client";

import {
  overallStatusLabel,
  overallStatusTone,
  type IntegratedLearningStatus,
  type RecommendedFocus,
} from "@/types/integratedStatus";

// 統合進捗カード（/progress 上部）。
// 「合格に対する現在地」を一目で掴めるよう、ステータス＋ひとこと＋到達度バー1本＋リスク1件＋今週の方針1行に絞る。
// 合格準備度%はページヘッダーの達成リングに一本化したため、このカードでは表示しない。
// 未ログイン・Supabase 未設定・失敗のときは何も表示しない（既存表示を壊さない）。
export default function IntegratedStatusCard({
  status,
  totalTopicCount,
  loading = false,
}: {
  status: IntegratedLearningStatus | null;
  totalTopicCount: number;
  loading?: boolean;
}) {
  if (loading) return <IntegratedStatusSkeleton />;

  if (!status) return null;

  // 全トピックを重複なく4区分に分ける（basicUnderstood は exam_ready を含むため差し引く）。
  const examReady = status.examReadyTopicCount;
  const basicOnly = Math.max(0, status.basicUnderstoodTopicCount - examReady);
  const needsWork = status.reviewNeededTopicCount + status.weakTopicCount;
  const notStarted = Math.max(
    0,
    totalTopicCount - examReady - basicOnly - needsWork,
  );
  const widthPct = (n: number) =>
    totalTopicCount > 0 ? (n / totalTopicCount) * 100 : 0;

  const topRisk = status.mainRisks[0] ?? null;

  return (
    <section className="rounded-xl bg-white p-4 border border-gray-200">
      {/* 総合ステータス */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-gray-500">いまの現在地</p>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-bold ring-1 ${overallStatusTone(
            status.overallStatus,
          )}`}
        >
          {overallStatusLabel(status.overallStatus)}
        </span>
      </div>

      {status.generatedMessage && (
        <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
          {status.generatedMessage}
        </p>
      )}

      {/* トピック到達度（全トピックの内訳を1本のバーで見る） */}
      <div className="mt-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="bg-emerald-400" style={{ width: `${widthPct(examReady)}%` }} />
          <div className="bg-sky-400" style={{ width: `${widthPct(basicOnly)}%` }} />
          <div className="bg-amber-400" style={{ width: `${widthPct(needsWork)}%` }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-gray-600">
          <LegendDot tone="bg-emerald-400" label={`本番対応OK ${examReady}`} />
          <LegendDot tone="bg-sky-400" label={`基礎理解OK ${basicOnly}`} />
          <LegendDot tone="bg-amber-400" label={`要復習 ${needsWork}`} />
          <LegendDot tone="bg-gray-300" label={`これから ${notStarted}`} />
        </div>
      </div>

      {/* いちばん大きなリスクだけ表示する */}
      {topRisk && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-bold">
            ⚠️ {topRisk.label}
            {typeof topRisk.count === "number" ? `（${topRisk.count}件）` : ""}
          </span>
          {topRisk.detail && (
            <span className="mt-0.5 block text-amber-700">{topRisk.detail}</span>
          )}
        </p>
      )}

      {/* 今週の方針は一言に絞る */}
      <p className="mt-3 text-xs font-bold text-gray-600">
        📌 今週は{weeklyFocusPhrase(status.recommendedFocus)}
      </p>
    </section>
  );
}

// 推奨配分の最大要素を「今週は◯◯中心」の一言に変換する（%の内訳は出さない）。
function weeklyFocusPhrase(focus: RecommendedFocus): string {
  const { textbook, review, examPractice } = focus;
  if (examPractice >= textbook && examPractice >= review) {
    return "過去問レベル問題で本番対応力を伸ばすのがおすすめです";
  }
  if (review >= textbook) {
    return "復習と単語の定着を優先するのがおすすめです";
  }
  return "新しい範囲のインプットを進めるのがおすすめです";
}

function IntegratedStatusSkeleton() {
  return (
    <section className="rounded-xl bg-white p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded-full bg-gray-100" />
        <div className="h-7 w-28 rounded-full bg-gray-100" />
      </div>
      <div className="mt-3 h-10 rounded-xl bg-brand-50/70" />
      <div className="mt-3 h-3 rounded-full bg-gray-100" />
      <div className="mt-2 flex gap-2">
        <div className="h-3 w-20 rounded-full bg-gray-100" />
        <div className="h-3 w-20 rounded-full bg-gray-100" />
        <div className="h-3 w-16 rounded-full bg-gray-100" />
      </div>
      <div className="mt-3 h-3 w-48 rounded-full bg-gray-100" />
    </section>
  );
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}
