import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";

export const runtime = "nodejs";

/**
 * POST /api/billing/checkout
 * body: { userId: string }
 * Pro プランの Stripe Checkout Session を作成し、その URL を返す。
 *
 * - Stripe 未設定（STRIPE_SECRET_KEY / STRIPE_PRICE_ID_PRO 無し）: 503（準備中）
 * - userId 無し: 400（誰の課金か紐づけられない）
 * - 作成成功: 200 { ok: true, url }
 *
 * Stripe SDK は追加せず REST（application/x-www-form-urlencoded）で呼ぶ。
 * 支払い完了は /api/billing/webhook が受けて plan を pro に更新する。
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
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
          "Proへのアップグレードには、LINEからのログインが必要です（誰のアカウントか紐づけるため）。",
      },
      { status: 400 }
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const price = process.env.STRIPE_PRICE_ID_PRO?.trim();
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

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.append("line_items[0][price]", price);
  params.append("line_items[0][quantity]", "1");
  params.set("client_reference_id", userId);
  params.append("metadata[user_id]", userId);
  // サブスクリプション側にも user_id を持たせ、解約/更新の webhook で紐づける。
  params.append("subscription_data[metadata][user_id]", userId);
  params.set("success_url", `${appUrl}/ai-grading?checkout=success`);
  params.set("cancel_url", `${appUrl}/ai-grading?checkout=cancel`);

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
