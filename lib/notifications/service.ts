// GF-P0-006 リマインダー送信の実行本体（service role 専用）。
//
// Cron から1回呼ばれて「送るべきユーザーへ1通ずつ push する」までを担う。
//
// 学習データとの境界:
//   - 読むのは user_progress / line_users / notification_preferences だけ。
//   - 書くのは notification_deliveries / line_sessions だけ。
//   - push 失敗も Cron 失敗も学習状態（進捗・ストリーク・XP）に触れない。
//
// 重複防止:
//   - 唯一の担保は notification_deliveries の主キー
//     (user_id, notification_type, local_date)。先に行を予約してから push する。
//   - 予約が unique 違反なら「同じ日に同じ種別をすでに扱った」ので何もしない。

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { isUniqueViolationError } from "@/lib/dbMappers";
import { sendLinePush } from "@/lib/line/messaging";
import { buildNotificationText, notificationLink } from "@/lib/notifications/messages";
import {
  decideNotification,
  hasStudiedOnLocalDate,
  localDateInTimeZone,
  resolveTimeZone,
  type NotificationCandidate,
} from "@/lib/notifications/schedule";
import { preferenceRowToPreference } from "@/lib/notifications/preferences";
import type { NotificationType } from "@/types/notification";

/** 1回の実行で見るユーザー数の上限（1時間ぶんの取りこぼしより暴走を防ぐ）。 */
export const MAX_USERS_PER_RUN = 500;

const LINE_SESSION_TOKEN_TTL_MS = 15 * 60 * 1000;

export type ReminderRunResult = {
  ok: boolean;
  /** 判定対象になったオプトイン済みユーザー数。 */
  scanned: number;
  /** push に成功した件数。 */
  sent: number;
  /** 予約はしたが push に失敗した件数。 */
  failed: number;
  /** 判定または直前再確認で送らないと決めた件数。 */
  skipped: number;
  /** 設定不足で実行できなかった理由（あれば）。 */
  reason?: string;
};

function emptyResult(reason: string): ReminderRunResult {
  return { ok: false, scanned: 0, sent: 0, failed: 0, skipped: 0, reason };
}

/** 通知に載せる本番 URL の基点。未設定なら送信しない（誤ったリンクを配らない）。 */
function resolveBaseUrl(): string | null {
  const fromEnv = (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).trim();
  return fromEnv ? fromEnv.replace(/\/+$/, "") : null;
}

/**
 * Web へログイン状態で着地させる一時トークン。発行に失敗してもトークン無しで送る
 * （通知が届かないより、リンク先でログインを促す方がよい）。
 */
async function issueSessionToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + LINE_SESSION_TOKEN_TTL_MS).toISOString();
    const { error } = await supabase
      .from("line_sessions")
      .insert({ token, user_id: userId, expires_at: expiresAt });
    if (error) return null;
    return token;
  } catch {
    return null;
  }
}

type PreferenceRowShape = {
  user_id: string;
  opt_in: boolean;
  remind_hour: number;
  timezone: string;
  daily_reminder: boolean;
  streak_risk: boolean;
  comeback: boolean;
};

/** UTC の前後1日ぶんの配信記録を引く（ユーザーごとのローカル日付が前後するため）。 */
function deliveryDateWindow(now: Date): { from: string; to: string } {
  const day = 86_400_000;
  return {
    from: new Date(now.getTime() - day).toISOString().slice(0, 10),
    to: new Date(now.getTime() + day).toISOString().slice(0, 10),
  };
}

/**
 * 送信直前の再確認。候補抽出から push までの間に学習を終えたユーザーへ送らない。
 * 読み取りに失敗した場合は「送らない」を選ぶ（誤送信より欠測を選ぶ）。
 */
