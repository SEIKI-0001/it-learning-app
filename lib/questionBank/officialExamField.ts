import type { TopicField } from "@/types/content";

// ============================================================================
// 公式問題冊子上の「出題区分」（official.examField）。
// ----------------------------------------------------------------------------
// 混同しやすい3つの分類を明確に分けるための、公式区分だけを扱うモジュール。
//
//   official.examField … 公式問題冊子で問が置かれていた区分（出典側の事実）
//   syllabusNode.field … 問題の「内容」から見た IPA シラバス分類（アプリ側の解釈）
//   primaryTopicId     … アプリ内の復習導線（どのトピックへ戻すか）
//
// この3つは一致しないことがあり、一致させてもいけない。
// 例）令和8年度 問16 は公式区分 strategy だが、内容はテクノロジ寄り（syllabus: technology）。
//     令和8年度 問52 は公式区分 management だが、内容はストラテジ寄り（syllabus: strategy）。
// 公式区分で syllabusNode.field を上書きすると、内容ベースの弱点分析が壊れる。
//
// このモジュールは生成スクリプト（.mjs から型ストリップで直接読む）と
// 検証（lib/questionBank/validate.ts）の両方から使う。
// そのため実行時 import を持たず、型は import type だけにしておくこと。
// ============================================================================

/** 公式出題区分に使える値。TopicField と同じ3分野。 */
export const OFFICIAL_EXAM_FIELDS = ["strategy", "management", "technology"] as const;

export function isOfficialExamField(value: unknown): value is TopicField {
  return (OFFICIAL_EXAM_FIELDS as readonly unknown[]).includes(value);
}

/**
 * 年度ごとの区分の境目。**問題冊子の扉に書かれた案内文がそのまま根拠**。
 *
 *   「問1から問35までは，ストラテジ系の問題です。」
 *   「問36から問55までは，マネジメント系の問題です。」
 *   「問56から問100までは，テクノロジ系の問題です。」
 *
 * 境目は年度ごとに動く（令和8年度だけ 34/20/46、令和4年度は 35/19/46）。
 * 問題の内容からは判定しない。新しい年度を収録するときは、必ず冊子の案内文を見て
 * ここに1行足すこと。書かなければ検証が「未対応年度」として素通りさせる。
 */
const OFFICIAL_EXAM_FIELD_RANGES: Record<number, { strategyEnd: number; managementEnd: number }> = {
  // 令和4年度: ストラテジ35 / マネジメント19 / テクノロジ46
  2022: { strategyEnd: 35, managementEnd: 54 },
  // 令和5年度: ストラテジ35 / マネジメント20 / テクノロジ45
  2023: { strategyEnd: 35, managementEnd: 55 },
  // 令和6年度: ストラテジ35 / マネジメント20 / テクノロジ45
  2024: { strategyEnd: 35, managementEnd: 55 },
  // 令和7年度: ストラテジ35 / マネジメント20 / テクノロジ45
  2025: { strategyEnd: 35, managementEnd: 55 },
  // 令和8年度: ストラテジ34 / マネジメント20 / テクノロジ46
  2026: { strategyEnd: 34, managementEnd: 54 },
};

/** 公式出題区分の範囲が分かっている試験。 */
export const OFFICIAL_EXAM_FIELD_SCOPE = {
  examType: "it_passport",
  years: Object.keys(OFFICIAL_EXAM_FIELD_RANGES)
    .map(Number)
    .sort((a, b) => a - b),
} as const;

/** その年度の区分の境目が分かっているか。 */
export function hasOfficialExamFieldRanges(year: number): boolean {
  return Object.hasOwn(OFFICIAL_EXAM_FIELD_RANGES, year);
}

/**
 * ITパスポート試験 公開問題の、問番号 → 公式出題区分。
 *
 * 区分の境目は公式問題冊子の並び順そのもの。年度で境目が変わるので year は必須にする
 * （既定値を持たせると、別年度の問を黙って令和8年度の境目で分類してしまう）。
 */
export function getOfficialExamField(questionNumber: number, year: number): TopicField {
  const ranges = OFFICIAL_EXAM_FIELD_RANGES[year];
  if (!ranges) {
    throw new Error(`公式出題区分の範囲が未登録の年度: ${year}`);
  }
  // 各範囲は下限も見る。上限だけの判定にすると 0 や負数が management に落ちてしまう。
  // 整数以外（1.5 など）も問番号ではないので範囲判定に入れない。
  if (!Number.isInteger(questionNumber)) {
    throw new Error(`公式出題区分を判定できない問番号: ${questionNumber}`);
  }
  if (questionNumber >= 1 && questionNumber <= ranges.strategyEnd) return "strategy";
  if (questionNumber > ranges.strategyEnd && questionNumber <= ranges.managementEnd) {
    return "management";
  }
  if (questionNumber > ranges.managementEnd && questionNumber <= 100) return "technology";
  throw new Error(`公式出題区分を判定できない問番号: ${questionNumber}`);
}
