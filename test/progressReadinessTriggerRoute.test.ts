import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getInternalUserId: vi.fn(),
  getRequestUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
  recalculateExamReadiness: vi.fn(),
}));

vi.mock("@/lib/auth/currentUser", () => ({
  getInternalUserId: mocks.getInternalUserId,
}));
vi.mock("@/lib/apiUser", () => ({
  getRequestUserId: mocks.getRequestUserId,
}));
vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));
vi.mock("@/lib/examReadiness/service", () => ({
  recalculateExamReadiness: mocks.recalculateExamReadiness,
}));

import { POST } from "@/app/api/progress/save/route";
import type { UserProgress } from "@/types";

const USER_ID = "10000000-0000-0000-0000-000000000001";
const TRIGGER = {
  triggerType: "learning_complete" as const,
  triggerId: "question-b\u001fconfirmation\u001f2026-08-23T01:00:00.000Z",
};
const ASSESSMENT_TRIGGER = {
  triggerType: "assessment" as const,
  triggerId: "20000000-0000-4000-8000-000000000001",
};

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    level: 1,
    exp: 15,
    streakCount: 1,
    weakTags: [],
    completedTopics: ["topic-a"],
    topicMastery: { "topic-a": 8 },
    topicMasteryStats: {
      "topic-a": {
        topicId: "topic-a",
        masteryScore: 8,
        lastEvaluatedAt: "2026-08-23T01:00:00.000Z",
        correctCount: 1,
        incorrectCount: 0,
        reviewSuccessCount: 0,
        recentEvidence: [{
          questionId: "question-b",
          kind: "confirmation",
          isCorrect: true,
          isFirstSeen: true,
          exposureState: "first",
          answeredAt: "2026-08-23T01:00:00.000Z",
        }],
      },
    },
    reviewQueue: [{
      topicId: "topic-a",
      dueAt: "2026-08-26T01:00:00.000Z",
      reason: "定着確認",
    }],
    currentDay: 1,
    completedDays: [],
    ...overrides,
  };
}

function request(body: unknown) {
  return POST(new Request("https://example.test/api/progress/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

function supabaseWithRpc(result: {
  evidence_changed: boolean;
  trigger_registered: boolean;
}) {
  const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
  const profileUpsert = vi.fn().mockResolvedValue({ error: null });
  return {
    rpc,
    profileUpsert,
    client: {
      rpc,
      from: vi.fn((table: string) => ({
        upsert: table === "user_profiles"
          ? profileUpsert
          : vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getInternalUserId.mockResolvedValue(USER_ID);
  mocks.getRequestUserId.mockResolvedValue(USER_ID);
  mocks.recalculateExamReadiness.mockResolvedValue({ score: 55 });
});

describe("POST /api/progress/save readiness trigger", () => {
  it("atomically saves changed P0 facts and registers the authenticated completion", async () => {
    const supabase = supabaseWithRpc({
      evidence_changed: true,
      trigger_registered: true,
    });
    mocks.getServiceSupabase.mockReturnValue(supabase.client);

    const response = await request({
      userId: "attacker-controlled-user",
      progress: progress(),
      readinessTrigger: TRIGGER,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      readinessUpdated: true,
    });
    expect(mocks.getInternalUserId).toHaveBeenCalledOnce();
    expect(supabase.rpc).toHaveBeenCalledWith(
      "save_user_progress_with_readiness_evidence",
      expect.objectContaining({
        p_user_id: USER_ID,
        p_progress: expect.objectContaining({
          topic_mastery_stats: progress().topicMasteryStats,
          review_queue: progress().reviewQueue,
        }),
        p_trigger_type: TRIGGER.triggerType,
        p_trigger_id: TRIGGER.triggerId,
      }),
    );
    expect(mocks.recalculateExamReadiness).toHaveBeenCalledWith({
      supabase: supabase.client,
      userId: USER_ID,
      ...TRIGGER,
    });
  });

  it("does not register evidence or recalculate for profile-only saves", async () => {
    const supabase = supabaseWithRpc({
      evidence_changed: false,
      trigger_registered: false,
    });
    mocks.getServiceSupabase.mockReturnValue(supabase.client);

    const response = await request({
      profile: {
        itExperience: "beginner",
        dailyMinutes: "15",
        examPlan: "undecided",
        confidence: 2,
      },
    });

    expect(response.status).toBe(200);
    expect(supabase.profileUpsert).toHaveBeenCalledOnce();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(mocks.recalculateExamReadiness).not.toHaveBeenCalled();
  });

  it("does not recalculate a new trigger when P0 evidence is semantically identical", async () => {
    const supabase = supabaseWithRpc({
      evidence_changed: false,
      trigger_registered: false,
    });
    mocks.getServiceSupabase.mockReturnValue(supabase.client);

    const response = await request({ progress: progress(), readinessTrigger: TRIGGER });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      readinessUpdated: false,
    });
    expect(mocks.recalculateExamReadiness).not.toHaveBeenCalled();
  });

  it("reuses the same recalculation key on an identical completion retry", async () => {
    const supabase = supabaseWithRpc({
      evidence_changed: false,
      trigger_registered: true,
    });
    mocks.getServiceSupabase.mockReturnValue(supabase.client);

    await request({ progress: progress(), readinessTrigger: TRIGGER });
    await request({ progress: progress(), readinessTrigger: TRIGGER });

    expect(mocks.recalculateExamReadiness).toHaveBeenCalledTimes(2);
    expect(mocks.recalculateExamReadiness.mock.calls[0][0]).toEqual(
      mocks.recalculateExamReadiness.mock.calls[1][0],
    );
  });

  it("recalculates an assessment only after its authoritative P0 transaction, including exact replay", async () => {
    const supabase = supabaseWithRpc({
      evidence_changed: false,
      trigger_registered: true,
    });
    mocks.getServiceSupabase.mockReturnValue(supabase.client);

    const first = await request({
      progress: progress(),
      readinessTrigger: ASSESSMENT_TRIGGER,
    });
    const replay = await request({
      progress: progress(),
      readinessTrigger: ASSESSMENT_TRIGGER,
    });

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      "save_user_progress_with_readiness_evidence",
      expect.objectContaining({
        p_trigger_type: "assessment",
        p_trigger_id: ASSESSMENT_TRIGGER.triggerId,
      }),
    );
    expect(mocks.recalculateExamReadiness).toHaveBeenCalledTimes(2);
    expect(mocks.recalculateExamReadiness.mock.calls[0][0]).toEqual(
      mocks.recalculateExamReadiness.mock.calls[1][0],
    );
    expect(mocks.recalculateExamReadiness).toHaveBeenCalledWith({
      supabase: supabase.client,
      userId: USER_ID,
      ...ASSESSMENT_TRIGGER,
    });
  });

  it("keeps committed learning successful when recalculation fails", async () => {
    const supabase = supabaseWithRpc({
      evidence_changed: true,
      trigger_registered: true,
    });
    mocks.getServiceSupabase.mockReturnValue(supabase.client);
    mocks.recalculateExamReadiness.mockRejectedValue(
      new Error("temporary readiness failure"),
    );

    const response = await request({ progress: progress(), readinessTrigger: TRIGGER });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      readinessUpdated: false,
    });
    expect(supabase.rpc).toHaveBeenCalledOnce();
  });
});
