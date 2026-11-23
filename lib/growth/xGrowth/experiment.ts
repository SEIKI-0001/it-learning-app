import { contentKeys, similar, validLength, type Generated, type Theme } from "@/lib/growth/xPosting/core";
import { getStyle, STYLES, type StyleContext } from "@/lib/growth/xGrowth/styles";
import { acronymFacts, factById, hash32, topicUsed, type TopicFact } from "@/lib/growth/xGrowth/topics";

/**
 * P2 experiment model: exactly two variants, each a content style. Assignment is computed by code
 * from the slot date and the experiment seed — never by an LLM. Topics come from the pool that
 * BOTH styles support, chosen independently of the variant, so topic mix cannot bias the result.
 */
export const GENERATION_VERSION = "xg-p2-v1";
export type Variant = { id: string; contentStyle: string };
export type Experiment = {
  id: string; name: string; hypothesisKey: string | null; status: "draft" | "approved" | "running" | "paused" | "completed";
  startAt: string; endAt: string | null; minPostsPerVariant: number; variants: [Variant, Variant]; allocationSeed: string;
  version: string; eligibleThemes: Theme[];
};
export type ExperimentMeta = { experimentId: string; variantId: string; contentStyle: string; topicId: string; generationVersion: string };
export type ExperimentPost = Generated & { experiment: ExperimentMeta };
export type Assignment = { variant: Variant; dayIndex: number; week: number };

const DEFAULT_THEMES: Theme[] = ["terms", "question", "trick", "challenge"];
const THEMES_ALLOWED: Theme[] = ["service", "question", "terms", "trick", "study", "challenge", "knowhow"];
// Exam/service claims and engagement bait that no approved fact needs.
export const PROHIBITED = /(合格率|合格保証|必ず(受かる|合格)|絶対に?受かる|100\s*[%％]|最新|速報|今だけ|限定|フォロー|リポスト|拡散|いいね|@[A-Za-z0-9_]|https?:\/\/)/u;

/** Validates a DB row (snake_case) or a fixture object into an Experiment. Throws fixed tags. */
export function parseExperiment(row: Record<string, unknown>): Experiment {
  const variants = row.variants as Variant[] | undefined;
  const config = (row.config ?? {}) as { eligibleThemes?: Theme[] };
  const startAt = String(row.start_at ?? row.startAt ?? "");
  const endRaw = row.end_at ?? row.endAt ?? null;
  const exp: Experiment = {
    id: String(row.id ?? ""), name: String(row.name ?? ""), hypothesisKey: (row.hypothesis_key ?? row.hypothesisKey ?? null) as string | null,
    status: String(row.status ?? "") as Experiment["status"], startAt, endAt: endRaw === null ? null : String(endRaw),
    minPostsPerVariant: Number(row.min_posts_per_variant ?? row.minPostsPerVariant ?? 14), variants: variants as [Variant, Variant],
    allocationSeed: String(row.allocation_seed ?? row.allocationSeed ?? ""), version: String(row.experiment_version ?? row.version ?? "v1"),
    eligibleThemes: config.eligibleThemes ?? DEFAULT_THEMES,
  };
  if (!/^[0-9a-f-]{36}$/i.test(exp.id) || !exp.allocationSeed || !Number.isFinite(Date.parse(exp.startAt)) || (exp.endAt !== null && !(Date.parse(exp.endAt) > Date.parse(exp.startAt)))) throw new Error("invalid_experiment");
  if (!Array.isArray(variants) || variants.length !== 2 || variants.some(v => !/^[A-Za-z0-9_-]{1,64}$/.test(v?.id ?? "") || !STYLES[v.contentStyle]) || variants[0].id === variants[1].id || variants[0].contentStyle === variants[1].contentStyle) throw new Error("invalid_experiment_variants");
  if (!exp.eligibleThemes.length || exp.eligibleThemes.some(t => !THEMES_ALLOWED.includes(t))) throw new Error("invalid_experiment_themes");
  if (!Number.isInteger(exp.minPostsPerVariant) || exp.minPostsPerVariant < 1) throw new Error("invalid_experiment");
  return exp;
}

const jstDay = (iso: string) => Math.floor((Date.parse(iso) + 9 * 3600000) / 86400000);

/**
 * Deterministic, weekday-balanced allocation: variant = ((d mod 7) + floor(d/7) + seedBit) mod 2.
 * Within a week the arms alternate; the next week the pattern flips, so over every 14 days each
 * weekday receives each arm exactly once. Returns null outside the experiment period.
 */
