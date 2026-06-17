import Link from "next/link";
import { BookOpenCheck, CalendarCheck2, Gamepad2, LineChart, RotateCcw } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav__inner">
          <Link className="brand-mark" href="/">
            <span className="brand-mark__icon">
              <BookOpenCheck size={19} aria-hidden />
            </span>
            <span>IT Passport Coach ver.2</span>
          </Link>
          <nav className="nav-links" aria-label="メインナビゲーション">
            <Link href="/onboarding">
              <CalendarCheck2 size={15} aria-hidden /> 初回設定
            </Link>
            <Link href="/today">
              <BookOpenCheck size={15} aria-hidden /> 今日
            </Link>
            <Link href="/review">
              <RotateCcw size={15} aria-hidden /> 復習
            </Link>
            <Link href="/progress">
              <LineChart size={15} aria-hidden /> 進捗
            </Link>
            <Link href="/minigame">
              <Gamepad2 size={15} aria-hidden /> ミニゲーム
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
