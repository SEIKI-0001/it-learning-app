import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getRequestUserId: vi.fn(),
  getRequestUserIdFast: vi.fn(),
  getServiceSupabase: vi.fn(),
  buildMochitLearningContext: vi.fn(),
  generateMochitReply: vi.fn(),
  countTodayMochitMessages: vi.fn(),
  logMochitEvent: vi.fn(),
}));

vi.mock("@/lib/apiUser", () => ({
  getRequestUserId: mocks.getRequestUserId,
  getRequestUserIdFast: mocks.getRequestUserIdFast,
}));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase: mocks.getServiceSupabase }));
vi.mock("@/lib/mochitAi/learningContext", () => ({
  buildMochitLearningContext: mocks.buildMochitLearningContext,
}));
vi.mock("@/lib/ai/mochitChat", () => ({ generateMochitReply: mocks.generateMochitReply }));
vi.mock("@/lib/mochitAi/usage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mochitAi/usage")>()),
  countTodayMochitMessages: mocks.countTodayMochitMessages,
  logMochitEvent: mocks.logMochitEvent,
}));

import { POST } from "@/app/api/mochit/chat/route";
import { POST as POST_EVENT } from "@/app/api/mochit/events/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/mochit/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const supabase = { tag: "supabase" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequestUserId.mockResolvedValue("user-1");
  mocks.getRequestUserIdFast.mockResolvedValue("user-1");
  mocks.getServiceSupabase.mockReturnValue(supabase);
  mocks.countTodayMochitMessages.mockResolvedValue(0);
  mocks.buildMochitLearningContext.mockResolvedValue({
    facts: { readiness: { band: "あと一歩", score: 58 } },
    band: "あと一歩",
  });
  mocks.generateMochitReply.mockResolvedValue({ text: "今は58点、あと一歩だよ。", model: "m" });
  delete process.env.MOCHIT_AI_DAILY_LIMIT;
});

describe("POST /api/mochit/chat", () => {
  it("未ログインは 401 で、学習データも AI も呼ばない", async () => {
    mocks.getRequestUserId.mockResolvedValue(null);
    const res = await POST(request({ message: "今の実力は？", page: "today", source: "free_input" }));
    expect(res.status).toBe(401);
    expect(mocks.buildMochitLearningContext).not.toHaveBeenCalled();
    expect(mocks.generateMochitReply).not.toHaveBeenCalled();
  });

  it("本文の userId ではなくセッションのユーザーで学習状況を読む", async () => {
    mocks.getRequestUserId.mockResolvedValue("session-user");
    await POST(request({ message: "今の実力は？", page: "progress", source: "free_input", userId: "someone-else" }));
    expect(mocks.buildMochitLearningContext).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "session-user", supabase, intent: "status", page: "progress" }),
    );
  });

  it("空・長すぎる相談は 400", async () => {
    expect((await POST(request({ message: "  ", page: "today", source: "free_input" }))).status).toBe(400);
    expect((await POST(request({ message: "あ".repeat(401), page: "today", source: "free_input" }))).status).toBe(400);
    expect(mocks.generateMochitReply).not.toHaveBeenCalled();
  });

  it("1日の上限に達したら 429 で AI を呼ばない", async () => {
    process.env.MOCHIT_AI_DAILY_LIMIT = "2";
    mocks.countTodayMochitMessages.mockResolvedValue(2);
    const res = await POST(request({ message: "今の実力は？", page: "today", source: "free_input" }));
    expect(res.status).toBe(429);
    expect(mocks.generateMochitReply).not.toHaveBeenCalled();
  });

  it("成功時はガードを通した返答を返し、送信を記録する（本文は記録しない）", async () => {
    const res = await POST(request({ message: "今の実力は？", page: "today", source: "quick_action", intent: "status" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, reply: "今は58点、あと一歩だよ。", intent: "status" });
    expect(mocks.logMochitEvent).toHaveBeenCalledWith({
      userId: "user-1",
      event: "mochit_message_sent",
      page: "today",
      source: "quick_action",
      intent: "status",
    });
    const user = mocks.generateMochitReply.mock.calls[0][0].user as string;
    expect(user).toContain('"band":"あと一歩"');
  });

  it("アプリの判定を超える合格断定は返さない", async () => {
    mocks.generateMochitReply.mockResolvedValue({ text: "もう合格レベルだよ！", model: "m" });
    const body = await (await POST(request({ message: "合格できそう？", page: "progress", source: "free_input" }))).json();
    expect(body.reply).not.toContain("合格レベル");
  });

  it("AI が失敗したら 502 と「学習は続けられる」案内を返し、エラーを記録する", async () => {
    mocks.generateMochitReply.mockRejectedValue(new Error("boom"));
    const res = await POST(request({ message: "今日は？", page: "today", source: "free_input" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("学習はそのまま続けられるよ");
    expect(body.error).not.toContain("boom");
    expect(mocks.logMochitEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "mochit_error" }));
  });

  it("問題コンテキストは丸めて渡し、問題画面では「なんで？」を問題の質問として扱う", async () => {
    await POST(
      request({
        message: "なんでBじゃないの？",
        page: "question",
        source: "free_input",
        question: {
          questionId: "q1",
          prompt: "p".repeat(5000),
          choices: [
            { label: "A", text: "a" },
            { label: "B", text: "b" },
          ],
          correctLabel: "A",
          selectedLabel: "B",
        },
      }),
    );
    const input = mocks.buildMochitLearningContext.mock.calls[0][0];
    expect(input.intent).toBe("question");
    expect(input.question.prompt).toHaveLength(1200);
  });
});

describe("POST /api/mochit/events", () => {
  function eventRequest(body: unknown) {
    return new Request("http://localhost/api/mochit/events", { method: "POST", body: JSON.stringify(body) });
  }

  it("決まったイベントだけを記録する", async () => {
    expect((await POST_EVENT(eventRequest({ event: "mochit_open", page: "today", source: "pet" }))).status).toBe(204);
    expect(mocks.logMochitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", event: "mochit_open", page: "today" }),
    );
    expect((await POST_EVENT(eventRequest({ event: "drop_table" }))).status).toBe(400);
    // 送信の成否はチャット API 側だけが記録する
    expect((await POST_EVENT(eventRequest({ event: "mochit_message_sent" }))).status).toBe(400);
  });

  it("匿名は黙って捨てる", async () => {
    mocks.getRequestUserIdFast.mockResolvedValue(null);
    expect((await POST_EVENT(eventRequest({ event: "mochit_open" }))).status).toBe(204);
    expect(mocks.logMochitEvent).not.toHaveBeenCalled();
  });
});
