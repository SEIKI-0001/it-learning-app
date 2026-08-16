import { beforeEach, describe, expect, it, vi } from "vitest";

const getRequestUserId = vi.hoisted(() => vi.fn());
const canRecordStudyForUser = vi.hoisted(() => vi.fn());
const getServiceSupabase = vi.hoisted(() => vi.fn());
const recordQuestionAttemptsWithExposure = vi.hoisted(() => vi.fn());

vi.mock("@/lib/apiUser", () => ({ getRequestUserId }));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser,
  recordingLockedResponse: () => new Response(null, { status: 403 }),
}));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase }));
vi.mock("@/lib/questionExposureServer", () => ({
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
});
