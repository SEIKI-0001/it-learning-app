import { themeForSlot } from "@/lib/growth/xPosting/core";
import { assignVariant, buildExperimentPost, validateExperimentPost, type Experiment, type ExperimentMeta } from "@/lib/growth/xGrowth/experiment";
import type { BuildContext } from "@/lib/growth/xGrowth/experiment";

/**
 * Offline preview: simulates consecutive daily slots (07:00 JST, or the arm's own time) for an experiment, accumulating
 * history as if every accepted candidate had been published. No DB, no X, no LLM.
 */
export type PreviewRow = { slot: string; theme: string; variantId: string | null; contentStyle: string | null; state: "candidate" | "not_eligible" | "fallback"; reason?: string; text?: string; meta?: ExperimentMeta };
export function previewExperiment(exp: Experiment, days: number, ctx: BuildContext, history: string[] = [], times: string[] = ["07:00"]): PreviewRow[] {
  const out: PreviewRow[] = [];
  const hist = [...history];
  const first = Date.parse(exp.startAt);
  for (let d = 0; d < days; d++) {
    // Day d, counted from the JST date of start_at. Time experiments post the arm at its own time.
    const startJstMidnight = Math.floor((first + 9 * 3600000) / 86400000) * 86400000 - 9 * 3600000;
    const dayStart = startJstMidnight + d * 86400000;
    const probe = new Date(Math.max(first, dayStart + 7 * 3600000)).toISOString();
    const a0 = assignVariant(exp, probe);
    const hhmm = (a0?.variant.postTimeJst ?? times[0]).split(":").map(Number);
    const slot = new Date(Math.max(first, dayStart + (hhmm[0] * 60 + hhmm[1]) * 60000)).toISOString();
    const theme = themeForSlot(slot);
    const a = assignVariant(exp, slot);
    if (!a || !exp.eligibleThemes.includes(theme)) { out.push({ slot, theme, variantId: a?.variant.id ?? null, contentStyle: a?.variant.contentStyle ?? null, state: "not_eligible" }); continue; }
    const c: BuildContext = { origin: "https://shikaku-mochit.com", utmContent: `x-preview-${d}`, ...ctx };
    try {
      const post = validateExperimentPost(buildExperimentPost(exp, slot, theme, hist, c), exp, slot, theme, hist, c);
      hist.unshift(post.text);
      out.push({ slot, theme, variantId: a.variant.id, contentStyle: a.variant.contentStyle, state: "candidate", text: post.text, meta: post.experiment });
    } catch (e) {
      out.push({ slot, theme, variantId: a.variant.id, contentStyle: a.variant.contentStyle, state: "fallback", reason: e instanceof Error ? e.message : "error" });
    }
  }
  return out;
}
