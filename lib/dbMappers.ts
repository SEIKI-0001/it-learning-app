import type { ReviewItem, StudyStyle, UserProfile, UserProgress, WeeklyPlan } from "@/types";
import type { TopicField } from "@/types/content";
import type { ReferenceBook, ReferenceChapter } from "@/types/referenceBook";
// 型のみ import（"use client" のランタイムは取り込まれない＝サーバーから安全に参照できる）。
import type { WordProgress } from "@/lib/wordlistProgress";
import type {
  CompletionSource,
  DailyProgressReport,
  DailyStudyTask,
  DailyTaskStatus,
  DailyTaskType,
  ProgressLevel,
  ProgressReason,
  TopicProgress,
  TopicStage,
} from "@/types/studyProgress";
import type { CheckPackResultStatus } from "@/types/checkPack";
import type {
  IntegratedLearningStatus,
  MainRisk,
  OverallStatus,
  RecommendedFocus,
  WeakTopic,
} from "@/types/integratedStatus";
import type {
  AdjustmentSeverity,
  AdjustmentStatus,
  AdjustmentTriggerType,
  PlanAdjustmentProposal,
  RecoveryPlanOption,
} from "@/types/planAdjustment";

// DB（snake_case の行）と アプリ内の型（camelCase）の相互変換。
// サーバー側 API Route からのみ使用する。
// 7日版からの後方互換: 旧列(current_day / completed_days)も読み書きするが、
// 新ロジックはトピック単位の列(completed_topics / topic_mastery / review_queue)を使う。

export type ProgressRow = {
  user_id: string;
  current_day: number;
  exp: number;
  level: number;
  completed_days: number[] | null;
  streak_count: number;
  weak_tags: string[] | null;
  last_played_at: string | null;
  // 新(トピック単位)
  completed_topics: string[] | null;
  topic_mastery: Record<string, number> | null;
  review_queue: ReviewItem[] | null;
  weekly_plan: WeeklyPlan | null;
};

export type ProfileRow = {
  user_id: string;
  it_experience: string | null;
  daily_minutes: string | null;
  exam_plan: string | null;
  confidence: number | null;
  // 新(ITパスポート学習コーチ)
  exam_date: string | null;
  plan_start_date: string | null;
  weekday_minutes: number | null;
  holiday_minutes: number | null;
  weak_fields: string[] | null;
  study_style: string | null;
};

export function progressRowToProgress(row: ProgressRow): UserProgress {
  return {
    level: row.level,
    exp: row.exp,
    streakCount: row.streak_count,
    weakTags: row.weak_tags ?? [],
    lastPlayedAt: row.last_played_at ?? undefined,
    completedTopics: row.completed_topics ?? [],
    topicMastery: row.topic_mastery ?? {},
    reviewQueue: row.review_queue ?? [],
    weeklyPlan: row.weekly_plan ?? null,
    // 旧版互換
    currentDay: row.current_day ?? 1,
    completedDays: row.completed_days ?? [],
  };
}