export function assignVariant(exp: Experiment, slot: string): Assignment | null {
  const t = Date.parse(slot);
  if (!Number.isFinite(t) || t < Date.parse(exp.startAt) || (exp.endAt !== null && t >= Date.parse(exp.endAt))) return null;
  const dayIndex = jstDay(slot) - jstDay(exp.startAt);
  const week = Math.floor(dayIndex / 7);
  const seedBit = hash32(exp.allocationSeed) & 1;
  return { variant: exp.variants[((dayIndex % 7) + week + seedBit) % 2], dayIndex, week };
}

/** Topics usable by BOTH arms (independent of the assigned arm), in a seed-stable order. */
export function sharedTopicPool(exp: Experiment, ctx: StyleContext): TopicFact[] {
  const styles = exp.variants.map(v => getStyle(v.contentStyle));
  return acronymFacts()
    .filter(f => styles.every(s => s.supports(f, ctx) && s.render(f, ctx).some(t => validLength(t) && !PROHIBITED.test(t))))
    .sort((a, b) => hash32(exp.allocationSeed + a.topicId) - hash32(exp.allocationSeed + b.topicId) || a.topicId.localeCompare(b.topicId));
}

function acceptable(texts: string[], history: string[]): string[] {
  const used = history.map(contentKeys);
  return texts.filter(t => validLength(t) && !PROHIBITED.test(t) && !used.some(k => similar(k, contentKeys(t))));
}

const storedTheme = (slotTheme: Theme): Theme => (slotTheme === "challenge" ? "challenge" : "terms");

/** Builds the post for the assigned arm. Throws a fixed tag when no acceptable candidate exists. */
export function buildExperimentPost(exp: Experiment, slot: string, slotTheme: Theme, history: string[], ctx: StyleContext): ExperimentPost {
  if (exp.status !== "running") throw new Error("experiment_not_running");
  if (!exp.eligibleThemes.includes(slotTheme)) throw new Error("experiment_theme_not_eligible");
  const a = assignVariant(exp, slot);
  if (!a) throw new Error("experiment_outside_period");
  const pool = sharedTopicPool(exp, ctx).filter(f => !topicUsed(f, history));
  if (!pool.length) throw new Error("experiment_no_unused_topic");
  const style = getStyle(a.variant.contentStyle);
  // Rotate by day so consecutive slots walk the pool; the choice ignores the arm.
  for (let i = 0; i < pool.length; i++) {
    const f = pool[(a.dayIndex + i) % pool.length];
    const texts = acceptable(style.render(f, ctx), history);
    if (!texts.length) continue;
    const text = texts[hash32(slot) % texts.length];
    return {
      text, theme: storedTheme(slotTheme), contentId: `${a.variant.contentStyle}-${f.id}`, destinationUrl: null, evidence: [f.evidence],
      quality: { passed: true, reasons: ["template_from_approved_facts"] },
      experiment: { experimentId: exp.id, variantId: a.variant.id, contentStyle: a.variant.contentStyle, topicId: f.topicId, generationVersion: GENERATION_VERSION },
    };
  }
  throw new Error("experiment_no_valid_candidate");
}

/**
 * LLM-independent validation: recompute the assignment and the approved texts for the claimed
 * topic, and require an exact match plus length, duplicate and prohibited-content checks.
 */
export function validateExperimentPost(raw: unknown, exp: Experiment, slot: string, slotTheme: Theme, history: string[], ctx: StyleContext): ExperimentPost {
  const r = raw as Partial<ExperimentPost> | null;
  const m = r?.experiment;
  if (!r || typeof r.text !== "string" || !m || typeof m !== "object") throw new Error("invalid_schema");
  const a = assignVariant(exp, slot);
  if (!a || exp.status !== "running" || !exp.eligibleThemes.includes(slotTheme)) throw new Error("experiment_not_applicable");
  if (m.experimentId !== exp.id || m.variantId !== a.variant.id || m.contentStyle !== a.variant.contentStyle || m.generationVersion !== GENERATION_VERSION) throw new Error("experiment_metadata_mismatch");
  const f = typeof m.topicId === "string" ? factById(m.topicId) : undefined;
  if (!f || !sharedTopicPool(exp, ctx).some(p => p.topicId === f.topicId)) throw new Error("unsupported_topic");
  if (!getStyle(m.contentStyle).render(f, ctx).includes(r.text)) throw new Error("unsupported_content");
  if (r.destinationUrl !== null || r.theme !== storedTheme(slotTheme) || r.contentId !== `${m.contentStyle}-${f.id}` || JSON.stringify(r.evidence) !== JSON.stringify([f.evidence])) throw new Error("unsupported_content");
  if (!validLength(r.text)) throw new Error("invalid_length");
  if (PROHIBITED.test(r.text)) throw new Error("prohibited_content");
  if (topicUsed(f, history) || history.some(t => similar(contentKeys(t), contentKeys(r.text as string)))) throw new Error("duplicate_content");
  return r as ExperimentPost;
}
