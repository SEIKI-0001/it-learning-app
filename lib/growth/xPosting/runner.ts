import { buildPostUrl, contentKeys, textHash, themeForSlot, validateGenerated, type Generated, type Source, type Theme } from "@/lib/growth/xPosting/core";
import type { XResult } from "@/lib/growth/xPosting/xClient";
export type PostRow = { id: string; utm_content: string; status: string; generation?: Generated };
export type Config = { enabled: boolean; dryRun: boolean; fixture: boolean; account: string; origin: string; slot: string; dailyLimit: number; monthlyLimit: number; model: string };
export interface Store {
  claim(config: Config): Promise<PostRow | null>;
  history(account: string): Promise<string[]>;
  prepare(id: string, generated: Generated, model: string): Promise<boolean>;
  begin(id: string, daily: number): Promise<boolean>;
  finish(id: string, result: XResult): Promise<boolean>;
  fail(id: string, error: string): Promise<void>;
}
export type Dependencies = { store: Store; sources(theme: Theme, slot: string): Source[]; generate(sources: Source[], history: string[], theme: Theme, url: string, slot: string): Promise<unknown>; publish(text: string): Promise<XResult>; verifyIdentity(): Promise<void>; checkDestination(url: string): Promise<void> };
export type RunResult = { state: string; id?: string; xPostId?: string; persisted?: boolean; error?: string; text?: string };
export async function runPosting(config: Config, deps: Dependencies): Promise<RunResult> {
  if (config.fixture && !config.dryRun) throw new Error("fixture_requires_dry_run");
  if (!config.enabled && !config.dryRun) return { state: "disabled" };
  const row = await deps.store.claim(config);
  if (!row) return { state: "skipped" };
  let generated: Generated;
  let phase = "content_generation_failed";
  try {
    const requested = themeForSlot(config.slot);
    const sources = deps.sources(requested, config.slot);
    if (!sources.length) throw new Error("no_approved_content");
    const theme = sources[0].theme;
    const history = await deps.store.history(config.account);
    const url = buildPostUrl(sources[0].path, row.utm_content, config.origin);
    const raw = await deps.generate(sources, history, theme, url, config.slot);
    phase = "quality_check_failed";
    generated = validateGenerated(raw, sources, history, theme, url);
    phase = "prepare_failed";
    if (!await deps.store.prepare(row.id, generated, config.model)) return { state: "cancelled", id: row.id };
    if (config.dryRun) return { state: "ready", id: row.id, text: generated.text };
    phase = "x_identity_failed";
    await deps.verifyIdentity();
    phase = "destination_unavailable";
    if (generated.destinationUrl) await deps.checkDestination(generated.destinationUrl);
  } catch {
    await deps.store.fail(row.id, phase);
    return { state: "failed", id: row.id, error: phase };
  }
  // The durable publishing barrier must commit before the single external POST.
  if (!await deps.store.begin(row.id, config.dailyLimit)) return { state: "skipped", id: row.id };
  let result: XResult;
  try { result = await deps.publish(generated.text); }
  catch { result = { state: "uncertain", error: "x_transport_unknown" }; }
  try {
    if (!await deps.store.finish(row.id, result)) throw new Error("finish_not_saved");
    return { state: result.state, id: row.id, ...(result.state === "published" ? { xPostId: result.id } : { error: result.error }) };
  } catch {
    // Never downgrade to failed or reissue POST. A stale publishing row is blocked too.
    try { await deps.store.finish(row.id, { state: "uncertain", error: "result_persistence_failed" }); } catch { /* Operator must recover this row. */ }
    return { state: "uncertain", id: row.id, persisted: false, ...(result.state === "published" ? { xPostId: result.id } : {}) };
  }
}
export const generatedStorageFields = (g: Generated) => ({ hash: textHash(g.text), keys: contentKeys(g.text) });
