import type { Reliability } from "@/lib/growth/xGrowth/analysis";

/**
 * Actionable operational alerts (P4). Inputs are counts only. "critical" alerts make the weekly
 * job exit non-zero so GitHub notifies the owner; each alert says what to do next.
 */
export type OpsSummary = {
  uncertain: number; staleReady: number; stalePublishing: number; readsToday: number; readsMonth: number; estimatedUsdMonth: number;
  runs7d: Record<string, number>; runErrors7d: Record<string, number>; runningExperiments: number;
};
export type Alert = { level: "critical" | "warning" | "info"; code: string; message: string; action: string };
export type Budgets = { monthlyReads: number | null; dailyReads: number | null };

export function parseOps(raw: unknown): OpsSummary | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  const n = (k: string) => Number(r[k] ?? 0);
  const obj = (k: string) => (r[k] && typeof r[k] === "object" ? Object.fromEntries(Object.entries(r[k] as Record<string, unknown>).map(([a, b]) => [a, Number(b)])) : {});
  return { uncertain: n("uncertain"), staleReady: n("staleReady"), stalePublishing: n("stalePublishing"), readsToday: n("readsToday"), readsMonth: n("readsMonth"), estimatedUsdMonth: n("estimatedUsdMonth"), runs7d: obj("runs7d"), runErrors7d: obj("runErrors7d"), runningExperiments: n("runningExperiments") };
}

export function healthAlerts(ops: OpsSummary | null, rel: Reliability, budgets: Budgets): Alert[] {
  const a: Alert[] = [];
  if (ops) {
    if (ops.uncertain > 0) a.push({ level: "critical", code: "posts_uncertain", message: `結果不明の投稿が ${ops.uncertain} 件あります（自動で再送しません）。`, action: "X上で実際に投稿されたかを確認し、`npm run x:post -- reconcile --id <UUID> [--x-post-id <ID>] --note '...'` で確定する。" });
    if (ops.stalePublishing > 0) a.push({ level: "critical", code: "posts_stale_publishing", message: `20分以上 publishing のままの投稿が ${ops.stalePublishing} 件あります。`, action: "`npm run x:post -- recover` で uncertain に移し、上と同じ手順で確認する。" });
    if (ops.staleReady > 0) a.push({ level: "warning", code: "posts_stale_ready", message: `1日以上 ready のまま（未投稿）の行が ${ops.staleReady} 件あります。`, action: "X上に投稿が無いことを確認したら、`reconcile`（--x-post-id なし）で cancelled にする。" });
    const perm = ops.runs7d.permission_error ?? 0;
    if (perm > 0) a.push({ level: "critical", code: "metrics_permission_error", message: `直近7日のメトリクス取得で権限エラーが ${perm} 回あります。`, action: "X のトークン・アプリ権限を確認する。owned metrics が原因なら `X_METRICS_OWNED=false` にする。" });
    const failed = (ops.runs7d.failed ?? 0) + (ops.runs7d.interrupted ?? 0);
    if (failed > 0) a.push({ level: "warning", code: "metrics_runs_failed", message: `直近7日のメトリクス取得で失敗・中断が ${failed} 回あります（${JSON.stringify(ops.runErrors7d)}）。`, action: "Actions の「X metrics snapshot」のログを確認する。再試行は窓の中で最大 X_METRICS_MAX_ATTEMPTS 回まで自動で行われる。" });
    if ((ops.runs7d.rate_limited ?? 0) > 0) a.push({ level: "info", code: "metrics_rate_limited", message: `直近7日にレート制限が ${ops.runs7d.rate_limited} 回ありました。`, action: "reset 時刻まで自動で待つ。続く場合は収集の頻度を見直す。" });
    if (budgets.monthlyReads && ops.readsMonth >= 0.8 * budgets.monthlyReads) a.push({ level: "warning", code: "metrics_budget_80", message: `今月の読み取りが上限の80%に達しました（${ops.readsMonth} / ${budgets.monthlyReads}件、概算 $${ops.estimatedUsdMonth}）。`, action: "上限に達すると自動で止まる。上限を上げるには運用者の承認が必要。" });
  }
  if (rel.metricsMissingRate !== null && rel.metricsMissingRate > 0.3) a.push({ level: "warning", code: "metrics_missing_high", message: `72時間の計測の欠損率が ${Math.round(rel.metricsMissingRate * 1000) / 10}% です。`, action: "収集の workflow が有効か、窓の時間に実行されているかを確認する。" });
  const failedPosts = rel.failed + rel.uncertain;
  if (failedPosts > 0) a.push({ level: "warning", code: "posts_failed", message: `この期間に失敗・結果不明の投稿が ${failedPosts} 件あります（${JSON.stringify(rel.failureReasons)}）。`, action: "理由ごとの対処は docs/operations/x-organic-posting.md の「失敗理由の読み方」を参照。" });
  return a;
}

export const hasCritical = (alerts: Alert[]) => alerts.some(x => x.level === "critical");
