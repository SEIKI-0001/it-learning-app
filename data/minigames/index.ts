import type { MiniGame } from "@/types/minigame";
import { sqlTreasureGame } from "./sqlTreasure";
import { authGateGame } from "./authGate";
import { networkRouteGame } from "./networkRoute";

// ============================================================================
// ミニゲームレジストリの集約点。
// ゲームは id で一意に管理し、トピックからは Topic.miniGameId（id 参照）で呼び出す。
// 取得ヘルパーは lib/minigames.ts 側に置く（このファイルはデータの集約のみ）。
// 後で Supabase 等へ移すときは、この配列を行レコードに移し替えるだけで済む構造。
// ============================================================================

/** すべてのミニゲーム（表示順） */
export const miniGames: MiniGame[] = [
  sqlTreasureGame,
  authGateGame,
  networkRouteGame,
];

export { sqlTreasureGame, authGateGame, networkRouteGame };

/** id → ミニゲーム の索引。重複 id があれば開発時に気づけるよう警告する。 */
export const miniGameRegistry: Record<string, MiniGame> = (() => {
  const map: Record<string, MiniGame> = {};
  for (const g of miniGames) {
    if (map[g.id] && process.env.NODE_ENV !== "production") {
      console.warn(`[miniGameRegistry] ミニゲーム id が重複しています: ${g.id}`);
    }
    map[g.id] = g;
  }
  return map;
})();
