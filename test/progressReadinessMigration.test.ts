import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260823080000_progress_readiness_completion.sql";

function sql(): string {
  return readFileSync(path, "utf8");
}

describe("progress readiness completion migration", () => {
  it("adds one hardened service-role-only progress RPC", () => {
    const source = sql();

    expect(source).toMatch(/create or replace function public\.save_user_progress_with_readiness_evidence/i);
    expect(source).toMatch(/security definer/i);
    expect(source).toMatch(/set search_path = pg_catalog, public/i);
    expect(source).toMatch(/revoke all on function public\.save_user_progress_with_readiness_evidence[\s\S]*from authenticated/i);
    expect(source).toMatch(/grant execute on function public\.save_user_progress_with_readiness_evidence[\s\S]*to service_role/i);
  });

  it("locks and compares authoritative P0 JSON before writing and registering evidence", () => {
    const source = sql();

    expect(source).toMatch(/from public\.user_progress[\s\S]*for update/i);
    expect(source).toMatch(/topic_mastery_stats is distinct from/i);
    expect(source).toMatch(/review_queue is distinct from/i);
    expect(source).toMatch(/update public\.user_progress[\s\S]*register_exam_readiness_evidence/i);
    expect(source).toMatch(/progress readiness trigger conflicts with stored evidence/i);
  });
});
