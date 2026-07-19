import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  applyOneTimePurchase,
  getStoredStripeSubscription,
  recordStripeSubscriptionEvent,
  setUserPlan,
  setUserPlanByCustomer,
} from "@/lib/billing/plan";
import { BILLING_PLANS, getBillingPlan } from "@/lib/billing/constants";
import { hasActiveProSubscription } from "@/lib/billing/subscriptionState";
import {
  STALE_WEBHOOK_PROCESSING_SECONDS,
  shouldRetryWebhookEvent,
  type StripeWebhookEventStatus,
} from "@/lib/billing/webhookState";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
type WebhookEventRow = {
  event_id: string;
  status: StripeWebhookEventStatus | null;
  attempt_count: number | null;
  updated_at: string | null;
};

/**
 * POST /api/billing/webhook
 * Stripe からの webhook を受け、支払い完了・解約・更新に応じて plan を更新する。
 *
 * - STRIPE_WEBHOOK_SECRET 未設定: 503
 * - 署名検証 NG: 400
 * - 処理成功: 200 { received: true }
 *
 * Stripe SDK は使わず、署名検証（HMAC-SHA256）を node:crypto で自前検証する。
 * 生のリクエストボディ（request.text()）でハッシュを取る必要がある点に注意。
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "webhook not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 400 }
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const reservation = await reserveStripeWebhookEvent(event);
  if (!reservation.shouldProcess) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await processStripeWebhookEvent(event);
  } catch (e) {
    console.error("[billing] webhook handling error:", e);
    // 課金状態を反映できていないため、Stripe の再送を要求する。
    return NextResponse.json(
      { ok: false, error: "webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

export type StripeEvent = {
  id?: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

/**
 * 予約済みのStripeイベントを処理して状態を確定する。
 * Webhook本体と管理画面の手動再処理で同じ経路を通す。
 */
export async function processStripeWebhookEvent(event: StripeEvent): Promise<void> {
  try {
    await handleEvent(event);
    await markStripeWebhookEvent(event, "succeeded");
  } catch (error) {
    await markStripeWebhookEvent(event, "failed", errorMessage(error)).catch((markError) => {
      console.error("[billing] webhook failure status update error:", markError);
    });
    throw error;
  }
}

/** イベント種別ごとに plan を更新する。 */
async function handleEvent(event: StripeEvent): Promise<void> {
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const userId =
        asString(obj.client_reference_id) ?? metadataUserId(obj.metadata);
      const customerId = asString(obj.customer);
      if (!userId) {
        console.warn("[billing] checkout completed without user_id");
        return;
      }
      // 買い切り（mode=payment）は pro_until を延長、サブスクは plan を pro に更新。
      if (asString(obj.mode) === "payment") {
        await handleOneTimeCheckout(obj, userId, customerId);
        return;
      }
      if (!(await checkoutSessionCanActivatePro(obj))) return;
      await setUserPlan(userId, "pro", {
        stripeCustomerId: customerId ?? undefined,
      });
      return;
    }

    case "customer.subscription.updated": {
      await handleSubscriptionEvent(event, obj);
      return;
    }

    case "customer.subscription.deleted": {
      await handleSubscriptionEvent(event, obj);
      return;
    }

    default:
      // 興味のないイベントは無視（受領のみ）。
      return;
  }
}

type StripeSubscriptionSummary = {
  id: string;
  customerId: string;
  status: string;
  priceIds: string[];
};

