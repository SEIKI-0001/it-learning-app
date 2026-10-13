import { describe, expect, it, vi } from "vitest";
import { runPosting, type Store, type PostRow, type Dependencies } from "@/lib/growth/xPosting/runner";
import { buildPostUrl, compose, type Source } from "@/lib/growth/xPosting/core";
const source: Source = { id: "a", text: "DNSはドメイン名とIPアドレスを対応付ける仕組みです。", theme: "terms", path: "/words", evidence: "approved", rights: "app_original" };
const config = { enabled: true, dryRun: false, fixture: false, account: "123", origin: "https://example.test", slot: "2026-10-12T22:00:00Z", dailyLimit: 1, monthlyLimit: 31, model: "model" };
function setup() {
  let row: PostRow | null = null;
  const store: Store = {
    claim: async () => { if (row) return null; row = { id: "123", utm_content: "x-123", status: "draft" }; return row; },
    history: async () => [],
    prepare: async (_id, generated) => { row!.status = "ready"; row!.generation = generated; return true; },
    begin: async () => { if (row!.status !== "ready") return false; row!.status = "publishing"; return true; },
    finish: async (_id, result) => { row!.status = result.state; return true; },
    fail: async () => { row!.status = "failed"; },
  };
  const publish = vi.fn().mockResolvedValue({ state: "published", id: "12345" });
  const generate = vi.fn<Dependencies["generate"]>(async (_sources, _history, theme, url) => ({ text: compose("知っていますか？", { ...source, theme }, url), theme, contentId: "a", destinationUrl: url, evidence: ["approved"], quality: { passed: true, reasons: [] } }));
  const dependencies = { store, sources: (theme: Source["theme"]) => [{ ...source, theme }], generate, publish, verifyIdentity: vi.fn().mockResolvedValue(undefined), checkDestination: vi.fn().mockResolvedValue(undefined) };
  return { dependencies, publish, generate, row: () => row };
}
describe("posting orchestrator", () => {
  it("publishes once and persists the outcome", async () => {
    const t = setup();
    expect((await runPosting(config, t.dependencies)).state).toBe("published");
    expect(t.row()?.status).toBe("published");
    expect((await runPosting(config, t.dependencies)).state).toBe("skipped");
    expect(t.publish).toHaveBeenCalledTimes(1);
  });
  it("disabled mode never claims quota, generates or posts", async () => {
    const t = setup();
    expect((await runPosting({ ...config, enabled: false }, t.dependencies)).state).toBe("disabled");
    expect(t.row()).toBeNull(); expect(t.generate).not.toHaveBeenCalled(); expect(t.publish).not.toHaveBeenCalled();
  });
  it("dry-run saves validated output with no X request or identity lookup", async () => {
    const t = setup();
    expect((await runPosting({ ...config, enabled: false, dryRun: true }, t.dependencies)).state).toBe("ready");
    expect(t.row()?.generation?.destinationUrl).toBe(buildPostUrl("/words", "x-123", config.origin));
    expect(t.publish).not.toHaveBeenCalled(); expect(t.dependencies.verifyIdentity).not.toHaveBeenCalled();
  });
  it("fixture capability can never publish even when enabled", async () => {
    const t = setup();
    await expect(runPosting({ ...config, fixture: true }, t.dependencies)).rejects.toThrow(/fixture/);
    expect(t.publish).not.toHaveBeenCalled();
  });
  it("AI failure and unsupported facts persist failure and skip posting", async () => {
    for (const response of [() => { throw new Error("secret"); }, () => ({ text: "guaranteed success" })]) {
      const t = setup(); t.dependencies.generate.mockImplementation(async () => response());
      expect((await runPosting(config, t.dependencies)).state).toBe("failed");
      expect(t.row()?.status).toBe("failed"); expect(t.publish).not.toHaveBeenCalled();
    }
  });
  it("identity or unavailable landing page prevents publishing", async () => {
    for (const key of ["verifyIdentity", "checkDestination"] as const) {
      const t = setup(); t.dependencies[key].mockRejectedValue(new Error("failure"));
      expect((await runPosting(config, t.dependencies)).state).toBe("failed");
      expect(t.publish).not.toHaveBeenCalled();
    }
  });
  it("success followed by DB failure is uncertain and cannot cause resend", async () => {
    const t = setup(); t.dependencies.store.finish = vi.fn().mockRejectedValue(new Error("db"));
    expect(await runPosting(config, t.dependencies)).toMatchObject({ state: "uncertain", id: "123", xPostId: "12345", persisted: false });
    expect(t.row()?.status).toBe("publishing");
    await runPosting(config, t.dependencies);
    expect(t.publish).toHaveBeenCalledTimes(1);
  });
  it("concurrent runs can only claim one generation and one publish", async () => {
    const t = setup();
    await Promise.all([runPosting(config, t.dependencies), runPosting(config, t.dependencies)]);
    expect(t.generate).toHaveBeenCalledTimes(1); expect(t.publish).toHaveBeenCalledTimes(1);
  });
});
