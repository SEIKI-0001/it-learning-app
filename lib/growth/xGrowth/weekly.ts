import type { AnalysisRow, HistoryEntry } from "@/lib/growth/xGrowth/analysis";
import { interpret, type Complete } from "@/lib/growth/xGrowth/aiAnalysis";
import { experimentFactor, parseExperiment, type Experiment } from "@/lib/growth/xGrowth/experiment";
import type { HypothesisOutcome } from "@/lib/growth/xGrowth/hypotheses";
import type { Rpc } from "@/lib/growth/xGrowth/store";
import { parseOps, type Budgets, type OpsSummary } from "@/lib/growth/xGrowth/health";
import { planNextDraft, type DraftPlan } from "@/lib/growth/xGrowth/drafts";
import { previewExperiment } from "@/lib/growth/xGrowth/preview";
import { buildWeeklyReport, renderMarkdown, REPORT_VERSION, type WeeklyReport } from "@/lib/growth/xGrowth/weeklyReport";

/** Reads analysis inputs and persists reviews through the P3 RPCs (Supabase or PGlite). */
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString());
const rowsOf = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

export class GrowthStore {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) { this.rpc = rpc; }
  async experiments(): Promise<Experiment[]> { return (await this.allExperiments()).filter(e => e.status !== "draft"); }
  /** Including drafts (for draft planning and approval). */
  async allExperiments(): Promise<Experiment[]> {
    return rowsOf(await this.rpc("x_growth_list_experiments", {})).flatMap(r => {
      try { return [parseExperiment({ ...r, start_at: iso(r.start_at), end_at: iso(r.end_at) })]; } catch { return []; } // malformed rows are skipped, not guessed
    });
  }
  async rows(account: string, since: Date, until: Date): Promise<AnalysisRow[]> {
    return rowsOf(await this.rpc("x_growth_analysis_rows", { p_account: account, p_since: since.toISOString(), p_until: until.toISOString() })).map(r => ({
      postId: String(r.post_id), status: String(r.status), scheduledAt: iso(r.scheduled_at)!, publishedAt: iso(r.published_at), theme: (r.theme as string) ?? null,
      errorSummary: (r.error_summary as string) ?? null, experimentId: (r.experiment_id as string) ?? null, variantId: (r.variant_id as string) ?? null,
      contentStyle: (r.content_style as string) ?? null, topicId: (r.topic_id as string) ?? null, metricsEligible: r.metrics_eligible === true,
      s24: r.s24_status ? { status: String(r.s24_status), impressions: n(r.s24_impressions) } : null,
      s72: r.s72_status ? { status: String(r.s72_status), impressions: n(r.s72_impressions), likes: n(r.s72_likes), reposts: n(r.s72_reposts), replies: n(r.s72_replies), quotes: n(r.s72_quotes), bookmarks: n(r.s72_bookmarks), ageHours: n(r.s72_age_hours) } : null,
      site: r.site_visits === null || r.site_visits === undefined ? null : { visits: Number(r.site_visits), visitors: Number(r.site_visitors), signups: Number(r.site_signups) },
    }));
  }
  async createDraft(p: DraftPlan): Promise<{ experimentId: string; created: boolean }> {
    const r = rowsOf(await this.rpc("create_x_experiment_draft", { p_name: p.name, p_hypothesis: p.hypothesis, p_hypothesis_key: p.hypothesisKey, p_start: p.startAt, p_end: p.endAt, p_min_posts: p.minPostsPerVariant, p_variants: p.variants, p_seed: p.allocationSeed, p_config: p.config }))[0];
    if (!r?.experiment_id) throw new Error("growth_db_draft_failed");
    return { experimentId: String(r.experiment_id), created: r.created === true };
  }
  /** Operator action: re-validates the draft offline, then draft → running. */
  async approve(id: string): Promise<{ result: string; candidates?: Record<string, number> }> {
    const e = (await this.allExperiments()).find(x => x.id === id);
    if (!e) return { result: "not_found" };
    if (e.status !== "draft") return { result: "not_draft" };
    const days = Math.max(1, Math.round((Date.parse(e.endAt ?? e.startAt) - Date.parse(e.startAt)) / 86400000));
    const rows = previewExperiment({ ...e, status: "running" }, days, { allowDraftLibrary: false });
    const candidates = Object.fromEntries(e.variants.map(v => [v.id, rows.filter(r => r.state === "candidate" && r.variantId === v.id).length]));
    if (Object.values(candidates).some(c => c < e.minPostsPerVariant)) return { result: "not_enough_valid_candidates", candidates };
    return { result: String(await this.rpc("approve_x_experiment", { p_id: id })), candidates };
  }
  async pause(id: string): Promise<string> { return String(await this.rpc("pause_x_experiment", { p_id: id })); }
  async ops(account: string, now: Date): Promise<OpsSummary | null> { return parseOps(await this.rpc("x_growth_ops_summary", { p_account: account, p_now: now.toISOString() })); }
  async history(since: Date): Promise<HistoryEntry[]> {
    return rowsOf(await this.rpc("x_growth_review_history", { p_since: since.toISOString() })).map(r => ({ hypothesisKey: (r.hypothesis_key as string) ?? null, status: r.status as HistoryEntry["status"], leaderStyle: (r.leader_style as string) ?? null, otherStyle: (r.other_style as string) ?? null, periodEnd: iso(r.period_end)! }));
  }
  async outcomes(since: Date): Promise<HypothesisOutcome[]> {
    return rowsOf(await this.rpc("x_growth_hypothesis_outcomes", { p_since: since.toISOString() })).map(r => ({ key: String(r.hypothesis_key), outcome: r.outcome as HypothesisOutcome["outcome"], decidedAt: iso(r.decided_at)! }));
  }
  async save(report: WeeklyReport): Promise<{ summary: { reviewId: string; created: boolean }; experiments: { experimentId: string; reviewId: string; created: boolean }[] }> {
    const d = report.data;
    const call = async (experimentId: string | null, body: unknown, decision: string, action: string | null, hypotheses: unknown[] | null) => {
      const r = rowsOf(await this.rpc("save_x_growth_review", { p_period_start: d.periodStart, p_period_end: d.periodEnd, p_experiment: experimentId, p_report: body, p_decision: decision, p_action: action, p_ai: report.aiText ?? null, p_version: REPORT_VERSION, p_hypotheses: hypotheses }))[0];
      if (!r?.review_id) throw new Error("growth_db_save_failed");
      return { reviewId: String(r.review_id), created: r.created === true };
    };
    // Summary row first (holds the hypotheses), then one row per experiment with its decision.
    const summary = await call(null, { ...d, markdown: report.markdown }, d.experiments.some(e => e.dbDecision === "propose_change") ? "propose_change" : "continue", null, d.hypotheses);
    const experiments = [];
    for (const e of d.experiments) {
      const lead = e.arms.find(a => a.variantId === e.effect.leader), other = e.arms.find(a => a.variantId !== e.effect.leader);
      experiments.push({ experimentId: e.experimentId, ...(await call(e.experimentId, { ...e, leaderStyle: lead?.contentStyle ?? null, otherStyle: e.effect.leader ? other?.contentStyle ?? null : null }, e.dbDecision, e.action, null)) });
    }
    return { summary, experiments };
  }
}

