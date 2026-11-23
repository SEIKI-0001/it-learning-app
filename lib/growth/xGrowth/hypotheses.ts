import type { ExperimentResult } from "@/lib/growth/xGrowth/analysis";
import { STYLES } from "@/lib/growth/xGrowth/styles";

/**
 * Next-cycle hypotheses, at most three, by fixed rules from the computed results.
 * - Ineffective hypotheses (outcome no_effect within 180 days) are not re-proposed unless a
 *   data problem (bias/outliers) justifies a re-run; the justification is stored.
 * - One slot is kept for exploring an untested style whenever one exists.
 * Proposals are always status "proposed": nothing is activated automatically.
 */
export type ProposedExperiment = { variants: [{ id: "A"; contentStyle: string }, { id: "B"; contentStyle: string }]; minPostsPerVariant: number };
export type Hypothesis = {
  key: string; kind: "measurement" | "replicate" | "extend" | "rerun" | "explore"; statement: string; rationale: string;
  evidence: Record<string, unknown>; proposedExperiment: ProposedExperiment | null; justification: string | null;
};
export type HypothesisOutcome = { key: string; outcome: "no_effect" | "inconclusive" | "lead" | "validated" | null; decidedAt: string };
export type StylePairTested = { a: string; b: string };

const label = (s: string) => STYLES[s]?.label ?? s;
const pair = (a: string, b: string, n: number): ProposedExperiment => ({ variants: [{ id: "A", contentStyle: a }, { id: "B", contentStyle: b }], minPostsPerVariant: n });
const CONTROL = "definition_first";
// Styles whose content needs an approved library are explored only when the library is approved.
const EXPLORABLE = ["question_first", "mini_quiz", "misconception"];

export function generateHypotheses(results: ExperimentResult[], tested: StylePairTested[], outcomes: HypothesisOutcome[], now: Date, minPosts = 14): Hypothesis[] {
  const out: Hypothesis[] = [];
  const recentNoEffect = (key: string) => outcomes.some(o => o.key === key && o.outcome === "no_effect" && now.getTime() - Date.parse(o.decidedAt) < 180 * 86400000);
  for (const r of results) {
    const [a, b] = r.arms;
    const base = r.hypothesisKey ?? `exp_${r.experimentId.slice(0, 8)}`;
    const ev = { experimentId: r.experimentId, status: r.status, valid: [a.valid, b.valid], medians: [a.impressions72h.median, b.impressions72h.median], ratio: r.effect.ratio, ci95: r.effect.ci95, missingRate: [a.missingRate, b.missingRate], biasFlags: r.biasFlags };
    if (r.status === "data_quality_issue") out.push({ key: `${base}_measurement`, kind: "measurement", statement: "72時間の計測の欠損を減らせば、同じ実験をもう一度判定できる", rationale: `欠損率が上限（30%）を超えた（A ${a.missingRate} / B ${b.missingRate}）。原因の内訳は ${JSON.stringify({ A: a.missingReasons, B: b.missingReasons })}`, evidence: ev, proposedExperiment: null, justification: null });
    if (!r.ended) continue;
    if (r.status === "exploratory_lead" && r.effect.leader) {
      const lead = r.arms.find(x => x.variantId === r.effect.leader)!, other = r.arms.find(x => x.variantId !== r.effect.leader)!;
      out.push({ key: `${base}_replication`, kind: "replicate", statement: `「${label(lead.contentStyle)}」が「${label(other.contentStyle)}」より72時間の表示回数が多い傾向は、別の期間・題材でも再現する`, rationale: `1回の実験で中央値の比 ${r.effect.ratio}（95%CI ${r.effect.ci95?.join("〜")}）。まだ探索的な結果で、再現の確認が必要`, evidence: ev, proposedExperiment: pair(other.contentStyle, lead.contentStyle, minPosts), justification: null });
    } else if (r.status === "insufficient_data") {
      out.push({ key: `${base}_extension`, kind: "extend", statement: "同じ比較を、有効な標本が各群の最低数に届くまで続ければ判定できる", rationale: `有効な標本が A ${a.valid} / B ${b.valid} で最低数 ${minPosts} に届かない`, evidence: ev, proposedExperiment: pair(a.contentStyle, b.contentStyle, minPosts), justification: null });
    } else if (r.status === "biased" || r.status === "outlier_sensitive") {
      const key = `${base}_rerun`;
      out.push({ key, kind: "rerun", statement: "偏り（曜日・時刻・題材）や外れ値を抑えてやり直せば、比較の結論が安定する", rationale: `判定を妨げた要因: ${r.reasons.join(", ")}`, evidence: ev, proposedExperiment: pair(a.contentStyle, b.contentStyle, minPosts), justification: recentNoEffect(key) ? `前回は ${r.reasons.join(", ")} のため判定できなかった` : null });
    }
  }
  const testedKey = (x: string, y: string) => [x, y].sort().join("|");
  const testedSet = new Set([...tested.map(t => testedKey(t.a, t.b)), ...results.map(r => testedKey(r.arms[0].contentStyle, r.arms[1].contentStyle))]);
  const explore = EXPLORABLE.filter(s => !testedSet.has(testedKey(CONTROL, s))).map(s => ({
    key: `style_${s}_vs_${CONTROL}`, kind: "explore" as const,
    statement: `「${label(s)}」の投稿は、「${label(CONTROL)}」の投稿より72時間の表示回数が多い`,
    rationale: "まだ比較していない表現の型。冒頭の伝え方だけを変え、時刻・頻度・題材の基準・リンクなしは固定する", evidence: { untestedPair: [CONTROL, s] }, proposedExperiment: pair(CONTROL, s, minPosts), justification: null,
  })).filter(h => !recentNoEffect(h.key));
  const ordered = [...out.filter(h => h.kind === "measurement"), ...out.filter(h => h.kind !== "measurement")].filter((h, i, all) => all.findIndex(x => x.key === h.key) === i)
    .filter(h => !recentNoEffect(h.key) || h.justification);
  const picked = ordered.slice(0, explore.length ? 2 : 3);
  for (const e of explore) if (picked.length < 3) picked.push(e);
  return picked.slice(0, 3);
}
