"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// アプリ下部の固定ナビ。LINEから開く学習画面として、迷わず行き来できるようにする。
const ITEMS = [
  { href: "/today", label: "今日", emoji: "📖" },
  { href: "/topics", label: "トピック", emoji: "🗂️" },
  { href: "/review", label: "復習", emoji: "🔁" },
  { href: "/progress", label: "進捗", emoji: "📈" },
  { href: "/glossary", label: "単語帳", emoji: "📇" },
  { href: "/ai-grading", label: "AI採点", emoji: "📝" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex w-full max-w-md">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition ${
                  active ? "text-indigo-600" : "text-gray-400"
                }`}
              >
                <span className="text-lg" aria-hidden>
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
