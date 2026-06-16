"use client";

import type { MiniGameResult } from "@/types/minigame";

// ミニゲームの結果をローカル(localStorage)に保存する小さなストア。
// 初回実装ではDB保存は必須ではないため、ここに閉じ込めておく。
// 将来は MiniGameResult をそのまま /api/... 経由で Supabase に送れる形にしてある。
// 既存の AppState(fequest:appstate) には手を入れない（学習進捗と分離して保持）。

const RESULTS_KEY = "fequest:minigameResults";

type ResultMap = Record<string, MiniGameResult>;

function readAll(): ResultMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as ResultMap) : {};
  } catch {
    return {};
  }
}

/** ミニゲームの結果を保存する（同じ id は良いスコアの方を残す）。 */
export function saveMiniGameResult(result: MiniGameResult): void {
  if (typeof window === "undefined") return;
  try {
    const all = readAll();
    const prev = all[result.miniGameId];
    // 既にクリア済みなら、スコアが上がったときだけ更新する。
    if (!prev || result.score >= prev.score) {
      all[result.miniGameId] = result;
      window.localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
    }
  } catch {
    // 保存に失敗しても学習体験は止めない（フォールバック方針）。
  }
}

/** 指定ミニゲームの保存済み結果を取得（無ければ undefined）。 */
export function getMiniGameResult(id: string): MiniGameResult | undefined {
  return readAll()[id];
}

/** すべての保存済み結果を取得。 */
export function getAllMiniGameResults(): ResultMap {
  return readAll();
}
