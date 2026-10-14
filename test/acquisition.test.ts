import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServiceSupabase: vi.fn() }));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase: mocks.getServiceSupabase }));

import {
  acquisitionPeriodStart,
  acquisitionReportToCsv,
  buildAcquisitionReport,
  classifyChannel,
  csvCell,
  parseAcquisitionPeriod,
  parseIdList,
  type SignupInput,
  type VisitInput,
} from "@/lib/growth/acquisition";
import { GET } from "@/app/api/admin/acquisition/route";

// 2026-10-14 12:00 JST
const NOW = Date.parse("2026-10-14T03:00:00Z");
const U1 = "10000000-0000-4000-8000-000000000001";
const U2 = "10000000-0000-4000-8000-000000000002";
const U3 = "10000000-0000-4000-8000-000000000003";
const U4 = "10000000-0000-4000-8000-000000000004";
// X 自動投稿の投稿 ID（lib/growth/xPosting/core.ts の buildPostUrl が utm_content と ref に入れる値）
const POST = "x-5f1c0d2e-0000-4000-8000-000000000001";
const ORGANIC = { utmSource: "x", utmMedium: "social", utmCampaign: "organic_x" };

function signup(userId: string, over: Partial<SignupInput> = {}): SignupInput {
  return {
    userId,
    createdAt: "2026-10-10T00:00:00Z",
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    ref: null,
    referrerHost: null,
    betaGrantedAt: null,
    ...over,
  };
}

function visit(over: Partial<VisitInput> = {}): VisitInput {
  return {
    refPath: null,
    referrerHost: null,
    visitorId: null,
    placement: null,
    ...over,
  };
}

describe("期間", () => {
  it("7・30・90 だけを受け付け、それ以外は 30 日", () => {
    expect(parseAcquisitionPeriod("7")).toBe(7);
    expect(parseAcquisitionPeriod("90")).toBe(90);
    expect(parseAcquisitionPeriod("365")).toBe(30);
    expect(parseAcquisitionPeriod(null)).toBe(30);
  });

  it("今日（JST）を含む直近 N 日の JST 0 時から", () => {
    expect(acquisitionPeriodStart(7, NOW).toISOString()).toBe("2026-10-07T15:00:00.000Z");
    // JST 0:30（UTC では前日）でも JST の日付で数える
    expect(acquisitionPeriodStart(7, Date.parse("2026-10-13T15:30:00Z")).toISOString()).toBe(
      "2026-10-07T15:00:00.000Z",
    );
  });
});

describe("チャネル分類", () => {
  it.each([
    [{ utmSource: "x", referrerHost: null }, "x"],
    [{ utmSource: null, referrerHost: "t.co" }, "x"],
    [{ utmSource: "note", referrerHost: null }, "note"],
    [{ utmSource: null, referrerHost: "note.com" }, "note"],
    [{ utmSource: null, referrerHost: "www.google.com" }, "search"],
    [{ utmSource: null, referrerHost: "www.google.co.jp" }, "search"],
    [{ utmSource: null, referrerHost: "search.yahoo.co.jp" }, "search"],
    [{ utmSource: null, referrerHost: "www.bing.com" }, "search"],
    // Search Console は運営の確認作業なので検索流入に入れない
    [{ utmSource: null, referrerHost: "search.google.com" }, "other"],
    [{ utmSource: "zenn", referrerHost: null }, "other"],
    [{ utmSource: null, referrerHost: null }, "other"],
    // utm が referrer より優先
    [{ utmSource: "note", referrerHost: "t.co" }, "note"],
  ] as const)("%o → %s", (input, channel) => {
    expect(classifyChannel(input)).toBe(channel);
  });
});

