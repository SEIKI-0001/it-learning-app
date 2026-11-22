import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFixtureDatabase, pgliteRpc, seedFixture, type GrowthFixture } from "@/lib/growth/xGrowth/fixtureDb";
import { RpcMetricsStore } from "@/lib/growth/xGrowth/store";
import type { PostMetrics } from "@/lib/growth/xPosting/metricsClient";

const fixture: GrowthFixture = JSON.parse(readFileSync("test/fixtures/xGrowth/collect.json", "utf8"));
const now = new Date(fixture.now);
const A = fixture.posts[0], B = fixture.posts[1], D = fixture.posts[3];
let db: PGlite; let store: RpcMetricsStore;
beforeEach(async () => { db = await createFixtureDatabase(process.cwd()); await seedFixture(db, fixture); store = new RpcMetricsStore(pgliteRpc(db)); }, 30000);
afterEach(async () => { await db.close(); });

const snap = (xPostId: string, over: Partial<PostMetrics> = {}): PostMetrics => ({ xPostId, collectionStatus: "ok", errorCode: null, measuredAt: now.toISOString(), createdAt: null, ageHours: null, impressions: 10, likes: 1, reposts: 0, replies: 0, quotes: 0, bookmarks: 0, organic: null, metricSource: "x_api_v2_get_tweets", ...over });
const metricRows = async () => (await db.query<Record<string, unknown>>("select post_id, snapshot_stage, collection_status, error_code, impressions, likes, attempt_count, site_visits, site_visitors, site_signups, age_hours from public.x_growth_post_metrics order by post_id, snapshot_stage")).rows;
async function reserve(reads = 1, daily = 100, monthly = 1000) { return store.reserve(fixture.account, reads, daily, monthly, 0.005); }

describe("x growth migration: additive and private", () => {
  it("keeps existing posting RPCs working and adds nullable columns only", async () => {
    const id = (await db.query<{ id: string }>("select id from public.claim_x_post('555', '2026-11-30T22:00:00Z', 1, 31)")).rows[0].id;
    await db.query("select public.prepare_x_post($1, $2::jsonb, 'm', 'h', array['ab','bc'])", [id, JSON.stringify({ text: "t", theme: "terms", contentId: "c", destinationUrl: null, evidence: ["e"], quality: { passed: true, reasons: [] } })]);
    await db.query("select public.begin_x_publish($1)", [id]);
    await db.query("select public.finish_x_post($1, 'published', '42', null)", [id]);
    expect((await db.query("select status, experiment_id, variant_id, content_style, topic_id, generation_version, metrics_eligible from public.x_social_posts where id = $1", [id])).rows)
      .toEqual([{ status: "published", experiment_id: null, variant_id: null, content_style: null, topic_id: null, generation_version: null, metrics_eligible: false }]);
  });
  it("enables RLS and grants nothing to anon/authenticated", async () => {
    for (const t of ["x_growth_experiments", "x_growth_metric_runs", "x_growth_post_metrics", "x_growth_reviews"]) {
      expect((await db.query(`select relrowsecurity as rls from pg_class where oid = 'public.${t}'::regclass`)).rows).toEqual([{ rls: true }]);
      for (const role of ["anon", "authenticated"]) for (const priv of ["select", "insert", "update", "delete"])
        expect((await db.query<{ ok: boolean }>(`select has_table_privilege('${role}', 'public.${t}', '${priv}') as ok`)).rows[0].ok).toBe(false);
      // Regression (found on local Supabase staging 2026-11-23): default privileges must not leave DELETE/TRUNCATE.
      for (const priv of ["delete", "truncate", "references", "trigger"])
        expect((await db.query<{ ok: boolean }>(`select has_table_privilege('service_role', 'public.${t}', '${priv}') as ok`)).rows[0].ok, `${t} ${priv}`).toBe(false);
      for (const priv of ["select", "insert", "update"])
        expect((await db.query<{ ok: boolean }>(`select has_table_privilege('service_role', 'public.${t}', '${priv}') as ok`)).rows[0].ok).toBe(true);
    }
    for (const fn of ["x_metrics_due(text,timestamptz,integer)", "reserve_x_metrics_reads(text,integer,integer,integer,numeric)", "record_x_metrics_snapshot(uuid,uuid,text,jsonb,integer)", "mark_x_metrics_missed(text,timestamptz)", "finish_x_metrics_run(uuid,text,text,timestamptz,jsonb)", "x_growth_post_report(text,timestamptz)"]) {
      for (const role of ["anon", "authenticated"]) expect((await db.query<{ ok: boolean }>(`select has_function_privilege('${role}', 'public.${fn}', 'execute') as ok`)).rows[0].ok).toBe(false);
      expect((await db.query<{ ok: boolean }>(`select has_function_privilege('service_role', 'public.${fn}', 'execute') as ok`)).rows[0].ok).toBe(true);
      expect((await db.query<{ definer: boolean }>(`select prosecdef as definer from pg_proc where oid = 'public.${fn}'::regprocedure`)).rows[0].definer).toBe(false);
    }
  });
});

