// モチットのLvは累計XPから決まる。既存のXP付与経路はこの関数を使い続ける。
// 既存ランクのXP境界をLvの境界に含め、ランクをLvから一意に決められるようにする。
const LEVEL_MIN_EXP = [
  0, 50, 60, 120, 180, 200, 300, 400, 500, 620, 750,
  900, 1100, 1300, 1600, 1900, 2200,
] as const;
const EXP_PER_LEVEL_AFTER_MASTER = 300;

/** 累計XPからモチットのLvを求める。最高ランク後も成長する。 */
export function calculateLevel(exp: number): number {
  const safeExp = Math.max(0, Math.floor(Number.isFinite(exp) ? exp : 0));
  const lastIndex = LEVEL_MIN_EXP.length - 1;
  if (safeExp >= LEVEL_MIN_EXP[lastIndex]) {
    return LEVEL_MIN_EXP.length + Math.floor((safeExp - LEVEL_MIN_EXP[lastIndex]) / EXP_PER_LEVEL_AFTER_MASTER);
  }
  for (let i = lastIndex - 1; i >= 0; i--) {
    if (safeExp >= LEVEL_MIN_EXP[i]) return i + 1;
  }
  return 1;
}

/** レベルアップ通知用。称号とは別の名前を増やさない。 */
export function getLevelName(level: number): string {
  void level;
  return "モチット";
}

/** XP付与の単一窓口。保存するlevelをexpと同期する。 */
export function grantExp(exp: number, amount: number): { exp: number; level: number } {
  const nextExp = exp + amount;
  return { exp: nextExp, level: calculateLevel(nextExp) };
}

/** 現在Lvの下限と次Lvの下限。 */
export function getLevelRange(level: number): { min: number; next: number } {
  const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
  if (safeLevel >= LEVEL_MIN_EXP.length) {
    const min = LEVEL_MIN_EXP[LEVEL_MIN_EXP.length - 1]
      + (safeLevel - LEVEL_MIN_EXP.length) * EXP_PER_LEVEL_AFTER_MASTER;
    return { min, next: min + EXP_PER_LEVEL_AFTER_MASTER };
  }
  return { min: LEVEL_MIN_EXP[safeLevel - 1], next: LEVEL_MIN_EXP[safeLevel] };
}
