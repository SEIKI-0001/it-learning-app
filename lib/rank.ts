import type { IconName } from "@/components/ui/Icon";
import { calculateLevel, getLevelRange } from "@/lib/game";

// 既存のランク名と到達XPを維持する。境界Lvは lib/game.ts のLv表に対応する。
export type Rank = {
  id: string;
  name: string;
  minLevel: number;
  minExp: number;
  icon: IconName;
  emoji: string;
};

const RANK_MILESTONES: Omit<Rank, "minExp">[] = [
  { id: "step", name: "はじめの一歩", minLevel: 1, icon: "sprout", emoji: "🌱" },
  { id: "apprentice", name: "見習い", minLevel: 3, icon: "shield", emoji: "🔰" },
  { id: "novice", name: "初級冒険者", minLevel: 5, icon: "compass", emoji: "🧭" },
  { id: "explorer", name: "中級探索者", minLevel: 8, icon: "map", emoji: "🗺️" },
  { id: "challenger", name: "上級チャレンジャー", minLevel: 11, icon: "flame", emoji: "⚔️" },
  { id: "hunter", name: "合格圏ハンター", minLevel: 14, icon: "target", emoji: "🎯" },
  { id: "master", name: "ITパスポートマスター", minLevel: 17, icon: "award", emoji: "👑" },
];

export const RANKS: Rank[] = RANK_MILESTONES.map((rank) => ({
  ...rank,
  minExp: getLevelRange(rank.minLevel).min,
}));

export type RankStatus = {
  current: Rank;
  next: Rank | null;
  level: number;
  index: number;
  isMax: boolean;
  expIntoRank: number;
  expForNext: number;
  remaining: number;
  ratio: number;
};

/** ランクはXPから求めたLvのみで選ぶ。次の節目の進捗にはXPを使う。 */
export function getRankStatus(exp: number): RankStatus {
  const e = Math.max(0, Math.floor(Number.isFinite(exp) ? exp : 0));
  const level = calculateLevel(e);
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (level >= RANKS[i].minLevel) index = i;
  }
  const current = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  if (!next) {
    return { current, next: null, level, index, isMax: true,
      expIntoRank: e - current.minExp, expForNext: 0, remaining: 0, ratio: 1 };
  }
  const expForNext = next.minExp - current.minExp;
  const expIntoRank = e - current.minExp;
  return { current, next, level, index, isMax: false, expIntoRank, expForNext,
    remaining: Math.max(0, next.minExp - e),
    ratio: expForNext > 0 ? Math.min(1, Math.max(0, expIntoRank / expForNext)) : 1 };
}
