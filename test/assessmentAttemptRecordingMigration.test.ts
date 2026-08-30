import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260829070000_assessment_attempt_recording.sql";

function sql(): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function recorderDefinition(): string {
  const match = sql().match(
    /create or replace function public\.record_assessment_question_attempts_with_exposure\([\s\S]*?\$\$;[\s\S]*?grant execute on function public\.record_assessment_question_attempts_with_exposure\([\s\S]*?to service_role;/i,
  );
  return match?.[0] ?? "";
}

describe("assessment attempt recording migration", () => {
  it("uses a receipt boundary instead of rejecting legacy grouped duplicates", () => {
    expect(sql()).toMatch(/create table public\.assessment_attempt_receipts/i);
    expect(sql()).toMatch(/primary key\s*\(user_id, session_id, question_id\)/i);
    expect(sql()).toMatch(/references public\.question_attempts\(attempt_id\) on delete cascade/i);
    expect(sql()).not.toMatch(/question_attempts_assessment_group_unique_idx/i);
    expect(sql()).not.toMatch(/delete from public\.question_attempts/i);
  });

  it("locks the owned session before validating and recording the assessment batch", () => {
    const definition = recorderDefinition();

    expect(definition).toMatch(/security definer/i);
    expect(definition).toMatch(/set search_path = pg_catalog, public/i);
    expect(definition).toMatch(
      /select source, mode, status[\s\S]*from public\.assessment_sessions[\s\S]*where user_id = p_user_id[\s\S]*session_id = p_session_id[\s\S]*for update/i,
    );
    expect(definition).toMatch(/record_question_attempts_with_exposure/i);
    expect(definition).toMatch(/attempt_group_id[\s\S]*p_session_id/i);
    expect(definition).toMatch(/question_type[\s\S]*source/i);
    expect(definition).toMatch(/attempt_mode[\s\S]*mode/i);
  });

  it("is owned by postgres and executable only by service_role", () => {
    const definition = recorderDefinition();

    expect(definition).toMatch(/alter function[\s\S]*owner to postgres/i);
    expect(definition).toMatch(/revoke all[\s\S]*from public/i);
    expect(definition).toMatch(/revoke all[\s\S]*from anon/i);
    expect(definition).toMatch(/revoke all[\s\S]*from authenticated/i);
    expect(definition).toMatch(/grant execute[\s\S]*to service_role/i);
  });
});
