import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFixtureDatabase } from "@/lib/growth/xGrowth/fixtureDb";
import { parseExperiment } from "@/lib/growth/xGrowth/experiment";

const raw = JSON.parse(readFileSync("test/fixtures/xGrowth/experiment.json", "utf8"));
let db: PGlite;
beforeEach(async () => { db = await createFixtureDatabase(process.cwd()); }, 30000);
afterEach(async () => { await db.close(); });

async function insertExperiment(over: Record<string, unknown> = {}) {
  const e = { ...raw, ...over };
  await db.query(`insert into public.x_growth_experiments(id, name, hypothesis, status, primary_metric, start_at, end_at, min_posts_per_variant, variants, allocation_seed, experiment_version, hypothesis_key, config)
    values ($1::uuid,$2,$3,$4,$5,$6::timestamptz,$7::timestamptz,$8,$9::jsonb,$10,$11,$12,$13::jsonb)`,
    [e.id, e.name, e.hypothesis, e.status, e.primary_metric, e.start_at, e.end_at, e.min_posts_per_variant, JSON.stringify(e.variants), e.allocation_seed, e.experiment_version, e.hypothesis_key, JSON.stringify(e.config)]);
}
const claim = async (slot: string) => (await db.query<{ id: string }>("select id from public.claim_x_post('123', $1, 4, 124)", [slot])).rows[0].id;
const tag = (id: string, variant = "B", style = "question_first", experiment = raw.id) =>
  db.query<{ ok: boolean }>("select public.tag_x_post_experiment($1, $2, $3, $4, 'acronym:dns', 'xg-p2-v1') as ok", [id, experiment, variant, style]);

describe("P2 migration", () => {
  it("allows only one running experiment and only two variants once approved/running", async () => {
    await insertExperiment();
    await expect(insertExperiment({ id: "6f1c2b0e-3a4d-4c8e-9b1a-5d7e2f9a0c12" })).rejects.toThrow();
    await expect(insertExperiment({ id: "6f1c2b0e-3a4d-4c8e-9b1a-5d7e2f9a0c13", status: "approved", variants: [raw.variants[0]] })).rejects.toThrow();
    // Same hypothesis can have only one open experiment (draft/approved/running).
    await expect(insertExperiment({ id: "6f1c2b0e-3a4d-4c8e-9b1a-5d7e2f9a0c15", status: "draft", variants: [] })).rejects.toThrow();
    await insertExperiment({ id: "6f1c2b0e-3a4d-4c8e-9b1a-5d7e2f9a0c14", status: "draft", variants: [], hypothesis_key: "another_hypothesis" });
  });
  it("active_x_experiment returns the running experiment only inside its period, and it parses", async () => {
    await insertExperiment();
    const inside = (await db.query<Record<string, unknown>>("select * from public.active_x_experiment('2026-12-05T22:00:00Z')")).rows;
    expect(inside).toHaveLength(1);
    expect(parseExperiment({ ...inside[0], start_at: (inside[0].start_at as Date).toISOString(), end_at: (inside[0].end_at as Date).toISOString() }).id).toBe(raw.id);
    expect((await db.query("select * from public.active_x_experiment('2026-12-29T22:00:00Z')")).rows).toHaveLength(0);
  });
  it("tags a draft row once with a consistent arm; refuses mismatches, non-running experiments and non-draft rows", async () => {
    await insertExperiment();
    const id = await claim("2026-12-05T22:00:00Z");
    await expect(tag(id, "B", "mini_quiz")).rejects.toThrow(/experiment_variant_mismatch/);
    await expect(tag(id, "C", "question_first")).rejects.toThrow(/experiment_variant_mismatch/);
    expect((await tag(id)).rows[0].ok).toBe(true);
    expect((await tag(id)).rows[0].ok).toBe(false); // already tagged
    expect((await db.query("select experiment_id, variant_id, content_style, topic_id, generation_version, metrics_eligible from public.x_social_posts where id = $1", [id])).rows)
      .toEqual([{ experiment_id: raw.id, variant_id: "B", content_style: "question_first", topic_id: "acronym:dns", generation_version: "xg-p2-v1", metrics_eligible: true }]);
    const outside = await claim("2027-01-05T22:00:00Z");
    await expect(tag(outside)).rejects.toThrow(/experiment_not_running/);
    await db.query("update public.x_growth_experiments set status = 'paused'");
    const later = await claim("2026-12-06T22:00:00Z");
    await expect(tag(later)).rejects.toThrow(/experiment_not_running/);
  });
  it("new functions are service_role only and SECURITY INVOKER", async () => {
    for (const fn of ["active_x_experiment(timestamptz)", "tag_x_post_experiment(uuid,uuid,text,text,text,text)"]) {
      for (const role of ["anon", "authenticated"]) expect((await db.query<{ ok: boolean }>(`select has_function_privilege('${role}', 'public.${fn}', 'execute') as ok`)).rows[0].ok).toBe(false);
      expect((await db.query<{ ok: boolean }>(`select has_function_privilege('service_role', 'public.${fn}', 'execute') as ok`)).rows[0].ok).toBe(true);
      expect((await db.query<{ d: boolean }>(`select prosecdef as d from pg_proc where oid = 'public.${fn}'::regprocedure`)).rows[0].d).toBe(false);
    }
  });
});

describe("offline CLI", () => {
  const env = { NODE_ENV: "test" as const, PATH: process.env.PATH, HOME: process.env.HOME, X_POST_ENABLED: "false", X_POST_DRY_RUN: "true" };
  it("x:post run --fixture --experiment-file produces a tagged, validated candidate without AI or network", () => {
    const dir = mkdtempSync(join(tmpdir(), "x-exp-cli-"));
    try {
      const out = join(dir, "posts.json");
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/x-posting/run.mjs", "run", "--fixture", "--dry-run", "--output", out, "--slot", "2026-12-05T22:00:00.000Z", "--experiment-file", "test/fixtures/xGrowth/experiment.json"], { env, encoding: "utf8" });
      expect(r.status, r.stderr).toBe(0);
      const res = JSON.parse(r.stdout);
      expect(res).toMatchObject({ state: "ready", experiment: { experimentId: raw.id, generationVersion: "xg-p2-v1" } });
      const saved = JSON.parse(readFileSync(out, "utf8")).posts[0];
      expect(saved.experiment).toEqual(res.experiment);
      expect(saved.generation.experiment).toEqual(res.experiment);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("x:growth preview prints 28 balanced candidates offline", () => {
    const r = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/x-growth/run.mjs", "preview", "--days", "28"], { env, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout).summary).toEqual({ days: 28, candidates: 28, perVariant: { A: 14, B: 14 }, fallbacks: 0, notEligible: 0 });
  });
});
