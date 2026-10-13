import { readFile, writeFile, mkdir, rmdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Config, PostRow, Store } from "@/lib/growth/xPosting/runner";
import type { Generated } from "@/lib/growth/xPosting/core";
type FixtureRow = PostRow & { account: string; slot: string; model?: string; error?: string };
/** Explicit offline simulation only; no publish capability. Never substitute for Supabase. */
export async function fixtureStore(file: string): Promise<{ store: Store; close(): Promise<void> }> {
  await mkdir(`${file}.lock`); // Refuse concurrent writers; operator can remove a stale simulation lock.
  let rows: FixtureRow[] = [];
  try { rows = JSON.parse(await readFile(file, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") { await rmdir(`${file}.lock`); throw new Error("invalid_fixture_file"); } }
  const save = () => writeFile(file, JSON.stringify({ fixture: true, posts: rows }, null, 2), { mode: 0o600 });
  // Accept only this CLI's object format (do not consume production exports).
  if (!Array.isArray(rows)) {
    const obj = rows as unknown as { fixture?: boolean; posts?: FixtureRow[] };
    if (obj.fixture !== true || !Array.isArray(obj.posts)) { await rmdir(`${file}.lock`); throw new Error("invalid_fixture_file"); }
    rows = obj.posts;
  }
  const find = (id: string) => rows.find(r => r.id === id)!;
  const store: Store = {
    async claim(c: Config) {
      if (!c.fixture || !c.dryRun) throw new Error("fixture_requires_dry_run");
      if (rows.some(r => r.account === c.account && r.slot === c.slot)) return null;
      const id = randomUUID(); const row: FixtureRow = { id, utm_content: `x-${id}`, account: c.account, slot: c.slot, status: "draft" };
      rows.push(row); await save(); return row;
    },
    async history(account) { return rows.filter(r => r.account === account && r.generation).map(r => r.generation!.text); },
    async prepare(id: string, generation: Generated, model: string) { Object.assign(find(id), { generation, model, status: "ready" }); await save(); return true; },
    async fail(id, error) { Object.assign(find(id), { status: "failed", error }); await save(); },
    async begin() { throw new Error("fixture_cannot_publish"); },
    async finish() { throw new Error("fixture_cannot_publish"); },
  };
  return { store, close: () => rmdir(`${file}.lock`) };
}
