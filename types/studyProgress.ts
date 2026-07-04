// 到達度判定型・低入力進捗管理 第1弾 — 型定義
//
// 設計方針:
//   - 日次タスク / 達成度報告 / トピック別ステージ の3テーブルに対応する素直な型。
//   - 学習時間・分量は目安として持つ。ユーザーに細かい報告はさせない。
//   - 理解度（stage の basic_understood 以上）は確認問題結果のみで判定する。

// ---------------------------------------------------------------------------
// daily_study_tasks : 今日出したタスク
// ---------------------------------------------------------------------------

/** タスク種別 */
export type DailyTaskType =
  | "textbook"
  | "diagram"
  | "topic_quiz"
  | "flashcard"
  | "exam_level"
  | "review";

/** タスクの達成状態 */
export type DailyTaskStatus =
  | "pending"
  | "completed"
  | "partially_completed"
  | "skipped";

/** 達成状態の出所（自己申告か、アプリ実績か） */
export type CompletionSource = "self_report" | "app_actual";

export type DailyStudyTask = {
  taskId: string;
  userId: string;
  date: string; // "YYYY-MM-DD"（ローカル日付）
  taskType: DailyTaskType;
  topicId: string;
  title: string;
  plannedQuantity?: string | null;
  estimatedMinutes?: number | null;
  status: DailyTaskStatus;
  completionSource: CompletionSource;
  estimatedCompletionRate?: number | null; // 0〜100
  reason?: string | null;
  source: string; // 既定 "today_menu"
  createdAt?: string;
  updatedAt?: string;
};

/** /today からタスクを保存するときの入力（サーバーが既定値を補う）。 */
export type DailyStudyTaskInput = {
  taskType: DailyTaskType;
  topicId: string;
  title: string;
  plannedQuantity?: string | null;
  estimatedMinutes?: number | null;
  reason?: string | null;
  source?: string;
};

// ---------------------------------------------------------------------------
// daily_progress_reports : 1日1回の達成度報告
// ---------------------------------------------------------------------------

/** 達成度ボタンの選択値 */
export type ProgressLevel = "all" | "half" | "little" | "none" | "rest";

/** 任意の理由（低入力・NULL可） */
export type ProgressReason =
  | "no_time"
  | "difficult"
  | "tired"
  | "forgot"
  | "other";

export type DailyProgressReport = {
  reportId: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  selectedLevel: ProgressLevel;
  estimatedCompletionRate?: number | null; // all=100 / half=50 / little=25 / none=0 / rest=null
  optionalReason?: ProgressReason | null;
  createdAt?: string;
};

/** selected_level → 達成度(%)。rest は推定なし(null)。 */
export const PROGRESS_LEVEL_RATE: Record<ProgressLevel, number | null> = {
  all: 100,
  half: 50,
  little: 25,
  none: 0,
  rest: null,
};

// ---------------------------------------------------------------------------
// topic_progress : トピック別ステージ（理解度）
// ---------------------------------------------------------------------------

/** トピックのステージ */
export type TopicStage =
  | "not_started"
  | "input_guided"
  | "check_pending"
  | "basic_understood"
  | "terms_stabilizing"
  | "exam_check_pending"
  | "exam_ready"
  | "review_needed"
  | "weak"
  | "deferred";

/** 「基礎理解OK」とみなすステージ（basic_understood 以上の理解済み系）。 */
export const UNDERSTOOD_STAGES: TopicStage[] = [
  "basic_understood",
  "terms_stabilizing",
  "exam_check_pending",
  "exam_ready",
];

export type TopicProgress = {
  id: string;
  userId: string;
  topicId: string;
  stage: TopicStage;
  latestQuizScore?: number | null;
  latestExamLevelScore?: number | null;
  quizAttemptCount: number;
  examLevelAttemptCount: number;
  consecutiveFailedCount: number;
  lastAttemptedAt?: string | null;
  nextReviewAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** /progress の簡易サマリ。 */
export type TopicProgressSummary = {
  basicUnderstood: number; // basic_understood 以上のトピック数
  reviewNeeded: number; // review_needed の数
  weak: number; // weak の数
};
