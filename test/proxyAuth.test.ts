import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy admin and API authentication boundaries", () => {
  it("fails closed for /admin when no admin password is configured", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const response = await proxy(new NextRequest("https://example.test/admin"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects invalid Basic credentials for /admin", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "pilot-admin-password");
    vi.stubEnv("ADMIN_USER", "pilot-admin");
    const authorization = `Basic ${Buffer.from("pilot-admin:wrong-password").toString("base64")}`;

    const response = await proxy(new NextRequest("https://example.test/admin", {
      headers: { authorization },
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Basic realm="admin", charset="UTF-8"',
    );
  });

  it("passes /api/progress/save through to its per-handler authentication", async () => {
    const response = await proxy(
      new NextRequest("https://example.test/api/progress/save", { method: "POST" }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  describe("unauthenticated page gating", () => {
    function stubGatingEnv() {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
      vi.stubEnv("SESSION_SECRET", "test-session-secret");
    }

    it("sends first-time visitors of the site root to the landing page", async () => {
      stubGatingEnv();

      const response = await proxy(new NextRequest("https://example.test/"));

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe("https://example.test/lp");
    });

    it("still sends unauthenticated app screens to /login with next", async () => {
      stubGatingEnv();

      const response = await proxy(new NextRequest("https://example.test/today"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://example.test/login?next=%2Ftoday",
      );
    });

    it("lets a LINE token landing on the root through to the app", async () => {
      stubGatingEnv();

      const response = await proxy(new NextRequest("https://example.test/?t=line-token"));

      expect(response.headers.get("x-middleware-next")).toBe("1");
    });
  });
});
