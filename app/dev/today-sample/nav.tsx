import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import s from "./today.module.css";

// サンプル用のナビ。デスクトップは左サイドバー、スマホは下部バーとして描く。
// 共通の BottomNav は他ページにも影響するため、ここでは触らない。
// 今日・進捗はサンプル同士を行き来できるようにし、それ以外は本番のページへ。

type NavKey = "today" | "learn" | "review" | "progress" | "more";

const ITEMS: readonly {
  key: NavKey;
  href: string;
  label: string;
  icon: IconName;
}[] = [
  { key: "today", href: "/dev/today-sample", label: "今日", icon: "book-open" },
  { key: "learn", href: "/learn", label: "学ぶ", icon: "library" },
  { key: "review", href: "/review", label: "復習", icon: "rotate" },
  {
    key: "progress",
    href: "/dev/progress-sample",
    label: "進捗",
    icon: "chart",
  },
  { key: "more", href: "/more", label: "その他", icon: "ellipsis" },
];

export default function AppNav({ active }: { active: NavKey }) {
  return (
    <nav className={s.nav} aria-label="メインナビゲーション">
      <Link href="/dev/today-sample" className={s.brand}>
        <span className={s.brandMark} aria-hidden>
          IP
        </span>
        <span className={s.brandName}>ITパスポート学習コーチ</span>
      </Link>
      <ul className={s.navList}>
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={s.navItem}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={s.navIcon}>
                  <Icon
                    name={item.icon}
                    className={s.navSvg}
                    strokeWidth={isActive ? 2.1 : 1.7}
                  />
                </span>
                <span className={s.navLabel}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
