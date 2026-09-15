// GF-P0-006 LINE学習リマインダーの型。
//
// 通知は明示オプトイン制。設定が無いユーザーは「送らない」が既定で、
// 送信可否・時刻・種別のすべてをユーザーが変更・停止できる。

/** 通知の種類。冪等キー `userId + notificationType + localDate` の一部。 */
export type NotificationType = "daily_reminder" | "streak_risk" | "comeback";

export const NOTIFICATION_TYPES: NotificationType[] = [
  "daily_reminder",
  "streak_risk",
  "comeback",
];

export type NotificationPreference = {
  /** すべての通知の親スイッチ。false なら種別に関わらず送らない。 */
  optIn: boolean;
  /** 定時リマインドを送るローカル時刻の「時」（0〜23）。 */
  remindHour: number;
  /** IANA タイムゾーン。ローカル日付・時刻の判定に使う。 */
  timezone: string;
  /** 種別ごとの停止スイッチ。 */
  dailyReminder: boolean;
  streakRisk: boolean;
  comeback: boolean;
};

/** 未設定ユーザーの既定値。opt-in は false（＝送らない）から始まる。 */
export const DEFAULT_NOTIFICATION_PREFERENCE: NotificationPreference = {
  optIn: false,
  remindHour: 20,
  timezone: "Asia/Tokyo",
  dailyReminder: true,
  streakRisk: true,
  comeback: true,
};

/** 設定画面で選べる時刻（時）。Cron が毎時実行なので分は持たない。 */
export const REMIND_HOUR_OPTIONS = [6, 7, 8, 12, 18, 19, 20, 21, 22] as const;

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  daily_reminder: "毎日のリマインド",
  streak_risk: "連続学習が途切れそうなとき",
  comeback: "しばらく空いたとき",
};
