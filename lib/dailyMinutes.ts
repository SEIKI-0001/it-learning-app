// プロフィールに申告された「1日に使える時間」を求める（純関数・依存なし）。
//
// 平日/休日の分数を読む場所はここだけにする。以前は aiPlanner / studyPlanner /
// studyAmount の3か所に同じ処理があり、どれも休日の分数を見ていなかった。
// 休日は土日。祝日は扱わない。

import type { UserProfile } from "@/types";

const FALLBACK_MINUTES = 10;

/** 平日の申告値（分）。 */
export function declaredWeekdayMinutes(profile: UserProfile | undefined): number {
  if (!profile) return FALLBACK_MINUTES;
  if (typeof profile.weekdayMinutes === "number" && profile.weekdayMinutes > 0) {
    return profile.weekdayMinutes;
  }
  const parsed = Number.parseInt(profile.dailyMinutes ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_MINUTES;
}

/** 休日の申告値（分）。未設定なら平日の申告値。 */
export function declaredHolidayMinutes(profile: UserProfile | undefined): number {
  return typeof profile?.holidayMinutes === "number" && profile.holidayMinutes > 0
    ? profile.holidayMinutes
    : declaredWeekdayMinutes(profile);
}

export function isHoliday(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 申告された1日の学習時間（分）。
 * date を渡すと、土日なら休日の分数（未設定なら平日の分数）を返す。
 * 省略時は平日の分数（計画の「1日の目安」表示などの従来の意味）。
 */
export function declaredDailyMinutes(profile: UserProfile | undefined, date?: Date): number {
  return date && isHoliday(date)
    ? declaredHolidayMinutes(profile)
    : declaredWeekdayMinutes(profile);
}
