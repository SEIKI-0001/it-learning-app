import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guardAiText, interpret } from "@/lib/growth/xGrowth/aiAnalysis";
import { analyzeExperiment, dist, type AnalysisRow } from "@/lib/growth/xGrowth/analysis";
import { parseExperiment } from "@/lib/growth/xGrowth/experiment";
import { createFixtureDatabase, pgliteRpc } from "@/lib/growth/xGrowth/fixtureDb";
import { generateHypotheses } from "@/lib/growth/xGrowth/hypotheses";
import { GrowthStore, weeklyPeriod } from "@/lib/growth/xGrowth/weekly";
import { scenarioData, SCENARIOS, type Scenario } from "@/lib/growth/xGrowth/weeklyFixtures";
import { buildWeeklyReport } from "@/lib/growth/xGrowth/weeklyReport";

const exp = parseExperiment(JSON.parse(readFileSync("test/fixtures/xGrowth/experiment.json", "utf8")));
function report(s: Scenario, extra: Partial<Parameters<typeof buildWeeklyReport>[0]> = {}) {
  const d = scenarioData(s, exp);
  return buildWeeklyReport({ now: d.now, periodStart: new Date(d.now.getTime() - 7 * 86400000), periodEnd: d.now, experiments: d.experiments, rows: d.rows, ...extra });
}

describe("weekly classification on synthetic scenarios (rules only)", () => {
  it.each([
    ["realistic", "insufficient_data", "repeat"], ["incomplete", "insufficient_data", "continue"], ["biased", "biased", "repeat"],
    ["outlier", "no_clear_difference", "replace"], ["lead", "exploratory_lead", "repeat"], ["high_missing", "data_quality_issue", "pause"],
  ] as const)("%s → %s / %s", (s, status, action) => {
    const e = report(s).data.experiments[0];
    expect(e.status).toBe(status);
    expect(e.action).toBe(action);
  });
  it("never names a leader unless the rules found one; a single strong experiment is only exploratory", () => {
    for (const s of SCENARIOS) for (const e of report(s).data.experiments) {
      if (e.status !== "exploratory_lead" && e.status !== "validated_lead") expect(e.effect.leader).toBeNull();
      expect(e.action).not.toBe("propose_adoption");
    }
    const md = report("lead").markdown;
    expect(md).toContain("探索的な傾向あり（未確定・再現の確認が必要）");
    expect(md).not.toMatch(/勝者|確定した|有意/);
  });
  it("a replicated lead (same hypothesis, same direction) becomes validated and is only PROPOSED for adoption", () => {
    const e = report("lead", { history: [{ hypothesisKey: exp.hypothesisKey, status: "exploratory_lead", leaderStyle: "question_first", otherStyle: "definition_first", periodEnd: "2026-10-01T00:00:00Z" }] }).data.experiments[0];
    expect(e).toMatchObject({ status: "validated_lead", action: "propose_adoption", dbDecision: "propose_change" });
    const opposite = report("lead", { history: [{ hypothesisKey: exp.hypothesisKey, status: "exploratory_lead", leaderStyle: "definition_first", otherStyle: "question_first", periodEnd: "2026-10-01T00:00:00Z" }] }).data.experiments[0];
    expect(opposite.status).toBe("exploratory_lead");
  });
  it("an extreme outlier cannot create a lead (medians/log scale); it is counted and reported", () => {
    const d = scenarioData("outlier", exp);
    const e = analyzeExperiment(exp, d.rows, d.now);
    expect(e.status).toBe("no_clear_difference");
    expect(e.arms[1].impressions72h.max).toBe(5000);
    expect(e.arms[1].impressions72h.outliers).toBeGreaterThanOrEqual(1);
    expect(e.arms[1].impressions72h.mean!).toBeGreaterThan(e.arms[1].impressions72h.median! * 5); // the mean would mislead; the rule does not use it
  });
  it("empty data: renders safely, no experiments, exploration hypotheses only", () => {
    const r = report("empty");
    expect(r.data.experiments).toEqual([]);
    expect(r.data.reliability.successRate).toBeNull();
    expect(r.data.hypotheses.every(h => h.kind === "explore")).toBe(true);
    expect(r.markdown).toContain("実験はまだ動いていません");
    expect(r.markdown).toContain("対象期間の投稿データがありません");
  });
  it("is deterministic (seeded bootstrap)", () => { expect(report("realistic")).toEqual(report("realistic")); });
});

