import { buildPostUrl, contentKeys, similar, validLength, type Generated, type Theme } from "@/lib/growth/xPosting/core";
import { getStyle, STYLES, type StyleContext } from "@/lib/growth/xGrowth/styles";
import { acronymFacts, factById, hash32, topicUsed, type TopicFact } from "@/lib/growth/xGrowth/topics";

/**
 * P2 experiment model: exactly two variants, each a content style. Assignment is computed by code
 * from the slot date and the experiment seed — never by an LLM. Topics come from the pool that
 * BOTH styles support, chosen independently of the variant, so topic mix cannot bias the result.
 */
export const GENERATION_VERSION = "xg-p2-v1";
/**
 * A variant is a content style plus optional factors. The two arms must differ in EXACTLY ONE
 * factor (style, link, or posting time) so any difference has a single candidate cause.
 *  - withLink: append the topic's own glossary page (/words/<id>) with UTM; costs more on X.
 *  - postTimeJst: the arm is only posted from that slot time (needs that time in X_POST_TIMES_JST).
 */
export type Variant = { id: string; contentStyle: string; withLink?: boolean; postTimeJst?: string };
export type Factor = "contentStyle" | "withLink" | "postTime";
/** Link experiments need the row's UTM id and the site origin. */
export type BuildContext = StyleContext & { origin?: string; utmContent?: string };
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
  if (!Array.isArray(variants) || variants.length !== 2 || variants.some(v => !/^[A-Za-z0-9_-]{1,64}$/.test(v?.id ?? "") || !STYLES[v.contentStyle]
    || (v.withLink !== undefined && typeof v.withLink !== "boolean") || (v.postTimeJst !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.postTimeJst))) || variants[0].id === variants[1].id) throw new Error("invalid_experiment_variants");
  const diffs = [variants[0].contentStyle !== variants[1].contentStyle, !!variants[0].withLink !== !!variants[1].withLink, (variants[0].postTimeJst ?? null) !== (variants[1].postTimeJst ?? null)].filter(Boolean).length;
  if (diffs !== 1) throw new Error("invalid_experiment_one_factor");
  if ((variants[0].postTimeJst === undefined) !== (variants[1].postTimeJst === undefined)) throw new Error("invalid_experiment_variants");
  if (!exp.eligibleThemes.length || exp.eligibleThemes.some(t => !THEMES_ALLOWED.includes(t))) throw new Error("invalid_experiment_themes");
  if (!Number.isInteger(exp.minPostsPerVariant) || exp.minPostsPerVariant < 1) throw new Error("invalid_experiment");
  return exp;
}

const jstDay = (iso: string) => Math.floor((Date.parse(iso) + 9 * 3600000) / 86400000);
export function experimentFactor(exp: Experiment): Factor {
  const [a, b] = exp.variants;
  return a.contentStyle !== b.contentStyle ? "contentStyle" : !!a.withLink !== !!b.withLink ? "withLink" : "postTime";
}
const jstHHMM = (iso: string) => new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(11, 16);
/** For time experiments: false when this slot is not the assigned arm's posting time (skip before claiming). */
export function slotMatchesAssignedTime(exp: Experiment, slot: string, slotTheme: Theme): boolean {
  const a = assignVariant(exp, slot);
  if (!a || exp.status !== "running" || !exp.eligibleThemes.includes(slotTheme) || !a.variant.postTimeJst) return true;
  return jstHHMM(slot) === a.variant.postTimeJst;
}
const TAG_LINE = "\n#ITパスポート";
const PLACEHOLDER_URL = "https://example.com/words/placeholder";
/** Inserts the link line right before the fixed hashtag line. */
function withUrl(text: string, url: string): string {
  return text.endsWith(TAG_LINE) ? `${text.slice(0, -TAG_LINE.length)}\n${url}${TAG_LINE}` : `${text}\n${url}`;
}
function topicUrl(f: TopicFact, ctx: BuildContext): string {
  if (!ctx.origin || !ctx.utmContent) throw new Error("experiment_link_context_missing");
  return buildPostUrl(`/words/${f.id}`, ctx.utmContent, ctx.origin);
}
/** Exact acceptable texts for an arm (style render, plus the topic link when the arm has one). */
function armTexts(v: Variant, f: TopicFact, ctx: BuildContext): { texts: string[]; url: string | null } {
  const base = getStyle(v.contentStyle).render(f, ctx);
  if (!v.withLink) return { texts: base, url: null };
  const url = topicUrl(f, ctx);
  return { texts: base.map(t => withUrl(t, url)), url };
}
/** Prohibited-content check that tolerates only the arm's own expected link. */
const prohibited = (text: string, url: string | null) => PROHIBITED.test(url ? text.split(url).join("") : text);

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
    .filter(f => exp.variants.every((v, i) => styles[i].supports(f, ctx) && styles[i].render(f, ctx).some(t => validLength(v.withLink ? withUrl(t, PLACEHOLDER_URL) : t) && !PROHIBITED.test(t))))
    .sort((a, b) => hash32(exp.allocationSeed + a.topicId) - hash32(exp.allocationSeed + b.topicId) || a.topicId.localeCompare(b.topicId));
}