describe("buildAcquisitionReport", () => {
  const base = { days: 30 as const, startAt: acquisitionPeriodStart(30, NOW), now: NOW };

  it("0件でも全チャネルの行があり、割合は出さない", () => {
    const r = buildAcquisitionReport({ ...base, signups: [], attempts: [], visits: [] });
    expect(r.totals).toEqual({ visits: 0, signups: 0, activated: 0, returned: 0, betaGranted: 0 });
    expect(r.channels.map((c) => c.channel)).toEqual(["x", "search", "note", "other"]);
    expect(r.sources).toEqual([]);
    expect(r.posts).toEqual([]);
  });

  it("学習開始は1問以上、再学習は JST で別の日にも回答", () => {
    const r = buildAcquisitionReport({
      ...base,
      signups: [
        signup(U1, { ...ORGANIC, ref: POST }),
        signup(U2, { referrerHost: "www.google.com" }),
        signup(U3),
      ],
      attempts: [
        // U1: 10/10 23:30 JST と 10/11 0:30 JST → JST では2日
        { userId: U1, answeredAt: "2026-10-10T14:30:00Z" },
        { userId: U1, answeredAt: "2026-10-10T15:30:00Z" },
        // U2: 同じ JST の日に2問 → 再学習ではない
        { userId: U2, answeredAt: "2026-10-10T01:00:00Z" },
        { userId: U2, answeredAt: "2026-10-10T10:00:00Z" },
      ],
      visits: [],
    });
    expect(r.totals).toMatchObject({ signups: 3, activated: 2, returned: 1 });
    expect(r.channels.find((c) => c.channel === "x")).toMatchObject({ signups: 1, activated: 1, returned: 1 });
    expect(r.channels.find((c) => c.channel === "search")).toMatchObject({ signups: 1, activated: 1, returned: 0 });
    expect(r.channels.find((c) => c.channel === "other")).toMatchObject({ signups: 1, activated: 0 });
    expect(r.sources.map((s) => [s.source, s.campaign, s.signups])).toEqual([
      ["(none)", null, 1],
      ["www.google.com", null, 1],
      ["x", "organic_x", 1],
    ]);
    expect(r.posts).toEqual([
      expect.objectContaining({ source: "x", medium: "social", campaign: "organic_x", content: POST, signups: 1 }),
    ]);
  });

  it("訪問は外部から入った view だけを端末で重複除去し、除外端末・除外アカウントを外す", () => {
    const r = buildAcquisitionReport({
      ...base,
      signups: [signup(U1, { utmSource: "x" }), signup(U4, { utmSource: "x" })],
      attempts: [],
      visits: [
        // X アプリは referrer を落とすことがある → 投稿 ID（placement）で X に寄せる
        visit({ visitorId: "aaaaaaaa", placement: POST }),
        visit({ visitorId: "aaaaaaaa", placement: POST }),
        visit({ visitorId: "aaaaaaaa", refPath: "/kakomon" }), // サイト内の移動
        visit({ visitorId: "bbbbbbbb", referrerHost: "t.co" }),
        visit({ referrerHost: "www.google.com" }), // 端末IDなし → 1件=1訪問
        visit({ referrerHost: "www.google.com" }),
        visit({ visitorId: "cccccccc", referrerHost: "www.google.com" }), // 運営の端末
      ],
      excludedUserIds: new Set([U4]),
      excludedVisitorIds: new Set(["cccccccc"]),
    });
    expect(r.totals.visits).toBe(4);
    expect(r.totals.signups).toBe(1);
    expect(r.channels.find((c) => c.channel === "x")).toMatchObject({ visits: 2, signups: 1 });
    expect(r.channels.find((c) => c.channel === "search")).toMatchObject({ visits: 2, signups: 0 });
    expect(r.posts).toEqual([
      expect.objectContaining({ campaign: "organic_x", content: POST, visits: 1, signups: 0, post: null }),
    ]);
    expect(r.excluded).toEqual({ users: 1, visitors: 1 });
  });

  it("招待コード（ref=beta）や形の違う ref は投稿 ID として扱わない", () => {
    const r = buildAcquisitionReport({
      ...base,
      signups: [signup(U1, { utmSource: "x", utmCampaign: "beta", ref: "beta" })],
      attempts: [],
      visits: [visit({ visitorId: "aaaaaaaa", placement: "cta_start" })],
    });
    expect(r.posts).toEqual([expect.objectContaining({ campaign: "beta", content: null, signups: 1 })]);
    expect(r.channels.find((c) => c.channel === "other")).toMatchObject({ visits: 1 });
  });

  it("訪問を取得できなかったときは訪問だけ null にする", () => {
    const r = buildAcquisitionReport({ ...base, signups: [signup(U1)], attempts: [], visits: null });
    expect(r.totals.visits).toBeNull();
    expect(r.totals.signups).toBe(1);
    expect(r.channels.every((c) => c.visits === null)).toBe(true);
  });
});

