import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamReadinessResult } from "@/types/examReadiness";
import {
  calculateExamReadinessDraft,
  finalizeExamReadinessResult,
} from "@/lib/examReadiness/calculator";
import {
  makeAnswer,
  makeEvidence,
} from "@/test/fixtures/examReadiness/v1-cases";

vi.mock("server-only", () => ({}));

const repository = vi.hoisted(() => ({
  getStoredCurrentReadiness: vi.fn(),
  loadExamReadinessEvidence: vi.fn(),
}));

vi.mock("@/lib/examReadiness/repository", () => repository);

import {
  ExamReadinessServiceError,
  getCurrentReadiness,
  recalculateExamReadiness,
} from "@/lib/examReadiness/service";

const USER_ID = "10000000-0000-0000-0000-000000000001";
const REFERENCE_TIME = new Date("2026-08-22T00:00:00.000Z");

type Job = {
  job_id: string;
  status: "processing" | "succeeded" | "failed";
  evidence_revision: number;
  attempt_count: number;
  result: ExamReadinessResult | null;
};

function processingJob(overrides: Partial<Job> = {}): Job {
  return {
    job_id: "job-1",
    status: "processing",
    evidence_revision: 7,
    attempt_count: 1,
    result: null,
    ...overrides,
  };
}

function resultAt(args: {
  referenceTime?: Date;
  calculatedAt?: Date;
  validUntil?: string | null;
  revision?: number;
} = {}): ExamReadinessResult {
  const referenceTime = args.referenceTime ?? REFERENCE_TIME;
  const draft = calculateExamReadinessDraft({
    evidence: makeEvidence({ evidenceRevision: args.revision ?? 7 }),
    calculationReferenceTime: referenceTime,
  });
  return {
    ...finalizeExamReadinessResult(
      draft,
      args.calculatedAt ?? new Date(referenceTime.getTime() + 1_000),
    ),
    validUntil: args.validUntil === undefined ? draft.validUntil : args.validUntil,
  };
}

