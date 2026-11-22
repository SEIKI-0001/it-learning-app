import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectMetrics, exitCodeFor, type CollectConfig, type MetricsStore } from "@/lib/growth/xGrowth/collector";
import { createFixtureDatabase, pgliteRpc, seedFixture, type GrowthFixture } from "@/lib/growth/xGrowth/fixtureDb";
import { RpcMetricsStore } from "@/lib/growth/xGrowth/store";
import { fetchPostMetrics } from "@/lib/growth/xPosting/metricsClient";

const fixture: GrowthFixture = JSON.parse(readFileSync("test/fixtures/xGrowth/collect.json", "utf8"));
const now = new Date(fixture.now);
const creds = { consumerKey: "k", consumerSecret: "s", accessToken: "t", accessSecret: "ts" };
const base: CollectConfig = { enabled: true, dryRun: false, liveRead: true, account: fixture.account, now, dailyReadBudget: 20, monthlyReadBudget: 120, maxReadsPerRun: 10, maxAttempts: 2 };
let db: PGlite; let store: RpcMetricsStore;
beforeEach(async () => { db = await createFixtureDatabase(process.cwd()); await seedFixture(db, fixture); store = new RpcMetricsStore(pgliteRpc(db)); }, 30000);
afterEach(async () => { await db.close(); });

/** Fake X: asserts every request is a signed GET /2/tweets with our author check fields; never POST. */
function fakeX(responses: (() => Response)[]) {
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const u = new URL(String(url));
    if (init?.method !== "GET" || init.body || u.origin + u.pathname !== "https://api.x.com/2/tweets") throw new Error("unexpected_request");
    expect(u.searchParams.get("tweet.fields")).toContain("author_id");
    expect(String((init.headers as Record<string, string>).Authorization)).toMatch(/^OAuth /);
    const next = responses.shift();
    if (!next) throw new Error("unexpected_extra_request");
    return next();
  });
  const read = (ids: string[]) => fetchPostMetrics({ ids, ownedMetrics: true, expectedAuthorId: fixture.account }, creds, { fetcher, now: () => now });
  return { fetcher, read };
}
const okResponse = () => new Response(JSON.stringify(fixture.response), { status: 200 });
const rows = async () => (await db.query<Record<string, unknown>>("select p.x_post_id, m.snapshot_stage, m.collection_status, m.error_code, m.impressions, m.likes, m.organic, m.attempt_count, m.site_visits from public.x_growth_post_metrics m join public.x_social_posts p on p.id = m.post_id order by p.x_post_id, m.snapshot_stage")).rows;
const runs = async () => (await db.query<Record<string, unknown>>("select status, reserved_reads, estimated_usd::text as usd, error_code from public.x_growth_metric_runs order by started_at")).rows;

