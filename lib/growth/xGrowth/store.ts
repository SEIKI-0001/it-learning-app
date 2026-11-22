import type { DueSnapshot, MetricsStore, RecordOutcome, Reservation, RunStatus, SnapshotStage } from "@/lib/growth/xGrowth/collector";
import type { PostMetrics } from "@/lib/growth/xPosting/metricsClient";

/** Calls one SQL function with named arguments and returns its rows (or scalar). */
export type Rpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

const iso = (v: unknown) => new Date(v as string).toISOString();
const rows = (v: unknown): Record<string, unknown>[] => Array.isArray(v) ? v as Record<string, unknown>[] : [];

/** All writes go through the migration's RPCs, so Supabase and the PGlite fixture share the same SQL rules. */
export class RpcMetricsStore implements MetricsStore {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) { this.rpc = rpc; } // no parameter property: the CLI runs under strip-only TS
  async due(account: string, now: Date, maxAttempts: number): Promise<DueSnapshot[]> {
    return rows(await this.rpc("x_metrics_due", { p_account: account, p_now: now.toISOString(), p_max_attempts: maxAttempts })).map(r => ({
      postId: String(r.post_id), xPostId: String(r.x_post_id), publishedAt: iso(r.published_at), stage: r.snapshot_stage as SnapshotStage,
      ageHours: Number(r.age_hours), attemptCount: Number(r.attempt_count), windowState: r.window_state === "missed" ? "missed" : "due",
    }));
  }
  async markMissed(account: string, now: Date): Promise<number> { return Number(await this.rpc("mark_x_metrics_missed", { p_account: account, p_now: now.toISOString() })); }
  async reserve(account: string, reads: number, daily: number, monthly: number, usdPerRead: number): Promise<Reservation> {
    const r = rows(await this.rpc("reserve_x_metrics_reads", { p_account: account, p_reads: reads, p_daily: daily, p_monthly: monthly, p_usd_per_read: usdPerRead }))[0];
    return { runId: r?.run_id ? String(r.run_id) : null, reason: typeof r?.reason === "string" ? r.reason : "reservation_failed" };
  }
  async record(runId: string, postId: string, stage: SnapshotStage, snapshot: PostMetrics, maxAttempts: number): Promise<RecordOutcome> {
    const o = await this.rpc("record_x_metrics_snapshot", { p_run: runId, p_post: postId, p_stage: stage, p_snapshot: snapshot, p_max_attempts: maxAttempts });
    if (o !== "inserted" && o !== "updated" && o !== "kept_final") throw new Error("metrics_db_record_invalid");
    return o;
  }
  async finish(runId: string, status: RunStatus, errorCode: string | null, resetAt: string | null, summary: Record<string, unknown>): Promise<boolean> {
    return (await this.rpc("finish_x_metrics_run", { p_run: runId, p_status: status, p_error: errorCode, p_reset: resetAt, p_summary: summary })) === true;
  }
  async report(account: string, since: Date): Promise<Record<string, unknown>[]> {
    return rows(await this.rpc("x_growth_post_report", { p_account: account, p_since: since.toISOString() })).map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : typeof v === "bigint" ? Number(v) : v])));
  }
}

/** Supabase service-role adapter. Error details are never surfaced (fixed tags only). */
export async function supabaseRpc(url: string | undefined, key: string | undefined): Promise<Rpc> {
  if (!url || !key) throw new Error("metrics_db_not_configured");
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(15000) }) } });
  return async (name, args) => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(`metrics_db_${name}_failed`);
    return data;
  };
}
