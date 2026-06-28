import type { ReviewItem, StudyStyle, UserProfile, UserProgress } from "@/types";
import type { TopicField } from "@/types/content";
// 型のみ import（"use client" のランタイムは取り込まれない＝サーバーから安全に参照できる）。
import type { WordProgress } from "@/lib/wordlistProgress";

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
};

export type ProfileRow = {
  user_id: string;
  it_experience: string | null;
  daily_minutes: string | null;
  exam_plan: string | null;
  confidence: number | null;
  // 新(ITパスポート学習コーチ)
  exam_date: string | null;
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
