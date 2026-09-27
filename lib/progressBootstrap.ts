import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllTopics } from "@/lib/content";
import { getAllWords } from "@/lib/wordlist";
import {
  computeIntegratedStatus,
  type IntegratedDailyReport,
  type IntegratedExamAttempt,
  type IntegratedTopicProgress,
  type IntegratedWordProgress,
} from "@/lib/integratedStatus";
import { buildPlanAdjustmentProposal } from "@/lib/planAdjustment";
import { referenceBookRatioFromRow } from "@/lib/referenceBook";
import {
  integratedStatusRowToStatus,
  integratedStatusToRow,
  planAdjustmentRowToProposal,
  planAdjustmentToRow,
  type IntegratedStatusRow,
  type PlanAdjustmentRow,
} from "@/lib/dbMappers";
import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import type { PlanAdjustmentProposal } from "@/types/planAdjustment";
import type { TopicStage } from "@/types/studyProgress";
import { getCurrentReadiness } from "@/lib/examReadiness/service";
import type { ExamReadinessResult } from "@/types/examReadiness";
import { daysUntilExamDate } from "@/lib/planningInputs";

export type IntegratedStatusBootstrapResult = {
  status: IntegratedLearningStatus | null;
  row: IntegratedStatusRow | null;
  saved?: boolean;
};

type ExamReadinessSource =
  | ExamReadinessResult
  | null
  | Promise<ExamReadinessResult | null>;

