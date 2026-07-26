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
 * 令和8年度 ITパスポート試験 公開問題の、問番号 → 公式出題区分。
 *
 * 区分の境目は公式問題冊子の並び順そのもの（ストラテジ34問・マネジメント20問・
 * テクノロジ46問）。問題の内容からは判定しない。
 * 年度・試験区分ごとに境目は変わるため、この範囲は令和8年度 ITパスポート専用。
 */
export function getOfficialExamField(questionNumber: number): TopicField {
  // 各範囲は下限も見る。上限だけの判定にすると 0 や負数が management に落ちてしまう。
  // 整数以外（1.5 など）も問番号ではないので範囲判定に入れない。
  if (!Number.isInteger(questionNumber)) {
    throw new Error(`公式出題区分を判定できない問番号: ${questionNumber}`);
  }
  if (questionNumber >= 1 && questionNumber <= 34) return "strategy";
  if (questionNumber >= 35 && questionNumber <= 54) return "management";
  if (questionNumber >= 55 && questionNumber <= 100) return "technology";
  throw new Error(`公式出題区分を判定できない問番号: ${questionNumber}`);
}

/** getOfficialExamField の範囲が対象にしている試験。 */
export const OFFICIAL_EXAM_FIELD_SCOPE = {
  examType: "it_passport",
  year: 2026,
} as const;
