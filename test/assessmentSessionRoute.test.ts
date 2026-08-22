import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getInternalUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
  startAssessmentSession: vi.fn(),
  completeAssessmentSession: vi.fn(),
  abandonAssessmentSession: vi.fn(),
}));

vi.mock("@/lib/auth/currentUser", () => ({
  getInternalUserId: mocks.getInternalUserId,
}));
vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));
vi.mock("@/lib/examReadiness/assessmentSession", () => ({
  AssessmentSessionPersistenceError: class extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
  startAssessmentSession: mocks.startAssessmentSession,
  completeAssessmentSession: mocks.completeAssessmentSession,
  abandonAssessmentSession: mocks.abandonAssessmentSession,
}));

import { POST } from "@/app/api/assessment-sessions/route";

const AUTH_USER_ID = "10000000-0000-0000-0000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const SUPABASE = { from: vi.fn(), rpc: vi.fn() };

function request(body: unknown) {
  return POST(new Request("https://example.test/api/assessment-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getInternalUserId.mockResolvedValue(AUTH_USER_ID);
  mocks.getServiceSupabase.mockReturnValue(SUPABASE);
  mocks.startAssessmentSession.mockResolvedValue({
    sessionId: SESSION_ID,
    status: "in_progress",
  });
  mocks.completeAssessmentSession.mockResolvedValue({
    sessionId: SESSION_ID,
    status: "completed",
    completedNow: true,
    readinessUpdated: true,
  });
  mocks.abandonAssessmentSession.mockResolvedValue({
    sessionId: SESSION_ID,
    status: "abandoned",
  });
});

describe("POST /api/assessment-sessions", () => {
  it("uses only the authenticated user and ignores a body userId", async () => {
    const response = await request({
      action: "start",
      userId: "attacker-controlled-user",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt: "2026-08-23T01:00:00.000Z",
      questionCount: 100,
    });

    expect(response.status).toBe(200);
    expect(mocks.startAssessmentSession).toHaveBeenCalledWith({
      supabase: SUPABASE,
      userId: AUTH_USER_ID,
      input: {
        action: "start",
        sessionId: SESSION_ID,
        source: "mock",
        mode: "exam",
        startedAt: "2026-08-23T01:00:00.000Z",
        questionCount: 100,
      },
    });
  });

  it("dispatches complete and abandon through the strict action union", async () => {
    const complete = await request({
      action: "complete",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
      answers: [{
        idempotencyKey: `${SESSION_ID}:q1`,
        canonicalQuestionId: "tech-binary-data-ex1",
        topicId: "tech-binary-data",
        isCorrect: true,
        answeredAt: "2026-08-23T01:01:00.000Z",
      }],
    });
    const abandon = await request({
      action: "abandon",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
    });

    expect(complete.status).toBe(200);
    expect(abandon.status).toBe(200);
    expect(mocks.completeAssessmentSession).toHaveBeenCalledOnce();
    expect(mocks.abandonAssessmentSession).toHaveBeenCalledOnce();
  });

  it.each([
    ["unknown action", { action: "delete", sessionId: SESSION_ID }],
    ["missing start field", {
      action: "start",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt: "2026-08-23T01:00:00.000Z",
    }],
    ["extra start field", {
      action: "start",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt: "2026-08-23T01:00:00.000Z",
      questionCount: 100,
      status: "completed",
    }],
    ["client first attempt state", {
      action: "complete",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
      answers: [{
        idempotencyKey: `${SESSION_ID}:q1`,
        canonicalQuestionId: "tech-binary-data-ex1",
        topicId: "tech-binary-data",
        isCorrect: true,
        firstAttemptState: "first",
        answeredAt: "2026-08-23T01:01:00.000Z",
      }],
    }],
  ])("rejects malformed discriminated input: %s", async (_name, body) => {
    const response = await request(body);

    expect(response.status).toBe(400);
    expect(mocks.startAssessmentSession).not.toHaveBeenCalled();
    expect(mocks.completeAssessmentSession).not.toHaveBeenCalled();
    expect(mocks.abandonAssessmentSession).not.toHaveBeenCalled();
  });

  it.each([
    ["date only", "2026-08-23"],
    ["missing timezone", "2026-08-23T01:00:00"],
    ["locale string", "August 23, 2026 01:00 UTC"],
    ["invalid day", "2026-02-30T01:00:00Z"],
    ["invalid leap day", "2025-02-29T01:00:00Z"],
    ["invalid hour", "2026-08-23T24:00:00Z"],
    ["invalid minute", "2026-08-23T01:60:00Z"],
    ["invalid second", "2026-08-23T01:00:60Z"],
    ["invalid offset hour", "2026-08-23T01:00:00+15:00"],
    ["invalid maximum offset minutes", "2026-08-23T01:00:00+14:01"],
    ["sub-millisecond fraction", "2026-08-23T01:00:00.0001Z"],
    ["long fractional offset timestamp", "2026-08-23T10:00:00.1234+09:00"],
  ])("rejects a non-explicit or impossible ISO timestamp: %s", async (_name, startedAt) => {
    const response = await request({
      action: "start",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt,
      questionCount: 100,
    });

    expect(response.status).toBe(400);
    expect(mocks.startAssessmentSession).not.toHaveBeenCalled();
  });

  it.each([
    "2026-08-23T01:00:00Z",
    "2026-08-23T01:00:00.1Z",
    "2026-08-23T10:00:00+09:00",
    "2026-08-22T11:00:00-14:00",
  ])("accepts an explicit valid ISO timestamp: %s", async (startedAt) => {
    const response = await request({
      action: "start",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt,
      questionCount: 100,
    });

    expect(response.status).toBe(200);
    expect(mocks.startAssessmentSession).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ startedAt }),
    }));
  });

  it.each([
    ["complete timestamp", {
      action: "complete",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00",
      answers: [],
    }],
    ["answer timestamp", {
      action: "complete",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00Z",
      answers: [{
        idempotencyKey: `${SESSION_ID}:q1`,
        canonicalQuestionId: "tech-binary-data-ex1",
        topicId: "tech-binary-data",
        isCorrect: true,
        answeredAt: "2026-02-30T01:00:00Z",
      }],
    }],
    ["abandon timestamp", {
      action: "abandon",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23",
    }],
  ])("applies strict timestamp parsing to every lifecycle timestamp: %s", async (_name, body) => {
    const response = await request(body);

    expect(response.status).toBe(400);
    expect(mocks.completeAssessmentSession).not.toHaveBeenCalled();
    expect(mocks.abandonAssessmentSession).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request without opening the service client", async () => {
    mocks.getInternalUserId.mockResolvedValue(null);

    const response = await request({
      action: "abandon",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
    });

    expect(response.status).toBe(401);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("returns a generic conflict for immutable terminal sessions", async () => {
    mocks.completeAssessmentSession.mockRejectedValue({ code: "session_conflict" });

    const response = await request({
      action: "complete",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
      answers: [],
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "assessment_session_conflict",
    });
  });
});
