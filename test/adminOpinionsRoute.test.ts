import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));

import { GET, POST } from "@/app/api/admin/opinions/route";

const ORIGIN = "https://example.test";
const AUTH = `Basic ${Buffer.from("pilot-admin:pilot-admin-password").toString("base64")}`;

function postRequest(body: unknown, origin = ORIGIN) {
  return new Request(`${ORIGIN}/api/admin/opinions`, {
    method: "POST",
    headers: { authorization: AUTH, origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "pilot-admin");
  vi.stubEnv("ADMIN_PASSWORD", "pilot-admin-password");
});

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.getServiceSupabase.mockReset();
});

describe("GET /api/admin/opinions", () => {
  it("資格情報なしは 401 で DB に触れない", async () => {
    const response = await GET(new Request(`${ORIGIN}/api/admin/opinions`));

    expect(response.status).toBe(401);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("投稿を新しい順で返し、表示名を添える", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "op-1",
          user_id: "user-1",
          category: "mistake",
          body: "問3の解説が逆です",
          context: "確認問題 問3",
          status: "new",
          created_at: "2026-10-05T01:00:00Z",
          line_users: { display_name: "テスト" },
        },
      ],
      error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    mocks.getServiceSupabase.mockReturnValue({ from });

    const response = await GET(
      new Request(`${ORIGIN}/api/admin/opinions`, { headers: { authorization: AUTH } }),
    );

    expect(from).toHaveBeenCalledWith("user_opinions");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(await response.json()).toEqual({
      ok: true,
      opinions: [
        {
          id: "op-1",
          userId: "user-1",
          displayName: "テスト",
          category: "mistake",
          body: "問3の解説が逆です",
          context: "確認問題 問3",
          status: "new",
          createdAt: "2026-10-05T01:00:00Z",
        },
      ],
    });
  });
});

describe("POST /api/admin/opinions", () => {
  it("別オリジンからは 403 で DB に触れない", async () => {
    const response = await POST(postRequest({ id: "op-1", status: "done" }, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("不正な状態は 400", async () => {
    const response = await POST(postRequest({ id: "op-1", status: "deleted" }));

    expect(response.status).toBe(400);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("対応状況を更新する", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    mocks.getServiceSupabase.mockReturnValue({ from });

    const response = await POST(postRequest({ id: "op-1", status: "done" }));

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("user_opinions");
    expect(update).toHaveBeenCalledWith({ status: "done" });
    expect(eq).toHaveBeenCalledWith("id", "op-1");
  });
});
