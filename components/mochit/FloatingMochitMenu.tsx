"use client";

import Link from "next/link";
import type { RefObject } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import {
  FLOATING_MOCHIT_HIT_SIZE,
  getFloatingOverlayPosition,
  type FloatingViewportMetrics,
} from "./floatingMochitLayout";
import type { FloatingMochitPoint } from "./floatingMochitPreferences";
import type { MochitPresentation } from "@/lib/mochitPresentation";

type Shortcut = {
  href: string;
  label: string;
  icon: IconName;
};

const PRIMARY_SHORTCUTS: readonly Shortcut[] = [
  { href: "/today", label: "今日の学習", icon: "book-open" },
  { href: "/review", label: "復習する", icon: "rotate" },
  { href: "/plan", label: "ロードマップ", icon: "map" },
  { href: "/progress", label: "進捗を見る", icon: "chart" },
];

type Props = {
  anchor: FloatingMochitPoint;
  viewport: FloatingViewportMetrics;
  firstItemRef: RefObject<HTMLAnchorElement | null>;
  presentation?: MochitPresentation | null;
  onClose: () => void;
  onHide: () => void;
};

export default function FloatingMochitMenu({
  anchor,
  viewport,
  firstItemRef,
  presentation,
  onClose,
  onHide,
}: Props) {
  const width = Math.min(288, viewport.width - viewport.margin * 2);
  const height = Math.min(
    260,
    viewport.height -
      viewport.bottomClearance -
      viewport.margin * 2,
  );
  const position = getFloatingOverlayPosition(
    {
      x: anchor.x,
      y: anchor.y,
      width: FLOATING_MOCHIT_HIT_SIZE,
      height: FLOATING_MOCHIT_HIT_SIZE,
    },
    { width, height },
    viewport,
  );

  return (
    <div
      role="menu"
      aria-label="モチットクイックメニュー"
      data-placement={position.placement}
      className="floating-mochit-overlay fixed z-40 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl"
      style={{
        left: position.left,
        top: position.top,
        maxHeight: height,
      }}
    >
      {presentation ? (
        <div className="mb-2 rounded-xl bg-brand-50 px-3 py-2.5">
          <p className="text-xs font-semibold leading-relaxed text-gray-800">
            {presentation.message}
          </p>
          {presentation.action ? (
            <Link
              href={presentation.action.href}
              role="menuitem"
              onClick={onClose}
              className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
            >
              {presentation.action.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-1.5">
        {PRIMARY_SHORTCUTS.map((item, index) => (
          <Link
            key={item.href}
            ref={index === 0 ? firstItemRef : undefined}
            href={item.href}
            role="menuitem"
            onClick={onClose}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-bold text-gray-800 hover:bg-brand-50 active:bg-brand-100"
          >
            <Icon
              name={item.icon}
              className="h-5 w-5 text-brand-600"
              aria-hidden
            />
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mt-2 border-t border-gray-200 pt-2">
        <Link
          href="/avatar"
          role="menuitem"
          onClick={onClose}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-200"
        >
          <Icon name="sprout" className="h-5 w-5 text-brand-600" aria-hidden />
          モチットの成長
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={onHide}
          className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 active:bg-gray-200"
        >
          <Icon name="x" className="h-5 w-5" aria-hidden />
          モチットを非表示
        </button>
      </div>
    </div>
  );
}
