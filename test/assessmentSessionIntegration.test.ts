import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

const recalculateExamReadiness = vi.hoisted(() => vi.fn());
vi.mock("@/lib/examReadiness/service", () => ({ recalculateExamReadiness }));

import {
  AssessmentSessionPersistenceError,
  abandonAssessmentSession,
  completeAssessmentSession,
  startAssessmentSession,
} from "@/lib/examReadiness/assessmentSession";
import { computeSummativePerformance } from "@/lib/examReadiness/components";
import type { AssessmentSession, ComponentInput } from "@/types/examReadiness";

type SessionRow = {
  session_id: string;
  user_id: string;
  source: "checkpoint" | "summary" | "mock" | "official_past";
  mode: "practice" | "exam";
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
  question_count: number;
  answered_count: number;
  correct_count: number;
  first_count: number;
  seen_count: number;
  unknown_count: number;
};

type AttemptRow = {
  attempt_id: string;
  question_id: string;
  question_type: string;
  topic_id: string;
  is_correct: boolean;
  answered_at: string;
  official_exam_field: string | null;
  is_first_attempt: boolean;
  attempt_group_id: string;
};

type QueryResult = { data: unknown; error: unknown };

class MemoryQuery implements PromiseLike<QueryResult> {
  private filters: Array<[string, unknown]> = [];
  private operation: "select" | "insert" | "update" = "select";
  private value: Record<string, unknown> | null = null;

  constructor(private readonly db: MemorySupabase, private readonly table: string) {}

  select() {
    return this;
  }

  insert(value: Record<string, unknown>) {
    this.operation = "insert";
    this.value = value;
    return this;
  }

  update(value: Record<string, unknown>) {
    this.operation = "update";
    this.value = value;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.execute(true));
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute(false)).then(onfulfilled, onrejected);
  }

  private execute(single: boolean): QueryResult {
    if (this.table === "assessment_sessions") {
      if (this.operation === "insert") return this.db.insertSession(this.value!);
      if (this.operation === "update") {
        return this.db.updateSession(this.filters, this.value!, single);
      }
      const rows = [...this.db.sessions.values()].filter((row) =>
        this.filters.every(([column, value]) => row[column as keyof SessionRow] === value)
      );
      return { data: single ? rows[0] ?? null : rows, error: null };
    }
    if (this.table === "question_attempts") {
      if (this.db.attemptQueryResult !== null) return this.db.attemptQueryResult;
      const rows = this.db.attempts.filter((row) =>
        this.filters.every(([column, value]) =>
          column === "user_id" || row[column as keyof AttemptRow] === value
        )
      );
      return { data: rows, error: null };
    }
    return { data: null, error: { message: `unexpected table ${this.table}` } };
  }
}

class MemorySupabase {
  readonly sessions = new Map<string, SessionRow>();
  readonly attempts: AttemptRow[] = [];
  attemptQueryResult: QueryResult | null = null;
  readonly answers = new Map<string, Array<Record<string, unknown>>>();
  readonly evidenceEvents = new Set<string>();
  readonly from = vi.fn((table: string) => new MemoryQuery(this, table));
  readonly rpc = vi.fn(async (name: string, params: Record<string, unknown>) => {
    if (name !== "complete_assessment_session") {
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    }
    const sessionId = params.p_session_id as string;
    const session = this.sessions.get(sessionId);
    const payload = params.p_answers as Array<Record<string, unknown>>;
    if (!session || session.user_id !== params.p_user_id) {
      return { data: null, error: { message: "missing session", code: "P0002" } };
    }
    if (session.status === "completed") {
      const stored = this.answers.get(sessionId) ?? [];
      const same = JSON.stringify(stored) === JSON.stringify(payload)
        && session.completed_at === params.p_completed_at;
      return same
        ? { data: { session, completed_now: false }, error: null }
        : { data: null, error: { message: "conflict", code: "23505" } };
    }
    if (session.status !== "in_progress" || payload.length > session.question_count) {
      return { data: null, error: { message: "terminal", code: "23505" } };
    }
    const counts = {
      answered_count: payload.length,
      correct_count: payload.filter((answer) => answer.is_correct).length,
      first_count: payload.filter((answer) => answer.first_attempt_state === "first").length,
      seen_count: payload.filter((answer) => answer.first_attempt_state === "seen").length,
      unknown_count: payload.filter((answer) => answer.first_attempt_state === "unknown").length,
    };
    Object.assign(session, counts, {
      status: "completed",
      completed_at: params.p_completed_at,
    });
    this.answers.set(sessionId, payload);
    this.evidenceEvents.add(`assessment:${sessionId}`);
    return { data: { session, completed_now: true }, error: null };
  });

