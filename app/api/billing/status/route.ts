import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import {
  getBillingStatusSnapshot,
  getEntitlements,
  getPlanOffers,
  getSubscriptionInfo,
  listPurchases,
} from "@/lib/billing/plan";
import type { BillingStatusPayload } from "@/types/billing";

export const runtime = "nodejs";

/**
 * POST /api/billing/status
 * body: { userId?: string }
 * ユーザーの現在のプラン・本日の利用状況・採点プロバイダ・決済可否に加え、
 * エンタイトルメント（記録可否）・購入可能プラン・サブスク詳細・購入履歴を返す。
 * AI採点画面の出し分けと「その他」ページの課金管理セクションが使う。
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    /* body 無しでも free として応答する */
  }

  const userId = await getRequestUserId(body);
  const [status, entitlements, subscription, purchases] = await Promise.all([
    getBillingStatusSnapshot(userId),
    getEntitlements(userId),
    getSubscriptionInfo(userId),
    listPurchases(userId),
  ]);

  const payload: BillingStatusPayload = {
    ok: true,
    plan: status.plan,
    providerLabel: status.providerLabel,
    usage: status.usage,
    tracked: status.tracked,
    checkoutEnabled: status.checkoutEnabled,
    entitlements,
    plans: getPlanOffers(),
    subscription,
    purchases,
  };
  return NextResponse.json(payload);
}
