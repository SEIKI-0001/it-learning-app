// プラン判定・エンタイトルメント（記録可否）・利用回数の集計・採点ログの記録（サーバー専用）。
// すべて Supabase の service role 経由。未設定 / userId 無しのときは graceful に
// フォールバック（plan=free / 利用 0 件 / ログ記録スキップ）して UI を止めない。

import { getServiceSupabase } from "@/lib/supabaseServer";
import type { GradeProviderId } from "@/lib/ai/gradingCore";
import {
  BILLING_PLANS,
  DAILY_LIMITS,
  FREE_RECORDING_DAYS,
  PLAN_PROVIDER,
  PROVIDER_LABEL,
  type BillingPlanKey,
  type Plan,
} from "@/lib/billing/constants";
import type { AiGradingBillingStatus } from "@/types/aiGrading";
import type {
  BillingEntitlements,
  BillingPlanOffer,
  BillingPurchaseRecord,
  BillingSubscriptionInfo,
} from "@/types/billing";

type ProfileBillingRow = {
  plan: string | null;
  pro_until: string | null;
  stripe_customer_id: string | null;
};

/** user_profiles の課金関連列を読む。行なし / 未設定は null。 */
async function getProfileBillingRow(
  userId: string | null,
): Promise<ProfileBillingRow | null> {
  if (!userId) return null;
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan, pro_until, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileBillingRow;
}

function isProProfile(row: ProfileBillingRow | null): {
  isPro: boolean;
  proSource: BillingEntitlements["proSource"];
} {
  if (!row) return { isPro: false, proSource: "none" };
  // plan='pro' はサブスク契約中（webhookが更新）または管理者の手動付与。
  if (row.plan === "pro") return { isPro: true, proSource: "subscription" };
  if (row.pro_until && new Date(row.pro_until).getTime() > Date.now()) {
    return { isPro: true, proSource: "one_time" };
  }
  return { isPro: false, proSource: "none" };
}

/** ユーザーの契約プランを取得する。userId 無し / 未設定 / 行なしは "free"。 */
export async function getUserPlan(userId: string | null): Promise<Plan> {
  const row = await getProfileBillingRow(userId);
  return isProProfile(row).isPro ? "pro" : "free";
}

/** portal セッション作成などに使う Stripe customer ID。無ければ null。 */
export async function getStripeCustomerId(userId: string | null): Promise<string | null> {
  const row = await getProfileBillingRow(userId);
  return row?.stripe_customer_id ?? null;
}

/**
 * エンタイトルメント（Pro判定＋学習記録の可否）を取得する。
 * - 記録可否: Pro もしくは 登録日（line_users.created_at）から FREE_RECORDING_DAYS 日以内。
 * - 匿名 / 登録日不明のときは記録可として扱う（書き込み側は userId 無しで元々 no-op）。
 */