function fakeSupabase(
  rpcImplementation: (name: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: unknown;
  }>,
) {
  const rpc = vi.fn(rpcImplementation);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

function successfulRpc(job: Job = processingJob()) {
  return fakeSupabase(async (name) => {
    if (name === "claim_exam_readiness_recalculation") {
      return { data: [job], error: null };
    }
    if (name === "complete_exam_readiness_recalculation") {
      return { data: "saved", error: null };
    }
    return { data: null, error: null };
  });
}

describe("recalculateExamReadiness", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    repository.getStoredCurrentReadiness.mockResolvedValue(null);
    repository.loadExamReadinessEvidence.mockResolvedValue(makeEvidence());
  });

  it("freezes one reference time and finalizes at the later completion time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T00:00:05.000Z"));
    const fake = successfulRpc(processingJob({ attempt_count: 4 }));

    const result = await recalculateExamReadiness({
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    });

    expect(result.calculationReferenceTime).toBe(REFERENCE_TIME.toISOString());
    expect(Date.parse(result.calculatedAt)).toBeGreaterThan(REFERENCE_TIME.getTime());
    const completeCall = fake.rpc.mock.calls.find(
      ([name]) => name === "complete_exam_readiness_recalculation",
    );
    expect(completeCall?.[1]).toMatchObject({
      p_job_id: "job-1",
      p_expected_evidence_revision: 7,
      p_expected_attempt: 4,
      p_result: expect.objectContaining({
        calculationReferenceTime: REFERENCE_TIME.toISOString(),
      }),
    });
  });

  it("marks the claimed attempt failed and a later call reclaims the same job", async () => {
    repository.loadExamReadinessEvidence
      .mockRejectedValueOnce(new Error("evidence unavailable"))
      .mockResolvedValueOnce(makeEvidence());
    let claimCount = 0;
    const fake = fakeSupabase(async (name, params) => {
      if (name === "claim_exam_readiness_recalculation") {
        claimCount += 1;
        return {
          data: [processingJob({ attempt_count: claimCount })],
          error: null,
        };
      }
      if (name === "fail_exam_readiness_recalculation") {
        expect(params).toMatchObject({
          p_job_id: "job-1",
          p_expected_attempt: 1,
        });
        return { data: null, error: null };
      }
      return { data: "saved", error: null };
    });

    await expect(recalculateExamReadiness({
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    })).rejects.toThrow("evidence unavailable");

    await expect(recalculateExamReadiness({
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    })).resolves.toMatchObject({ evidence: { evidenceRevision: 7 } });

    const claims = fake.rpc.mock.calls.filter(
      ([name]) => name === "claim_exam_readiness_recalculation",
    );
    expect(claims).toHaveLength(2);
    expect(claims[0]?.[1]).toEqual(claims[1]?.[1]);
  });

  it("returns the saved result for a succeeded duplicate without recalculating", async () => {
    const saved = resultAt();
    repository.getStoredCurrentReadiness.mockResolvedValue(saved);
    const fake = successfulRpc(processingJob({
      status: "succeeded",
      result: saved,
    }));

    await expect(recalculateExamReadiness({
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    })).resolves.toEqual(saved);
    expect(repository.loadExamReadinessEvidence).not.toHaveBeenCalled();
    expect(fake.rpc).toHaveBeenCalledTimes(1);
  });

  it("reloads the latest evidence and reclaims after stale completion", async () => {
    repository.loadExamReadinessEvidence
      .mockResolvedValueOnce(makeEvidence({ evidenceRevision: 7 }))
      .mockResolvedValueOnce(makeEvidence({ evidenceRevision: 8 }));
    let claimCount = 0;
    let completeCount = 0;
    const fake = fakeSupabase(async (name) => {
      if (name === "claim_exam_readiness_recalculation") {
        claimCount += 1;
        return {
          data: [processingJob({
            evidence_revision: claimCount === 1 ? 7 : 8,
            attempt_count: claimCount,
          })],
          error: null,
        };
      }
      if (name === "complete_exam_readiness_recalculation") {
        completeCount += 1;
        return { data: completeCount === 1 ? "stale" : "saved", error: null };
      }
      return { data: null, error: null };
    });

    const result = await recalculateExamReadiness({
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    });

    expect(repository.loadExamReadinessEvidence).toHaveBeenCalledTimes(2);
    expect(result.evidence.evidenceRevision).toBe(8);
    expect(claimCount).toBe(2);
    expect(fake.rpc.mock.calls.filter(
      ([name]) => name === "complete_exam_readiness_recalculation",
    ).map(([, params]) => params.p_expected_attempt)).toEqual([1, 2]);
  });

  it("returns a typed temporary failure after three stale recomputations", async () => {
    const fake = fakeSupabase(async (name) => {
      if (name === "claim_exam_readiness_recalculation") {
        return { data: [processingJob()], error: null };
      }
      return { data: "stale", error: null };
    });

    await expect(recalculateExamReadiness({
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    })).rejects.toMatchObject({
      name: "ExamReadinessServiceError",
      code: "recalculation_unstable",
      retryable: true,
    });
    expect(repository.loadExamReadinessEvidence).toHaveBeenCalledTimes(3);
  });

  it("lets only the lease owner calculate while a concurrent caller waits for its commit", async () => {
    let releaseEvidence!: () => void;
    const evidenceGate = new Promise<void>((resolve) => {
      releaseEvidence = resolve;
    });
    let stored: ExamReadinessResult | null = null;
    repository.getStoredCurrentReadiness.mockImplementation(async () => stored);
    repository.loadExamReadinessEvidence.mockImplementation(async () => {
      await evidenceGate;
      return makeEvidence();
    });
    let claimCount = 0;
    const fake = fakeSupabase(async (name, params) => {
      if (name === "claim_exam_readiness_recalculation") {
        claimCount += 1;
        return {
          data: claimCount === 1 ? [processingJob()] : [],
          error: null,
        };
      }
      if (name === "complete_exam_readiness_recalculation") {
        stored = params.p_result as ExamReadinessResult;
        return { data: "saved", error: null };
      }
      return { data: null, error: null };
    });
    const args = {
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    };

    const owner = recalculateExamReadiness(args);
    await vi.waitFor(() => expect(repository.loadExamReadinessEvidence).toHaveBeenCalledTimes(1));
    const waiter = recalculateExamReadiness(args);
    releaseEvidence();

    const [ownerResult, waiterResult] = await Promise.all([owner, waiter]);
    expect(waiterResult).toEqual(ownerResult);
    expect(repository.loadExamReadinessEvidence).toHaveBeenCalledTimes(1);
  });

  it("reports typed temporary failure when another owner does not commit in the bounded wait", async () => {
    const fake = fakeSupabase(async () => ({ data: [], error: null }));

    const error = await recalculateExamReadiness({
      supabase: fake.client,
      userId: USER_ID,
      triggerType: "assessment_completed",
      triggerId: "session-1",
      now: REFERENCE_TIME,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ExamReadinessServiceError);
    expect(error).toMatchObject({ code: "recalculation_busy", retryable: true });
    expect(repository.loadExamReadinessEvidence).not.toHaveBeenCalled();
  });
});