  insertSession(value: Record<string, unknown>): QueryResult {
    const id = value.session_id as string;
    if (this.sessions.has(id)) {
      return { data: null, error: { code: "23505", message: "duplicate" } };
    }
    const row = value as SessionRow;
    this.sessions.set(id, row);
    return { data: row, error: null };
  }

  updateSession(
    filters: Array<[string, unknown]>,
    value: Record<string, unknown>,
    single: boolean,
  ): QueryResult {
    const rows = [...this.sessions.values()].filter((row) =>
      filters.every(([column, expected]) => row[column as keyof SessionRow] === expected)
    );
    for (const row of rows) Object.assign(row, value);
    return { data: single ? rows[0] ?? null : rows, error: null };
  }

  client(): SupabaseClient {
    return this as unknown as SupabaseClient;
  }
}

const USER_ID = "10000000-0000-0000-0000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const STARTED_AT = "2026-08-23T01:00:00.000Z";
const COMPLETED_AT = "2026-08-23T02:00:00.000Z";

function startInput(overrides: Record<string, unknown> = {}) {
  return {
    action: "start" as const,
    sessionId: SESSION_ID,
    source: "mock" as const,
    mode: "exam" as const,
    startedAt: STARTED_AT,
    questionCount: 2,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  recalculateExamReadiness.mockResolvedValue({ score: 72 });
});

