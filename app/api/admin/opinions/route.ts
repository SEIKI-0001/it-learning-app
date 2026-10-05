import { NextResponse } from "next/server";
import { adminAuthFailure, adminMutationFailure } from "@/lib/auth/adminAuth";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const OPINION_STATUSES = ["new", "read", "done"] as const;
type OpinionStatus = (typeof OPINION_STATUSES)[number];

type OpinionRow = {
  id: string;
  user_id: string;
  category: string;
  body: string;
  context: string | null;
  status: OpinionStatus;
  created_at: string;
  line_users: { display_name: string | null } | null;
};

function isOpinionStatus(value: unknown): value is OpinionStatus {
  return typeof value === "string" && (OPINION_STATUSES as readonly string[]).includes(value);
}

/** GET /api/admin/opinions … 意見箱の投稿一覧（新しい順・最大200件）。 */
export async function GET(request: Request) {
  const denied = adminAuthFailure(request);
  if (denied) return denied;
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }
  const { data, error } = await supabase
    .from("user_opinions")
    .select("id, user_id, category, body, context, status, created_at, line_users(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[admin] opinions query failed:", error.message);
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }
  const opinions = ((data ?? []) as unknown as OpinionRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.line_users?.display_name ?? null,
    category: row.category,
    body: row.body,
    context: row.context,
    status: row.status,
    createdAt: row.created_at,
  }));
  return NextResponse.json({ ok: true, opinions }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/admin/opinions { id, status } … 対応状況（未読・既読・対応済み）を更新する。 */
export async function POST(request: Request) {
  const denied = adminMutationFailure(request);
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (typeof body.id !== "string" || !isOpinionStatus(body.status)) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }
  const { error } = await supabase
    .from("user_opinions")
    .update({ status: body.status })
    .eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
