import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  loadAppStateForUser: vi.fn(),
  getCurrentReadiness: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));
vi.mock("@/lib/serverAppState", () => ({
  loadAppStateForUser: mocks.loadAppStateForUser,
}));
vi.mock("@/lib/examReadiness/service", () => ({
  getCurrentReadiness: mocks.getCurrentReadiness,
}));

import { POST } from "@/app/api/line/webhook/route";

const USER_ID = "10000000-0000-0000-0000-000000000010";
const originalSecret = process.env.LINE_CHANNEL_SECRET;
const originalAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

function supabaseDouble() {
  const lineUsers = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: USER_ID }, error: null }),
  };
  const lineSessions = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    from: vi.fn((table: string) => table === "line_users" ? lineUsers : lineSessions),
  };
}

function progress() {
  return {
    level: 4,
    exp: 240,
    streakCount: 6,
    weakTags: [],
    completedTopics: [],
    topicMastery: {},
    topicMasteryStats: {},
    reviewQueue: [],
    currentDay: 1,
    completedDays: [],
  };
}

async function requestProgress(): Promise<string> {
  const response = await POST(new Request("https://example.test/api/line/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "example.test" },
    body: JSON.stringify({
      events: [{
        type: "message",
        replyToken: "reply-1",
        source: { type: "user", userId: "line-user-1" },
        message: { type: "text", text: "進捗" },
      }],
    }),
  }));
  const body = await response.json() as {
    plannedReplies: Array<{ text: string }>;
  };
  return body.plannedReplies[0].text;
}

describe("LINE Exam Readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LINE_CHANNEL_SECRET;
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const supabase = supabaseDouble();
    mocks.getServiceSupabase.mockReturnValue(supabase);
    mocks.loadAppStateForUser.mockResolvedValue({ progress: progress(), answers: [] });
    mocks.getCurrentReadiness.mockResolvedValue(makeExamReadinessResult({
      score: 78,
      band: "ready",
      primaryImprovement: { code: "improve_field", fieldId: "technology" },
    }));
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.LINE_CHANNEL_SECRET;
    else process.env.LINE_CHANNEL_SECRET = originalSecret;
    if (originalAccessToken === undefined) delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    else process.env.LINE_CHANNEL_ACCESS_TOKEN = originalAccessToken;
  });

  it("loads the lazy current result before formatting the same score, band, and improvement", async () => {
    const text = await requestProgress();
    const supabase = mocks.getServiceSupabase.mock.results[0].value;

    expect(mocks.getCurrentReadiness).toHaveBeenCalledWith({
      supabase,
      userId: USER_ID,
    });
    expect(text).toContain("合格準備度 78/100（準備良好）");
    expect(text).toContain("次の一歩：\u300cテクノロジ\u300dの問題を優先しましょう");
    expect(text).not.toMatch(/合格率|合格確率|%/);
  });

  it("keeps a missing current result measuring instead of using learning progress", async () => {
    mocks.getCurrentReadiness.mockResolvedValue(null);
    const text = await requestProgress();

    expect(text).toContain("合格準備度 測定中");
    expect(text).not.toContain("合格準備度 0/100");
    expect(text).not.toMatch(/合格率|合格確率|%/);
  });
});
