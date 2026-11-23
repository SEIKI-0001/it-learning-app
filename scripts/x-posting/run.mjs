#!/usr/bin/env node
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { registerTsAlias } from "../lib/ts-alias.mjs";
registerTsAlias(fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, ""));
const { resolveSlot, parseTimes, compose } = await import("@/lib/growth/xPosting/core");
const { runPosting } = await import("@/lib/growth/xPosting/runner");
const { availableSources } = await import("@/lib/growth/xPosting/sources");
const { postingModel, generatePost } = await import("@/lib/growth/xPosting/generator");
const { monthlyUsage } = await import("@/lib/growth/xPosting/usage");
const { SupabasePostStore } = await import("@/lib/growth/xPosting/store");
const { fixtureStore } = await import("@/lib/growth/xPosting/fixtureStore");
const { createXPost, verifyXIdentity, readXIdentity } = await import("@/lib/growth/xPosting/xClient");
const { checkPostingAi } = await import("@/lib/growth/xPosting/aiDiagnostics");
const { parseExperiment } = await import("@/lib/growth/xGrowth/experiment");
const { fetchPostMetrics, estimateReadCostUsd, validateIds, METRICS_ENDPOINT } = await import("@/lib/growth/xPosting/metricsClient");
const { readFile } = await import("node:fs/promises");
const { values, positionals } = parseArgs({ allowPositionals: true, options: { "dry-run": { type: "boolean" }, fixture: { type: "boolean" }, slot: { type: "string" }, output: { type: "string" }, id: { type: "string" }, "x-post-id": { type: "string" }, note: { type: "string" }, username: { type: "string" }, ids: { type: "string" }, "fixture-file": { type: "string" }, "experiment-file": { type: "string" }, owned: { type: "boolean" }, diagnose: { type: "boolean" } } });
const command = positionals[0] ?? "run";
const env = process.env;
const bool = (name, fallback = false) => {
  const value = env[name];
  if (!value) return fallback;
  if (!["true", "false"].includes(value)) throw new Error(`invalid_${name}`);
  return value === "true";
};
const limit = (name, fallback, max) => { const n = Number(env[name] || fallback); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`invalid_${name}`); return n; };
const creds = () => {
  const c = { consumerKey: env.X_API_KEY, consumerSecret: env.X_API_SECRET, accessToken: env.X_ACCESS_TOKEN, accessSecret: env.X_ACCESS_TOKEN_SECRET };
  if (Object.values(c).some(v => !v?.trim())) throw new Error("x_credentials_missing");
  return c;
};
let cleanup;
try {
  const times = parseTimes((env.X_POST_TIMES_JST || "07:00").split(","));
  if (command === "ai-check") {
    console.log(JSON.stringify(await checkPostingAi(postingModel())));
  } else if (command === "identity") {
    if (!values.username || !/^[A-Za-z0-9_]{1,15}$/.test(values.username)) throw new Error("identity_requires_username");
    const identity = await readXIdentity(creds());
    if (identity.username.toLowerCase() !== values.username.toLowerCase()) throw new Error("x_identity_mismatch");
    console.log(JSON.stringify({ state: "verified", accountId: identity.id, username: identity.username }));
  } else if (command === "schedule") {
    console.log(JSON.stringify(times.map(t => { const [h,m] = t.split(":").map(Number); return { cron: `${m} ${(h+15)%24} * * *`, jst: t }; }), null, 2));
  } else if (command === "metrics") {
    // READ-ONLY. No DB access. Fixture mode never touches the network; live mode needs an explicit opt-in.
    if (values.fixture) {
      const file = values["fixture-file"] || fileURLToPath(new URL("../../test/fixtures/xMetrics/get-tweets-mixed.json", import.meta.url));
      const fixture = JSON.parse(await readFile(file, "utf8"));
      if (fixture?.fixture !== true || !Array.isArray(fixture.requestedIds)) throw new Error("invalid_fixture_file");
      const ids = validateIds(values.ids ? values.ids.split(",") : fixture.requestedIds);
      const offline = async (url, options) => {
        if (!String(url).startsWith(`${METRICS_ENDPOINT}?`) || options?.method !== "GET" || options.body) throw new Error("unexpected_network_request");
        return new Response(JSON.stringify(fixture.response), { status: fixture.status ?? 200 });
      };
      const fake = { consumerKey: "fixture", consumerSecret: "fixture", accessToken: "fixture", accessSecret: "fixture" };
      console.log(JSON.stringify({ fixture: true, estimatedUsdIfLive: estimateReadCostUsd(ids.length), ...(await fetchPostMetrics({ ids, ownedMetrics: values.owned === true }, fake, { fetcher: offline, now: () => new Date("2026-11-22T22:00:00Z") })) }, null, 2));
    } else {
      if (env.X_METRICS_LIVE_READ !== "true") throw new Error("x_metrics_live_read_not_enabled");
      if (!values.ids) throw new Error("metrics_requires_ids");
      const ids = validateIds(values.ids.split(","));
      if (ids.length > limit("X_METRICS_MAX_READS", 10, 100)) throw new Error("x_metrics_read_cap_exceeded");
      const expectedAuthorId = env.X_POST_ACCOUNT_ID && /^\d{1,25}$/.test(env.X_POST_ACCOUNT_ID) ? env.X_POST_ACCOUNT_ID : undefined;
      // --diagnose: report which fields/permissions X actually returned (names and HTTP/rate-limit headers only,
      // never post text, provider error details or credentials). Still exactly one GET.
      let responseShape;
      const fetcher = values.diagnose ? async (url, init) => {
        const res = await fetch(url, init);
        const keys = o => o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o).sort() : null;
        let body = null; try { body = await res.clone().json(); } catch { /* shape stays null */ }
        responseShape = {
          httpStatus: res.status,
          rateLimit: { limit: res.headers.get("x-rate-limit-limit"), remaining: res.headers.get("x-rate-limit-remaining"), reset: res.headers.get("x-rate-limit-reset") },
          data: Array.isArray(body?.data) ? body.data.map(d => ({ id: d?.id, fields: keys(d), authorMatchesAccount: expectedAuthorId ? d?.author_id === expectedAuthorId : null, public_metrics: keys(d?.public_metrics), non_public_metrics: keys(d?.non_public_metrics), organic_metrics: keys(d?.organic_metrics) })) : null,
          errors: Array.isArray(body?.errors) ? body.errors.map(e => ({ type: typeof e?.type === "string" ? e.type : null, title: typeof e?.title === "string" ? e.title.slice(0, 80) : null, resource_id: e?.resource_id ?? null })) : null,
        };
        return res;
      } : undefined;
      const result = await fetchPostMetrics({ ids, ownedMetrics: values.owned === true, expectedAuthorId }, creds(), { fetcher });
      console.log(JSON.stringify({ fixture: false, estimatedUsd: estimateReadCostUsd(ids.length), ...result, ...(values.diagnose ? { responseShape } : {}) }, null, 2));
      if (result.requestStatus !== "ok") process.exitCode = 1;
    }
  } else if (command === "run") {
    const enabled = bool("X_POST_ENABLED");
    const dryRun = values["dry-run"] === true || bool("X_POST_DRY_RUN", true);
    if (values.fixture && !dryRun) throw new Error("fixture_requires_dry_run");
    if (!enabled && !dryRun) { console.log(JSON.stringify({ state: "disabled" })); }
    else {
      const slot = values.slot ? new Date(values.slot).toISOString() : resolveSlot(new Date(), times, env.X_POST_EVENT_SCHEDULE || undefined);
      if (!values.fixture) {
        const jst = new Date(Date.parse(slot) + 9*3600000).toISOString();
        if (!times.includes(jst.slice(11,16)) || !jst.endsWith(":00.000Z") || Date.parse(slot)>Date.now() || Date.now()-Date.parse(slot)>86400000) throw new Error("invalid_or_stale_slot");
      }
      const config = { enabled, dryRun, fixture: values.fixture === true, slot, account: env.X_POST_ACCOUNT_ID || (values.fixture ? "offline" : ""), origin: env.X_POST_SITE_ORIGIN || "https://shikaku-mochit.com", dailyLimit: limit("X_POST_DAILY_LIMIT", 1, 4), monthlyLimit: limit("X_POST_MONTHLY_AI_LIMIT", 31, 124), model: values.fixture ? "offline-fixture" : postingModel() };
      if (!config.account || (!values.fixture && !/^\d{1,25}$/.test(config.account))) throw new Error("invalid_account_id");
      let store;
      if (values.fixture) { const f = await fixtureStore(values.output || "/private/tmp/it-learning-x-dry-run.json"); store=f.store; cleanup=f.close; }
      else { store = new SupabasePostStore(env.X_POST_SUPABASE_URL, env.X_POST_SUPABASE_SERVICE_ROLE_KEY); }
      // P2 experiments are OFF unless X_GROWTH_EXPERIMENTS_ENABLED=true (fixture: --experiment-file).
      // The running experiment itself must also be approved/started in the DB by an operator.
      let experiment;
      if (values.fixture && values["experiment-file"]) {
        const exp = parseExperiment(JSON.parse(await readFile(values["experiment-file"], "utf8")));
        experiment = { active: async () => exp, ctx: { allowDraftLibrary: true } };
      } else if (!values.fixture && bool("X_GROWTH_EXPERIMENTS_ENABLED")) {
        // Link arms: X_GROWTH_LINK_MONTHLY_USD_LIMIT (default 0 = never). One more link post must fit under it.
        const linkLimit = Number(env.X_GROWTH_LINK_MONTHLY_USD_LIMIT || 0);
        if (!Number.isFinite(linkLimit) || linkLimit < 0 || linkLimit > 50) throw new Error("invalid_X_GROWTH_LINK_MONTHLY_USD_LIMIT");
        const linkAllowed = async () => linkLimit > 0 && (await store.monthlyLinkSpendUsd(config.account)) + 0.2 <= linkLimit;
        experiment = { active: slotIso => store.activeExperiment(slotIso), ctx: { allowDraftLibrary: false }, linkAllowed };
      }
      const result = await runPosting(config, {
        store, sources: availableSources, experiment,
        generate: values.fixture ? async (sources, _history, theme, url) => ({ text: compose("知っていますか？", sources[0], url), theme, contentId: sources[0].id, destinationUrl: url, evidence: [sources[0].evidence], quality: { passed: true, reasons: ["explicit_offline_fixture"] } }) : generatePost,
        publish: text => createXPost(text, creds()),
        verifyIdentity: () => verifyXIdentity(config.account, creds()),
        checkDestination: async url => {
          const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "error" });
          await response.body?.cancel();
          if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("destination_unavailable");
        },
      });
      console.log(JSON.stringify({ fixture: config.fixture, ...result }, null, 2));
      if (["failed", "uncertain"].includes(result.state)) process.exitCode = 1;
    }
  } else {
    const store = new SupabasePostStore(env.X_POST_SUPABASE_URL, env.X_POST_SUPABASE_SERVICE_ROLE_KEY);
    if (command === "recover") console.log(JSON.stringify({ recovered: await store.rpc("recover_x_posts") }));
    else if (command === "reconcile") {
      if (!values.id || !values.note) throw new Error("reconcile_requires_id_and_note");
      console.log(JSON.stringify({ reconciled: await store.rpc("reconcile_x_post", { p_id: values.id, p_x_id: values["x-post-id"] || null, p_note: values.note }) }));
    } else if (command === "report") {
      const performance = await store.rpc("x_post_performance");
      const { data: rows, error } = await store.client.from("x_social_posts").select("id,status,ai_model,destination_url,created_at,publish_attempt_at,error_summary,x_post_id").order("created_at", { ascending: false }).limit(1000);
      if (error) throw new Error("posting_report_failed");
      const monthly = monthlyUsage(rows);
      const themes = {};
      for (const p of performance) { const t=themes[p.theme || "ungenerated"] ||= { visits: 0, visitors: 0, signups: 0 }; t.visits+=Number(p.visits); t.visitors+=Number(p.visitors); t.signups+=Number(p.signups); }
      for (const t of Object.values(themes)) t.conversion = t.visitors ? 100*t.signups/t.visitors : null;
      console.log(JSON.stringify({ performance, themes, monthly, recent: rows, pricingChecked: "2026-10-14", note: "X cost estimates exclude identity-read charges and AI tokens; reserved calls include dry-run/failure. Theme visitors are the sum of per-post distinct visitors. See docs/operations/x-organic-posting.md." }, null, 2));
    } else throw new Error("unknown_command");
  }
} catch (e) {
  // Do not dump SDK, fetch, credential or database errors into workflow logs.
  const safe = e instanceof Error && /^[a-zA-Z0-9_]+$/.test(e.message) ? e.message : "posting_command_failed";
  console.error(JSON.stringify({ error: safe })); process.exitCode=1;
} finally { if (cleanup) await cleanup(); }