describe("getCurrentReadiness", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    repository.loadExamReadinessEvidence.mockResolvedValue(makeEvidence());
  });

  it("returns null without claiming when no current result has been saved", async () => {
    repository.getStoredCurrentReadiness.mockResolvedValue(null);
    const fake = fakeSupabase(async () => ({ data: null, error: null }));

    await expect(getCurrentReadiness({
      supabase: fake.client,
      userId: USER_ID,
      now: REFERENCE_TIME,
    })).resolves.toBeNull();
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("returns an unexpired stored result without recalculation", async () => {
    const current = resultAt({ validUntil: "2026-08-23T00:00:00.000Z" });
    repository.getStoredCurrentReadiness.mockResolvedValue(current);
    const fake = fakeSupabase(async () => ({ data: null, error: null }));

    await expect(getCurrentReadiness({
      supabase: fake.client,
      userId: USER_ID,
      now: REFERENCE_TIME,
    })).resolves.toEqual(current);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("uses the prior boundary as an idempotent time-boundary trigger when expired", async () => {
    const priorValidUntil = "2026-08-21T00:00:00.000Z";
    repository.getStoredCurrentReadiness.mockResolvedValue(
      resultAt({ validUntil: priorValidUntil }),
    );
    const fake = successfulRpc();

    await getCurrentReadiness({
      supabase: fake.client,
      userId: USER_ID,
      now: REFERENCE_TIME,
    });

    expect(fake.rpc).toHaveBeenCalledWith(
      "claim_exam_readiness_recalculation",
      expect.objectContaining({
        p_trigger_type: "time_boundary",
        p_trigger_id: priorValidUntil,
      }),
    );
  });

  it("returns a stored null-validUntil result without entering a recalculation loop", async () => {
    const current = resultAt({ validUntil: null });
    repository.getStoredCurrentReadiness.mockResolvedValue(current);
    const fake = fakeSupabase(async () => ({ data: null, error: null }));

    await expect(getCurrentReadiness({
      supabase: fake.client,
      userId: USER_ID,
      now: new Date("2027-08-22T00:00:00.000Z"),
    })).resolves.toEqual(current);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("stores only the next boundary strictly after the frozen reference time", async () => {
    repository.getStoredCurrentReadiness.mockResolvedValue(
      resultAt({ validUntil: "2026-08-21T00:00:00.000Z" }),
    );
    repository.loadExamReadinessEvidence.mockResolvedValue(makeEvidence({
      answers: [makeAnswer(0, {
        answeredAt: "2026-07-23T00:00:00.000Z",
        firstAttemptState: "first",
      })],
    }));
    const fake = successfulRpc();

    const result = await getCurrentReadiness({
      supabase: fake.client,
      userId: USER_ID,
      now: REFERENCE_TIME,
    });

    expect(result?.validUntil).toBe("2026-08-23T00:00:00.000Z");
    expect(Date.parse(result!.validUntil!)).toBeGreaterThan(REFERENCE_TIME.getTime());
    expect(fake.rpc.mock.calls.find(
      ([name]) => name === "complete_exam_readiness_recalculation",
    )?.[1]).toMatchObject({
      p_result: expect.objectContaining({
        validUntil: "2026-08-23T00:00:00.000Z",
      }),
    });
  });
});
