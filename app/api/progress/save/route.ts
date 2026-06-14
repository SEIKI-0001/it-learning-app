import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { profileToRow, progressToRow } from "@/lib/dbMappers";
import type { UserProfile, UserProgress } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/progress/save
 * 進捗（currentDay, exp, level, completedDays, streakCount, weakTags）と
 * 任意でプロフィールを UPSERT する。
 * body: { userId: string, progress?: UserProgress, profile?: UserProfile }
 */
export async function POST(request: Request) {
  let userId = "";
  let progress: UserProgress | undefined;
  let profile: UserProfile | undefined;
  try {
    const body = (await request.json()) as {
      userId?: string;
      progress?: UserProgress;
      profile?: UserProfile;
    };
    userId = (body.userId ?? "").trim();
    progress = body.progress;
    profile = body.profile;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
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
