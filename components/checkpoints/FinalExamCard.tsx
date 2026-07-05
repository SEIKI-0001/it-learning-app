"use client";

import type { CheckpointDef, CheckpointGate } from "@/types/checkpoint";
import { FINAL_EXAM_STATE_SHORT } from "@/types/checkpoint";
import { finalExamState } from "@/lib/checkpoints";

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
  const unlockedActive = gate.finalExamUnlocked && !gate.finalExamPassed;
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      {/* ボス戦ヘッダ: 到達ポイントの突破試験として見せる */}
      <div
        className={`px-5 pb-4 pt-4 ${
          gate.finalExamPassed
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            : unlockedActive
              ? "animate-sheen bg-gradient-to-br from-rose-500 to-orange-500 text-white"
              : "bg-gray-100 text-gray-600"
        }`}
      >
        <div className="flex items-center justify-between">
          <p
            className={`text-[11px] font-bold ${
              gate.finalExamUnlocked ? "text-white/80" : "text-gray-500"
            }`}
          >
            CP{checkpoint.order} 突破試験
          </p>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              gate.finalExamPassed
                ? "bg-white/20 text-white"
                : unlockedActive
                  ? "bg-white/20 text-white"
                  : "bg-white text-gray-500 ring-1 ring-gray-300"
            }`}
          >
            {FINAL_EXAM_STATE_SHORT[finalExamState(gate)]}
          </span>
        </div>
        <h1 className="mt-2 text-xl font-extrabold">
          {gate.finalExamUnlocked ? "⚔️" : checkpoint.emoji}{" "}
          {checkpoint.title} ボス戦
        </h1>
        <p
          className={`mt-1 text-sm ${
            gate.finalExamUnlocked ? "text-white/90" : "text-gray-500"
          }`}
        >
          {unlockedActive
            ? "ここを突破すれば次のチェックポイントへ進めます。"
            : checkpoint.summary}
        </p>
      </div>

      <div className="p-5">
      <dl className="grid grid-cols-2 gap-2 text-sm">
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
      </div>
    </section>
  );
}
