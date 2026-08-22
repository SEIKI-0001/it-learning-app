import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getInternalUserId: vi.fn(),
  getRequestUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
  canRecordStudyForUser: vi.fn(),
  recalculateExamReadiness: vi.fn(),
  refreshIntegratedStatusForUser: vi.fn(),
}));

vi.mock("@/lib/auth/currentUser", () => ({ getInternalUserId: mocks.getInternalUserId }));
vi.mock("@/lib/apiUser", () => ({ getRequestUserId: mocks.getRequestUserId }));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase: mocks.getServiceSupabase }));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser: mocks.canRecordStudyForUser,
  recordingLockedResponse: () => new Response("locked", { status: 403 }),
}));
vi.mock("@/lib/examReadiness/service", () => ({
  recalculateExamReadiness: mocks.recalculateExamReadiness,
}));
vi.mock("@/lib/progressBootstrap", () => ({
  refreshIntegratedStatusForUser: mocks.refreshIntegratedStatusForUser,
}));

import { POST } from "@/app/api/topic-progress/quiz-result/route";

const USER_ID = "10000000-0000-0000-0000-000000000001";
const SUPABASE = createSupabase();

function terminal<T>(value: T) {
  const result = Promise.resolve(value);
  return {
    select: vi.fn(() => terminal(value)),
    eq: vi.fn(() => terminal(value)),
    maybeSingle: vi.fn(() => result),
    upsert: vi.fn(() => result),
    update: vi.fn(() => terminal(value)),
    then: result.then.bind(result),
  };
}

function createSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === "topic_progress") {
        return terminal({ data: null, error: null });
      }
      return terminal({ error: null });
    }),
    rpc: vi.fn(),
  };
}

function request(
  completionId: unknown = "question-b\u001fconfirmation\u001f2026-08-23T01:00:00.000Z",
  includeCompletionId = true,
) {
  return POST(new Request("https://example.test/api/topic-progress/quiz-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "attacker-controlled-user",
      topicId: "tech-binary-data",
      correct: 1,
      total: 1,
      date: "2026-08-23",
      ...(includeCompletionId ? { completionId } : {}),
    }),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getInternalUserId.mockResolvedValue(USER_ID);
  mocks.getRequestUserId.mockResolvedValue(USER_ID);
  mocks.getServiceSupabase.mockReturnValue(SUPABASE);
  mocks.canRecordStudyForUser.mockResolvedValue(true);
  mocks.recalculateExamReadiness.mockResolvedValue({ score: 60 });
});

describe("topic quiz completion readiness", () => {
  it("uses the caller's stable P0 completion ID after persistence and removes legacy refresh", async () => {
    const completionId = "question-b\u001fconfirmation\u001f2026-08-23T01:00:00.000Z";
    const response = await request(completionId);

    expect(response.status).toBe(200);
    expect(mocks.getInternalUserId).toHaveBeenCalledOnce();
    expect(mocks.recalculateExamReadiness).toHaveBeenCalledWith({
      supabase: SUPABASE,
      userId: USER_ID,
      triggerType: "topic_quiz_complete",
      triggerId: completionId,
    });
    expect(mocks.refreshIntegratedStatusForUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      stage: "basic_understood",
      rate: 100,
      readinessUpdated: true,
    });
  });

  it("keeps persisted topic progress successful when readiness recalculation fails", async () => {
    mocks.recalculateExamReadiness.mockRejectedValue(new Error("temporary"));

    const response = await request();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      readinessUpdated: false,
    });
  });

  it.each([
    ["missing", undefined, false],
    ["empty", "", true],
    ["blank", "   ", true],
    ["oversized", "x".repeat(4097), true],
  ])("rejects a %s stable P0 completion ID before persistence", async (_name, completionId, includeCompletionId) => {
    const response = await request(completionId, includeCompletionId);

    expect(response.status).toBe(400);
    expect(SUPABASE.from).not.toHaveBeenCalled();
    expect(mocks.recalculateExamReadiness).not.toHaveBeenCalled();
  });

  it("keeps same-day equal-score completions distinct by their P0 completion IDs", async () => {
    await request("question-a\u001fconfirmation\u001f2026-08-23T01:00:00.000Z");
    await request("question-a\u001fconfirmation\u001f2026-08-23T02:00:00.000Z");

    expect(mocks.recalculateExamReadiness).toHaveBeenCalledTimes(2);
    expect(mocks.recalculateExamReadiness.mock.calls.map(([input]) => input.triggerId)).toEqual([
      "question-a\u001fconfirmation\u001f2026-08-23T01:00:00.000Z",
      "question-a\u001fconfirmation\u001f2026-08-23T02:00:00.000Z",
    ]);
  });
});
