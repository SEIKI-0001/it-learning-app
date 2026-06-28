import { getServiceSupabase } from "@/lib/supabaseServer";
import {
  profileRowToProfile,
  progressRowToProgress,
  type ProfileRow,
  type ProgressRow,
} from "@/lib/dbMappers";
import type { AppState, UserAnswer } from "@/types";

/**
 * 内部ユーザーIDから DB 上の AppState（profile / progress / answers）を組み立てる。
 * service role 専用。LINE トークン解決とセッション復元（/api/session/*）で共有する。
 * 進捗行が無ければ null（＝復元すべき既存データ無し）。
 */
export async function loadAppStateForUser(userId: string): Promise<AppState | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const [{ data: progressRow }, { data: profileRow }, { data: answerRows }] =
    await Promise.all([
      supabase.from("user_progress").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("user_answers")
        .select("question_id, selected_choice, is_correct, answered_at, tag, topic_id")
        .eq("user_id", userId)
        .order("answered_at", { ascending: true }),
    ]);

  if (!progressRow) return null;

  const answers: UserAnswer[] = (answerRows ?? []).map((a) => ({
    questionId: a.question_id as string,
    selectedChoice: (a.selected_choice ?? "A") as UserAnswer["selectedChoice"],
    isCorrect: Boolean(a.is_correct),
    answeredAt: (a.answered_at as string) ?? new Date().toISOString(),
    tag: (a.tag as string) ?? "",
    topicId: (a.topic_id as string | null) ?? undefined,
  }));

  return {
    profile: profileRow ? profileRowToProfile(profileRow as ProfileRow) : undefined,
    progress: progressRowToProgress(progressRow as ProgressRow),
    answers,
  };
}
