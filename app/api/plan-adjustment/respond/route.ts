import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  dailyStudyTaskToRow,
  planAdjustmentRowToProposal,
  type PlanAdjustmentRow,
} from "@/lib/dbMappers";
import { OPTION_ID, type RecoveryPlanOption } from "@/types/planAdjustment";
import type { WeakTopic } from "@/types/integratedStatus";
import type { WeeklyPlan } from "@/types";
import type { DailyStudyTaskInput } from "@/types/studyProgress";

export const runtime = "nodejs";

// POST /api/plan-adjustment/respond
// 立て直し提案への応答（承認 / 見送り）。承認時のみ計画を補正する。
// body: { userId?, proposalId, action: "accept" | "reject", selectedOptionId? }
// 返却: { ok, proposal }
//
// - accept: proposal を accepted にし、選択案に応じて user_progress.weekly_plan を補正、
//   必要なら daily_study_tasks に source='recovery' のタスクを追加する（過去データは変更しない）。
// - reject: proposal を rejected にする（計画は変更しない）。
// - postpone_exam が選ばれても user_profiles.exam_date は自動変更しない
//   （selected_option_id に記録し、設定画面での手動変更に委ねる）。
// - Supabase 未設定: 503 / userId なし: 401 / 入力不正: 400 / 対象なし: 404

/** その週の月曜日(ローカル)を "YYYY-MM-DD" で返す（週の識別キー）。 */
function weekStartKey(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffToMonday = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** 選択案に応じて weekly_plan の reviewIds に弱点トピックを補う（過去データは触らない）。 */
function adjustWeeklyPlan(
  current: WeeklyPlan | null,
  weakIds: string[],
  now: Date,
): WeeklyPlan {
  const base: WeeklyPlan = current ?? {
    weekStartDate: weekStartKey(now),
    topicIds: [],
    reviewIds: [],
  };
  // 弱点トピックを復習リストの先頭に寄せ、重複は除く。
  const reviewIds = Array.from(new Set([...weakIds, ...base.reviewIds]));
  return { ...base, reviewIds };
}

/** 選択案に応じた recovery タスクを組み立てる。 */
function buildRecoveryTasks(
  option: RecoveryPlanOption,
  weak: WeakTopic[],
): DailyStudyTaskInput[] {
  const tasks: DailyStudyTaskInput[] = [];
  const firstWeak = weak[0];

  // 復習を厚くする案では弱点復習タスクを優先で入れる。
  if (option.focus.review >= option.focus.examPractice || option.optionId === OPTION_ID.weakFocus) {
    tasks.push({
      taskType: "review",
      topicId: firstWeak?.topicId ?? "",
      title: firstWeak
        ? `弱点復習：${firstWeak.title}`
        : "弱点・要復習トピックの復習",
      reason: `立て直し提案「${option.title}」で選んだ復習タスクです`,
      source: "recovery",
    });
  }

  // 本番対応を含む案では過去問レベル演習タスクを入れる。
  if (option.focus.examPractice >= 25) {
    tasks.push({
      taskType: "exam_level",
      topicId: firstWeak?.topicId ?? "",
      title: "過去問レベル問題を解く",
      reason: `立て直し提案「${option.title}」で選んだ本番対応タスクです`,
      source: "recovery",
    });
  }

  return tasks;
}

export async function POST(request: Request) {
  let body: {
    userId?: string;
    proposalId?: string;
    action?: string;
    selectedOptionId?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const proposalId = (body.proposalId ?? "").trim();
  const action = body.action;
  if (!proposalId || (action !== "accept" && action !== "reject")) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  // 対象提案を取得（本人のものだけ）。
  const { data: proposalData, error: loadError } = await supabase
    .from("plan_adjustment_proposals")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError || !proposalData) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const row = proposalData as PlanAdjustmentRow;

  // すでに応答済みなら、そのまま現状を返す（二重処理を避ける）。
  if (row.status !== "proposed") {
    return NextResponse.json({
      ok: true,
      proposal: planAdjustmentRowToProposal(row),
    });
  }

  const nowIso = new Date().toISOString();

  // --- 見送り ---
  if (action === "reject") {
    const { data: updated } = await supabase
      .from("plan_adjustment_proposals")
      .update({ status: "rejected", updated_at: nowIso })
      .eq("proposal_id", proposalId)
      .eq("user_id", userId)
      .select("*")
      .single();

    return NextResponse.json({
      ok: true,
      proposal: planAdjustmentRowToProposal((updated ?? row) as PlanAdjustmentRow),
    });
  }

  // --- 承認 ---
  const options = (row.options ?? []) as RecoveryPlanOption[];
  const selectedOptionId = (body.selectedOptionId ?? "").trim();
  const option = options.find((o) => o.optionId === selectedOptionId);
  if (!option) {
    return NextResponse.json({ ok: false, error: "invalid option" }, { status: 400 });
  }

  const { data: updated } = await supabase
    .from("plan_adjustment_proposals")
    .update({
      status: "accepted",
      selected_option_id: selectedOptionId,
      accepted_at: nowIso,
      updated_at: nowIso,
    })
    .eq("proposal_id", proposalId)
    .eq("user_id", userId)
    .select("*")
    .single();

  // postpone_exam は exam_date を自動変更しない（設定画面での手動変更に委ねる）。
  // それ以外の案は weekly_plan を補正し、recovery タスクを追加する。
  if (selectedOptionId !== OPTION_ID.postponeExam) {
    // 元にした統合進捗から弱点トピックを取得（無ければ空で続行）。
    let weak: WeakTopic[] = [];
    if (row.source_status_id) {
      const { data: statusRow } = await supabase
        .from("integrated_learning_status")
        .select("weak_topics")
        .eq("id", row.source_status_id)
        .maybeSingle();
      weak = ((statusRow as { weak_topics: WeakTopic[] | null } | null)?.weak_topics ??
        []) as WeakTopic[];
    }
    const weakIds = weak.map((w) => w.topicId).filter(Boolean);

    // weekly_plan の補正（現在の週のみ・過去データは変更しない）。
    const { data: progressRow } = await supabase
      .from("user_progress")
      .select("weekly_plan")
      .eq("user_id", userId)
      .maybeSingle();
    const currentPlan =
      (progressRow as { weekly_plan: WeeklyPlan | null } | null)?.weekly_plan ?? null;
    const nextPlan = adjustWeeklyPlan(currentPlan, weakIds, new Date());

    await supabase
      .from("user_progress")
      .update({ weekly_plan: nextPlan, updated_at: nowIso })
      .eq("user_id", userId);

    // recovery タスクを今日分に追加（既存は上書きしない）。
    const date = new Date().toISOString().slice(0, 10);
    const taskInputs = buildRecoveryTasks(option, weak);
    const taskRows = taskInputs
      .filter((t) => (t.title ?? "").trim())
      .map((t) => dailyStudyTaskToRow(userId, date, t));
    if (taskRows.length > 0) {
      await supabase
        .from("daily_study_tasks")
        .upsert(taskRows, {
          onConflict: "user_id,date,task_type,topic_id,title",
          ignoreDuplicates: true,
        });
    }
  }

  return NextResponse.json({
    ok: true,
    proposal: planAdjustmentRowToProposal((updated ?? row) as PlanAdjustmentRow),
  });
}
