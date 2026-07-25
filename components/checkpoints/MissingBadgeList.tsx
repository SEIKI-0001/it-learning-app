"use client";

import Link from "next/link";
import type { BadgeDef } from "@/types/checkpoint";
import { badgeActionHref } from "@/components/badges/BadgeList";
import Icon from "@/components/ui/Icon";

// 不足している必須バッジの一覧。ロードマップのゲートカードと最終問題ロック画面の
// 両方で同じ見た目・同じ導線を使うための共通部品（マークアップの二重管理を解消）。
// 空なら何も描画しない。

export default function MissingBadgeList({
  badges,
  heading = "あと少しの必須バッジ",
}: {
  badges: BadgeDef[];
  heading?: string;
}) {
  if (badges.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-gray-500">{heading}</p>
      <ul className="mt-2 space-y-2">
        {badges.map((b) => (
          <li
            key={b.id}
            className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <span aria-hidden className="text-base opacity-60 grayscale">
              <Icon name="lock" className="h-4 w-4 text-gray-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-gray-800">
                {b.label}
              </span>
              <span className="block text-[11px] text-gray-500">
                {b.conditionLabel}
              </span>
            </span>
            <Link
              href={badgeActionHref(b)}
              className="shrink-0 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-700"
            >
              挑戦
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
