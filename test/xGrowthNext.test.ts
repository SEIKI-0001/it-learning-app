import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeExperiment } from "@/lib/growth/xGrowth/analysis";
import { planNextDraft } from "@/lib/growth/xGrowth/drafts";
import { assignVariant, buildExperimentPost, parseExperiment, slotMatchesAssignedTime, validateExperimentPost, type Experiment } from "@/lib/growth/xGrowth/experiment";
import { createFixtureDatabase, pgliteRpc } from "@/lib/growth/xGrowth/fixtureDb";
import { generateHypotheses, type Hypothesis } from "@/lib/growth/xGrowth/hypotheses";
import { previewExperiment } from "@/lib/growth/xGrowth/preview";
import { getStyle } from "@/lib/growth/xGrowth/styles";
import { acronymFacts, factBlock } from "@/lib/growth/xGrowth/topics";
import { GrowthStore, runWeekly } from "@/lib/growth/xGrowth/weekly";
import { scenarioData } from "@/lib/growth/xGrowth/weeklyFixtures";
import { buildWeeklyReport } from "@/lib/growth/xGrowth/weeklyReport";
import { themeForSlot } from "@/lib/growth/xPosting/core";
import { runPosting, type Dependencies, type PostRow, type Store } from "@/lib/growth/xPosting/runner";

const raw = JSON.parse(readFileSync("test/fixtures/xGrowth/experiment.json", "utf8"));
const live = { allowDraftLibrary: false };
const exp = (variants: object[], extra: Record<string, unknown> = {}) => parseExperiment({ ...raw, variants, ...extra });
const slotOf = (d: number, hhmm = "07:00") => { const [h, m] = hhmm.split(":").map(Number); return new Date(Date.parse(raw.start_at) + d * 86400000 + (h * 60 + m) * 60000).toISOString(); };
const linkCtx = { ...live, origin: "https://shikaku-mochit.com", utmContent: "x-abc" };

describe("new content styles keep approved facts verbatim", () => {
  it("word_parts / true_false / keyword_hint use only glossary strings", () => {
    let n = 0;
    for (const f of acronymFacts()) {
      if (getStyle("word_parts").supports(f, live)) for (const t of getStyle("word_parts").render(f, live)) { n++; expect(t).toContain(factBlock(f)); for (const w of f.words) expect(t).toContain(`${w.word}（${w.meaning}）`); }
      if (getStyle("true_false").supports(f, live)) getStyle("true_false").render(f, live).forEach((t, i) => { n++; const c = f.confusions[i]; expect(t).toContain(`「${f.acronym}は${c.japanese}のこと」`); expect(c.japanese).not.toBe(f.japanese); expect(t).toContain("答え：×"); expect(t).toContain(c.trap); expect(t).toContain(factBlock(f)); });
      if (getStyle("keyword_hint").supports(f, live)) for (const t of getStyle("keyword_hint").render(f, live)) { n++; expect(t).toContain(`押さえたいキーワード：${f.examKeywords.slice(0, 3).join("・")}`); expect(t).toContain(factBlock(f)); }
    }
    expect(n).toBeGreaterThan(400);
  });
  it.each(["word_parts", "true_false", "keyword_hint"])("definition_first vs %s: 28 balanced, valid candidates offline", style => {
    const e = exp([{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: style }]);
    const ok = previewExperiment(e, 28, live).filter(r => r.state === "candidate");
    expect(ok).toHaveLength(28);
    expect(ok.filter(r => r.variantId === "A")).toHaveLength(14);
    expect(new Set(ok.map(r => r.meta!.topicId)).size).toBe(28);
  });
});

describe("one factor at a time", () => {
  it("accepts exactly one differing factor (style, link or time) and rejects the rest", () => {
    expect(() => exp([{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "definition_first", withLink: true }])).not.toThrow();
    expect(() => exp([{ id: "A", contentStyle: "definition_first", postTimeJst: "07:00" }, { id: "B", contentStyle: "definition_first", postTimeJst: "19:00" }])).not.toThrow();
    for (const bad of [
      [{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "definition_first" }],
      [{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "question_first", withLink: true }],
      [{ id: "A", contentStyle: "definition_first", postTimeJst: "07:00" }, { id: "B", contentStyle: "question_first", postTimeJst: "19:00" }],
      [{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "definition_first", postTimeJst: "19:00" }],
      [{ id: "A", contentStyle: "definition_first", postTimeJst: "7:00" }, { id: "B", contentStyle: "definition_first", postTimeJst: "19:00" }],
      [{ id: "A", contentStyle: "definition_first", withLink: "yes" }, { id: "B", contentStyle: "definition_first", withLink: true }],
    ]) expect(() => exp(bad)).toThrow();
  });
});

