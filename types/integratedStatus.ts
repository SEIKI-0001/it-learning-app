// 統合進捗判定（第3弾）— 型・定数・表示ヘルパー
//
// 設計方針:
//   - 確認問題(基礎理解) / 単語帳(用語定着) / 過去問レベル(本番対応力) / 日次達成度 を統合し、
//     「合格に対する現在地」「主なリスク」「次に優先すべきこと」を返す。
//   - 自己申告（日次達成度）は外部学習の推定にだけ使い、理解度・本番対応力の判定には使わない。
//   - まずはルールベースで再現性のある判定を作る（AI提案・計画修正の自動反映は次フェーズ）。
//   - このファイルは DB・React に依存しない（サーバー/クライアント両方から安全に import できる）。

import type { TopicStage } from "@/types/studyProgress";

// ---------------------------------------------------------------------------
// 総合ステータス
// ---------------------------------------------------------------------------

/** 合格に対する現在地（5段階）。 */
export type OverallStatus =
  | "on_track" // 順調
  | "slightly_delayed" // 少し遅れ
  | "delayed" // 遅れ
  | "recovery_needed" // 立て直しが必要
  | "consultation_needed"; // 相談が必要（直前期に到達度が極端に不足）

/** 主なリスクの種別。 */
export type RiskType =
  | "terms_review_backlog" // 単語復習の滞留
  | "exam_level_low" // 過去問レベル問題の正答率低迷
  | "weak_topics_remaining" // 苦手トピックの残存
  | "exam_ready_shortage" // 本番対応OKトピックの不足
  | "field_imbalance" // 分野の偏り
  | "daily_progress_low"; // 日次達成度の低迷

/** 主なリスク1件。label/detail は初心者向けの表現にする。 */
export type MainRisk = {
  type: RiskType;
  label: string;
  detail?: string;
  count?: number;
};

/** 要注意トピック（苦手・要復習）。 */
export type WeakTopic = {
  topicId: string;
  title: string;
  stage: TopicStage;
};

/** 今週の推奨学習配分（合計100）。 */
export type RecommendedFocus = {
  textbook: number; // 参考書・新規インプット
  review: number; // 確認問題・単語復習
  examPractice: number; // 過去問レベル問題
};

/** 統合進捗判定の結果（1日1スナップショット）。 */
export type IntegratedLearningStatus = {
  statusDate: string; // "YYYY-MM-DD"
  overallStatus: OverallStatus;
  readinessScore: number; // 0〜100 合格準備度
  inputProgressRate: number; // 0〜100 インプット進捗（自己申告推定）
  basicUnderstandingRate: number; // 0〜100 基礎理解率
  flashcardMasteryRate: number; // 0〜100 用語定着率
  examReadyRate: number; // 0〜100 本番対応率
  fieldBalanceScore: number; // 0〜100 分野バランス
  weakTopicCount: number;
  examReadyTopicCount: number;
  basicUnderstoodTopicCount: number;
  reviewNeededTopicCount: number;
  weakTopics: WeakTopic[];
  mainRisks: MainRisk[];
  recommendedFocus: RecommendedFocus;
  generatedMessage: string;
};

// ---------------------------------------------------------------------------
// readiness_score の重み（合計100）
// ---------------------------------------------------------------------------

export type ReadinessWeights = {
  input: number;
  basic: number;
  terms: number;
  exam: number;
  balance: number;
};

/** 通常期の重み。 */
export const READINESS_WEIGHTS_NORMAL: ReadinessWeights = {
  input: 10,
  basic: 30,
  terms: 25,
  exam: 25,
  balance: 10,
};

/** 直前期（試験14日以内、または exam_ready が1件以上）の重み。本番対応を厚くする。 */
export const READINESS_WEIGHTS_DIRECT: ReadinessWeights = {
  input: 5,
  basic: 20,
  terms: 25,
  exam: 40,
  balance: 10,
};

/** 直前期とみなす試験までの残り日数。 */
export const DIRECT_PERIOD_DAYS = 14;

// ---------------------------------------------------------------------------
// 判定しきい値（定数化して再現性を担保する）
// ---------------------------------------------------------------------------

export const STATUS_THRESHOLDS = {
  /** on_track の下限（readiness）。 */
  onTrack: 75,
  /** slightly_delayed の下限（readiness）。 */
  slightlyDelayed: 60,
  /** delayed の下限（readiness）。これ未満は recovery_needed 候補。 */
  delayed: 45,
  /** consultation_needed：試験まで残りこの日数以内。 */
  consultationExamDays: 7,
  /** consultation_needed：本番対応率がこれ未満なら「極端に少ない」。 */
  consultationExamReadyRate: 30,
  /** 過去問レベル正答率がこれ未満で「低迷」。 */
  examLevelLowAccuracy: 50,
  /** 過去問レベル低迷の判定に必要な最低回答数。 */
  examLevelMinAttempts: 4,
  /** weak トピックがこの数以上で delayed に落とす。 */
  weakDelayedCount: 3,
  /** review_needed がこの数以上で slightly_delayed に落とす（軽微な復習滞留）。 */
  reviewMinorCount: 3,
} as const;

export const RISK_THRESHOLDS = {
  /** 復習期限切れ単語がこの数以上でリスク化。 */
  termsBacklogCount: 5,
  /** 分野バランススコアがこれ未満で「偏り」リスク。 */
  fieldImbalance: 50,
  /** 直近の日次達成度平均がこれ未満で「低迷」リスク。 */
  dailyLowRate: 40,
  /** 本番対応率がこれ未満で「不足」リスク（基礎はできている前提）。 */
  examReadyShortageRate: 40,
  /** exam_ready 不足リスクを出す基礎理解率の下限（基礎ができているのに本番対応が伸びていない状態）。 */
  examReadyShortageMinBasic: 40,
} as const;

// ---------------------------------------------------------------------------
// 表示ヘルパー（初心者向け・DB非依存）
// ---------------------------------------------------------------------------

/** 総合ステータスの日本語ラベル。 */
export function overallStatusLabel(status: OverallStatus): string {
  switch (status) {
    case "on_track":
      return "順調です";
    case "slightly_delayed":
      return "少し遅れ気味";
    case "delayed":
      return "遅れ気味";
    case "recovery_needed":
      return "立て直しどき";
    case "consultation_needed":
      return "ペース見直しが必要";
  }
}

/** 総合ステータスの配色（Tailwind クラス）。 */
export function overallStatusTone(status: OverallStatus): string {
  switch (status) {
    case "on_track":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "slightly_delayed":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "delayed":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "recovery_needed":
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case "consultation_needed":
      return "bg-rose-50 text-rose-700 ring-rose-100";
  }
}

/**
 * /today 用の短い案内文を推奨配分から作る（初心者向け）。
 * recommended_focus の最大要素に応じて「今日は何を優先すればよいか」を一言で返す。
 */
export function focusHintMessage(focus: RecommendedFocus): string {
  const { textbook, review, examPractice } = focus;
  // 直前期など：復習と過去問レベルが両方厚いとき。
  if (examPractice >= 45 && review >= 35) {
    return "今日は復習と過去問レベル問題を優先しましょう。";
  }
  if (examPractice >= textbook && examPractice >= review) {
    return "今日は過去問レベル問題で本番対応力を確かめましょう。";
  }
  if (review >= textbook && review >= examPractice) {
    return "今日は復習が中心です。単語復習を先に片付けると効率がよいです。";
  }
  return "今日は新しい範囲のインプットを進めましょう。";
}
