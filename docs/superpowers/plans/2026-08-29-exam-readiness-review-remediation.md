# Exam Readiness Final Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the three load-bearing final-review defects without weakening P1-1 first-attempt authority, assessment idempotency, or P0/readiness ordering.

**Architecture:** Keep `question_attempts.is_first_attempt` as the P1-1 authority. Move assessment-session ownership/status/source validation into the same PostgreSQL transaction and row lock as attempt insertion, with idempotent replay returning the original exposure state. On the client, treat any ambiguous attempt-save response as a retryable failure and persist the complete frozen finalization payload before the first mutation so every assessment path can resume after reload and acknowledge P0 publication before showing results.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL PL/pgSQL, Vitest/Testing Library, pgTAP.

**Spec:** `docs/superpowers/specs/2026-08-16-exam-readiness-p1-2-design.md`

## Global Constraints

- `origin/main` is the only release truth; do not merge or deploy until the final independent review is clean.
- Continue in `.worktrees/exam-readiness-p1-2-spec`; do not switch the shared main worktree.
- Use strict RED → GREEN TDD for every production behavior change.
- `Topic Mastery` remains sourced from `topic_mastery_stats`; the calculator must not add an independent Mastery model.
- `question_attempts.is_first_attempt` remains the authoritative P1-1 `first`/`seen` fact. P0 evidence may contribute richer `kind`/Review semantics but must not overwrite an authoritative attempt exposure state.
- An assessment result is not shown and its pending mutation is not cleared until attempt persistence, session completion, the assessment P0 transaction, and its acknowledgement have all succeeded.
- Exact retries reuse frozen IDs, timestamps, answers, exposures/P0 payloads, and trigger identity. `unknown` is never converted to `seen`.
- Assessment attempt validation and insert must execute under one database transaction while holding a lock on the owned session row.
- Database changes are additive. Regenerate `supabase/schema.sql` only with `scripts/generate-supabase-schema.sh`; never hand-edit the snapshot.
- Security-definer RPCs are service-role only, use a hardened `search_path`, derive user identity server-side, and reject cross-user, wrong-source, wrong-mode, and terminal-session attempts.
- Before editing Next.js routes, read the installed guide in `node_modules/next/dist/docs/`; after TSX changes, apply React best-practice review.
- Stage explicit files only; ignored SDD reports remain untracked.

---

### Task 1: Preserve P1-1 First-Attempt Authority During P0 Reconciliation

**Files:**
- Modify: `lib/examReadiness/evidence.ts`
- Modify: `test/examReadinessEvidence.test.ts`
- Modify: `test/examReadinessRepository.test.ts`

**Interfaces:**
- Consumes: `reconcileP0AndAttemptEvents(p0Events, attemptEvents)` and `ReadinessAnswerEvidence.firstAttemptState`.
- Produces: one reconciled event that retains the matched `question_attempt` identity, session/idempotency fields, and `firstAttemptState`, while taking only P0's richer `kind` and Review-specific semantics.

- [ ] **Step 1: Add failing authority tests**

```ts
it("keeps authoritative attempt first state when matching P0 exposure is unknown", () => {
  const [event] = reconcileP0AndAttemptEvents(
    [p0Evidence({ firstAttemptState: "unknown", kind: "review" })],
    [attemptEvidence({ firstAttemptState: "first", kind: "confirmation" })],
  );
  expect(event.firstAttemptState).toBe("first");
  expect(event.kind).toBe("review");
});

it("keeps authoritative attempt seen state when matching P0 exposure says first", () => {
  const [event] = reconcileP0AndAttemptEvents(
    [p0Evidence({ firstAttemptState: "first" })],
    [attemptEvidence({ firstAttemptState: "seen" })],
  );
  expect(event.firstAttemptState).toBe("seen");
});
```

- [ ] **Step 2: Run the focused tests and record the expected RED**

Run: `npx vitest run test/examReadinessEvidence.test.ts test/examReadinessRepository.test.ts`

Expected: the new cases fail because reconciliation currently assigns `p0Event.firstAttemptState`.

- [ ] **Step 3: Make the minimal authority fix**

```ts
return {
  ...attemptEvent,
  kind: p0Event.kind,
  firstAttemptState: attemptEvent.firstAttemptState,
};
```

Do not change the one-to-one physical-fact match, timestamp equality, canonical-question match, or later-attempt preservation.

- [ ] **Step 4: Run focused calculator/repository regressions**