/** subscriptionイベントをID・event.created順で保存し、Stripeの現在状態から再計算する。 */
async function handleSubscriptionEvent(
  event: StripeEvent,
  obj: Record<string, unknown>,
): Promise<void> {
  if (!Number.isInteger(event.created) || event.created < 0) {
    throw new Error("Stripe subscription event is missing a valid created timestamp");
  }
  const subscriptionId = asString(obj.id);
  if (!subscriptionId) {
    throw new Error("Stripe subscription event is missing a subscription id");
  }

  const stored = await getStoredStripeSubscription(subscriptionId);
  const payloadCustomerId = asString(obj.customer);
  const payloadPriceIds = collectPriceIds(obj);
  const payloadStatus = asString(obj.status) ?? "canceled";
  let fetchedSubscription: StripeSubscriptionSummary | null = null;

  if (!payloadCustomerId || payloadPriceIds.length === 0) {
    fetchedSubscription = await fetchStripeSubscription(subscriptionId);
  }

  const customerId =
    payloadCustomerId ?? fetchedSubscription?.customerId ?? stored?.stripe_customer_id;
  if (!customerId) {
    throw new Error("Stripe subscription event is missing a customer id");
  }

  const priceIds =
    payloadPriceIds.length > 0
      ? payloadPriceIds
      : fetchedSubscription?.priceIds ?? (stored?.price_id ? [stored.price_id] : []);
  const userId = metadataUserId(obj.metadata) ?? stored?.user_id ?? null;
  const accepted = await recordStripeSubscriptionEvent({
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
    userId,
    priceId: priceIds[0] ?? null,
    status: fetchedSubscription?.status ?? payloadStatus,
    eventCreated: event.created,
  });
  if (!accepted) return;

  const currentSubscriptions = await fetchStripeSubscriptions(customerId);
  if (!currentSubscriptions) {
    throw new Error("Could not reconcile Stripe subscriptions for customer");
  }

  const proPriceId = process.env.STRIPE_PRICE_ID_PRO_SUB?.trim();
  if (!proPriceId) {
    throw new Error("STRIPE_PRICE_ID_PRO_SUB is not configured");
  }

  const keepsSubscriptionPro = hasActiveProSubscription(
    currentSubscriptions,
    proPriceId,
  );
  const plan = keepsSubscriptionPro ? "pro" : "free";
  if (userId) {
    await setUserPlan(userId, plan, { stripeCustomerId: customerId });
  } else {
    await setUserPlanByCustomer(customerId, plan);
  }
}

async function reserveStripeWebhookEvent(
  event: StripeEvent,
): Promise<{ shouldProcess: boolean }> {
  const eventId = asString(event.id);
  if (!eventId) {
    throw new Error("Stripe webhook event is missing an event id");
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: event.type,
    event_payload: event,
    status: "processing",
    attempt_count: 1,
    updated_at: now,
  });

  if (!error) return { shouldProcess: true };
  if (error.code !== "23505") {
    throw new Error(`Could not reserve Stripe webhook event: ${error.message}`);
  }

  const { data: existing, error: readError } = await supabase
    .from("stripe_webhook_events")
    .select("event_id, status, attempt_count, updated_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (readError || !existing) {
    throw new Error(
      `Could not read existing Stripe webhook event: ${readError?.message ?? "not found"}`,
    );
  }

  const current = existing as WebhookEventRow;
  const status = current.status ?? "succeeded";
  if (status === "succeeded") return { shouldProcess: false };

  if (!shouldRetryWebhookEvent(status, current.updated_at)) {
    return { shouldProcess: false };
  }

  let claimQuery = supabase
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempt_count: Math.max(1, current.attempt_count ?? 0) + 1,
      last_error: null,
      updated_at: now,
    })
    .eq("event_id", eventId)
    .eq("status", status);
  // stale processing の取得では、読み取り後に別ワーカーが更新していないことも確認する。
  if (status === "processing") {
    claimQuery = claimQuery.lt(
      "updated_at",
      new Date(Date.now() - STALE_WEBHOOK_PROCESSING_SECONDS * 1000).toISOString(),
    );
  }
  const { data: claimed, error: claimError } = await claimQuery.select("event_id");
  if (claimError) {
    throw new Error(`Could not claim Stripe webhook retry: ${claimError.message}`);
  }

  return { shouldProcess: (claimed?.length ?? 0) === 1 };
}

