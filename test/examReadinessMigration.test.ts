import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  "supabase/migrations/20260822070000_exam_readiness_p1_2.sql",
  "utf8",
);

const TABLES = [
  "assessment_sessions",
  "assessment_session_answers",
  "exam_readiness_evidence_state",
  "exam_readiness_evidence_events",
  "exam_readiness_recalculation_jobs",
  "exam_readiness_current",
  "exam_readiness_snapshots",
] as const;

const RPCS = [
  {
    name: "register_exam_readiness_evidence",
    args: "uuid, text",
  },
  {
    name: "claim_exam_readiness_recalculation",
    args: "uuid, text, text, text, text, integer",
  },
  {
    name: "complete_exam_readiness_recalculation",
    args: "uuid, bigint, integer, jsonb",
  },
  {
    name: "fail_exam_readiness_recalculation",
    args: "uuid, integer, text",
  },
  {
    name: "record_question_attempts_with_exposure",
    args: "uuid, jsonb",
  },
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tableDefinition(table: (typeof TABLES)[number]): string {
  const match = SQL.match(
    new RegExp(
      `create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`,
      "i",
    ),
  );

  expect(match, `missing definition for ${table}`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("exam-readiness persistence migration contract", () => {
  it("creates all seven postgres-owned user-scoped tables", () => {
    for (const table of TABLES) {
      expect(SQL).toMatch(new RegExp(`create table public\\.${table}`, "i"));
      expect(SQL).toMatch(
        new RegExp(`alter table public\\.${table} owner to postgres`, "i"),
      );
      expect(tableDefinition(table)).toMatch(
        /user_id\s+uuid[\s\S]*references public\.line_users\s*\(id\)\s*on delete cascade/i,
      );
    }
  });

  it("constrains assessment source, mode, lifecycle, first-state, and counts", () => {
    const sessions = tableDefinition("assessment_sessions");
    const answers = tableDefinition("assessment_session_answers");

    expect(sessions).toMatch(
      /check\s*\(source in \('checkpoint', 'summary', 'mock', 'official_past'\)\)/i,
    );
    expect(sessions).toMatch(/check\s*\(mode in \('practice', 'exam'\)\)/i);
    expect(sessions).toMatch(
      /check\s*\(status in \('in_progress', 'completed', 'abandoned'\)\)/i,
    );
    expect(answers).toMatch(
      /check\s*\(first_attempt_state in \('first', 'seen', 'unknown'\)\)/i,
    );

    for (const count of [
      "question_count",
      "answered_count",
      "correct_count",
      "first_count",
      "seen_count",
      "unknown_count",
    ]) {
      expect(sessions).toMatch(
        new RegExp(`check \\(${count} >= 0\\)`, "i"),
      );
    }
  });

  it("keeps session composition and answer writes idempotent", () => {
    expect(tableDefinition("assessment_sessions")).toMatch(
      /unique\s*\(user_id, session_id\)/i,
    );
    expect(tableDefinition("assessment_session_answers")).toMatch(
      /unique\s*\(user_id, idempotency_key\)/i,
    );
    expect(SQL).toMatch(
      /create trigger assessment_sessions_keep_question_count[\s\S]*before update of question_count[\s\S]*execute function public\.keep_assessment_session_question_count\(\)/i,
    );
    expect(SQL).toMatch(
      /if new\.question_count is distinct from old\.question_count then[\s\S]*raise exception/i,
    );
  });

  it("adds the indexes used by evidence and recalculation reads", () => {
    for (const index of [
      "assessment_sessions_user_status_completed_idx",
      "assessment_session_answers_user_answered_idx",
      "assessment_session_answers_session_idx",
      "exam_readiness_evidence_events_user_revision_idx",
      "exam_readiness_recalculation_jobs_user_status_lease_idx",
      "exam_readiness_snapshots_user_date_idx",
    ]) {
      expect(SQL).toMatch(new RegExp(`create index ${index}`, "i"));
    }
  });

  it("uses one retryable recalculation row per complete trigger key", () => {
    const jobs = tableDefinition("exam_readiness_recalculation_jobs");
    expect(jobs).toMatch(
      /unique\s*\(user_id, trigger_type, trigger_id, model_version, exam_scheme_version\)/i,
    );
    expect(jobs).toMatch(
      /check\s*\(status in \('processing', 'succeeded', 'failed'\)\)/i,
    );
    expect(jobs).toMatch(/check\s*\(attempt_count >= 0\)/i);
    expect(jobs).toMatch(/check\s*\(evidence_revision >= 0\)/i);
    expect(SQL).toMatch(
      /on conflict \(user_id, trigger_type, trigger_id, model_version, exam_scheme_version\)[\s\S]*do update[\s\S]*status = 'processing'[\s\S]*attempt_count = exam_readiness_recalculation_jobs\.attempt_count \+ 1/i,
    );
    expect(SQL).toMatch(
      /exam_readiness_recalculation_jobs\.status = 'failed'[\s\S]*or[\s\S]*exam_readiness_recalculation_jobs\.lease_expires_at <= statement_timestamp\(\)/i,
    );
  });

  it("serializes calculation with a per-user lease and rejects stale completion", () => {
    const state = tableDefinition("exam_readiness_evidence_state");
    expect(state).toMatch(/lease_job_id\s+uuid/i);
    expect(state).toMatch(/lease_expires_at\s+timestamptz/i);
    expect(SQL).toMatch(
      /from public\.exam_readiness_evidence_state[\s\S]*where user_id = p_user_id[\s\S]*for update/i,
    );
    expect(SQL).toMatch(
      /from public\.exam_readiness_evidence_state[\s\S]*where user_id = v_job\.user_id[\s\S]*for update/i,
    );
    expect(SQL).toMatch(
      /if v_revision <> p_expected_evidence_revision then[\s\S]*return 'stale'/i,
    );
    expect(SQL).toMatch(
      /if v_job\.status <> 'processing'[\s\S]*or v_job\.attempt_count <> p_expected_attempt[\s\S]*or v_job\.lease_expires_at <= statement_timestamp\(\)[\s\S]*then[\s\S]*return 'stale'/i,
    );
    expect(SQL).toMatch(
      /if v_job\.status <> 'processing'[\s\S]*or v_job\.attempt_count <> p_expected_attempt[\s\S]*or v_job\.lease_expires_at <= statement_timestamp\(\)[\s\S]*then[\s\S]*return;/i,
    );
  });

  it("atomically saves current and Tokyo-dated versioned snapshots", () => {
    expect(SQL).toMatch(
      /insert into public\.exam_readiness_current[\s\S]*on conflict \(user_id\) do update/i,
    );
    expect(SQL).toMatch(
      /insert into public\.exam_readiness_snapshots[\s\S]*on conflict \(user_id, snapshot_date, model_version, exam_scheme_version\) do update/i,
    );
    expect(SQL).toMatch(
      /at time zone 'Asia\/Tokyo'\)::date/i,
    );
    expect(SQL).toMatch(
      /update public\.exam_readiness_recalculation_jobs[\s\S]*status = 'succeeded'/i,
    );
    expect(SQL).toMatch(
      /update public\.exam_readiness_evidence_state[\s\S]*lease_job_id = null[\s\S]*lease_expires_at = null/i,
    );
  });

  it("registers one deterministic evidence event for inserted attempt facts", () => {
    expect(SQL).toMatch(
      /if exists \(select 1 from pg_temp\.question_exposure_inserted\) then[\s\S]*register_exam_readiness_evidence\([\s\S]*string_agg\([\s\S]*order by input\.question_id/i,
    );
    expect(SQL).toMatch(
      /on conflict \(user_id, event_key\) do nothing/i,
    );
  });

  it("hardens every RPC and grants execution only to service_role", () => {
    for (const rpc of RPCS) {
      const functionName = `public.${rpc.name}`;
      const signature = `${functionName}(${rpc.args})`;
      const escapedSignature = escapeRegExp(signature);

      expect(SQL).toMatch(
        new RegExp(
          `create or replace function ${escapeRegExp(functionName)}[\\s\\S]*?security definer\\s+set search_path = pg_catalog, public`,
          "i",
        ),
      );
      expect(SQL).toMatch(
        new RegExp(`alter function ${escapedSignature} owner to postgres`, "i"),
      );
      for (const role of ["public", "anon", "authenticated"]) {
        expect(SQL).toMatch(
          new RegExp(
            `revoke all on function ${escapedSignature} from ${role}`,
            "i",
          ),
        );
      }
      expect(SQL).toMatch(
        new RegExp(
          `grant execute on function ${escapedSignature} to service_role`,
          "i",
        ),
      );
      expect(SQL).not.toMatch(
        new RegExp(
          `grant execute on function ${escapedSignature} to (?:public|anon|authenticated)`,
          "i",
        ),
      );
    }
  });

  it("enables RLS without direct browser-role table grants", () => {
    for (const table of TABLES) {
      expect(SQL).toMatch(
        new RegExp(
          `alter table public\\.${table} enable row level security`,
          "i",
        ),
      );
      for (const role of ["public", "anon", "authenticated"]) {
        expect(SQL).toMatch(
          new RegExp(`revoke all on table public\\.${table} from ${role}`, "i"),
        );
      }
    }
  });
});
