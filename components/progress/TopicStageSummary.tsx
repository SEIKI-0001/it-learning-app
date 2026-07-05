"use client";

import { useEffect, useState } from "react";
import { fetchTopicProgressSummary, getUserId } from "@/lib/userSession";
import type { TopicProgressSummary } from "@/types/studyProgress";

// 確認問題・確認パックの結果から求めた到達度サマリ。
// 本番対応OK（exam_ready）・基礎理解OK以上・要復習・苦手 と、主なリスクを表示する。
// 未ログイン・Supabase 未設定・データ0件のときは何も表示しない（既存表示を壊さない）。
export default function TopicStageSummary() {
  const [summary, setSummary] = useState<TopicProgressSummary | null>(null);

  useEffect(() => {
    let alive = true;
    const userId = getUserId();
    if (!userId) return;
    void fetchTopicProgressSummary(userId).then((s) => {
      if (alive) setSummary(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!summary) return null;
  const { basicUnderstood, reviewNeeded, weak } = summary;
  const examReady = summary.examReady ?? 0;
  if (basicUnderstood + reviewNeeded + weak === 0) return null;

  const risks = summary.risks;
  const riskChips: { label: string; count: number }[] = risks
    ? [
        { label: "単語未定着", count: risks.termsNotStable },
        { label: "過去問レベル未達", count: risks.examNotPassed },
        { label: "苦手滞留", count: risks.weakStuck },
      ].filter((r) => r.count > 0)
    : [];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-1 text-base font-extrabold text-gray-800">
        確認結果からみた到達度
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        確認問題・確認パックの結果をもとにした、いまの到達度です。
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StageCard
          label="本番対応OK"
          value={examReady}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StageCard
          label="基礎理解OK"
          value={basicUnderstood}
          tone="bg-sky-50 text-sky-700"
        />
        <StageCard
          label="要復習"
          value={reviewNeeded}
          tone="bg-amber-50 text-amber-700"
        />
        <StageCard label="苦手" value={weak} tone="bg-rose-50 text-rose-700" />
      </div>

      {riskChips.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold text-gray-500">⚠️ 主なリスク</p>
          <div className="flex flex-wrap gap-2">
            {riskChips.map((r) => (
              <span
                key={r.label}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                {r.label} {r.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StageCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-xl px-3 py-3 text-center ${tone}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-xs font-bold">{label}</p>
    </div>
  );
}
