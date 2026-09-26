// 試験年度の表示名（西暦 → 和暦）。年度の表記はここだけで決める。
//
// ページごとに「2026: 令和8年度」のような対応表を持つと、収録年度を足したときに
// 一部の画面だけ「2025年度」と出る（実際に /past-exams/[year] で起きていた）。
// 令和は2019年（令和元年）から。それより前の年度は収録していないので西暦のまま出す。

const REIWA_START = 2019;

/** 例: 2026 → "令和8年度"、2019 → "令和元年度"。 */
export function formatJapaneseExamYear(year: number): string {
  if (!Number.isInteger(year) || year < REIWA_START) return `${year}年度`;
  const n = year - REIWA_START + 1;
  return `令和${n === 1 ? "元" : n}年度`;
}