export async function getEntitlements(
  userId: string | null,
): Promise<BillingEntitlements> {
  const row = await getProfileBillingRow(userId);
  const { isPro, proSource } = isProProfile(row);

  let registeredAt: string | null = null;
  if (userId) {
    const supabase = getServiceSupabase();
    if (supabase) {
      const { data } = await supabase
        .from("line_users")
        .select("created_at")
        .eq("id", userId)
        .maybeSingle();
      registeredAt = (data?.created_at as string | undefined) ?? null;
    }
  }

  let freeRecordingUntil: string | null = null;
  let freeDaysLeft: number | null = null;
  let canRecordStudy = true;
  if (!isPro && registeredAt) {
    const until =
      new Date(registeredAt).getTime() + FREE_RECORDING_DAYS * 24 * 60 * 60 * 1000;
    freeRecordingUntil = new Date(until).toISOString();
    const msLeft = until - Date.now();
    canRecordStudy = msLeft > 0;
    freeDaysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }

  return {
    isPro,
    proSource,
    proUntil: row?.pro_until ?? null,
    registeredAt,
    freeRecordingUntil,
    canRecordStudy,
    freeDaysLeft,
  };
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
 * 買い切り購入を反映する（webhook から呼ぶ）。
 * - pro_until を max(now, 現在の pro_until) + months ヶ月へ延長。
 * - billing_purchases へ冪等 insert（checkout session ID の unique 制約で重複を無視）。
 * 課金状態のため、保存できなかった場合は例外にする（webhook が 5xx → Stripe 再送）。
 */
export async function applyOneTimePurchase(entry: {
  userId: string;
  planKey: BillingPlanKey;
  months: number;
  amountTotal: number | null;
  currency: string | null;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
}): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  // 冪等化: 先に購入履歴を insert し、既に同じ checkout session が記録済みなら
  // pro_until の再延長をスキップする（webhook 再送で期間が二重加算されるのを防ぐ）。
  const { error: insertError } = await supabase.from("billing_purchases").insert({
    user_id: entry.userId,
    kind: "one_time",
    plan_key: entry.planKey,
    months: entry.months,
    amount_total: entry.amountTotal,
    currency: entry.currency,
    stripe_checkout_session_id: entry.stripeCheckoutSessionId,
    stripe_payment_intent_id: entry.stripePaymentIntentId,
  });
  if (insertError) {
    if (insertError.code === "23505") return; // 重複＝処理済み
    throw new Error(`Could not record purchase: ${insertError.message}`);
  }

  const row = await getProfileBillingRow(entry.userId);
  const currentUntil = row?.pro_until ? new Date(row.pro_until).getTime() : 0;
  const base = new Date(Math.max(Date.now(), currentUntil));
  base.setUTCMonth(base.getUTCMonth() + entry.months);

  const update: Record<string, unknown> = {
    user_id: entry.userId,
    pro_until: base.toISOString(),
    plan_updated_at: new Date().toISOString(),
  };
  if (entry.stripeCustomerId) update.stripe_customer_id = entry.stripeCustomerId;

  const { error } = await supabase
    .from("user_profiles")
    .upsert(update, { onConflict: "user_id" });
  if (error) {
    console.error("[billing] applyOneTimePurchase failed:", error.message);
    throw new Error(`Could not extend pro_until: ${error.message}`);
  }
}

/** 購入可能なプラン一覧（Price ID が設定済みのものだけ enabled）。 */
export function getPlanOffers(): BillingPlanOffer[] {
  const secret = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  return BILLING_PLANS.map((p) => ({
    key: p.key,
    kind: p.kind,
    months: p.months,
    totalJpy: p.totalJpy,
    perMonthJpy: p.perMonthJpy,
    label: p.label,
    note: p.note,
    enabled: secret && Boolean(process.env[p.priceEnv]?.trim()),
  }));
}

/** 直近の購入履歴（表示用・新しい順）。 */
export async function listPurchases(
  userId: string | null,
  limit = 10,
): Promise<BillingPurchaseRecord[]> {
  if (!userId) return [];
  const supabase = getServiceSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("billing_purchases")
    .select("id, kind, plan_key, months, amount_total, currency, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    kind: r.kind as BillingPurchaseRecord["kind"],
    planKey: r.plan_key as string,
    months: (r.months as number | null) ?? null,
    amountTotal: (r.amount_total as number | null) ?? null,
    currency: (r.currency as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

/**
 * サブスク契約の詳細（更新日・解約予約）を Stripe API から取得する。
 * customer 未保持 / 未設定 / 契約なしは null。表示用のため失敗は握りつぶす。
 */
export async function getSubscriptionInfo(
  userId: string | null,
): Promise<BillingSubscriptionInfo> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return null;

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=5`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{
        status?: string;
        cancel_at_period_end?: boolean;
        items?: { data?: Array<{ current_period_end?: number }> };
        current_period_end?: number;
      }>;
    };
    const sub = body.data?.find(
      (s) => s.status === "active" || s.status === "trialing" || s.status === "past_due",
    );
    if (!sub) return null;
    // current_period_end は API バージョンにより subscription 直下 or item 側にある。
    const periodEnd =
      sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
    return {
      status: sub.status ?? "active",
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    };
  } catch {
    return null;
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

  const checkoutEnabled = getPlanOffers().some((p) => p.enabled);

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
