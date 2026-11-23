import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFixtureDatabase, pgliteRpc } from "@/lib/growth/xGrowth/fixtureDb";
import { hasCritical, healthAlerts, parseOps, type OpsSummary } from "@/lib/growth/xGrowth/health";
import { GrowthStore } from "@/lib/growth/xGrowth/weekly";

const rel = { scheduled: 7, published: 7, failed: 0, uncertain: 0, cancelled: 0, other: 0, successRate: 1, failureReasons: {}, metricsClosed: 7, metricsOk: 7, metricsMissingRate: 0 };
const ops = (o: Partial<OpsSummary> = {}): OpsSummary => ({ uncertain: 0, staleReady: 0, stalePublishing: 0, readsToday: 0, readsMonth: 0, estimatedUsdMonth: 0, runs7d: {}, runErrors7d: {}, runningExperiments: 0, ...o });

describe("operational alerts", () => {
  it("a healthy week has no alerts", () => { expect(healthAlerts(ops(), rel, { monthlyReads: 120, dailyReads: 10 })).toEqual([]); });
  it("uncertain/stale publishing and permission errors are critical and say what to do", () => {
    const a = healthAlerts(ops({ uncertain: 1, stalePublishing: 1, runs7d: { permission_error: 2 } }), rel, { monthlyReads: 120, dailyReads: 10 });
    expect(a.filter(x => x.level === "critical").map(x => x.code).sort()).toEqual(["metrics_permission_error", "posts_stale_publishing", "posts_uncertain"]);
    expect(a.find(x => x.code === "posts_uncertain")!.action).toContain("reconcile");
    expect(hasCritical(a)).toBe(true);
  });
  it("budget at 80%, stale ready rows, failed runs, missing metrics and failed posts are warnings", () => {
    const a = healthAlerts(ops({ readsMonth: 100, estimatedUsdMonth: 0.5, staleReady: 1, runs7d: { failed: 1, rate_limited: 1 }, runErrors7d: { x_metrics_http_503: 1 } }), { ...rel, failed: 1, failureReasons: { quality_check_failed_duplicate_content: 1 }, metricsMissingRate: 0.4 }, { monthlyReads: 120, dailyReads: 10 });
    expect(a.map(x => `${x.level}:${x.code}`).sort()).toEqual(["info:metrics_rate_limited", "warning:metrics_budget_80", "warning:metrics_missing_high", "warning:metrics_runs_failed", "warning:posts_failed", "warning:posts_stale_ready"]);
    expect(hasCritical(a)).toBe(false);
  });
  it("parses the DB summary defensively", () => { expect(parseOps(null)).toBeNull(); expect(parseOps({ uncertain: "2", runs7d: { ok: "3" } })).toMatchObject({ uncertain: 2, runs7d: { ok: 3 }, readsMonth: 0 }); });
});

describe("x_growth_ops_summary (PGlite)", () => {
  let db: PGlite;
  beforeEach(async () => { db = await createFixtureDatabase(process.cwd()); }, 30000);
  afterEach(async () => { await db.close(); });
  it("counts uncertain/stale rows and this month's reads for the account only", async () => {
    await db.exec(`insert into public.x_posting_accounts values ('1'), ('2');
      insert into public.x_social_posts(account_id, scheduled_at, status, text, utm_content, utm, updated_at) values
        ('1', now() - interval '3 days', 'uncertain', 't1', 'x-a', '{}', now()), ('1', now() - interval '4 days', 'ready', 't2', 'x-b', '{}', now() - interval '2 days'),
        ('2', now() - interval '3 days', 'uncertain', 't3', 'x-c', '{}', now());
      insert into public.x_growth_metric_runs(account_id, reserved_reads, estimated_usd, status, error_code) values ('1', 3, 0.015, 'ok', null), ('1', 1, 0.005, 'failed', 'x_metrics_http_503'), ('2', 9, 0.045, 'ok', null);`);
    const o = await new GrowthStore(pgliteRpc(db)).ops("1", new Date());
    expect(o).toMatchObject({ uncertain: 1, staleReady: 1, stalePublishing: 0, readsMonth: 4, estimatedUsdMonth: 0.02, runs7d: { ok: 1, failed: 1 }, runErrors7d: { x_metrics_http_503: 1 } });
  });
});
