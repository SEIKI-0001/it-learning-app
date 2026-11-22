import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const cli = "scripts/x-posting/run.mjs";
const env = { NODE_ENV: "test" as const, PATH: process.env.PATH, HOME: process.env.HOME, X_POST_ENABLED: "false", X_POST_DRY_RUN: "false" };
describe("offline posting CLI", () => {
  it("runs disabled with no credentials and no network", () => {
    expect(JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", cli, "run"], { env, encoding: "utf8" }))).toEqual({ state: "disabled" });
  });
  it("generates and saves an explicit fixture once, refuses publishing it", () => {
    const dir = mkdtempSync(join(tmpdir(), "x-post-test-")); const file=join(dir,"posts.json");
    const args = ["--experimental-strip-types",cli,"run","--fixture","--dry-run","--output",file,"--slot","2026-10-12T22:00:00Z"];
    try {
      expect(JSON.parse(execFileSync(process.execPath, args, { env, encoding: "utf8" })).state).toBe("ready");
      expect(JSON.parse(readFileSync(file,"utf8"))).toMatchObject({ fixture: true, posts: [{ status: "ready", model: "offline-fixture" }] });
      expect(JSON.parse(execFileSync(process.execPath, args, { env, encoding: "utf8" })).state).toBe("skipped");
      const refused=spawnSync(process.execPath,["--experimental-strip-types",cli,"run","--fixture"],{env,encoding:"utf8"});
      expect(refused.status).toBe(1); expect(refused.stderr).toContain("fixture_requires_dry_run");
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
});

it("checks credentials without AI or DB and refuses an unexpected account", () => {
  const dir = mkdtempSync(join(tmpdir(), "x-identity-test-"));
  const preload = join(dir, "fetch.mjs");
  writeFileSync(preload, `globalThis.fetch = async (url, options) => {
    if (url !== "https://api.x.com/2/users/me" || options.method === "POST" || options.body) throw new Error("unexpected_network_request");
    return new Response(JSON.stringify({ data: { id: "868384833575067648", username: "itpassportsup" } }));
  };`);
  const credentials = { ...env, X_API_KEY: "test-key", X_API_SECRET: "test-secret", X_ACCESS_TOKEN: "test-token", X_ACCESS_TOKEN_SECRET: "test-token-secret" };
  const args = ["--experimental-strip-types", "--import", preload, cli, "identity", "--username"];
  try {
    const checked = spawnSync(process.execPath, [...args, "itpassportsup"], { env: credentials, encoding: "utf8" });
    expect(checked.status, checked.stderr).toBe(0);
    expect(JSON.parse(checked.stdout)).toEqual({ state: "verified", accountId: "868384833575067648", username: "itpassportsup" });
    const wrong = spawnSync(process.execPath, [...args, "anotheruser"], { env: credentials, encoding: "utf8" });
    expect(wrong.status).toBe(1);
    expect(wrong.stderr).toContain("x_identity_mismatch");
    expect(wrong.stdout).toBe("");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

describe("read-only metrics CLI", () => {
  const noNetwork = () => {
    const dir = mkdtempSync(join(tmpdir(), "x-metrics-test-"));
    const preload = join(dir, "fetch.mjs");
    writeFileSync(preload, `globalThis.fetch = async () => { throw new Error("unexpected_network_request"); };`);
    return { dir, preload };
  };
  it("fixture mode parses offline data with no credentials, network or DB", () => {
    const { dir, preload } = noNetwork();
    try {
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "--import", preload, cli, "metrics", "--fixture"], { env, encoding: "utf8" });
      expect(r.status, r.stderr).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out).toMatchObject({ fixture: true, requestStatus: "ok", estimatedUsdIfLive: 0.025 });
      expect(out.posts.map((p: { collectionStatus: string }) => p.collectionStatus)).toEqual(["ok", "ok", "unavailable", "unavailable", "permission_error"]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("live reads are refused without X_METRICS_LIVE_READ=true, before any request", () => {
    const { dir, preload } = noNetwork();
    try {
      const credentials = { ...env, X_API_KEY: "k", X_API_SECRET: "s", X_ACCESS_TOKEN: "t", X_ACCESS_TOKEN_SECRET: "ts" };
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "--import", preload, cli, "metrics", "--ids", "1990000000000000001"], { env: credentials, encoding: "utf8" });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("x_metrics_live_read_not_enabled");
      expect(r.stderr).not.toContain("unexpected_network_request");
      const capped = spawnSync(process.execPath, ["--experimental-strip-types", "--import", preload, cli, "metrics", "--ids", Array.from({ length: 11 }, (_, i) => String(i + 1)).join(",")], { env: { ...credentials, X_METRICS_LIVE_READ: "true" }, encoding: "utf8" });
      expect(capped.stderr).toContain("x_metrics_read_cap_exceeded");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

it("--diagnose reports field names and permissions only, with exactly one GET", () => {
  const dir = mkdtempSync(join(tmpdir(), "x-diagnose-test-"));
  const preload = join(dir, "fetch.mjs");
  const log = join(dir, "calls.log");
  writeFileSync(preload, `import { appendFileSync } from "node:fs";
globalThis.fetch = async (url, init) => {
  appendFileSync(${JSON.stringify(log)}, init.method + " " + url + "\\n");
  if (init.method !== "GET" || init.body) throw new Error("unexpected_write");
  return new Response(JSON.stringify({ data: [{ id: "1990000000000000001", author_id: "868384833575067648", text: "SECRET-POST-TEXT", created_at: "2026-11-21T03:00:00.000Z", public_metrics: { impression_count: 9, like_count: 1, retweet_count: 0, reply_count: 0, quote_count: 0, bookmark_count: 0 }, non_public_metrics: { impression_count: 9, user_profile_clicks: 1 } }] }), { status: 200, headers: { "x-rate-limit-limit": "900", "x-rate-limit-remaining": "899", "x-rate-limit-reset": "1795000000" } });
};`);
  const credentials = { ...env, X_API_KEY: "k", X_API_SECRET: "s", X_ACCESS_TOKEN: "t", X_ACCESS_TOKEN_SECRET: "ts-secret", X_METRICS_LIVE_READ: "true", X_METRICS_MAX_READS: "1", X_POST_ACCOUNT_ID: "868384833575067648" };
  try {
    const r = spawnSync(process.execPath, ["--experimental-strip-types", "--import", preload, cli, "metrics", "--owned", "--diagnose", "--ids", "1990000000000000001"], { env: credentials, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.posts[0]).toMatchObject({ collectionStatus: "ok", impressions: 9 });
    expect(out.responseShape).toEqual({ httpStatus: 200, rateLimit: { limit: "900", remaining: "899", reset: "1795000000" }, errors: null, data: [{ id: "1990000000000000001", fields: ["author_id", "created_at", "id", "non_public_metrics", "public_metrics", "text"], authorMatchesAccount: true, public_metrics: ["bookmark_count", "impression_count", "like_count", "quote_count", "reply_count", "retweet_count"], non_public_metrics: ["impression_count", "user_profile_clicks"], organic_metrics: null }] });
    expect(r.stdout).not.toContain("SECRET-POST-TEXT"); expect(r.stdout).not.toContain("ts-secret");
    const calls = readFileSync(log, "utf8").trim().split("\n");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^GET https:\/\/api\.x\.com\/2\/tweets\?ids=1990000000000000001&tweet\.fields=author_id%2Ccreated_at%2Cpublic_metrics%2Cnon_public_metrics%2Corganic_metrics$/);
    const two = spawnSync(process.execPath, ["--experimental-strip-types", "--import", preload, cli, "metrics", "--ids", "1990000000000000001,1990000000000000002"], { env: credentials, encoding: "utf8" });
    expect(two.stderr).toContain("x_metrics_read_cap_exceeded");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