async function markStripeWebhookEvent(
  event: StripeEvent,
  status: Extract<StripeWebhookEventStatus, "succeeded" | "failed">,
  lastError: string | null = null,
): Promise<void> {
  const eventId = asString(event.id);
  if (!eventId) throw new Error("Stripe webhook event is missing an event id");

  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const update: Record<string, unknown> = {
    status,
    last_error: lastError,
    processed_at: status === "succeeded" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  // 失敗時だけ保持し、成功後はStripeイベント本文（メールアドレス等を含みうる）を消去する。
  if (status === "succeeded") update.event_payload = null;

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .update(update)
    .eq("event_id", eventId)
    .select("event_id");
  if (error) {
    throw new Error(`Could not mark Stripe webhook event ${status}: ${error.message}`);
  }
  if ((data?.length ?? 0) !== 1) {
    throw new Error(`Stripe webhook event was not found while marking ${status}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 1_000) : "Unknown error";
}

/**
 * 買い切り購入（mode=payment）の checkout 完了を処理する。
 * plan_key は checkout 作成時に metadata へ入れた値。Price ID を対応する env と
 * 照合してから pro_until を延長する。冪等化は applyOneTimePurchase 側で行う。
 */
async function handleOneTimeCheckout(
  obj: Record<string, unknown>,
  userId: string,
  customerId: string | null,
): Promise<void> {
  const paymentStatus = asString(obj.payment_status);
  if (paymentStatus !== "paid") {
    console.warn("[billing] one-time checkout ignored: not paid");
    return;
  }

  const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
  const plan = getBillingPlan(asString(metadata.plan_key));
  if (!plan || plan.kind !== "one_time") {
    console.warn("[billing] one-time checkout ignored: unknown plan_key");
    return;
  }

  const expectedPriceId = process.env[plan.priceEnv]?.trim();
  if (!(await validateCheckoutPrice(obj, expectedPriceId ? [expectedPriceId] : []))) {
    return;
  }

  const sessionId = asString(obj.id);
  if (!sessionId) {
    throw new Error("one-time checkout is missing a session id");
  }

  const amountTotal = typeof obj.amount_total === "number" ? obj.amount_total : null;
  await applyOneTimePurchase({
    userId,
    planKey: plan.key,
    months: plan.months,
    amountTotal,
    currency: asString(obj.currency),
    stripeCheckoutSessionId: sessionId,
    stripePaymentIntentId: asString(obj.payment_intent),
    stripeCustomerId: customerId,
  });
}

async function checkoutSessionCanActivatePro(
  obj: Record<string, unknown>,
): Promise<boolean> {
  const mode = asString(obj.mode);
  if (mode !== "subscription") {
    console.warn("[billing] checkout completed ignored: mode is not subscription");
    return false;
  }

  const paymentStatus = asString(obj.payment_status);
  const subscriptionId = asString(obj.subscription);
  if (!subscriptionId) {
    console.warn("[billing] checkout completed ignored: subscription missing");
    return false;
  }

  if (process.env.STRIPE_SECRET_KEY?.trim()) {
    const subscriptionStatus = await fetchStripeSubscriptionStatus(subscriptionId);
    if (subscriptionStatus === null) {
      throw new Error("Could not verify Stripe subscription status");
    }
    if (subscriptionStatus !== "active" && subscriptionStatus !== "trialing") {
      console.warn("[billing] checkout completed ignored: subscription is not active");
      return false;
    }
  } else if (paymentStatus !== "paid") {
    console.warn("[billing] checkout completed ignored: unpaid subscription missing Stripe API");
    return false;
  }

  const subPlan = BILLING_PLANS.find((p) => p.kind === "subscription");
  const expectedPriceId = subPlan ? process.env[subPlan.priceEnv]?.trim() : undefined;
  return validateCheckoutPrice(obj, expectedPriceId ? [expectedPriceId] : []);
}

async function fetchStripeSubscriptionStatus(
  subscriptionId: string,
): Promise<string | null> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;

  const subscription = await fetchStripeJson(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    secret,
  );
  if (!subscription || typeof subscription !== "object") return null;
  return asString((subscription as Record<string, unknown>).status);
}

async function fetchStripeSubscription(
  subscriptionId: string,
): Promise<StripeSubscriptionSummary | null> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;

  const value = await fetchStripeJson(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    secret,
  );
  if (!value || typeof value !== "object") return null;
  const subscription = value as Record<string, unknown>;
  const customerId = asString(subscription.customer);
  if (!customerId) return null;
  return {
    id: subscriptionId,
    customerId,
    status: asString(subscription.status) ?? "canceled",
    priceIds: collectPriceIds(subscription),
  };
}

async function fetchStripeSubscriptions(
  customerId: string,
): Promise<Array<{ status: string; priceIds: string[] }> | null> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;

  const value = await fetchStripeJson(
    `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
    secret,
  );
  if (!value || typeof value !== "object") return null;
  const data = (value as Record<string, unknown>).data;
  if (!Array.isArray(data)) return null;

  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const subscription = item as Record<string, unknown>;
    return [
      {
        status: asString(subscription.status) ?? "unknown",
        priceIds: collectPriceIds(subscription),
      },
    ];
  });
}