Run: `npx vitest run test/examReadinessEvidence.test.ts test/examReadinessRepository.test.ts test/examReadinessComponents.test.ts test/examReadinessCalculator.test.ts`

- [ ] **Step 5: Commit explicit files**

```bash
git add lib/examReadiness/evidence.ts test/examReadinessEvidence.test.ts test/examReadinessRepository.test.ts
git commit -m "fix(readiness): preserve P1-1 attempt authority"
```

---

### Task 2: Record Assessment Attempts Under the Session Lock

**Files:**
- Create: `supabase/migrations/20260829070000_assessment_attempt_recording.sql`
- Modify: `supabase/schema.sql` (generated only)
- Modify: `supabase/tests/question_exposure_test.sql`
- Modify: `supabase/tests/assessment_session_completion_test.sql`
- Modify: `app/api/question-attempts/save/route.ts`
- Modify: `lib/questionExposureServer.ts`
- Modify: `lib/userSession.ts`
- Modify: `test/questionAttemptsExposureRoute.test.ts`
- Modify: `test/questionExposureServer.test.ts`
- Modify: `test/userSessionQuestionExposure.test.ts`
- Create or modify: `test/assessmentAttemptRecordingMigration.test.ts`

**Interfaces:**
- Produces RPC:

```sql
public.record_assessment_question_attempts_with_exposure(
  p_user_id uuid,
  p_session_id uuid,
  p_attempts jsonb
) returns table (
  question_id text,
  state text,
  attempted_before boolean,
  first_attempt_at timestamptz,
  attempt_count bigint,
  saved boolean
)
```

- Produces server adapter:

```ts
recordAssessmentQuestionAttemptsWithExposure(
  supabase: RpcClient,
  userId: string,
  sessionId: string,
  inputs: QuestionAttemptInput[],
): Promise<{ saved: number; exposures: QuestionExposure[] }>;
```

- Produces strict client result:

```ts
export type AuthenticatedQuestionExposureResult = {
  authState: "authenticated";
  userId: string;
  exposures: QuestionExposureMap;
};

export class AssessmentAttemptSaveError extends Error {
  readonly code: "network" | "http" | "malformed_response" | "authentication";
}

saveAssessmentQuestionAttemptsForCurrentSession(
  attempts: QuestionAttemptInput[],
): Promise<AuthenticatedQuestionExposureResult>;
```

- Existing ungrouped learning flow keeps `saveQuestionAttemptsForCurrentSession`; assessment runners switch to the strict API.

- [ ] **Step 1: Add pgTAP RED cases using genuinely concurrent database connections**

Cover these literal behaviors:

```text
owned in_progress + matching source/mode → rows insert and exposures return
cross-user session → SQLSTATE 23503, zero attempt rows
wrong source or official mode → SQLSTATE 23503, zero attempt rows
completed/abandoned session → SQLSTATE 23503, zero attempt rows
recorder holds the session lock, concurrent completion waits, then completes with the inserted attempts
completion commits first, recorder waits, then rejects and inserts zero rows
exact replay after a lost response → one row, same first/seen state, same attempt_count, no second evidence revision
```

Run the new pgTAP file against a unique disposable PostgreSQL container and record the expected RED before creating the migration.

- [ ] **Step 2: Add route/server/client RED tests**

```ts
it("uses the atomic assessment recorder for a grouped assessment batch", async () => {
  // Assert the production route calls the assessment RPC adapter once and
  // does not perform a separate assessment_sessions status query.
});

it("throws a retryable error for a committed-but-unacknowledged assessment save", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("connection lost"));
  await expect(saveAssessmentQuestionAttemptsForCurrentSession(attempts))
    .rejects.toMatchObject({ code: "network" });
});

it("never returns authenticated progress inputs from malformed or 5xx responses", async () => {
  await expect(saveAssessmentQuestionAttemptsForCurrentSession(attempts))
    .rejects.toBeInstanceOf(AssessmentAttemptSaveError);
});
```

- [ ] **Step 3: Implement the additive service-role-only RPC**

The function must:

```sql
select source, mode, status
into v_source, v_mode, v_status
from public.assessment_sessions
where user_id = p_user_id and session_id = p_session_id
for update;
```

