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
