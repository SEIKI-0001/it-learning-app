import { themeForSlot } from "@/lib/growth/xPosting/core";
import { assignVariant, buildExperimentPost, validateExperimentPost, type Experiment, type ExperimentMeta } from "@/lib/growth/xGrowth/experiment";
import type { StyleContext } from "@/lib/growth/xGrowth/styles";

/**
 * Offline preview: simulates consecutive daily slots (07:00 JST) for an experiment, accumulating
 * history as if every accepted candidate had been published. No DB, no X, no LLM.
 */
export type PreviewRow = { slot: string; theme: string; variantId: string | null; contentStyle: string | null; state: "candidate" | "not_eligible" | "fallback"; reason?: string; text?: string; meta?: ExperimentMeta };
export function previewExperiment(exp: Experiment, days: number, ctx: StyleContext, history: string[] = []): PreviewRow[] {
  const out: PreviewRow[] = [];
  const hist = [...history];
  const first = Date.parse(exp.startAt);
  for (let d = 0; d < days; d++) {
    // 07:00 JST on day d, counted from the JST date of start_at.
    const startJstMidnight = Math.floor((first + 9 * 3600000) / 86400000) * 86400000 - 9 * 3600000;
    const slot = new Date(Math.max(first, startJstMidnight + d * 86400000 + 7 * 3600000)).toISOString();
    const theme = themeForSlot(slot);
    const a = assignVariant(exp, slot);
    if (!a || !exp.eligibleThemes.includes(theme)) { out.push({ slot, theme, variantId: a?.variant.id ?? null, contentStyle: a?.variant.contentStyle ?? null, state: "not_eligible" }); continue; }
    try {
      const post = validateExperimentPost(buildExperimentPost(exp, slot, theme, hist, ctx), exp, slot, theme, hist, ctx);
      hist.unshift(post.text);
      out.push({ slot, theme, variantId: a.variant.id, contentStyle: a.variant.contentStyle, state: "candidate", text: post.text, meta: post.experiment });
    } catch (e) {
      out.push({ slot, theme, variantId: a.variant.id, contentStyle: a.variant.contentStyle, state: "fallback", reason: e instanceof Error ? e.message : "error" });
    }
  }
  return out;
}
