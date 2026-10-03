/**
 * 新規登録の流入元（first-touch）。
 *
 * - ブラウザ側（AttributionCapture）が初回訪問時の utm_* / ref / 外部 referrer のホスト名を
 *   Cookie（fq_attr）へ保存する。既に Cookie があれば上書きしない（最初の接点を残す）。
 * - /auth/callback が「いま作られたばかりのユーザー」に限り、その値を signup_attributions へ 1 行書く。
 * - ref=beta で登録したユーザーには、先着上限つきで βテスター特典（Pro 期間）を付与する。
 *
 * 個人を特定する情報は扱わない。値は英数と . _ - だけに正規化し、長さも制限する。
 */
import { getServiceSupabase } from "@/lib/supabaseServer";
import type { Attribution } from "@/lib/growth/attributionCookie";

/** 作成からこの時間以内のユーザーだけを「今回の新規登録」とみなす。 */
export const NEW_SIGNUP_WINDOW_MS = 30 * 60 * 1000;

/** βテスター特典。ref=beta で登録した先着 BETA_CAP 名に Pro を BETA_DAYS 日付与する。 */
export const BETA_REF = "beta";
export const BETA_DAYS = 90;
export const BETA_CAP = 10;

export { ATTRIBUTION_COOKIE, parseAttributionCookie } from "@/lib/growth/attributionCookie";
export type { Attribution } from "@/lib/growth/attributionCookie";

export type RecordAttributionResult = {
  recorded: boolean;
  betaGranted: boolean;
};

/**
 * 新規登録直後のユーザーに流入元を記録し、ref=beta なら βテスター特典を付与する。
 * 失敗してもログインは止めない（呼び出し側は結果を表示に使うだけ）。
 */
export async function recordSignupAttribution(
  userId: string,
  attr: Attribution,
  now: number = Date.now(),
): Promise<RecordAttributionResult> {
  const none: RecordAttributionResult = { recorded: false, betaGranted: false };
  const supabase = getServiceSupabase();
  if (!supabase) return none;

  const user = await supabase
    .from("line_users")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();
  const createdAt = user.data?.created_at ? Date.parse(user.data.created_at as string) : NaN;
  if (!Number.isFinite(createdAt) || now - createdAt > NEW_SIGNUP_WINDOW_MS) return none;

  const inserted = await supabase
    .from("signup_attributions")
    .upsert(
      {
        user_id: userId,
        utm_source: attr.utmSource,
        utm_medium: attr.utmMedium,
        utm_campaign: attr.utmCampaign,
        ref: attr.ref,
        referrer_host: attr.referrerHost,
        landing_path: attr.landingPath,
        first_seen_at: attr.firstSeenAt,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (inserted.error) {
    console.error("[growth] signup attribution insert failed:", inserted.error.message);
    return none;
  }

  if (attr.ref !== BETA_REF) return { recorded: true, betaGranted: false };

  const granted = await supabase.rpc("grant_beta_pro", {
    p_user_id: userId,
    p_days: BETA_DAYS,
    p_cap: BETA_CAP,
  });
  if (granted.error) {
    console.error("[growth] grant_beta_pro failed:", granted.error.message);
    return { recorded: true, betaGranted: false };
  }
  return { recorded: true, betaGranted: granted.data === true };
}
