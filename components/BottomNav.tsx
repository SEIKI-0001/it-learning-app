"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// アプリ下部の固定ナビ。LINEから開く学習画面として、迷わず行き来できるようにする。
const ITEMS = [
  { href: "/today", label: "今日", emoji: "📖" },
  { href: "/plan", label: "計画", emoji: "🗺️" },
  { href: "/topics", label: "トピック", emoji: "🗂️" },
  { href: "/review", label: "復習", emoji: "🔁" },
  { href: "/badges", label: "バッジ", emoji: "🏅" },
  { href: "/progress", label: "進捗", emoji: "📈" },
  { href: "/glossary", label: "単語帳", emoji: "📇" },
  { href: "/ai-grading", label: "AI採点", emoji: "📝" },
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
            pathname === item.href || pathname.startsWith(`${item.href}/`);
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
