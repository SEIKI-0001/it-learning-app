#!/usr/bin/env node
// X Growth Engine P1 CLI: read-only X metrics snapshots → Supabase. Never posts to X.
//   collect --fixture   offline: in-memory PGlite + real migrations + fixture X response
//   collect             env-gated (X_METRICS_ENABLED / X_METRICS_DRY_RUN / X_METRICS_LIVE_READ)
//   report [--fixture]  per-post 24h/72h snapshots + site attribution (DB read only)
import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { registerTsAlias } from "../lib/ts-alias.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "");
registerTsAlias(root);
const { collectMetrics, exitCodeFor } = await import("@/lib/growth/xGrowth/collector");
const { RpcMetricsStore, supabaseRpc } = await import("@/lib/growth/xGrowth/store");
const { fetchPostMetrics, METRICS_ENDPOINT } = await import("@/lib/growth/xPosting/metricsClient");
const { parseExperiment } = await import("@/lib/growth/xGrowth/experiment");
const { previewExperiment } = await import("@/lib/growth/xGrowth/preview");

const { values, positionals } = parseArgs({ allowPositionals: true, options: { fixture: { type: "boolean" }, "fixture-file": { type: "string" }, "dry-run": { type: "boolean" }, days: { type: "string" }, "experiment-file": { type: "string" }, "allow-draft-library": { type: "boolean" } } });
const command = positionals[0] ?? "collect";
const env = process.env;
const bool = (name, fallback) => {
  const v = env[name];
  if (!v) return fallback;
  if (v !== "true" && v !== "false") throw new Error(`invalid_${name}`);
  return v === "true";
};
const int = (name, fallback, max) => { const n = Number(env[name] || fallback); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`invalid_${name}`); return n; };
const limits = () => ({ dailyReadBudget: int("X_METRICS_DAILY_READ_BUDGET", 10, 10000), monthlyReadBudget: int("X_METRICS_MONTHLY_READ_BUDGET", 120, 100000), maxReadsPerRun: int("X_METRICS_MAX_READS", 10, 100), maxAttempts: int("X_METRICS_MAX_ATTEMPTS", 2, 10) });
const creds = () => {
  const c = { consumerKey: env.X_API_KEY, consumerSecret: env.X_API_SECRET, accessToken: env.X_ACCESS_TOKEN, accessSecret: env.X_ACCESS_TOKEN_SECRET };
  if (Object.values(c).some(v => !v?.trim())) throw new Error("x_credentials_missing");
  return c;
};

let db;
try {
  if (!["collect", "report", "preview"].includes(command)) throw new Error("unknown_command");
  if (command === "preview") {
    // Offline only: experiment file + approved data → assignments and exact candidate texts.
    const exp = parseExperiment(JSON.parse(await readFile(values["experiment-file"] || `${root}/test/fixtures/xGrowth/experiment.json`, "utf8")));
    const days = Number(values.days || 14);
    if (!Number.isInteger(days) || days < 1 || days > 120) throw new Error("invalid_days");
    const rows = previewExperiment(exp, days, { allowDraftLibrary: values["allow-draft-library"] === true });
    const count = s => rows.filter(r => r.state === "candidate" && r.variantId === s).length;
    console.log(JSON.stringify({ fixture: true, experiment: { id: exp.id, name: exp.name, variants: exp.variants }, summary: { days, candidates: rows.filter(r => r.state === "candidate").length, perVariant: Object.fromEntries(exp.variants.map(v => [v.id, count(v.id)])), fallbacks: rows.filter(r => r.state === "fallback").length, notEligible: rows.filter(r => r.state === "not_eligible").length }, rows }, null, 2));
  } else if (values.fixture) {
    const { createFixtureDatabase, seedFixture, pgliteRpc } = await import("@/lib/growth/xGrowth/fixtureDb");
    const fixture = JSON.parse(await readFile(values["fixture-file"] || `${root}/test/fixtures/xGrowth/collect.json`, "utf8"));
    if (fixture?.fixture !== true || !/^\d{1,25}$/.test(fixture.account ?? "")) throw new Error("invalid_fixture_file");
    db = await createFixtureDatabase(root);
    await seedFixture(db, fixture);
    const store = new RpcMetricsStore(pgliteRpc(db));
    const now = new Date(fixture.now);
    const offline = async (url, init) => {
      if (!String(url).startsWith(`${METRICS_ENDPOINT}?`) || init?.method !== "GET" || init.body) throw new Error("unexpected_network_request");
      return new Response(JSON.stringify(fixture.response), { status: fixture.status ?? 200 });
    };
    const fake = { consumerKey: "fixture", consumerSecret: "fixture", accessToken: "fixture", accessSecret: "fixture" };
    const read = ids => fetchPostMetrics({ ids, ownedMetrics: true, expectedAuthorId: fixture.account }, fake, { fetcher: offline, now: () => now });
    const collect = command === "collect"
      ? await collectMetrics({ enabled: true, dryRun: values["dry-run"] === true, liveRead: true, account: fixture.account, now, ...limits() }, { store, read })
      : undefined;
    const report = await store.report(fixture.account, new Date(now.getTime() - 7 * 86400000));
    console.log(JSON.stringify({ fixture: true, ...(collect ? { collect } : {}), report }, null, 2));
    if (collect) process.exitCode = exitCodeFor(collect);
  } else if (command === "collect") {
    const enabled = bool("X_METRICS_ENABLED", false); // emergency switch
    if (!enabled) { console.log(JSON.stringify({ state: "disabled" })); }
    else {
      const account = env.X_POST_ACCOUNT_ID || "";
      const config = { enabled, dryRun: values["dry-run"] === true || bool("X_METRICS_DRY_RUN", true), liveRead: bool("X_METRICS_LIVE_READ", false), account, now: new Date(), ...limits() };
      const store = new RpcMetricsStore(await supabaseRpc(env.X_POST_SUPABASE_URL, env.X_POST_SUPABASE_SERVICE_ROLE_KEY));
      // Credentials are only read when a live request is actually about to happen.
      const read = ids => fetchPostMetrics({ ids, ownedMetrics: bool("X_METRICS_OWNED", true), expectedAuthorId: account }, creds());
      const result = await collectMetrics(config, { store, read });
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = exitCodeFor(result);
    }
  } else {
    const account = env.X_POST_ACCOUNT_ID || "";
    if (!/^\d{1,25}$/.test(account)) throw new Error("invalid_account_id");
    const days = Number(values.days || 14);
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("invalid_days");
    const store = new RpcMetricsStore(await supabaseRpc(env.X_POST_SUPABASE_URL, env.X_POST_SUPABASE_SERVICE_ROLE_KEY));
    console.log(JSON.stringify({ fixture: false, report: await store.report(account, new Date(Date.now() - days * 86400000)) }, null, 2));
  }
} catch (e) {
  // Fixed tags only: no SDK, DB, fetch or credential details in workflow logs.
  const safe = e instanceof Error && /^[a-zA-Z0-9_]+$/.test(e.message) ? e.message : "metrics_command_failed";
  console.error(JSON.stringify({ error: safe })); process.exitCode = 1;
} finally { if (db) await db.close(); }
