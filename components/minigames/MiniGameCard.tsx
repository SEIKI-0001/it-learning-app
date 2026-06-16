import Link from "next/link";
import type { MiniGame } from "@/types/minigame";
import { FIELD_LABELS } from "@/types/content";

// ミニゲーム一覧で使うカード。ゲーム名・学べるテーマ・難易度・所要時間・開始ボタン。
// 状態を持たないので Server Component（一覧ページから静的に並べられる）。

const DIFFICULTY_LABEL: Record<MiniGame["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

const ICON: Record<string, string> = {
  "sql-treasure": "🔍",
  "auth-authorization": "🔑",
  "network-route": "🔗",
};

export default function MiniGameCard({ game }: { game: MiniGame }) {
  return (
    <Link
      href={`/minigames/${game.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl"
          aria-hidden
        >
          {ICON[game.id] ?? "🎮"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-indigo-500">
            {FIELD_LABELS[game.field]}
          </p>
          <p className="mt-0.5 text-base font-extrabold text-gray-800">
            {game.title}
          </p>
          <p className="mt-1 text-sm leading-snug text-gray-500">
            {game.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {game.themes.map((t) => (
          <span
            key={t}
            className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2 text-xs text-gray-400">
          <span>⏱️ {game.estimatedMinutes}分</span>
          <span>難易度 {DIFFICULTY_LABEL[game.difficulty]}</span>
        </div>
        <span className="rounded-full bg-indigo-600 px-3.5 py-1.5 text-sm font-bold text-white">
          ▶ はじめる
        </span>
      </div>
    </Link>
  );
}
