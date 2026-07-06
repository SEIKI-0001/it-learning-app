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

export type IntegratedStatusBootstrapResult = {
  status: IntegratedLearningStatus | null;
  row: IntegratedStatusRow | null;
  saved?: boolean;
};

/** exam_date（"YYYY-MM-DD"）から試験までの残り日数を求める。 */
function daysUntil(examDate: string | null, now: Date): number | null {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) return null;
  return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / 86_400_000));
}

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * user_reference_books.chapters（jsonb）から章消化率（0〜100）を求める。
 * 参考書が未登録・使用中でない・章が0件のときは null（指標に含めない）。
 * 計算は lib/referenceBook.ts の referenceBookProgress と同じ「done章 / 全章」。
 */
function referenceBookRatioFromRow(
  row: { active: boolean | null; chapters: unknown } | null,
): number | null {
  if (!row || row.active === false) return null;
  const chapters = Array.isArray(row.chapters) ? row.chapters : [];
  if (chapters.length === 0) return null;
  const done = chapters.filter(
    (c) => typeof c === "object" && c !== null && (c as { done?: boolean }).done === true,
  ).length;
  return Math.round((done / chapters.length) * 100);
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
  options: { date?: string; now?: Date } = {},
): Promise<IntegratedStatusBootstrapResult> {
  const now = options.now ?? new Date();
  const statusDate = isIsoDate(options.date) ? options.date : todayKey(now);
  const sinceIso = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const recentDate = new Date(now.getTime() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [profileRes, progressRes, wordRes, reportRes, examRes, refBookRes] =
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
    daysUntilExam: daysUntil(examDate, now),
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
): Promise<IntegratedStatusBootstrapResult> {
  const latest = await getLatestIntegratedStatusRow(supabase, userId);
  if (latest && latest.status_date === todayKey(now)) {
    return {
      status: integratedStatusRowToStatus(latest),
      row: latest,
      saved: true,
    };
  }
  return refreshIntegratedStatusForUser(supabase, userId, { now });
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

  const generated = buildPlanAdjustmentProposal({
    statusDate,
    status,
    daysUntilExam: daysUntil(examDate, now),
  });

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
): Promise<PlanAdjustmentProposal | null> {
  const latest = await getLatestPlanAdjustmentProposal(supabase, userId);
  if (latest) return latest;
  return generatePlanAdjustmentForUser(supabase, userId, sourceStatusRow, now);
}
