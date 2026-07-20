"use client";

import { CHECKPOINTS } from "@/lib/checkpoints";
import type { CheckpointId } from "@/types/checkpoint";

// チェックポイントの旅（CP0〜CP6）を横一列のドットで俯瞰させる小さな部品。
// 「今どこにいるか」「どこまで突破したか」を一目で伝えるための表示専用。
// 進行ロジックには一切触れない（clearedCheckpointIds / currentCheckpointId を映すだけ）。

export default function CheckpointStepper({
  currentId,
  clearedIds,
}: {
  currentId: CheckpointId;
  clearedIds: CheckpointId[];
}) {
  const cleared = new Set(clearedIds);

  return (
    <ol className="flex items-center" aria-label="チェックポイントの進行">
      {CHECKPOINTS.map((cp, i) => {
        const isCleared = cleared.has(cp.id);
        const isCurrent = cp.id === currentId && !isCleared;
        const state = isCleared ? "cleared" : isCurrent ? "current" : "locked";

        return (
          <li key={cp.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ring-2 transition ${
                  state === "cleared"
                    ? "bg-emerald-500 text-white ring-emerald-200"
                    : state === "current"
                      ? "scale-110 bg-brand-600 text-white ring-brand-200"
                      : "bg-gray-100 text-gray-400 ring-gray-200"
                }`}
              >
                {isCleared ? "✓" : cp.order}
              </span>
              <span
                className={`mt-0.5 text-[9px] font-bold ${
                  isCurrent
                    ? "text-brand-600"
                    : isCleared
                      ? "text-emerald-600"
                      : "text-gray-400"
                }`}
              >
                CP{cp.order}
              </span>
            </div>
            {i < CHECKPOINTS.length - 1 && (
              <span
                aria-hidden
                className={`mx-0.5 mb-3.5 h-0.5 flex-1 rounded-full ${
                  isCleared ? "bg-emerald-400" : "bg-gray-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