async function validateCheckoutPrice(
  obj: Record<string, unknown>,
  expectedPriceIds: string[],
): Promise<boolean> {
  // 照合先の env が未設定なら検証をスキップ（graceful に通す・既存挙動を踏襲）。
  if (expectedPriceIds.length === 0) return true;

  const directPriceIds = collectPriceIds(obj);
  if (directPriceIds.length > 0) {
    const ok = directPriceIds.some((id) => expectedPriceIds.includes(id));
    if (!ok) console.warn("[billing] checkout completed ignored: unexpected price id");
    return ok;
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const sessionId = asString(obj.id);
  if (!secret || !sessionId) {
    // TODO: payload に line_items が無い場合は Stripe API で Price ID を確認する。
    console.warn("[billing] checkout price validation skipped: line items unavailable");
    return true;
  }

  const lineItems = await fetchStripeJson(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=10`,
    secret,
  );
  if (!lineItems || typeof lineItems !== "object") {
    console.warn("[billing] checkout price validation skipped: Stripe API unavailable");
    return true;
  }

  const fetchedPriceIds = collectPriceIds(lineItems as Record<string, unknown>);
  if (fetchedPriceIds.length === 0) {
    console.warn("[billing] checkout price validation skipped: no price ids in line items");
    return true;
  }

  const ok = fetchedPriceIds.some((id) => expectedPriceIds.includes(id));
  if (!ok) console.warn("[billing] checkout completed ignored: unexpected line item price");
  return ok;
}

async function fetchStripeJson(path: string, secret: string): Promise<unknown | null> {
  try {
    const res = await fetch(`https://api.stripe.com${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[billing] stripe api http", res.status, detail.slice(0, 500));
      return null;
    }
    return res.json();
  } catch (e) {
    console.error("[billing] stripe api request failed:", e);
    return null;
  }
}

function collectPriceIds(value: Record<string, unknown>): string[] {
  const ids = new Set<string>();

  function walk(v: unknown): void {
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (!v || typeof v !== "object") return;

    const record = v as Record<string, unknown>;
    const id = asString(record.id);
    const object = asString(record.object);
    if (object === "price" && id) ids.add(id);

    const price = record.price;
    if (price && typeof price === "object") {
      const priceId = asString((price as Record<string, unknown>).id);
      if (priceId) ids.add(priceId);
    }

    for (const nested of Object.values(record)) walk(nested);
  }

  walk(value);
  return [...ids];
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

function metadataUserId(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object") {
    const v = (metadata as Record<string, unknown>).user_id;
    return asString(v);
  }
  return null;
}

/**
 * Stripe-Signature ヘッダー（例: "t=...,v1=...,v1=..."）を検証する。
 * signedPayload = `${t}.${rawBody}` の HMAC-SHA256 を Webhook Secret で計算し、
 * いずれかの v1 と一致すれば OK。
 */
function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string
): boolean {
  if (!header) return false;

  let timestamp = "";
  const v1Signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    else if (key === "v1" && value) v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || timestampSeconds <= 0) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected);

  return v1Signatures.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return (
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}
