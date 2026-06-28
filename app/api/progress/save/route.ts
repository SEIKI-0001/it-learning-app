import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import { profileToRow, progressToRow } from "@/lib/dbMappers";
import type { UserProfile, UserProgress } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/progress/save
 * 進捗と任意でプロフィールを UPSERT する。
 * ユーザーはセッション（Google / LINE Cookie）から解決する。
 * body: { progress?: UserProgress, profile?: UserProfile }（userId は後方互換時のみ参照）
 */
export async function POST(request: Request) {
  let progress: UserProgress | undefined;
  let profile: UserProfile | undefined;
  let body: { userId?: string; progress?: UserProgress; profile?: UserProfile } = {};
  try {
    body = (await request.json()) as {
      userId?: string;
      progress?: UserProgress;
      profile?: UserProfile;
    };
    progress = body.progress;
    profile = body.profile;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  if (progress) {
    const { error } = await supabase
      .from("user_progress")
      .upsert(progressToRow(userId, progress), { onConflict: "user_id" });
    if (error) {
      return NextResponse.json({ ok: false, error: "progress save failed" }, { status: 500 });
    }
  }

  if (profile) {
    const { error } = await supabase
      .from("user_profiles")
      .upsert(profileToRow(userId, profile), { onConflict: "user_id" });
    if (error) {
      return NextResponse.json({ ok: false, error: "profile save failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