describe("zeros vs missing", () => {
  it("a real 0 is a valid observation; a missing value is excluded and counted as missing", () => {
    expect(dist([0, 0, 5])).toMatchObject({ n: 3, zeros: 2, median: 0 });
    const d = scenarioData("lead", exp);
    const rows: AnalysisRow[] = d.rows.map((r, i) => i === 0 ? { ...r, s72: { ...r.s72!, impressions: 0 } } : i === 1 ? { ...r, s72: { status: "unavailable", impressions: null, likes: null, reposts: null, replies: null, quotes: null, bookmarks: null, ageHours: null } } : r);
    const e = analyzeExperiment(exp, rows, d.now);
    const arm0 = e.arms.find(a => a.variantId === d.rows[0].variantId)!, arm1 = e.arms.find(a => a.variantId === d.rows[1].variantId)!;
    expect(arm0.impressions72h.zeros).toBe(1);
    expect(arm1.missing).toBe(1);
    expect(arm1.missingReasons).toEqual({ unavailable: 1 });
  });
  it("posts whose 72h window is still open are pending, not missing", () => {
    const d = scenarioData("incomplete", exp);
    const e = analyzeExperiment(exp, d.rows, d.now);
    expect(e.arms[0].pending + e.arms[1].pending).toBeGreaterThan(0);
  });
});

describe("hypotheses", () => {
  const results = (s: Scenario) => report(s).data.experiments;
  it("at most three, with an exploration slot kept when an untested style exists", () => {
    for (const s of SCENARIOS) {
      const h = report(s).data.hypotheses;
      expect(h.length).toBeLessThanOrEqual(3);
      expect(h.some(x => x.kind === "explore")).toBe(true);
    }
  });
  it("does not re-propose an idea that had no effect within 180 days, unless a data problem justifies it", () => {
    const now = new Date("2027-01-05T00:00:00Z");
    const skipped = generateHypotheses(results("lead"), [], [{ key: "style_mini_quiz_vs_definition_first", outcome: "no_effect", decidedAt: "2026-12-01T00:00:00Z" }], now);
    expect(skipped.map(h => h.key)).not.toContain("style_mini_quiz_vs_definition_first");
    const rerun = generateHypotheses(results("biased"), [], [{ key: "hook_question_vs_definition_rerun", outcome: "no_effect", decidedAt: "2026-12-01T00:00:00Z" }], now);
    expect(rerun.find(h => h.key === "hook_question_vs_definition_rerun")?.justification).toMatch(/publish_time_gap/);
  });
  it("proposals are proposals: every one carries a two-arm plan or none, never an activation", () => {
    for (const h of report("lead").data.hypotheses) if (h.proposedExperiment) expect(h.proposedExperiment.variants).toHaveLength(2);
  });
});

describe("AI interpretation guard", () => {
  const r = report("lead");
  it("accepts prose that only uses computed numbers and stays tentative", () => {
    expect(guardAiText("問いかけ型の中央値は26.5で、定義型の9.5より高い傾向です。1回の実験なので再現の確認が必要です。", r)).toEqual({ text: expect.any(String), rejected: null });
  });
  it("rejects invented numbers, overclaims, and provider failures", async () => {
    expect(guardAiText("表示回数が45%増えました。", r).rejected).toBe("ai_text_has_unverified_numbers");
    expect(guardAiText("問いかけ型が勝者です。", r).rejected).toBe("ai_text_overclaims");
    expect((await interpret(r, async () => { throw new Error("down"); })).rejected).toBe("ai_request_failed");
  });
});

describe("weekly period", () => {
  it("covers the 7 JST days ending at the latest Monday 00:00 JST", () => {
    const p = weeklyPeriod(new Date("2026-12-09T03:00:00Z")); // Wed 2026-12-09 12:00 JST
    expect(p).toEqual({ start: new Date("2026-11-29T15:00:00Z"), end: new Date("2026-12-06T15:00:00Z") }); // Mon 11/30 00:00 → Mon 12/7 00:00 JST
    expect(weeklyPeriod(new Date("2026-12-06T15:00:00Z"))).toEqual(p); // exactly Monday 00:00 JST
  });
});

