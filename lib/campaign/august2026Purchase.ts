import { AUGUST_2026_CAMPAIGN } from "@/lib/campaign/august2026";

const LIVE_CHECKOUT_SESSION_ID = /^cs_live_[A-Za-z0-9]{8,200}$/;

type StripeCheckoutSession = {
  id?: unknown;
  object?: unknown;
  livemode?: unknown;
  status?: unknown;
  payment_status?: unknown;
  mode?: unknown;
  client_reference_id?: unknown;
  metadata?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  line_items?: unknown;
};

export async function verifyAugust2026CampaignPurchase({
  sessionId,
  userId,
}: {
  sessionId: string | string[] | undefined;
  userId: string;
}): Promise<boolean> {
  if (typeof sessionId !== "string" || !LIVE_CHECKOUT_SESSION_ID.test(sessionId)) {
    return false;
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const expectedPriceId = process.env.STRIPE_PRICE_ID_PRO_6M?.trim();
  if (!secret || !expectedPriceId) return false;

  const query = new URLSearchParams({ "expand[]": "line_items.data.price" });
  let response: Response;
  try {
    response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      },
    );
  } catch {
    return false;
  }

  if (!response.ok) return false;
  const session = (await response.json().catch(() => null)) as
    | StripeCheckoutSession
    | null;
  if (!session) return false;

  const metadata = asRecord(session.metadata);
  const lineItems = asRecord(session.line_items);
  const items = Array.isArray(lineItems?.data) ? lineItems.data : [];
  const item = items.length === 1 ? asRecord(items[0]) : null;
  const price = asRecord(item?.price);

  return Boolean(
    session.id === sessionId &&
      session.object === "checkout.session" &&
      session.livemode === true &&
      session.status === "complete" &&
      session.payment_status === "paid" &&
      session.mode === "payment" &&
      session.client_reference_id === userId &&
      metadata?.user_id === userId &&
      metadata?.plan_key === AUGUST_2026_CAMPAIGN.planKey &&
      metadata?.campaign === AUGUST_2026_CAMPAIGN.key &&
      session.amount_total === AUGUST_2026_CAMPAIGN.totalJpy &&
      session.currency === "jpy" &&
      item?.quantity === 1 &&
      item?.amount_total === AUGUST_2026_CAMPAIGN.totalJpy &&
      price?.id === expectedPriceId,
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}
