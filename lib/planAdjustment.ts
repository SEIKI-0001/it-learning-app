// リカバリ案・計画修正（第4弾）— 提案生成ロジック（純粋関数・ルールベース）
//
// 設計方針:
//   - AI連携は使わない。統合進捗（IntegratedLearningStatus）から遅れ・弱点・リスクを検知し、
//     複数の立て直し案をルールベースで組み立てる（再現性を優先）。
//   - ユーザーを責めない。自己申告だけで理解度・本番対応力は上げない。
//   - 受験日延期（postpone_exam）は常に選択肢として提示する（合格可能性を上げる選択肢）。
//   - このファイルは DB・React に依存しない（サーバーから安全に import できる）。

import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import {
  OPTION_ID,
  type AdjustmentSeverity,
  type AdjustmentTriggerType,
  type RecoveryFocus,
  type RecoveryPlanOption,
} from "@/types/planAdjustment";

// ---------------------------------------------------------------------------
// 判定しきい値（定数化して再現性を担保する）
// ---------------------------------------------------------------------------

export const ADJUSTMENT_THRESHOLDS = {
  /** readiness がこれ未満で提案対象。 */
  readinessLow: 60,
  /** readiness がこれ未満なら severe 寄り。 */
  readinessSevere: 45,
  /** weak トピックがこの数以上で提案対象。 */
  weakTopicCount: 3,
  /** weak トピックがこの数以上で severe 寄り。 */
  weakTopicSevere: 5,
  /** 本番対応率がこれ未満で提案対象。 */
  examReadyRateLow: 30,
  /** 用語定着率がこれ未満で提案対象。 */
  flashcardRateLow: 50,
  /** 試験までこの日数以内を「直前期」とみなす。 */
  nearExamDays: 7,
  /** 直前期に本番対応OKトピックがこの数未満なら不足とみなす。 */
  nearExamReadyMin: 5,
} as const;

// ---------------------------------------------------------------------------
// 入力・出力
// ---------------------------------------------------------------------------

export type PlanAdjustmentContext = {
  statusDate: string; // "YYYY-MM-DD"
  status: IntegratedLearningStatus;
  daysUntilExam: number | null;
};

/** 提案の中身（DB保存前の生成結果）。null なら提案不要。 */
export type GeneratedProposal = {
  triggerType: AdjustmentTriggerType;
  severity: AdjustmentSeverity;
  headline: string;
  reasonSummary: string;
  options: RecoveryPlanOption[];
};

// ---------------------------------------------------------------------------
// トリガー検知
// ---------------------------------------------------------------------------

type TriggerFlags = {
  delay: boolean;
  weakTopics: boolean;
  lowExamReady: boolean;
  lowFlashcard: boolean;
  lowDaily: boolean;
  nearExam: boolean;
};

function detectTriggers(ctx: PlanAdjustmentContext): TriggerFlags {
  const { status, daysUntilExam } = ctx;
  const t = ADJUSTMENT_THRESHOLDS;

  const delayedStatus =
    status.overallStatus === "delayed" ||
    status.overallStatus === "recovery_needed" ||
    status.overallStatus === "consultation_needed";

  const nearExam =
    daysUntilExam !== null &&
    daysUntilExam <= t.nearExamDays &&
    status.examReadyTopicCount < t.nearExamReadyMin;

  const lowDaily = status.mainRisks.some((r) => r.type === "daily_progress_low");

  return {
    delay: delayedStatus || status.readinessScore < t.readinessLow,
    weakTopics: status.weakTopicCount >= t.weakTopicCount,
    lowExamReady: status.examReadyRate < t.examReadyRateLow,
    lowFlashcard: status.flashcardMasteryRate < t.flashcardRateLow,
    lowDaily,
    nearExam,
  };
}

/** 最も優先度の高いトリガーを主トリガーとして選ぶ（表示の見出しに使う）。 */
function primaryTrigger(flags: TriggerFlags): AdjustmentTriggerType | null {
  if (flags.nearExam) return "near_exam";
  if (flags.lowExamReady) return "low_exam_ready";
  if (flags.weakTopics) return "weak_topics";
  if (flags.delay) return "delay";
  if (flags.lowFlashcard) return "low_flashcard";
  if (flags.lowDaily) return "low_daily_progress";
  return null;
}

