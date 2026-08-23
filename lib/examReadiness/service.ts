import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateExamReadinessDraft,
  finalizeExamReadinessResult,
} from "@/lib/examReadiness/calculator";
import {
  EXAM_READINESS_MODEL_VERSION,
  EXAM_SCHEME_VERSION,
} from "@/lib/examReadiness/config";
import {
  getReadinessRecoveryState,
  getStoredCurrentReadiness,
  loadExamReadinessEvidence,
} from "@/lib/examReadiness/repository";
import type { ExamReadinessResult } from "@/types/examReadiness";

const LEASE_SECONDS = 30;
const MAX_STALE_RECOMPUTATIONS = 3;
const MAX_TIME_BOUNDARY_RECALCULATIONS = 3;
const COMMIT_WAIT_ATTEMPTS = 12;
const COMMIT_WAIT_INTERVAL_MS = 20;

export type ExamReadinessServiceErrorCode =
  | "claim_failed"
  | "claim_invalid"
  | "completion_failed"
  | "current_read_unstable"
  | "recalculation_busy"
  | "recalculation_unstable";

export class ExamReadinessServiceError extends Error {
  readonly code: ExamReadinessServiceErrorCode;
  readonly retryable: boolean;

  constructor(
    code: ExamReadinessServiceErrorCode,
    message: string,
    options: { retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "ExamReadinessServiceError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

type RecalculationJob = {
  jobId: string;
  status: "processing" | "succeeded" | "failed";
  evidenceRevision: number;
  attemptCount: number;
};

type RpcResponse = { data: unknown; error: unknown };

export async function recalculateExamReadiness(args: {
  supabase: SupabaseClient;
  userId: string;
  triggerType: string;
  triggerId: string;
  now?: Date;
}): Promise<ExamReadinessResult> {
  requireNonEmpty(args.userId, "userId");
  requireNonEmpty(args.triggerType, "triggerType");
  requireNonEmpty(args.triggerId, "triggerId");
  const suppliedReferenceTime = args.now === undefined
    ? null
    : calculationStart(args.now);
  const baseline = await getStoredCurrentReadiness(args.supabase, args.userId);

  for (let recomputation = 0; recomputation < MAX_STALE_RECOMPUTATIONS; recomputation += 1) {
    const job = await claimRecalculation(args);
    if (job === null) {
      const committed = await waitForCommittedCurrent(args.supabase, args.userId, baseline);
      if (committed !== null) return committed;
      throw temporaryError(
        "recalculation_busy",
        "Another Exam Readiness calculation still owns the user lease",
      );
    }
    if (job.status === "succeeded") {
      const current = await getStoredCurrentReadiness(args.supabase, args.userId);
      if (current !== null) return current;
      throw new ExamReadinessServiceError(
        "claim_invalid",
        "Succeeded Exam Readiness job has no saved result",
      );
    }
    if (job.status !== "processing") {
      throw new ExamReadinessServiceError(
        "claim_invalid",
        "Claimed Exam Readiness job is not processing",
      );
    }

    const calculationReferenceTime = suppliedReferenceTime === null
      ? calculationStart()
      : new Date(suppliedReferenceTime.getTime());
    try {
      const evidence = await loadExamReadinessEvidence(args.supabase, args.userId);
      if (evidence.evidenceRevision !== job.evidenceRevision) {
        await failRecalculation(args.supabase, job, "stale_evidence");
        continue;
      }
      const draft = calculateExamReadinessDraft({ evidence, calculationReferenceTime });
      const result = finalizeExamReadinessResult(
        draft,
        completionTimeAfter(calculationReferenceTime),
      );
      const completion = await completeRecalculation(args.supabase, job, result);
      if (completion === "saved") return result;
      if (completion === "stale") continue;
      throw new ExamReadinessServiceError(
        "completion_failed",
        "Exam Readiness completion returned an invalid status",
      );
    } catch (error) {
      await failRecalculation(
        args.supabase,
        job,
        errorCode(error),
      ).catch(() => undefined);
      throw error;
    }
  }

  throw temporaryError(
    "recalculation_unstable",
    "Exam Readiness evidence or calculation ownership changed three times",
  );
}

export async function getCurrentReadiness(args: {
  supabase: SupabaseClient;
  userId: string;
  now?: Date;
}): Promise<ExamReadinessResult | null> {
  const callerReferenceTime = calculationStart(args.now);
  let current = await getStoredCurrentReadiness(args.supabase, args.userId);
  const recovery = await getReadinessRecoveryState(args.supabase, args.userId);
  const currentRevision = current?.evidence.evidenceRevision ?? 0;
  if (recovery.evidenceRevision > currentRevision) {
    const trigger = recovery.failedTrigger ?? {
      triggerType: "evidence_revision",
      triggerId: String(recovery.evidenceRevision),
    };
    current = await recalculateExamReadiness({
      supabase: args.supabase,
      userId: args.userId,
      ...trigger,
      now: callerReferenceTime,
    });
  }

  for (let recalculation = 0; ; recalculation += 1) {
    if (
      current === null
      || current.validUntil === null
      || Date.parse(current.validUntil) > callerReferenceTime.getTime()
    ) {
      return current;
    }
    if (recalculation >= MAX_TIME_BOUNDARY_RECALCULATIONS) break;
    current = await recalculateExamReadiness({
      supabase: args.supabase,
      userId: args.userId,
      triggerType: "time_boundary",
      triggerId: current.validUntil,
      now: callerReferenceTime,
    });
  }

  throw temporaryError(
    "current_read_unstable",
    "Exam Readiness remained expired after three time-boundary recalculations",
  );
}

async function claimRecalculation(args: {
  supabase: SupabaseClient;
  userId: string;
  triggerType: string;
  triggerId: string;
}): Promise<RecalculationJob | null> {
  const response = await args.supabase.rpc("claim_exam_readiness_recalculation", {
    p_user_id: args.userId,
    p_trigger_type: args.triggerType,
    p_trigger_id: args.triggerId,
    p_model_version: EXAM_READINESS_MODEL_VERSION,
    p_exam_scheme_version: EXAM_SCHEME_VERSION,
    p_lease_seconds: LEASE_SECONDS,
  }) as RpcResponse;
  if (response.error) {
    throw new ExamReadinessServiceError(
      "claim_failed",
      "Could not claim Exam Readiness recalculation",
      { retryable: true },
    );
  }
  if (!Array.isArray(response.data)) {
    throw new ExamReadinessServiceError(
      "claim_invalid",
      "Exam Readiness claim returned an invalid response",
    );
  }
  if (response.data.length === 0) return null;
  return parseJob(response.data[0]);
}

async function completeRecalculation(
  supabase: SupabaseClient,
  job: RecalculationJob,
  result: ExamReadinessResult,
): Promise<"saved" | "stale"> {
  const response = await supabase.rpc("complete_exam_readiness_recalculation", {
    p_job_id: job.jobId,
    p_expected_evidence_revision: job.evidenceRevision,
    p_expected_attempt: job.attemptCount,
    p_result: result,
  }) as RpcResponse;
  if (response.error) {
    throw new ExamReadinessServiceError(
      "completion_failed",
      "Could not complete Exam Readiness recalculation",
      { retryable: true },
    );
  }
  return response.data as "saved" | "stale";
}

async function failRecalculation(
  supabase: SupabaseClient,
  job: RecalculationJob,
  code: string,
): Promise<void> {
  const response = await supabase.rpc("fail_exam_readiness_recalculation", {
    p_job_id: job.jobId,
    p_expected_attempt: job.attemptCount,
    p_error_code: code,
  }) as RpcResponse;
  if (response.error) {
    throw new ExamReadinessServiceError(
      "completion_failed",
      "Could not mark Exam Readiness recalculation failed",
      { retryable: true },
    );
  }
}

async function waitForCommittedCurrent(
  supabase: SupabaseClient,
  userId: string,
  baseline: ExamReadinessResult | null,
): Promise<ExamReadinessResult | null> {
  for (let attempt = 0; attempt < COMMIT_WAIT_ATTEMPTS; attempt += 1) {
    const current = await getStoredCurrentReadiness(supabase, userId);
    if (isNewCommit(current, baseline)) return current;
    if (attempt + 1 < COMMIT_WAIT_ATTEMPTS) {
      await delay(COMMIT_WAIT_INTERVAL_MS);
    }
  }
  return null;
}

function isNewCommit(
  current: ExamReadinessResult | null,
  baseline: ExamReadinessResult | null,
): current is ExamReadinessResult {
  if (current === null) return false;
  if (baseline === null) return true;
  return current.calculatedAt !== baseline.calculatedAt
    || current.calculationReferenceTime !== baseline.calculationReferenceTime
    || current.evidence.evidenceRevision !== baseline.evidence.evidenceRevision;
}

function parseJob(value: unknown): RecalculationJob {
  if (!isRecord(value)) throw invalidClaim();
  const evidenceRevision = nonNegativeInteger(value.evidence_revision);
  const attemptCount = nonNegativeInteger(value.attempt_count);
  if (
    typeof value.job_id !== "string"
    || !isJobStatus(value.status)
    || evidenceRevision === null
    || attemptCount === null
  ) {
    throw invalidClaim();
  }
  return {
    jobId: value.job_id,
    status: value.status,
    evidenceRevision,
    attemptCount,
  };
}

function invalidClaim(): ExamReadinessServiceError {
  return new ExamReadinessServiceError(
    "claim_invalid",
    "Exam Readiness claim row is malformed",
  );
}

function calculationStart(now?: Date): Date {
  const startedAt = now === undefined ? new Date() : new Date(now.getTime());
  if (!Number.isFinite(startedAt.getTime())) {
    throw new ExamReadinessServiceError("claim_invalid", "now must be a valid Date");
  }
  return startedAt;
}

function completionTimeAfter(referenceTime: Date): Date {
  return new Date(Math.max(Date.now(), referenceTime.getTime() + 1));
}

function temporaryError(
  code: "current_read_unstable" | "recalculation_busy" | "recalculation_unstable",
  message: string,
): ExamReadinessServiceError {
  return new ExamReadinessServiceError(code, message, { retryable: true });
}

function errorCode(error: unknown): string {
  if (isRecord(error) && typeof error.code === "string" && error.code.length > 0) {
    return error.code.slice(0, 100);
  }
  return "calculation_failed";
}

function requireNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new ExamReadinessServiceError("claim_invalid", `${name} is required`);
  }
}

function nonNegativeInteger(value: unknown): number | null {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof parsed === "number"
    && Number.isSafeInteger(parsed)
    && parsed >= 0
    ? parsed
    : null;
}

function isJobStatus(value: unknown): value is RecalculationJob["status"] {
  return value === "processing" || value === "succeeded" || value === "failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
