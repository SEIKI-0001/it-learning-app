// 本人の「成長段階」を表すランク制度。累計EXPをもとに算出する。
// 既存の Lv(lib/game.ts)とは別物で、長期的な積み上げの段階を示すモチベーション要素。
// 他人比較・ランキングではなく、あくまで自分の歩みを段階で見せるためのもの。

export type Rank = {
  id: string;
  name: string;
  minExp: number; // このランクに到達する下限EXP
  emoji: string;
};

// 最低ランク(0EXP)から最高ランクまで。名前はITパスポート学習コーチの雰囲気に合わせた。
export const RANKS: Rank[] = [
  { id: "step", name: "はじめの一歩", minExp: 0, emoji: "🌱" },
  { id: "apprentice", name: "見習い", minExp: 60, emoji: "🔰" },
  { id: "novice", name: "初級冒険者", minExp: 180, emoji: "🧭" },
  { id: "explorer", name: "中級探索者", minExp: 400, emoji: "🗺️" },
  { id: "challenger", name: "上級チャレンジャー", minExp: 750, emoji: "⚔️" },
  { id: "hunter", name: "合格圏ハンター", minExp: 1300, emoji: "🎯" },
  { id: "master", name: "ITパスポートマスター", minExp: 2200, emoji: "👑" },
];

export type RankStatus = {
  current: Rank;
  next: Rank | null;
  index: number; // 現在ランクの位置(0始まり)
  isMax: boolean;
  expIntoRank: number; // 現在ランク内で稼いだEXP
  expForNext: number; // 現在→次ランクの必要EXP幅(最高ランクは0)
  remaining: number; // 次ランクまであと何EXP(最高ランクは0)
  ratio: number; // 現在ランク内の進捗(0〜1、最高ランクは1)
};

/** 累計EXPから現在のランク状況を求める。最高ランク到達後も破綻しない。 */
export function getRankStatus(exp: number): RankStatus {
  const e = Math.max(0, Math.floor(Number.isFinite(exp) ? exp : 0));
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (e >= RANKS[i].minExp) index = i;
  }
  const current = RANKS[index];
  const next = RANKS[index + 1] ?? null;

  if (!next) {
    return {
      current,
      next: null,
      index,
      isMax: true,
      expIntoRank: e - current.minExp,
      expForNext: 0,
      remaining: 0,
      ratio: 1,
    };
  }

  const expForNext = next.minExp - current.minExp;
  const expIntoRank = e - current.minExp;
  const remaining = Math.max(0, next.minExp - e);
  const ratio = expForNext > 0 ? Math.min(1, Math.max(0, expIntoRank / expForNext)) : 1;

  return {
    current,
    next,
    index,
    isMax: false,
    expIntoRank,
    expForNext,
    remaining,
    ratio,
  };
}
