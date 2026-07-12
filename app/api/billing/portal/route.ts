import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { getStripeCustomerId } from "@/lib/billing/plan";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal
 * Stripe Customer Portal のセッションを作成し、その URL を返す。
 * サブスクの解約・支払い方法の変更・請求書履歴の確認に使う。
 *
 * - Stripe 未設定: 503
 * - userId 無し: 400
 * - stripe_customer_id 未保持（購入履歴なし）: 404（案内メッセージ）
 * - 作成成功: 200 { ok: true, url }
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* body 無しでもセッションから解決を試みる */
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "課金の管理にはログインが必要です。" },
      { status: 400 }
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    ""
  ).trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "決済は現在準備中です。もうしばらくお待ちください。" },
      { status: 503 }
    );
  }

  const customerId = await getStripeCustomerId(userId);
  if (!customerId) {
    return NextResponse.json(
      {
        ok: false,
        error: "購入履歴が見つかりませんでした。プラン購入後にご利用いただけます。",
      },
      { status: 404 }
    );
  }

  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", `${appUrl}/more#billing`);

  let res: Response;
  try {
    res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch (e) {
    console.error("[billing] stripe portal request failed:", e);
    return NextResponse.json(
      { ok: false, error: "管理画面を開けませんでした。時間をおいてお試しください。" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[billing] stripe portal http", res.status, detail.slice(0, 500));
    return NextResponse.json(
      { ok: false, error: "管理画面を開けませんでした。時間をおいてお試しください。" },
      { status: 502 }
    );
  }

  const session = (await res.json().catch(() => null)) as { url?: string } | null;
  if (!session?.url) {
    return NextResponse.json(
      { ok: false, error: "管理画面を開けませんでした。時間をおいてお試しください。" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, url: session.url });
}
