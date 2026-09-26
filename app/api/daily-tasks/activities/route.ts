import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import { dailyStudyTaskToRow } from "@/lib/dbMappers";
import {
  ACTIVITY_KEYS,
  ACTIVITY_TASK_TYPES,
  isActivityKey,
  parseActivityPayload,
  toActivityPayload,
  type TodayActivityKey,
  type TodayActivitySpec,
} from "@/lib/todayActivitySpec";

export const runtime = "nodejs";

/**
 * POST /api/daily-tasks/activities
 * Today のトピック以外のタスク（関連用語・公式過去問）を daily_study_tasks に保存・復元する。
 * daily_study_tasks がタスク状態の正（Single Source of Truth）で、端末の localStorage はキャッシュ。
 *
 * body: { userId?, date: "YYYY-MM-DD", action, ... }
 *   list     … その日のタスクを返す
 *   offer    … { activities: [{ key, payload, title, estimatedMinutes?, topicId?, reason? }] }
 *               初めて Today に出した時点で保存する。同じ user/date/key が既にあれば触らない
 *               （別端末が先に出した中身を正とする）。保存後の状態を list と同じ形で返す。
 *   complete … { key, activity? } 学習先で実際に終えたとき。status=completed /
 *               completion_source=app_actual にする。行が無ければ activity から作って完了で入れる。
 *   attach   … { key: "act:past-exam", questionIds } 部分演習で選んだ問題を固定する。
 *               既に固定済みならそれを返す（別端末でも同じ問題）。
 *
 * 返却（list / offer / complete）: { ok, activities: [{ key, payload, done }] }
 * Supabase 未設定: 503 / 未ログイン: 401 / body 不正: 400 / 記録期間外（書き込み）: 403
 */

type ActivityInput = {
  key?: unknown;
  payload?: unknown;
  title?: unknown;
  estimatedMinutes?: unknown;
  topicId?: unknown;
  reason?: unknown;
};

type Body = {
  userId?: string;
  date?: unknown;
  action?: unknown;
  activities?: unknown;
  key?: unknown;
  activity?: unknown;
  questionIds?: unknown;
};

type ActivityRow = {
  activity_key: string | null;
  activity_payload: unknown;
  status: string | null;
  completion_source: string | null;
};

const MAX_ACTIVITIES = 3;

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

/** key と payload（spec）の組み合わせを検証して、保存する行を作る。 */
function toRow(userId: string, date: string, input: ActivityInput) {
  if (!isActivityKey(input.key)) return null;
  const spec = parseActivityPayload(input.payload);
  if (!spec || ACTIVITY_KEYS[spec.kind] !== input.key) return null;
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  if (!title) return null;
  const minutes = Number.isInteger(input.estimatedMinutes)
    && (input.estimatedMinutes as number) >= 0
    && (input.estimatedMinutes as number) <= 240
    ? (input.estimatedMinutes as number)
    : null;
  return {
    ...dailyStudyTaskToRow(userId, date, {
      taskType: ACTIVITY_TASK_TYPES[spec.kind],
      topicId: typeof input.topicId === "string" ? input.topicId.slice(0, 80) : "",
      title,
      estimatedMinutes: minutes,
      reason: typeof input.reason === "string" ? input.reason.slice(0, 200) : null,
      source: "today_menu",
    }),
    activity_key: input.key,
    activity_payload: toActivityPayload(spec),
  };
}

function isDone(row: ActivityRow): boolean {
  return row.status === "completed" && row.completion_source === "app_actual";
}

async function listActivities(supabase: SupabaseClient, userId: string, date: string) {
  const { data, error } = await supabase
    .from("daily_study_tasks")
    .select("activity_key, activity_payload, status, completion_source")
    .eq("user_id", userId)
    .eq("date", date)
    .not("activity_key", "is", null);
  if (error) return null;
  return ((data ?? []) as ActivityRow[]).flatMap((row) => {
    const payload = parseActivityPayload(row.activity_payload);
    if (!isActivityKey(row.activity_key) || !payload) return [];
    return [{ key: row.activity_key, payload, done: isDone(row) }];
  });
}

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad("invalid body");
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (!isIsoDate(body.date)) return bad("invalid date");
  const date = body.date;
  const action = body.action;
  if (action !== "list" && action !== "offer" && action !== "complete" && action !== "attach") {
    return bad("invalid action");
  }
  if (action !== "list" && !(await canRecordStudyForUser(userId))) {
    return recordingLockedResponse();
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  if (action === "offer") {
    const inputs = Array.isArray(body.activities) ? (body.activities as ActivityInput[]) : [];
    if (inputs.length === 0 || inputs.length > MAX_ACTIVITIES) return bad("invalid activities");
    const rows = inputs.map((input) => toRow(userId, date, input));
    if (rows.some((row) => row === null)) return bad("invalid activities");
    const validRows = rows.filter((row): row is NonNullable<typeof row> => row !== null);
    const { error } = await supabase
      .from("daily_study_tasks")
      .upsert(validRows, { onConflict: "user_id,date,activity_key", ignoreDuplicates: true });
    if (error) return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  if (action === "complete") {
    if (!isActivityKey(body.key)) return bad("invalid key");
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("daily_study_tasks")
      .update({ status: "completed", completion_source: "app_actual", estimated_completion_rate: 100, updated_at: now })
      .eq("user_id", userId)
      .eq("date", date)
      .eq("activity_key", body.key)
      .select("activity_key");
    if (error) return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
    // Today で出した時点の保存に失敗していた（オフライン等）場合は、中身ごと完了で入れる。
    if ((data ?? []).length === 0) {
      const row = body.activity && typeof body.activity === "object"
        ? toRow(userId, date, { ...(body.activity as ActivityInput), key: body.key })
        : null;
      if (!row) return bad("unknown activity");
      const { error: insertError } = await supabase.from("daily_study_tasks").upsert(
        [{ ...row, status: "completed", completion_source: "app_actual", estimated_completion_rate: 100 }],
        { onConflict: "user_id,date,activity_key", ignoreDuplicates: true },
      );
      if (insertError) return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
    }
  }

  if (action === "attach") {
    const key: TodayActivityKey = ACTIVITY_KEYS.past_exam_drill;
    if (body.key !== key) return bad("invalid key");
    const { data, error } = await supabase
      .from("daily_study_tasks")
      .select("activity_payload")
      .eq("user_id", userId)
      .eq("date", date)
      .eq("activity_key", key)
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
    const current = parseActivityPayload((data as { activity_payload?: unknown } | null)?.activity_payload);
    if (!current || current.kind !== "past_exam_drill") {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    // 先に固定した端末の問題を正とする。
    if (current.questionIds) return NextResponse.json({ ok: true, questionIds: current.questionIds });
    const next: TodayActivitySpec | null = parseActivityPayload(
      toActivityPayload({ ...current, questionIds: body.questionIds as string[] }),
    );
    if (!next || next.kind !== "past_exam_drill" || !next.questionIds) return bad("invalid questionIds");
    const { error: updateError } = await supabase
      .from("daily_study_tasks")
      .update({ activity_payload: toActivityPayload(next), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("date", date)
      .eq("activity_key", key);
    if (updateError) return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
    return NextResponse.json({ ok: true, questionIds: next.questionIds });
  }

  const activities = await listActivities(supabase, userId, date);
  if (!activities) return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  return NextResponse.json({ ok: true, activities });
}
