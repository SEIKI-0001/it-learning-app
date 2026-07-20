"use client";

import Link from "next/link";
import type { BadgeDef, BadgeStatus } from "@/types/checkpoint";
import {
  BADGE_CATEGORY_LABELS,
  BADGE_RARITY_LABELS,
} from "@/types/checkpoint";

// バッジ一覧の表示部品。獲得済み／未獲得（ロック）を区別し、
// 未獲得でも獲得条件を必ず表示する。必須／任意も区別する。

const RARITY_STYLE: Record<string, string> = {
  common: "bg-gray-100 text-gray-600 ring-gray-200",
  rare: "bg-sky-100 text-sky-700 ring-sky-200",
  epic: "bg-brand-100 text-brand-700 ring-brand-200",
};

/** バッジ種別ごとの「挑戦する」導線。 */
export function badgeActionHref(def: BadgeDef): string {
  switch (def.category) {
    case "revenge":
      return "/review";
    case "word":
      return "/glossary";
    case "kakomon":
      return "/check-pack";
    case "final":
      return `/checkpoint/${def.checkpointId}/final`;
    case "field":
    case "topic":
    case "collection":
    default:
      return "/today";
  }
}

function BadgeCard({
  status,
  recommended = false,
}: {
  status: BadgeStatus;
  recommended?: boolean;
}) {
  const { def, earned, conditionMet } = status;
  // 表示状態: 獲得済み / 条件達成（未反映） / ロック中。
  const ready = !earned && conditionMet;
  const highlight = recommended && !earned;

  return (
    <li
      className={`rounded-xl p-4 ring-1 transition ${
        highlight
          ? "bg-brand-50 ring-2 ring-brand-300"
          : earned
            ? "bg-white ring-emerald-200"
            : ready
              ? "bg-amber-50 ring-amber-200"
              : "bg-gray-50 ring-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl ring-2 ${
            earned
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-white ring-gray-200 opacity-60 grayscale"
          }`}
        >
          {earned ? def.emoji : "🔒"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {highlight && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                🎯 次に狙う
              </span>
            )}
            <p className="text-sm font-bold text-gray-800">{def.label}</p>
            {def.requiredForGate ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                必須
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                任意
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${RARITY_STYLE[def.rarity]}`}
            >
              {BADGE_RARITY_LABELS[def.rarity]}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
              {BADGE_CATEGORY_LABELS[def.category]}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {def.description}
          </p>
          {/* 獲得条件は常に表示（隠さない） */}
          <p className="mt-1.5 text-xs font-semibold text-gray-500">
            🎯 条件：{def.conditionLabel}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            {earned ? (
              <span className="text-xs font-bold text-emerald-600">
                ✅ 獲得済み{status.fromDrop ? "（ドロップ）" : ""}
              </span>
            ) : ready ? (
              <span className="text-xs font-bold text-amber-700">
                ✨ 条件達成！まもなく反映されます
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-400">未獲得</span>
            )}
            {!earned && (
              <Link
                href={badgeActionHref(def)}
                className="shrink-0 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white transition active:scale-95"
              >
                挑戦する →
              </Link>
            )}
          </div>
          {def.xp > 0 && (
            <p className="mt-1 text-[11px] text-gray-400">獲得報酬：+{def.xp} XP</p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function BadgeList({
  statuses,
  recommendedId,
}: {
  statuses: BadgeStatus[];
  recommendedId?: string;
}) {
  if (statuses.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
        表示できるバッジがありません。
      </p>
    );
  }
  return (
    <ul className="space-y-3 md:grid md:grid-cols-2 md:items-start md:gap-3 md:space-y-0">
      {statuses.map((s) => (
        <BadgeCard
          key={s.def.id}
          status={s}
          recommended={s.def.id === recommendedId}
        />
      ))}
    </ul>
  );
}
