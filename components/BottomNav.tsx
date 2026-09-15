"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/ui/Icon";

// アプリ下部の固定ナビ。LINEから開く学習画面として、迷わず行き来できるようにする。
type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  relatedPaths?: readonly string[];
};

const ITEMS: readonly NavItem[] = [
  { href: "/today", label: "今日", icon: "book-open" },
  { href: "/learn", label: "学ぶ", icon: "library", relatedPaths: ["/topics"] },
  { href: "/review", label: "復習", icon: "rotate" },
  { href: "/progress", label: "進捗", icon: "chart" },
  {
    href: "/more",
    label: "その他",
    icon: "ellipsis",
    relatedPaths: [
      "/plan",
      "/badges",
      "/glossary",
      "/ai-grading",
      "/rank",
      "/avatar",
      "/mock-exam",
      "/settings",
      "/syllabus",
      "/report",
    ],
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    // スマホ: 下部バー / デスクトップ(lg〜): 左サイドバー。
    // 本文のずらし幅は globals.css の body:has(nav[data-app-nav]) で持つ。
    <nav
      aria-label="メインナビゲーション"
      data-app-nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur lg:inset-y-0 lg:right-auto lg:w-60 lg:border-t-0 lg:border-r lg:bg-white lg:px-3.5 lg:py-6 lg:backdrop-blur-none"
    >
      {/* サービス名（デスクトップのみ）。ナビの行き先は下の5つだけにするためリンクにしない */}
      <div className="mb-7 hidden items-center gap-2.5 px-2.5 text-gray-900 lg:flex">
        <span
          aria-hidden
          className="grid h-[30px] w-[30px] place-items-center rounded-md bg-gray-900 text-xs font-medium tracking-tight text-white"
        >
          IP
        </span>
        <span className="text-[13px] font-medium tracking-tight">ITパスポート学習コーチ</span>
      </div>
      <ul className="mx-auto flex w-full max-w-md md:max-w-2xl lg:mx-0 lg:max-w-none lg:flex-col lg:gap-0.5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            item.relatedPaths?.some(
              (path) => pathname === path || pathname.startsWith(`${path}/`),
            );
          return (
            <li key={item.href} className="flex-1 lg:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-[3px] rounded-lg py-1 text-[11px] whitespace-nowrap transition lg:flex-row lg:gap-3 lg:px-3 lg:py-2.5 lg:text-sm ${
                  active
                    ? "font-medium text-gray-900 lg:bg-brand-50"
                    : "text-gray-600 lg:hover:bg-gray-50"
                }`}
              >
                {/* アクティブは色だけに頼らず、アイコンの背面（スマホ）/行の面（デスクトップ）でも示す */}
                <span
                  className={`grid h-[30px] w-[52px] place-items-center rounded-lg lg:h-auto lg:w-auto ${
                    active ? "bg-brand-50 lg:bg-transparent" : ""
                  }`}
                >
                  <Icon
                    name={item.icon}
                    className="h-[21px] w-[21px] lg:h-5 lg:w-5"
                    strokeWidth={active ? 2.1 : 1.7}
                  />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
