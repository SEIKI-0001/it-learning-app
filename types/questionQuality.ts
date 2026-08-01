// ============================================================================
// 問題品質（公開前検査 + 実測難易度）の型。
// ----------------------------------------------------------------------------
// 設計方針:
//   - 検査結果は問題データ（QuestionRecord）に書き戻さない。
//     問題本文は Git 管理の「作った内容」、検査結果は「その内容をどう評価したか」で、
//     混ぜると再検査のたびに問題ファイルの差分が出て履歴が読めなくなる。
//   - レビュー記録も問題本文とは別ファイル（data/question-bank/reviews/）に持つ。
//     誰がいつ承認したかは本文のハッシュ対象外であるべきなので分離する。
//   - 実測難易度は Supabase 側のスナップショット。作問時の estimatedDifficulty を
//     自動で書き換えることは絶対にしない（推奨値を出すだけ）。
// ============================================================================

import type { QuestionOrigin, QuestionStatus } from "@/types/questionBank";
import type { SimilarityBand } from "@/lib/questionQuality/thresholds";

// ---------------------------------------------------------------------------
// レビュー記録
// ---------------------------------------------------------------------------

export type QuestionReviewDecision = "approve" | "revise" | "reject";

/**
 * 公開前レビュー1件。data/question-bank/reviews/<question-id>.json に1問1ファイルで置く。
 *
 * version を持つのは「どの版をレビューしたか」を固定するため。本文を直して version を
 * 上げたら、そのレビューは失効する（古い版の承認で新しい本文を公開させない）。
 */
export type QuestionReviewRecord = {
  questionId: string;
  /** レビュー対象の QuestionRecord.version。 */
  version: number;
  /** 問題文・選択肢・正答を確認した人。 */
  contentReviewedBy: string;
  /** 解説・選択肢別解説を確認した人。 */
  explanationReviewedBy: string;
  /** 類似度検査の結果を確認した人（review_required の公開に必要）。 */
  similarityReviewedBy?: string;
  /** レビュー完了日時（ISO8601）。 */
  reviewedAt: string;
  decision: QuestionReviewDecision;
  notes?: string;
  /**
   * 作問者。レビュー者と同一かを見るために持つ（自己レビューは warning）。
   * 分からない場合は省略してよい。
   */
  authoredBy?: string;
};

// ---------------------------------------------------------------------------
// 検査結果
// ---------------------------------------------------------------------------

/**
 * blocker … 公開させない。機械的に「間違っている」と断定できるものだけ。
 * warning … 人が見るべき。断定できないものはすべてこちら。
 */
export type QualitySeverity = "blocker" | "warning";

export type QualityFinding = {
  questionId: string;
  severity: QualitySeverity;
  /** 検査ルールの識別子（kebab-case）。ベースライン管理のキーになる。 */
  rule: string;
  /** なぜそう判定したかの根拠。人が読んで再現できる粒度で書く。 */
  message: string;
  /** 類似度由来の検出のとき、最も似ていた相手と各スコア。 */
  similarity?: {
    matchedQuestionId: string;
    matchedOrigin: QuestionOrigin;
    band: SimilarityBand;
    promptScore: number;
    fullScore: number;
    correctChoiceScore: number;
    score: number;
  };
};

/** レポート全体。実行時刻は持たない（再生成で無意味な差分を出さないため）。 */
export type QualityReport = {
  schemaVersion: 1;
  summary: {
    questionCount: number;
    blockerCount: number;
    warningCount: number;
    byOrigin: Record<QuestionOrigin, number>;
    byStatus: Record<QuestionStatus, number>;
    similarityBandCounts: Record<SimilarityBand, number>;
  };
  findings: QualityFinding[];
  /** band が "ok" 以外だった問題の最類似相手一覧（公開を阻害しないものも含む）。 */
  similarities: {
    questionId: string;
    origin: QuestionOrigin;
    matchedQuestionId: string;
    matchedOrigin: QuestionOrigin;
    band: SimilarityBand;
    promptScore: number;
    fullScore: number;
    correctChoiceScore: number;
    score: number;
  }[];
};

/** 既知 warning のベースライン（新規悪化だけを検出するために使う）。 */
export type QualityBaseline = {
  schemaVersion: 1;
  /** このベースラインが何のためにあるかを、読む人に向けて書いておく。 */
  note: string;
  /** "<questionId>::<rule>" の一覧。昇順でソートして保存する。 */
  knownWarnings: string[];
};

// ---------------------------------------------------------------------------
// 実測難易度
// ---------------------------------------------------------------------------

/**
 * 標本の十分さ。ユニークユーザー数で決める（回答数ではない）。
 * insufficient のあいだは難易度も品質も断定しない。
 */
export type SampleStatus = "insufficient" | "provisional" | "reliable";

/**
 * 実測から出す推奨難易度（1〜5）。
 *
 * 作問時の QuestionRecord.estimatedDifficulty（1〜3）とは目盛りが違う。
 * 実測は正答率の連続値から出せるので、作問時より細かい5段階にしてある。
 * 突き合わせるときは toEstimatedScale() で 1〜3 に丸めてから比較すること。
 */
export type RecommendedDifficulty = 1 | 2 | 3 | 4 | 5;

export type AnomalyFlag =
  | "too_easy"
  | "too_hard"
  | "non_functioning_distractor"
  | "dominant_wrong_choice"
  | "unusually_fast"
  | "unusually_slow"
  | "high_unanswered_rate"
  | "estimate_mismatch";

/** 集計の入力（question_attempts の1行）。user_id はここから外へ出さない。 */
export type QuestionAttemptRow = {
  attemptId: string;
  userId: string;
  questionId: string;
  questionVersion: number | null;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number | null;
  answeredAt: string;
};

/**
 * 問題1件 × version 1つぶんの実測スナップショット。
 * question_quality_metrics テーブルの1行に対応する。
 */
export type QuestionQualityMetric = {
  questionId: string;
  questionVersion: number;
  sampleStatus: SampleStatus;
  uniqueUserCount: number;
  firstAttemptCount: number;
  allAttemptCount: number;
  /** 主指標。同一ユーザー・同一versionの「最初の1回」だけで計算する。 */
  firstAttemptCorrectRate: number | null;
  /** 参考値。反復練習を含む全回答。難易度判定には使わない。 */
  allAttemptCorrectRate: number | null;
  medianTimeSeconds: number | null;
  p90TimeSeconds: number | null;
  unansweredRate: number | null;
  /** 選択肢別の初回回答数。未回答は "unanswered" キーに入れる。 */
  choiceCounts: Record<string, number>;
  /** 初回回答数に対する割合。 */
  choiceRates: Record<string, number>;
  /** 実測から出した推奨難易度（1〜5）。QuestionRecord には自動反映しない。 */
  recommendedDifficulty: RecommendedDifficulty | null;
  anomalyFlags: AnomalyFlag[];
};
