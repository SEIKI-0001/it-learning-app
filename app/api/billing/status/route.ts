import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { getBillingStatusSnapshot } from "@/lib/billing/plan";

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

  const userId = await getRequestUserId(body);
  const status = await getBillingStatusSnapshot(userId);

  return NextResponse.json({
    ok: true,
    ...status,
  });
}
