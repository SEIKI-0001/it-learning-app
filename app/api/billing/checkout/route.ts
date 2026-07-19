import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { getBillingPlan } from "@/lib/billing/constants";
import { getStripeCustomerId } from "@/lib/billing/plan";

export const runtime = "nodejs";

/** checkout 後に戻せるアプリ内パスのホワイトリスト。 */
const RETURN_PATHS = ["/more", "/ai-grading"] as const;

/**
 * POST /api/billing/checkout
 * body: { plan: BillingPlanKey, returnTo?: string, userId?: string }
 * Pro プランの Stripe Checkout Session を作成し、その URL を返す。
 *
 * - 買い切り（one_*）: mode=payment。webhook が pro_until を延長する。
 * - サブスク（sub_monthly）: mode=subscription。初月20%オフのクーポンを適用。
 * - Stripe 未設定（STRIPE_SECRET_KEY / 対象 Price ID 無し）: 503（準備中）
 * - userId 無し: 400（誰の課金か紐づけられない）
 * - 作成成功: 200 { ok: true, url }
 *
 * Stripe SDK は追加せず REST（application/x-www-form-urlencoded）で呼ぶ。
 * 支払い完了は /api/billing/webhook が受けてプランを反映する。
 */
export async function POST(request: Request) {
  let body: { userId?: string; plan?: string; returnTo?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストの形式が正しくありません。" },
      { status: 400 }
    );
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Proプランの購入にはログインが必要です（誰のアカウントか紐づけるため）。",
      },
      { status: 400 }
    );
  }

  const plan = getBillingPlan(body.plan);
  if (!plan) {
    return NextResponse.json(
      { ok: false, error: "プランの指定が正しくありません。" },
      { status: 400 }
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const price = process.env[plan.priceEnv]?.trim();
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    ""
  ).trim();

  if (!secret || !price) {
    return NextResponse.json(
      { ok: false, error: "決済は現在準備中です。もうしばらくお待ちください。" },
      { status: 503 }
    );
  }

  const returnTo = RETURN_PATHS.includes(body.returnTo as (typeof RETURN_PATHS)[number])
    ? (body.returnTo as string)
    : "/more";

  const stripeCustomerId = await getStripeCustomerId(userId);
  if (plan.kind === "subscription" && stripeCustomerId) {
    const subscriptionCheck = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(
        stripeCustomerId,
      )}&status=all&limit=100`,
      { headers: { Authorization: `Bearer ${secret}` } },
    ).catch((error: unknown) => {
      console.error("[billing] stripe subscription check failed:", error);
      return null;
    });

    if (!subscriptionCheck?.ok) {
      const detail = await subscriptionCheck?.text().catch(() => "");
      console.error(
        "[billing] stripe subscription check http",
        subscriptionCheck?.status,
        detail?.slice(0, 500),
      );
      return NextResponse.json(
        { ok: false, error: "決済の開始に失敗しました。時間をおいてお試しください。" },
        { status: 502 },
      );
    }

    const subscriptions = (await subscriptionCheck.json().catch(() => null)) as {
      data?: Array<Record<string, unknown>>;
    } | null;
    const hasActiveProSubscription = subscriptions?.data?.some(
      (subscription) =>
        (subscription.status === "active" || subscription.status === "trialing") &&
        collectPriceIds(subscription).includes(price),
    );
    if (hasActiveProSubscription) {
      return NextResponse.json(
        { ok: false, error: "すでに月額プランをご契約中です。管理画面をご利用ください。" },
        { status: 409 },
      );
    }
  }

  const params = new URLSearchParams();
  params.append("line_items[0][price]", price);
  params.append("line_items[0][quantity]", "1");
  params.set("client_reference_id", userId);
  params.append("metadata[user_id]", userId);
  params.append("metadata[plan_key]", plan.key);
  params.set("success_url", `${appUrl}${returnTo}?checkout=success#billing`);
  params.set("cancel_url", `${appUrl}${returnTo}?checkout=cancel#billing`);

  if (plan.kind === "subscription") {
    params.set("mode", "subscription");
    if (stripeCustomerId) params.set("customer", stripeCustomerId);
    // サブスクリプション側にも user_id を持たせ、解約/更新の webhook で紐づける。
    params.append("subscription_data[metadata][user_id]", userId);
    // 初月20%オフ（クーポン未設定なら割引なしで続行）。
    const coupon = process.env.STRIPE_COUPON_FIRST_MONTH?.trim();
    if (coupon) params.append("discounts[0][coupon]", coupon);
  } else {
    params.set("mode", "payment");
    params.append("metadata[months]", String(plan.months));
    // 買い切りでも customer を作り、購入履歴・領収書・portal 参照に使えるようにする。
    if (stripeCustomerId) params.set("customer", stripeCustomerId);
    else params.set("customer_creation", "always");
  }

  let res: Response;
  try {
    res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch (e) {
    console.error("[billing] stripe checkout request failed:", e);
    return NextResponse.json(
      { ok: false, error: "決済の開始に失敗しました。時間をおいてお試しください。" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[billing] stripe checkout http", res.status, detail.slice(0, 500));
    return NextResponse.json(
      { ok: false, error: "決済の開始に失敗しました。時間をおいてお試しください。" },
      { status: 502 }
    );
  }

  const session = (await res.json().catch(() => null)) as { url?: string } | null;
  if (!session?.url) {
    return NextResponse.json(
      { ok: false, error: "決済の開始に失敗しました。時間をおいてお試しください。" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, url: session.url });
}

function collectPriceIds(value: Record<string, unknown>): string[] {
  const ids = new Set<string>();

  function walk(item: unknown): void {
    if (Array.isArray(item)) {
      item.forEach(walk);
      return;
    }
    if (!item || typeof item !== "object") return;

    const record = item as Record<string, unknown>;
    if (record.object === "price" && typeof record.id === "string") {
      ids.add(record.id);
    }
    if (record.price && typeof record.price === "object") {
      const priceId = (record.price as Record<string, unknown>).id;
      if (typeof priceId === "string") ids.add(priceId);
    }
    Object.values(record).forEach(walk);
  }

  walk(value);
  return [...ids];
}
