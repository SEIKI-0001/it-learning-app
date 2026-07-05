"use client";

import type { CheckpointGate } from "@/types/checkpoint";

// 「次に進むための条件」を、達成/未達がひと目で分かるチェックリストで見せる部品。
// gate（既存の判定結果）をそのまま映すだけで、進行ロジックには触れない。
// ロードマップ画面・最終問題ロック画面の両方から使い、導線と表現を統一する。

type Row = {
  label: string;
  met: boolean;
  detail?: string;
};

export default function GateRequirementList({ gate }: { gate: CheckpointGate }) {
  const { checkpoint } = gate;
  const badgeMet =
    gate.missingBadges.length === 0 &&
    gate.earnedRequiredCount >= gate.requiredBadgeCount;

  const rows: Row[] = [
    {
      label: `必須バッジを ${gate.requiredBadgeCount} 個そろえる`,
      met: badgeMet,
      detail: `いま ${gate.earnedRequiredCount} / ${gate.requiredBadgeCount} 個`,
    },
  ];
  if (checkpoint.requiredFieldCoverage.length > 0) {
    rows.push({
      label: "3分野すべてに手をつける",
      met: gate.fieldCoverageMet,
    });
  }
  if (checkpoint.recentAccuracyMin !== undefined) {
    rows.push({
      label: `直近の正答率 ${Math.round(checkpoint.recentAccuracyMin * 100)}% 以上`,
      met: gate.accuracyMet,
    });
  }
  rows.push({
    label: "最終問題を突破する",
    met: gate.finalExamPassed,
    detail: checkpoint.winConditionLabel,
  });

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-start gap-2">
          <span
            aria-hidden
            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
              r.met
                ? "bg-emerald-500 text-white"
                : "border-2 border-gray-300 text-transparent"
            }`}
          >
            ✓
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block text-sm font-semibold ${
                r.met ? "text-gray-400 line-through" : "text-gray-800"
              }`}
            >
              {r.label}
            </span>
            {r.detail && !r.met && (
              <span className="block text-[11px] text-gray-500">{r.detail}</span>
            )}
          </span>
          {r.met && (
            <span className="shrink-0 text-[10px] font-bold text-emerald-600">
              達成
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
