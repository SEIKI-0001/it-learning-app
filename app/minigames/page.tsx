import Link from "next/link";
import { getAllMiniGames } from "@/lib/minigames";
import MiniGameCard from "@/components/minigames/MiniGameCard";
import BottomNav from "@/components/BottomNav";

// ミニゲーム一覧。図だけでは理解しづらいテーマを、操作して直感的につかむための入口。
// 状態を持たないので静的生成。LINEからこのURLを開いてそのまま遊べる。
export const metadata = {
  title: "ミニゲームで理解する | ITパスポート学習コーチ",
};

export default function MiniGamesPage() {
  const games = getAllMiniGames();

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/topics" className="text-sm font-medium text-white/80">
            ← トピック一覧
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold">ミニゲームで理解する</h1>
          <p className="mt-1 text-sm text-white/90">
            文章や図だけでは分かりづらいテーマを、実際に操作して「なるほど」と納得できる
            ミニゲームにしました。1ゲーム1〜3分です。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-3 px-4 py-7">
        {games.map((g) => (
          <MiniGameCard key={g.id} game={g} />
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
