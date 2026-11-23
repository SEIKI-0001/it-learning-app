import { approvedCandidates, buildPostUrl, contentKeys, textHash, themeForSlot, validateGenerated, type Generated, type Source, type Theme } from "@/lib/growth/xPosting/core";
import type { XResult } from "@/lib/growth/xPosting/xClient";
import { buildExperimentPost, validateExperimentPost, type Experiment, type ExperimentMeta } from "@/lib/growth/xGrowth/experiment";
import type { StyleContext } from "@/lib/growth/xGrowth/styles";
export type PostRow = { id: string; utm_content: string; status: string; generation?: Generated };
export type Config = { enabled: boolean; dryRun: boolean; fixture: boolean; account: string; origin: string; slot: string; dailyLimit: number; monthlyLimit: number; model: string };
export interface Store {
  claim(config: Config): Promise<PostRow | null>;
  history(account: string): Promise<string[]>;
  prepare(id: string, generated: Generated, model: string): Promise<boolean>;
  begin(id: string, daily: number): Promise<boolean>;
  finish(id: string, result: XResult): Promise<boolean>;
  fail(id: string, error: string): Promise<void>;
  /** P2: writes experiment metadata onto the still-draft row BEFORE prepare/publish. */
  tagExperiment?(id: string, meta: ExperimentMeta): Promise<boolean>;
}
/** P2 (optional): absent → behaviour is exactly the pre-experiment pipeline. */
export type ExperimentDeps = { active(slot: string): Promise<Experiment | null>; ctx: StyleContext };
export type Dependencies = { store: Store; sources(theme: Theme, slot: string, history?: string[]): Source[]; generate(sources: Source[], history: string[], theme: Theme, url: string, slot: string): Promise<unknown>; publish(text: string): Promise<XResult>; verifyIdentity(): Promise<void>; checkDestination(url: string): Promise<void>; experiment?: ExperimentDeps };
export type RunResult = { state: string; id?: string; xPostId?: string; persisted?: boolean; error?: string; text?: string; experiment?: ExperimentMeta; experimentFallback?: string };
export async function runPosting(config: Config, deps: Dependencies): Promise<RunResult> {
  if (config.fixture && !config.dryRun) throw new Error("fixture_requires_dry_run");
  if (!config.enabled && !config.dryRun) return { state: "disabled" };
  const row = await deps.store.claim(config);
  if (!row) return { state: "skipped" };
  let generated!: Generated;
  let phase = "content_generation_failed";
  try {
    const requested = themeForSlot(config.slot);
    const history = await deps.store.history(config.account);
    // P2: the arm is assigned by code (slot date + seed); the LLM is not involved on this path.
    // Any problem building/validating the experiment post falls back to the normal pipeline and
    // that post is not counted as a sample (reason recorded). Tagging failure fails closed.
    let experimentMeta: ExperimentMeta | undefined;
    let fallback: string | undefined;
    if (deps.experiment) {
      try {
        const exp = await deps.experiment.active(config.slot);
        if (exp) {
          const post = buildExperimentPost(exp, config.slot, requested, history, deps.experiment.ctx);
          generated = validateExperimentPost(post, exp, config.slot, requested, history, deps.experiment.ctx);
          experimentMeta = post.experiment;
        }
      } catch (error) {
        fallback = error instanceof Error && /^[a-z0-9_]{1,60}$/.test(error.message) ? error.message : "experiment_unexpected_error";
      }
    }
    if (experimentMeta) {
      phase = "experiment_tag_failed";
      if (!deps.store.tagExperiment || !await deps.store.tagExperiment(row.id, experimentMeta)) throw new Error("experiment_tag_failed");
    } else {
    // Only sources with at least one acceptable, unused text. An exhausted theme (e.g. the two
    // Sunday "service" posts) falls back to approved terms instead of failing every week.
    const usable = (t: Theme) => deps.sources(t, config.slot, history).filter(s => approvedCandidates([s], history, x => buildPostUrl(x.path, row.utm_content, config.origin)).length > 0);
    let sources = usable(requested);
    if (!sources.length && requested !== "terms") sources = usable("terms");
    if (!sources.length) throw new Error("no_unused_content");
    const theme = sources[0].theme;
    const url = buildPostUrl(sources[0].path, row.utm_content, config.origin);
    const raw = await deps.generate(sources, history, theme, url, config.slot);
    phase = "quality_check_failed";
    generated = validateGenerated(raw, sources, history, theme, url);
    if (fallback) generated = { ...generated, quality: { ...generated.quality, reasons: [...generated.quality.reasons, `experiment_fallback:${fallback}`] } };
    }
    phase = "prepare_failed";
    if (!await deps.store.prepare(row.id, generated, config.model)) return { state: "cancelled", id: row.id };
    if (config.dryRun) return { state: "ready", id: row.id, text: generated.text, ...(experimentMeta ? { experiment: experimentMeta } : fallback ? { experimentFallback: fallback } : {}) };
    phase = "x_identity_failed";
    await deps.verifyIdentity();
    phase = "destination_unavailable";
    if (generated.destinationUrl) await deps.checkDestination(generated.destinationUrl);
  } catch (error) {
    if (phase === "content_generation_failed" && error instanceof Error && /^(anthropic_(not_configured|credit_balance_low|request_failed|http_[45]\d{2})|incomplete_ai_output|ai_output_not_json|no_unused_content)$/.test(error.message)) phase = error.message;
    // Keep the stable prefix, add only the validator's fixed reason tag (never free text).
    else if (phase === "quality_check_failed" && error instanceof Error && /^(invalid_schema|unsupported_content|invalid_length|duplicate_content)$/.test(error.message)) phase = `quality_check_failed_${error.message}`;
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
