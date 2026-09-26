// 「ユーザーにとっての今日」をサーバー側で決める（純関数）。
//
// チャット API が受け取る localDate / timezoneOffsetMinutes（Date#getTimezoneOffset の値）を
// 1日の利用上限・今日のまとめの両方で共有する。日本時間なら 0:00 JST で日が変わる。
//
// localDate はクライアントの自己申告なので、サーバーの現在時刻と offset から求めた日付と
// 一致するときだけ採用する（未来・過去の日付を送って上限を回避させない）。

import { localDayStartMs } from "./facts";

/** UTC からのずれの上限（UTC-14:00 〜 UTC+14:00）。 */
const MAX_OFFSET_MINUTES = 14 * 60;

export type MochitClientDay = {
  /** ユーザーのローカル日付（YYYY-MM-DD）。 */
  localDate: string;
  /** Date#getTimezoneOffset と同じ符号（JST は -540）。 */
  timezoneOffsetMinutes: number;
  /** ローカル日付の 0:00 を UTC ミリ秒で表したもの。 */
  dayStartMs: number;
};

export function clampTimezoneOffset(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(-MAX_OFFSET_MINUTES, Math.min(MAX_OFFSET_MINUTES, n));
}

export function resolveMochitClientDay(
  now: Date,
  localDate: unknown,
  timezoneOffsetMinutes: unknown,
): MochitClientDay {
  const offset = clampTimezoneOffset(timezoneOffsetMinutes);
  const derived = new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
  // 端末の時計ずれ等で食い違ったら、offset から求めた日付を正とする
  const date = localDate === derived ? localDate : derived;
  return {
    localDate: date,
    timezoneOffsetMinutes: offset,
    dayStartMs: localDayStartMs(date, offset)!,
  };
}
