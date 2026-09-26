// ITパスポート学習コーチ — 共通型定義
//
// 設計方針:
//   - 7日固定(currentDay 1〜7)に依存しない。学習はトピック単位で進む。
//   - 進捗・プロフィールは「将来 AIプランナー(lib/aiPlanner.ts)へ渡す」前提で持つ。
//   - 旧 FE Quest 由来のフィールド(currentDay / completedDays / Question 等)は
//     既存DB・localStorage との後方互換のために残すが、新しいUI/ロジックでは使わない。

import type { TopicField } from "@/types/content";
import type { CheckpointProgress } from "@/types/checkpoint";
import type { TodayActivitySpec } from "@/lib/todayActivitySpec";

export type ChoiceKey = "A" | "B" | "C" | "D";

// ---------------------------------------------------------------------------
// ユーザープロフィール(オンボーディングで取得 → AIプランナーへ渡す)
// ---------------------------------------------------------------------------

/** 学習スタイルの希望 */
export type StudyStyle = "balanced" | "weakness" | "rush";

export const STUDY_STYLE_LABELS: Record<StudyStyle, string> = {
  balanced: "3分野をバランスよく",
  weakness: "苦手分野を優先",
  rush: "試験日まで一気に",
};

export type UserProfile = {
  // --- 旧版からの互換フィールド ---
  itExperience: string;
  dailyMinutes: string; // 旧: 1日の目安(分)を表す文字列。互換のため保持。
  examPlan: string; // 旧: 受験予定の有無。互換のため保持。
  confidence: number; // 現在の理解度(0〜5)

  // --- ITパスポート学習コーチの新フィールド ---
  examDate?: string; // 試験予定日(ISO "YYYY-MM-DD")。未定なら undefined。
  planStartDate?: string; // 学習開始日(ISO "YYYY-MM-DD")。ロードマップの経過日数の基点。
  weekdayMinutes?: number; // 平日の学習可能時間(分)
  holidayMinutes?: number; // 休日の学習可能時間(分)
  weakFields?: TopicField[]; // 苦手分野(3分野から複数可)
  studyStyle?: StudyStyle; // 学習スタイルの希望
};

// ---------------------------------------------------------------------------
// 進捗(トピック単位 + モチベーション要素)
// ---------------------------------------------------------------------------

/** 復習キューの1項目 */
export type ReviewItem = {
  topicId: string;
  dueAt: string; // 復習期限(ISO)
  reason: string; // "間違えた" | "苦手分野" | "復習期限" など
  /** 満点後の定着確認を何回通過したか。未設定の旧データは0回として扱う。 */
  confirmationCount?: number;
  /** 共通復習スケジュールの段階。未設定の旧データは0として扱う。 */
  reviewStage?: number;
  /** 直近の復習・評価日時。 */
  lastReviewedAt?: string;
  /** 表示文言に依存せず優先順位を判断するための理由コード。 */
  reasonCode?: ReviewReasonCode;
};

export type ReviewReasonCode =
  | "scheduled"
  | "low_mastery"
  | "summary_exam_miss"
  | "review_failure"
  | "repeated_miss";

export type LearningEvidenceKind =
  | "confirmation"
  | "review"
  | "summary_exam"
  | "mock_exam"
  | "past_exam"
  | "checkpoint";

export type QuestionExposureState = "first" | "seen" | "unknown";

export type QuestionExposure = {
  questionId: string;
  state: QuestionExposureState;
  attemptedBefore: boolean | null;
  firstAttemptAt: string | null;
  attemptCount: number | null;
};

export type QuestionExposureMap = Readonly<Record<string, QuestionExposure>>;

export type LearningEvidence = {
  topicId: string;
  questionId: string;
  kind: LearningEvidenceKind;
  isCorrect: boolean;
  exposureState: QuestionExposureState;
  answeredAt: string;
};

export type TopicMasteryEvidence = Omit<
  LearningEvidence,
  "topicId" | "exposureState"
> & {
  /** Persisted for compatibility with P0 state created before exposure states existed. */
  isFirstSeen: boolean;
  /** Missing only on legacy P0 evidence. */
  exposureState?: QuestionExposureState;
};

export type TopicMasteryStats = {
  topicId: string;
  masteryScore: number;
  lastEvaluatedAt: string;
  correctCount: number;
  incorrectCount: number;
  reviewSuccessCount: number;
  recentEvidence: TopicMasteryEvidence[];
};

export type WeakTopicReason =
  | "low_mastery"
  | "summary_exam_miss"
  | "review_failure"
  | "repeated_miss";

export type WeakTopic = {
  topicId: string;
  severity: number;
  reason: WeakTopicReason;
};

export type TodaysLearningQueueKind =
  | "overdue_review"
  | "summary_weak"
  | "low_mastery"
  | "checkpoint_practice"
  | "new_topic"
  | "flashcard"
  | "past_exam"
  | "past_exam_retry"
  | "extra_practice";

export type TodaysLearningQueueItem = {
  id: string;
  topicId?: string;
  kind: TodaysLearningQueueKind;
  priority: number;
  estimatedMinutes: number;
  reason: string;
  /** トピック学習ではないタスク（関連用語・公式過去問）の中身。 */
  activity?: TodayActivity;
};

