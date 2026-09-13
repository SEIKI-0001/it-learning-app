import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import s from "./today.module.css";

// サンプル用のナビ。デスクトップは左サイドバー、スマホは下部バーとして描く。
// 共通の BottomNav は他ページにも影響するため、ここでは触らない。

const ITEMS: readonly { href: string; label: string; icon: IconName; active?: boolean }[] = [
  { href: "/today", label: "今日", icon: "book-open", active: true },
  { href: "/learn", label: "学ぶ", icon: "library" },
  { href: "/review", label: "復習", icon: "rotate" },
  { href: "/progress", label: "進捗", icon: "chart" },
  { href: "/more", label: "その他", icon: "ellipsis" },
];

export default function AppNav() {
  return (
    <nav className={s.nav} aria-label="メインナビゲーション">
      <Link href="/today" className={s.brand}>
        <span className={s.brandMark} aria-hidden>
          IP
        </span>
        <span className={s.brandName}>ITパスポート学習コーチ</span>
      </Link>
      <ul className={s.navList}>
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={s.navItem}
              aria-current={item.active ? "page" : undefined}
            >
              <span className={s.navIcon}>
                <Icon name={item.icon} className={s.navSvg} strokeWidth={item.active ? 2.1 : 1.7} />
              </span>
              <span className={s.navLabel}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