function acceptable(texts: string[], url: string | null, history: string[]): string[] {
  const used = history.map(contentKeys);
  return texts.filter(t => validLength(t) && !prohibited(t, url) && !used.some(k => similar(k, contentKeys(t))));
}

const storedTheme = (slotTheme: Theme): Theme => (slotTheme === "challenge" ? "challenge" : "terms");

/** Builds the post for the assigned arm. Throws a fixed tag when no acceptable candidate exists. */
export function buildExperimentPost(exp: Experiment, slot: string, slotTheme: Theme, history: string[], ctx: BuildContext): ExperimentPost {
  if (exp.status !== "running") throw new Error("experiment_not_running");
  if (!exp.eligibleThemes.includes(slotTheme)) throw new Error("experiment_theme_not_eligible");
  const a = assignVariant(exp, slot);
  if (!a) throw new Error("experiment_outside_period");
  const pool = sharedTopicPool(exp, ctx).filter(f => !topicUsed(f, history));
  if (!pool.length) throw new Error("experiment_no_unused_topic");
  if (a.variant.postTimeJst && jstHHMM(slot) !== a.variant.postTimeJst) throw new Error("experiment_other_time_slot");
  // Rotate by day so consecutive slots walk the pool; the choice ignores the arm.
  for (let i = 0; i < pool.length; i++) {
    const f = pool[(a.dayIndex + i) % pool.length];
    const arm = armTexts(a.variant, f, ctx);
    const texts = acceptable(arm.texts, arm.url, history);
    if (!texts.length) continue;
    const text = texts[hash32(slot) % texts.length];
    return {
      text, theme: storedTheme(slotTheme), contentId: `${a.variant.contentStyle}-${f.id}`, destinationUrl: arm.url, evidence: [f.evidence],
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
export function validateExperimentPost(raw: unknown, exp: Experiment, slot: string, slotTheme: Theme, history: string[], ctx: BuildContext): ExperimentPost {
  const r = raw as Partial<ExperimentPost> | null;
  const m = r?.experiment;
  if (!r || typeof r.text !== "string" || !m || typeof m !== "object") throw new Error("invalid_schema");
  const a = assignVariant(exp, slot);
  if (!a || exp.status !== "running" || !exp.eligibleThemes.includes(slotTheme)) throw new Error("experiment_not_applicable");
  if (m.experimentId !== exp.id || m.variantId !== a.variant.id || m.contentStyle !== a.variant.contentStyle || m.generationVersion !== GENERATION_VERSION) throw new Error("experiment_metadata_mismatch");
  const f = typeof m.topicId === "string" ? factById(m.topicId) : undefined;
  if (!f || !sharedTopicPool(exp, ctx).some(p => p.topicId === f.topicId)) throw new Error("unsupported_topic");
  const arm = armTexts(a.variant, f, ctx);
  if (!arm.texts.includes(r.text)) throw new Error("unsupported_content");
  if (r.destinationUrl !== arm.url || r.theme !== storedTheme(slotTheme) || r.contentId !== `${m.contentStyle}-${f.id}` || JSON.stringify(r.evidence) !== JSON.stringify([f.evidence])) throw new Error("unsupported_content");
  if (!validLength(r.text)) throw new Error("invalid_length");
  if (prohibited(r.text, arm.url)) throw new Error("prohibited_content");
  if (topicUsed(f, history) || history.some(t => similar(contentKeys(t), contentKeys(r.text as string)))) throw new Error("duplicate_content");
  return r as ExperimentPost;
}