describe("persistence (PGlite, real migrations)", () => {
  let db: PGlite; let store: GrowthStore;
  beforeEach(async () => {
    db = await createFixtureDatabase(process.cwd()); store = new GrowthStore(pgliteRpc(db));
    const e = JSON.parse(readFileSync("test/fixtures/xGrowth/experiment.json", "utf8"));
    await db.query(`insert into public.x_growth_experiments(id, name, hypothesis, status, start_at, end_at, variants, allocation_seed, hypothesis_key, config) values ($1::uuid, $2, $3, 'completed', $4::timestamptz, $5::timestamptz, $6::jsonb, $7, $8, $9::jsonb)`,
      [e.id, e.name, e.hypothesis, e.start_at, e.end_at, JSON.stringify(e.variants), e.allocation_seed, e.hypothesis_key, JSON.stringify(e.config)]);
  }, 30000);
  afterEach(async () => { await db.close(); });
  it("saves a weekly review idempotently: the second save creates nothing and changes nothing", async () => {
    const r = report("lead");
    const first = await store.save(r);
    expect(first.summary.created).toBe(true);
    expect(first.experiments[0].created).toBe(true);
    const second = await store.save({ ...r, markdown: "changed" });
    expect(second.summary).toEqual({ reviewId: first.summary.reviewId, created: false });
    expect((await db.query("select count(*)::int as n from public.x_growth_reviews")).rows).toEqual([{ n: 2 }]);
    expect((await db.query("select count(*)::int as n from public.x_growth_hypotheses")).rows).toEqual([{ n: r.data.hypotheses.length }]);
    expect((await db.query<{ status: string }>("select status from public.x_growth_hypotheses")).rows.every(x => x.status === "proposed")).toBe(true);
    expect((await db.query<{ m: string }>("select report->>'markdown' as m from public.x_growth_reviews where experiment_id is null")).rows[0].m).not.toBe("changed");
  });
  it("stores decisions/actions and history; an ended experiment sets the outcome of its open hypothesis", async () => {
    // Week 1 proposes the hypothesis that the fixture experiment later tests.
    await db.query("insert into public.x_growth_reviews(id, period_start, period_end, report, decision) values ('11111111-1111-4111-8111-111111111111', '2026-11-16T15:00:00Z', '2026-11-23T15:00:00Z', '{}', 'continue')");
    await db.query("insert into public.x_growth_hypotheses(hypothesis_key, kind, statement, rationale, source_review_id) values ('hook_question_vs_definition', 'explore', 's', 'r', '11111111-1111-4111-8111-111111111111')");
    const r = report("outlier"); // ended, no_clear_difference
    await store.save(r);
    expect((await db.query("select decision, action from public.x_growth_reviews where experiment_id is not null")).rows).toEqual([{ decision: "inconclusive", action: "replace" }]);
    expect((await store.outcomes(new Date("2026-01-01"))).map(o => [o.key, o.outcome])).toEqual([["hook_question_vs_definition", "no_effect"]]);
    expect((await store.history(new Date("2026-01-01")))[0]).toMatchObject({ hypothesisKey: "hook_question_vs_definition", status: "no_clear_difference" });
  });
  it("rejects more than three hypotheses at the database too", async () => {
    const r = report("lead");
    await expect(store.save({ ...r, data: { ...r.data, hypotheses: [...r.data.hypotheses, ...r.data.hypotheses] } })).rejects.toThrow();
  });
});

describe("weekly CLI", () => {
  const env = { NODE_ENV: "test" as const, PATH: process.env.PATH, HOME: process.env.HOME };
  const run = (args: string[], extra: Record<string, string> = {}) => spawnSync(process.execPath, ["--experimental-strip-types", "scripts/x-growth/run.mjs", "weekly", ...args], { env: { ...env, ...extra }, encoding: "utf8" });
  it("is disabled by default (no DB, no AI)", () => {
    const r = run([]);
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({ state: "disabled" });
  });
  it("renders every scenario offline; the fake-AI path is guarded", () => {
    for (const s of SCENARIOS) { const r = run(["--fixture", "--scenario", s]); expect(r.status, `${s}: ${r.stderr}`).toBe(0); }
    expect(JSON.parse(run(["--fixture", "--scenario", "lead", "--fake-ai", "120%改善しました"]).stdout).aiRejected).toBe("ai_text_has_unverified_numbers");
  });
});
