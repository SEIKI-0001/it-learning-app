import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { collectMetrics } from "@/lib/growth/xGrowth/collector";
import { parseExperiment, type ExperimentMeta } from "@/lib/growth/xGrowth/experiment";
import { createFixtureDatabase, pgliteRpc } from "@/lib/growth/xGrowth/fixtureDb";
import { RpcMetricsStore, type Rpc } from "@/lib/growth/xGrowth/store";
import { GrowthStore, runWeekly } from "@/lib/growth/xGrowth/weekly";
import { generatedStorageFields, runPosting, type Config, type Dependencies, type PostRow, type Store } from "@/lib/growth/xPosting/runner";
import { availableSources } from "@/lib/growth/xPosting/sources";
import { fetchPostMetrics } from "@/lib/growth/xPosting/metricsClient";
import type { Generated } from "@/lib/growth/xPosting/core";
import type { XResult } from "@/lib/growth/xPosting/xClient";

/**
 * P4 end-to-end, fully offline: Experiment → Candidate → Validation → Publication (simulated) →
 * Metrics (fake X, real collector + SQL) → Weekly analysis (real rules + SQL) → Next hypothesis.
 * Time is simulated by moving publish timestamps; every stage is re-run to prove idempotency.
 */
const ACCOUNT = "1234567890";
const raw = JSON.parse(readFileSync("test/fixtures/xGrowth/experiment.json", "utf8"));
const START = Date.parse(raw.start_at);
const slotOf = (d: number) => new Date(START + d * 86400000 + 7 * 3600000).toISOString();

class PglitePostStore implements Store {
  constructor(private db: PGlite, private rpc: Rpc) {}
  async claim(c: Config): Promise<PostRow | null> { const r = await this.rpc("claim_x_post", { p_account: c.account, p_slot: c.slot, p_daily: c.dailyLimit, p_monthly: c.monthlyLimit }); return Array.isArray(r) && r[0] ? r[0] as PostRow : null; }
  async history(account: string): Promise<string[]> { return (await this.db.query<{ text: string }>("select text from public.x_social_posts where account_id = $1 and status in ('ready','publishing','published','uncertain') and text is not null order by scheduled_at desc limit 100", [account])).rows.map(r => r.text); }
  // text[] needs an explicit cast here (the generic PGlite rpc sends objects/arrays as JSON); PostgREST handles it in production.
  async prepare(id: string, g: Generated, model: string): Promise<boolean> { const f = generatedStorageFields(g); return (await this.db.query<{ ok: boolean }>("select public.prepare_x_post($1, $2::jsonb, $3, $4, $5::text[]) as ok", [id, JSON.stringify(g), model, f.hash, f.keys])).rows[0].ok === true; }
  async begin(id: string, daily: number): Promise<boolean> { return (await this.rpc("begin_x_publish", { p_id: id, p_daily: daily })) === true; }
  async finish(id: string, r: XResult): Promise<boolean> { return (await this.rpc("finish_x_post", { p_id: id, p_status: r.state, p_x_id: r.state === "published" ? r.id : null, p_error: r.state === "published" ? null : r.error })) === true; }
  async fail(id: string, error: string): Promise<void> { await this.db.query("update public.x_social_posts set status = 'failed', error_summary = $2 where id = $1 and status in ('draft','ready')", [id, error]); }
  async tagExperiment(id: string, m: ExperimentMeta): Promise<boolean> { return (await this.rpc("tag_x_post_experiment", { p_id: id, p_experiment: m.experimentId, p_variant: m.variantId, p_style: m.contentStyle, p_topic: m.topicId, p_version: m.generationVersion })) === true; }
  async active(slot: string) { const r = await this.rpc("active_x_experiment", { p_slot: slot }); const row = Array.isArray(r) ? r[0] as Record<string, unknown> | undefined : undefined; return row ? parseExperiment({ ...row, start_at: (row.start_at as Date).toISOString(), end_at: row.end_at ? (row.end_at as Date).toISOString() : null }) : null; }
}

let db: PGlite; let rpc: Rpc; let posts: PglitePostStore;
const published = new Map<string, { variant: string; day: number }>();
const publish = vi.fn<(text: string) => Promise<XResult>>();
const generate = vi.fn<Dependencies["generate"]>(async () => { throw new Error("llm_must_not_be_called_on_experiment_path"); });

