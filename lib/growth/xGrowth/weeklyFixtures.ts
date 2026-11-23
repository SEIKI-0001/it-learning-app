import type { AnalysisRow } from "@/lib/growth/xGrowth/analysis";
import { assignVariant, sharedTopicPool, type Experiment } from "@/lib/growth/xGrowth/experiment";
import { hash32 } from "@/lib/growth/xGrowth/topics";

/**
 * Deterministic SYNTHETIC datasets for offline weekly reports and tests. Not real account data.
 * Impressions follow a log-normal shape (small accounts: heavy right tail).
 */
export type Scenario = "realistic" | "empty" | "incomplete" | "biased" | "outlier" | "lead" | "high_missing";
export const SCENARIOS: Scenario[] = ["realistic", "empty", "incomplete", "biased", "outlier", "lead", "high_missing"];
type Params = { days: number; nowOffsetDays: number; medA: number; medB: number; sigma: number; missing: number; failures: number; hourA: number; hourB: number; outlier?: number };
const P: Record<Exclude<Scenario, "empty">, Params> = {
  realistic: { days: 28, nowOffsetDays: 33, medA: 14, medB: 17, sigma: 0.6, missing: 0.08, failures: 2, hourA: 11, hourB: 11 },
  incomplete: { days: 10, nowOffsetDays: 12, medA: 14, medB: 17, sigma: 0.6, missing: 0.1, failures: 1, hourA: 11, hourB: 11 },
  biased: { days: 28, nowOffsetDays: 33, medA: 14, medB: 17, sigma: 0.5, missing: 0.05, failures: 0, hourA: 10.5, hourB: 21 },
  outlier: { days: 28, nowOffsetDays: 33, medA: 15, medB: 15, sigma: 0.35, missing: 0, failures: 0, hourA: 11, hourB: 11, outlier: 5000 },
  lead: { days: 28, nowOffsetDays: 33, medA: 10, medB: 30, sigma: 0.3, missing: 0.04, failures: 0, hourA: 11, hourB: 11 },
  high_missing: { days: 28, nowOffsetDays: 33, medA: 14, medB: 17, sigma: 0.6, missing: 0.45, failures: 1, hourA: 11, hourB: 11 },
};

function rng(seed: string) { let s = hash32(seed) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1_000_000) / 1_000_000; }; }

export function scenarioData(scenario: Scenario, exp: Experiment): { now: Date; rows: AnalysisRow[]; experiments: Experiment[] } {
  const start = Date.parse(exp.startAt);
  if (scenario === "empty") return { now: new Date(start + 33 * 86400000), rows: [], experiments: [] };
  const p = P[scenario];
  const rnd = rng(`${scenario}:${exp.id}`);
  const normal = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const pool = sharedTopicPool(exp, { allowDraftLibrary: false });
  const running = scenario === "incomplete" ? { ...exp, endAt: exp.endAt } : exp;
  const rows: AnalysisRow[] = [];
  let failuresLeft = p.failures;
  let outlierDone = false;
  const now = start + p.nowOffsetDays * 86400000;
  for (let d = 0; d < p.days; d++) {
    const slot = new Date(start + d * 86400000 + 7 * 3600000).toISOString();
    const a = assignVariant(exp, slot)!;
    const isB = a.variant.id === exp.variants[1].id;
    const fail = failuresLeft > 0 && d % 9 === 4;
    if (fail) failuresLeft--;
    const hour = isB ? p.hourB : p.hourA;
    const publishedAt = fail ? null : new Date(start + d * 86400000 + hour * 3600000 + Math.floor(rnd() * 40) * 60000).toISOString();
    let imp = Math.max(0, Math.round((isB ? p.medB : p.medA) * Math.exp(p.sigma * normal())));
    if (p.outlier && isB && d >= 15 && !outlierDone) { imp = p.outlier; outlierDone = true; }
    const ageH = publishedAt ? (now - Date.parse(publishedAt)) / 3600000 : 0;
    const missing = !fail && rnd() < p.missing;
    const likes = Math.floor(imp * 0.03 * rnd() * 2);
    rows.push({
      postId: `00000000-0000-4000-8000-${String(d).padStart(12, "0")}`, status: fail ? "failed" : "published", scheduledAt: slot, publishedAt,
      theme: "terms", errorSummary: fail ? "quality_check_failed_duplicate_content" : null, experimentId: exp.id, variantId: a.variant.id, contentStyle: a.variant.contentStyle,
      topicId: pool[d % pool.length].topicId, metricsEligible: !fail,
      s24: fail || ageH < 22 ? null : { status: "ok", impressions: Math.round(imp * 0.8) },
      s72: fail || ageH < 70 ? null : missing ? { status: "unavailable", impressions: null, likes: null, reposts: null, replies: null, quotes: null, bookmarks: null, ageHours: null }
        : { status: "ok", impressions: imp, likes, reposts: 0, replies: 0, quotes: 0, bookmarks: rnd() < 0.2 ? 1 : 0, ageHours: 73 + Math.round(rnd() * 8) },
      site: fail ? null : { visits: rnd() < 0.1 ? 1 : 0, visitors: rnd() < 0.1 ? 1 : 0, signups: 0 },
    });
  }
  // A few non-experiment posts in the same weeks (context only).
  rows.push({ postId: "00000000-0000-4000-8000-999999999999", status: "published", scheduledAt: new Date(start - 86400000 + 7 * 3600000).toISOString(), publishedAt: new Date(start - 86400000 + 11 * 3600000).toISOString(), theme: "study", errorSummary: null, experimentId: null, variantId: null, contentStyle: null, topicId: null, metricsEligible: false, s24: null, s72: { status: "ok", impressions: 0, likes: 0, reposts: 0, replies: 0, quotes: 0, bookmarks: 0, ageHours: 75 }, site: { visits: 0, visitors: 0, signups: 0 } });
  return { now: new Date(now), rows, experiments: [running] };
}
