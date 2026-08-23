// リカバリ案・計画修正（第4弾）— 提案生成ロジック（純粋関数・ルールベース）
//
// 設計方針:
//   - AI連携は使わない。Exam Readiness と予定の健全性を別入力として扱い、
//     複数の立て直し案をルールベースで組み立てる（再現性を優先）。
//   - ユーザーを責めない。自己申告だけで理解度・本番対応力は上げない。
//   - 受験日延期（postpone_exam）は常に選択肢として提示する。
//   - このファイルは DB・React に依存しない（サーバーから安全に import できる）。

import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import type { ExamReadinessResult, ReadinessFieldScore } from "@/types/examReadiness";
import {
  primaryImprovementLabel,
  readinessResultLabel,
} from "@/lib/examReadiness/presentation";
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
  /** 用語定着率がこれ未満で提案対象。 */
  flashcardRateLow: 50,
  /** 試験までこの日数以内を「直前期」とみなす。 */
  nearExamDays: 7,
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

function relevantScoredFields(
  readiness: ExamReadinessResult | null,
): ReadinessFieldScore[] {
  if (!readiness) return [];

  const improvement = readiness.primaryImprovement;
  if (improvement?.code === "improve_field") {
    const savedField = readiness.fields.find(
      (field) => field.fieldId === improvement.fieldId,
    );
    return savedField ? [savedField] : [];
  }

  // A saved improvement owns the next action. Do not independently rank or
  // substitute another field even when its raw score looks lower.
  if (improvement) return [];
  return readiness.fields.filter(
    (field) => field.score !== null && field.score < 60,
  );
}

function detectTriggers(
  ctx: PlanAdjustmentContext,
  readiness: ExamReadinessResult | null,
): TriggerFlags {
  const { status, daysUntilExam } = ctx;
  const t = ADJUSTMENT_THRESHOLDS;

  const delayedStatus =
    status.overallStatus === "delayed" ||
    status.overallStatus === "recovery_needed" ||
    status.overallStatus === "consultation_needed";

  const nearExam =
    daysUntilExam !== null &&
    daysUntilExam <= t.nearExamDays &&
    readiness !== null &&
    readiness.band !== "ready" &&
    readiness.band !== "stable";

  const lowDaily = status.mainRisks.some((r) => r.type === "daily_progress_low");
  const improvement = readiness?.primaryImprovement?.code;
  const lowScore = readiness?.score !== null
    && readiness?.score !== undefined
    && readiness.score < t.readinessLow;
  const lowField = readiness?.fields.some(
    (field) => field.score !== null && field.score < 60,
  ) ?? false;

  return {
    delay: delayedStatus || lowScore || improvement === "collect_more_evidence",
    weakTopics:
      (readiness?.weakTopics.length ?? 0) >= t.weakTopicCount
      || improvement === "review_weak_topic"
      || improvement === "improve_retention",
    lowExamReady:
      lowField
      || improvement === "improve_field"
      || improvement === "take_summative_assessment",
    lowFlashcard: status.flashcardMasteryRate < t.flashcardRateLow,
    lowDaily,
    nearExam,
  };
}

/** 最も優先度の高いトリガーを主トリガーとして選ぶ（表示の見出しに使う）。 */
function improvementTrigger(
  readiness: ExamReadinessResult | null,
): AdjustmentTriggerType | null {
  switch (readiness?.primaryImprovement?.code) {
    case "collect_more_evidence":
      return "delay";
    case "improve_field":
    case "take_summative_assessment":
      return "low_exam_ready";
    case "review_weak_topic":
    case "improve_retention":
      return "weak_topics";
    case undefined:
      return null;
  }
}

function primaryTrigger(
  flags: TriggerFlags,
  readiness: ExamReadinessResult | null,
): AdjustmentTriggerType | null {
  if (flags.nearExam) return "near_exam";
  const savedImprovementTrigger = improvementTrigger(readiness);
  if (savedImprovementTrigger) return savedImprovementTrigger;
  if (flags.lowExamReady) return "low_exam_ready";
  if (flags.weakTopics) return "weak_topics";
  if (flags.delay) return "delay";
  if (flags.lowFlashcard) return "low_flashcard";
  if (flags.lowDaily) return "low_daily_progress";
  return null;
}

