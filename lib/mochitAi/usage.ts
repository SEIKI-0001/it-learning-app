import "server-only";

// モチット AI 相談の計測と1日の送信回数（mochit_ai_events）。
// 会話本文は保存しない。テーブル未作成・Supabase 未設定でも相談自体は止めない（graceful）。

import { getServiceSupabase } from "@/lib/supabaseServer";
import type { MochitAnalyticsEvent } from "./types";

/** 1ユーザーの1日（ユーザーのローカル日付）あたりの送信上限。MOCHIT_AI_DAILY_LIMIT で上書きできる。 */
export function getMochitDailyLimit(): number {
  const raw = Number(process.env.MOCHIT_AI_DAILY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30;
}

/**
 * 直近24時間の送信上限（日次上限の2倍）。timezoneOffsetMinutes は端末の自己申告なので、
 * 送るたびに offset を変えて「今日」の起点をずらしても、ここで総量を抑える。
 */
export function getMochitRollingLimit(dailyLimit: number): number {
  return dailyLimit * 2;
}

export const MOCHIT_ANALYTICS_EVENTS: readonly MochitAnalyticsEvent[] = [
  "mochit_open",
  "mochit_message_sent",
  "mochit_quick_action_clicked",
  "mochit_question_help_opened",
  "mochit_reflection_started",
  "mochit_reflection_completed",
  "mochit_reflection_dismissed",
  "mochit_return_to_learning",
  "mochit_error",
];

const shortText = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value.slice(0, 32) : null;

export async function logMochitEvent(entry: {
  userId: string;
  event: MochitAnalyticsEvent;
  page?: unknown;
  source?: unknown;
  intent?: unknown;
}): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("mochit_ai_events").insert({
    user_id: entry.userId,
    event: entry.event,
    page: shortText(entry.page),
    source: shortText(entry.source),
    intent: shortText(entry.intent),
  });
  if (error) console.error("[mochit-ai] event log failed:", error.message);
}

/**
 * since 以降の送信成功数。数えられないときは 0（相談を止めない）。
 * 「今日」の起点はユーザーのローカル日付の 0:00（lib/mochitAi/clientDay.ts）を渡す。
 */
export async function countMochitMessagesSince(userId: string, since: Date): Promise<number> {
  const supabase = getServiceSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("mochit_ai_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event", "mochit_message_sent")
    .gte("created_at", since.toISOString());
  if (error) {
    console.error("[mochit-ai] usage count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}