describe("assessment session persistence", () => {
  it("starts once, keeps the immutable question count, and rejects a conflicting replay", async () => {
    const db = new MemorySupabase();

    const first = await startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput(),
    });
    const repeated = await startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput(),
    });

    expect(first.status).toBe("in_progress");
    expect(repeated.status).toBe("in_progress");
    expect(db.sessions).toHaveLength(1);
    expect(db.sessions.get(SESSION_ID)?.question_count).toBe(2);
    await expect(startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput({ questionCount: 99 }),
    })).rejects.toBeInstanceOf(AssessmentSessionPersistenceError);
    expect(db.sessions.get(SESSION_ID)?.question_count).toBe(2);
  });

  it("compares replay timestamps by instant and rejects start replays after terminal state", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput({ startedAt: "2026-08-23T01:00:00Z" }),
    });

    await expect(startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput({ startedAt: "2026-08-23T01:00:00.000+00:00" }),
    })).resolves.toMatchObject({ status: "in_progress" });

    Object.assign(db.sessions.get(SESSION_ID)!, {
      status: "completed",
      completed_at: COMPLETED_AT,
    });
    await expect(startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput({ startedAt: "2026-08-23T01:00:00Z" }),
    })).rejects.toMatchObject({ code: "session_conflict" });
  });

  it("abandons only an in-progress session and leaves terminal facts immutable", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({ supabase: db.client(), userId: USER_ID, input: startInput() });

    const abandoned = await abandonAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: { action: "abandon", sessionId: SESSION_ID, completedAt: COMPLETED_AT },
    });

    expect(abandoned.status).toBe("abandoned");
    expect(db.sessions.get(SESSION_ID)?.completed_at).toBe(COMPLETED_AT);
    await expect(completeAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: { action: "complete", sessionId: SESSION_ID, completedAt: COMPLETED_AT, answers: [] },
    })).rejects.toMatchObject({ code: "session_conflict" });
    expect(db.sessions.get(SESSION_ID)?.status).toBe("abandoned");
  });

  it("treats an equivalent abandon replay timestamp as the same instant", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({ supabase: db.client(), userId: USER_ID, input: startInput() });
    await abandonAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: {
        action: "abandon",
        sessionId: SESSION_ID,
        completedAt: "2026-08-23T02:00:00+00:00",
      },
    });

    await expect(abandonAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: { action: "abandon", sessionId: SESSION_ID, completedAt: COMPLETED_AT },
    })).resolves.toMatchObject({ status: "abandoned" });
  });

  it("derives first, seen, and unknown from matching authoritative attempts", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({ supabase: db.client(), userId: USER_ID, input: startInput() });
    db.attempts.push(
      {
        attempt_id: "attempt-1",
        question_id: "tech-binary-data-ex1",
        question_type: "mock_exam",
        topic_id: "tech-binary-data",
        is_correct: true,
        answered_at: "2026-08-23T01:01:00.000Z",
        official_exam_field: null,
        is_first_attempt: true,
        attempt_group_id: SESSION_ID,
      },
      {
        attempt_id: "attempt-2",
        question_id: "tech-security-cia-ex1",
        question_type: "mock_exam",
        topic_id: "tech-security-cia",
        is_correct: false,
        answered_at: "2026-08-23T01:02:00.000Z",
        official_exam_field: null,
        is_first_attempt: false,
        attempt_group_id: SESSION_ID,
      },
    );

    await completeAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: {
        action: "complete",
        sessionId: SESSION_ID,
        completedAt: COMPLETED_AT,
        answers: [
          {
            idempotencyKey: `${SESSION_ID}:q1`,
            canonicalQuestionId: "tech-binary-data-ex1",
            topicId: "untrusted-topic",
            isCorrect: true,
            answeredAt: "2026-08-23T01:01:00.000Z",
          },
          {
            idempotencyKey: `${SESSION_ID}:q2`,
            canonicalQuestionId: "tech-security-cia-ex1",
            topicId: "untrusted-topic",
            isCorrect: false,
            answeredAt: "2026-08-23T01:02:00.000Z",
          },
        ],
      },
    });

    expect(db.sessions.get(SESSION_ID)).toMatchObject({
      answered_count: 2,
      first_count: 1,
      seen_count: 1,
      unknown_count: 0,
    });

    const dbUnknown = new MemorySupabase();
    await startAssessmentSession({
      supabase: dbUnknown.client(),
      userId: USER_ID,
      input: startInput({ sessionId: "20000000-0000-4000-8000-000000000002", questionCount: 1 }),
    });
    await completeAssessmentSession({
      supabase: dbUnknown.client(),
      userId: USER_ID,
      input: {
        action: "complete",
        sessionId: "20000000-0000-4000-8000-000000000002",
        completedAt: COMPLETED_AT,
        answers: [{
          idempotencyKey: "unknown:q1",
          canonicalQuestionId: "tech-binary-data-ex1",
          topicId: "tech-binary-data",
          isCorrect: true,
          answeredAt: "2026-08-23T01:03:00.000Z",
        }],
      },
    });
    expect(dbUnknown.sessions.get("20000000-0000-4000-8000-000000000002"))
      .toMatchObject({ first_count: 0, seen_count: 0, unknown_count: 1 });
  });

  it("re-derives official correctness, Topic, and official field from authoritative facts", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput({ source: "official_past", questionCount: 1 }),
    });
    db.attempts.push({
      attempt_id: "official-attempt",
      question_id: "ipa-it-passport-2026-q016",
      question_type: "official_past",
      topic_id: "tech-ai-ml",
      is_correct: true,
      answered_at: "2026-08-23T01:10:00.000Z",
      official_exam_field: "strategy",
      is_first_attempt: false,
      attempt_group_id: SESSION_ID,
    });

    await completeAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: {
        action: "complete",
        sessionId: SESSION_ID,
        completedAt: COMPLETED_AT,
        answers: [{
          idempotencyKey: `${SESSION_ID}:official`,
          canonicalQuestionId: "ipa-it-passport-2026-q016",
          topicId: "client-topic-is-not-authority",
          isCorrect: false,
          answeredAt: "2026-08-23T01:10:00.000Z",
        }],
      },
    });

    expect(db.answers.get(SESSION_ID)).toEqual([expect.objectContaining({
      canonical_question_id: "ipa-it-passport-2026-q016",
      topic_id: "tech-ai-ml",
      field_id: "strategy",
      is_correct: true,
      first_attempt_state: "seen",
    })]);
  });

  it("matches an official authoritative attempt by instant despite timestamp formatting", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: startInput({ source: "official_past", questionCount: 1 }),
    });
    db.attempts.push({
      attempt_id: "official-equivalent-time",
      question_id: "ipa-it-passport-2026-q016",
      question_type: "official_past",
      topic_id: "tech-ai-ml",
      is_correct: true,
      answered_at: "2026-08-23T01:10:00.000Z",
      official_exam_field: "strategy",
      is_first_attempt: true,
      attempt_group_id: SESSION_ID,
    });

    await expect(completeAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: {
        action: "complete",
        sessionId: SESSION_ID,
        completedAt: COMPLETED_AT,
        answers: [{
          idempotencyKey: `${SESSION_ID}:official-equivalent-time`,
          canonicalQuestionId: "ipa-it-passport-2026-q016",
          topicId: "ignored-client-topic",
          isCorrect: false,
          answeredAt: "2026-08-23T01:10:00+00:00",
        }],
      },
    })).resolves.toMatchObject({ status: "completed", firstCount: 1 });
    expect(db.answers.get(SESSION_ID)?.[0]).toMatchObject({ is_correct: true });
  });

  it("does not complete when the authoritative attempt query fails, then allows retry", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({ supabase: db.client(), userId: USER_ID, input: startInput() });
    db.attemptQueryResult = { data: null, error: { message: "database unavailable" } };
    const input = {
      action: "complete" as const,
      sessionId: SESSION_ID,
      completedAt: COMPLETED_AT,
      answers: [{
        idempotencyKey: `${SESSION_ID}:retry`,
        canonicalQuestionId: "tech-binary-data-ex1",
        topicId: "tech-binary-data",
        isCorrect: true,
        answeredAt: "2026-08-23T01:01:00.000Z",
      }],
    };

    await expect(completeAssessmentSession({
      supabase: db.client(), userId: USER_ID, input,
    })).rejects.toMatchObject({ code: "persistence_failed" });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.sessions.get(SESSION_ID)?.status).toBe("in_progress");

    db.attemptQueryResult = null;
    await expect(completeAssessmentSession({
      supabase: db.client(), userId: USER_ID, input,
    })).resolves.toMatchObject({ status: "completed", unknownCount: 1 });
  });

  it("rejects a malformed authoritative attempt response instead of deriving unknown", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({ supabase: db.client(), userId: USER_ID, input: startInput() });
    db.attemptQueryResult = { data: [{ question_id: "incomplete-row" }], error: null };

    await expect(completeAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: {
        action: "complete",
        sessionId: SESSION_ID,
        completedAt: COMPLETED_AT,
        answers: [],
      },
    })).rejects.toMatchObject({ code: "persistence_failed" });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.sessions.get(SESSION_ID)?.status).toBe("in_progress");
  });

  it("keeps unanswered questions only in the fixed denominator", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({ supabase: db.client(), userId: USER_ID, input: startInput() });

    const completed = await completeAssessmentSession({
      supabase: db.client(),
      userId: USER_ID,
      input: {
        action: "complete",
        sessionId: SESSION_ID,
        completedAt: COMPLETED_AT,
        answers: [{
          idempotencyKey: `${SESSION_ID}:q1`,
          canonicalQuestionId: "tech-binary-data-ex1",
          topicId: "tech-binary-data",
          isCorrect: true,
          answeredAt: "2026-08-23T01:01:00.000Z",
        }],
      },
    });

    expect(completed).toMatchObject({ questionCount: 2, answeredCount: 1, correctCount: 1 });
    expect(db.answers.get(SESSION_ID)).toHaveLength(1);
    expect(computeSummativePerformance(componentInput([completed.session]))).toBe(50);
  });

  it("registers and recalculates once, and keeps saved facts successful when readiness fails", async () => {
    const db = new MemorySupabase();
    await startAssessmentSession({ supabase: db.client(), userId: USER_ID, input: startInput() });
    recalculateExamReadiness.mockRejectedValue(new Error("temporary readiness failure"));

    const input = {
      action: "complete" as const,
      sessionId: SESSION_ID,
      completedAt: COMPLETED_AT,
      answers: [],
    };
    const completed = await completeAssessmentSession({
      supabase: db.client(), userId: USER_ID, input,
    });
    const replay = await completeAssessmentSession({
      supabase: db.client(), userId: USER_ID, input,
    });

    expect(completed).toMatchObject({ status: "completed", readinessUpdated: false });
    expect(replay).toMatchObject({ completedNow: false, readinessUpdated: false });
    expect(db.evidenceEvents).toEqual(new Set([`assessment:${SESSION_ID}`]));
    expect(recalculateExamReadiness).toHaveBeenCalledOnce();
    expect(recalculateExamReadiness).toHaveBeenCalledWith({
      supabase: db,
      userId: USER_ID,
      triggerType: "assessment",
      triggerId: SESSION_ID,
    });
  });
});

