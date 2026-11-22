import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const cli = "scripts/x-growth/run.mjs";
const env = { NODE_ENV: "test" as const, PATH: process.env.PATH, HOME: process.env.HOME };
const dir = mkdtempSync(join(tmpdir(), "x-growth-cli-"));
const log = join(dir, "requests.log");
// Records every request. X is always refused; a fake Supabase answers the due-list RPC only.
const preload = join(dir, "fetch.mjs");
writeFileSync(preload, `import { appendFileSync } from "node:fs";
globalThis.fetch = async (url, init = {}) => {
  appendFileSync(${JSON.stringify(log)}, (init.method || "GET") + " " + String(url) + "\\n");
  if (String(url).includes("api.x.com")) throw new Error("x_request_forbidden");
  if (String(url).includes("/rest/v1/rpc/x_metrics_due")) return new Response(JSON.stringify([{ post_id: "00000000-0000-4000-8000-000000000001", x_post_id: "1990000000000000001", published_at: new Date(Date.now() - 25 * 3600000).toISOString(), snapshot_stage: "24h", age_hours: 25, attempt_count: 0, window_state: "due" }]), { status: 200, headers: { "content-type": "application/json" } });
  throw new Error("unexpected_request");
};`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const run = (args: string[], extra: Record<string, string> = {}) => {
  writeFileSync(log, "");
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--import", preload, cli, ...args], { env: { ...env, ...extra }, encoding: "utf8" });
  return { ...r, requests: readFileSync(log, "utf8").split("\n").filter(Boolean) };
};
const xCreds = { X_API_KEY: "k", X_API_SECRET: "s", X_ACCESS_TOKEN: "t", X_ACCESS_TOKEN_SECRET: "ts" };

describe("x:growth CLI", () => {
  it("is disabled by default: no DB, no X, no credentials needed", () => {
    const r = run(["collect"]);
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({ state: "disabled" });
    expect(r.requests).toEqual([]);
  });
  it("collect --fixture runs the whole pipeline offline", () => {
    const r = run(["collect", "--fixture"]);
    expect(r.status, r.stderr).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.collect).toMatchObject({ state: "partial", plan: { reads: 4, estimatedUsd: 0.02 }, statuses: { ok: 1, unavailable: 2, permission_error: 1 } });
    expect(out.report.find((p: { x_post_id: string }) => p.x_post_id === "1990000000000000101")).toMatchObject({ status_24h: "ok", impressions_24h: 148, site_visits: 5, site_visitors: 3, site_signups: 1 });
    expect(r.requests).toEqual([]);
  });
  it("enabled with defaults is a dry run: reads the due list, estimates cost, never calls X", () => {
    const r = run(["collect"], { ...xCreds, X_METRICS_ENABLED: "true", X_POST_ACCOUNT_ID: "1234567890", X_POST_SUPABASE_URL: "https://db.example.test", X_POST_SUPABASE_SERVICE_ROLE_KEY: "service-key" });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({ state: "dry_run", plan: { dueStages: 1, reads: 1, deferredReads: 0, missedStages: 0, estimatedUsd: 0.005 } });
    expect(r.requests).toHaveLength(1);
    expect(r.requests[0]).toMatch(/^POST https:\/\/db\.example\.test\/rest\/v1\/rpc\/x_metrics_due$/);
    expect(r.stdout + r.stderr).not.toContain("service-key");
  });
  it("fails closed with fixed error tags", () => {
    expect(run(["collect"], { X_METRICS_ENABLED: "true", X_POST_ACCOUNT_ID: "1" }).stderr).toContain("metrics_db_not_configured");
    expect(run(["collect"], { X_METRICS_ENABLED: "yes" }).stderr).toContain("invalid_X_METRICS_ENABLED");
    expect(run(["collect"], { X_METRICS_ENABLED: "true", X_METRICS_MAX_READS: "101" }).stderr).toContain("invalid_X_METRICS_MAX_READS");
    expect(run(["post"]).stderr).toContain("unknown_command");
  });
});

describe("scheduled workflow safety defaults", () => {
  const wf = readFileSync(".github/workflows/x-metrics-collect.yml", "utf8");
  it("only starts on schedule when the emergency switch variable is true, and only on main", () => {
    expect(wf).toContain("if: github.ref == 'refs/heads/main' && (github.event_name == 'workflow_dispatch' || vars.X_METRICS_ENABLED == 'true')");
    expect(wf).toContain("X_METRICS_ENABLED: ${{ vars.X_METRICS_ENABLED || 'false' }}");
  });
  it("defaults to dry-run and no live X reads, with budgets", () => {
    expect(wf).toContain("vars.X_METRICS_DRY_RUN || 'true'");
    expect(wf).toContain("X_METRICS_LIVE_READ: ${{ vars.X_METRICS_LIVE_READ || 'false' }}");
    expect(wf).toMatch(/dry_run:[\s\S]*?default: true/);
    expect(wf).toContain("X_METRICS_DAILY_READ_BUDGET: ${{ vars.X_METRICS_DAILY_READ_BUDGET || '10' }}");
    expect(wf).toContain("X_METRICS_MONTHLY_READ_BUDGET: ${{ vars.X_METRICS_MONTHLY_READ_BUDGET || '120' }}");
  });
  it("cannot post: read-only permissions, no AI key, only the read CLI is run", () => {
    expect(wf).toContain("permissions:\n  contents: read");
    expect(wf).not.toMatch(/ANTHROPIC|x:post -- (run|recover|reconcile)|X_POST_ENABLED|X_POST_DRY_RUN/);
    expect(wf.match(/run: npm run [^\n]+/g)).toEqual(["run: npm run x:post -- metrics --owned --diagnose --ids \"$VERIFY_POST_ID\"", "run: npm run x:growth -- collect --fixture", "run: npm run x:growth -- collect"]);
    expect(wf).toContain("cancel-in-progress: false");
  });
  it("collects every 6 hours so each 24h/72h window gets more than one run", () => {
    expect(wf.match(/- cron: '([^']+)'/g)).toEqual(["- cron: '15 */6 * * *'"]);
  });
  it("the one-off live read is manual only, capped at one id, passes the id via env, and touches no DB", () => {
    const step = wf.slice(wf.indexOf("- name: One approved live read"), wf.indexOf("- name: Offline fixture collection"));
    expect(step).toContain("if: github.event_name == 'workflow_dispatch' && inputs.verify_post_id != ''");
    expect(step).toContain("X_METRICS_MAX_READS: '1'");
    expect(step).toContain("VERIFY_POST_ID: ${{ inputs.verify_post_id }}");
    expect(step).not.toMatch(/SUPABASE|ANTHROPIC/);
    expect(step).not.toMatch(/run:[^\n]*\$\{\{/); // no expression injection into the shell
  });
});
