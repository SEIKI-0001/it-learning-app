import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { setUserPlan, setUserPlanByCustomer } from "@/lib/billing/plan";

export const runtime = "nodejs";

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
    await handleEvent(event);
  } catch (e) {
    // 処理に失敗しても 200 以外を返すと Stripe がリトライし続けるため、
    // 詳細はログに残しつつ受領は返す。
    console.error("[billing] webhook handling error:", e);
  }

  return NextResponse.json({ received: true });
}

type StripeEvent = {
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
      if (userId) {
        await setUserPlan(userId, "pro", {
          stripeCustomerId: customerId ?? undefined,
        });
      }
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