/**
 * Today に出す「トピック学習以外」のタスクの種類。
 *   vocab           … 関連用語・期限の来た単語・苦手単語を固める（単語帳）
 *   past_exam_drill … 公式過去問の部分演習（分野別・混合・ランダム）
 *   past_exam_retry … 前回までに間違えた公式過去問の解き直し
 *   past_exam_mock  … 公式過去問の年度別100問
 */
export type TodayActivityKind =
  | "vocab"
  | "past_exam_drill"
  | "past_exam_retry"
  | "past_exam_mock";

/**
 * Today のタスク1件（トピック学習以外）。機能名ではなく「次に何をやるか」で表す。
 * 1日に出すのは種類ごとに1件まで。id は種類ごとに固定（"act:vocab" など）。
 */
export type TodayActivity = {
  id: string;
  kind: TodayActivityKind;
  /** 例:「ネットワークの関連用語を固める」「テクノロジの公式問題を12問解く」 */
  title: string;
  /** 例:「DNS / DHCP / NAT / VPN」 */
  detail: string;
  /** 例:「4語」「12問」 */
  countLabel: string;
  estimatedMinutes: number;
  /** lib/learningLoop の TODAY_ACTIVITY_PRIORITY に従う。 */
  priority: number;
  /** なぜ今日これをやるか。 */
  reason: string;
  href: string;
  ctaLabel: string;
  /** 「今日の最優先」に立ててよいか（通常の単語学習は false）。 */
  primaryEligible: boolean;
  /** このトピックの学習と組になるタスク（そのトピックが今日のメニューにあるときだけ出す）。 */
  anchorTopicId?: string;
  /**
   * 復元に必要な最小限の中身（lib/todayActivitySpec）。daily_study_tasks.activity_payload に
   * 保存され、別端末でも同じ spec から同じタスクを組み立て直す。
   */
  spec: TodayActivitySpec;
};

/**
 * 今週のタスクリスト（スナップショット）。
 * 週の途中で内容が入れ替わらないよう、週初め（月曜）に一度確定して保存する。
 * チェック状態は保存せず、completedTopics / 復習状況から都度導出する。
 */
export type WeeklyPlan = {
  weekStartDate: string; // その週の月曜(ISO "YYYY-MM-DD"・ローカル)
  topicIds: string[]; // 今週進めたい新規学習トピック
  reviewIds: string[]; // 今週こなしたい復習トピック
};

export type UserProgress = {
  level: number;
  exp: number;
  streakCount: number;
  weakTags: string[]; // 不正解だったタグ(復習トピックの推定に使う)
  lastPlayedAt?: string;

  // --- トピック単位の学習状態(新) ---
  completedTopics: string[]; // 学習完了したトピックid
  topicMastery: Record<string, number>; // topicId → 習熟度(0〜100)
  /** 評価根拠つきMastery。topicMasteryは既存UI向けの数値投影として同期する。 */
  topicMasteryStats?: Record<string, TopicMasteryStats>;
  reviewQueue: ReviewItem[]; // 復習対象
  weeklyPlan?: WeeklyPlan | null; // 今週のタスクリスト（週初めに確定・端末間同期）

  // --- バッジゲート型ロードマップの進行状態（上位概念） ---
  // 既存ユーザーには normalizeAppState で初期値を安全に補完する。
  checkpointProgress?: CheckpointProgress;

  // --- 旧版からの互換フィールド(新ロジックでは未使用) ---
  currentDay: number; // 旧: 1〜7。互換のため残すが進行には使わない。
  completedDays: number[]; // 旧: クリア済みDay。互換のため残す。
};

export type UserAnswer = {
  questionId: string;
  // 時間切れで未回答のまま保存される場合があるため optional。
  // DB の selected_choice も nullable。
  selectedChoice?: ChoiceKey;
  isCorrect: boolean;
  answeredAt: string;
  tag: string;
  topicId?: string; // どのトピックの確認問題か(新)
};

export type AppState = {
  profile?: UserProfile;
  progress: UserProgress;
  answers: UserAnswer[];
};

// ---------------------------------------------------------------------------
// AIプランナーの入出力型(lib/aiPlanner.ts)。LLM置換しやすい素直な形にする。
// ---------------------------------------------------------------------------

/** 全体学習プラン(試験日から逆算した方針) */
export type StudyPlan = {
  daysUntilExam: number | null; // 試験日未設定なら null
  dailyMinutesTarget: number; // 1日の目安学習時間(分)
  fieldFocus: { field: TopicField; weight: number }[]; // 分野ごとの重み(合計1)
  recommendedTopicIds: string[]; // 次に学ぶと良いトピック順
  message: string; // ユーザー向けの一言方針
};

/** 今日の学習メニューの1項目 */
export type TodayMenuItem = {
  topicId: string;
  title: string;
  field: TopicField;
  estimatedMinutes: number;
  kind: "learn" | "review"; // 新規学習か復習か
};

/** 今日の学習メニュー */
export type TodayMenu = {
  theme: string; // 今日のテーマ
  totalMinutes: number; // 目安時間(合計)
  items: TodayMenuItem[]; // 学習トピック
  reviewItems: ReviewItem[]; // 復習対象(問題)
  message: string; // 一言メッセージ
  /**
   * トピック学習と、トピック以外のタスク（関連用語・公式過去問）を優先度順に並べたもの。
   * activities を渡して生成したときだけ入る（渡さなければ従来どおり items だけ）。
   */
  sequence?: TodayMenuEntry[];
};

export type TodayMenuEntry =
  | { type: "topic"; item: TodayMenuItem }
  | { type: "activity"; activity: TodayActivity };
