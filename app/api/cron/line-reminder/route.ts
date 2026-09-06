import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDueLineReminders } from "@/lib/notifications/service";

export const runtime = "nodejs";
// 実行のたびに現在時刻で判定するため、キャッシュさせない。
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/line-reminder
 * GF-P0-006 の定時実行口。Vercel Cron から毎時呼ばれる（vercel.json）。
 *
 * 認証: `Authorization: Bearer $CRON_SECRET`（Vercel Cron が自動で付与する形式）。
 * production で CRON_SECRET が未設定なら実行せず 503（誰でも叩ける口を作らない）。
 *
 * 失敗しても学習データには触れない。送信記録の更新に失敗しても 200 を返し、
 * 次の実行で冪等キーにより二重送信を防ぐ。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "cron secret not configured" },
      { status: 503 },
    );
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueLineReminders();
    return NextResponse.json(result);
  } catch (e) {
    console.error("line reminder cron failed", e);
    // Cron の失敗を学習側へ伝播させない。記録も進捗も変えずに終わる。
    return NextResponse.json({ ok: false, error: "cron run failed" }, { status: 500 });
  }
}

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return safeEqual(header.slice(prefix.length), secret);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