describe("除外リスト", () => {
  it("形の合うものだけ小文字で残す", () => {
    expect([...parseIdList(` ${U1.toUpperCase()}, nope\n${U2}`, "uuid")]).toEqual([U1, U2]);
    expect([...parseIdList("abcdef01,<x>", "visitor")]).toEqual(["abcdef01"]);
    expect(parseIdList(undefined, "uuid").size).toBe(0);
  });
});

describe("CSV", () => {
  it("数式になり得る値をエスケープし、区切り文字を引用する", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("-d01")).toBe("'-d01");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });

  it("BOM・見出し・合計・チャネル4行が入る", () => {
    const r = buildAcquisitionReport({
      days: 7,
      startAt: acquisitionPeriodStart(7, NOW),
      now: NOW,
      signups: [signup(U1, { utmSource: "x", utmCampaign: "daily_q" })],
      attempts: [],
      visits: null,
    });
    const csv = acquisitionReportToCsv(r);
    expect(csv.startsWith("﻿section,period_start,period_end,channel,source")).toBe(true);
    const lines = csv.trim().split("\r\n");
    expect(lines.filter((l) => l.startsWith("channel,"))).toHaveLength(4);
    expect(lines[1]).toBe("total,2026-10-07T15:00:00.000Z,2026-10-14T03:00:00.000Z,,,,,,,1,0,0,0,,,");
    expect(lines).toContain("post,2026-10-07T15:00:00.000Z,2026-10-14T03:00:00.000Z,x,x,,daily_q,,,1,0,0,,,,");
  });
});

// ---------------------------------------------------------------- Route + 取得

type Row = Record<string, unknown>;

/** select / gte / eq / is / in / order / range だけを持つ PostgREST もどき。 */
function fakeSupabase(
  tables: Record<string, Row[]>,
  opts: { failing?: string[] } = {},
) {
  const calls: { table: string; columns: string }[] = [];
  const from = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    const builder = {
      select(c: string) {
        calls.push({ table, columns: c });
        return builder;
      },
      gte(col: string, v: string) {
        filters.push((r) => String(r[col]) >= v);
        return builder;
      },
      eq(col: string, v: unknown) {
        filters.push((r) => r[col] === v);
        return builder;
      },
      is(col: string, v: unknown) {
        filters.push((r) => (r[col] ?? null) === v);
        return builder;
      },
      in(col: string, vs: unknown[]) {
        filters.push((r) => vs.includes(r[col]));
        return builder;
      },
      order() {
        return builder;
      },
      async range(a: number, b: number) {
        if (opts.failing?.includes(table)) return { data: null, error: { message: "boom", code: "57014" } };
        const rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
        return { data: rows.slice(a, b + 1), error: null };
      },
    };
    return builder;
  };
  return { client: { from }, calls };
}

const AUTH = `Basic ${Buffer.from("pilot-admin:pilot-admin-password").toString("base64")}`;
const get = (qs: string) =>
  GET(new Request(`https://example.test/api/admin/acquisition${qs}`, { headers: { authorization: AUTH } }));

