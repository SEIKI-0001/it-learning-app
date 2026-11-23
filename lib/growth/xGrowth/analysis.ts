import { hash32, factById } from "@/lib/growth/xGrowth/topics";
import { experimentFactor, type Experiment } from "@/lib/growth/xGrowth/experiment";

/**
 * P3 analysis. Pure and deterministic (seeded bootstrap). Rules decide; nothing here calls an LLM.
 * Missing data is never treated as zero; a real 0 impressions is a valid observation.
 */
export type Snapshot72 = { status: string; impressions: number | null; likes: number | null; reposts: number | null; replies: number | null; quotes: number | null; bookmarks: number | null; ageHours: number | null };
export type AnalysisRow = {
  postId: string; status: string; scheduledAt: string; publishedAt: string | null; theme: string | null; errorSummary: string | null;
  experimentId: string | null; variantId: string | null; contentStyle: string | null; topicId: string | null; metricsEligible: boolean;
  s24: { status: string; impressions: number | null } | null; s72: Snapshot72 | null;
  site: { visits: number; visitors: number; signups: number } | null;
};
export const POLICY = {
  maxMissingRate: 0.3,         // per arm, among posts whose 72h window has closed
  windowClosedHours: 88,       // 72h snapshot window is [70, 88)
  weekdayImbalance: 0.25,      // max |share_A - share_B| for any weekday (only when n >= 7 per arm)
  hourGapHours: 2,             // median publish-hour difference between arms
  categoryTvd: 0.4,            // total-variation distance of topic categories between arms
  bootstrap: 2000,
  outlierIqr: 3,               // on log1p scale
} as const;

export type Dist = { n: number; zeros: number; median: number | null; mean: number | null; geoMean: number | null; q1: number | null; q3: number | null; min: number | null; max: number | null; outliers: number };
export type ArmStats = {
  variantId: string; contentStyle: string; assigned: number; published: number; failed: number; pending: number; closed: number; valid: number; missing: number; missingRate: number | null;
  missingReasons: Record<string, number>; impressions72h: Dist; impressions24h: Dist; engagements72h: Dist; engagementRateMedian: number | null;
  site: { posts: number; visits: number; visitors: number; signups: number; signupPerVisitor: number | null };
  weekdays: number[]; publishHourMedian: number | null; categories: Record<string, number>;
};
export type ExperimentStatus = "insufficient_data" | "data_quality_issue" | "biased" | "no_clear_difference" | "outlier_sensitive" | "exploratory_lead" | "validated_lead";
export type Action = "continue" | "pause" | "repeat" | "replace" | "propose_adoption";
export type ExperimentResult = {
  experimentId: string; name: string; hypothesisKey: string | null; experimentStatus: Experiment["status"]; ended: boolean; factor: string; arms: [ArmStats, ArmStats];
  effect: { metric: "log_ratio_median_impressions_72h"; ratio: number | null; ci95: [number, number] | null; ratioExcludingOutliers: number | null; ci95ExcludingOutliers: [number, number] | null; leader: string | null };
  biasFlags: string[]; status: ExperimentStatus; action: Action; dbDecision: "continue" | "inconclusive" | "propose_change" | "stop"; reasons: string[];
};
export type Reliability = { scheduled: number; published: number; failed: number; uncertain: number; cancelled: number; other: number; successRate: number | null; failureReasons: Record<string, number>; metricsClosed: number; metricsOk: number; metricsMissingRate: number | null };

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
function quantile(s: number[], q: number): number | null {
  if (!s.length) return null;
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
const round = (x: number | null, d = 2) => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
export function dist(values: number[]): Dist {
  const s = sorted(values);
  if (!s.length) return { n: 0, zeros: 0, median: null, mean: null, geoMean: null, q1: null, q3: null, min: null, max: null, outliers: 0 };
  return {
    n: s.length, zeros: s.filter(x => x === 0).length, median: round(quantile(s, 0.5)), mean: round(s.reduce((a, b) => a + b, 0) / s.length),
    geoMean: round(Math.exp(s.reduce((a, b) => a + Math.log1p(b), 0) / s.length) - 1), q1: round(quantile(s, 0.25)), q3: round(quantile(s, 0.75)),
    min: s[0], max: s[s.length - 1], outliers: outlierMask(s).filter(Boolean).length,
  };
}
/** Outliers on log1p scale beyond Q1/Q3 ± k·IQR (heavy-tailed impressions). */
export function outlierMask(values: number[]): boolean[] {
  const l = values.map(v => Math.log1p(v));
  const s = sorted(l);
  const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75);
  if (q1 === null || q3 === null || values.length < 4) return values.map(() => false);
  const iqr = q3 - q1;
  return l.map(x => x < q1 - POLICY.outlierIqr * iqr || x > q3 + POLICY.outlierIqr * iqr);
}

