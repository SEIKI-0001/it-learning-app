import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllMiniGames, getMiniGame } from "@/lib/minigames";
import { getTopic } from "@/lib/content";
import MiniGameRenderer from "@/components/minigames/MiniGameRenderer";
import BottomNav from "@/components/BottomNav";

// 個別ミニゲームのページ。ヘッダー(タイトル)＋本体(MiniGameRenderer)。
// ゲームは固定の3種なのでビルド時に静的生成する（topics/[id] と同方針）。
export function generateStaticParams() {
  return getAllMiniGames().map((g) => ({ id: g.id }));
}

export default async function MiniGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = getMiniGame(id);
  if (!game) notFound();

  const relatedTopic = game.relatedTopicId
    ? getTopic(game.relatedTopicId)
    : undefined;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/minigames" className="text-sm font-medium text-white/80">
            ← ミニゲーム一覧
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold">{game.title}</h1>
          {relatedTopic && (
            <Link
              href={`/topics/${relatedTopic.id}`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white"
            >
              📖 学習トピック：{relatedTopic.title}
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-6">
        <MiniGameRenderer game={game} />
      </div>

      <BottomNav />
    </main>
  );
}
