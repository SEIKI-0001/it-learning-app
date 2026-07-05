// リカバリ案・計画修正（第4弾）— 型・定数・表示ヘルパー
//
// 設計方針:
//   - 統合進捗（integrated_learning_status）から遅れ・弱点・リスクを検知し、
//     複数の「立て直し案（RecoveryPlanOption）」を提示する。生成はすべてルールベース。
//   - ユーザーを責めない。自己申告だけで理解度・本番対応力を上げない。
//   - 受験日延期（postpone_exam）は「失敗」ではなく合格可能性を上げる選択肢として扱う。
//   - このファイルは DB・React に依存しない（サーバー/クライアント両方から安全に import できる）。

// ---------------------------------------------------------------------------
// 提案のトリガー・重大度・状態
// ---------------------------------------------------------------------------

/** 提案が生まれたきっかけ。 */
export type AdjustmentTriggerType =
  | "delay" // 全体的な遅れ
  | "weak_topics" // 苦手トピックの残存
  | "low_exam_ready" // 本番対応率の低迷
  | "low_flashcard" // 用語定着の遅れ
  | "low_daily_progress" // 直近の日次達成度低迷
  | "near_exam"; // 試験直前で本番対応が不足

/** 提案の重大度。 */
export type AdjustmentSeverity = "slight" | "moderate" | "severe";

/** 提案の状態。 */
export type AdjustmentStatus = "proposed" | "accepted" | "rejected" | "expired";

/** 立て直し案のインパクト目安。 */
export type AdjustmentImpact = "small" | "medium" | "large";

// ---------------------------------------------------------------------------
// 立て直し案（RecoveryPlanOption）
// ---------------------------------------------------------------------------

/** 学習配分（合計100を目安）。 */
export type RecoveryFocus = {
  textbook: number; // 参考書・新規インプット
  review: number; // 確認問題・単語復習
  examPractice: number; // 過去問レベル問題
};

/** 立て直し案1件。 */
export type RecoveryPlanOption = {
  optionId: string;
  title: string;
  description: string;
  focus: RecoveryFocus;
  actions: string[]; // 具体的な行動（初心者向け）
  tradeoff: string; // この案の代償・注意点
  estimatedImpact: AdjustmentImpact;
  requiresExamDateChange?: boolean; // 試験日の変更が前提の案（postpone_exam）
};

/** 立て直し提案（1スナップショット）。 */
export type PlanAdjustmentProposal = {
  proposalId: string;
  statusDate: string; // "YYYY-MM-DD"
  sourceStatusId?: string | null; // 元にした integrated_learning_status.id
  triggerType: AdjustmentTriggerType;
  severity: AdjustmentSeverity;
  headline: string;
  reasonSummary?: string | null;
  options: RecoveryPlanOption[];
  selectedOptionId?: string | null;
  status: AdjustmentStatus;
  acceptedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// ---------------------------------------------------------------------------
// 案の optionId（再現性のため定数化）
// ---------------------------------------------------------------------------

export const OPTION_ID = {
  balanced: "balanced_recovery", // バランス回復案
  weakFocus: "weak_focus", // 弱点集中案
  examFocus: "exam_focus", // 本番対応優先案
  postponeExam: "postpone_exam", // 試験日を遅らせる案（常に提示）
  shortSprint: "short_sprint", // 短期集中案（重度・直前期のみ）
} as const;

export type RecoveryOptionId = (typeof OPTION_ID)[keyof typeof OPTION_ID];

// ---------------------------------------------------------------------------
// 表示ヘルパー（初心者向け・DB非依存）
// ---------------------------------------------------------------------------

/** 重大度の日本語ラベル。責めない表現にする。 */
export function severityLabel(severity: AdjustmentSeverity): string {
  switch (severity) {
    case "slight":
      return "少し調整しましょう";
    case "moderate":
      return "立て直しどきです";
    case "severe":
      return "早めに手を打ちましょう";
  }
}

/** 重大度の配色（Tailwind クラス）。 */
export function severityTone(severity: AdjustmentSeverity): string {
  switch (severity) {
    case "slight":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "moderate":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "severe":
      return "bg-orange-50 text-orange-700 ring-orange-100";
  }
}

/** インパクトの日本語ラベル。 */
export function impactLabel(impact: AdjustmentImpact): string {
  switch (impact) {
    case "small":
      return "効果：小";
    case "medium":
      return "効果：中";
    case "large":
      return "効果：大";
  }
}

/**
 * accept された案について /today に出す短い案内文（初心者向け・責めない表現）。
 * postpone_exam は設定画面への導線を促す文面にする。
 */
export function acceptedOptionNote(optionId: string): string {
  switch (optionId) {
    case OPTION_ID.weakFocus:
      return "いまは弱点復習を優先しています。苦手なトピックから片付けていきましょう。";
    case OPTION_ID.examFocus:
      return "いまは本番対応力の強化中です。過去問レベル問題で仕上げていきましょう。";
    case OPTION_ID.shortSprint:
      return "いまは短期集中モードです。頻出・弱点・過去問レベルにしぼって進めましょう。";
    case OPTION_ID.postponeExam:
      return "試験日を見直す調整中です。設定から新しい試験日を登録してください。";
    case OPTION_ID.balanced:
    default:
      return "いまはバランス回復プランで進めています。復習と過去問レベルを少しずつ増やしましょう。";
  }
}
