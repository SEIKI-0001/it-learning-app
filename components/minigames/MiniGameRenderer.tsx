"use client";

import type { MiniGame } from "@/types/minigame";
import { FIELD_LABELS } from "@/types/content";
import SqlTreasureGame from "./SqlTreasureGame";
import AuthAuthorizationGame from "./AuthAuthorizationGame";
import NetworkRouteGame from "./NetworkRouteGame";

// ミニゲーム共通の枠。
// 上部に「タイトル・テーマ・所要時間・ルール説明」を出し、
// 種類(content.kind)ごとに本体コンポーネントへ振り分ける（図解の DiagramRenderer と同方針）。

const DIFFICULTY_LABEL: Record<MiniGame["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

export default function MiniGameRenderer({ game }: { game: MiniGame }) {
  return (
    <div className="space-y-5">
      {/* ルール説明（一瞬で分かる短い説明） */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold text-indigo-600">
            {FIELD_LABELS[game.field]}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-bold text-gray-600">
            ⏱️ 約{game.estimatedMinutes}分
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-bold text-gray-600">
            難易度 {DIFFICULTY_LABEL[game.difficulty]}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          {game.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {game.themes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ゲーム本体 */}
      {game.content.kind === "sql-treasure" && (
        <SqlTreasureGame meta={game} content={game.content} />
      )}
      {game.content.kind === "auth-authorization" && (
        <AuthAuthorizationGame meta={game} content={game.content} />
      )}
      {game.content.kind === "network-route" && (
        <NetworkRouteGame meta={game} content={game.content} />
      )}
    </div>
  );
}
