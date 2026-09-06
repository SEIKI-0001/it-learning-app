// GF-P0-006 通知設定の正規化と行変換（純関数）。
//
// 通知は明示オプトイン制なので、「行が無い＝送らない」を既定値として扱う。
// クライアントから来た値は必ずここで正規化してから保存する（不正値で判定を壊さない）。

import type { NotificationPreference } from "@/types/notification";
import { DEFAULT_NOTIFICATION_PREFERENCE } from "@/types/notification";
import { isValidTimeZone } from "@/lib/notifications/schedule";

export type NotificationPreferenceRow = {
  user_id: string;
  opt_in: boolean;
  remind_hour: number;
  timezone: string;
  daily_reminder: boolean;
  streak_risk: boolean;
  comeback: boolean;
};

export function preferenceRowToPreference(
  row: Pick<
    NotificationPreferenceRow,
    "opt_in" | "remind_hour" | "timezone" | "daily_reminder" | "streak_risk" | "comeback"
  >,
): NotificationPreference {
  return {
    optIn: Boolean(row.opt_in),
    remindHour: normalizeRemindHour(row.remind_hour),
    timezone: normalizeTimeZone(row.timezone),
    dailyReminder: Boolean(row.daily_reminder),
    streakRisk: Boolean(row.streak_risk),
    comeback: Boolean(row.comeback),
  };
}

export function preferenceToRow(
  userId: string,
  preference: NotificationPreference,
): NotificationPreferenceRow {
  return {
    user_id: userId,
    opt_in: preference.optIn,
    remind_hour: preference.remindHour,
    timezone: preference.timezone,
    daily_reminder: preference.dailyReminder,
    streak_risk: preference.streakRisk,
    comeback: preference.comeback,
  };
}

function normalizeRemindHour(value: unknown): number {
  const hour = Math.trunc(Number(value));
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    return DEFAULT_NOTIFICATION_PREFERENCE.remindHour;
  }
  return hour;
}

function normalizeTimeZone(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_NOTIFICATION_PREFERENCE.timezone;
  const tz = value.trim();
  if (!tz || tz.length > 64 || !isValidTimeZone(tz)) {
    return DEFAULT_NOTIFICATION_PREFERENCE.timezone;
  }
  return tz;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * API に届いた任意の入力を、保存してよい設定へ正規化する。
 * 欠けている項目は現在値（無ければ既定値）を引き継ぐので、部分更新に使える。
 */
export function normalizeNotificationPreferenceInput(
  input: unknown,
  current: NotificationPreference = DEFAULT_NOTIFICATION_PREFERENCE,
): NotificationPreference {
  const raw = (input ?? {}) as Partial<Record<keyof NotificationPreference, unknown>>;
  return {
    optIn: normalizeBoolean(raw.optIn, current.optIn),
    remindHour:
      raw.remindHour === undefined
        ? current.remindHour
        : normalizeRemindHour(raw.remindHour),
    timezone:
      raw.timezone === undefined ? current.timezone : normalizeTimeZone(raw.timezone),
    dailyReminder: normalizeBoolean(raw.dailyReminder, current.dailyReminder),
    streakRisk: normalizeBoolean(raw.streakRisk, current.streakRisk),
    comeback: normalizeBoolean(raw.comeback, current.comeback),
  };
}