describe("due snapshots", () => {
  it("returns only our published posts inside the 24h/72h windows, and missed windows", async () => {
    const due = await store.due(fixture.account, now, 2);
    expect(due.filter(d => d.windowState === "due").map(d => [d.xPostId.slice(-3), d.stage])).toEqual([["102", "72h"], ["108", "24h"], ["107", "24h"], ["101", "24h"]]);
    expect(due.filter(d => d.windowState === "missed").map(d => [d.xPostId.slice(-3), d.stage])).toEqual([["102", "24h"], ["103", "24h"], ["104", "24h"]]);
    expect(due.find(d => d.xPostId.endsWith("101"))?.ageHours).toBe(25.25);
  });
  it("delayed execution: a run late inside the window still measures; after the window it is missed", async () => {
    const late = new Date(now.getTime() + 13 * 3600000); // A is 38.25h old: still inside [22,40)
    expect((await store.due(fixture.account, late, 2)).find(d => d.postId === A.id)).toMatchObject({ stage: "24h", windowState: "due" });
    const tooLate = new Date(now.getTime() + 15 * 3600000);
    expect((await store.due(fixture.account, tooLate, 2)).find(d => d.postId === A.id)).toMatchObject({ stage: "24h", windowState: "missed" });
  });
});

describe("budget reservation", () => {
  it("allows one open run at a time", async () => {
    const [a, b] = await Promise.all([reserve(), reserve()]);
    expect([a.reason, b.reason].sort()).toEqual(["reserved", "run_in_progress"]);
  });
  it("enforces daily and monthly read budgets, counting failed runs too", async () => {
    expect((await reserve(5, 4)).reason).toBe("daily_budget_exhausted");
    const r = await reserve(3, 4, 1000);
    await store.finish(r.runId!, "failed", "x_metrics_http_503", null, {});
    expect((await reserve(2, 4)).reason).toBe("daily_budget_exhausted");
    expect((await reserve(1, 4, 3)).reason).toBe("monthly_budget_exhausted");
    expect((await reserve(1, 4)).reason).toBe("reserved");
    expect((await db.query("select sum(estimated_usd)::text as usd from public.x_growth_metric_runs")).rows).toEqual([{ usd: "0.0200" }]);
  });
  it("waits for the rate-limit reset and marks abandoned runs interrupted", async () => {
    const r = await reserve();
    await store.finish(r.runId!, "rate_limited", "x_metrics_http_429", new Date(Date.now() + 600000).toISOString(), {});
    expect((await reserve()).reason).toBe("rate_limit_wait");
    await db.query("update public.x_growth_metric_runs set rate_limit_reset_at = now() - interval '1 minute'");
    const open = await reserve();
    await db.query("update public.x_growth_metric_runs set started_at = now() - interval '31 minutes' where id = $1", [open.runId]);
    expect((await reserve()).reason).toBe("reserved");
    expect((await db.query("select status from public.x_growth_metric_runs where id = $1", [open.runId])).rows).toEqual([{ status: "interrupted" }]);
    expect(await store.finish(open.runId!, "ok", null, null, {})).toBe(false);
  });
  it("rejects invalid limits and unknown accounts", async () => {
    await expect(store.reserve(fixture.account, 101, 200, 1000, 0.005)).rejects.toThrow();
    await expect(store.reserve("nope", 1, 10, 100, 0.005)).rejects.toThrow(/unknown_account/);
  });
});

