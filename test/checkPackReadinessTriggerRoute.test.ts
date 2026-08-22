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

import { POST } from "@/app/api/check-pack/submit/route";

const USER_ID = "10000000-0000-0000-0000-000000000001";
const SUPABASE = createSupabase();

function terminal<T>(value: T) {
  const result = Promise.resolve(value);
  return {
    select: vi.fn(() => terminal(value)),
    eq: vi.fn(() => terminal(value)),
    in: vi.fn(() => result),
    maybeSingle: vi.fn(() => result),
    insert: vi.fn(() => result),
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

function request(overrides: Record<string, unknown> = {}) {
  return POST(new Request("https://example.test/api/check-pack/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "attacker-controlled-user",
      packId: "pack-tech-binary",
      topicId: "tech-binary-data",
      quizRate: 80,
      flashcardRate: 90,
      examLevelRate: 70,
      startedAt: "2026-08-23T00:55:00.000Z",
      date: "2026-08-23",
      ...overrides,
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

describe("check-pack completion readiness", () => {
  it("uses one stable completion key after persistence and removes the legacy refresh", async () => {
    const response = await request();

    expect(response.status).toBe(200);
    expect(mocks.getInternalUserId).toHaveBeenCalledOnce();
    expect(mocks.recalculateExamReadiness).toHaveBeenCalledWith({
      supabase: SUPABASE,
      userId: USER_ID,
      triggerType: "check_pack_complete",
      triggerId: [
        "pack-tech-binary",
        "tech-binary-data",
        "2026-08-23T00:55:00.000Z",
        "80",
        "90",
        "70",
      ].join("\u001f"),
    });
    expect(mocks.refreshIntegratedStatusForUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      readinessUpdated: true,
    });
  });

  it("keeps the completed pack successful when readiness recalculation fails", async () => {
    mocks.recalculateExamReadiness.mockRejectedValue(new Error("temporary"));

    const response = await request();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      readinessUpdated: false,
    });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["no explicit offset", "2026-08-23T00:55:00"],
    ["impossible date", "2026-02-30T00:55:00.000Z"],
  ])("rejects a %s stable completion timestamp before persistence", async (_name, startedAt) => {
    const response = await request({ startedAt });

    expect(response.status).toBe(400);
    expect(SUPABASE.from).not.toHaveBeenCalled();
    expect(mocks.recalculateExamReadiness).not.toHaveBeenCalled();
  });

  it("keeps same-day equal-score completions distinct by their stable timestamps", async () => {
    await request({ startedAt: "2026-08-23T00:55:00.000Z" });
    await request({ startedAt: "2026-08-23T01:55:00.000Z" });

    expect(mocks.recalculateExamReadiness).toHaveBeenCalledTimes(2);
    expect(mocks.recalculateExamReadiness.mock.calls.map(([input]) => input.triggerId)).toEqual([
      "pack-tech-binary\u001ftech-binary-data\u001f2026-08-23T00:55:00.000Z\u001f80\u001f90\u001f70",
      "pack-tech-binary\u001ftech-binary-data\u001f2026-08-23T01:55:00.000Z\u001f80\u001f90\u001f70",
    ]);
  });
});
