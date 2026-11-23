import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generatedStorageFields, type Config, type PostRow, type Store } from "@/lib/growth/xPosting/runner";
import type { Generated } from "@/lib/growth/xPosting/core";
import type { XResult } from "@/lib/growth/xPosting/xClient";
import { parseExperiment, type Experiment, type ExperimentMeta } from "@/lib/growth/xGrowth/experiment";
export class SupabasePostStore implements Store {
  readonly client: SupabaseClient;
  constructor(url: string, key: string) {
    if (!url || !key) throw new Error("posting_db_not_configured");
    this.client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) } });
  }
  async rpc(name: string, args: Record<string, unknown> = {}) {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw new Error(`posting_db_${name}_failed`);
    return data;
  }
  async claim(c: Config): Promise<PostRow | null> { const rows = await this.rpc("claim_x_post", { p_account: c.account, p_slot: c.slot, p_daily: c.dailyLimit, p_monthly: c.monthlyLimit }); return rows?.[0] ?? null; }
  async history(account: string): Promise<string[]> {
    const { data, error } = await this.client.from("x_social_posts").select("text").eq("account_id", account).in("status", ["ready", "publishing", "published", "uncertain"]).order("scheduled_at", { ascending: false }).limit(100);
    if (error) throw new Error("posting_db_history_failed");
    return (data ?? []).map(r => r.text).filter((text): text is string => typeof text === "string");
  }
  async prepare(id: string, generation: Generated, model: string): Promise<boolean> { const f = generatedStorageFields(generation); return this.rpc("prepare_x_post", { p_id: id, p_generation: generation, p_model: model, p_hash: f.hash, p_keys: f.keys }); }
  async begin(id: string, daily: number): Promise<boolean> { return this.rpc("begin_x_publish", { p_id: id, p_daily: daily }); }
  async finish(id: string, result: XResult): Promise<boolean> { return this.rpc("finish_x_post", { p_id: id, p_status: result.state, p_x_id: result.state === "published" ? result.id : null, p_error: result.state === "published" ? null : result.error }); }
  async fail(id: string, error: string): Promise<void> {
    const result = await this.client.from("x_social_posts").update({ status: "failed", error_summary: error, updated_at: new Date().toISOString() }).eq("id", id).in("status", ["draft", "ready"]);
    if (result.error) throw new Error("posting_db_fail_failed");
  }
  async tagExperiment(id: string, m: ExperimentMeta): Promise<boolean> {
    return (await this.rpc("tag_x_post_experiment", { p_id: id, p_experiment: m.experimentId, p_variant: m.variantId, p_style: m.contentStyle, p_topic: m.topicId, p_version: m.generationVersion })) === true;
  }
  /** Posts with a link whose X request started this JST month ($0.20 each). Conservative: counts attempts. */
  async monthlyLinkSpendUsd(account: string, now = new Date()): Promise<number> {
    const jst = new Date(now.getTime() + 9 * 3600000);
    const monthStart = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - 9 * 3600000).toISOString();
    const { count, error } = await this.client.from("x_social_posts").select("id", { count: "exact", head: true }).eq("account_id", account).not("destination_url", "is", null).gte("publish_attempt_at", monthStart);
    if (error) throw new Error("posting_db_link_spend_failed");
    return Math.round((count ?? 0) * 0.2 * 1000) / 1000;
  }
  /** The single running experiment covering the slot, validated; null when none. */
  async activeExperiment(slot: string): Promise<Experiment | null> {
    const rows = await this.rpc("active_x_experiment", { p_slot: slot });
    return Array.isArray(rows) && rows[0] ? parseExperiment(rows[0]) : null;
  }
}