Then reject missing/non-`in_progress` sessions and reject any attempt whose `attempt_group_id`, mapped source, or official mode differs. Insert under that lock. Add an idempotency constraint for non-official grouped assessment rows, limited to rows with `question_version is null`, so exact replay cannot duplicate them. On conflict, return the persisted exact row's authoritative `is_first_attempt`; never recalculate a replayed first answer as `seen`. Preserve one deterministic evidence event and do not increment revision on exact replay.

- [ ] **Step 4: Remove the route TOCTOU check and use the atomic adapter**

Grouped assessment batches must call `recordAssessmentQuestionAttemptsWithExposure`; ungrouped batches continue to call `recordQuestionAttemptsWithExposure`. Reject mixed group IDs and mismatched attempt-group body data at the request boundary, but treat the RPC lock/validation as authoritative.

- [ ] **Step 5: Implement the strict assessment client API**

Return only confirmed authenticated responses. Throw `AssessmentAttemptSaveError` for 401, network, non-2xx, malformed, incomplete, or duplicate-question responses. Do not return or cache `{ authState: "unknown" }` from this API. The exact caller-owned batch remains retryable.

- [ ] **Step 6: Run focused GREEN tests**

Run:

```bash
npx vitest run test/questionAttemptsExposureRoute.test.ts test/questionExposureServer.test.ts test/userSessionQuestionExposure.test.ts test/assessmentAttemptRecordingMigration.test.ts
```

Rebuild a new disposable database, replay every active migration in order, and run all question-exposure plus assessment-session pgTAP files including the two concurrent lock-order cases.

- [ ] **Step 7: Regenerate and verify the schema snapshot**

Run `scripts/generate-supabase-schema.sh` against the verified disposable database. Generate twice and compare hashes; strip only the generator-owned canonical header and compare the body byte-for-byte with an independent direct dump. Run `git diff --check`.

- [ ] **Step 8: Commit explicit files**

```bash
git add supabase/migrations/20260829070000_assessment_attempt_recording.sql supabase/schema.sql supabase/tests/question_exposure_test.sql supabase/tests/assessment_session_completion_test.sql app/api/question-attempts/save/route.ts lib/questionExposureServer.ts lib/userSession.ts test/questionAttemptsExposureRoute.test.ts test/questionExposureServer.test.ts test/userSessionQuestionExposure.test.ts test/assessmentAttemptRecordingMigration.test.ts
git commit -m "fix(assessment): record attempts under session lock"
```

---

### Task 3: Persist and Resume Frozen Assessment Finalization

**Files:**
- Create: `lib/examReadiness/pendingFinalization.ts`
- Create: `test/pendingAssessmentFinalization.test.ts`
- Modify: `components/themeExam/ThemeExamRunner.tsx`
- Modify: `app/mock-exam/page.tsx`
- Modify: `components/checkpoint/CheckpointExamRunner.tsx`
- Modify: `app/checkpoint/[checkpointId]/final/page.tsx`
- Modify: `components/pastExam/PastExamRunner.tsx`
- Modify: `lib/pastExam/session.ts`
- Modify: `test/ThemeExamRunner.test.tsx`
- Modify: `test/AssessmentDeliveryRunners.test.tsx`
- Modify: `test/PastExamRunner.test.tsx`
- Modify: `test/assessmentSessionIntegration.test.ts`

**Interfaces:**
- Produces a versioned, per-session local persistence contract:

```ts
export type PendingAssessmentFinalization<TBase, TNext, TResult> = {
  version: 1;
  sessionId: string;
  source: "checkpoint" | "summary" | "mock" | "official_past";
  attempts: QuestionAttemptInput[];
  completion: CompleteAssessmentSessionInput;
  baseState: TBase;
  exposureResult?: AuthenticatedQuestionExposureResult;
  nextState?: TNext;
  result: TResult;
};

loadPendingAssessmentFinalization(sessionId: string): PendingAssessmentFinalization<unknown, unknown, unknown> | null;
savePendingAssessmentFinalization(value: PendingAssessmentFinalization<unknown, unknown, unknown>): void;
clearPendingAssessmentFinalization(sessionId: string): void;
```

Use one namespaced localStorage key per `sessionId`. Validation must reject malformed/version/source/session mismatches without executing a mutation. If existing official-past persistence already carries equivalent fields, adapt it to the shared invariants without duplicating a second competing pending record.

- [ ] **Step 1: Add storage RED tests**

```ts
it("round-trips the complete frozen attempt, completion, base-state, and result payload", () => {});
it("rejects malformed and cross-session pending records", () => {});
it("clears only the acknowledged session record", () => {});
```