beforeAll(async () => {
  db = await createFixtureDatabase(process.cwd());
  rpc = pgliteRpc(db);
  posts = new PglitePostStore(db, rpc);
  await db.query(`insert into public.x_growth_experiments(id, name, hypothesis, status, primary_metric, start_at, end_at, min_posts_per_variant, variants, allocation_seed, experiment_version, hypothesis_key, config)
    values ($1::uuid,$2,$3,'running','impressions_72h',$4::timestamptz,$5::timestamptz,12,$6::jsonb,$7,'v1',$8,$9::jsonb)`,
    [raw.id, raw.name, raw.hypothesis, raw.start_at, raw.end_at, JSON.stringify(raw.variants), raw.allocation_seed, raw.hypothesis_key, JSON.stringify(raw.config)]);
}, 60000);
afterAll(async () => { await db?.close(); });

describe("growth engine end to end (offline)", () => {
  it("1-3. experiment → candidates → validation → simulated publication, once per slot", async () => {
    let day = 0;
    publish.mockImplementation(async () => (day === 5 ? Promise.reject(new Error("socket hang up")) : { state: "published", id: `19900000000000000${String(day).padStart(2, "0")}` }));
    const deps: Dependencies = { store: posts, sources: availableSources, generate, publish, verifyIdentity: async () => {}, checkDestination: async () => {}, experiment: { active: s => posts.active(s), ctx: { allowDraftLibrary: false } } };
    for (day = 0; day < 28; day++) {
      const config: Config = { enabled: true, dryRun: false, fixture: false, account: ACCOUNT, origin: "https://example.test", slot: slotOf(day), dailyLimit: 1, monthlyLimit: 124, model: "none" };
      const r = await runPosting(config, deps);
      if (day === 5) expect(r.state).toBe("uncertain"); else { expect(r.state).toBe("published"); published.set(r.xPostId!, { variant: "", day }); }
      // Simulate time: the post went out ~4h after the slot.
      await db.query("update public.x_social_posts set publish_attempt_at = scheduled_at + interval '4 hours', published_at = case when status = 'published' then scheduled_at + interval '4 hours' end where scheduled_at = $1", [slotOf(day)]);
      // Idempotency: the same slot can never be generated or published twice, even after a failure.
      expect((await runPosting(config, deps)).state).toBe("skipped");
    }
    expect(publish).toHaveBeenCalledTimes(28); // 27 published + 1 uncertain, never retried
    expect(generate).not.toHaveBeenCalled();
    const rows = (await db.query<{ status: string; variant_id: string; content_style: string; metrics_eligible: boolean; content_hash: string; x_post_id: string }>("select status, variant_id, content_style, metrics_eligible, content_hash, x_post_id from public.x_social_posts order by scheduled_at")).rows;
    expect(rows).toHaveLength(28);
    expect(rows.filter(r => r.status === "published")).toHaveLength(27);
    expect(rows.filter(r => r.status === "uncertain")).toHaveLength(1);
    expect(rows.every(r => r.metrics_eligible && (r.variant_id === "A" || r.variant_id === "B"))).toBe(true);
    expect(rows.every(r => r.content_style === (r.variant_id === "A" ? "definition_first" : "question_first"))).toBe(true);
    expect(new Set(rows.map(r => r.content_hash)).size).toBe(28);
    for (const r of rows) if (r.x_post_id) published.set(r.x_post_id, { variant: r.variant_id, day: published.get(r.x_post_id)!.day });
    expect(rows.filter(r => r.variant_id === "A")).toHaveLength(14);
  }, 120000);

  it("4. metrics: every published post gets a 24h and a 72h snapshot from the scheduled runs; re-runs read nothing", async () => {
    const metrics = new RpcMetricsStore(rpc);
    const impressions = (id: string) => { const p = published.get(id)!; return (p.variant === "B" ? 30 : 10) + (p.day % 3); };
    const fetcher = vi.fn<typeof fetch>(async url => {
      const ids = new URL(String(url)).searchParams.get("ids")!.split(",");
      return new Response(JSON.stringify({ data: ids.map(id => ({ id, author_id: ACCOUNT, created_at: "2026-12-01T00:00:00Z", public_metrics: { impression_count: impressions(id), like_count: 1, retweet_count: 0, reply_count: 0, quote_count: 0, bookmark_count: 0 } })) }), { status: 200 });
    });
    const creds = { consumerKey: "k", consumerSecret: "s", accessToken: "t", accessSecret: "ts" };
    const base = { enabled: true, dryRun: false, liveRead: true, account: ACCOUNT, dailyReadBudget: 10000, monthlyReadBudget: 100000, maxReadsPerRun: 100, maxAttempts: 2 };
    let last = new Date(0);
    for (let h = 6; h < 34 * 24; h += 6) { // the 6-hourly schedule (xx:15 UTC)
      last = new Date(START + h * 3600000 + 15 * 60000);
      const now = last;
      await collectMetrics({ ...base, now }, { store: metrics, read: ids => fetchPostMetrics({ ids, ownedMetrics: true, expectedAuthorId: ACCOUNT }, creds, { fetcher, now: () => now }) });
    }
    const snaps = (await db.query<{ snapshot_stage: string; collection_status: string; n: number }>("select snapshot_stage, collection_status, count(*)::int as n from public.x_growth_post_metrics group by 1, 2 order by 1, 2")).rows;
    expect(snaps).toEqual([{ snapshot_stage: "24h", collection_status: "ok", n: 27 }, { snapshot_stage: "72h", collection_status: "ok", n: 27 }]);
    const ages = (await db.query<{ stage: string; lo: string; hi: string }>("select snapshot_stage as stage, min(age_hours)::text as lo, max(age_hours)::text as hi from public.x_growth_post_metrics group by 1 order by 1")).rows;
    for (const a of ages) { const [lo, hi] = a.stage === "24h" ? [22, 40] : [70, 88]; expect(Number(a.lo)).toBeGreaterThanOrEqual(lo); expect(Number(a.hi)).toBeLessThan(hi); }
    const calls = fetcher.mock.calls.length;
    const again = await collectMetrics({ ...base, now: last }, { store: metrics, read: ids => fetchPostMetrics({ ids }, creds, { fetcher }) });
    expect(again.state).toBe("nothing_due");
    expect(fetcher.mock.calls.length).toBe(calls);
    expect(fetcher.mock.calls.every(([, init]) => init?.method === "GET" && !init.body)).toBe(true);
  }, 180000);

  it("5-6. weekly analysis classifies by rules, alerts on the uncertain post, proposes the next hypothesis, saves once", async () => {
    const store = new GrowthStore(rpc);
    const now = new Date(START + 35 * 86400000);
    const { report, saved } = await runWeekly(store, { account: ACCOUNT, now, save: true, budgets: { monthlyReads: 120, dailyReads: 10 } });
    const e = report.data.experiments[0];
    expect(e.arms.map(a => a.valid).sort()).toEqual([13, 14]);
    expect(e.status).toBe("exploratory_lead"); // B is ~3x A, but one experiment is never a "winner"
    expect(e.effect.leader).toBe("B");
    expect(e.action).toBe("repeat");
    expect(report.data.alerts.map(a => a.code)).toContain("posts_uncertain");
    expect(report.data.hypotheses[0]).toMatchObject({ kind: "replicate", key: "hook_question_vs_definition_replication" });
    expect(report.markdown).toContain("探索的な傾向あり");
    expect(saved!.summary.created).toBe(true);
    const second = await runWeekly(store, { account: ACCOUNT, now, save: true });
    expect(second.saved!.summary).toEqual({ reviewId: saved!.summary.reviewId, created: false });
    expect((await db.query("select count(*)::int as n from public.x_growth_reviews")).rows).toEqual([{ n: 2 }]);
    expect((await db.query<{ n: number }>("select count(*)::int as n from public.x_growth_hypotheses where status = 'proposed'")).rows[0].n).toBe(report.data.hypotheses.length);
    // Nothing was activated: the experiment table still has exactly the one experiment, no new running rows.
    expect((await db.query("select count(*)::int as n from public.x_growth_experiments")).rows).toEqual([{ n: 1 }]);
  }, 120000);
});
