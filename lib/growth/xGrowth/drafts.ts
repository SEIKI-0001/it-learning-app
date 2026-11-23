import type { Theme } from "@/lib/growth/xPosting/core";
import { parseExperiment, type Experiment } from "@/lib/growth/xGrowth/experiment";
import type { Hypothesis } from "@/lib/growth/xGrowth/hypotheses";
import { previewExperiment } from "@/lib/growth/xGrowth/preview";
import { STYLES } from "@/lib/growth/xGrowth/styles";

/**
 * Turns the top hypothesis into the NEXT experiment draft. Rules:
 * - only style comparisons are auto-drafted (link posts cost more; time tests need a schedule change);
 * - only when nothing is drafted/approved and the running experiment (if any) ends within 14 days;
 * - starts on the Monday (00:00 JST) after the running one ends, runs an EVEN number of weeks
 *   (the allocation balances every weekday over 2 weeks);
 * - must pass an offline preview with approved content only, enough for both arms.
 * A draft never posts. An operator approves it (approve_x_experiment) to make it running.
 */
export type DraftPlan = {
  hypothesisKey: string; name: string; hypothesis: string; startAt: string; endAt: string; minPostsPerVariant: number;
  variants: Experiment["variants"]; allocationSeed: string; config: { eligibleThemes: Theme[] }; previewCandidates: number;
};
export type DraftDecision = { plan: DraftPlan | null; reason: string };
const TERM_DAYS: Theme[] = ["question", "terms", "trick", "challenge"];

function nextMondayJst(after: number): number {
  const jst = new Date(after + 9 * 3600000);
  const days = (8 - jst.getUTCDay()) % 7 || 7; // strictly after
  return Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + days) - 9 * 3600000;
}

export function planNextDraft(hypotheses: Hypothesis[], experiments: Experiment[], now: Date, weeks = 8): DraftDecision {
  if (weeks % 2 !== 0 || weeks < 2) throw new Error("draft_weeks_must_be_even");
  if (experiments.some(e => e.status === "draft" || e.status === "approved")) return { plan: null, reason: "draft_already_waiting" };
  const running = experiments.find(e => e.status === "running");
  if (running && running.endAt && Date.parse(running.endAt) - now.getTime() > 14 * 86400000) return { plan: null, reason: "current_experiment_not_ending_soon" };
  if (running && !running.endAt) return { plan: null, reason: "current_experiment_has_no_end" };
  const h = hypotheses.find(x => x.proposedExperiment && x.kind !== "measurement" && x.proposedExperiment.variants.every(v => !v.withLink && !v.postTimeJst) && x.proposedExperiment.variants[0].contentStyle !== x.proposedExperiment.variants[1].contentStyle);
  if (!h || !h.proposedExperiment) return { plan: null, reason: "no_style_hypothesis" };
  if (experiments.some(e => e.hypothesisKey === h.key && (e.status === "running" || e.status === "draft" || e.status === "approved"))) return { plan: null, reason: "hypothesis_already_open" };
  const start = nextMondayJst(Math.max(now.getTime(), running?.endAt ? Date.parse(running.endAt) - 1 : 0));
  const end = start + weeks * 7 * 86400000;
  const startDate = new Date(start + 9 * 3600000).toISOString().slice(0, 10);
  const [va, vb] = h.proposedExperiment.variants;
  const eligibleThemes = running ? (running.eligibleThemes as Theme[]) : TERM_DAYS;
  const plan: DraftPlan = {
    hypothesisKey: h.key, name: `${STYLES[va.contentStyle]?.label ?? va.contentStyle} vs ${STYLES[vb.contentStyle]?.label ?? vb.contentStyle}（自動下書き）`,
    hypothesis: h.statement, startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), minPostsPerVariant: h.proposedExperiment.minPostsPerVariant,
    variants: [{ id: "A", contentStyle: va.contentStyle }, { id: "B", contentStyle: vb.contentStyle }], allocationSeed: `${h.key}-${startDate}`,
    config: { eligibleThemes }, previewCandidates: 0,
  };
  // Offline check with approved content only (draft analogies excluded), as the live run would.
  const probe = parseExperiment({ id: "00000000-0000-4000-8000-000000000000", name: plan.name, status: "running", start_at: plan.startAt, end_at: plan.endAt, min_posts_per_variant: plan.minPostsPerVariant, variants: plan.variants, allocation_seed: plan.allocationSeed, config: plan.config });
  const rows = previewExperiment(probe, weeks * 7, { allowDraftLibrary: false });
  const counts = plan.variants.map(v => rows.filter(r => r.state === "candidate" && r.variantId === v.id).length);
  plan.previewCandidates = counts[0] + counts[1];
  if (counts.some(c => c < plan.minPostsPerVariant)) return { plan: null, reason: `not_enough_valid_candidates:${counts.join("/")}` };
  return { plan, reason: "planned" };
}
