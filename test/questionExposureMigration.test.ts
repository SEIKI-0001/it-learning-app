import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260815064053_question_first_attempt_exposure.sql",
  ),
  "utf8",
);

describe("question first-attempt migration safety contract", () => {
  it("does not rewrite or backfill historical answer rows", () => {
    expect(SQL).not.toMatch(/update\s+public\.question_attempts/i);
    expect(SQL).not.toMatch(/row_number\s*\(/i);
    expect(SQL).toMatch(/add column if not exists is_first_attempt boolean not null default false/i);
  });

  it("coordinates the atomic RPC with legacy user_answers writers", () => {
    expect(SQL).toMatch(/create (?:or replace )?function public\.lock_question_exposure_answer_write/i);
    expect(SQL).toMatch(/create trigger lock_question_exposure_user_answers/i);
    expect(SQL).toMatch(/create trigger lock_question_exposure_question_attempts/i);
    expect(SQL).toMatch(/before insert or update of user_id, question_id/i);
    expect((SQL.match(/pg_advisory_xact_lock/g) ?? [])).toHaveLength(2);
  });

  it("keeps privileged functions on a fixed search path with narrow execution", () => {
    expect(SQL).toMatch(/security definer\s+set search_path = pg_catalog, public/i);
    expect(SQL).toMatch(/alter function public\.record_question_attempts_with_exposure\(uuid, jsonb\) owner to postgres/i);
    expect(SQL).toMatch(/revoke all on function public\.record_question_attempts_with_exposure\(uuid, jsonb\)[\s\S]*from authenticated/i);
    expect(SQL).toMatch(/grant execute on function public\.record_question_attempts_with_exposure\(uuid, jsonb\)[\s\S]*to service_role/i);
  });

  it("bounds blocking DDL and preserves one first claim per user/question", () => {
    expect(SQL).toMatch(/set local lock_timeout/i);
    expect(SQL).toMatch(/set local statement_timeout/i);
    expect(SQL).toMatch(/create unique index if not exists question_attempts_one_first_per_user_question_idx[\s\S]*where is_first_attempt/i);
  });
});
