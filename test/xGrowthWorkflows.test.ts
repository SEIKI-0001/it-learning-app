import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("weekly PDCA workflow safety defaults", () => {
  const wf = readFileSync(".github/workflows/x-growth-weekly.yml", "utf8");
  it("starts on schedule only when enabled, only on main, read-only token", () => {
    expect(wf).toContain("if: github.ref == 'refs/heads/main' && (github.event_name == 'workflow_dispatch' || vars.X_GROWTH_WEEKLY_ENABLED == 'true')");
    expect(wf).toContain("X_GROWTH_WEEKLY_ENABLED: ${{ vars.X_GROWTH_WEEKLY_ENABLED || 'false' }}");
    expect(wf).toContain("permissions:\n  contents: read");
    expect(wf).toContain("cancel-in-progress: false");
  });
  it("does not save or call AI unless explicitly enabled; the AI key is only passed when AI is on", () => {
    expect(wf).toContain("vars.X_GROWTH_WEEKLY_SAVE || 'false'");
    expect(wf).toMatch(/save:[\s\S]*?default: false/);
    expect(wf).toContain("X_GROWTH_AI_ANALYSIS: ${{ vars.X_GROWTH_AI_ANALYSIS || 'false' }}");
    expect(wf).toContain("ANTHROPIC_API_KEY: ${{ vars.X_GROWTH_AI_ANALYSIS == 'true' && secrets.ANTHROPIC_API_KEY || '' }}");
  });
  it("cannot post or read X: no X credentials, only the weekly CLI runs, no shell expression injection", () => {
    expect(wf).not.toMatch(/X_API_KEY|X_ACCESS_TOKEN|x:post/);
    expect(wf.match(/run: npm run [^\n]+/g)).toEqual(["run: npm run x:growth -- weekly --fixture --scenario \"$SCENARIO\" --output \"$RUNNER_TEMP/x-growth-weekly.md\"", "run: npm run x:growth -- weekly --output \"$RUNNER_TEMP/x-growth-weekly.md\""]);
    expect(wf).not.toMatch(/run:[^\n]*\$\{\{/);
  });
});

describe("posting workflow stays unchanged by default", () => {
  const wf = readFileSync(".github/workflows/x-organic-post.yml", "utf8");
  it("experiments default to off and the schedule/limits are untouched", () => {
    expect(wf).toContain("X_GROWTH_EXPERIMENTS_ENABLED: ${{ vars.X_GROWTH_EXPERIMENTS_ENABLED || 'false' }}");
    expect(wf).toContain("- cron: '0 22 * * *'");
    expect(wf).toContain("X_POST_DAILY_LIMIT: ${{ vars.X_POST_DAILY_LIMIT || '1' }}");
    expect(wf).toContain("X_POST_DRY_RUN: ${{ github.event_name == 'workflow_dispatch' && (inputs.dry_run && 'true' || 'false') || vars.X_POST_DRY_RUN || 'true' }}");
  });
});
