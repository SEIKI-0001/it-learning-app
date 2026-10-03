import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));

import { GET as summaryRoute } from "@/app/api/admin/summary/route";
import { GET as webhooksRoute } from "@/app/api/admin/billing-webhooks/route";
import { POST as retryRoute } from "@/app/api/admin/billing-webhooks/[eventId]/retry/route";

const ORIGIN = "https://example.test";
const basic = (user: string, pass: string) =>
  `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
const retryContext = { params: Promise.resolve({ eventId: "evt_1" }) };

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "pilot-admin");
  vi.stubEnv("ADMIN_PASSWORD", "pilot-admin-password");
  // DB まで到達したら 503 を返させ、「認証を通過した」ことの目印にする。
  mocks.getServiceSupabase.mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.getServiceSupabase.mockReset();
});

describe("管理 API はハンドラ単体でも Basic 認証する", () => {
  it.each([
    ["summary", () => summaryRoute(new Request(`${ORIGIN}/api/admin/summary`))],
    ["billing-webhooks", () => webhooksRoute(new Request(`${ORIGIN}/api/admin/billing-webhooks`))],
  ])("%s は資格情報なしを 401 で拒否し DB に触れない", async (_name, call) => {
    const response = await call();

    expect(response.status).toBe(401);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("誤ったパスワードを拒否する", async () => {
    const response = await summaryRoute(new Request(`${ORIGIN}/api/admin/summary`, {
      headers: { authorization: basic("pilot-admin", "wrong") },
    }));

    expect(response.status).toBe(401);
  });

  it("ADMIN_PASSWORD 未設定なら 503 で閉じる", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const response = await webhooksRoute(new Request(`${ORIGIN}/api/admin/billing-webhooks`, {
      headers: { authorization: basic("pilot-admin", "") },
    }));

    expect(response.status).toBe(503);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("正しい資格情報なら処理へ進む", async () => {
    const response = await summaryRoute(new Request(`${ORIGIN}/api/admin/summary`, {
      headers: { authorization: basic("pilot-admin", "pilot-admin-password") },
    }));

    expect(mocks.getServiceSupabase).toHaveBeenCalled();
    expect(response.status).toBe(503);
  });

  it("再処理 POST は資格情報が正しくても別オリジンからなら拒否する", async () => {
    const response = await retryRoute(new Request(`${ORIGIN}/api/admin/billing-webhooks/evt_1/retry`, {
      method: "POST",
      headers: {
        authorization: basic("pilot-admin", "pilot-admin-password"),
        origin: "https://attacker.example",
      },
    }), retryContext);

    expect(response.status).toBe(403);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("再処理 POST は同一オリジンかつ正しい資格情報なら処理へ進む", async () => {
    const response = await retryRoute(new Request(`${ORIGIN}/api/admin/billing-webhooks/evt_1/retry`, {
      method: "POST",
      headers: {
        authorization: basic("pilot-admin", "pilot-admin-password"),
        origin: ORIGIN,
      },
    }), retryContext);

    expect(mocks.getServiceSupabase).toHaveBeenCalled();
    expect(response.status).toBe(503);
  });
});