async function stillUnstudied(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
  timeZone: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("last_played_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  const lastPlayedAt = (data?.last_played_at as string | null) ?? null;
  return !hasStudiedOnLocalDate(lastPlayedAt, now, timeZone);
}

/**
 * 配信枠を予約する。主キー衝突＝同日・同種別をすでに扱っているので false。
 * push より前に予約するので、送信中のクラッシュでも二重送信にならない。
 */
async function reserveDelivery(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  localDate: string,
): Promise<boolean> {
  const { error } = await supabase.from("notification_deliveries").insert({
    user_id: userId,
    notification_type: type,
    local_date: localDate,
    status: "pending",
  });
  if (!error) return true;
  if (isUniqueViolationError(error)) return false;
  console.error("notification delivery reservation failed", error);
  return false;
}

async function finishDelivery(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  localDate: string,
  status: "sent" | "failed",
  detail?: string,
): Promise<void> {
  const { error } = await supabase
    .from("notification_deliveries")
    .update({
      status,
      detail: detail ? detail.slice(0, 512) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("notification_type", type)
    .eq("local_date", localDate);
  // 記録の更新失敗は学習に影響しない。ログだけ残して続ける。
  if (error) console.error("notification delivery update failed", error);
}

/**
 * いま送るべき通知を送る。Cron から1時間ごとに呼ばれる想定。
 * 例外を投げずに結果を返す（Cron の失敗が学習側へ伝播しない）。
 */
export async function runDueLineReminders(
  now: Date = new Date(),
): Promise<ReminderRunResult> {
  const supabase = getServiceSupabase();
  if (!supabase) return emptyResult("supabase not configured");

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!accessToken) return emptyResult("line access token not configured");

  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return emptyResult("app url not configured");

  const { data: preferenceRows, error: preferenceError } = await supabase
    .from("notification_preferences")
    .select(
      "user_id, opt_in, remind_hour, timezone, daily_reminder, streak_risk, comeback",
    )
    .eq("opt_in", true)
    .limit(MAX_USERS_PER_RUN);

  if (preferenceError) return emptyResult("preference query failed");

  const preferences = (preferenceRows ?? []) as PreferenceRowShape[];
  if (preferences.length === 0) {
    return { ok: true, scanned: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const userIds = preferences.map((row) => row.user_id);
  const window = deliveryDateWindow(now);

  const [lineUsers, progressRows, deliveryRows] = await Promise.all([
    supabase.from("line_users").select("id, line_user_id").in("id", userIds),
    supabase
      .from("user_progress")
      .select("user_id, last_played_at, streak_count")
      .in("user_id", userIds),
    supabase
      .from("notification_deliveries")
      .select("user_id, notification_type, local_date")
      .in("user_id", userIds)
      .gte("local_date", window.from)
      .lte("local_date", window.to),
  ]);

  const lineUserIdByUser = new Map<string, string>();
  for (const row of (lineUsers.data ?? []) as { id: string; line_user_id: string | null }[]) {
    if (row.line_user_id) lineUserIdByUser.set(row.id, row.line_user_id);
  }

  const progressByUser = new Map<string, { lastPlayedAt: string | null; streakCount: number }>();
  for (const row of (progressRows.data ?? []) as {
    user_id: string;
    last_played_at: string | null;
    streak_count: number | null;
  }[]) {
    progressByUser.set(row.user_id, {
      lastPlayedAt: row.last_played_at ?? null,
      streakCount: Number(row.streak_count ?? 0),
    });
  }

  const deliveriesByUserDate = new Map<string, NotificationType[]>();
  for (const row of (deliveryRows.data ?? []) as {
    user_id: string;
    notification_type: NotificationType;
    local_date: string;
  }[]) {
    const key = `${row.user_id}:${row.local_date}`;
    const list = deliveriesByUserDate.get(key) ?? [];
    list.push(row.notification_type);
    deliveriesByUserDate.set(key, list);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of preferences) {
    const lineUserId = lineUserIdByUser.get(row.user_id);
    if (!lineUserId) {
      // LINE 未連携。Web だけのユーザーには push する宛先が無い。
      skipped += 1;
      continue;
    }

    const preference = preferenceRowToPreference(row);
    const timeZone = resolveTimeZone(preference.timezone);
    const progress = progressByUser.get(row.user_id);
    const localDate = localDateInTimeZone(now, timeZone);

    const candidate: NotificationCandidate = {
      preference,
      lastPlayedAt: progress?.lastPlayedAt ?? null,
      streakCount: progress?.streakCount ?? 0,
      deliveredTypesToday:
        deliveriesByUserDate.get(`${row.user_id}:${localDate}`) ?? [],
    };

    const decision = decideNotification(candidate, now);
    if (!decision) {
      skipped += 1;
      continue;
    }

    if (!(await stillUnstudied(supabase, row.user_id, now, timeZone))) {
      skipped += 1;
      continue;
    }

    const reserved = await reserveDelivery(
      supabase,
      row.user_id,
      decision.type,
      decision.localDate,
    );
    if (!reserved) {
      skipped += 1;
      continue;
    }

    const token = await issueSessionToken(supabase, row.user_id);
    const link = notificationLink(baseUrl, token, decision.type);
    const text = buildNotificationText(decision, link);
    const result = await sendLinePush(lineUserId, text, accessToken);

    if (result.ok) {
      sent += 1;
      await finishDelivery(supabase, row.user_id, decision.type, decision.localDate, "sent");
    } else {
      failed += 1;
      await finishDelivery(
        supabase,
        row.user_id,
        decision.type,
        decision.localDate,
        "failed",
        `status=${result.status} ${result.detail ?? ""}`.trim(),
      );
    }
  }

  return { ok: true, scanned: preferences.length, sent, failed, skipped };
}
