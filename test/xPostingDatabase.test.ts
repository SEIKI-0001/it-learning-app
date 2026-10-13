import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
let db: PGlite;
const account = "123";
async function claim(slot: string, daily = 4, monthly = 31) {
  return (await db.query<{ id: string }>("select id from public.claim_x_post($1,$2,$3,$4)", [account, slot, daily, monthly])).rows[0]?.id;
}
async function prepare(id: string, keys: string[], content: string) {
  return db.query("select public.prepare_x_post($1,$2::jsonb,$3,$4,$5::text[]) as ok", [id, JSON.stringify({ text: content, theme: "terms", contentId: content, destinationUrl: null, evidence: ["approved"], quality: { passed: true, reasons: [] } }), "model", content, keys]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role; create table public.public_funnel_events(event text, placement text, visitor_id text, created_at timestamptz default now()); create table public.signup_attributions(ref text, utm_source text, utm_medium text, utm_campaign text);");
  const file = readdirSync("supabase/migrations").find(f => f.endsWith("_x_organic_posts.sql"));
  expect(file, "additive migration exists").toBeTruthy();
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });
describe("atomic posting database", () => {
  it("claims one account/slot exactly once under simultaneous calls", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => claim("2026-10-12T22:00:00Z")));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("enforces daily quotas across distinct slots and monthly AI attempt caps", async () => {
    expect(await claim("2026-10-12T23:00:00Z", 1)).toBeUndefined();
    expect(await claim("2026-10-14T22:00:00Z", 1, 1)).toBeUndefined();
  });
  it("checks duplicate source, exact and similar text while serializing account preparation", async () => {
    const one = (await claim("2026-10-15T22:00:00Z"))!;
    expect((await prepare(one, ["ab", "bc", "cd"], "first")).rows).toEqual([{ ok: true }]);
    const two = (await claim("2026-10-16T22:00:00Z"))!;
    expect((await prepare(two, ["ab", "bc", "cd", "de"], "second")).rows).toEqual([{ ok: false }]);
    expect((await db.query("select status from public.x_social_posts where id=$1", [two])).rows).toEqual([{ status: "cancelled" }]);
    await db.query("select public.begin_x_publish($1)", [one]);
    expect((await db.query("select public.begin_x_publish($1) as ok", [one])).rows).toEqual([{ ok: false }]);
    await db.query("select public.finish_x_post($1,'published','12345',null)", [one]);
    expect((await db.query("select status,x_post_id from public.x_social_posts where id=$1", [one])).rows).toEqual([{ status: "published", x_post_id: "12345" }]);
  });
  it("recovers stale publishing only to uncertain, never to ready", async () => {
    const id = (await claim("2026-10-17T22:00:00Z"))!;
    await prepare(id, ["xy", "yz"], "other");
    await db.query("select public.begin_x_publish($1)", [id]);
    await db.query("update public.x_social_posts set updated_at=now()-interval '1 hour' where id=$1", [id]);
    await db.query("select public.recover_x_posts()");
    expect((await db.query("select status from public.x_social_posts where id=$1", [id])).rows).toEqual([{ status: "uncertain" }]);
    expect((await db.query("select public.begin_x_publish($1) as ok", [id])).rows).toEqual([{ ok: false }]);
    await db.query("select public.reconcile_x_post($1,'54321','checked X account manually')", [id]);
    expect((await db.query("select status from public.x_social_posts where id=$1", [id])).rows).toEqual([{ status: "published" }]);
  });
  it("denies public table and RPC access", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from public.x_social_posts")).rejects.toThrow(/permission/);
    await expect(claim("2026-10-18T22:00:00Z")).rejects.toThrow(/permission/);
    await db.exec("reset role");
  });
});

it("aggregates entry traffic and first-touch signups independently without multiplying rows", async () => {
  const post = (await db.query<{ id: string; utm_content: string }>("select id,utm_content from public.x_social_posts where status='published' limit 1")).rows[0];
  await db.query("insert into public.public_funnel_events(event,placement,visitor_id) values('view',$1,'visitor1'),('view',$1,'visitor1'),('view',$1,'visitor2'),('click',$1,'visitor3')", [post.utm_content]);
  await db.query("insert into public.signup_attributions(ref,utm_source,utm_medium,utm_campaign) values($1,'x','social','organic_x'),($1,'x','social','organic_x'),($1,'x','social','other')", [post.utm_content]);
  const rows=(await db.query("select visits,visitors,signups,conversion from public.x_post_performance() where id=$1", [post.id])).rows;
  expect(rows).toEqual([{ visits: 3, visitors: 2, signups: 2, conversion: "100.00" }]);
});
