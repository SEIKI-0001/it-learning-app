// 「これまで進んだ道」。冒険地図(/plan)のチェックポイント進行を、
// 学習手帳の罫線台帳として要約する。地図の全面表示はここでは行わず、
// 現在地・突破済み・次の地点・到達条件・最終目標までの距離だけを示す。

import Link from "next/link";
import type { AppState } from "@/types";
import {
  buildCheckpointGate,
  getCheckpointProgress,
  CHECKPOINTS,
} from "@/lib/checkpoints";
import Icon from "@/components/ui/Icon";
import StateMarker from "@/components/quest/StateMarker";

export default function JourneyLedger({ state }: { state: AppState }) {
  const checkpointProgress = getCheckpointProgress(state);
  const clearedIds = checkpointProgress.clearedCheckpointIds;
  const currentId = checkpointProgress.currentCheckpointId;
  const gate = buildCheckpointGate(state, currentId);
  const remainingCount = CHECKPOINTS.filter(
    (cp) => !clearedIds.includes(cp.id),
  ).length;

  return (
    <section aria-labelledby="journey-heading">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 id="journey-heading" className="text-sm font-semibold text-gray-900">
          これまで進んだ道
        </h2>
        <p className="text-xs tabular-nums text-gray-500">
          最終ゴールまで あと{remainingCount}CP
        </p>
      </div>
      <ol className="border-y border-gray-200">
        {CHECKPOINTS.map((cp, index) => {
          const cleared = clearedIds.includes(cp.id);
          const isCurrent = cp.id === currentId && !cleared;
          return (
            <li key={cp.id} className="relative flex gap-3">
              {/* 罫線レール: クエストルートと同じ視覚語彙で、より静かに */}
              <div className="relative flex w-5 shrink-0 flex-col items-center">
                {index > 0 && (
                  <span
                    aria-hidden
                    className={`absolute top-0 h-2.5 w-px ${
                      clearedIds.includes(CHECKPOINTS[index - 1].id)
                        ? "bg-brand-300"
                        : "bg-gray-200"
                    }`}
                  />
                )}
                {index < CHECKPOINTS.length - 1 && (
                  <span
                    aria-hidden
                    className={`absolute bottom-0 top-7 w-px ${
                      cleared ? "bg-brand-300" : "bg-gray-200"
                    }`}
                  />
                )}
                <StateMarker
                  icon={cleared ? "circle-check" : isCurrent ? "circle-dot" : "circle"}
                  tone={cleared ? "done" : isCurrent ? "active" : "muted"}
                  className="relative z-10 mt-2.5 h-4.5 w-4.5 bg-gray-50"
                />
              </div>
              <div className="min-w-0 flex-1 py-2">
                <p
                  className={`text-sm ${
                    isCurrent
                      ? "font-semibold text-gray-900"
                      : cleared
                        ? "text-gray-600"
                        : "text-gray-400"
                  }`}
                >
                  CP{cp.order} {cp.title}
                  {cleared && <span className="ml-2 text-xs text-emerald-700">突破済み</span>}
                  {isCurrent && <span className="ml-2 text-xs font-medium text-brand-700">現在地</span>}
                </p>
                {isCurrent && (
                  <p className="mt-0.5 text-xs tabular-nums text-gray-500">
                    到達条件：{cp.winConditionLabel}・必須バッジ {gate.earnedRequiredCount}/
                    {gate.totalRequiredCount}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <Link
        href="/plan"
        className="mt-2 inline-flex items-center gap-1 text-xs text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
      >
        <Icon name="map" className="h-3.5 w-3.5" />
        冒険地図で全体をみる
      </Link>
    </section>
  );
}
