// プラン判定・利用回数の集計・採点ログの記録（サーバー専用）。
// すべて Supabase の service role 経由。未設定 / userId 無しのときは graceful に
// フォールバック（plan=free / 利用 0 件 / ログ記録スキップ）して UI を止めない。

import { getServiceSupabase } from "@/lib/supabaseServer";
import type { GradeProviderId } from "@/lib/ai/gradingCore";
import {
  DAILY_LIMITS,
  PLAN_PROVIDER,
  PROVIDER_LABEL,
  type Plan,
} from "@/lib/billing/constants";
import type { AiGradingBillingStatus } from "@/types/aiGrading";

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

/**
 * ユーザーのプランを設定する（Stripe webhook などから呼ぶ）。
 *
 * 課金状態は失敗を握りつぶしてはいけないため、保存できなかった場合は例外にする。
 * 呼び出し側のWebhookはこの例外に対して5xxを返し、Stripeの再試行につなげる。
 */
export async function setUserPlan(
  userId: string,
  plan: Plan,
  extra?: { stripeCustomerId?: string }
): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

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
    throw new Error(`Could not update user plan: ${error.message}`);
  }
}

/** Stripe の customer ID からユーザーを引いてプランを更新する（解約・更新時）。 */
export async function setUserPlanByCustomer(
  stripeCustomerId: string,
  plan: Plan
): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ plan, plan_updated_at: new Date().toISOString() })
    .eq("stripe_customer_id", stripeCustomerId)
    .select("user_id");
  if (error) {
    console.error("[billing] setUserPlanByCustomer failed:", error.message);
    throw new Error(`Could not update customer plan: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("No user profile matches the Stripe customer");
  }
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

/** UI 初期表示用のプラン・利用状況をまとめて取得する。 */
export async function getBillingStatusSnapshot(
  userId: string | null,
): Promise<AiGradingBillingStatus & { provider: GradeProviderId }> {
  const plan = await getUserPlan(userId);
  const provider = PLAN_PROVIDER[plan];
  const limit = DAILY_LIMITS[plan];
  const used = await countTodayUsage(userId);

  const checkoutEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID_PRO?.trim(),
  );

  return {
    plan,
    provider,
    providerLabel: PROVIDER_LABEL[provider],
    usage: {
      used,
      limit,
      remaining: Math.max(0, limit - used),
    },
    // userId がなければ回数の追跡・Proへのアップグレードはできない。
    tracked: Boolean(userId),
    checkoutEnabled,
  };
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
