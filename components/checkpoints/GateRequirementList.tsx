"use client";

import type { AppState } from "@/types";
import type { CheckpointGate } from "@/types/checkpoint";
import { measureCheckpoint } from "@/lib/checkpoints";
import { buildGateConditions } from "@/lib/checkpointDetail";
import Icon from "@/components/ui/Icon";

// 「次に進むための条件」を、達成/未達がひと目で分かるチェックリストで見せる部品。
// 行は lib/checkpointDetail の buildGateConditions（gate の判定をそのまま言い換えたもの）で、
// /progress の CP 詳細シートと同じ文言・同じ判定を使う。進行ロジックには触れない。
// ロードマップ画面・最終問題ロック画面の両方から使い、導線と表現を統一する。

export default function GateRequirementList({
  state,
  gate,
}: {
  state: AppState;
  gate: CheckpointGate;
}) {
  const rows = buildGateConditions(gate, measureCheckpoint(state, gate.checkpoint.id), {
    setupDone: !!state.profile,
  });

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const detail = r.count ? `いま ${r.count.current} / ${r.count.required}` : r.detail;
        return (
          <li key={r.id} className="flex items-start gap-2">
            <span
              aria-hidden
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                r.met
                  ? "bg-emerald-500 text-white"
                  : "border-2 border-gray-300 text-transparent"
              }`}
            >
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-semibold ${
                  r.met ? "text-gray-500 line-through" : "text-gray-800"
                }`}
              >
                {r.label}
              </span>
              {detail && !r.met && (
                <span className="block text-[11px] text-gray-500">{detail}</span>
              )}
            </span>
            {r.met && (
              <span className="shrink-0 text-[10px] font-bold text-emerald-600">
                達成
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