function mulberry32(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const med = (xs: number[]) => quantile(sorted(xs), 0.5)!;
/** Percentile bootstrap CI of log((median_B+1)/(median_A+1)). Deterministic for a given seed. */
export function bootstrapLogRatio(a: number[], b: number[], seed: string, iterations: number = POLICY.bootstrap): { point: number; ci: [number, number] } | null {
  if (a.length < 2 || b.length < 2) return null;
  const rnd = mulberry32(hash32(seed));
  const pick = (xs: number[]) => xs.map(() => xs[Math.floor(rnd() * xs.length)]);
  const stats: number[] = [];
  for (let i = 0; i < iterations; i++) stats.push(Math.log((med(pick(b)) + 1) / (med(pick(a)) + 1)));
  const s = sorted(stats);
  return { point: Math.log((med(b) + 1) / (med(a) + 1)), ci: [quantile(s, 0.025)!, quantile(s, 0.975)!] };
}

const jstWeekday = (iso: string) => new Date(Date.parse(iso) + 9 * 3600000).getUTCDay();
const jstHour = (iso: string) => { const d = new Date(Date.parse(iso) + 9 * 3600000); return d.getUTCHours() + d.getUTCMinutes() / 60; };
const engagements = (s: Snapshot72) => [s.likes, s.reposts, s.replies, s.quotes, s.bookmarks].some(v => v === null) ? null : (s.likes! + s.reposts! + s.replies! + s.quotes! + s.bookmarks!);
const closedAt = (r: AnalysisRow, now: Date) => r.publishedAt !== null && (now.getTime() - Date.parse(r.publishedAt)) / 3600000 >= POLICY.windowClosedHours;

function armStats(rows: AnalysisRow[], variantId: string, contentStyle: string, now: Date): ArmStats & { values: number[] } {
  const arm = rows.filter(r => r.variantId === variantId);
  const published = arm.filter(r => r.status === "published" && r.publishedAt);
  const ok = published.filter(r => r.metricsEligible && r.s72?.status === "ok" && r.s72.impressions !== null);
  const closedOrMeasured = published.filter(r => r.s72 !== null || closedAt(r, now));
  const missingRows = closedOrMeasured.filter(r => !ok.includes(r));
  const missingReasons: Record<string, number> = {};
  for (const r of missingRows) { const k = r.s72 ? `${r.s72.status}` : "not_collected"; missingReasons[k] = (missingReasons[k] ?? 0) + 1; }
  const values = ok.map(r => r.s72!.impressions!);
  const eng = ok.map(r => engagements(r.s72!)).filter((x): x is number => x !== null);
  const er = ok.filter(r => r.s72!.impressions! > 0 && engagements(r.s72!) !== null).map(r => engagements(r.s72!)! / r.s72!.impressions!);
  const site = published.filter(r => r.site);
  const visitors = site.reduce((a, r) => a + r.site!.visitors, 0), signups = site.reduce((a, r) => a + r.site!.signups, 0);
  const weekdays = [0, 0, 0, 0, 0, 0, 0]; for (const r of published) weekdays[jstWeekday(r.scheduledAt)]++;
  const categories: Record<string, number> = {}; for (const r of published) { const c = (r.topicId && factById(r.topicId)?.category) || "unknown"; categories[c] = (categories[c] ?? 0) + 1; }
  const hours = published.map(r => jstHour(r.publishedAt!));
  return {
    variantId, contentStyle, assigned: arm.length, published: published.length, failed: arm.filter(r => ["failed", "uncertain", "cancelled"].includes(r.status)).length,
    pending: published.length - closedOrMeasured.length, closed: closedOrMeasured.length, valid: ok.length, missing: missingRows.length,
    missingRate: closedOrMeasured.length ? round(missingRows.length / closedOrMeasured.length, 3) : null, missingReasons,
    impressions72h: dist(values), impressions24h: dist(published.filter(r => r.s24?.status === "ok" && r.s24.impressions !== null).map(r => r.s24!.impressions!)),
    engagements72h: dist(eng), engagementRateMedian: er.length ? round(med(er), 4) : null,
    site: { posts: site.length, visits: site.reduce((a, r) => a + r.site!.visits, 0), visitors, signups, signupPerVisitor: visitors ? round(signups / visitors, 3) : null },
    weekdays, publishHourMedian: hours.length ? round(med(hours), 1) : null, categories, values,
  };
}

function biasFlags(a: ArmStats, b: ArmStats, minN: number, factor: string): string[] {
  const flags: string[] = [];
  if (a.published >= Math.min(7, minN) && b.published >= Math.min(7, minN)) {
    const share = (x: ArmStats) => x.weekdays.map(w => w / Math.max(x.published, 1));
    const sa = share(a), sb = share(b);
    if (sa.some((v, i) => Math.abs(v - sb[i]) > POLICY.weekdayImbalance)) flags.push("weekday_imbalance");
  }
  // In a posting-time experiment the time gap IS the treatment, not a bias.
  if (factor !== "postTime" && a.publishHourMedian !== null && b.publishHourMedian !== null && Math.abs(a.publishHourMedian - b.publishHourMedian) >= POLICY.hourGapHours) flags.push("publish_time_gap");
  const cats = new Set([...Object.keys(a.categories), ...Object.keys(b.categories)]);
  const tvd = [...cats].reduce((s, c) => s + Math.abs((a.categories[c] ?? 0) / Math.max(a.published, 1) - (b.categories[c] ?? 0) / Math.max(b.published, 1)), 0) / 2;
  if (a.published && b.published && tvd > POLICY.categoryTvd) flags.push("topic_mix_imbalance");
  return flags;
}

export type HistoryEntry = { hypothesisKey: string | null; status: ExperimentStatus; leaderStyle: string | null; otherStyle: string | null; periodEnd: string };

/** Classifies an experiment strictly by rule. Never names a winner without replication. */
export function analyzeExperiment(exp: Experiment, rows: AnalysisRow[], now: Date, history: HistoryEntry[] = []): ExperimentResult {
  const mine = rows.filter(r => r.experimentId === exp.id);
  const [ra, rb] = exp.variants.map(v => armStats(mine, v.id, v.contentStyle, now));
  const strip = (x: ArmStats & { values: number[] }): ArmStats => { const s: Partial<ArmStats & { values: number[] }> = { ...x }; delete s.values; return s as ArmStats; };
  const ended = exp.status === "completed" || (exp.endAt !== null && now.getTime() >= Date.parse(exp.endAt));
  const reasons: string[] = [];
  const boot = bootstrapLogRatio(ra.values, rb.values, exp.id);
  const ma = outlierMask(ra.values), mb = outlierMask(rb.values);
  const bootTrim = bootstrapLogRatio(ra.values.filter((_, i) => !ma[i]), rb.values.filter((_, i) => !mb[i]), `${exp.id}:trim`);
  const sig = (x: { ci: [number, number] } | null) => (x ? (x.ci[0] > 0 ? 1 : x.ci[1] < 0 ? -1 : 0) : 0);
  const flags = biasFlags(ra, rb, exp.minPostsPerVariant, experimentFactor(exp));
  let status: ExperimentStatus;
  // Missing data first: when collection is broken, "too few samples" is a symptom, not the cause.
  if ((ra.missingRate ?? 0) > POLICY.maxMissingRate || (rb.missingRate ?? 0) > POLICY.maxMissingRate) { status = "data_quality_issue"; reasons.push("missing_rate_above_limit"); }
  else if (ra.valid < exp.minPostsPerVariant || rb.valid < exp.minPostsPerVariant) { status = "insufficient_data"; reasons.push(`valid_samples_below_minimum:${ra.valid}/${rb.valid}<${exp.minPostsPerVariant}`); }
  else if (flags.length) { status = "biased"; reasons.push(...flags); }
  else if (sig(boot) === 0) { status = "no_clear_difference"; reasons.push("ci_includes_zero"); }
  else if (sig(bootTrim) !== sig(boot)) { status = "outlier_sensitive"; reasons.push("conclusion_changes_without_outliers"); }
  else {
    const leader = sig(boot) > 0 ? exp.variants[1] : exp.variants[0];
    const other = sig(boot) > 0 ? exp.variants[0] : exp.variants[1];
    const replicated = history.some(h => h.hypothesisKey !== null && h.hypothesisKey === exp.hypothesisKey && (h.status === "exploratory_lead" || h.status === "validated_lead") && h.leaderStyle === leader.contentStyle && h.otherStyle === other.contentStyle);
    status = replicated ? "validated_lead" : "exploratory_lead";
    reasons.push(replicated ? "replicated_in_earlier_experiment" : "single_experiment_exploratory_only");
  }
  const leader = status === "exploratory_lead" || status === "validated_lead" ? (sig(boot) > 0 ? exp.variants[1].id : exp.variants[0].id) : null;
  let action: Action;
  if (status === "insufficient_data") action = ended ? (history.some(h => h.hypothesisKey === exp.hypothesisKey && h.status === "insufficient_data") ? "replace" : "repeat") : "continue";
  else if (status === "data_quality_issue") action = "pause";
  else if (status === "biased" || status === "outlier_sensitive" || status === "exploratory_lead") action = ended ? "repeat" : "continue";
  else if (status === "validated_lead") action = "propose_adoption";
  else action = ended ? "replace" : "continue";
  const dbDecision = action === "continue" ? "continue" : action === "pause" ? "stop" : status === "exploratory_lead" || status === "validated_lead" ? "propose_change" : "inconclusive";
  const ratio = (x: { point: number } | null) => (x ? round(Math.exp(x.point), 3) : null);
  const ci = (x: { ci: [number, number] } | null): [number, number] | null => (x ? [round(Math.exp(x.ci[0]), 3)!, round(Math.exp(x.ci[1]), 3)!] : null);
  return {
    experimentId: exp.id, name: exp.name, hypothesisKey: exp.hypothesisKey, experimentStatus: exp.status, ended, factor: experimentFactor(exp), arms: [strip(ra), strip(rb)],
    effect: { metric: "log_ratio_median_impressions_72h", ratio: ratio(boot), ci95: ci(boot), ratioExcludingOutliers: ratio(bootTrim), ci95ExcludingOutliers: ci(bootTrim), leader },
    biasFlags: flags, status, action, dbDecision, reasons,
  };
}

export function reliability(rows: AnalysisRow[], now: Date): Reliability {
  const by = (s: string) => rows.filter(r => r.status === s).length;
  const failed = by("failed"), uncertain = by("uncertain"), published = by("published");
  const failureReasons: Record<string, number> = {};
  for (const r of rows.filter(r => r.status === "failed" || r.status === "uncertain")) { const k = r.errorSummary && /^[a-z0-9_:]{1,80}$/.test(r.errorSummary) ? r.errorSummary : "unknown"; failureReasons[k] = (failureReasons[k] ?? 0) + 1; }
  const pub = rows.filter(r => r.status === "published" && r.publishedAt);
  const closed = pub.filter(r => r.s72 !== null || closedAt(r, now));
  const ok = closed.filter(r => r.s72?.status === "ok");
  return {
    scheduled: rows.length, published, failed, uncertain, cancelled: by("cancelled"), other: rows.length - published - failed - uncertain - by("cancelled"),
    successRate: published + failed + uncertain ? round(published / (published + failed + uncertain), 3) : null, failureReasons,
    metricsClosed: closed.length, metricsOk: ok.length, metricsMissingRate: closed.length ? round(1 - ok.length / closed.length, 3) : null,
  };
}

/** Non-experiment posts of the period (context only, never compared with an arm). */
export function baseline(rows: AnalysisRow[]): Dist {
  return dist(rows.filter(r => !r.experimentId && r.status === "published" && r.s72?.status === "ok" && r.s72.impressions !== null).map(r => r.s72!.impressions!));
}
