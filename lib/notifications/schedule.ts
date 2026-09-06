// GF-P0-006 通知判定（純関数・保存なし・I/O なし）。
//
// 「誰に・いつ・どの通知を1通だけ送るか」をここだけで決める。DB も fetch も触らないので、
// 送信側の障害と判定ロジックを分けてテストできる。
//
// 守る約束:
//   - 未オプトインには何も送らない。行が無い＝送らない。
//   - 当日すでに学習したユーザーへ定時リマインドを送らない。
//   - 1ユーザー・1ローカル日につき通知は最大1通（種別横断の上限）。
//   - 責めない。判定は「送るかどうか」だけで、ペナルティも学習データの変更も持たない。

import type { NotificationPreference, NotificationType } from "@/types/notification";
import { DEFAULT_NOTIFICATION_PREFERENCE } from "@/types/notification";

/** ストリーク危機通知を出す保険の時刻（ローカル時）。 */
export const STREAK_RISK_HOUR = 21;

/** ストリーク危機扱いにする最小の連続日数（1日では「危機」にしない）。 */
export const STREAK_RISK_MIN_STREAK = 2;

/** 復帰通知の対象になる離脱日数。 */
export const COMEBACK_MIN_DAYS_AWAY = 3;

/** 1ユーザー・1ローカル日あたりの通知上限（種別を合わせた総数）。 */
export const MAX_NOTIFICATIONS_PER_LOCAL_DAY = 1;

/** IANA タイムゾーンとして解釈できるか。 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** 解釈できないタイムゾーンは既定（Asia/Tokyo）に落とす。判定を止めないため。 */
export function resolveTimeZone(timeZone: string): string {
  return isValidTimeZone(timeZone) ? timeZone : DEFAULT_NOTIFICATION_PREFERENCE.timezone;
}

type LocalParts = { date: string; hour: number };

/**
 * 指定タイムゾーンでのローカル日付("YYYY-MM-DD")と時(0〜23)。
 * en-CA は ISO 相当の "YYYY-MM-DD" を返すため、文字列組み立てをせずに済む。
 */
export function localParts(at: Date, timeZone: string): LocalParts {
  const tz = resolveTimeZone(timeZone);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  // hourCycle: "h23" を指定しないと 24 時が返る環境がある。
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(at),
  );
  return { date, hour };
}

/** そのタイムゾーンでの「今日」の日付。 */
export function localDateInTimeZone(at: Date, timeZone: string): string {
  return localParts(at, timeZone).date;
}

/** ローカル日付文字列同士の日数差（later - earlier）。 */
export function diffLocalDays(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * 最後の学習からローカル日付で何日空いたか。学習履歴が無ければ null。
 * UTC の経過時間ではなくローカル日付境界で数える（JST 23:50 の学習を翌日扱いにしない）。
 */
export function daysAwayInTimeZone(
  lastPlayedAt: string | null | undefined,
  now: Date,
  timeZone: string,
): number | null {
  if (!lastPlayedAt) return null;
  const parsed = Date.parse(lastPlayedAt);
  if (!Number.isFinite(parsed)) return null;
  const last = localDateInTimeZone(new Date(parsed), timeZone);
  const today = localDateInTimeZone(now, timeZone);
  return Math.max(0, diffLocalDays(last, today));
}

/** そのユーザーのローカル日で、今日すでに学習しているか。 */
export function hasStudiedOnLocalDate(
  lastPlayedAt: string | null | undefined,
  now: Date,
  timeZone: string,
): boolean {
  return daysAwayInTimeZone(lastPlayedAt, now, timeZone) === 0;
}

function isTypeEnabled(
  preference: NotificationPreference,
  type: NotificationType,
): boolean {
  if (type === "daily_reminder") return preference.dailyReminder;
  if (type === "streak_risk") return preference.streakRisk;
  return preference.comeback;
}

export type NotificationCandidate = {
  preference: NotificationPreference;
  /** user_progress.last_played_at（未学習なら null）。 */
  lastPlayedAt: string | null;
  streakCount: number;
  /** 同じローカル日にすでに記録済みの通知種別。 */
  deliveredTypesToday: NotificationType[];
};

export type NotificationDecision = {
  type: NotificationType;
  localDate: string;
  /** 通知文で使う付随情報。文言側が再計算しないで済むように渡す。 */
  daysAway: number | null;
  streakCount: number;
};

/**
 * この瞬間にこのユーザーへ送る通知を1つだけ決める。送らないなら null。
 *
 * 優先順位は 復帰 > ストリーク危機 > 定時リマインド。上位が停止されていれば
 * 下位へ落ちる（「復帰通知だけ切ったら毎日のリマインドまで止まった」を避ける）。
 */
export function decideNotification(
  candidate: NotificationCandidate,
  now: Date,
): NotificationDecision | null {
  const { preference, lastPlayedAt, streakCount, deliveredTypesToday } = candidate;
  if (!preference.optIn) return null;

  const timeZone = resolveTimeZone(preference.timezone);
  const { date: localDate, hour } = localParts(now, timeZone);

  // 種別横断の上限。ストリーク危機と定時リマインドが同日に重ならない担保でもある。
  if (deliveredTypesToday.length >= MAX_NOTIFICATIONS_PER_LOCAL_DAY) return null;

  // 当日学習済みなら定時リマインドもストリーク危機も不要（復帰も定義上あり得ない）。
  if (hasStudiedOnLocalDate(lastPlayedAt, now, timeZone)) return null;

  const atRemindHour = hour === preference.remindHour;
  const atStreakRiskHour =
    hour === STREAK_RISK_HOUR && preference.remindHour < STREAK_RISK_HOUR;
  if (!atRemindHour && !atStreakRiskHour) return null;

  const daysAway = daysAwayInTimeZone(lastPlayedAt, now, timeZone);
  const streakAtRisk = streakCount >= STREAK_RISK_MIN_STREAK;

  const ordered: NotificationType[] = [];
  if (atRemindHour) {
    if (daysAway !== null && daysAway >= COMEBACK_MIN_DAYS_AWAY) ordered.push("comeback");
    if (streakAtRisk) ordered.push("streak_risk");
    ordered.push("daily_reminder");
  } else if (streakAtRisk) {
    // 設定時刻を過ぎても未学習のままの保険。ここでは危機通知だけを出す。
    ordered.push("streak_risk");
  }

  const type = ordered.find(
    (t) => isTypeEnabled(preference, t) && !deliveredTypesToday.includes(t),
  );
  if (!type) return null;

  return { type, localDate, daysAway, streakCount };
}
