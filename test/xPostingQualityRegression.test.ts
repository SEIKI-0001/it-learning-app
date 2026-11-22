import { describe, expect, it, vi } from "vitest";
import { approvedCandidates, buildPostUrl, compose, contentKeys, HOOKS, similar, themeForSlot, validLength, type Source } from "@/lib/growth/xPosting/core";
import { availableSources } from "@/lib/growth/xPosting/sources";
import { parseAiJson } from "@/lib/growth/xPosting/generator";
import { runPosting, type Dependencies, type PostRow, type Store } from "@/lib/growth/xPosting/runner";

// 2026-11-22 (Sun) 07:00 JST. Production failed on 11-08, 11-15, 11-22 with quality_check_failed:
// both "service" sources were already in history (service-trial-core ready 10-25, service-learning
// published 11-01), so any text the AI could pick was rejected as duplicate_content.
const SUNDAY = "2026-11-21T22:00:00.000Z";
const ORIGIN = "https://example.test";
const config = { enabled: false, dryRun: true, fixture: false, account: "123", origin: ORIGIN, slot: SUNDAY, dailyLimit: 1, monthlyLimit: 31, model: "m" };
const serviceHistory = availableSources("service", SUNDAY).map((s, i) => compose(HOOKS[i % HOOKS.length], s, null));

function harness(history: string[], sources: Dependencies["sources"] = availableSources) {
  const row: PostRow = { id: "row", utm_content: "x-row", status: "draft" };
  const store: Store = { claim: async () => row, history: async () => history, prepare: async (_id, g) => { row.generation = g; row.status = "ready"; return true; }, begin: async () => true, finish: async () => true, fail: vi.fn(async () => { row.status = "failed"; }) };
  // Behaves like a compliant AI: returns the first approved candidate verbatim.
  const generate = vi.fn<Dependencies["generate"]>(async (srcs, hist) => {
    const c = approvedCandidates(srcs, hist, s => buildPostUrl(s.path, row.utm_content, ORIGIN))[0];
    return { ...c, quality: { passed: true, reasons: [] } };
  });
  const publish = vi.fn(); const verifyIdentity = vi.fn();
  return { row, store, generate, publish, deps: { store, sources, generate, publish, verifyIdentity, checkDestination: vi.fn() } as Dependencies };
}

describe("2026-11-22 quality_check_failed regression", () => {
  it("is a Sunday service slot with only two sources", () => {
    expect(themeForSlot(SUNDAY)).toBe("service");
    expect(availableSources("service", SUNDAY)).toHaveLength(2);
  });
  it("an exhausted theme falls back to unused approved terms instead of failing", async () => {
    const t = harness(serviceHistory);
    const result = await runPosting(config, t.deps);
    expect(result.state).toBe("ready");
    expect(t.row.generation?.theme).toBe("terms");
    const offered = t.generate.mock.calls[0][0];
    expect(offered.every(s => s.theme === "terms")).toBe(true);
    expect(t.publish).not.toHaveBeenCalled(); expect(t.deps.verifyIdentity).not.toHaveBeenCalled();
  });
  it("never offers a source that is already in history", async () => {
    const terms = availableSources("terms", SUNDAY);
    const history = [...serviceHistory, compose(HOOKS[1], terms[0], null)];
    const t = harness(history);
    await runPosting(config, t.deps);
    const used = history.map(contentKeys);
    for (const s of t.generate.mock.calls[0][0]) expect(used.some(k => similar(k, contentKeys(compose(HOOKS[0], s, null))))).toBe(false);
  });
  it("records an explicit no_unused_content when every theme is exhausted, without posting", async () => {
    const only: Source = { id: "x", theme: "terms", text: "DNSはドメイン名とIPアドレスを対応付ける仕組みです。", evidence: "e", path: "/words", rights: "app_original" };
    const t = harness([compose(HOOKS[0], only, null)], () => [only]);
    expect(await runPosting(config, t.deps)).toMatchObject({ state: "failed", error: "no_unused_content" });
    expect(t.store.fail).toHaveBeenCalledWith("row", "no_unused_content");
    expect(t.generate).not.toHaveBeenCalled(); expect(t.publish).not.toHaveBeenCalled();
  });
  it("keeps the quality_check_failed prefix but records which fixed check failed", async () => {
    for (const [raw, tag] of [[{ text: "合格率100%！" }, "quality_check_failed_invalid_schema"], [{ text: "guaranteed", theme: "terms", contentId: "unknown", destinationUrl: null, evidence: ["x"], quality: { passed: true, reasons: [] } }, "quality_check_failed_unsupported_content"]] as const) {
      const t = harness(serviceHistory); t.generate.mockResolvedValue(raw);
      expect(await runPosting(config, t.deps)).toMatchObject({ state: "failed", error: tag });
    }
  });
  it("non-JSON AI output gets its own tag; a single code fence is tolerated", async () => {
    expect(parseAiJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => parseAiJson("Here is the post: {")).toThrow("ai_output_not_json");
    const t = harness(serviceHistory); t.generate.mockRejectedValue(new Error("ai_output_not_json"));
    expect(await runPosting(config, t.deps)).toMatchObject({ state: "failed", error: "ai_output_not_json" });
  });
});

describe("approved candidates offered to the AI", () => {
  it("excludes hook/link combinations that exceed the weighted length limit", () => {
    let n = 100; const make = (k: number): Source => ({ id: "long", theme: "terms", text: "日".repeat(k), evidence: "e", path: "/words", rights: "app_original" });
    while (validLength(compose(HOOKS[0], make(n + 1), null))) n++;
    const candidates = approvedCandidates([make(n)], [], s => buildPostUrl(s.path, "x-1", ORIGIN));
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThan(HOOKS.length * 2);
    expect(candidates.every(c => validLength(c.text))).toBe(true);
  });
  it("availableSources drops used sources before cutting the 10-item window", () => {
    expect(availableSources("service", SUNDAY, serviceHistory)).toEqual([]);
    const first = availableSources("terms", SUNDAY)[0];
    const next = availableSources("terms", SUNDAY, [compose(HOOKS[2], first, null)]);
    expect(next).toHaveLength(10);
    expect(next.map(s => s.id)).not.toContain(first.id);
  });
});
