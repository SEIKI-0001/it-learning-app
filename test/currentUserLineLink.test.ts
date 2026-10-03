import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  getServerSupabase: vi.fn(),
  cookieValue: { current: undefined as string | undefined },
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));
vi.mock("@/lib/supabase/serverClient", () => ({
  getServerSupabase: mocks.getServerSupabase,
}));
vi.mock("@/lib/auth/canonicalAccount", () => ({
  canonicalAccountId: async (id: string) => id,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.cookieValue.current ? { value: mocks.cookieValue.current } : undefined),
  }),
}));

import { getInternalUserId } from "@/lib/auth/currentUser";
import { signLineSession } from "@/lib/auth/lineSession";

const LINE_USER = "10000000-0000-0000-0000-000000000001";
const CREATED_USER = "20000000-0000-0000-0000-000000000002";

type Call = { op: string; values?: unknown };

function fakeServiceDb(calls: Call[]) {
  return {
    from(table: string) {
      expect(table).toBe("line_users");
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: CREATED_USER }, error: null }),
        update(values: unknown) {
          calls.push({ op: "update", values });
          return builder;
        },
        insert(values: unknown) {
          calls.push({ op: "insert", values });
          return builder;
        },
      };
      return builder;
    },
  };
}

describe("getInternalUserId と LINE Cookie", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.cookieValue.current = undefined;
  });

  it("fq_line Cookie があっても、初回 Google ログインを LINE ユーザーへ自動で紐づけない", async () => {
    const calls: Call[] = [];
    mocks.getServiceSupabase.mockReturnValue(fakeServiceDb(calls));
    mocks.getServerSupabase.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "auth-user-first-login", email: "a@example.com" } },
        }),
      },
    });
    mocks.cookieValue.current = signLineSession(LINE_USER) ?? undefined;

    await expect(getInternalUserId()).resolves.toBe(CREATED_USER);
    expect(calls.some((c) => c.op === "update")).toBe(false);
    expect(calls).toContainEqual({
      op: "insert",
      values: { auth_user_id: "auth-user-first-login", email: "a@example.com" },
    });
  });

  it("Google セッションが無ければ LINE Cookie の本人として扱う", async () => {
    mocks.getServiceSupabase.mockReturnValue(fakeServiceDb([]));
    mocks.getServerSupabase.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    mocks.cookieValue.current = signLineSession(LINE_USER) ?? undefined;

    await expect(getInternalUserId()).resolves.toBe(LINE_USER);
  });
});
