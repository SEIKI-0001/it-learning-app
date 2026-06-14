import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import {
  progressRowToProgress,
  profileRowToProfile,
  type ProgressRow,
  type ProfileRow,
} from "@/lib/dbMappers";
import type { AppState, UserAnswer } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/session/resolve
 * 一時トークンを受け取り、対応する user_id と（あれば）DB上の AppState を返す。
 * クライアントはこの user_id を localStorage に保存し、以降の保存に使う。
 */
export async function POST(request: Request) {
  let token = "";
  try {
    const body = (await request.json()) as { token?: string };
    token = (body.token ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    // Supabase 未設定時はトークン解決できない。クライアントは localStorage で継続。
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  // トークン → user_id（期限切れは無効）
  const { data: session, error: sErr } = await supabase
    .from("line_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (sErr) {
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: "token not found" }, { status: 404 });
  }
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "token expired" }, { status: 410 });
  }

  const userId = session.user_id as string;

  // 既存の進捗・プロフィール・回答を取得して AppState を組み立てる。
  const [{ data: progressRow }, { data: profileRow }, { data: answerRows }] =
    await Promise.all([
      supabase.from("user_progress").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("user_answers")
        .select("question_id, selected_choice, is_correct, answered_at, tag")
        .eq("user_id", userId)
        .order("answered_at", { ascending: true }),
    ]);

  let appState: AppState | null = null;
  if (progressRow) {
    const answers: UserAnswer[] = (answerRows ?? []).map((a) => ({
      questionId: a.question_id as string,
      selectedChoice: (a.selected_choice ?? "A") as UserAnswer["selectedChoice"],
      isCorrect: Boolean(a.is_correct),
      answeredAt: (a.answered_at as string) ?? new Date().toISOString(),
      tag: (a.tag as string) ?? "",
    }));

    appState = {
      profile: profileRow
        ? profileRowToProfile(profileRow as ProfileRow)
        : undefined,
      progress: progressRowToProgress(progressRow as ProgressRow),
      answers,
    };
  }

  return NextResponse.json({ ok: true, userId, appState });
}
