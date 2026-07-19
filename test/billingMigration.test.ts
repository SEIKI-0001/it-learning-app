import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("billing correctness migration", () => {
  it("adds subscription event state and atomic one-time purchase RPC", () => {
    const sql = readFileSync(
      "supabase/migrations/20260719_billing_correctness.sql",
      "utf8",
    );

    expect(sql).toMatch(/create table if not exists public\.billing_subscriptions/i);
    expect(sql).toMatch(/stripe_subscription_id\s+text primary key/i);
    expect(sql).toMatch(/latest_event_created\s+bigint/i);
    expect(sql).toMatch(/create or replace function public\.record_stripe_subscription_event/i);
    expect(sql).toMatch(/create or replace function public\.apply_one_time_purchase/i);
    expect(sql).toMatch(/on conflict \(stripe_checkout_session_id\) do nothing/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/set search_path = pg_catalog/gi);
    expect(sql).toMatch(/revoke all on function[\s\S]*from public, anon, authenticated/gi);
    expect(sql).not.toMatch(/\bfrom\s+billing_subscriptions\b/i);
  });
});
