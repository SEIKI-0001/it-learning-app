import "server-only";

// /explain の1日の回数と計測。テーブルはモチット相談と同じ mochit_ai_events を使い、event 名で分ける
// （列の制約は文字数だけなので migration は要らない）。質問の本文は保存しない。

import { getServiceSupabase } from "@/lib/supabaseServer";

export type Explain3dEvent = "explain3d_answered" | "explain3d_error";

/** 1ユーザーの1日あたりの上限。EXPLAIN3D_DAILY_LIMIT で上書きできる。 */
export function getExplain3dDailyLimit(): number {
  const raw = Number(process.env.EXPLAIN3D_DAILY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 10;
}

export async function logExplain3dEvent(entry: { userId: string; event: Explain3dEvent; intent?: string }): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("mochit_ai_events").insert({
    user_id: entry.userId,
    event: entry.event,
    page: "explain",
    source: "explain_3d",
    intent: entry.intent?.slice(0, 32) ?? null,
  });
  if (error) console.error("[explain3d] event log failed:", error.message);
}

/** since 以降に答えた回数。数えられないときは 0（機能を止めない）。 */
export async function countExplain3dSince(userId: string, since: Date): Promise<number> {
  const supabase = getServiceSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("mochit_ai_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event", "explain3d_answered")
    .gte("created_at", since.toISOString());
  if (error) {
    console.error("[explain3d] usage count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}
