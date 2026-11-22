import { estimateReadCostUsd, ESTIMATED_USD_PER_POST_READ, MAX_IDS_PER_REQUEST, type CollectionStatus, type MetricsResult, type PostMetrics } from "@/lib/growth/xPosting/metricsClient";

/**
 * P1 snapshot collector. Order of operations (each step can stop the run):
 *   kill switch → find due stages (DB read) → plan + cost estimate → dry-run stops here →
 *   record missed windows → live-read gate → atomic budget reservation → ONE X GET → idempotent writes.
 * It never posts, retries in-process, or stores a missing metric as 0.
 */
export type SnapshotStage = "24h" | "72h";
export type DueSnapshot = { postId: string; xPostId: string; publishedAt: string; stage: SnapshotStage; ageHours: number; attemptCount: number; windowState: "due" | "missed" };
export type Reservation = { runId: string | null; reason: string };
export type RecordOutcome = "inserted" | "updated" | "kept_final";
export type RunStatus = "ok" | "partial" | "rate_limited" | "permission_error" | "failed";
export interface MetricsStore {
  due(account: string, now: Date, maxAttempts: number): Promise<DueSnapshot[]>;
  markMissed(account: string, now: Date): Promise<number>;
  reserve(account: string, reads: number, dailyBudget: number, monthlyBudget: number, usdPerRead: number): Promise<Reservation>;
  record(runId: string, postId: string, stage: SnapshotStage, snapshot: PostMetrics, maxAttempts: number): Promise<RecordOutcome>;
  finish(runId: string, status: RunStatus, errorCode: string | null, rateLimitResetAt: string | null, summary: Record<string, unknown>): Promise<boolean>;
}
export type CollectConfig = {
  enabled: boolean; dryRun: boolean; liveRead: boolean; account: string; now: Date;
  dailyReadBudget: number; monthlyReadBudget: number; maxReadsPerRun: number; maxAttempts: number;
};
/** Reads metrics for the given ids. Production: fetchPostMetrics with the account as expected author. */
export type MetricsReader = (ids: string[]) => Promise<MetricsResult>;
export type CollectPlan = { dueStages: number; reads: number; deferredReads: number; missedStages: number; estimatedUsd: number };
export type CollectResult = { state: string; runId?: string; plan?: CollectPlan; missedRecorded?: number; statuses?: Partial<Record<CollectionStatus, number>>; outcomes?: Partial<Record<RecordOutcome, number>>; recordErrors?: number; errorCode?: string | null; rateLimitResetAt?: string | null };

export function validateCollectConfig(c: CollectConfig): void {
  const int = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;
  if (!/^\d{1,25}$/.test(c.account)) throw new Error("invalid_account_id");
  if (!int(c.dailyReadBudget, 1, 10000) || !int(c.monthlyReadBudget, 1, 100000) || !int(c.maxReadsPerRun, 1, MAX_IDS_PER_REQUEST) || !int(c.maxAttempts, 1, 10) || c.dailyReadBudget > c.monthlyReadBudget) throw new Error("invalid_metrics_limits");
  if (!Number.isFinite(c.now.getTime())) throw new Error("invalid_now");
}

function missingSnapshot(xPostId: string, measuredAt: Date): PostMetrics {
  return { xPostId, collectionStatus: "unavailable", errorCode: "x_metrics_missing", measuredAt: measuredAt.toISOString(), createdAt: null, ageHours: null, impressions: null, likes: null, reposts: null, replies: null, quotes: null, bookmarks: null, organic: null, metricSource: "x_api_v2_get_tweets" };
}

export async function collectMetrics(config: CollectConfig, deps: { store: MetricsStore; read: MetricsReader }): Promise<CollectResult> {
  if (!config.enabled) return { state: "disabled" }; // emergency switch: no DB, no X
  validateCollectConfig(config);
  const all = await deps.store.due(config.account, config.now, config.maxAttempts);
  const due = all.filter(d => d.windowState === "due");
  const ids = [...new Set(due.map(d => d.xPostId))]; // oldest first (store order)
  const selected = ids.slice(0, config.maxReadsPerRun);
  const plan: CollectPlan = { dueStages: due.length, reads: selected.length, deferredReads: ids.length - selected.length, missedStages: all.filter(d => d.windowState === "missed" && d.attemptCount === 0).length, estimatedUsd: selected.length ? estimateReadCostUsd(selected.length) : 0 };
  if (config.dryRun) return { state: "dry_run", plan }; // no writes, no X
  const missedRecorded = plan.missedStages ? await deps.store.markMissed(config.account, config.now) : 0;
  if (!selected.length) return { state: "nothing_due", plan, missedRecorded };
  if (!config.liveRead) return { state: "live_read_disabled", plan, missedRecorded };
  const reservation = await deps.store.reserve(config.account, selected.length, config.dailyReadBudget, config.monthlyReadBudget, ESTIMATED_USD_PER_POST_READ);
  if (!reservation.runId) return { state: reservation.reason, plan, missedRecorded };
  const runId = reservation.runId;

  let result: MetricsResult;
  try { result = await deps.read(selected); }
  catch { // The reader is not expected to throw; treat as a failed request, never retry here.
    const at = config.now.toISOString();
    result = { requestStatus: "failed", errorCode: "x_metrics_reader_failed", rateLimitResetAt: null, posts: selected.map(id => ({ ...missingSnapshot(id, config.now), measuredAt: at, collectionStatus: "failed" as const, errorCode: "x_metrics_reader_failed" })) };
  }
  const byId = new Map(result.posts.map(p => [p.xPostId, p]));
  const statuses: Partial<Record<CollectionStatus, number>> = {};
  const outcomes: Partial<Record<RecordOutcome, number>> = {};
  let recordErrors = 0;
  for (const d of due.filter(x => selected.includes(x.xPostId))) {
    const snapshot = byId.get(d.xPostId) ?? missingSnapshot(d.xPostId, config.now);
    statuses[snapshot.collectionStatus] = (statuses[snapshot.collectionStatus] ?? 0) + 1;
    try { const o = await deps.store.record(runId, d.postId, d.stage, snapshot, config.maxAttempts); outcomes[o] = (outcomes[o] ?? 0) + 1; }
    catch { recordErrors++; }
  }
  const runStatus: RunStatus = result.requestStatus === "ok"
    ? (recordErrors === 0 && Object.keys(statuses).every(s => s === "ok") ? "ok" : "partial")
    : result.requestStatus === "unavailable" ? "failed" : result.requestStatus;
  const summary = { reads: selected.length, statuses, outcomes, recordErrors };
  let finished = false;
  try { finished = await deps.store.finish(runId, runStatus, result.errorCode, result.rateLimitResetAt, summary); } catch { finished = false; }
  // An unfinished run stays "reserved" and blocks new runs until it is marked interrupted (30 min).
  return { state: finished ? runStatus : "run_not_finished", runId, plan, missedRecorded, statuses, outcomes, recordErrors, errorCode: result.errorCode, rateLimitResetAt: result.rateLimitResetAt };
}

export function exitCodeFor(result: CollectResult): number {
  return ["failed", "permission_error", "run_not_finished"].includes(result.state) || (result.recordErrors ?? 0) > 0 ? 1 : 0;
}
