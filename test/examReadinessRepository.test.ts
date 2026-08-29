import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

import {
  ExamReadinessRepositoryError,
  getReadinessRecoveryState,
  getStoredCurrentReadiness,
  loadExamReadinessEvidence,
  registerEvidenceEvent,
} from "@/lib/examReadiness/repository";
import { calculateExamReadinessDraft, finalizeExamReadinessResult } from "@/lib/examReadiness/calculator";
import { dedupeAnswerEvents } from "@/lib/examReadiness/evidence";
import { makeEvidence } from "@/test/fixtures/examReadiness/v1-cases";

type QueryResult = { data: unknown; error: unknown };

class FakeQuery implements PromiseLike<QueryResult> {
  constructor(
    private readonly execute: () => QueryResult,
    private readonly calls: string[],
    private readonly table: string,
  ) {}

  select(columns: string) {
    this.calls.push(`${this.table}.select:${columns}`);
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push(`${this.table}.eq:${column}=${String(value)}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.calls.push(`${this.table}.order:${column}:${options?.ascending === true ? "asc" : "desc"}`);
    return this;
  }

  limit(count: number) {
    this.calls.push(`${this.table}.limit:${count}`);
    return this;
  }

  maybeSingle() {
    this.calls.push(`${this.table}.maybeSingle`);
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

function fakeSupabase(args: {
  tables?: Record<string, unknown>;
  revisions?: Array<number | null>;
  currentResult?: unknown;
  rpcResult?: QueryResult;
}) {
  const calls: string[] = [];
  let revisionIndex = 0;
  const from = vi.fn((table: string) => new FakeQuery(() => {
    if (table === "exam_readiness_evidence_state") {
      const revision = args.revisions?.[revisionIndex++] ?? null;
      return { data: revision === null ? null : { revision }, error: null };
    }
    if (table === "exam_readiness_current") {
      return {
        data: args.currentResult === undefined ? null : { result: args.currentResult },
        error: null,
      };
    }
    return { data: args.tables?.[table] ?? null, error: null };
  }, calls, table));
  const rpc = vi.fn().mockResolvedValue(
    args.rpcResult ?? { data: 1, error: null },
  );
  return { client: { from, rpc } as unknown as SupabaseClient, calls, from, rpc };
}

const USER_ID = "10000000-0000-0000-0000-000000000001";
const ANSWERED_AT = "2026-08-21T00:00:00.000Z";

function evidenceTables() {
  return {
    user_progress: {
      topic_mastery_stats: {
        "tech-ai-ml": {
          topicId: "tech-ai-ml",
          masteryScore: 54,
          lastEvaluatedAt: ANSWERED_AT,
          correctCount: 0,
          incorrectCount: 1,
          reviewSuccessCount: 0,
          recentEvidence: [{
            questionId: "legacy-review-q",
            kind: "review",
            isCorrect: false,
            isFirstSeen: false,
            answeredAt: ANSWERED_AT,
          }] as Array<{
            questionId: string;
            kind: string;
            isCorrect: boolean;
            isFirstSeen: boolean;
            exposureState?: "first" | "seen" | "unknown";
            answeredAt: string;
          }>,
        },
      },
      review_queue: [{
        topicId: "tech-ai-ml",
        dueAt: "2026-08-22T00:00:00.000Z",
        reason: "復習で間違えた",
        reviewStage: 0,
        lastReviewedAt: ANSWERED_AT,
        reasonCode: "review_failure",
      }],
    },
    question_attempts: [{
      attempt_id: "attempt-1",
      question_id: "ipa-it-passport-2026-q016",
      question_type: "official_past",
      topic_id: "tech-ai-ml",
      is_correct: true,
      answered_at: "2026-08-21T01:00:00.000Z",
      official_exam_field: "strategy",
      is_first_attempt: false,
      attempt_group_id: "session-completed",
    }],
    assessment_sessions: [
      {
        session_id: "session-completed",
        user_id: USER_ID,
        source: "official_past",
        mode: "exam",
        status: "completed",
        started_at: "2026-08-21T00:00:00.000Z",
        completed_at: "2026-08-21T02:00:00.000Z",
        question_count: 1,
        answered_count: 1,
        correct_count: 1,
        first_count: 0,
        seen_count: 1,
        unknown_count: 0,
      },
      {
        session_id: "session-progress",
        user_id: USER_ID,
        source: "mock",
        mode: "exam",
        status: "in_progress",
        started_at: "2026-08-22T00:00:00.000Z",
        completed_at: null,
        question_count: 100,
        answered_count: 2,
        correct_count: 1,
        first_count: 1,
        seen_count: 0,
        unknown_count: 1,
      },
      {
        session_id: "session-abandoned",
        user_id: USER_ID,
        source: "checkpoint",
        mode: "exam",
        status: "abandoned",
        started_at: "2026-08-20T00:00:00.000Z",
        completed_at: "2026-08-20T01:00:00.000Z",
        question_count: 10,
        answered_count: 4,
        correct_count: 3,
        first_count: 2,
        seen_count: 1,
        unknown_count: 1,
      },
    ],
    assessment_session_answers: [{
      answer_id: "session-answer-1",
      idempotency_key: "session-answer-event-1",
      session_id: "session-completed",
      canonical_question_id: "ipa-it-passport-2026-q016",
      topic_id: "tech-ai-ml",
      field_id: "strategy",
      is_correct: true,
      first_attempt_state: "seen",
      answered_at: "2026-08-21T01:00:00.000Z",
    }],
  };
}

describe("loadExamReadinessEvidence", () => {
  it("collects authoritative P0, attempt, session, answer, revision, and catalog evidence", async () => {
    const fake = fakeSupabase({ tables: evidenceTables(), revisions: [9, 9] });

    const evidence = await loadExamReadinessEvidence(fake.client, USER_ID);

    expect(evidence.evidenceRevision).toBe(9);
    expect(evidence.topics.some((topic) => topic.topicId === "tech-ai-ml")).toBe(true);
    expect(evidence.masteryByTopic["tech-ai-ml"]?.masteryScore).toBe(54);
    expect(evidence.reviewOutcomes).toEqual([expect.objectContaining({
      topicId: "tech-ai-ml",
      isCorrect: false,
      stage: 0,
      dueAt: "2026-08-22T00:00:00.000Z",
      scheduledIntervalDays: 1,
    })]);
    expect(evidence.weakTopicSignals).toContainEqual({
      topicId: "tech-ai-ml",
      reason: "review_failure",
    });
    expect(evidence.answers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        answerId: null,
        canonicalQuestionId: "legacy-review-q",
        firstAttemptState: "unknown",
        kind: "review",
      }),
      expect.objectContaining({
        answerId: "attempt-1",
        canonicalQuestionId: "ipa-it-passport-2026-q016",
        fieldId: "technology",
        officialExamFieldId: "strategy",
        firstAttemptState: "seen",
      }),
      expect.objectContaining({
        answerId: "session-answer-1",
        sessionId: "session-completed",
        fieldId: "technology",
        officialExamFieldId: "strategy",
        firstAttemptState: "seen",
      }),
    ]));
    expect(evidence.answers.find((answer) => answer.answerId === null)?.idempotencyKey)
      .toBe(`legacy-review-q\u001freview\u001f${ANSWERED_AT}`);
    expect(dedupeAnswerEvents(evidence.answers).filter(
      (answer) => answer.canonicalQuestionId === "ipa-it-passport-2026-q016",
    )).toHaveLength(1);
    expect(evidence.assessmentSessions.map((session) => session.status).sort()).toEqual([
      "abandoned",
      "completed",
      "in_progress",
    ]);
    expect(fake.calls).toContain("assessment_sessions.order:completed_at:desc");
    expect(fake.calls).toContain("assessment_sessions.order:session_id:asc");
  });

  it("keeps genuine attempt IDs when two attempts share question, kind, and timestamp", async () => {
    const tables = evidenceTables();
    tables.question_attempts.push({
      ...tables.question_attempts[0],
      attempt_id: "attempt-2",
    });
    const fake = fakeSupabase({ tables, revisions: [9, 9] });

    const evidence = await loadExamReadinessEvidence(fake.client, USER_ID);
    const official = evidence.answers.filter(
      (answer) => answer.canonicalQuestionId === "ipa-it-passport-2026-q016",
    );
    const deduplicated = dedupeAnswerEvents(official);

    expect(official.find((answer) => answer.answerId === "attempt-1")?.idempotencyKey)
      .toBe("session-answer-event-1");
    expect(official.find((answer) => answer.answerId === "attempt-2")?.idempotencyKey)
      .toBe("question_attempt:attempt-2");
    expect(deduplicated.map((answer) => answer.answerId).sort()).toEqual([
      "attempt-1",
      "attempt-2",
    ]);
  });

  it("reconciles one physical P0 miss with its question-attempt copy and keeps richer P0 semantics", async () => {
    const tables = evidenceTables();
    const mastery = tables.user_progress.topic_mastery_stats["tech-ai-ml"];
    mastery.masteryScore = 80;
    mastery.recentEvidence = [{
      questionId: "legacy-review-q",
      kind: "review",
      isCorrect: false,
      isFirstSeen: false,
      exposureState: "unknown",
      answeredAt: ANSWERED_AT,
    }];
    tables.user_progress.review_queue = [];
    tables.question_attempts[0] = {
      ...tables.question_attempts[0],
      attempt_id: "topic-attempt-1",
      question_id: "legacy-review-q",
      question_type: "topic_quiz",
      is_correct: false,
      answered_at: ANSWERED_AT,
      is_first_attempt: false,
      attempt_group_id: "",
    };
    tables.assessment_session_answers = [];
    const fake = fakeSupabase({ tables, revisions: [9, 9] });

    const evidence = await loadExamReadinessEvidence(fake.client, USER_ID);
    const physical = evidence.answers.filter(
      (answer) => answer.canonicalQuestionId === "legacy-review-q",
    );

    expect(physical).toEqual([expect.objectContaining({
      answerId: "topic-attempt-1",
      kind: "review",
      firstAttemptState: "seen",
      isCorrect: false,
    })]);
  });

  it("keeps question-attempt first state when a matching P0 event disagrees", async () => {
    const tables = evidenceTables();
    const mastery = tables.user_progress.topic_mastery_stats["tech-ai-ml"];
    mastery.recentEvidence = [{
      questionId: "legacy-review-q",
      kind: "review",
      isCorrect: false,
      isFirstSeen: true,
      exposureState: "first",
      answeredAt: ANSWERED_AT,
    }];
    tables.user_progress.review_queue = [];
    tables.question_attempts[0] = {
      ...tables.question_attempts[0],
      attempt_id: "topic-attempt-1",
      question_id: "legacy-review-q",
      question_type: "topic_quiz",
      is_correct: false,
      answered_at: ANSWERED_AT,
      is_first_attempt: false,
      attempt_group_id: "",
    };
    tables.assessment_session_answers = [];
    const fake = fakeSupabase({ tables, revisions: [9, 9] });

    const evidence = await loadExamReadinessEvidence(fake.client, USER_ID);
    const [physical] = evidence.answers.filter(
      (answer) => answer.canonicalQuestionId === "legacy-review-q",
    );

    expect(physical).toEqual(expect.objectContaining({
      answerId: "topic-attempt-1",
      kind: "review",
      firstAttemptState: "seen",
    }));
  });

  it("keeps a genuinely later miss after reconciling the earlier P0/attempt copy", async () => {
    const tables = evidenceTables();
    const mastery = tables.user_progress.topic_mastery_stats["tech-ai-ml"];
    mastery.recentEvidence = [{
      questionId: "legacy-review-q",
      kind: "confirmation",
      isCorrect: false,
      isFirstSeen: true,
      exposureState: "first",
      answeredAt: ANSWERED_AT,
    }];
    tables.question_attempts = [
      {
        ...tables.question_attempts[0],
        attempt_id: "topic-attempt-1",
        question_id: "legacy-review-q",
        question_type: "topic_quiz",
        is_correct: false,
        answered_at: ANSWERED_AT,
        is_first_attempt: true,
        attempt_group_id: "",
      },
      {
        ...tables.question_attempts[0],
        attempt_id: "topic-attempt-2",
        question_id: "legacy-review-q",
        question_type: "topic_quiz",
        is_correct: false,
        answered_at: "2026-08-21T01:00:00.000Z",
        is_first_attempt: false,
        attempt_group_id: "",
      },
    ];
    tables.assessment_session_answers = [];
    const fake = fakeSupabase({ tables, revisions: [9, 9] });

    const evidence = await loadExamReadinessEvidence(fake.client, USER_ID);

    expect(evidence.answers.filter(
      (answer) => answer.canonicalQuestionId === "legacy-review-q",
    )).toHaveLength(2);
  });

  it.each([
    ["missing exposure and first-seen true", { isFirstSeen: true }, "first"],
    ["missing exposure and first-seen false", { isFirstSeen: false }, "unknown"],
    [
      "explicit unknown exposure",
      { exposureState: "unknown", isFirstSeen: true },
      "unknown",
    ],
  ] as const)("maps P0 legacy exposure: %s", async (_name, legacy, expected) => {
    const tables = evidenceTables();
    const mastery = tables.user_progress.topic_mastery_stats["tech-ai-ml"];
    mastery.recentEvidence = [{
      ...mastery.recentEvidence[0],
      ...legacy,
    }];
    const fake = fakeSupabase({ tables, revisions: [9, 9] });

    const evidence = await loadExamReadinessEvidence(fake.client, USER_ID);

    expect(evidence.answers.find((answer) => answer.answerId === null)?.firstAttemptState)
      .toBe(expected);
  });

  it("retries the whole evidence read when the revision changes", async () => {
    const fake = fakeSupabase({ tables: evidenceTables(), revisions: [1, 2, 2, 2] });

    const evidence = await loadExamReadinessEvidence(fake.client, USER_ID);

    expect(evidence.evidenceRevision).toBe(2);
    expect(fake.from.mock.calls.filter(([table]) => table === "user_progress")).toHaveLength(2);
  });

  it("fails with a typed evidence_revision_unstable error after three changing reads", async () => {
    const fake = fakeSupabase({
      tables: evidenceTables(),
      revisions: [1, 2, 2, 3, 3, 4],
    });

    await expect(loadExamReadinessEvidence(fake.client, USER_ID)).rejects.toMatchObject({
      name: "ExamReadinessRepositoryError",
      code: "evidence_revision_unstable",
    });
    expect(fake.from.mock.calls.filter(([table]) => table === "user_progress")).toHaveLength(3);
  });
});

describe("stored readiness and revision adapters", () => {
  it("returns the current revision and latest failed trigger for lazy recovery", async () => {
    const fake = fakeSupabase({
      revisions: [8],
      tables: {
        exam_readiness_recalculation_jobs: {
          trigger_type: "assessment",
          trigger_id: "session-1",
          evidence_revision: 8,
        },
      },
    });

    await expect(getReadinessRecoveryState(fake.client, USER_ID)).resolves.toEqual({
      evidenceRevision: 8,
      failedTrigger: {
        triggerType: "assessment",
        triggerId: "session-1",
      },
    });
    expect(fake.calls).toContain("exam_readiness_recalculation_jobs.eq:status=failed");
    expect(fake.calls).toContain("exam_readiness_recalculation_jobs.order:updated_at:desc");
    expect(fake.calls).toContain("exam_readiness_recalculation_jobs.limit:1");
  });

  it("returns a complete stored result and null when no current row exists", async () => {
    const result = finalizeExamReadinessResult(
      calculateExamReadinessDraft({
        evidence: makeEvidence(),
        calculationReferenceTime: new Date("2026-08-22T00:00:00.000Z"),
      }),
      new Date("2026-08-22T00:00:01.000Z"),
    );
    const stored = fakeSupabase({ currentResult: result });
    const missing = fakeSupabase({});

    await expect(getStoredCurrentReadiness(stored.client, USER_ID)).resolves.toEqual(result);
    await expect(getStoredCurrentReadiness(missing.client, USER_ID)).resolves.toBeNull();
  });

  it("rejects malformed or partial result JSON instead of returning a partial score", async () => {
    const fake = fakeSupabase({ currentResult: { score: 72, band: "ready" } });

    await expect(getStoredCurrentReadiness(fake.client, USER_ID)).rejects.toMatchObject({
      name: "ExamReadinessRepositoryError",
      code: "stored_result_invalid",
    });
  });

  it("registers a stable event through the service-role RPC and parses its revision", async () => {
    const fake = fakeSupabase({ rpcResult: { data: 12, error: null } });

    await expect(registerEvidenceEvent(fake.client, USER_ID, "review:attempt-1"))
      .resolves.toBe(12);
    expect(fake.rpc).toHaveBeenCalledWith("register_exam_readiness_evidence", {
      p_user_id: USER_ID,
      p_event_key: "review:attempt-1",
    });
  });

  it("surfaces typed RPC failures", async () => {
    const fake = fakeSupabase({
      rpcResult: { data: null, error: { message: "database unavailable" } },
    });

    await expect(registerEvidenceEvent(fake.client, USER_ID, "event"))
      .rejects.toBeInstanceOf(ExamReadinessRepositoryError);
  });
});