/** 重大度を決める。on_track の除外は呼び出し側（generate）が別途行う。 */
function decideSeverity(ctx: PlanAdjustmentContext, flags: TriggerFlags): AdjustmentSeverity {
  const { status, daysUntilExam } = ctx;
  const t = ADJUSTMENT_THRESHOLDS;

  const nearExamSevere =
    daysUntilExam !== null &&
    daysUntilExam <= t.nearExamDays &&
    status.examReadyRate < t.examReadyRateLow;

  if (
    status.overallStatus === "consultation_needed" ||
    status.overallStatus === "recovery_needed" ||
    status.readinessScore < t.readinessSevere ||
    status.weakTopicCount >= t.weakTopicSevere ||
    nearExamSevere
  ) {
    return "severe";
  }

  const moderate =
    status.overallStatus === "delayed" ||
    status.readinessScore < t.readinessLow ||
    flags.weakTopics ||
    flags.lowExamReady;

  return moderate ? "moderate" : "slight";
}

// ---------------------------------------------------------------------------
// 見出し・理由（責めない表現）
// ---------------------------------------------------------------------------

function buildHeadline(trigger: AdjustmentTriggerType): string {
  switch (trigger) {
    case "near_exam":
      return "試験が近づいています。仕上げの優先順位を決めましょう";
    case "low_exam_ready":
      return "本番対応力をもう一段あげる時期です";
    case "weak_topics":
      return "苦手トピックを集中的に片付けましょう";
    case "delay":
      return "少しペースが乱れています。ここで立て直しましょう";
    case "low_flashcard":
      return "用語の定着をあと少し進めましょう";
    case "low_daily_progress":
      return "最近のペースを、無理なく整え直しましょう";
  }
}

function buildReasonSummary(
  ctx: PlanAdjustmentContext,
  flags: TriggerFlags,
): string {
  const { status, daysUntilExam } = ctx;
  const parts: string[] = [];

  if (flags.nearExam && daysUntilExam !== null) {
    parts.push(
      `試験まであと${daysUntilExam}日ですが、本番対応OKのトピックが${status.examReadyTopicCount}件です`,
    );
  }
  if (flags.weakTopics) {
    parts.push(`苦手・要復習のトピックが${status.weakTopicCount}件たまっています`);
  }
  if (flags.lowExamReady) {
    parts.push(`過去問レベルの正答が${status.examReadyRate}%で、本番対応力を伸ばす余地があります`);
  }
  if (flags.lowFlashcard) {
    parts.push(`用語の定着が${status.flashcardMasteryRate}%で、あと少しで安定します`);
  }
  if (flags.lowDaily) {
    parts.push("ここ最近は少しペースが落ちています");
  }
  if (parts.length === 0) {
    parts.push(`いまの合格準備度は${status.readinessScore}%です`);
  }

  return `${parts.join("。")}。今のうちに配分を見直すと、合格可能性を上げられます。`;
}

// ---------------------------------------------------------------------------
// 立て直し案の組み立て
// ---------------------------------------------------------------------------

/** 苦手が多いほど weak_focus / exam_focus の効果を大きく見積もる。 */
function weakImpact(count: number): "medium" | "large" {
  return count >= ADJUSTMENT_THRESHOLDS.weakTopicCount ? "large" : "medium";
}

function balancedOption(): RecoveryPlanOption {
  const focus: RecoveryFocus = { textbook: 15, review: 45, examPractice: 40 };
  return {
    optionId: OPTION_ID.balanced,
    title: "バランス回復案",
    description:
      "復習・単語・過去問レベルをバランスよく増やして、全体を底上げする案です。まず崩れたペースを整えたい人向けです。",
    focus,
    actions: [
      "確認問題と単語復習を毎日少しずつ進める",
      "過去問レベル問題を1日数問はさむ",
      "新規インプットは絞りつつ止めない",
    ],
    tradeoff: "特定の弱点を一気に潰すには少し時間がかかります。",
    estimatedImpact: "medium",
  };
}

function weakFocusOption(status: IntegratedLearningStatus): RecoveryPlanOption {
  const focus: RecoveryFocus = { textbook: 10, review: 65, examPractice: 25 };
  const weakNames = status.weakTopics.slice(0, 3).map((w) => w.title);
  const actions = [
    weakNames.length > 0
      ? `苦手トピック（${weakNames.join("・")}）の確認問題を優先する`
      : "苦手・要復習のトピックの確認問題を優先する",
    "間違えた問題はその日のうちにもう一度解く",
    "新規インプットは一時的に最小限にする",
  ];
  return {
    optionId: OPTION_ID.weakFocus,
    title: "弱点集中案",
    description:
      "苦手・要復習のトピックを最優先で潰す案です。ニガテを減らすと、点数が安定しやすくなります。",
    focus,
    actions,
    tradeoff: "新しい範囲の学習は一時的にゆっくりになります。",
    estimatedImpact: weakImpact(status.weakTopicCount),
  };
}

