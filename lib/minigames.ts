import type { MiniGame } from "@/types/minigame";
import { miniGames, miniGameRegistry } from "@/data/minigames";

// ============================================================================
// ミニゲームの取得ヘルパー（純粋関数）。
// UI 側はデータを直接 import せず、必ずここ経由で参照する（lib/content.ts と同方針）。
// ============================================================================

/** すべてのミニゲームを返す */
export function getAllMiniGames(): MiniGame[] {
  return miniGames;
}

/** id でミニゲームを1件取得（無ければ undefined） */
export function getMiniGame(id: string): MiniGame | undefined {
  return miniGameRegistry[id];
}

/**
 * トピックに紐づくミニゲームを取得する。
 * Topic.miniGameId を id として参照する（存在しなければ undefined）。
 */
export function getMiniGameForTopic(miniGameId?: string): MiniGame | undefined {
  if (!miniGameId) return undefined;
  return miniGameRegistry[miniGameId];
}

/** ミニゲームの総数 */
export function getMiniGameCount(): number {
  return miniGames.length;
}
