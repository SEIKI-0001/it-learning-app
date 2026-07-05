"use client";

import type { CheckpointDef, CheckpointGate } from "@/types/checkpoint";

// 最終問題ページのヘッダ要約。タイトル・対象CP・解放条件・問題数・合格ライン・
// 出題範囲・解放状態を1枚で見せる（開始操作はページ側が担う）。

export default function FinalExamCard({
  checkpoint,
  gate,
  rangeLabel,
}: {
  checkpoint: CheckpointDef;
  gate: CheckpointGate;
  rangeLabel: string;
}) {
  const rule = checkpoint.finalExam;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-rose-500">
          CP{checkpoint.order} 最終問題
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
            gate.finalExamUnlocked
              ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
              : "bg-gray-100 text-gray-500 ring-gray-200"
          }`}
        >
          {gate.finalExamUnlocked ? "🔓 解放中" : "🔒 ロック中"}
        </span>
      </div>
      <h1 className="mt-1 text-xl font-extrabold text-gray-800">
        {checkpoint.emoji} {checkpoint.title}の最終問題
      </h1>
      <p className="mt-1 text-sm text-gray-600">{checkpoint.summary}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <dt className="text-[11px] font-bold text-gray-400">問題数</dt>
          <dd className="font-extrabold text-gray-800">
            {rule?.questionCount ?? 0} 問
          </dd>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <dt className="text-[11px] font-bold text-gray-400">合格ライン</dt>
          <dd className="font-extrabold text-gray-800">
            {rule ? `${rule.passThreshold} 問以上` : "-"}
          </dd>
        </div>
        <div className="col-span-2 rounded-xl bg-gray-50 px-3 py-2">
          <dt className="text-[11px] font-bold text-gray-400">解放条件</dt>
          <dd className="font-semibold text-gray-700">
            必須バッジ {gate.requiredBadgeCount} 個
            {checkpoint.requiredFieldCoverage.length > 0 && "＋3分野に着手"}
            {checkpoint.recentAccuracyMin !== undefined &&
              `＋直近正答率 ${Math.round(checkpoint.recentAccuracyMin * 100)}%`}
          </dd>
        </div>
        <div className="col-span-2 rounded-xl bg-gray-50 px-3 py-2">
          <dt className="text-[11px] font-bold text-gray-400">出題範囲</dt>
          <dd className="font-semibold text-gray-700">{rangeLabel}</dd>
        </div>
      </dl>

      <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">
        勝利条件：{checkpoint.winConditionLabel}
      </p>
    </section>
  );
}