describe("GET /api/admin/acquisition", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.stubEnv("ADMIN_USER", "pilot-admin");
    vi.stubEnv("ADMIN_PASSWORD", "pilot-admin-password");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    mocks.getServiceSupabase.mockReset();
  });

  const users: Row[] = [
    { id: U1, created_at: "2026-10-12T00:00:00Z", merged_into: null },
    { id: U2, created_at: "2026-10-01T00:00:00Z", merged_into: null }, // 7日より前
    { id: U3, created_at: "2026-10-12T00:00:00Z", merged_into: U1 }, // 統合済み
    { id: U4, created_at: "2026-10-13T00:00:00Z", merged_into: null }, // テスト用
  ];
  const attributions: Row[] = [
    { user_id: U1, utm_source: "x", utm_medium: "social", utm_campaign: "organic_x", ref: POST, referrer_host: null, beta_granted_at: null },
  ];

  it("Supabase 未設定なら 503", async () => {
    mocks.getServiceSupabase.mockReturnValue(null);
    expect((await get("?days=7")).status).toBe(503);
  });

  it("期間内・未統合・除外外のアカウントだけを数え、1000 行を越える回答もページ送りで取り切る", async () => {
    vi.stubEnv("ACQUISITION_EXCLUDED_USER_IDS", U4);
    const attempts: Row[] = Array.from({ length: 1500 }, (_, i) => ({
      user_id: U1,
      answered_at: i < 1000 ? "2026-10-12T01:00:00Z" : "2026-10-13T01:00:00Z",
    }));
    const db = fakeSupabase({
      line_users: users,
      signup_attributions: attributions,
      question_attempts: attempts,
      public_funnel_events: [
        { event: "view", created_at: "2026-10-12T00:00:00Z", ref_path: null, referrer_host: null, visitor_id: "aaaaaaaa", placement: POST },
        { event: "click", created_at: "2026-10-12T00:00:00Z", ref_path: null, referrer_host: null, visitor_id: "aaaaaaaa" },
        { event: "view", created_at: "2026-09-01T00:00:00Z", ref_path: null, referrer_host: "t.co", visitor_id: "bbbbbbbb" },
      ],
      x_social_posts: [
        { utm_content: POST, scheduled_at: "2026-10-12T03:10:00Z", theme: "question", status: "published", post_url: "https://x.com/i/web/status/1" },
      ],
    });
    mocks.getServiceSupabase.mockReturnValue(db.client);

    const res = await get("?days=7");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.warnings).toEqual([]);
    expect(body.report.totals).toEqual({ visits: 1, signups: 1, activated: 1, returned: 1, betaGranted: 0 });
    expect(body.report.excluded).toEqual({ users: 1, visitors: 0 });
    expect(body.report.posts[0]).toMatchObject({
      content: POST,
      visits: 1,
      signups: 1,
      post: { theme: "question", postUrl: "https://x.com/i/web/status/1" },
    });
  });

  it("x_social_posts が未適用・取得失敗でも投稿 ID だけで集計し、注意を返す", async () => {
    const db = fakeSupabase(
      { line_users: users, signup_attributions: attributions, question_attempts: [], public_funnel_events: [] },
      { failing: ["x_social_posts"] },
    );
    mocks.getServiceSupabase.mockReturnValue(db.client);

    const body = await (await get("?days=7")).json();
    expect(body.ok).toBe(true);
    expect(body.warnings).toEqual([expect.stringContaining("x_social_posts")]);
    expect(body.report.posts[0]).toMatchObject({ content: POST, signups: 1, post: null });
  });

  it("訪問の取得に失敗しても登録側は返し、訪問は null", async () => {
    const db = fakeSupabase(
      { line_users: users, signup_attributions: attributions, question_attempts: [] },
      { failing: ["public_funnel_events"] },
    );
    mocks.getServiceSupabase.mockReturnValue(db.client);

    const body = await (await get("?days=30")).json();
    expect(body.ok).toBe(true);
    expect(body.report.totals.visits).toBeNull();
    expect(body.report.totals.signups).toBe(3);
    expect(body.warnings[0]).toContain("訪問");
  });

  it("登録・回答の取得に失敗したら 500（中途半端な数を出さない）", async () => {
    const db = fakeSupabase({ line_users: users }, { failing: ["question_attempts"] });
    mocks.getServiceSupabase.mockReturnValue(db.client);
    const res = await get("?days=30");
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });

  it("0件の期間でも 200 で空の集計を返す", async () => {
    mocks.getServiceSupabase.mockReturnValue(fakeSupabase({}).client);
    const body = await (await get("?days=7")).json();
    expect(body.report.totals).toEqual({ visits: 0, signups: 0, activated: 0, returned: 0, betaGranted: 0 });
  });

  it("format=csv は添付ファイルで返す", async () => {
    mocks.getServiceSupabase.mockReturnValue(fakeSupabase({}).client);
    const res = await get("?days=90&format=csv");
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="acquisition-90d-2026-10-14.csv"');
    expect(await res.text()).toContain("section,period_start");
  });
});