describe("collectMetrics end-to-end (PGlite + real metrics client, offline)", () => {
  it("collects due 24h/72h snapshots with partial failures, never storing missing values as 0", async () => {
    const x = fakeX([okResponse]);
    const r = await collectMetrics(base, { store, read: x.read });
    expect(r).toMatchObject({ state: "partial", plan: { dueStages: 4, reads: 4, deferredReads: 0, missedStages: 3, estimatedUsd: 0.02 }, missedRecorded: 3, statuses: { ok: 1, unavailable: 2, permission_error: 1 }, recordErrors: 0 });
    expect(x.fetcher).toHaveBeenCalledTimes(1);
    const byId = Object.fromEntries((await rows()).map(m => [`${String(m.x_post_id).slice(-3)}/${m.snapshot_stage}`, m]));
    expect(byId["101/24h"]).toMatchObject({ collection_status: "ok", impressions: 148, likes: 3, attempt_count: 1, site_visits: 5 });
    expect(byId["101/24h"].organic).toMatchObject({ "organic.user_profile_clicks": 2, "non_public.engagements": 7 });
    expect(byId["102/72h"]).toMatchObject({ collection_status: "unavailable", error_code: "x_metrics_impressions_missing", impressions: null, likes: 2 });
    expect(byId["107/24h"]).toMatchObject({ collection_status: "unavailable", error_code: "x_metrics_not_found", impressions: null });
    expect(byId["108/24h"]).toMatchObject({ collection_status: "permission_error", error_code: "x_metrics_not_own_post", impressions: null });
    expect(byId["104/24h"]).toMatchObject({ error_code: "x_metrics_window_missed", attempt_count: 0 });
    expect(Object.keys(byId).some(k => k.startsWith("105") || k.startsWith("109"))).toBe(false); // other account / older than 7 days
    expect(await runs()).toEqual([{ status: "partial", reserved_reads: 4, usd: "0.0200", error_code: null }]);
  });
  it("is idempotent: an immediate second run makes no X request and no new rows", async () => {
    await collectMetrics(base, { store, read: fakeX([okResponse]).read });
    const before = await rows();
    const second = fakeX([]);
    expect(await collectMetrics(base, { store, read: second.read })).toMatchObject({ state: "nothing_due", plan: { reads: 0 } });
    expect(second.fetcher).not.toHaveBeenCalled();
    expect(await rows()).toEqual(before);
    expect(await runs()).toHaveLength(1);
  });
  it("defaults are inert: dry-run writes nothing and reads nothing, but estimates cost", async () => {
    const x = fakeX([]);
    expect(await collectMetrics({ ...base, dryRun: true }, { store, read: x.read })).toEqual({ state: "dry_run", plan: { dueStages: 4, reads: 4, deferredReads: 0, missedStages: 3, estimatedUsd: 0.02 } });
    expect(await collectMetrics({ ...base, liveRead: false }, { store, read: x.read })).toMatchObject({ state: "live_read_disabled", missedRecorded: 3 });
    expect(x.fetcher).not.toHaveBeenCalled();
    expect(await runs()).toEqual([]);
  });
  it("the emergency switch stops before any DB or X access", async () => {
    const spy: MetricsStore = { due: vi.fn(), markMissed: vi.fn(), reserve: vi.fn(), record: vi.fn(), finish: vi.fn() };
    const read = vi.fn();
    expect(await collectMetrics({ ...base, enabled: false }, { store: spy, read })).toEqual({ state: "disabled" });
    expect(Object.values(spy).every(f => (f as ReturnType<typeof vi.fn>).mock.calls.length === 0)).toBe(true);
    expect(read).not.toHaveBeenCalled();
  });
  it("rate limit: records rate_limited, waits for reset, then retries at most maxAttempts", async () => {
    const reset = Math.floor(Date.now() / 1000) + 900;
    const limited = () => new Response("{}", { status: 429, headers: { "x-rate-limit-reset": String(reset) } });
    const x = fakeX([limited]);
    const first = await collectMetrics(base, { store, read: x.read });
    expect(first).toMatchObject({ state: "rate_limited", errorCode: "x_metrics_http_429", rateLimitResetAt: new Date(reset * 1000).toISOString() });
    expect(exitCodeFor(first)).toBe(0);
    expect((await rows()).filter(m => m.collection_status === "rate_limited").map(m => m.attempt_count)).toEqual([1, 1, 1, 1]);
    const waiting = fakeX([]);
    expect(await collectMetrics(base, { store, read: waiting.read })).toMatchObject({ state: "rate_limit_wait" });
    expect(waiting.fetcher).not.toHaveBeenCalled();
    await db.query("update public.x_growth_metric_runs set rate_limit_reset_at = now() - interval '1 minute'");
    const again = fakeX([() => new Response("{}", { status: 503 })]);
    expect(await collectMetrics(base, { store, read: again.read })).toMatchObject({ state: "failed", errorCode: "x_metrics_http_503" });
    expect((await rows()).filter(m => m.collection_status === "failed").map(m => m.attempt_count)).toEqual([2, 2, 2, 2]);
    const exhausted = fakeX([]);
    expect(await collectMetrics(base, { store, read: exhausted.read })).toMatchObject({ state: "nothing_due" });
    expect(exhausted.fetcher).not.toHaveBeenCalled();
  });
  it("permission errors for the whole request are final and fail the job", async () => {
    const r = await collectMetrics(base, { store, read: fakeX([() => new Response("{}", { status: 403 })]).read });
    expect(r.state).toBe("permission_error"); expect(exitCodeFor(r)).toBe(1);
    expect((await rows()).filter(m => m.collection_status === "permission_error")).toHaveLength(4);
    expect((await collectMetrics(base, { store, read: fakeX([]).read })).state).toBe("nothing_due");
  });
  it("transport failure and malformed JSON are stored as failed (retryable), not 0", async () => {
    for (const response of [() => { throw new Error("socket token=secret"); }, () => new Response("not json", { status: 200 })]) {
      await db.exec("delete from public.x_growth_post_metrics; delete from public.x_growth_metric_runs;");
      const r = await collectMetrics(base, { store, read: fakeX([response as () => Response]).read });
      expect(r.state).toBe("failed");
      expect((await rows()).filter(m => m.collection_status === "failed").every(m => m.impressions === null)).toBe(true);
      expect(JSON.stringify(r)).not.toContain("secret");
    }
  });
  it("an all-unavailable response keeps every value NULL", async () => {
    const empty = () => new Response(JSON.stringify({ data: fixture.posts.slice(0, 4).map(p => ({ id: p.xPostId, author_id: fixture.account, public_metrics: {} })) }), { status: 200 });
    const r = await collectMetrics(base, { store, read: fakeX([empty]).read });
    expect(r).toMatchObject({ state: "partial", statuses: { unavailable: 4 } });
    expect((await rows()).filter(m => m.error_code !== "x_metrics_window_missed").every(m => m.impressions === null && m.likes === null)).toBe(true);
  });
  it("budgets and the per-run cap stop or shrink a run before any X request", async () => {
    const x = fakeX([]);
    expect(await collectMetrics({ ...base, dailyReadBudget: 3 }, { store, read: x.read })).toMatchObject({ state: "daily_budget_exhausted", plan: { reads: 4 } });
    expect(x.fetcher).not.toHaveBeenCalled();
    const capped = fakeX([okResponse]);
    expect(await collectMetrics({ ...base, maxReadsPerRun: 2 }, { store, read: capped.read })).toMatchObject({ plan: { reads: 2, deferredReads: 2, estimatedUsd: 0.01 } });
    expect(new URL(String(capped.fetcher.mock.calls[0][0])).searchParams.get("ids")?.split(",")).toHaveLength(2);
  });
  it("a DB write failure is counted and fails the job without retrying X", async () => {
    const failing = Object.assign(Object.create(Object.getPrototypeOf(store)), store) as RpcMetricsStore;
    failing.record = async () => { throw new Error("db down"); };
    const x = fakeX([okResponse]);
    const r = await collectMetrics(base, { store: failing, read: x.read });
    expect(r).toMatchObject({ state: "partial", recordErrors: 4 }); expect(exitCodeFor(r)).toBe(1);
    expect(x.fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects unsafe configuration", async () => {
    for (const c of [{ account: "abc" }, { maxReadsPerRun: 101 }, { maxAttempts: 0 }, { dailyReadBudget: 500, monthlyReadBudget: 100 }])
      await expect(collectMetrics({ ...base, ...c }, { store, read: fakeX([]).read })).rejects.toThrow();
  });
});
