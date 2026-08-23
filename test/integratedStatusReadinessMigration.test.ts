import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260823090000_integrated_status_nullable_readiness.sql";

function migrationSql(): string {
  expect(existsSync(path), `missing additive migration ${path}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("integrated status nullable readiness migration", () => {
  it("makes the compatibility score nullable", () => {
    expect(migrationSql()).toMatch(
      /alter table public\.integrated_learning_status[\s\S]*alter column readiness_score drop not null/i,
    );
  });

  it("clears every pre-cutover derived compatibility value", () => {
    expect(migrationSql()).toMatch(
      /update public\.integrated_learning_status[\s\S]*set readiness_score = null[\s\S]*where readiness_score is not null/i,
    );
  });
});
