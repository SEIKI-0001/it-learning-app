import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import type { Rpc } from "@/lib/growth/xGrowth/store";

/**
 * Offline, in-memory Postgres (PGlite) with the real posting + growth migrations applied.
 * Used by `x:growth -- collect --fixture` and the tests. Never connects to Supabase.
 */
export type FixturePost = { id: string; xPostId: string | null; hoursAgo: number; status?: string; account?: string; theme?: string; visits?: number; visitors?: number; signups?: number };
export type GrowthFixture = { fixture: true; note?: string; now: string; account: string; posts: FixturePost[]; response: unknown; status?: number };

const MIGRATIONS = ["_x_organic_posts.sql", "_x_growth_engine.sql", "_x_growth_experiments.sql"];

export async function createFixtureDatabase(root: string): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  // Minimal stand-ins for the roles and the two attribution tables x_post_performance() reads.
  // Mirror Supabase's default privileges (verified identical on production 2026-11-23): new public
  // tables/functions get ALL/EXECUTE for anon, authenticated and service_role unless revoked.
  await db.exec(`create role anon; create role authenticated; create role service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    create table public.public_funnel_events(event text, placement text, visitor_id text, created_at timestamptz default now());
    create table public.signup_attributions(ref text, utm_source text, utm_medium text, utm_campaign text);`);
  const dir = join(root, "supabase/migrations");
  const files = readdirSync(dir);
  for (const suffix of MIGRATIONS) {
    const file = files.find(f => f.endsWith(suffix));
    if (!file) throw new Error("fixture_migration_missing");
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  return db;
}

export async function seedFixture(db: PGlite, fixture: GrowthFixture): Promise<void> {
  const now = Date.parse(fixture.now);
  for (const p of fixture.posts) {
    const account = p.account ?? fixture.account;
    const status = p.status ?? "published";
    const at = new Date(now - p.hoursAgo * 3600000).toISOString();
    await db.query("insert into public.x_posting_accounts values ($1) on conflict do nothing", [account]);
    await db.query(`insert into public.x_social_posts(id, account_id, scheduled_at, published_at, publish_attempt_at, theme, text, status, x_post_id, utm_content, utm)
      values ($1::uuid, $2, $3::timestamptz, $4::timestamptz, $3::timestamptz, $5, 'fixture text', $6, $7, 'x-' || $1::text, '{}'::jsonb)`,
      [p.id, account, at, status === "published" ? at : null, p.theme ?? "terms", status, status === "published" ? p.xPostId : null]);
    for (let i = 0; i < (p.visits ?? 0); i++) await db.query("insert into public.public_funnel_events(event, placement, visitor_id) values ('view', 'x-' || $1, $2)", [p.id, `v${i % Math.max(p.visitors ?? 1, 1)}`]);
    for (let i = 0; i < (p.signups ?? 0); i++) await db.query("insert into public.signup_attributions values ('x-' || $1, 'x', 'social', 'organic_x')", [p.id]);
  }
}

/** Named-argument RPC over PGlite, mirroring supabase.rpc(): table functions → rows, scalar → value. */
export function pgliteRpc(db: PGlite): Rpc {
  return async (name, args) => {
    if (!/^[a-z_]{1,63}$/.test(name)) throw new Error("invalid_rpc_name");
    const keys = Object.keys(args);
    if (keys.some(k => !/^p_[a-z_]{1,40}$/.test(k))) throw new Error("invalid_rpc_args");
    const values = keys.map(k => { const v = args[k]; return v !== null && typeof v === "object" ? JSON.stringify(v) : v; });
    const res = await db.query<Record<string, unknown>>(`select * from public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`, values);
    return res.fields.length === 1 && res.fields[0].name === name ? res.rows[0]?.[name] : res.rows;
  };
}
