import Link from "next/link";
import type { UserProgress } from "@/types";
import LevelBadge from "@/components/LevelBadge";
import ExpBar from "@/components/ExpBar";

// 画面上部の共通ヘッダー。レベル・EXP・連続日数を表示する。
export default function AppHeader({ progress }: { progress: UserProgress }) {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-4 pt-5 text-white shadow-md">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <Link href="/map" className="text-lg font-extrabold tracking-tight">
            基本情報クエスト
          </Link>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
            🔥 {progress.streakCount}日
          </span>
        </div>
        <div className="mb-2">
          <LevelBadge level={progress.level} />
        </div>
        <ExpBar exp={progress.exp} />
      </div>
    </header>
  );
}