describe("link experiments", () => {
  const e = exp([{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "definition_first", withLink: true }]);
  const dB = Array.from({ length: 14 }, (_, i) => i).find(i => assignVariant(e, slotOf(i))!.variant.id === "B")!;
  const dA = Array.from({ length: 14 }, (_, i) => i).find(i => assignVariant(e, slotOf(i))!.variant.id === "A")!;
  it("the link arm adds the topic's own glossary page with UTM, right before the hashtag; the other arm has none", () => {
    const b = buildExperimentPost(e, slotOf(dB), themeForSlot(slotOf(dB)), [], linkCtx);
    const id = b.experiment.topicId.split(":")[1];
    expect(b.destinationUrl).toBe(`https://shikaku-mochit.com/words/${id}?utm_source=x&utm_medium=social&utm_campaign=organic_x&utm_content=x-abc&ref=x-abc`);
    expect(b.text.endsWith(`\n${b.destinationUrl}\n#ITパスポート`)).toBe(true);
    expect(validateExperimentPost(b, e, slotOf(dB), themeForSlot(slotOf(dB)), [], linkCtx).destinationUrl).toBe(b.destinationUrl);
    const a = buildExperimentPost(e, slotOf(dA), themeForSlot(slotOf(dA)), [], linkCtx);
    expect(a.destinationUrl).toBeNull();
    expect(a.text).not.toMatch(/https?:\/\//);
  });
  it("rejects a different link, a missing link, extra links, and missing link context", () => {
    const b = buildExperimentPost(e, slotOf(dB), themeForSlot(slotOf(dB)), [], linkCtx);
    const v = (x: object) => () => validateExperimentPost({ ...b, ...x }, e, slotOf(dB), themeForSlot(slotOf(dB)), [], linkCtx);
    expect(v({ destinationUrl: "https://evil.test/" })).toThrow();
    expect(v({ text: b.text.replace(`\n${b.destinationUrl}`, ""), destinationUrl: null })).toThrow();
    expect(v({ text: b.text.replace("#ITパスポート", "https://evil.test\n#ITパスポート") })).toThrow();
    expect(() => buildExperimentPost(e, slotOf(dB), themeForSlot(slotOf(dB)), [], live)).toThrow("experiment_link_context_missing");
  });
  it("runner: the link arm goes through the destination check and posts the exact text with the link", async () => {
    const row: PostRow = { id: "row", utm_content: "x-row", status: "draft" };
    const store: Store = { claim: async () => row, history: async () => [], prepare: async () => true, begin: async () => true, finish: async () => true, fail: vi.fn(), tagExperiment: async () => true };
    const checkDestination = vi.fn<(url: string) => Promise<void>>(async () => {}); const publish = vi.fn<(text: string) => Promise<{ state: "published"; id: string }>>(async () => ({ state: "published", id: "1" }));
    const deps: Dependencies = { store, sources: () => [], generate: vi.fn(), publish, verifyIdentity: async () => {}, checkDestination, experiment: { active: async () => e, ctx: live, linkAllowed: async () => true } };
    const r = await runPosting({ enabled: true, dryRun: false, fixture: false, account: "1", origin: "https://shikaku-mochit.com", slot: slotOf(dB), dailyLimit: 1, monthlyLimit: 31, model: "m" }, deps);
    expect(r.state).toBe("published");
    const url = checkDestination.mock.calls[0][0];
    expect(url).toMatch(/^https:\/\/shikaku-mochit\.com\/words\/[a-z0-9-]+\?utm_source=x&.*utm_content=x-row/);
    expect(publish.mock.calls[0][0]).toContain(url);
  });
});

describe("link spend cap", () => {
  const e = exp([{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "definition_first", withLink: true }]);
  const dB = Array.from({ length: 14 }, (_, i) => i).find(i => assignVariant(e, slotOf(i))!.variant.id === "B")!;
  it.each([["over the monthly cap", async () => false], ["no cap configured", undefined]] as const)("link arm falls back to the normal (link-free) pipeline when %s, not counted as a sample", async (_label, linkAllowed) => {
    const row: PostRow = { id: "row", utm_content: "x-row", status: "draft" };
    const tag = vi.fn(async () => true);
    const store: Store = { claim: async () => row, history: async () => [], prepare: async (_i, g) => { row.generation = g; return true; }, begin: async () => true, finish: async () => true, fail: vi.fn(), tagExperiment: tag };
    const generate = vi.fn<Dependencies["generate"]>(async (sources, _h, theme) => ({ text: `知っていますか？\n${sources[0].text}\n#ITパスポート`, theme, contentId: sources[0].id, destinationUrl: null, evidence: [sources[0].evidence], quality: { passed: true, reasons: [] } }));
    const f = acronymFacts()[0];
    const deps: Dependencies = { store, sources: () => [{ id: `terms-${f.id}`, theme: "terms", text: factBlock(f), evidence: "e", path: "/words", rights: "app_original" }], generate, publish: vi.fn(), verifyIdentity: async () => {}, checkDestination: async () => {}, experiment: { active: async () => e, ctx: live, ...(linkAllowed ? { linkAllowed } : {}) } };
    const r = await runPosting({ enabled: true, dryRun: true, fixture: false, account: "1", origin: "https://x.test", slot: slotOf(dB), dailyLimit: 1, monthlyLimit: 31, model: "m" }, deps);
    expect(r).toMatchObject({ state: "ready", experimentFallback: "link_budget_exceeded" });
    expect(tag).not.toHaveBeenCalled();
    expect(row.generation!.destinationUrl).toBeNull();
  });
});

describe("posting-time experiments", () => {
  const e = exp([{ id: "A", contentStyle: "definition_first", postTimeJst: "07:00" }, { id: "B", contentStyle: "definition_first", postTimeJst: "19:00" }]);
  const day = Array.from({ length: 14 }, (_, i) => i).find(i => assignVariant(e, slotOf(i))!.variant.id === "B")!;
  it("only the assigned arm's slot time matches", () => {
    expect(slotMatchesAssignedTime(e, slotOf(day, "07:00"), themeForSlot(slotOf(day)))).toBe(false);
    expect(slotMatchesAssignedTime(e, slotOf(day, "19:00"), themeForSlot(slotOf(day)))).toBe(true);
    const ineligible = exp(e.variants, { config: { eligibleThemes: ["service"] } });
    expect(slotMatchesAssignedTime(ineligible, slotOf(day, "07:00"), themeForSlot(slotOf(day)))).toBe(true);
  });
  it("runner skips the other slot BEFORE claiming (the day stays free for the assigned time)", async () => {
    const claim = vi.fn(async () => ({ id: "row", utm_content: "x-row", status: "draft" }));
    const store: Store = { claim, history: async () => [], prepare: async () => true, begin: async () => true, finish: async () => true, fail: vi.fn(), tagExperiment: async () => true };
    const deps: Dependencies = { store, sources: () => [], generate: vi.fn(), publish: vi.fn(async () => ({ state: "published" as const, id: "1" })), verifyIdentity: async () => {}, checkDestination: async () => {}, experiment: { active: async () => e, ctx: live } };
    const base = { enabled: true, dryRun: false, fixture: false, account: "1", origin: "https://x.test", dailyLimit: 1, monthlyLimit: 31, model: "m" };
    expect(await runPosting({ ...base, slot: slotOf(day, "07:00") }, deps)).toEqual({ state: "skipped", error: "experiment_other_time_slot" });
    expect(claim).not.toHaveBeenCalled();
    expect((await runPosting({ ...base, slot: slotOf(day, "19:00") }, deps)).state).toBe("published");
  });
  it("the time gap is the treatment, not a bias flag", () => {
    const d = scenarioData("biased", parseExperiment(raw));
    const r = analyzeExperiment(e, d.rows.map(x => ({ ...x, experimentId: e.id })), d.now);
    expect(r.factor).toBe("postTime");
    expect(r.biasFlags).not.toContain("publish_time_gap");
  });
});

describe("hypotheses beyond wording", () => {
  it("new styles are explored first; link and time proposals follow once styles are covered", () => {
    const now = new Date("2027-03-01T00:00:00Z");
    expect(generateHypotheses([], [], [], now).map(h => h.key)).toEqual(["style_question_first_vs_definition_first", "style_mini_quiz_vs_definition_first", "style_misconception_vs_definition_first"]);
    const all = ["question_first", "mini_quiz", "misconception", "true_false", "word_parts", "keyword_hint"].map(b => ({ a: "definition_first", b }));
    const next = generateHypotheses([], all, [], now);
    expect(next.map(h => h.key)).toEqual(["link_vs_no_link", "post_time_1900_vs_0700"]);
    expect(next[0].proposedExperiment!.variants[1]).toEqual({ id: "B", contentStyle: "definition_first", withLink: true });
    expect(next[0].rationale).toContain("$0.20");
  });
});

describe("auto-drafting the next experiment", () => {
  const hyps = (now: Date): Hypothesis[] => generateHypotheses([], [], [], now);
  const now = new Date("2026-12-02T03:00:00Z"); // Wed
  it("plans an 8-week style experiment from the next Monday, validated offline", () => {
    const d = planNextDraft(hyps(now), [], now);
    expect(d.reason).toBe("planned");
    expect(d.plan).toMatchObject({ hypothesisKey: "style_question_first_vs_definition_first", startAt: "2026-12-06T15:00:00.000Z", endAt: "2027-01-31T15:00:00.000Z", config: { eligibleThemes: ["question", "terms", "trick", "challenge"] } });
    expect(d.plan!.previewCandidates).toBeGreaterThanOrEqual(28);
  });
  it("starts after the running experiment and refuses while a draft is waiting or the current one runs > 14 days", () => {
    const running = { ...parseExperiment(raw), status: "running" as const, endAt: "2026-12-10T15:00:00.000Z" };
    const d = planNextDraft(hyps(now).filter(h => h.key !== "style_question_first_vs_definition_first"), [running], now);
    expect(d.plan!.startAt).toBe("2026-12-13T15:00:00.000Z"); // Monday after 12-11 00:00 JST
    expect(planNextDraft(hyps(now), [{ ...running, endAt: "2027-01-31T15:00:00.000Z" }], now).reason).toBe("current_experiment_not_ending_soon");
    expect(planNextDraft(hyps(now), [{ ...running, status: "draft" }], now).reason).toBe("draft_already_waiting");
    expect(planNextDraft(hyps(now).filter(h => h.key.startsWith("link") || h.key.startsWith("post_time")), [], now).reason).toBe("no_style_hypothesis");
    expect(() => planNextDraft(hyps(now), [], now, 7)).toThrow("draft_weeks_must_be_even");
  });
  it("link comparisons are drafted only after the link cost was approved; time comparisons never", () => {
    const all = ["question_first", "mini_quiz", "misconception", "true_false", "word_parts", "keyword_hint"].map(b => ({ a: "definition_first", b }));
    const next = generateHypotheses([], all, [], now);
    expect(planNextDraft(next, [], now).reason).toBe("no_style_hypothesis");
    const d = planNextDraft(next, [], now, 8, { allowLinkDrafts: true });
    expect(d.plan).toMatchObject({ hypothesisKey: "link_vs_no_link", variants: [{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "definition_first", withLink: true }] });
    expect(d.plan!.name).toContain("リンクあり");
    expect(planNextDraft(next.filter(h => h.key.startsWith("post_time")), [], now, 8, { allowLinkDrafts: true }).reason).toBe("no_style_hypothesis");
  });
});

describe("drafts, approval and pause in the database (PGlite)", () => {
  let db: PGlite; let store: GrowthStore;
  beforeEach(async () => { db = await createFixtureDatabase(process.cwd()); store = new GrowthStore(pgliteRpc(db)); await db.exec("insert into public.x_posting_accounts values ('1')"); }, 30000);
  afterEach(async () => { await db.close(); });
  it("weekly auto-draft creates one draft (idempotent), never running; approve switches it on; pause stops it", async () => {
    const now = new Date("2026-12-02T03:00:00Z");
    const first = await runWeekly(store, { account: "1", now, save: true, autoDraft: true });
    expect(first.report.data.draft).toMatchObject({ reason: "planned", created: true });
    const id = first.report.data.draft!.experimentId!;
    expect(first.report.markdown).toContain("まだ投稿には使われません");
    const second = await runWeekly(store, { account: "1", now, save: true, autoDraft: true });
    expect(second.report.data.draft!.reason).toBe("draft_already_waiting");
    expect((await db.query("select status, created_by from public.x_growth_experiments")).rows).toEqual([{ status: "draft", created_by: "auto_draft" }]);
    expect((await db.query("select count(*)::int n from public.active_x_experiment('2026-12-08T22:00:00Z')")).rows).toEqual([{ n: 0 }]);
    expect(await store.approve(id)).toMatchObject({ result: "running" });
    expect((await db.query("select count(*)::int n from public.active_x_experiment('2026-12-08T22:00:00Z')")).rows).toEqual([{ n: 1 }]);
    expect((await store.approve(id)).result).toBe("not_draft");
    expect(await store.pause(id)).toBe("paused");
    expect(await store.pause(id)).toBe("not_running");
  });
  it("auto-draft is off unless asked; approval refuses a second running experiment and drafts that fail the content check", async () => {
    const now = new Date("2026-12-02T03:00:00Z");
    expect((await runWeekly(store, { account: "1", now, save: true })).report.data.draft).toMatchObject({ reason: "planned", created: null, experimentId: null });
    expect((await db.query("select count(*)::int n from public.x_growth_experiments")).rows).toEqual([{ n: 0 }]);
    const mk = async (key: string, variants: object, start = "2026-12-06T15:00:00Z") => String((await db.query<{ experiment_id: string }>("select experiment_id from public.create_x_experiment_draft('n', 'h', $1, $2::timestamptz, '2027-01-31T15:00:00Z', 14, $3::jsonb, 'seed', '{\"eligibleThemes\":[\"question\",\"terms\",\"trick\",\"challenge\"]}'::jsonb)", [key, start, JSON.stringify(variants)])).rows[0].experiment_id);
    const a = await mk("k_a", [{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "question_first" }]);
    const b = await mk("k_b", [{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "mini_quiz" }]);
    const c = await mk("k_c", [{ id: "A", contentStyle: "definition_first" }, { id: "B", contentStyle: "analogy" }]);
    expect((await store.approve(a)).result).toBe("running");
    expect((await store.approve(b)).result).toBe("another_running");
    expect((await store.approve(c)).result).toBe("not_enough_valid_candidates"); // draft analogies are not approved
  });
});

describe("weekly report shows the next draft", () => {
  it("renders the plan with the approval instruction", () => {
    const d = scenarioData("lead", parseExperiment(raw));
    const r = buildWeeklyReport({ now: d.now, periodStart: new Date(d.now.getTime() - 7 * 86400000), periodEnd: d.now, experiments: d.experiments, rows: d.rows });
    expect(r.data.hypotheses.length).toBeLessThanOrEqual(3);
    const e: Experiment = parseExperiment(raw);
    expect(planNextDraft(r.data.hypotheses, [{ ...e, status: "completed" }], d.now).reason).toBe("planned");
  });
});

describe("workflows", () => {
  const approve = readFileSync(".github/workflows/x-growth-approve.yml", "utf8");
  const weekly = readFileSync(".github/workflows/x-growth-weekly.yml", "utf8");
  it("approval is manual-only, main-only, no X credentials, inputs passed via env", () => {
    expect(approve).not.toMatch(/schedule:|cron:/);
    expect(approve).toContain("if: github.ref == 'refs/heads/main'");
    expect(approve).not.toMatch(/X_API_KEY|X_ACCESS_TOKEN|ANTHROPIC/);
    expect(approve).not.toMatch(/run:[^\n]*\$\{\{/);
    expect(approve).toContain("permissions:\n  contents: read");
  });
  it("auto-draft, link drafts and link spending default to off", () => {
    expect(weekly).toContain("X_GROWTH_AUTO_DRAFT: ${{ vars.X_GROWTH_AUTO_DRAFT || 'false' }}");
    expect(weekly).toContain("X_GROWTH_LINK_COST_APPROVED: ${{ vars.X_GROWTH_LINK_COST_APPROVED || 'false' }}");
    expect(readFileSync(".github/workflows/x-organic-post.yml", "utf8")).toContain("X_GROWTH_LINK_MONTHLY_USD_LIMIT: ${{ vars.X_GROWTH_LINK_MONTHLY_USD_LIMIT || '0' }}");
  });
});
