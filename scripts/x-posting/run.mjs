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
const { values, positionals } = parseArgs({ allowPositionals: true, options: { "dry-run": { type: "boolean" }, fixture: { type: "boolean" }, slot: { type: "string" }, output: { type: "string" }, id: { type: "string" }, "x-post-id": { type: "string" }, note: { type: "string" }, username: { type: "string" } } });
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
      const result = await runPosting(config, {
        store, sources: availableSources,
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
