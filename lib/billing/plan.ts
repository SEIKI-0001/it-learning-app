// プラン判定・利用回数の集計・採点ログの記録（サーバー専用）。
// すべて Supabase の service role 経由。未設定 / userId 無しのときは graceful に
// フォールバック（plan=free / 利用 0 件 / ログ記録スキップ）して UI を止めない。

import { getServiceSupabase } from "@/lib/supabaseServer";
import type { GradeProviderId } from "@/lib/ai/gradingCore";
import type { Plan } from "@/lib/billing/constants";

/** ユーザーの契約プランを取得する。userId 無し / 未設定 / 行なしは "free"。 */
export async function getUserPlan(userId: string | null): Promise<Plan> {
  if (!userId) return "free";
  const supabase = getServiceSupabase();
  if (!supabase) return "free";

  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return "free";
  return data.plan === "pro" ? "pro" : "free";
}

/** ユーザーのプランを設定する（Stripe webhook などから呼ぶ）。失敗しても投げない。 */
export async function setUserPlan(
  userId: string,
  plan: Plan,
  extra?: { stripeCustomerId?: string }
): Promise<boolean> {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const row: Record<string, unknown> = {
    user_id: userId,
    plan,
    plan_updated_at: new Date().toISOString(),
  };
  if (extra?.stripeCustomerId) row.stripe_customer_id = extra.stripeCustomerId;

  const { error } = await supabase
    .from("user_profiles")
    .upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("[billing] setUserPlan failed:", error.message);
    return false;
  }
  return true;
}

/** Stripe の customer ID からユーザーを引いてプランを更新する（解約・更新時）。 */
export async function setUserPlanByCustomer(
  stripeCustomerId: string,
  plan: Plan
): Promise<boolean> {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("user_profiles")
    .update({ plan, plan_updated_at: new Date().toISOString() })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    console.error("[billing] setUserPlanByCustomer failed:", error.message);
    return false;
  }
  return true;
}

/**
 * 当日（UTC基準）のそのユーザーの「成功した採点」件数を数える。userId 無しは 0。
 * 失敗（error）・上限超過（rate_limited）はカウントせず、回数の消費は採点が成立した分だけ。
 */
export async function countTodayUsage(userId: string | null): Promise<number> {
  if (!userId) return 0;
  const supabase = getServiceSupabase();
  if (!supabase) return 0;

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("[billing] countTodayUsage failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** AI 採点の利用ログを 1 件記録する。userId 無し / 未設定はスキップ（投げない）。 */
export async function logUsage(entry: {
  userId: string | null;
  provider: GradeProviderId;
  model: string;
  questionId: string;
  status: "success" | "error" | "rate_limited";
}): Promise<void> {
  if (!entry.userId) return;
  const supabase = getServiceSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("ai_usage_logs").insert({
    user_id: entry.userId,
    provider: entry.provider,
    model: entry.model,
    question_id: entry.questionId,
    status: entry.status,
  });
  if (error) {
    // ログ記録の失敗は採点体験を止めない（サーバーログにだけ残す）。
    console.error("[billing] logUsage failed:", error.message);
  }
}
