import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServiceSupabase: vi.fn() }));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase: mocks.getServiceSupabase }));

import {
  buildAttributionCookieValue,
  parseAttributionCookie,
} from "@/lib/growth/attributionCookie";
import {
  BETA_CAP,
  BETA_DAYS,
  NEW_SIGNUP_WINDOW_MS,
  recordSignupAttribution,
} from "@/lib/growth/attribution";
import { buildXShareUrl, withShareUtm } from "@/lib/growth/share";

const NOW = Date.parse("2026-10-03T12:00:00Z");
const USER_ID = "10000000-0000-0000-0000-000000000001";

function build(overrides: Partial<Parameters<typeof buildAttributionCookieValue>[0]> = {}) {
  return buildAttributionCookieValue({
    search: "",
    pathname: "/lp",
    referrer: "",
    currentHost: "shikaku-mochit.com",
    now: NOW,
    ...overrides,
  });
}

describe("流入元 Cookie", () => {
  it("utm と ref を保存し、往復で同じ値に戻る", () => {
    const raw = build({ search: "?utm_source=X&utm_medium=social&utm_campaign=first_ten&ref=beta" });
    expect(parseAttributionCookie(raw)).toEqual({
      utmSource: "x",
      utmMedium: "social",
      utmCampaign: "first_ten",
      ref: "beta",
      referrerHost: null,
      landingPath: "/lp",
      firstSeenAt: new Date(NOW).toISOString(),
    });
  });

  it("外部サイトから来たときはホスト名だけを残し、パスやクエリは残さない", () => {
    const raw = build({ referrer: "https://note.com/someone/n/abc?x=1" });
    expect(parseAttributionCookie(raw)?.referrerHost).toBe("note.com");
    expect(decodeURIComponent(raw ?? "")).not.toContain("someone");
  });

  it("自サイト内の遷移や手がかりの無い訪問では何も保存しない", () => {
    expect(build({ referrer: "https://shikaku-mochit.com/guide" })).toBeNull();
    expect(build()).toBeNull();
  });

  it("許可されない文字を含む値は捨てる", () => {
    const raw = build({ search: "?utm_source=<script>&utm_campaign=ok" });
    const attr = parseAttributionCookie(raw);
    expect(attr?.utmSource).toBeNull();
    expect(attr?.utmCampaign).toBe("ok");
  });

  it("壊れた Cookie は null", () => {
    expect(parseAttributionCookie("not-json")).toBeNull();
    expect(parseAttributionCookie(encodeURIComponent("[1,2]"))).toBeNull();
    expect(parseAttributionCookie(encodeURIComponent(JSON.stringify({ lp: "/lp" })))).toBeNull();
  });
});

describe("Xシェアリンク", () => {
  it("共有URLに utm を付ける", () => {
    expect(withShareUtm("/kakomon/2025/1", "kakomon_share")).toBe(
      "https://shikaku-mochit.com/kakomon/2025/1?utm_source=x&utm_medium=share&utm_campaign=kakomon_share",
    );
  });

  it("x.com の投稿画面に本文・URL・ハッシュタグを渡す", () => {
    const url = new URL(buildXShareUrl({ text: "問1", path: "/lp", campaign: "c" }));
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe("問1");
    expect(url.searchParams.get("url")).toContain("utm_campaign=c");
    expect(url.searchParams.get("hashtags")).toBe("ITパスポート");
  });
});

function fakeSupabase(options: { createdAt: string | null; rpcResult?: boolean }) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ data: options.rpcResult ?? true, error: null });
  const from = vi.fn((table: string) => {
    if (table === "line_users") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: options.createdAt ? { created_at: options.createdAt } : null,
            }),
          }),
        }),
      };
    }
    if (table === "signup_attributions") return { upsert };
    throw new Error(`unexpected table ${table}`);
  });
  return { client: { from, rpc }, upsert, rpc };
}

const ATTR = {
  utmSource: "x",
  utmMedium: "social",
  utmCampaign: "first_ten",
  ref: null,
  referrerHost: null,
  landingPath: "/lp/try",
  firstSeenAt: null,
};

describe("recordSignupAttribution", () => {
  beforeEach(() => vi.clearAllMocks());

  it("作成直後のユーザーには1行だけ記録する（既存行は上書きしない）", async () => {
    const db = fakeSupabase({ createdAt: new Date(NOW - 60_000).toISOString() });
    mocks.getServiceSupabase.mockReturnValue(db.client);
    await expect(recordSignupAttribution(USER_ID, ATTR, NOW)).resolves.toEqual({
      recorded: true,
      betaGranted: false,
    });
    expect(db.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, utm_source: "x", landing_path: "/lp/try" }),
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("以前からいるユーザーの再ログインは記録しない", async () => {
    const db = fakeSupabase({ createdAt: new Date(NOW - NEW_SIGNUP_WINDOW_MS - 1).toISOString() });
    mocks.getServiceSupabase.mockReturnValue(db.client);
    await expect(recordSignupAttribution(USER_ID, ATTR, NOW)).resolves.toEqual({
      recorded: false,
      betaGranted: false,
    });
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("ref=beta なら先着上限つきの付与 RPC を呼ぶ", async () => {
    const db = fakeSupabase({ createdAt: new Date(NOW).toISOString(), rpcResult: true });
    mocks.getServiceSupabase.mockReturnValue(db.client);
    await expect(recordSignupAttribution(USER_ID, { ...ATTR, ref: "beta" }, NOW)).resolves.toEqual({
      recorded: true,
      betaGranted: true,
    });
    expect(db.rpc).toHaveBeenCalledWith("grant_beta_pro", {
      p_user_id: USER_ID,
      p_days: BETA_DAYS,
      p_cap: BETA_CAP,
    });
  });

  it("上限到達で RPC が false を返したら付与なしとして扱う", async () => {
    const db = fakeSupabase({ createdAt: new Date(NOW).toISOString(), rpcResult: false });
    mocks.getServiceSupabase.mockReturnValue(db.client);
    const result = await recordSignupAttribution(USER_ID, { ...ATTR, ref: "beta" }, NOW);
    expect(result.betaGranted).toBe(false);
  });

  it("Supabase 未設定なら何もしない", async () => {
    mocks.getServiceSupabase.mockReturnValue(null);
    await expect(recordSignupAttribution(USER_ID, ATTR, NOW)).resolves.toEqual({
      recorded: false,
      betaGranted: false,
    });
  });
});

describe("signup_attributions マイグレーション", () => {
  const sql = readFileSync("supabase/migrations/20261003090000_signup_attributions.sql", "utf8");

  it("公開ロールからは読めず、付与関数は service_role だけが実行できる", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on public.signup_attributions from public, anon, authenticated");
    expect(sql).toContain(
      "revoke all on function public.grant_beta_pro(uuid, integer, integer) from public, anon, authenticated",
    );
    expect(sql).toContain("grant execute on function public.grant_beta_pro(uuid, integer, integer) to service_role");
  });

  it("同時登録でも上限を超えないよう直列化し、付与済みの行は二重付与しない", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toMatch(/granted_count >= p_cap/);
    expect(sql).toMatch(/and beta_granted_at is null/);
  });
});
