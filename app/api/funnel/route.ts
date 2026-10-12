import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { isBotUserAgent, parseFunnelInput } from "@/lib/growth/funnel";

export const runtime = "nodejs";

/**
 * POST /api/funnel
 * 公開ページの回遊イベント（閲覧・解答を開く・内部リンクのクリック）を 1 件保存する。
 * 未ログインで呼ばれる。計測なので、失敗しても呼び出し側には常に 204 を返す。
 * body: { event, path, targetPath?, placement?, refPath?, referrerHost?, visitorId? }
 */
export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204 });
  if (isBotUserAgent(request.headers.get("user-agent"))) return done;

  let raw: unknown;
  try {
    raw = JSON.parse(await request.text());
  } catch {
    return done;
  }
  const input = parseFunnelInput(raw);
  if (!input) return done;

  const supabase = getServiceSupabase();
  if (!supabase) return done;

  const { error } = await supabase.from("public_funnel_events").insert({
    event: input.event,
    path: input.path,
    target_path: input.targetPath,
    placement: input.placement,
    ref_path: input.refPath,
    referrer_host: input.referrerHost,
    visitor_id: input.visitorId,
  });
  if (error) console.error("[growth] funnel event insert failed:", error.message);
  return done;
}
