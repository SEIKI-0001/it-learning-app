"use client";

import Link from "next/link";
import type { BadgeDef, BadgeStatus } from "@/types/checkpoint";
import {
  BADGE_CATEGORY_LABELS,
  BADGE_RARITY_LABELS,
} from "@/types/checkpoint";
import { badgeIcon } from "@/lib/badgeIcons";
import Icon from "@/components/ui/Icon";

// バッジ一覧の表示部品。獲得済み／未獲得（ロック）を区別し、
// 未獲得でも獲得条件を必ず表示する。必須／任意も区別する。

// レアリティは希少なほど目を引く色にする(common=無彩色 → epic=accent)。
const RARITY_STYLE: Record<string, string> = {
  common: "bg-gray-100 text-gray-600 ring-gray-200",
  rare: "bg-brand-100 text-brand-700 ring-brand-200",
  epic: "bg-accent-100 text-accent-700 ring-accent-200",
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
      className={`rounded-xl border p-4 transition ${
        highlight
          ? "border-brand-300 bg-brand-50"
          : earned
            ? "border-emerald-200 bg-white"
            : ready
              ? "border-accent-200 bg-accent-50"
              : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border ${
            earned
              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
              : "border-gray-200 bg-white text-gray-400"
          }`}
        >
          <Icon
            name={earned ? badgeIcon(def.id) : "lock"}
            className="h-5 w-5"
            label={earned ? undefined : "未獲得"}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {highlight && (
              <span className="text-[10px] font-semibold text-brand-700">
                次に狙う
              </span>
            )}
            <p className="text-sm font-semibold text-gray-900">{def.label}</p>
            {def.requiredForGate ? (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                必須
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                任意
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${RARITY_STYLE[def.rarity]}`}
            >
              {BADGE_RARITY_LABELS[def.rarity]}
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600">
              {BADGE_CATEGORY_LABELS[def.category]}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {def.description}
          </p>
          {/* 獲得条件は常に表示（隠さない） */}
          <p className="mt-1.5 flex items-start gap-1 text-xs text-gray-500">
            <Icon name="target" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            条件：{def.conditionLabel}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            {earned ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Icon name="circle-check" className="h-3.5 w-3.5" />
                獲得済み{status.fromDrop ? "（ドロップ）" : ""}
              </span>
            ) : ready ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-accent-700">
                <Icon name="star" className="h-3.5 w-3.5" />
                条件達成。まもなく反映されます
              </span>
            ) : (
              <span className="text-xs text-gray-500">未獲得</span>
            )}
            {!earned && (
              <Link
                href={badgeActionHref(def)}
                className="shrink-0 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-700 active:scale-95"
              >
                挑戦する
              </Link>
            )}
          </div>
          {def.xp > 0 && (
            <p className="mt-1 text-[11px] tabular-nums text-gray-500">
              獲得報酬：+{def.xp} XP
            </p>
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
      <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
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