describe("snapshot writes", () => {
  it("are idempotent: a final row is never overwritten", async () => {
    const run = (await reserve()).runId!;
    expect(await store.record(run, A.id, "24h", snap(A.xPostId!, { impressions: 148 }), 2)).toBe("inserted");
    expect(await store.record(run, A.id, "24h", snap(A.xPostId!, { impressions: 999 }), 2)).toBe("kept_final");
    const rows = await metricRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ impressions: 148, attempt_count: 1, collection_status: "ok", site_visits: 5, site_visitors: 3, site_signups: 1, age_hours: "25.25" });
  });
  it("retries a retryable failure in place, bounded by max attempts", async () => {
    const run = (await reserve()).runId!;
    const limited = snap(B.xPostId!, { collectionStatus: "rate_limited", errorCode: "x_metrics_http_429", impressions: null, likes: null });
    expect(await store.record(run, B.id, "72h", limited, 2)).toBe("inserted");
    expect(await store.record(run, B.id, "72h", limited, 2)).toBe("updated");
    expect(await store.record(run, B.id, "72h", snap(B.xPostId!), 2)).toBe("kept_final"); // out of attempts
    expect((await metricRows())[0]).toMatchObject({ collection_status: "rate_limited", attempt_count: 2, impressions: null });
    expect((await store.due(fixture.account, now, 2)).some(d => d.postId === B.id && d.stage === "72h")).toBe(false);
  });
  it("stores missing metrics as NULL and refuses ok without impressions", async () => {
    const run = (await reserve()).runId!;
    await store.record(run, B.id, "72h", snap(B.xPostId!, { collectionStatus: "unavailable", errorCode: "x_metrics_impressions_missing", impressions: null, likes: 2 }), 2);
    expect((await metricRows())[0]).toMatchObject({ impressions: null, likes: 2, collection_status: "unavailable" });
    await expect(store.record(run, A.id, "24h", snap(A.xPostId!, { impressions: null }), 2)).rejects.toThrow();
    await expect(store.record(run, A.id, "24h", snap(A.xPostId!, { collectionStatus: "failed", errorCode: null }), 2)).rejects.toThrow();
  });
  it("refuses posts of another account, mismatched ids and closed runs", async () => {
    const run = (await reserve()).runId!;
    const other = fixture.posts[4];
    await expect(store.record(run, other.id, "24h", snap(other.xPostId!), 2)).rejects.toThrow(/post_not_eligible/);
    await expect(store.record(run, A.id, "24h", snap("1"), 2)).rejects.toThrow(/post_not_eligible/);
    await store.finish(run, "ok", null, null, {});
    await expect(store.record(run, A.id, "24h", snap(A.xPostId!), 2)).rejects.toThrow(/run_not_open/);
  });
  it("records a missed window once, without a read", async () => {
    expect(await store.markMissed(fixture.account, now)).toBe(3); // B, C, D: 24h window already passed
    expect(await store.markMissed(fixture.account, now)).toBe(0);
    expect((await metricRows()).find(r => r.post_id === D.id)).toMatchObject({ snapshot_stage: "24h", collection_status: "unavailable", error_code: "x_metrics_window_missed", attempt_count: 0, impressions: null });
    expect((await store.due(fixture.account, now, 2)).filter(d => d.windowState === "missed")).toEqual([]);
  });
});

describe("report", () => {
  it("joins 24h/72h snapshots with per-post site attribution from x_post_performance()", async () => {
    const run = (await reserve()).runId!;
    await store.record(run, A.id, "24h", snap(A.xPostId!, { impressions: 148 }), 2);
    const report = await store.report(fixture.account, new Date(now.getTime() - 7 * 86400000));
    const a = report.find(r => r.post_id === A.id)!;
    expect(a).toMatchObject({ status_24h: "ok", impressions_24h: 148, status_72h: null, impressions_72h: null, engagements_72h: null, site_visits: 5, site_visitors: 3, site_signups: 1 });
    expect(report.some(r => r.post_id === fixture.posts[4].id)).toBe(false);
  });
});
