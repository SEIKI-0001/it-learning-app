import { NextResponse } from "next/server";
import { getRequestUserIdFast } from "@/lib/apiUser";
import { logMochitEvent, MOCHIT_ANALYTICS_EVENTS } from "@/lib/mochitAi/usage";
import type { MochitAnalyticsEvent } from "@/lib/mochitAi/types";

export const runtime = "nodejs";

/**
 * POST /api/mochit/events
 * モチット相談 UI の計測イベント（開いた・候補を押した・振り返りを始めた等）。
 * 送信成功・失敗はチャット API 側で記録するので、ここでは受け付けない。
 * 会話本文は受け取らない。匿名・未設定は 204 で黙って捨てる（計測で体験を止めない）。
 */
const CLIENT_EVENTS = new Set<MochitAnalyticsEvent>(
  MOCHIT_ANALYTICS_EVENTS.filter((e) => e !== "mochit_message_sent" && e !== "mochit_error"),
);

export async function POST(request: Request) {
  let body: { event?: string; page?: string; source?: string; intent?: string; userId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!body.event || !CLIENT_EVENTS.has(body.event as MochitAnalyticsEvent)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const userId = await getRequestUserIdFast(body);
  if (userId) {
    await logMochitEvent({
      userId,
      event: body.event as MochitAnalyticsEvent,
      page: body.page,
      source: body.source,
      intent: body.intent,
    });
  }
  return new NextResponse(null, { status: 204 });
}
