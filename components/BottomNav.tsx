"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// アプリ下部の固定ナビ。LINEから開く学習画面として、迷わず行き来できるようにする。
type NavItem = {
  href: string;
  label: string;
  emoji: string;
  relatedPaths?: readonly string[];
};

const ITEMS: readonly NavItem[] = [
  { href: "/today", label: "今日", emoji: "📖" },
  { href: "/topics", label: "学ぶ", emoji: "🗂️" },
  { href: "/review", label: "復習", emoji: "🔁" },
  { href: "/progress", label: "進捗", emoji: "📈" },
  {
    href: "/more",
    label: "その他",
    emoji: "☰",
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
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-md md:max-w-2xl">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            item.relatedPaths?.some(
              (path) => pathname === path || pathname.startsWith(`${path}/`),
            );
          return (
            <li key={item.href} className="relative flex-1">
              {/* アクティブ表示は色だけに頼らず上端バーでも示す */}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-indigo-600"
                />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 whitespace-nowrap py-2.5 text-[11px] font-bold tracking-tight transition ${
                  active ? "text-indigo-600" : "text-gray-400"
                }`}
              >
                <span
                  className={`text-lg transition ${active ? "" : "opacity-70 grayscale-[35%]"}`}
                  aria-hidden
                >
                  {item.emoji}
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
