// API Route 用のユーザー解決処理。
//
// 既存設計に合わせ、現状はクライアントから body で送られる userId を採用する。
// 将来 HttpOnly cookie ベースの認証へ移行する場合は、この関数だけを差し替えれば
// 各 API Route のユーザー解決経路を一括で切り替えられる（呼び出し側は変更不要）。

/** body の userId（または将来 cookie）から user_id を解決する。無ければ null。 */
export function resolveUserId(body: { userId?: string }): string | null {
  const fromBody = (body.userId ?? "").trim();
  if (fromBody) return fromBody;
  // 将来: ここで HttpOnly cookie / セッションから user_id を解決する。
  return null;
}
