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
                  className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-brand-600"
                />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 whitespace-nowrap py-2.5 text-[10px] font-medium tracking-tight transition ${
                  active ? "text-brand-700" : "text-gray-500"
                }`}
              >
                <Icon
                  name={item.icon}
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2 : 1.6}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