- [ ] **Step 2: Add runner RED tests for all five delivery paths**

For summary/theme, mock, checkpoint, checkpoint-final, and official-past, cover:

```text
attempt save network/5xx/malformed → no completion, no P0 save, no result, pending retained
attempt save committed but response lost → reload retries identical attempts, gets authoritative exposures, then continues
session completion response lost → reload retries identical completion payload
P0 response lost → reload retries identical progress payload and trigger
local state/answers drift after first send → retry body remains byte-equivalent to the frozen payload
pending is cleared and result shown only after P0 acknowledgement
```

At least one non-official path must mount a fresh component after simulated response loss rather than rerendering the same refs. Keep the existing official-past reload tests and make them exercise the same acknowledgement rule.

- [ ] **Step 3: Persist pending before the first remote mutation**

Build and store the frozen attempts, timestamps, completion answers, base application state, and result before calling the strict assessment attempt API. Never assign a failed/unknown exposure result into pending state.

- [ ] **Step 4: Implement one resumable stage machine**

Use the same ordered stages in every runner:

```text
pending persisted
→ strict exact attempt save acknowledged
→ exposure result persisted
→ exact session completion acknowledged
→ next/P0 payload derived from frozen base state and persisted
→ assessment progress transaction acknowledged
→ local app state/result committed
→ pending cleared
```

On any thrown error, keep pending, keep answers frozen, show the retry control, and do not show the result. On mount, detect a matching pending record and resume from the first unacknowledged stage. Calls that were committed but lost their response must be safe because Task 2 and the existing completion/progress contracts are idempotent.

- [ ] **Step 5: Run focused GREEN suites**

Run:

```bash
npx vitest run test/pendingAssessmentFinalization.test.ts test/ThemeExamRunner.test.tsx test/AssessmentDeliveryRunners.test.tsx test/PastExamRunner.test.tsx test/assessmentSessionIntegration.test.ts test/userSessionQuestionExposure.test.ts
```

- [ ] **Step 6: Apply React and Next.js review gates**

Check effect cancellation, dependency arrays, localStorage access only on the client, duplicate-submit locks, accessibility of retry controls, and no server-only imports in client bundles. Run `npm run typecheck` and `npm run lint`.

- [ ] **Step 7: Commit explicit files**

```bash
git add lib/examReadiness/pendingFinalization.ts test/pendingAssessmentFinalization.test.ts components/themeExam/ThemeExamRunner.tsx app/mock-exam/page.tsx components/checkpoint/CheckpointExamRunner.tsx app/checkpoint/[checkpointId]/final/page.tsx components/pastExam/PastExamRunner.tsx lib/pastExam/session.ts test/ThemeExamRunner.test.tsx test/AssessmentDeliveryRunners.test.tsx test/PastExamRunner.test.tsx test/assessmentSessionIntegration.test.ts
git commit -m "fix(assessment): resume finalization after response loss"
```

---

### Task 4: Final Remediation Verification and Review

**Files:**
- Modify only if generated: `supabase/schema.sql`
- Create ignored report: `.superpowers/sdd/2026-08-29-exam-readiness-review-remediation/final-report.md`

**Interfaces:**
- Consumes the three task commits.
- Produces fresh release evidence and an independent whole-remediation review verdict.

- [ ] **Step 1: Run all release gates on the final tree**

```bash
npm run typecheck
npm run lint
npm test
npm run validate:questions
npm run build
git diff --check origin/main...HEAD
```

Record exact Node version, test counts, warnings, and exit codes.

- [ ] **Step 2: Run a fresh final database replay**

Create a uniquely named disposable PostgreSQL database from `template0`, apply all active migrations in order, confirm the migration dry-run is empty, and run every pgTAP file. Include genuine concurrency coverage for both recorder-before-completion and completion-before-recorder lock ordering. Remove all disposable resources afterward.

- [ ] **Step 3: Verify deterministic schema identity**

Generate `supabase/schema.sql` twice with the checked-in generator, compare complete hashes, and compare the normalized body with an independent direct dump.

- [ ] **Step 4: Request an independent final review**

Review the complete remediation range against this plan, the original spec, and the three residual findings. Any Critical or Important issue blocks main integration.

- [ ] **Step 5: Finish only after a clean review**

Use `superpowers:finishing-a-development-branch`. Merge/push `main` only after the user selects the integration option and the merged tree passes the required gates.
