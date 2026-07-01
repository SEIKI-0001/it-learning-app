import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { setUserPlan, setUserPlanByCustomer } from "@/lib/billing/plan";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

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

  try {
    const shouldProcess = await reserveStripeWebhookEvent(event);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    await handleEvent(event);
  } catch (e) {
    // 処理に失敗しても 200 以外を返すと Stripe がリトライし続けるため、
    // 詳細はログに残しつつ受領は返す。
    console.error("[billing] webhook handling error:", e);
  }

  return NextResponse.json({ received: true });
}

type StripeEvent = {
  id?: string;
  type: string;
  data: { object: Record<string, unknown> };
};

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

async function reserveStripeWebhookEvent(event: StripeEvent): Promise<boolean> {
  const eventId = asString(event.id);
  if (!eventId) {
    console.warn("[billing] webhook event without id; idempotency skipped");
    return true;
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn("[billing] Supabase unavailable; webhook idempotency skipped");
    return true;
  }

  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: event.type,
  });

  if (!error) return true;
  if (error.code === "23505") return false;

  console.error("[billing] webhook idempotency insert failed:", error.message);
  return true;
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
