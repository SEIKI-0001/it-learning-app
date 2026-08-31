// 公式過去問の年度別演習で使う型。
//
// 「公式過去問をその年度の並びどおりに100問解く」という、既存の確認パック・
// 100問模試とは別の演習のための型。既存の CheckQuestion / ExamLevelQuestion へは
// 変換しない（選択肢のシャッフルや即時正答表示といった既存挙動を持ち込まないため）。

import type {
  AppState,
  ChoiceKey,
  QuestionExposureMap,
  QuestionExposureState,
  UserProgress,
} from "@/types";
import type { TopicField } from "@/types/content";
import type { PendingAssessmentFinalization } from "@/lib/examReadiness/pendingFinalization";

/**
 * 演習モード。
 *   practice … 1問ずつ答え合わせしながら進む。制限時間なし。
 *   exam     … 本番同様に120分で通し、終了するまで正答も解説も見せない。
 */
export type PastExamMode = "practice" | "exam";

/** 本番モードの制限時間（分）。ITパスポート試験の実際の試験時間に合わせる。 */
export const EXAM_MODE_DURATION_MINUTES = 120;

/** 1問ぶんの回答記録。 */
export type PastExamAnswer = {
  /** 選んだ選択肢。未回答は null。 */
  selected: ChoiceKey | null;
  /** 回答した時刻（ISO8601）。 */
  answeredAt: string;
  /** その問題に費やした秒数（同じ問題に戻って answer し直した場合は累計）。 */
  timeSpentSeconds: number;
  /** DB回答保存と同時に確定した初見状態。旧セッションでは未設定＝unknown。 */
  exposureState?: QuestionExposureState;
};

export type PastExamAssessmentAnswer = {
  idempotencyKey: string;
  canonicalQuestionId: string;
  topicId: string;
  isCorrect: boolean;
  answeredAt: string;
};

/** Frozen inputs used to resume official past-exam finalization after reload. */
export type PastExamFinalizationBase = {
  kind: "official-past";
  year: number;
  mode: PastExamMode;
  appState: AppState | null;
  answerSnapshot: Record<number, PastExamAnswer>;
};

export type PastExamFinalizationNext = { appState: AppState | null };

export type PastExamPendingFinalization = PendingAssessmentFinalization<
  PastExamFinalizationBase,
  PastExamFinalizationNext,
  PastExamResult
>;

export type PastExamPendingMutation = {
  action: "complete";
  completedAt: string;
  answerSnapshot: Record<number, PastExamAnswer>;
  assessmentAnswers: PastExamAssessmentAnswer[];
  /** Present after the strict attempt save has been acknowledged. */
  exposures?: QuestionExposureMap;
  confirmedUserId?: string | null;
  /** Frozen P0 payload. Undefined is accepted only for pre-upgrade pending sessions. */
  progressSnapshot?: UserProgress | null;
  /**
   * The same frozen stage record used by other assessment runners. It remains
   * nested in the existing official-past session, never in a second key.
   */
  finalization?: PastExamPendingFinalization;
} | {
  action: "abandon";
  completedAt: string;
};

/**
 * 途中状態。localStorage に保存して再開に使う。
 * ユーザー・年度・モードごとに独立して持つ。
 */
export type PastExamSession = {
  /** 保存形式の版。読み込み側の互換判定に使う。 */
  schemaVersion: 1;
  /** この演習1回を識別するUUID。共通評価セッションと attempt_group_id に使う。 */
  sessionId: string;
  year: number;
  mode: PastExamMode;
  /** 開始日時（ISO8601）。本番モードの残り時間はここから算出する。 */
  startedAt: string;
  /** 現在表示している問題の位置（0始まり）。 */
  currentIndex: number;
  /** 問番号（1〜100）→ 回答。未回答の問題はキーごと存在しない。 */
  answers: Record<number, PastExamAnswer>;
  /** Response-lost lifecycle operations are retried byte-for-byte after reload. */
  pendingMutation?: PastExamPendingMutation;
  /** 採点まで終わったか。完了後は途中状態として復元しない。 */
  completed: boolean;
};

/** 採点結果の1問ぶん。 */
export type PastExamQuestionResult = {
  questionId: string;
  questionNumber: number;
  /** 公式問題冊子上の出題区分。集計はこの値で行う（syllabusNode.field ではない）。 */
  examField: TopicField;
  selected: ChoiceKey | null;
  correctChoice: ChoiceKey;
  isCorrect: boolean;
  /** 未回答か（selected が null）。 */
  isUnanswered: boolean;
  /** 復習先トピック。 */
  topicId: string;
};

/** 公式出題区分ごとの集計。 */
export type PastExamFieldSummary = {
  field: TopicField;
  total: number;
  correct: number;
  /** 正答率（％、小数第1位を四捨五入した整数）。 */
  rate: number;
};

/** アプリ内Topicごとの集計（復習・Mastery更新用）。 */
export type PastExamTopicSummary = {
  topicId: string;
  total: number;
  correct: number;
  rate: number;
};

/** 採点結果全体。 */
export type PastExamResult = {
  sessionId: string;
  year: number;
  mode: PastExamMode;
  total: number;
  correct: number;
  unanswered: number;
  /** 単純正答率（％、小数第1位を四捨五入した整数）。 */
  rate: number;
  byField: PastExamFieldSummary[];
  byTopic: PastExamTopicSummary[];
  questions: PastExamQuestionResult[];
};
