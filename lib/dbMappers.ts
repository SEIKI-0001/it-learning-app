import type { UserProfile, UserProgress } from "@/types";

// DB（snake_case の行）と アプリ内の型（camelCase）の相互変換。
// サーバー側 API Route からのみ使用する。

export type ProgressRow = {
  user_id: string;
  current_day: number;
  exp: number;
  level: number;
  completed_days: number[] | null;
  streak_count: number;
  weak_tags: string[] | null;
  last_played_at: string | null;
};

export type ProfileRow = {
  user_id: string;
  it_experience: string | null;
  daily_minutes: string | null;
  exam_plan: string | null;
  confidence: number | null;
};

export function progressRowToProgress(row: ProgressRow): UserProgress {
  return {
    level: row.level,
    exp: row.exp,
    currentDay: row.current_day,
    completedDays: row.completed_days ?? [],
    streakCount: row.streak_count,
    weakTags: row.weak_tags ?? [],
    lastPlayedAt: row.last_played_at ?? undefined,
  };
}

export function progressToRow(userId: string, p: UserProgress): ProgressRow & { updated_at: string } {
  return {
    user_id: userId,
    current_day: p.currentDay,
    exp: p.exp,
    level: p.level,
    completed_days: p.completedDays,
    streak_count: p.streakCount,
    weak_tags: p.weakTags,
    last_played_at: p.lastPlayedAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function profileRowToProfile(row: ProfileRow): UserProfile {
  return {
    itExperience: row.it_experience ?? "",
    dailyMinutes: row.daily_minutes ?? "",
    examPlan: row.exam_plan ?? "",
    confidence: row.confidence ?? 0,
  };
}

export function profileToRow(userId: string, p: UserProfile): ProfileRow & { updated_at: string } {
  return {
    user_id: userId,
    it_experience: p.itExperience,
    daily_minutes: p.dailyMinutes,
    exam_plan: p.examPlan,
    confidence: p.confidence,
    updated_at: new Date().toISOString(),
  };
}
