import { beforeEach, describe, expect, it, vi } from "vitest";

const getRequestUserId = vi.hoisted(() => vi.fn());
const canRecordStudyForUser = vi.hoisted(() => vi.fn());
const getServiceSupabase = vi.hoisted(() => vi.fn());
const recordQuestionAttemptsWithExposure = vi.hoisted(() => vi.fn());
const recordAssessmentQuestionAttemptsWithExposure = vi.hoisted(() => vi.fn());

vi.mock("@/lib/apiUser", () => ({ getRequestUserId }));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser,
  recordingLockedResponse: () => new Response(null, { status: 403 }),
}));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase }));
vi.mock("@/lib/questionExposureServer", () => ({
  recordAssessmentQuestionAttemptsWithExposure,
  recordQuestionAttemptsWithExposure,
}));

import { POST } from "@/app/api/question-attempts/save/route";

beforeEach(() => {
  vi.clearAllMocks();
  getRequestUserId.mockResolvedValue("10000000-0000-0000-0000-000000000001");
  canRecordStudyForUser.mockResolvedValue(true);
  getServiceSupabase.mockReturnValue({ rpc: vi.fn() });
  recordQuestionAttemptsWithExposure.mockResolvedValue({
    saved: 1,
    exposures: [{
      questionId: "tech-security-cia-ex1",
      state: "first",
      attemptedBefore: false,
      firstAttemptAt: "2026-08-15T04:00:00.000Z",
      attemptCount: 1,
    }],
  });
  recordAssessmentQuestionAttemptsWithExposure.mockResolvedValue({
    saved: 1,
    exposures: [{
      questionId: "tech-security-cia-ex1",
      state: "first",
      attemptedBefore: false,
      firstAttemptAt: "2026-08-15T04:00:00.000Z",
      attemptCount: 1,
    }],
  });
});

async function request() {
  const response = await POST(new Request("http://localhost/api/question-attempts/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "untrusted-body-user",
      attempts: [{
        questionId: "tech-security-cia-ex1",
        questionType: "mock_exam",
        topicId: "client-topic",
        selectedAnswer: "A",
        isCorrect: true,
        isFirstSeen: true,
        state: "first",
      }],
    }),
  }));
  return { response, body: await response.json() };
}

describe("question attempt exposure route", () => {
  it("returns only the database-classified exposure", async () => {
    const { response, body } = await request();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      userId: "10000000-0000-0000-0000-000000000001",
      saved: 1,
      exposures: [{
        questionId: "tech-security-cia-ex1",
        state: "first",
        attemptedBefore: false,
        firstAttemptAt: "2026-08-15T04:00:00.000Z",
        attemptCount: 1,
      }],
    });
    expect(recordQuestionAttemptsWithExposure).toHaveBeenCalledTimes(1);
    expect(recordQuestionAttemptsWithExposure).toHaveBeenCalledWith(
      expect.anything(),
      "10000000-0000-0000-0000-000000000001",
      [expect.objectContaining({
        questionId: "tech-security-cia-ex1",
        topicId: "tech-security-cia",
        isCorrect: true,
      })],
    );
    const sent = recordQuestionAttemptsWithExposure.mock.calls[0][2][0];
    expect(sent).not.toHaveProperty("isFirstSeen");
    expect(sent).not.toHaveProperty("state");
  });

  it("returns 500 and no exposure when the transaction fails", async () => {
    recordQuestionAttemptsWithExposure.mockRejectedValue(new Error("rpc unavailable"));

    const { response, body } = await request();

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "save failed" });
  });

  it("uses the atomic assessment recorder for a grouped assessment batch", async () => {
    const sessionId = "20000000-0000-4000-8000-000000000001";
    const supabase = { rpc: vi.fn() };
    getServiceSupabase.mockReturnValue(supabase);
    const response = await POST(new Request(
      "http://localhost/api/question-attempts/save",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempts: [{
            questionId: "tech-security-cia-ex1",
            questionType: "mock_exam",
            topicId: "client-topic",
            selectedAnswer: "A",
            isCorrect: true,
            attemptGroupId: sessionId,
          }],
        }),
      },
    ));

    expect(response.status).toBe(200);
    expect(recordAssessmentQuestionAttemptsWithExposure).toHaveBeenCalledOnce();
    expect(recordAssessmentQuestionAttemptsWithExposure).toHaveBeenCalledWith(
      supabase,
      "10000000-0000-0000-0000-000000000001",
      sessionId,
      [expect.objectContaining({
        questionId: "tech-security-cia-ex1",
        attemptGroupId: sessionId,
      })],
    );
    expect(recordQuestionAttemptsWithExposure).not.toHaveBeenCalled();
    expect(supabase).not.toHaveProperty("from");
  });

  it.each([
    [
      "mixed group IDs",
      [
        { questionType: "mock_exam", attemptGroupId: "20000000-0000-4000-8000-000000000001" },
        { questionType: "mock_exam", attemptGroupId: "20000000-0000-4000-8000-000000000002" },
      ],
    ],
    [
      "grouped and ungrouped attempts",
      [
        { questionType: "mock_exam", attemptGroupId: "20000000-0000-4000-8000-000000000001" },
        { questionType: "mock_exam", attemptGroupId: null },
      ],
    ],
    [
      "different assessment sources",
      [
        { questionType: "mock_exam", attemptGroupId: "20000000-0000-4000-8000-000000000001" },
        { questionType: "theme_exam", attemptGroupId: "20000000-0000-4000-8000-000000000001" },
      ],
    ],
  ])("rejects %s before persistence", async (_label, variants) => {
    const response = await POST(new Request(
      "http://localhost/api/question-attempts/save",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempts: variants.map((variant, index) => ({
            questionId: `question-${index}`,
            topicId: "tech-security-cia",
            selectedAnswer: "A",
            isCorrect: true,
            ...variant,
          })),
        }),
      },
    ));

    expect(response.status).toBe(400);
    expect(recordAssessmentQuestionAttemptsWithExposure).not.toHaveBeenCalled();
    expect(recordQuestionAttemptsWithExposure).not.toHaveBeenCalled();
  });
});