describe("delivery eligibility", () => {
  it("uses summary, mock, and official exam as summative while excluding checkpoint, practice, in-progress, and abandoned", () => {
    const sessions = [
      session("summary", "summary", "exam", "completed", 100),
      session("mock", "mock", "exam", "completed", 80),
      session("official-exam", "official_past", "exam", "completed", 60),
      session("checkpoint", "checkpoint", "exam", "completed", 0),
      session("official-practice", "official_past", "practice", "completed", 0),
      session("in-progress", "mock", "exam", "in_progress", 0),
      session("abandoned", "summary", "exam", "abandoned", 0),
    ];

    // weighted mean = (100*0.8 + 80*0.9 + 60*1.0) / 2.7,
    // then 0.7 * weighted mean + 0.3 * minimum.
    expect(computeSummativePerformance(componentInput(sessions))).toBeCloseTo(72.962962963);
  });
});

function session(
  sessionId: string,
  source: AssessmentSession["source"],
  mode: AssessmentSession["mode"],
  status: AssessmentSession["status"],
  score: number,
): AssessmentSession {
  return {
    sessionId,
    userId: USER_ID,
    source,
    mode,
    status,
    startedAt: STARTED_AT,
    completedAt: status === "in_progress" ? null : COMPLETED_AT,
    questionCount: 10,
    answeredCount: 10,
    correctCount: score / 10,
    firstCount: 10,
    seenCount: 0,
    unknownCount: 0,
  };
}

function componentInput(sessions: AssessmentSession[]): ComponentInput {
  return {
    calculationReferenceTime: new Date("2026-08-23T03:00:00.000Z"),
    answers: [],
    topics: [],
    assessmentSessions: sessions,
    masteryByTopic: {},
    reviewOutcomes: [],
  };
}
