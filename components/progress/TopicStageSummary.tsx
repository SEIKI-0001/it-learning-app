"use client";

import { useEffect, useState } from "react";
import { fetchTopicProgressSummary, getUserId } from "@/lib/userSession";
import type { TopicProgressSummary } from "@/types/studyProgress";

// 確認問題結果から求めた到達度の簡易サマリ（基礎理解OK / 要復習 / 苦手）。
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
  if (basicUnderstood + reviewNeeded + weak === 0) return null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-1 text-base font-extrabold text-gray-800">
        確認問題からみた到達度
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        確認問題の結果をもとにした、いまの理解のようすです。
      </p>
      <div className="grid grid-cols-3 gap-3">
        <StageCard
          label="基礎理解OK"
          value={basicUnderstood}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StageCard
          label="要復習"
          value={reviewNeeded}
          tone="bg-amber-50 text-amber-700"
        />
        <StageCard label="苦手" value={weak} tone="bg-rose-50 text-rose-700" />
      </div>
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
