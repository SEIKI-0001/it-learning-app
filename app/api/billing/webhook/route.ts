import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { setUserPlan, setUserPlanByCustomer } from "@/lib/billing/plan";
import {
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
      if (!(await checkoutSessionCanActivatePro(obj))) return;
      await setUserPlan(userId, "pro", {
        stripeCustomerId: customerId ?? undefined,
      });
      return;
    }

    case "customer.subscription.updated": {
      // status が active/trialing なら pro、それ以外は free。
      const status = asString(obj.status);
      const customerId = asString(obj.customer);
      const userId = metadataUserId(obj.metadata);
      const plan =
        status === "active" || status === "trialing" ? "pro" : "free";
      if (userId) {
        await setUserPlan(userId, plan, {
          stripeCustomerId: customerId ?? undefined,
        });
      } else if (customerId) {
        await setUserPlanByCustomer(customerId, plan);
      }
      return;
    }

    case "customer.subscription.deleted": {
      const customerId = asString(obj.customer);
      const userId = metadataUserId(obj.metadata);
      if (userId) {
        await setUserPlan(userId, "free");
      } else if (customerId) {
        await setUserPlanByCustomer(customerId, "free");
      }
      return;
    }

    default:
      // 興味のないイベントは無視（受領のみ）。
      return;
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

  const { data: claimed, error: claimError } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempt_count: Math.max(1, current.attempt_count ?? 0) + 1,
      last_error: null,
      updated_at: now,
    })
    .eq("event_id", eventId)
    .eq("status", status)
    .select("event_id");
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
  if (paymentStatus !== "paid") {
    if (!subscriptionId) {
      console.warn("[billing] checkout completed ignored: paid subscription missing");
      return false;
    }

    const subscriptionStatus = await fetchStripeSubscriptionStatus(subscriptionId);
    if (subscriptionStatus === null) {
      // TODO: Stripe API から subscription が取れない環境では既存のPro反映を優先する。
      console.warn("[billing] subscription status unavailable; preserving checkout behavior");
    } else if (subscriptionStatus !== "active" && subscriptionStatus !== "trialing") {
      console.warn("[billing] checkout completed ignored: subscription is not active");
      return false;
    }
  }

  return validateCheckoutPrice(obj);
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

async function validateCheckoutPrice(obj: Record<string, unknown>): Promise<boolean> {
  const expectedPriceId = process.env.STRIPE_PRICE_ID_PRO?.trim();
  if (!expectedPriceId) return true;

  const directPriceIds = collectPriceIds(obj);
  if (directPriceIds.length > 0) {
    const ok = directPriceIds.includes(expectedPriceId);
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

  const ok = fetchedPriceIds.includes(expectedPriceId);
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
