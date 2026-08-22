import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260823070000_assessment_session_completion.sql";

function sql(): string {
  return readFileSync(path, "utf8");
}

function functionDefinition(source: string): string {
  const match = source.match(
    /create or replace function public\.complete_assessment_session\([\s\S]*?\$\$;[\s\S]*?grant execute on function public\.complete_assessment_session\([\s\S]*?to service_role;/i,
  );
  if (!match) throw new Error("complete_assessment_session definition not found");
  return match[0];
}

describe("assessment session completion migration", () => {
  it("adds one hardened service-role-only transactional completion RPC", () => {
    const definition = functionDefinition(sql());

    expect(definition).toMatch(/security definer/i);
    expect(definition).toMatch(/set search_path = pg_catalog, public/i);
    expect(definition).toMatch(/alter function public\.complete_assessment_session\([\s\S]*?owner to postgres/i);
    expect(definition).toMatch(/revoke all on function public\.complete_assessment_session\([\s\S]*?from public/i);
    expect(definition).toMatch(/from anon/i);
    expect(definition).toMatch(/from authenticated/i);
    expect(definition).toMatch(/grant execute on function public\.complete_assessment_session\([\s\S]*?to service_role/i);
  });

  it("locks an in-progress frame, inserts answers, derives counts, completes, and registers one stable event", () => {
    const definition = functionDefinition(sql());

    expect(definition).toMatch(/from public\.assessment_sessions[\s\S]*for update/i);
    expect(definition).toMatch(/status <> 'in_progress'/i);
    expect(definition).toMatch(/insert into public\.assessment_session_answers/i);
    expect(definition).toMatch(/count\(\*\) filter \(where is_correct\)/i);
    expect(definition).toMatch(/count\(\*\) filter \(where first_attempt_state = 'first'\)/i);
    expect(definition).toMatch(/update public\.assessment_sessions[\s\S]*status = 'completed'/i);
    expect(definition).toMatch(/register_exam_readiness_evidence\([\s\S]*'assessment:' \|\| p_session_id::text/i);
  });

  it("has explicit identical-retry and conflicting-terminal branches", () => {
    const definition = functionDefinition(sql());

    expect(definition).toMatch(/if v_session\.status = 'completed' then/i);
    expect(definition).toMatch(/completed_now', false/i);
    expect(definition).toMatch(/assessment session completion conflicts with stored facts/i);
    expect(definition).toMatch(/assessment session is terminal/i);
  });
});