function examFocusOption(status: IntegratedLearningStatus): RecoveryPlanOption {
  const focus: RecoveryFocus = { textbook: 5, review: 30, examPractice: 65 };
  return {
    optionId: OPTION_ID.examFocus,
    title: "本番対応優先案",
    description:
      "確認パックと過去問レベル問題を優先し、本番形式に慣れる案です。基礎がある程度できている人に向いています。",
    focus,
    actions: [
      "確認パック（確認問題＋単語＋過去問レベル）を回す",
      "過去問レベル問題で本番の時間感覚に慣れる",
      "間違えた論点だけ参考書に戻って確認する",
    ],
    tradeoff: "基礎があいまいなトピックは、別途復習が必要になることがあります。",
    estimatedImpact:
      status.examReadyRate < ADJUSTMENT_THRESHOLDS.examReadyRateLow ? "large" : "medium",
  };
}

function postponeExamOption(): RecoveryPlanOption {
  const focus: RecoveryFocus = { textbook: 15, review: 50, examPractice: 35 };
  return {
    optionId: OPTION_ID.postponeExam,
    title: "試験日を遅らせる案",
    description:
      "今の予定日を無理に守るより、試験日を後ろにずらして、弱点復習と過去問レベル演習の時間を確保する案です。",
    focus,
    actions: [
      "設定から新しい試験日を登録する",
      "確保できた時間で弱点復習と過去問レベル演習を増やす",
      "焦らず、合格ラインに届く準備を整える",
    ],
    tradeoff:
      "受験のタイミングは後ろにずれますが、合格可能性を上げるための前向きな選択です。",
    estimatedImpact: "large",
    requiresExamDateChange: true,
  };
}

function shortSprintOption(): RecoveryPlanOption {
  const focus: RecoveryFocus = { textbook: 5, review: 45, examPractice: 50 };
  return {
    optionId: OPTION_ID.shortSprint,
    title: "短期集中案",
    description:
      "重要度の低いテーマは後回しにし、頻出・弱点・過去問レベルにしぼって短期間で仕上げる案です。時間が限られているときの割り切り策です。",
    focus,
    actions: [
      "低重要度のテーマは思い切って後回しにする",
      "頻出トピックと弱点だけを繰り返す",
      "過去問レベル問題で得点源を固める",
    ],
    tradeoff: "後回しにしたテーマは手薄になります。網羅性より得点効率を優先します。",
    estimatedImpact: "large",
  };
}

/**
 * 立て直し案の一覧を組み立てる。最低4案（バランス／弱点集中／本番対応／試験日延期）を必ず出し、
 * 重度遅れ・直前期の場合のみ短期集中案を5案目として追加する。
 */
function buildOptions(
  ctx: PlanAdjustmentContext,
  severity: AdjustmentSeverity,
): RecoveryPlanOption[] {
  const { status, daysUntilExam } = ctx;
  const options: RecoveryPlanOption[] = [
    balancedOption(),
    weakFocusOption(status),
    examFocusOption(status),
    postponeExamOption(),
  ];

  const nearExam =
    daysUntilExam !== null && daysUntilExam <= ADJUSTMENT_THRESHOLDS.nearExamDays;
  if (severity === "severe" || nearExam) {
    // 試験日延期の前（＝現実的な残り時間での案）に短期集中案を差し込む。
    options.splice(3, 0, shortSprintOption());
  }

  return options;
}

// ---------------------------------------------------------------------------
// エントリポイント
// ---------------------------------------------------------------------------

/**
 * 統合進捗から立て直し提案を組み立てる。
 * 提案不要（on_track・重大リスクなし）なら null を返す。
 * 「同日 proposed が既に存在」の重複回避は呼び出し側（API）で行う。
 */
export function buildPlanAdjustmentProposal(
  ctx: PlanAdjustmentContext,
): GeneratedProposal | null {
  // on_track は提案しない。
  if (ctx.status.overallStatus === "on_track") return null;

  const flags = detectTriggers(ctx);
  const trigger = primaryTrigger(flags);
  // どのトリガーも立っていなければ提案不要（重大リスクなし）。
  if (!trigger) return null;

  const severity = decideSeverity(ctx, flags);

  return {
    triggerType: trigger,
    severity,
    headline: buildHeadline(trigger),
    reasonSummary: buildReasonSummary(ctx, flags),
    options: buildOptions(ctx, severity),
  };
}
