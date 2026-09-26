import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getRequestUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
  canRecordStudyForUser: vi.fn(),
}));

vi.mock("@/lib/apiUser", () => ({ getRequestUserId: mocks.getRequestUserId }));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase: mocks.getServiceSupabase }));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser: mocks.canRecordStudyForUser,
  recordingLockedResponse: () => new Response("locked", { status: 403 }),
}));

import { POST as saveWordProgress } from "@/app/api/word-progress/save/route";
import { POST as getTopicProgress } from "@/app/api/topic-progress/get/route";

const USER_ID = "10000000-0000-0000-0000-000000000001";

function request(body: unknown): Request {
  return new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body) });
}

function word(id: string) {
  return {
    acronymId: id, status: "weak", correctCount: 0, wrongCount: 1, reviewCount: 1,
    lastReviewedAt: 1_700_000_000_000, nextReviewAt: 1_700_000_100_000, lastSelfRating: "forgot",
  };
}

describe("POST /api/word-progress/save", () => {
  const upsert = vi.fn();
  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({ error: null });
    mocks.getRequestUserId.mockResolvedValue(USER_ID);
    mocks.canRecordStudyForUser.mockResolvedValue(true);
    mocks.getServiceSupabase.mockReturnValue({ from: () => ({ upsert }) });
  });

  it("1件の保存は従来どおり", async () => {
    const res = await saveWordProgress(request({ progress: word("dns") }));
    expect(res.status).toBe(200);
    expect(upsert.mock.calls[0][0]).toEqual([
      expect.objectContaining({ user_id: USER_ID, word_id: "dns", status: "weak" }),
    ]);
  });

  it("端末の既存進捗をまとめて引き継げる（壊れた要素だけ落とす）", async () => {
    const res = await saveWordProgress(request({
      progresses: [word("dns"), { acronymId: "bad", status: "??" }, word("nat")],
    }));
    expect(res.status).toBe(200);
    expect(upsert.mock.calls[0][0].map((row: { word_id: string }) => row.word_id)).toEqual(["dns", "nat"]);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "user_id,word_id" });
  });

  it("空・上限超え・全件不正のまとめ保存は 400", async () => {
    expect((await saveWordProgress(request({ progresses: [] }))).status).toBe(400);
    expect((await saveWordProgress(request({ progresses: Array.from({ length: 201 }, () => word("dns")) }))).status)
      .toBe(400);
    expect((await saveWordProgress(request({ progresses: [{ acronymId: "x" }] }))).status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("未ログインは 401、記録期間外は 403", async () => {
    mocks.getRequestUserId.mockResolvedValueOnce(null);
    expect((await saveWordProgress(request({ progress: word("dns") }))).status).toBe(401);
    mocks.canRecordStudyForUser.mockResolvedValueOnce(false);
    expect((await saveWordProgress(request({ progress: word("dns") }))).status).toBe(403);
  });
});

describe("POST /api/topic-progress/get", () => {
  function supabaseWith(rows: unknown, single: unknown = null) {
    const eq = vi.fn();
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn((...args: unknown[]) => {
        eq(...args);
        return chain;
      }),
      maybeSingle: vi.fn(async () => ({ data: single, error: null })),
      then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }),
    };
    mocks.getServiceSupabase.mockReturnValue({ from: () => chain });
    return eq;
  }

  beforeEach(() => {
    mocks.getRequestUserId.mockResolvedValue(USER_ID);
  });

  it("all: true で全トピックのステージを1回で返す（Today の用語定着判定用）", async () => {
    const eq = supabaseWith([
      { topic_id: "tech-network-address", stage: "terms_stabilizing" },
      { topic_id: "tech-http-https", stage: "exam_ready" },
    ]);
    const res = await getTopicProgress(request({ all: true }));
    expect(await res.json()).toEqual({
      ok: true,
      stages: { "tech-network-address": "terms_stabilizing", "tech-http-https": "exam_ready" },
    });
    expect(eq).toHaveBeenCalledWith("user_id", USER_ID);
  });

  it("topicId 指定の1件取得は従来どおり", async () => {
    supabaseWith([], { stage: "basic_understood" });
    const res = await getTopicProgress(request({ topicId: "tech-network-address" }));
    expect(await res.json()).toEqual({ ok: true, stage: "basic_understood" });
    expect((await getTopicProgress(request({}))).status).toBe(400);
  });
});
