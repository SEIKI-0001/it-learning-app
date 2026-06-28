import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/apiUser";
import {
  DAILY_LIMITS,
  PLAN_PROVIDER,
  PROVIDER_LABEL,
} from "@/lib/billing/constants";
import { countTodayUsage, getUserPlan } from "@/lib/billing/plan";

export const runtime = "nodejs";

/**
 * POST /api/billing/status
 * body: { userId?: string }
 * ユーザーの現在のプラン・本日の利用状況・採点プロバイダ・決済可否を返す。
 * UI が free / pro の出し分けと回数表示に使う。
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    /* body 無しでも free として応答する */
  }

  const userId = resolveUserId(body);
  const plan = await getUserPlan(userId);
  const provider = PLAN_PROVIDER[plan];
  const limit = DAILY_LIMITS[plan];
  const used = await countTodayUsage(userId);

  const checkoutEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID_PRO?.trim()
  );

  return NextResponse.json({
    ok: true,
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
  });
}
