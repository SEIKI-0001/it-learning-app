"use client";

import {
  overallStatusLabel,
  overallStatusTone,
  type IntegratedLearningStatus,
} from "@/types/integratedStatus";

// 統合進捗カード（/progress 上部）。
// 確認問題・単語帳・過去問レベル・日次達成度・参考書を統合した「合格に対する現在地」を初心者向けに表示する。
// 合格準備度%はページヘッダーの達成リングに一本化したため、このカードでは表示しない。
// 未ログイン・Supabase 未設定・失敗のときは何も表示しない（既存表示を壊さない）。
export default function IntegratedStatusCard({
  status,
  loading = false,
}: {
  status: IntegratedLearningStatus | null;
  loading?: boolean;
}) {
  if (loading) return <IntegratedStatusSkeleton />;

  if (!status) return null;

  const focus = status.recommendedFocus;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      {/* 総合ステータス */}
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-500">いまの現在地</p>
        <span
          className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-extrabold ring-1 ${overallStatusTone(
            status.overallStatus,
          )}`}
        >
          {overallStatusLabel(status.overallStatus)}
        </span>
      </div>

      {status.generatedMessage && (
        <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">
          {status.generatedMessage}
        </p>
      )}

      {/* 主要な到達指標（確認結果からみた到達度もここに集約） */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MiniStat label="本番対応OK" value={`${status.examReadyTopicCount}`} unit="トピック" />
        <MiniStat label="基礎理解OK" value={`${status.basicUnderstoodTopicCount}`} unit="トピック" />
        <MiniStat label="要復習" value={`${status.reviewNeededTopicCount}`} unit="トピック" />
        <MiniStat label="苦手" value={`${status.weakTopicCount}`} unit="トピック" />
        <MiniStat label="単語定着" value={`${status.flashcardMasteryRate}`} unit="%" />
        <MiniStat label="本番対応" value={`${status.examReadyRate}`} unit="%" />
      </div>

      {/* 主なリスク */}
      {status.mainRisks.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold text-gray-500">⚠️ 主なリスク</p>
          <ul className="space-y-1.5">
            {status.mainRisks.slice(0, 3).map((r) => (
              <li
                key={r.type}
                className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"
              >
                <span className="font-bold">
                  {r.label}
                  {typeof r.count === "number" ? `（${r.count}件）` : ""}
                </span>
                {r.detail && <span className="mt-0.5 block text-amber-700">{r.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 今週の推奨配分 */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-bold text-gray-500">📌 今週の推奨配分</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="bg-indigo-400" style={{ width: `${focus.textbook}%` }} />
          <div className="bg-emerald-400" style={{ width: `${focus.review}%` }} />
          <div className="bg-rose-400" style={{ width: `${focus.examPractice}%` }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-gray-600">
          <LegendDot tone="bg-indigo-400" label={`インプット ${focus.textbook}%`} />
          <LegendDot tone="bg-emerald-400" label={`復習・単語 ${focus.review}%`} />
          <LegendDot tone="bg-rose-400" label={`過去問レベル ${focus.examPractice}%`} />
        </div>
      </div>
    </section>
  );
}

function IntegratedStatusSkeleton() {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="min-w-0">
        <div className="h-3 w-20 rounded-full bg-gray-100" />
        <div className="mt-2 h-7 w-36 rounded-full bg-gray-100" />
      </div>
      <div className="mt-3 h-10 rounded-xl bg-indigo-50/70" />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl bg-gray-50 px-3 py-2">
            <div className="mx-auto h-5 w-12 rounded-full bg-gray-100" />
            <div className="mx-auto mt-2 h-3 w-16 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="mt-3 h-3 rounded-full bg-gray-100" />
      <div className="mt-2 flex gap-2">
        <div className="h-3 w-24 rounded-full bg-gray-100" />
        <div className="h-3 w-24 rounded-full bg-gray-100" />
        <div className="h-3 w-28 rounded-full bg-gray-100" />
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
      <p className="text-lg font-extrabold text-gray-800">
        {value}
        <span className="ml-0.5 text-xs font-bold text-gray-500">{unit}</span>
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-gray-500">{label}</p>
    </div>
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