export type WeeklyOptions = { account: string; now: Date; save: boolean; complete?: Complete; budgets?: Budgets; autoDraft?: boolean };
/** Period = the 7 JST days ending at the most recent Monday 00:00 JST. */
export function weeklyPeriod(now: Date): { start: Date; end: Date } {
  const jst = new Date(now.getTime() + 9 * 3600000);
  const daysSinceMonday = (jst.getUTCDay() + 6) % 7;
  const end = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - daysSinceMonday) - 9 * 3600000;
  return { start: new Date(end - 7 * 86400000), end: new Date(end) };
}

export async function runWeekly(store: GrowthStore, o: WeeklyOptions): Promise<{ report: WeeklyReport; saved: Awaited<ReturnType<GrowthStore["save"]>> | null }> {
  const { start, end } = weeklyPeriod(o.now);
  const all = await store.allExperiments();
  const experiments = all.filter(e => e.status !== "draft");
  const since = new Date(Math.min(start.getTime(), ...experiments.map(e => Date.parse(e.startAt))) - 86400000);
  const [rows, history, outcomes, ops] = await Promise.all([store.rows(o.account, since, end), store.history(new Date(o.now.getTime() - 365 * 86400000)), store.outcomes(new Date(o.now.getTime() - 365 * 86400000)), store.ops(o.account, o.now)]);
  const tested = experiments.map(e => ({ a: e.variants[0].contentStyle, b: e.variants[1].contentStyle, factor: experimentFactor(e) }));
  const report = buildWeeklyReport({ now: o.now, periodStart: start, periodEnd: end, experiments, rows, history, outcomes, tested, ops, budgets: o.budgets });
  // Next experiment draft (never activated here). Created only when auto-draft AND save are on.
  const decision = planNextDraft(report.data.hypotheses, all, o.now);
  report.data.draft = { reason: decision.reason, plan: decision.plan, created: null, experimentId: null };
  if (decision.plan && o.autoDraft && o.save) {
    const d = await store.createDraft(decision.plan);
    report.data.draft = { ...report.data.draft, created: d.created, experimentId: d.experimentId };
  }
  report.markdown = renderMarkdown(report.data);
  if (o.complete) {
    const ai = await interpret(report, o.complete);
    report.aiText = ai.text; report.aiRejected = ai.rejected;
    report.markdown = renderMarkdown(report.data, ai);
  }
  return { report, saved: o.save ? await store.save(report) : null };
}
