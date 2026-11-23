import { analyzeExperiment, baseline, reliability, type AnalysisRow, type ArmStats, type Dist, type ExperimentResult, type HistoryEntry, type Reliability } from "@/lib/growth/xGrowth/analysis";
import type { Experiment } from "@/lib/growth/xGrowth/experiment";
import { generateHypotheses, type Hypothesis, type HypothesisOutcome, type StylePairTested } from "@/lib/growth/xGrowth/hypotheses";
import { STYLES } from "@/lib/growth/xGrowth/styles";
import { healthAlerts, type Alert, type Budgets, type OpsSummary } from "@/lib/growth/xGrowth/health";
import type { DraftPlan } from "@/lib/growth/xGrowth/drafts";

export const REPORT_VERSION = "xg-weekly-v1";
export type WeeklyInput = {
  now: Date; periodStart: Date; periodEnd: Date; experiments: Experiment[]; rows: AnalysisRow[];
  history?: HistoryEntry[]; outcomes?: HypothesisOutcome[]; tested?: StylePairTested[]; ops?: OpsSummary | null; budgets?: Budgets;
};
export type WeeklyData = {
  version: string; generatedAt: string; periodStart: string; periodEnd: string; reliability: Reliability; baseline: Dist;
  experiments: ExperimentResult[]; hypotheses: Hypothesis[]; notes: string[]; alerts: Alert[];
  draft?: { reason: string; plan: DraftPlan | null; created: boolean | null; experimentId: string | null };
};
export type WeeklyReport = { data: WeeklyData; markdown: string; aiText?: string | null; aiRejected?: string | null };

