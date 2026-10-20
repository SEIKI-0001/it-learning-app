import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getRequestUserId: vi.fn(),
  generateExplainPlan: vi.fn(),
  countExplain3dSince: vi.fn(),
  logExplain3dEvent: vi.fn(),
}));

vi.mock("@/lib/apiUser", () => ({ getRequestUserId: mocks.getRequestUserId }));
vi.mock("@/lib/ai/explain3d", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/explain3d")>()),
  generateExplainPlan: mocks.generateExplainPlan,
}));
vi.mock("@/lib/explain3d/usage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/explain3d/usage")>()),
  countExplain3dSince: mocks.countExplain3dSince,
  logExplain3dEvent: mocks.logExplain3dEvent,
}));

import { POST } from "@/app/api/explain/route";
import { DEV_STUB_OUTPUT } from "@/lib/ai/explain3d";

const request = (body: unknown) =>
  new Request("http://localhost/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequestUserId.mockResolvedValue("user-1");
  mocks.countExplain3dSince.mockResolvedValue(0);
  mocks.generateExplainPlan.mockResolvedValue({ output: DEV_STUB_OUTPUT, model: "m" });
  delete process.env.EXPLAIN3D_DAILY_LIMIT;
});

describe("POST /api/explain", () => {
  it("未ログインは 401 で AI を呼ばない", async () => {
    mocks.getRequestUserId.mockResolvedValue(null);
    expect((await POST(request({ question: "DNSの仕組み" }))).status).toBe(401);
    expect(mocks.generateExplainPlan).not.toHaveBeenCalled();
  });

  it("空・長すぎる質問は 400", async () => {
    expect((await POST(request({ question: " " }))).status).toBe(400);
    expect((await POST(request({ question: "あ".repeat(121) }))).status).toBe(400);
  });

  it("1日の上限に達したら 429", async () => {
    mocks.countExplain3dSince.mockResolvedValue(10);
    expect((await POST(request({ question: "DNSの仕組み" }))).status).toBe(429);
    expect(mocks.generateExplainPlan).not.toHaveBeenCalled();
  });

  it("既存の模型を選んだらテーマとレッスンへの道を返す", async () => {
    mocks.generateExplainPlan.mockResolvedValue({ output: { mode: "existing", topicId: "tech-network-address", reason: "DNS" }, model: "m" });
    const data = await (await POST(request({ question: "DNSの仕組み" }))).json();
    expect(data.result).toMatchObject({ kind: "existing", topicId: "tech-network-address", reason: "DNS" });
    expect(data.result.lessonHref).toMatch(/^\/learn\/.+\/tech-network-address$/);
    expect(mocks.logExplain3dEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "explain3d_answered", intent: "existing" }));
  });

  it("組んだ場面は整えてから返す", async () => {
    const data = await (await POST(request({ question: "Webページの仕組み" }))).json();
    expect(data.result.kind).toBe("generated");
    expect(data.result.scene.actors.length).toBeGreaterThanOrEqual(2);
    expect(data.result.relatedTopicId).toBe("tech-http-https");
  });

  it("AI を呼ぶ前に回数を記録する（断った質問・失敗も上限に数える）", async () => {
    mocks.generateExplainPlan.mockImplementation(async () => {
      expect(mocks.logExplain3dEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", event: "explain3d_requested" }));
      return { output: { mode: "off_topic" }, model: "m" };
    });
    expect((await POST(request({ question: "今日の晩ごはん" }))).status).toBe(400);
    expect(mocks.generateExplainPlan).toHaveBeenCalledTimes(1);
  });

  it("上限に達していたら記録もしない", async () => {
    mocks.countExplain3dSince.mockResolvedValue(10);
    await POST(request({ question: "DNSの仕組み" }));
    expect(mocks.logExplain3dEvent).not.toHaveBeenCalled();
  });

  it("学習と無関係なら 400 off_topic", async () => {
    mocks.generateExplainPlan.mockResolvedValue({ output: { mode: "off_topic" }, model: "m" });
    const res = await POST(request({ question: "今日の晩ごはん" }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("off_topic");
  });

  it("AI が失敗してもキーワードが合えば既存の模型を返し、合わなければ 502", async () => {
    mocks.generateExplainPlan.mockRejectedValue(new Error("down"));
    const ok = await (await POST(request({ question: "VPNの仕組み" }))).json();
    expect(ok.result).toMatchObject({ kind: "existing", topicId: "tech-firewall-vpn-zero-trust" });
    expect((await POST(request({ question: "量子コンピュータの仕組み" }))).status).toBe(502);
  });
});