export function progressToRow(
  userId: string,
  p: UserProgress,
): ProgressRow & { updated_at: string } {
  return {
    user_id: userId,
    current_day: p.currentDay ?? 1,
    exp: p.exp,
    level: p.level,
    completed_days: p.completedDays ?? [],
    streak_count: p.streakCount,
    weak_tags: p.weakTags,
    last_played_at: p.lastPlayedAt ?? null,
    completed_topics: p.completedTopics ?? [],
    topic_mastery: p.topicMastery ?? {},
    review_queue: p.reviewQueue ?? [],
    weekly_plan: p.weeklyPlan ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function profileRowToProfile(row: ProfileRow): UserProfile {
  return {
    itExperience: row.it_experience ?? "",
    dailyMinutes: row.daily_minutes ?? "",
    examPlan: row.exam_plan ?? "",
    confidence: row.confidence ?? 0,
    examDate: row.exam_date ?? undefined,
    planStartDate: row.plan_start_date ?? undefined,
    weekdayMinutes: row.weekday_minutes ?? undefined,
    holidayMinutes: row.holiday_minutes ?? undefined,
    weakFields: (row.weak_fields ?? undefined) as TopicField[] | undefined,
    studyStyle: (row.study_style ?? undefined) as StudyStyle | undefined,
  };
}

export function profileToRow(
  userId: string,
  p: UserProfile,
): ProfileRow & { updated_at: string } {
  return {
    user_id: userId,
    it_experience: p.itExperience,
    daily_minutes: p.dailyMinutes,
    exam_plan: p.examPlan,
    confidence: p.confidence,
    exam_date: p.examDate ?? null,
    plan_start_date: p.planStartDate ?? null,
    weekday_minutes: p.weekdayMinutes ?? null,
    holiday_minutes: p.holidayMinutes ?? null,
    weak_fields: p.weakFields ?? null,
    study_style: p.studyStyle ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// user_word_progress : 英略語単語帳の進捗（1ユーザー1単語1行）
// ---------------------------------------------------------------------------
// クライアントは epoch ms で進捗を持つが、DB は timestamptz。
// 行→アプリ では ISO文字列を epoch ms に戻し、アプリ→行 では ISO文字列に変換する。

export type WordProgressRow = {
  user_id: string;
  word_id: string;
  status: string;
  correct_count: number;
  wrong_count: number;
  review_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  last_self_rating: string | null;
};

export function wordProgressRowToProgress(row: WordProgressRow): WordProgress {
  return {
    acronymId: row.word_id,
    status: (row.status ?? "new") as WordProgress["status"],
    correctCount: row.correct_count ?? 0,
    wrongCount: row.wrong_count ?? 0,
    reviewCount: row.review_count ?? 0,
    lastReviewedAt: row.last_reviewed_at
      ? new Date(row.last_reviewed_at).getTime()
      : null,
    nextReviewAt: row.next_review_at
      ? new Date(row.next_review_at).getTime()
      : null,
    lastSelfRating: (row.last_self_rating ??
      null) as WordProgress["lastSelfRating"],
  };
}

export function wordProgressToRow(
  userId: string,
  p: WordProgress,
): WordProgressRow & { updated_at: string } {
  return {
    user_id: userId,
    word_id: p.acronymId,
    status: p.status,
    correct_count: p.correctCount,
    wrong_count: p.wrongCount,
    review_count: p.reviewCount,
    last_reviewed_at:
      p.lastReviewedAt != null ? new Date(p.lastReviewedAt).toISOString() : null,
    next_review_at:
      p.nextReviewAt != null ? new Date(p.nextReviewAt).toISOString() : null,
    last_self_rating: p.lastSelfRating ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// user_reference_books : ユーザーごとの参考書アウトライン（1ユーザー1冊）
// ---------------------------------------------------------------------------
// 章構成は jsonb でまるごと保存する（章・節の可変構造のため列に展開しない）。

export type ReferenceBookRow = {
  user_id: string;
  title: string | null;
  publisher: string | null;
  edition: string | null;
  active: boolean | null;
  note: string | null;
  chapters: ReferenceChapter[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function referenceBookRowToBook(row: ReferenceBookRow): ReferenceBook {
  return {
    title: row.title ?? "",
    publisher: row.publisher ?? "",
    edition: row.edition ?? "",
    active: row.active ?? true,
    note: row.note ?? "",
    chapters: row.chapters ?? [],
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export function referenceBookToRow(
  userId: string,
  b: ReferenceBook,
): ReferenceBookRow & { updated_at: string } {
  return {
    user_id: userId,
    title: b.title || null,
    publisher: b.publisher || null,
    edition: b.edition || null,
    active: b.active,
    note: b.note || null,
    chapters: b.chapters ?? [],
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// daily_study_tasks : 今日出したタスク（/today のメニューを保存）
// ---------------------------------------------------------------------------

export type DailyStudyTaskRow = {
  task_id: string;
  user_id: string;
  date: string;
  task_type: string;
  topic_id: string | null;
  title: string | null;
  planned_quantity: string | null;
  estimated_minutes: number | null;
  status: string;
  completion_source: string;
  estimated_completion_rate: number | null;
  reason: string | null;
  source: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function dailyStudyTaskRowToTask(row: DailyStudyTaskRow): DailyStudyTask {
  return {
    taskId: row.task_id,
    userId: row.user_id,
    date: row.date,
    taskType: (row.task_type ?? "review") as DailyTaskType,
    topicId: row.topic_id ?? "",
    title: row.title ?? "",
    plannedQuantity: row.planned_quantity ?? null,
    estimatedMinutes: row.estimated_minutes ?? null,
    status: (row.status ?? "pending") as DailyTaskStatus,
    completionSource: (row.completion_source ?? "self_report") as CompletionSource,
    estimatedCompletionRate: row.estimated_completion_rate ?? null,
    reason: row.reason ?? null,
    source: row.source ?? "today_menu",
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/**
 * 挿入用の行。task_id / created_at / updated_at はDB既定に任せる。
 * topic_id は unique を安定させるため空文字既定（NULL 不使用）。
 */
export function dailyStudyTaskToRow(
  userId: string,
  date: string,
  t: {
    taskType: DailyTaskType;
    topicId?: string | null;
    title?: string | null;
    plannedQuantity?: string | null;
    estimatedMinutes?: number | null;
    reason?: string | null;
    source?: string;
  },
): Omit<DailyStudyTaskRow, "task_id"> {
  return {
    user_id: userId,
    date,
    task_type: t.taskType,
    topic_id: (t.topicId ?? "").trim(),
    title: (t.title ?? "").trim(),
    planned_quantity: t.plannedQuantity ?? null,
    estimated_minutes: t.estimatedMinutes ?? null,
    status: "pending",
    completion_source: "self_report",
    estimated_completion_rate: null,
    reason: t.reason ?? null,
    source: t.source ?? "today_menu",
  };
}

// ---------------------------------------------------------------------------
// daily_progress_reports : 1日1回の達成度報告
// ---------------------------------------------------------------------------

export type DailyProgressReportRow = {
  report_id: string;
  user_id: string;
  date: string;
  selected_level: string;
  estimated_completion_rate: number | null;
  optional_reason: string | null;
  created_at?: string | null;
};

export function dailyProgressReportRowToReport(
  row: DailyProgressReportRow,
): DailyProgressReport {
  return {
    reportId: row.report_id,
    userId: row.user_id,
    date: row.date,
    selectedLevel: (row.selected_level ?? "none") as ProgressLevel,
    estimatedCompletionRate: row.estimated_completion_rate ?? null,
    optionalReason: (row.optional_reason ?? null) as ProgressReason | null,
    createdAt: row.created_at ?? undefined,
  };
}

/** upsert 用の行（report_id / created_at はDB既定）。 */
export function dailyProgressReportToRow(
  userId: string,
  date: string,
  selectedLevel: ProgressLevel,
  estimatedCompletionRate: number | null,
  optionalReason: ProgressReason | null,
): Omit<DailyProgressReportRow, "report_id" | "created_at"> {
  return {
    user_id: userId,
    date,
    selected_level: selectedLevel,
    estimated_completion_rate: estimatedCompletionRate,
    optional_reason: optionalReason,
  };
}

// ---------------------------------------------------------------------------
// topic_progress : トピック別ステージ（理解度）
// ---------------------------------------------------------------------------

export type TopicProgressRow = {
  id: string;
  user_id: string;
  topic_id: string;
  stage: string;
  latest_quiz_score: number | null;
  latest_exam_level_score: number | null;
  quiz_attempt_count: number;
  exam_level_attempt_count: number;
  consecutive_failed_count: number;
  last_attempted_at: string | null;
  next_review_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function topicProgressRowToProgress(row: TopicProgressRow): TopicProgress {
  return {
    id: row.id,
    userId: row.user_id,
    topicId: row.topic_id,
    stage: (row.stage ?? "not_started") as TopicStage,
    latestQuizScore: row.latest_quiz_score ?? null,
    latestExamLevelScore: row.latest_exam_level_score ?? null,
    quizAttemptCount: row.quiz_attempt_count ?? 0,
    examLevelAttemptCount: row.exam_level_attempt_count ?? 0,
    consecutiveFailedCount: row.consecutive_failed_count ?? 0,
    lastAttemptedAt: row.last_attempted_at ?? null,
    nextReviewAt: row.next_review_at ?? null,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** upsert 用の行（id / created_at はDB既定、updated_at は now）。 */
export function topicProgressToRow(
  userId: string,
  topicId: string,
  p: {
    stage: TopicStage;
    latestQuizScore?: number | null;
    latestExamLevelScore?: number | null;
    quizAttemptCount: number;
    examLevelAttemptCount: number;
    consecutiveFailedCount: number;
    lastAttemptedAt?: string | null;
    nextReviewAt?: string | null;
  },
): Omit<TopicProgressRow, "id" | "created_at"> & { updated_at: string } {
  return {
    user_id: userId,
    topic_id: topicId,
    stage: p.stage,
    latest_quiz_score: p.latestQuizScore ?? null,
    latest_exam_level_score: p.latestExamLevelScore ?? null,
    quiz_attempt_count: p.quizAttemptCount,
    exam_level_attempt_count: p.examLevelAttemptCount,
    consecutive_failed_count: p.consecutiveFailedCount,
    last_attempted_at: p.lastAttemptedAt ?? null,
    next_review_at: p.nextReviewAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// question_attempts : 問題（確認問題 / 過去問レベル / ミニ模試）の回答ログ（第2弾）
// ---------------------------------------------------------------------------

export type QuestionType = "topic_quiz" | "exam_level" | "mini_exam";

export type QuestionAttemptRow = {
  user_id: string;
  question_id: string;
  question_type: string;
  topic_id: string;
  selected_answer: string | null;
  is_correct: boolean;
  mistake_reason: string | null;
  answered_at: string;
  time_spent_seconds: number | null;
  source_task_id: string | null;
};

/** 挿入用の行（attempt_id はDB既定）。 */
export function questionAttemptToRow(
  userId: string,
  a: {
    questionId: string;
    questionType: QuestionType;
    topicId: string;
    selectedAnswer?: string | null;
    isCorrect: boolean;
    mistakeReason?: string | null;
    answeredAt?: string | null;
    timeSpentSeconds?: number | null;
    sourceTaskId?: string | null;
  },
): QuestionAttemptRow {
  return {
    user_id: userId,
    question_id: a.questionId,
    question_type: a.questionType,
    topic_id: a.topicId,
    selected_answer: a.selectedAnswer ?? null,
    is_correct: a.isCorrect,
    mistake_reason: a.mistakeReason ?? null,
    answered_at: a.answeredAt ?? new Date().toISOString(),
    time_spent_seconds: a.timeSpentSeconds ?? null,
    source_task_id: a.sourceTaskId ?? null,
  };
}

// ---------------------------------------------------------------------------
// topic_check_pack_attempts : 確認パックの実施結果（第2弾）
// ---------------------------------------------------------------------------

export type TopicCheckPackAttemptRow = {
  user_id: string;
  pack_id: string;
  topic_id: string;
  started_at: string | null;
  completed_at: string | null;
  quiz_score_rate: number | null;
  flashcard_score_rate: number | null;
  exam_level_score_rate: number | null;
  result_status: string;
  next_action: string | null;
};

/** 挿入用の行（attempt_id / created_at はDB既定）。 */
export function topicCheckPackAttemptToRow(
  userId: string,
  a: {
    packId: string;
    topicId: string;
    startedAt?: string | null;
    completedAt?: string | null;
    quizScoreRate?: number | null;
    flashcardScoreRate?: number | null;
    examLevelScoreRate?: number | null;
    resultStatus: CheckPackResultStatus;
    nextAction?: string | null;
  },
): TopicCheckPackAttemptRow {
  return {
    user_id: userId,
    pack_id: a.packId,
    topic_id: a.topicId,
    started_at: a.startedAt ?? null,
    completed_at: a.completedAt ?? null,
    quiz_score_rate: a.quizScoreRate ?? null,
    flashcard_score_rate: a.flashcardScoreRate ?? null,
    exam_level_score_rate: a.examLevelScoreRate ?? null,
    result_status: a.resultStatus,
    next_action: a.nextAction ?? null,
  };
}

// ---------------------------------------------------------------------------
// integrated_learning_status : 統合進捗の日次スナップショット（第3弾）
// ---------------------------------------------------------------------------

export type IntegratedStatusRow = {
  id?: string;
  user_id: string;
  status_date: string;
  overall_status: string;
  readiness_score: number;
  input_progress_rate: number | null;
  basic_understanding_rate: number | null;
  flashcard_mastery_rate: number | null;
  exam_ready_rate: number | null;
  field_balance_score: number | null;
  weak_topic_count: number | null;
  exam_ready_topic_count: number | null;
  basic_understood_topic_count: number | null;
  review_needed_topic_count: number | null;
  weak_topics: WeakTopic[] | null;
  main_risks: MainRisk[] | null;
  recommended_focus: RecommendedFocus | null;
  generated_message: string | null;
  created_at?: string | null;
};

export function integratedStatusRowToStatus(
  row: IntegratedStatusRow,
): IntegratedLearningStatus {
  return {
    statusDate: row.status_date,
    overallStatus: (row.overall_status ?? "delayed") as OverallStatus,
    readinessScore: row.readiness_score ?? 0,
    inputProgressRate: row.input_progress_rate ?? 0,
    basicUnderstandingRate: row.basic_understanding_rate ?? 0,
    flashcardMasteryRate: row.flashcard_mastery_rate ?? 0,
    examReadyRate: row.exam_ready_rate ?? 0,
    fieldBalanceScore: row.field_balance_score ?? 0,
    weakTopicCount: row.weak_topic_count ?? 0,
    examReadyTopicCount: row.exam_ready_topic_count ?? 0,
    basicUnderstoodTopicCount: row.basic_understood_topic_count ?? 0,
    reviewNeededTopicCount: row.review_needed_topic_count ?? 0,
    weakTopics: row.weak_topics ?? [],
    mainRisks: row.main_risks ?? [],
    recommendedFocus:
      row.recommended_focus ?? { textbook: 25, review: 40, examPractice: 35 },
    generatedMessage: row.generated_message ?? "",
  };
}

/** upsert 用の行（id / created_at はDB既定）。 */
export function integratedStatusToRow(
  userId: string,
  s: IntegratedLearningStatus,
): IntegratedStatusRow {
  return {
    user_id: userId,
    status_date: s.statusDate,
    overall_status: s.overallStatus,
    readiness_score: s.readinessScore,
    input_progress_rate: s.inputProgressRate,
    basic_understanding_rate: s.basicUnderstandingRate,
    flashcard_mastery_rate: s.flashcardMasteryRate,
    exam_ready_rate: s.examReadyRate,
    field_balance_score: s.fieldBalanceScore,
    weak_topic_count: s.weakTopicCount,
    exam_ready_topic_count: s.examReadyTopicCount,
    basic_understood_topic_count: s.basicUnderstoodTopicCount,
    review_needed_topic_count: s.reviewNeededTopicCount,
    weak_topics: s.weakTopics,
    main_risks: s.mainRisks,
    recommended_focus: s.recommendedFocus,
    generated_message: s.generatedMessage,
  };
}

// ---------------------------------------------------------------------------
// plan_adjustment_proposals : 立て直し提案（第4弾）
// ---------------------------------------------------------------------------

export type PlanAdjustmentRow = {
  proposal_id?: string;
  user_id: string;
  status_date: string;
  source_status_id: string | null;
  trigger_type: string;
  severity: string;
  headline: string;
  reason_summary: string | null;
  options: RecoveryPlanOption[];
  selected_option_id: string | null;
  status: string;
  accepted_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function planAdjustmentRowToProposal(
  row: PlanAdjustmentRow,
): PlanAdjustmentProposal {
  return {
    proposalId: row.proposal_id ?? "",
    statusDate: row.status_date,
    sourceStatusId: row.source_status_id ?? null,
    triggerType: (row.trigger_type ?? "delay") as AdjustmentTriggerType,
    severity: (row.severity ?? "moderate") as AdjustmentSeverity,
    headline: row.headline ?? "",
    reasonSummary: row.reason_summary ?? null,
    options: row.options ?? [],
    selectedOptionId: row.selected_option_id ?? null,
    status: (row.status ?? "proposed") as AdjustmentStatus,
    acceptedAt: row.accepted_at ?? null,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** insert 用の行（proposal_id / created_at / updated_at はDB既定）。 */
export function planAdjustmentToRow(
  userId: string,
  p: {
    statusDate: string;
    sourceStatusId?: string | null;
    triggerType: AdjustmentTriggerType;
    severity: AdjustmentSeverity;
    headline: string;
    reasonSummary?: string | null;
    options: RecoveryPlanOption[];
  },
): Omit<PlanAdjustmentRow, "proposal_id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    status_date: p.statusDate,
    source_status_id: p.sourceStatusId ?? null,
    trigger_type: p.triggerType,
    severity: p.severity,
    headline: p.headline,
    reason_summary: p.reasonSummary ?? null,
    options: p.options,
    selected_option_id: null,
    status: "proposed",
    accepted_at: null,
  };
}