const STATUS_JA: Record<string, string> = {
  insufficient_data: "判定保留（有効な標本が足りない）", data_quality_issue: "判定保留（計測の欠損が多い）", biased: "判定保留（曜日・時刻・題材の偏り）",
  no_clear_difference: "差は確認できない", outlier_sensitive: "判定保留（外れ値で結論が変わる）", exploratory_lead: "探索的な傾向あり（未確定・再現の確認が必要）",
  validated_lead: "別の実験でも同じ傾向を確認（採用には人の承認が必要）",
};
const ACTION_JA: Record<string, string> = { continue: "このまま続ける", pause: "一時停止して計測を直す", repeat: "条件を整えてやり直す・再現を確かめる", replace: "別の比較に切り替える", propose_adoption: "採用を提案（承認待ち）" };
const FLAG_JA: Record<string, string> = { weekday_imbalance: "曜日の偏り", publish_time_gap: "投稿時刻の差", topic_mix_imbalance: "題材の分野の偏り" };
const fmt = (x: number | null | undefined, unit = "") => (x === null || x === undefined ? "—" : `${x}${unit}`);
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 1000) / 10}%`);
const style = (s: string) => STYLES[s]?.label ?? s;
const variantLabel = (v: { contentStyle: string; withLink?: boolean; postTimeJst?: string }) => `${style(v.contentStyle)}${v.withLink ? "・リンクあり" : ""}${v.postTimeJst ? `・${v.postTimeJst}投稿` : ""}`;
const DRAFT_REASON_JA: Record<string, string> = { draft_already_waiting: "承認待ちの下書きがすでにある", current_experiment_not_ending_soon: "今の実験がまだ2週間以上続く", current_experiment_has_no_end: "今の実験に終了日が無い", no_style_hypothesis: "下書きにできる型の比較の仮説が無い", hypothesis_already_open: "同じ仮説の実験がすでにある" };

function armRow(a: ArmStats): string {
  const d = a.impressions72h;
  return `| ${a.variantId}（${style(a.contentStyle)}） | ${a.published} | ${a.valid} | ${a.pending} | ${pct(a.missingRate)} | ${fmt(d.median)} | ${fmt(d.q1)}〜${fmt(d.q3)} | ${fmt(d.min)}〜${fmt(d.max)} | ${d.zeros} | ${d.outliers} |`;
}

export function buildWeeklyReport(input: WeeklyInput): WeeklyReport {
  const inPeriod = input.rows.filter(r => Date.parse(r.scheduledAt) >= input.periodStart.getTime() && Date.parse(r.scheduledAt) < input.periodEnd.getTime());
  const experiments = input.experiments.filter(e => e.status !== "draft").map(e => analyzeExperiment(e, input.rows, input.now, input.history ?? []));
  const hypotheses = generateHypotheses(experiments, input.tested ?? [], input.outcomes ?? [], input.now, input.experiments[0]?.minPostsPerVariant ?? 14);
  const rel = reliability(inPeriod, input.now);
  const notes: string[] = [];
  if (!input.rows.length) notes.push("対象期間の投稿データがありません。");
  if (!experiments.length) notes.push("実行中・完了した実験はありません（実験外の投稿だけを集計しています）。");
  if (rel.metricsMissingRate !== null && rel.metricsMissingRate > 0.3) notes.push("72時間の計測の欠損が30%を超えています。収集の設定やエラーを確認してください。");
  const alerts = healthAlerts(input.ops ?? null, rel, input.budgets ?? { monthlyReads: null, dailyReads: null });
  const data: WeeklyData = { version: REPORT_VERSION, generatedAt: input.now.toISOString(), periodStart: input.periodStart.toISOString(), periodEnd: input.periodEnd.toISOString(), reliability: rel, baseline: baseline(inPeriod), experiments, hypotheses, notes, alerts };
  return { data, markdown: renderMarkdown(data) };
}

export function renderMarkdown(d: WeeklyData, ai?: { text: string | null; rejected: string | null }): string {
  const jst = (iso: string) => new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(0, 10);
  const L: string[] = [];
  L.push(`# X 週次レポート（${jst(d.periodStart)} 〜 ${jst(new Date(Date.parse(d.periodEnd) - 1).toISOString())}）`, "");
  L.push("## 1. まとめ");
  if (!d.experiments.length) L.push("- 実験はまだ動いていません。");
  for (const e of d.experiments) L.push(`- **${e.name}**: ${STATUS_JA[e.status]} → 次の対応: ${ACTION_JA[e.action]}`);
  L.push(`- 投稿の成功率: ${pct(d.reliability.successRate)}（公開 ${d.reliability.published} / 失敗 ${d.reliability.failed} / 結果不明 ${d.reliability.uncertain}）`);
  L.push(`- 72時間の計測: 窓が閉じた ${d.reliability.metricsClosed} 件中 ${d.reliability.metricsOk} 件取得（欠損率 ${pct(d.reliability.metricsMissingRate)}）`, "");
  if (d.alerts.length) {
    L.push("## 運用アラート");
    const icon = { critical: "【要対応】", warning: "【注意】", info: "【参考】" } as const;
    for (const al of d.alerts) L.push(`- ${icon[al.level]} ${al.message}`, `  - 対応: ${al.action}`);
    L.push("");
  }
  L.push("## 2. 投稿と計測の健全性");
  const reasons = Object.entries(d.reliability.failureReasons);
  L.push(reasons.length ? reasons.map(([k, v]) => `- 失敗の理由 \`${k}\`: ${v}件`).join("\n") : "- 失敗・結果不明の投稿はありません。");
  L.push(`- 実験外の投稿の72時間表示回数: 中央値 ${fmt(d.baseline.median)}（${d.baseline.n}件、参考値。実験の群とは比べない）`, "");
  L.push("## 3. 実験");
  if (!d.experiments.length) L.push("（なし）");
  for (const e of d.experiments) {
    L.push(`### ${e.name}`, `- 状態: ${e.experimentStatus}${e.ended ? "（期間終了）" : "（実施中）"} / 判定: **${STATUS_JA[e.status]}**`);
    L.push("", "| 群 | 公開 | 有効 | 計測待ち | 欠損率 | 72h中央値 | 四分位範囲 | 最小〜最大 | 実数の0 | 外れ値 |", "|---|---|---|---|---|---|---|---|---|---|");
    L.push(armRow(e.arms[0]), armRow(e.arms[1]), "");
    L.push(`- 効果（B/A の中央値の比）: ${fmt(e.effect.ratio)}（95%CI ${e.effect.ci95 ? e.effect.ci95.join("〜") : "—"}）。外れ値を除くと ${fmt(e.effect.ratioExcludingOutliers)}（95%CI ${e.effect.ci95ExcludingOutliers ? e.effect.ci95ExcludingOutliers.join("〜") : "—"}）`);
    L.push(`- 偏りの確認: ${e.biasFlags.length ? e.biasFlags.map(f => FLAG_JA[f] ?? f).join("、") : "大きな偏りなし"}`);
    L.push(`- 副次指標: 反応数の中央値 A ${fmt(e.arms[0].engagements72h.median)} / B ${fmt(e.arms[1].engagements72h.median)}、反応率の中央値 A ${fmt(e.arms[0].engagementRateMedian)} / B ${fmt(e.arms[1].engagementRateMedian)}、サイト訪問者 A ${e.arms[0].site.visitors} / B ${e.arms[1].site.visitors}、登録 A ${e.arms[0].site.signups} / B ${e.arms[1].site.signups}`);
    L.push(`- 判定の根拠: ${e.reasons.join(", ")}`, `- 次の対応: ${ACTION_JA[e.action]}`, "");
  }
  L.push("## 4. 次の仮説（最大3つ・提案のみ。実施には承認が必要）");
  if (!d.hypotheses.length) L.push("（なし）");
  d.hypotheses.forEach((h, i) => L.push(`${i + 1}. ${h.statement}`, `   - 根拠: ${h.rationale}`, ...(h.justification ? [`   - 再実施の理由: ${h.justification}`] : []), ...(h.proposedExperiment ? [`   - 比較案: A=${variantLabel(h.proposedExperiment.variants[0])} / B=${variantLabel(h.proposedExperiment.variants[1])}（各群${h.proposedExperiment.minPostsPerVariant}件以上）`] : [])));
  if (d.draft) {
    L.push("", "## 次の実験の下書き");
    const p = d.draft.plan;
    const jstDate = (iso: string) => new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(0, 10);
    if (!p) L.push(`- 今回は作りません（${DRAFT_REASON_JA[d.draft.reason] ?? d.draft.reason}）。`);
    else {
      L.push(`- ${p.name}: A=${variantLabel(p.variants[0])} / B=${variantLabel(p.variants[1])}、${jstDate(p.startAt)} 〜 ${jstDate(new Date(Date.parse(p.endAt) - 1).toISOString())}（事前の確認で候補 ${p.previewCandidates} 件）`);
      if (d.draft.experimentId) L.push(`- ${d.draft.created ? "下書きを作成しました" : "同じ下書きがすでにあります"}（id: \`${d.draft.experimentId}\`）。**まだ投稿には使われません。** 始めるには Actions の「X growth experiment approval」を experiment_id を入れて手動実行してください。`);
      else L.push("- 自動作成はオフです（X_GROWTH_AUTO_DRAFT=true かつ保存が有効のときだけ作成）。");
    }
  }
  L.push("", "## 5. 注意");
  L.push("- 少ない標本では勝ち負けを決めません。「探索的な傾向」は1回の実験の結果で、別の期間・題材で再現するまで確定しません。", "- 欠損（取れなかった値）は0として扱いません。0は実際に0だった投稿だけです。", "- サイトの流入はリンク付きの投稿にしか個別に帰属できません。リンクなしの投稿の流入が0でも、プロフィール経由の流入まで0とは限りません。");
  for (const n of d.notes) L.push(`- ${n}`);
  if (ai) { L.push("", "## 6. AIによる解釈（参考・数値は上の計算結果のみ）"); L.push(ai.text ?? `（AIの解釈は使いませんでした: ${ai.rejected}）`); }
  return L.join("\n") + "\n";
}
