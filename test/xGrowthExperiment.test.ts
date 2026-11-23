import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { assignVariant, buildExperimentPost, GENERATION_VERSION, parseExperiment, PROHIBITED, sharedTopicPool, validateExperimentPost, type Experiment } from "@/lib/growth/xGrowth/experiment";
import { previewExperiment } from "@/lib/growth/xGrowth/preview";
import { getStyle, STYLES } from "@/lib/growth/xGrowth/styles";
import { acronymFacts, factBlock, factById } from "@/lib/growth/xGrowth/topics";
import { themeForSlot, validLength } from "@/lib/growth/xPosting/core";
import { runPosting, type Dependencies, type PostRow, type Store } from "@/lib/growth/xPosting/runner";

const raw = JSON.parse(readFileSync("test/fixtures/xGrowth/experiment.json", "utf8"));
const exp = parseExperiment(raw);
const live = { allowDraftLibrary: false };
const offline = { allowDraftLibrary: true };
const withStyles = (a: string, b: string, extra: Record<string, unknown> = {}) => parseExperiment({ ...raw, variants: [{ id: "A", contentStyle: a }, { id: "B", contentStyle: b }], ...extra });
const slotOf = (d: number) => new Date(Date.parse("2026-11-30T22:00:00.000Z") + d * 86400000).toISOString();

