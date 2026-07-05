// レベル / EXP の計算ヘルパー。
// ITパスポート学習コーチではトピック単位の学習(lib/study.ts)からこれらを使う。
// レベル名はモチベーション要素(達成感)として残している。

// レベルしきい値（下限EXP）とレベル名
const LEVELS: { level: number; minExp: number; name: string }[] = [
  { level: 1, minExp: 0, name: "IT見習い" },
  { level: 2, minExp: 50, name: "新人エンジニア" },
  { level: 3, minExp: 120, name: "ネットワーク探索者" },
  { level: 4, minExp: 200, name: "セキュリティ守護者" },
  { level: 5, minExp: 300, name: "アルゴリズム冒険者" },
];

/** 累計EXPから現在のレベル（1〜5）を求める */
export function calculateLevel(exp: number): number {
  let level = 1;
  for (const l of LEVELS) {
    if (exp >= l.minExp) level = l.level;
  }
  return level;
}

/** レベル番号からレベル名を返す */
export function getLevelName(level: number): string {
  return LEVELS.find((l) => l.level === level)?.name ?? "IT見習い";
}

/**
 * EXP を加算し、レベルを必ず再計算して返す（XP付与の単一窓口）。
 * トピック学習・バッジ確定付与・追加ドロップなど、EXP を足す処理はすべてこれを通す。
 * これにより exp と level が乖離しない（level 未更新のバグを防ぐ）。
 */
export function grantExp(
  exp: number,
  amount: number,
): { exp: number; level: number } {
  const nextExp = exp + amount;
  return { exp: nextExp, level: calculateLevel(nextExp) };
}

/** EXPバー表示用：現在レベルの下限・次レベルの下限を返す（Lv5は上限=下限+1で満タン表示） */
export function getLevelRange(level: number): { min: number; next: number } {
  const idx = LEVELS.findIndex((l) => l.level === level);
  const current = LEVELS[idx] ?? LEVELS[0];
  const upper = LEVELS[idx + 1];
  return { min: current.minExp, next: upper ? upper.minExp : current.minExp + 1 };
}
