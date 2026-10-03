import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
}));

vi.mock("@/lib/apiUser", () => ({
  getRequestUserId: mocks.getRequestUserId,
  getRequestUserIdFast: mocks.getRequestUserId,
}));
vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
  isSupabaseConfigured: () => true,
}));

import { POST } from "@/app/api/opinions/route";
import { parseOpinionInput } from "@/lib/opinions";

const USER = "10000000-0000-0000-0000-000000000001";

let recentCount = 0;
let insertError: unknown = null;
let inserted: Record<string, unknown>[] = [];

function createSupabase() {
  return {
    from(table: string) {
      expect(table).toBe("user_opinions");
      const chain: Record<string, unknown> = {};
      for (const fn of ["select", "eq", "gte"]) chain[fn] = () => chain;
      chain.insert = (row: Record<string, unknown>) => {
        inserted.push(row);
        return Promise.resolve({ data: null, error: insertError });
      };
      chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve({ count: recentCount, error: null }).then(onFulfilled, onRejected);
      return chain;
    },
  };
}

function postRequest(body: unknown) {
  return new Request("https://example.com/api/opinions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  recentCount = 0;
  insertError = null;
  inserted = [];
  mocks.getRequestUserId.mockReset().mockResolvedValue(USER);
  mocks.getServiceSupabase.mockReset().mockReturnValue(createSupabase());
});

describe("POST /api/opinions", () => {
  it("saves a trimmed opinion for the session user", async () => {
    const res = await POST(
      postRequest({ category: "mistake", body: "  解説が食い違っている  ", context: " R5 問12 " }),
    );
    expect(res.status).toBe(200);
    expect(inserted).toEqual([
      { user_id: USER, category: "mistake", body: "解説が食い違っている", context: "R5 問12" },
    ]);
  });

  it("rejects anonymous users", async () => {
    mocks.getRequestUserId.mockResolvedValue(null);
    const res = await POST(postRequest({ category: "other", body: "hi" }));
    expect(res.status).toBe(401);
    expect(inserted).toHaveLength(0);
  });

  it("rejects invalid JSON, categories and empty bodies", async () => {
    expect((await POST(postRequest("{"))).status).toBe(400);
    expect((await POST(postRequest({ category: "spam", body: "x" }))).status).toBe(400);
    expect((await POST(postRequest({ category: "bug", body: "   " }))).status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("rate-limits rapid repeat posts", async () => {
    recentCount = 5;
    const res = await POST(postRequest({ category: "bug", body: "動かない" }));
    expect(res.status).toBe(429);
    expect(inserted).toHaveLength(0);
  });

  it("returns 500 when the insert fails", async () => {
    insertError = { message: "boom" };
    const res = await POST(postRequest({ category: "improvement", body: "もっと問題を" }));
    expect(res.status).toBe(500);
  });
});

describe("parseOpinionInput", () => {
  it("enforces length limits and normalizes empty context", () => {
    expect(parseOpinionInput({ category: "other", body: "a".repeat(2001) })).toEqual({
      ok: false,
      error: "body too long",
    });
    expect(parseOpinionInput({ category: "other", body: "x", context: "a".repeat(201) })).toEqual({
      ok: false,
      error: "context too long",
    });
    expect(parseOpinionInput({ category: "other", body: "x", context: "  " })).toEqual({
      ok: true,
      value: { category: "other", body: "x", context: null },
    });
  });
});

describe("user_opinions migration", () => {
  const sql = readFileSync("supabase/migrations/20261003131500_user_opinions.sql", "utf8");

  it("keeps the table private to the service role", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on public.user_opinions from public, anon, authenticated");
  });

  it("constrains categories to the values the app sends", () => {
    expect(sql).toContain("'improvement', 'mistake', 'bug', 'other'");
  });
});