export async function getProgressBootstrapExamReadiness(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<ExamReadinessResult | null> {
  try {
    return await getCurrentReadiness({ supabase, userId, now });
  } catch (error) {
    console.error("progress bootstrap exam readiness failed", error);
    return null;
  }
}

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export async function getLatestIntegratedStatusRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<IntegratedStatusRow | null> {
  const { data, error } = await supabase
    .from("integrated_learning_status")
    .select("*")
    .eq("user_id", userId)
    .order("status_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as IntegratedStatusRow;
}

export async function refreshIntegratedStatusForUser(
  supabase: SupabaseClient,
  userId: string,
  options: {
    date?: string;
    now?: Date;
    examReadiness?: ExamReadinessSource;
  } = {},
): Promise<IntegratedStatusBootstrapResult> {
  const now = options.now ?? new Date();
  const statusDate = isIsoDate(options.date) ? options.date : todayKey(now);
  const sinceIso = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const recentDate = new Date(now.getTime() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const readinessSource = options.examReadiness === undefined
    ? getProgressBootstrapExamReadiness(supabase, userId, now)
    : options.examReadiness;
  const [profileRes, progressRes, wordRes, reportRes, examRes, refBookRes, examReadiness] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("exam_date")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("topic_progress")
        .select("topic_id, stage")
        .eq("user_id", userId),
      supabase
        .from("user_word_progress")
        .select("status, next_review_at")
        .eq("user_id", userId),
      supabase
        .from("daily_progress_reports")
        .select("estimated_completion_rate")
        .eq("user_id", userId)
        .gte("date", recentDate),
      supabase
        .from("question_attempts")
        .select("is_correct")
        .eq("user_id", userId)
        .eq("question_type", "exam_level")
        .gte("answered_at", sinceIso),
      supabase
        .from("user_reference_books")
        .select("active, chapters")
        .eq("user_id", userId)
        .maybeSingle(),
      readinessSource,
    ]);

  const examDate =
    (profileRes.data as { exam_date: string | null } | null)?.exam_date ?? null;

  const topicProgress: IntegratedTopicProgress[] = (
    (progressRes.data ?? []) as { topic_id: string; stage: string }[]
  ).map((r) => ({ topicId: r.topic_id, stage: r.stage as TopicStage }));

  const wordProgress: IntegratedWordProgress[] = (
    (wordRes.data ?? []) as { status: string; next_review_at: string | null }[]
  ).map((r) => ({ status: r.status, nextReviewAt: r.next_review_at }));

  const recentReports: IntegratedDailyReport[] = (
    (reportRes.data ?? []) as { estimated_completion_rate: number | null }[]
  ).map((r) => ({ estimatedCompletionRate: r.estimated_completion_rate }));

  const examLevelAttempts: IntegratedExamAttempt[] = (
    (examRes.data ?? []) as { is_correct: boolean }[]
  ).map((r) => ({ isCorrect: r.is_correct }));

  const topics = getAllTopics().map((t) => ({
    id: t.id,
    field: t.field,
    title: t.title,
  }));

  const status = computeIntegratedStatus({
    statusDate,
    now,
    daysUntilExam: daysUntilExamDate(examDate, now),
    topics,
    topicProgress,
    wordProgress,
    totalWordCount: getAllWords().length,
    recentReports,
    examLevelAttempts,
    referenceBookRatio: referenceBookRatioFromRow(
      (refBookRes.data ?? null) as {
        active: boolean | null;
        chapters: unknown;
      } | null,
    ),
    examReadiness,
  });

  const { data: upserted, error: upsertError } = await supabase
    .from("integrated_learning_status")
    .upsert(integratedStatusToRow(userId, status), {
      onConflict: "user_id,status_date",
    })
    .select("*")
    .single();

  return {
    status,
    saved: !upsertError,
    row: upserted ? (upserted as IntegratedStatusRow) : null,
  };
}

export async function getLatestOrRefreshIntegratedStatus(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
  examReadiness?: ExamReadinessSource,
): Promise<IntegratedStatusBootstrapResult> {
  const latest = await getLatestIntegratedStatusRow(supabase, userId);
  if (latest && latest.status_date === todayKey(now)) {
    return {
      status: integratedStatusRowToStatus(latest),
      row: latest,
      saved: true,
    };
  }
  return refreshIntegratedStatusForUser(supabase, userId, { now, examReadiness });
}

export async function getLatestPlanAdjustmentProposal(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanAdjustmentProposal | null> {
  const { data, error } = await supabase
    .from("plan_adjustment_proposals")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["proposed", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return planAdjustmentRowToProposal(data as PlanAdjustmentRow);
}

export async function generatePlanAdjustmentForUser(
  supabase: SupabaseClient,
  userId: string,
  sourceStatusRow?: IntegratedStatusRow | null,
  now = new Date(),
  examReadiness?: ExamReadinessSource,
): Promise<PlanAdjustmentProposal | null> {
  const statusRow =
    sourceStatusRow ?? (await getLatestIntegratedStatusRow(supabase, userId));
  if (!statusRow) return null;

  const status = integratedStatusRowToStatus(statusRow);
  const statusDate = statusRow.status_date;

  const { data: existing } = await supabase
    .from("plan_adjustment_proposals")
    .select("*")
    .eq("user_id", userId)
    .eq("status_date", statusDate)
    .in("status", ["proposed", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return planAdjustmentRowToProposal(existing as PlanAdjustmentRow);
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("exam_date")
    .eq("user_id", userId)
    .maybeSingle();
  const examDate =
    (profile as { exam_date: string | null } | null)?.exam_date ?? null;
  const currentReadiness = await (
    examReadiness === undefined
      ? getProgressBootstrapExamReadiness(supabase, userId, now)
      : examReadiness
  );

  const generated = buildPlanAdjustmentProposal({
    statusDate,
    status,
    daysUntilExam: daysUntilExamDate(examDate, now),
  }, currentReadiness);

  if (!generated) return null;

  const row = planAdjustmentToRow(userId, {
    statusDate,
    sourceStatusId: statusRow.id ?? null,
    triggerType: generated.triggerType,
    severity: generated.severity,
    headline: generated.headline,
    reasonSummary: generated.reasonSummary,
    options: generated.options,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("plan_adjustment_proposals")
    .insert(row)
    .select("*")
    .single();

  if (insertError || !inserted) {
    return {
      proposalId: "",
      statusDate,
      sourceStatusId: statusRow.id ?? null,
      triggerType: generated.triggerType,
      severity: generated.severity,
      headline: generated.headline,
      reasonSummary: generated.reasonSummary,
      options: generated.options,
      selectedOptionId: null,
      status: "proposed",
      acceptedAt: null,
    };
  }

  return planAdjustmentRowToProposal(inserted as PlanAdjustmentRow);
}

export async function getLatestOrGeneratePlanAdjustment(
  supabase: SupabaseClient,
  userId: string,
  sourceStatusRow?: IntegratedStatusRow | null,
  now = new Date(),
  examReadiness?: ExamReadinessSource,
): Promise<PlanAdjustmentProposal | null> {
  const latest = await getLatestPlanAdjustmentProposal(supabase, userId);
  if (latest) return latest;
  return generatePlanAdjustmentForUser(
    supabase,
    userId,
    sourceStatusRow,
    now,
    examReadiness,
  );
}

/**
 * 現在有効な立て直し案（proposed / accepted）を expired にする。
 * 削除はせず履歴として残す（accepted の selected_option_id / accepted_at もそのまま）。
 * 失敗時は throw（古い案が「最新」として残るのを保存成功扱いにしないため）。
 */
export async function expireActivePlanAdjustmentProposals(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<void> {
  const { error } = await supabase
    .from("plan_adjustment_proposals")
    .update({ status: "expired", updated_at: now.toISOString() })
    .eq("user_id", userId)
    .in("status", ["proposed", "accepted"]);
  if (error) throw new Error("plan adjustment expire failed");
}

export type ReplanResult = {
  integratedStatus: IntegratedLearningStatus | null;
  planAdjustmentProposal: PlanAdjustmentProposal | null;
};

/**
 * planning inputs（試験日・学習可能時間）変更時の再計算。
 * 通常の「当日分があれば再利用」（getLatestOrRefreshIntegratedStatus）や
 * 「有効な提案があれば再利用」を通さず、変更後の exam_date で当日分を作り直す。
 *   1. integrated_learning_status を強制再計算して当日分を upsert
 *   2. 旧条件の立て直し案を expired にする
 *   3. 再計算した統合進捗と最新の試験日で、必要なら新しい立て直し案を生成
 * 一次データ（topic_progress・回答履歴・Exam Readiness 等）には書き込まない。
 */
export async function replanForPlanningInputsChange(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<ReplanResult> {
  const examReadiness = getProgressBootstrapExamReadiness(supabase, userId, now);
  const integrated = await refreshIntegratedStatusForUser(supabase, userId, {
    now,
    examReadiness,
  });
  if (!integrated.saved || !integrated.row) {
    throw new Error("integrated status refresh failed");
  }

  await expireActivePlanAdjustmentProposals(supabase, userId, now);

  const planAdjustmentProposal = await generatePlanAdjustmentForUser(
    supabase,
    userId,
    integrated.row,
    now,
    examReadiness,
  );

  return { integratedStatus: integrated.status, planAdjustmentProposal };
}