/** 重大度を決める。on_track の除外は呼び出し側（generate）が別途行う。 */
function decideSeverity(
  ctx: PlanAdjustmentContext,
  flags: TriggerFlags,
  readiness: ExamReadinessResult | null,
): AdjustmentSeverity {
  const { status, daysUntilExam } = ctx;
  const t = ADJUSTMENT_THRESHOLDS;

  const nearExamSevere =
    daysUntilExam !== null &&
    daysUntilExam <= t.nearExamDays &&
    readiness !== null &&
    readiness.band !== "ready" &&
    readiness.band !== "stable";

  if (
    status.overallStatus === "consultation_needed" ||
    status.overallStatus === "recovery_needed" ||
    (readiness?.score !== null
      && readiness?.score !== undefined
      && readiness.score < t.readinessSevere) ||
    (readiness?.weakTopics.length ?? 0) >= t.weakTopicSevere ||
    nearExamSevere
  ) {
    return "severe";
  }

  const moderate =
    status.overallStatus === "delayed" ||
    (readiness?.score !== null
      && readiness?.score !== undefined
      && readiness.score < t.readinessLow) ||
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
  readiness: ExamReadinessResult | null,
  trigger: AdjustmentTriggerType,
): string {
  const { status, daysUntilExam } = ctx;
  const parts: string[] = [];
  const relevantFields = relevantScoredFields(readiness);

  if (flags.nearExam && daysUntilExam !== null) {
    parts.push(`試験まであと${daysUntilExam}日です`);
  }
  if (trigger === "weak_topics" && flags.weakTopics && readiness) {
    const labels = readiness.weakTopics.slice(0, 3).map((topic) => `「${topic.label}」`);
    parts.push(labels.length > 0
      ? `見直したい Weak Topic は${labels.join("・")}です`
      : "定着を確かめる復習が必要です");
  }
  if (trigger === "low_exam_ready" && flags.lowExamReady) {
    const scoredFields = relevantFields
      .filter((field) => field.score !== null);
    const fieldSummary = scoredFields.length === 1
      ? `${scoredFields[0].label}は${scoredFields[0].score}/100`
      : scoredFields.map((field) => `${field.label} ${field.score}/100`).join("・");
    parts.push(fieldSummary
      ? `${fieldSummary}を重点的に伸ばせます`
      : "本番形式テストの判定材料を増やす段階です");
  }
  if (flags.lowFlashcard) {
    parts.push(`用語の定着は${status.flashcardMasteryRate}/100で、あと少しで安定します`);
  }
  if (flags.lowDaily) {
    parts.push("ここ最近は少しペースが落ちています");
  }
  if (parts.length === 0 && readiness) {
    parts.push(`いまの合格準備度は${readinessResultLabel(readiness)}です`);
  }
  const improvement = readiness
    ? primaryImprovementLabel(readiness.primaryImprovement, readiness)
    : null;
  if (improvement) parts.push(`次の一歩は${improvement}`);
  if (parts.length === 0) parts.push("最近の学習ペースを整える時期です");

  return `${parts.join("。")}。今のうちに配分を見直して、準備を進めましょう。`;
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

function weakFocusOption(readiness: ExamReadinessResult | null): RecoveryPlanOption {
  const focus: RecoveryFocus = { textbook: 10, review: 65, examPractice: 25 };
  const weakNames = readiness?.weakTopics.slice(0, 3).map((topic) => topic.label) ?? [];
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
    estimatedImpact: weakImpact(readiness?.weakTopics.length ?? 0),
  };
}

function examFocusOption(readiness: ExamReadinessResult | null): RecoveryPlanOption {
  const focus: RecoveryFocus = { textbook: 5, review: 30, examPractice: 65 };
  const relevantFields = relevantScoredFields(readiness);
  const fieldNames = relevantFields.map((field) => `「${field.label}」`).join("・");
  return {
    optionId: OPTION_ID.examFocus,
    title: "本番対応優先案",
    description:
      "確認パックと過去問レベル問題を優先し、本番形式に慣れる案です。基礎がある程度できている人に向いています。",
    focus,
    actions: [
      "確認パック（確認問題＋単語＋過去問レベル）を回す",
      fieldNames
        ? `${fieldNames}の問題を優先する`
        : "判定材料が少ない分野から問題に答える",
      "過去問レベル問題で本番の時間感覚に慣れる",
    ],
    tradeoff: "基礎があいまいなトピックは、別途復習が必要になることがあります。",
    estimatedImpact:
      relevantFields.some((field) => field.score !== null && field.score < 40)
        ? "large"
        : "medium",
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
      "受験のタイミングは後ろにずれますが、準備時間を確保するための前向きな選択です。",
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
  readiness: ExamReadinessResult | null,
): RecoveryPlanOption[] {
  const { daysUntilExam } = ctx;
  const options: RecoveryPlanOption[] = [
    balancedOption(),
    weakFocusOption(readiness),
    examFocusOption(readiness),
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
 * 予定の健全性と共有 Exam Readiness から立て直し提案を組み立てる。
 * どちらにも提案トリガーが無ければ null を返す。
 * 「同日 proposed が既に存在」の重複回避は呼び出し側（API）で行う。
 */
export function buildPlanAdjustmentProposal(
  ctx: PlanAdjustmentContext,
  readiness: ExamReadinessResult | null,
): GeneratedProposal | null {
  const flags = detectTriggers(ctx, readiness);
  const trigger = primaryTrigger(flags, readiness);
  // どのトリガーも立っていなければ提案不要（重大リスクなし）。
  if (!trigger) return null;

  const severity = decideSeverity(ctx, flags, readiness);

  return {
    triggerType: trigger,
    severity,
    headline: buildHeadline(trigger),
    reasonSummary: buildReasonSummary(ctx, flags, readiness, trigger),
    options: buildOptions(ctx, severity, readiness),
  };
}