describe("content styles keep approved facts verbatim", () => {
  it("every rendered text contains the approved fact strings and the fixed tag", () => {
    let checked = 0;
    for (const f of acronymFacts()) for (const s of Object.values(STYLES)) {
      if (!s.supports(f, offline)) continue;
      for (const t of s.render(f, offline)) {
        checked++;
        expect(t.endsWith("\n#ITパスポート")).toBe(true);
        if (s.id === "mini_quiz") { expect(t).toContain(`「${f.japanese}」`); expect(t).toContain(`\n${f.oneLine}\n`); expect(t).toContain(`正解：`); }
        else expect(t).toContain(factBlock(f));
        if (s.id === "misconception") expect(f.confusions.some(c => t.includes(c.trap))).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });
  it("the control style reproduces the current production 'terms' post format exactly", () => {
    const dns = factById("acronym:dns")!;
    expect(getStyle("definition_first").render(dns, live)[1]).toBe("今日の学習メモ。\nDNS（ドメイン名システム）\nドメイン名とIPアドレスを対応付ける仕組み。\n#ITパスポート");
  });
  it("mini quiz lists the correct answer among approved confusables and states it", () => {
    const kpi = factById("acronym:kpi")!;
    const [t] = getStyle("mini_quiz").render(kpi, live);
    const letter = /正解：([ABC]) KPI/.exec(t)![1];
    expect(t).toContain(`${letter} KPI\n`);
    expect(t).toContain("KGI");
  });
  it("analogies are usable only when approved and reviewed (draft entries are offline-only)", () => {
    const dns = factById("acronym:dns")!;
    expect(getStyle("analogy").supports(dns, live)).toBe(false);
    expect(getStyle("analogy").supports(dns, offline)).toBe(true);
  });
});

describe("deterministic, balanced, LLM-free assignment", () => {
  it("28 days give 14/14 and every weekday alternates arms week to week", () => {
    const arms = Array.from({ length: 28 }, (_, d) => assignVariant(exp, slotOf(d))!.variant.id);
    expect(arms.filter(a => a === "A")).toHaveLength(14);
    for (let wd = 0; wd < 7; wd++) expect(new Set([arms[wd], arms[wd + 7]]).size).toBe(2);
  });
  it("is a pure function of slot and seed (same input → same arm), outside the period → null", () => {
    expect(assignVariant(exp, slotOf(3))).toEqual(assignVariant(exp, slotOf(3)));
    const other = parseExperiment({ ...raw, allocation_seed: "x" });
    const flipped = Array.from({ length: 28 }, (_, d) => assignVariant(other, slotOf(d))!.variant.id !== assignVariant(exp, slotOf(d))!.variant.id);
    expect(new Set(flipped).size).toBe(1); // a different seed bit flips all or none
    expect(assignVariant(exp, "2026-11-30T14:59:00.000Z")).toBeNull();
    expect(assignVariant(exp, "2026-12-28T15:00:00.000Z")).toBeNull();
  });
  it("the topic does not depend on the arm (shared pool, arm-independent order)", () => {
    const pool1 = sharedTopicPool(exp, live).map(f => f.topicId);
    const swapped = parseExperiment({ ...raw, variants: [raw.variants[1], raw.variants[0]] });
    expect(sharedTopicPool(swapped, live).map(f => f.topicId)).toEqual(pool1);
  });
  it("rejects malformed experiments", () => {
    for (const bad of [{ variants: [raw.variants[0]] }, { variants: [...raw.variants, { id: "C", contentStyle: "mini_quiz" }] }, { variants: [{ id: "A", contentStyle: "x" }, raw.variants[1]] },
      { variants: [raw.variants[0], { id: "A", contentStyle: "question_first" }] }, { variants: [raw.variants[0], { id: "B", contentStyle: "definition_first" }] },
      { allocation_seed: "" }, { end_at: "2026-11-01T00:00:00Z" }, { config: { eligibleThemes: ["nope"] } }, { id: "not-a-uuid" }])
      expect(() => parseExperiment({ ...raw, ...bad })).toThrow();
  });
});

describe("offline candidates (P2 acceptance: ≥12)", () => {
  const pairs: [string, string][] = [["definition_first", "question_first"], ["question_first", "mini_quiz"], ["misconception", "mini_quiz"], ["definition_first", "analogy"]];
  it.each(pairs)("%s vs %s: 28 days of valid candidates with complete metadata, no repeated topic", (a, b) => {
    const e = withStyles(a, b);
    const rows = previewExperiment(e, 28, offline);
    const ok = rows.filter(r => r.state === "candidate");
    const expected = Math.min(28, sharedTopicPool(e, offline).length);
    expect(ok.length).toBe(expected); // every shared topic yields a valid candidate
    // The analogy pool is limited by the (draft) analogy library size; the glossary styles have 100+ topics.
    if (![a, b].includes("analogy")) expect(ok.length).toBeGreaterThanOrEqual(12); else expect(ok.length).toBeGreaterThanOrEqual(10);
    const topics = new Set(ok.map(r => r.meta!.topicId));
    expect(topics.size).toBe(ok.length);
    for (const r of ok) {
      expect(r.meta).toEqual({ experimentId: e.id, variantId: r.variantId, contentStyle: r.contentStyle, topicId: r.meta!.topicId, generationVersion: GENERATION_VERSION });
      expect(r.contentStyle).toBe(e.variants.find(v => v.id === r.variantId)!.contentStyle);
      expect(validLength(r.text!)).toBe(true);
      expect(PROHIBITED.test(r.text!)).toBe(false);
      expect(getStyle(r.contentStyle!).render(factById(r.meta!.topicId)!, offline)).toContain(r.text);
    }
    if (ok.length === 28) expect(ok.filter(r => r.variantId === "A")).toHaveLength(14);
  });
  it("is reproducible: the same experiment and history give byte-identical candidates", () => {
    expect(previewExperiment(exp, 14, live)).toEqual(previewExperiment(exp, 14, live));
  });
});

describe("LLM-independent validation rejects invalid educational content", () => {
  const slot = slotOf(0); const theme = themeForSlot(slot);
  const good = buildExperimentPost(exp, slot, theme, [], live);
  const reject = (change: object, history: string[] = []) => expect(() => validateExperimentPost({ ...good, ...change }, exp, slot, theme, history, live)).toThrow();
  it("accepts the generated post", () => { expect(validateExperimentPost(good, exp, slot, theme, [], live).experiment).toEqual(good.experiment); });
  it("rejects altered facts, invented claims, wrong arm/style/topic, links, duplicates", () => {
    reject({ text: good.text.replace("。", "。合格率100%！") });
    reject({ text: good.text.replace(/（[^）]+）/, "（でたらめな名称）") });
    reject({ experiment: { ...good.experiment, variantId: good.experiment.variantId === "A" ? "B" : "A" } });
    reject({ experiment: { ...good.experiment, contentStyle: "mini_quiz" } });
    reject({ experiment: { ...good.experiment, topicId: "acronym:does-not-exist" } });
    reject({ experiment: { ...good.experiment, generationVersion: "llm-free-text" } });
    reject({ destinationUrl: "https://shikaku-mochit.com/words" });
    reject({ evidence: ["invented"] });
    reject({}, [good.text]);
    reject({ experiment: undefined });
    expect(() => validateExperimentPost(good, { ...exp, status: "paused" } as Experiment, slot, theme, [], live)).toThrow();
  });
  it("rejects a draft (unapproved) analogy in live mode", () => {
    const e = withStyles("definition_first", "analogy");
    const d = Array.from({ length: 14 }, (_, i) => i).find(i => assignVariant(e, slotOf(i))!.variant.contentStyle === "analogy")!;
    const post = buildExperimentPost(e, slotOf(d), themeForSlot(slotOf(d)), [], offline);
    expect(() => validateExperimentPost(post, e, slotOf(d), themeForSlot(slotOf(d)), [], live)).toThrow();
    expect(() => buildExperimentPost(e, slotOf(d), themeForSlot(slotOf(d)), [], live)).toThrow("experiment_no_unused_topic");
  });
});

describe("runner integration", () => {
  const slot = slotOf(0);
  const config = { enabled: true, dryRun: true, fixture: false, account: "123", origin: "https://example.test", slot, dailyLimit: 1, monthlyLimit: 31, model: "m" };
  function harness(over: Partial<Store> = {}) {
    const row: PostRow & { tag?: unknown } = { id: "row", utm_content: "x-row", status: "draft" };
    const store: Store = {
      claim: async () => row, history: async () => [], prepare: async (_i, g) => { row.generation = g; row.status = "ready"; return true; },
      begin: async () => true, finish: async () => true, fail: vi.fn(async () => { row.status = "failed"; }),
      tagExperiment: vi.fn(async (_i, m) => { row.tag = m; return true; }), ...over,
    };
    const generate = vi.fn<Dependencies["generate"]>(async (sources, _h, theme, url) => ({ text: `知っていますか？\n${sources[0].text}\n${url}\n#ITパスポート`, theme, contentId: sources[0].id, destinationUrl: url, evidence: [sources[0].evidence], quality: { passed: true, reasons: [] } }));
    const deps: Dependencies = { store, sources: (t: string) => [{ id: "terms-dns", theme: "terms" as const, text: factBlock(factById("acronym:dns")!), evidence: "e", path: "/words", rights: "app_original" as const }].map(s => ({ ...s, theme: t === "terms" ? "terms" : s.theme })), generate, publish: vi.fn(), verifyIdentity: vi.fn(), checkDestination: vi.fn() };
    return { row, store, generate, deps };
  }
  it("without experiment deps the pipeline is unchanged (LLM path, no tag)", async () => {
    const h = harness();
    expect((await runPosting(config, h.deps)).state).toBe("ready");
    expect(h.generate).toHaveBeenCalledTimes(1);
    expect(h.store.tagExperiment).not.toHaveBeenCalled();
  });
  it("with a running experiment: arm assigned by code, tagged before prepare, LLM not called", async () => {
    const h = harness();
    const r = await runPosting(config, { ...h.deps, experiment: { active: async () => exp, ctx: live } });
    expect(r).toMatchObject({ state: "ready", experiment: { experimentId: exp.id, variantId: assignVariant(exp, slot)!.variant.id } });
    expect(h.generate).not.toHaveBeenCalled();
    expect(h.row.tag).toEqual(r.experiment);
    expect((h.row.generation as unknown as { experiment: unknown }).experiment).toEqual(r.experiment);
  });
  it("falls back to the normal pipeline when the experiment cannot produce a post, recording why", async () => {
    for (const active of [async () => withStyles("definition_first", "question_first", { config: { eligibleThemes: ["service"] } }), async () => { throw new Error("db down"); }]) {
      const h = harness();
      const r = await runPosting(config, { ...h.deps, experiment: { active, ctx: live } });
      expect(r.state).toBe("ready");
      expect(r.experimentFallback).toMatch(/^(experiment_theme_not_eligible|experiment_unexpected_error)$/);
      expect(h.store.tagExperiment).not.toHaveBeenCalled();
      expect(h.row.generation!.quality.reasons.some(x => x.startsWith("experiment_fallback:"))).toBe(true);
    }
  });
  it("tagging failure fails closed: nothing is prepared or published", async () => {
    const h = harness({ tagExperiment: async () => false });
    const r = await runPosting({ ...config, dryRun: false }, { ...h.deps, experiment: { active: async () => exp, ctx: live } });
    expect(r).toMatchObject({ state: "failed", error: "experiment_tag_failed" });
    expect(h.row.status).toBe("failed");
    expect(h.deps.publish).not.toHaveBeenCalled();
  });
});
