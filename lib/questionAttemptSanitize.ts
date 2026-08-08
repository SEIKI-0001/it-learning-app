// 回答ログのうち、クライアントが自由に決められる数値・日時を正規化する。
//
// なぜ必要か:
//   timeSpentSeconds は実測難易度（medianTimeSeconds / p90 / unusually_fast 等）の入力に、
//   answeredAt は「いつ答えたか」の集計に使う。どちらもクライアント由来なので、
//   壊れた値・あり得ない値をそのまま保存すると、派生データが静かに歪む。
//   DB 側も time_spent_seconds は integer 列なので、小数や NaN はそもそも入らない。
//
// 方針:
//   - 判定できない値は捨てて null にする（保存自体は止めない）。
//     回答そのもの（何を選んだか・正誤）は残す方が学習記録として価値が高い。
//   - 上限を超えた所要時間は捨てずに上限へ丸める。
//     「時間がかかった」という事実は残しつつ、外れ値が中央値・p90 を壊さないようにする。
//   - 未来日時は受け取らない。端末の時計はずれるので、わずかなずれだけ許容する。

/**
 * 1問あたりの所要時間の上限（秒）。本番モードの制限時間（120分）に合わせる。
 *
 * 1問がこれを超えることは、どのモードでもあり得ない
 * （本番モードは全100問でこの時間、練習モードは時間無制限だが、
 * これを超える値は「タブを開いたまま放置した」ノイズであって所要時間ではない）。
 * 超えた値は捨てずにここへ丸める。
 */
export const MAX_TIME_SPENT_SECONDS = 120 * 60;

/**
 * 許容する未来方向の時計ずれ（ミリ秒）。
 * 端末の時計は数分ずれることがあるので、この範囲は受け入れて丸めない。
 */
export const MAX_ANSWERED_AT_FUTURE_SKEW_MS = 5 * 60 * 1000;

/**
 * これより前の回答日時は壊れた値とみなす。
 * サービス開始より前の日時が入るのは、端末の時計が初期化された場合など。
 */
export const MIN_ANSWERED_AT_ISO = "2020-01-01T00:00:00.000Z";

const MIN_ANSWERED_AT_MS = Date.parse(MIN_ANSWERED_AT_ISO);

/**
 * 所要時間を正規化する。
 *   数値でない / NaN / Infinity … null（判定不能）
 *   負数                        … null（あり得ない）
 *   上限超                      … 上限へ丸める
 *   それ以外                    … 秒単位の整数へ丸める（DB は integer 列）
 */
export function sanitizeTimeSpentSeconds(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null; // NaN / Infinity / -Infinity
  if (value < 0) return null;

  return Math.min(Math.round(value), MAX_TIME_SPENT_SECONDS);
}

/**
 * 回答日時を正規化する。
 *   文字列でない / 日時として解釈できない … null
 *   古すぎる                              … null
 *   未来（許容ずれを超える）              … null
 *   それ以外                              … ISO8601 に正規化して返す
 *
 * null を返した場合、保存側は列の既定値（サーバの now()）に任せる。
 */
export function sanitizeAnsweredAt(
  value: unknown,
  now: Date = new Date(),
): string | null {
  if (typeof value !== "string") return null;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  if (parsed < MIN_ANSWERED_AT_MS) return null;
  if (parsed > now.getTime() + MAX_ANSWERED_AT_FUTURE_SKEW_MS) return null;

  // 表記ゆれ（タイムゾーン付き・ミリ秒なし等）を1つの形に揃えてから保存する。
  return new Date(parsed).toISOString();
}
