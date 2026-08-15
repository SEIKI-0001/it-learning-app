# Cross-device First-seen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make first-seen Mastery evidence authoritative across devices, sessions, and delivery paths by classifying each logged-in answer against persisted server history before applying the P0 bonus.

**Architecture:** Keep `question_attempts` and `user_answers` as the existing history stores. Add a transaction-safe batch RPC that serializes first claims per `(user_id, question_id)`, records attempts, and returns `first | seen | unknown`; route that result through a small shared exposure module into the existing pure Mastery reducers. Anonymous users retain an AppState-based fallback, while logged-in failures become `unknown` and never receive a first-seen bonus.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript 5, Vitest 4, Supabase JS 2, PostgreSQL/Supabase CLI.

## Global Constraints

- Treat `question_attempts` plus `user_answers` as the authoritative historical record; do not add a duplicate exposure table.
- Preserve canonical question-bank and lesson question IDs. Never use an array index, displayed number, mode, route, or attempt ID as the history key.
- Do not change P0 Mastery weights, Review Due intervals, Weak Topic rules, Today ordering, checkpoint thresholds, or existing user progress.
- A logged-in failure to classify is `unknown`; client AppState must not upgrade it to `first`.
- Keep anonymous UX working with local history. Do not add anonymous-to-account history migration.
- Use only the active baseline and P0 migrations. Do not modify `supabase/legacy_migrations/`.
- `supabase/migrations/20260815064053_question_first_attempt_exposure.sql` is additive and is not applied to production in this task.
- Before changing App Router code, read the installed Route Handler guide under `node_modules/next/dist/docs/` and follow that version's conventions.
- Before writing the first test, read `superpowers:test-driven-development/writing-good-tests.md`; for every behavior change, observe RED before implementation and GREEN afterward.
- Stop after a local commit. Do not push, create a PR, merge to `main`, or run a linked production migration.

---

### Task 1: Lock the Exposure Domain Contract

**Files:**
- Create: `lib/questionExposure.ts`
- Create: `test/questionExposure.test.ts`
- Modify: `types/index.ts`
- Modify: `lib/learningLoop.ts`
- Modify: `test/learningLoop.test.ts`

**Interfaces:**

```ts
export type QuestionExposureState = "first" | "seen" | "unknown";

export type QuestionExposure = {
  questionId: string;
  state: QuestionExposureState;
  attemptedBefore: boolean | null;
  firstAttemptAt: string | null;
  attemptCount: number | null;
};

export type QuestionExposureMap = Readonly<Record<string, QuestionExposure>>;

export function getAnonymousQuestionExposureStates(
  previousAnswers: Pick<UserAnswer, "questionId" | "answeredAt">[],
  questionIds: string[],
): QuestionExposureMap;

export function getUnknownQuestionExposureStates(
  questionIds: string[],
): QuestionExposureMap;

export function exposureStateFor(
  exposures: QuestionExposureMap,
  questionId: string,
): QuestionExposureState;
```

`LearningEvidence` gains `exposureState: QuestionExposureState`. `TopicMasteryEvidence` keeps the persisted `isFirstSeen` boolean for backward compatibility and adds optional `exposureState`; newly-created evidence always derives `isFirstSeen` from `exposureState === "first"`.

- [ ] Read `superpowers:test-driven-development/writing-good-tests.md` completely.
- [ ] Add table-driven tests proving anonymous no-history → `first`, anonymous prior correct → `seen`, anonymous prior incorrect → `seen`, duplicate input IDs are returned once, and an omitted authoritative result → `unknown`.
- [ ] Change the existing first-seen Mastery tests so `first` receives the existing bonus, `seen` does not, and `unknown` does not. Add a legacy-normalization test proving persisted evidence that only has `isFirstSeen` remains readable.
- [ ] Run `npx vitest run test/questionExposure.test.ts test/learningLoop.test.ts` and confirm RED because the types/functions do not exist.
- [ ] Add the three-state types and pure map helpers without React, fetch, or Supabase dependencies.
- [ ] Update `applyLearningEvidence` to compute `isFirstSeen` once from the trusted state, apply the bonus only for `first` and non-confirmation evidence, and persist both the derived boolean and state.
- [ ] Run `npx vitest run test/questionExposure.test.ts test/learningLoop.test.ts` until GREEN.
- [ ] Commit with `git commit -m "feat(learning): add question exposure domain contract"`.

---

### Task 2: Add the Transaction-safe Batch Migration

**Files:**
- Create: `supabase/migrations/20260815064053_question_first_attempt_exposure.sql`
- Create: `test/questionExposureMigration.test.ts`

**Migration contract:**

```sql
alter table public.question_attempts
  add column if not exists is_first_attempt boolean;

create unique index if not exists question_attempts_one_first_per_user_question_idx
  on public.question_attempts (user_id, question_id)
  where is_first_attempt;

create index if not exists question_attempts_user_question_answered_at_idx
  on public.question_attempts (user_id, question_id, answered_at);

create index if not exists user_answers_user_question_answered_at_idx
  on public.user_answers (user_id, question_id, answered_at);
```

The migration also creates `public.record_question_attempts_with_exposure(p_user_id uuid, p_attempts jsonb)`. It is `SECURITY DEFINER`, sets a safe `search_path`, validates a non-empty caller ID and JSON array, revokes execution from `public`, `anon`, and `authenticated`, and grants execution only to `service_role`.

- [ ] Write a migration-contract test that reads the exact new SQL file and asserts: additive column; cross-table backfill; `NOT NULL DEFAULT false`; the partial unique index; both composite history indexes; sorted transaction advisory locks; a set-based insert; `ON CONFLICT DO NOTHING`; a result containing all five exposure fields; explicit execute revokes and the `service_role` grant.
- [ ] Add a schema snapshot assertion that `supabase/schema.sql` is not manually made authoritative: the migration test must pass from the migration file before snapshot regeneration is considered.
- [ ] Run `npx vitest run test/questionExposureMigration.test.ts` and confirm RED because the migration is absent.
- [ ] Implement the migration. Backfill only the earliest valid `question_attempts` row when no earlier `user_answers` row exists; correctness must not affect the decision.
- [ ] In the RPC, normalize the JSON batch into an ordinal temporary relation, collapse duplicate canonical IDs to one attempted fact, acquire `pg_advisory_xact_lock` for sorted unique `(user, question)` keys, then perform two indexed set-based history scans before inserting.
- [ ] Return `first` only for a newly-established first fact, `seen` when either history table already contains the ID, and post-insert diagnostic `firstAttemptAt`/`attemptCount`. De-duplicate dual-written rows by their compatible answer fingerprint so mock compatibility writes do not inflate the diagnostic count.
- [ ] Ensure an official-past retransmission handled by the existing unique attempt-group constraint returns `seen` without inserting a duplicate row.
- [ ] Run `npx vitest run test/questionExposureMigration.test.ts test/questionAttemptsSchema.test.ts` until GREEN.
- [ ] Commit with `git commit -m "feat(db): add atomic first-attempt classification"`.

---

### Task 3: Make the Save API Return Authoritative Exposure

**Files:**
- Create: `lib/questionExposureServer.ts`
- Create: `test/questionExposureServer.test.ts`
- Modify: `app/api/question-attempts/save/route.ts`
- Modify: `lib/dbMappers.ts`
- Modify: `test/questionAttemptsSaveRoute.test.ts`
- Modify: `test/questionAttemptsDuplicateSave.test.ts`

**Interfaces:**

```ts
export async function recordQuestionAttemptsWithExposure(
  supabase: ServiceSupabase,
  userId: string,
  inputs: QuestionAttemptInput[],
): Promise<{ saved: number; exposures: QuestionExposure[] }>;
```

Successful route response:

```ts
{
  ok: true,
  saved: number,
  exposures: QuestionExposure[],
}
```

- [ ] Locate and read the installed Next.js Route Handler guide with `rg --files node_modules/next/dist/docs | rg 'route-handler|route-handlers'`, then read the relevant file completely.
- [ ] Add server-adapter tests proving one batch calls `.rpc("record_question_attempts_with_exposure", ...)` exactly once for 100 attempts, maps valid rows, rejects malformed RPC data as unknown, and never accepts `state`/`isFirstSeen` from client input.
- [ ] Extend route tests for: authenticated first; authenticated seen after an earlier incorrect answer; official past server-side canonicalization; 401; recording lock; invalid input; missing Supabase; and RPC failure returning a non-authoritative response rather than a first claim.
- [ ] Change the duplicate-save regression to assert idempotent `seen` exposure and no duplicate official attempt.
- [ ] Run `npx vitest run test/questionExposureServer.test.ts test/questionAttemptsSaveRoute.test.ts test/questionAttemptsDuplicateSave.test.ts` and confirm RED.
- [ ] Extract the RPC adapter, map `QuestionAttemptInput` to the RPC JSON shape in one place, and strictly parse its response into the domain contract.
- [ ] Replace the route's direct bulk-insert/row-by-row fallback with the single transaction RPC. Keep authentication, billing recording gate, timestamp sanitization, and official-past server-side correctness/topic metadata unchanged.
- [ ] On migration/RPC/persistence failure, return an error status and no `first` state. Do not fall back to a SELECT-then-INSERT race or a local-state decision for logged-in users.
- [ ] Run the focused tests until GREEN.
- [ ] Commit with `git commit -m "feat(api): return authoritative question exposure"`.

---

### Task 4: Add One Client Batch Boundary

**Files:**
- Modify: `lib/userSession.ts`
- Create: `test/userSessionQuestionExposure.test.ts`

**Interfaces:**

```ts
export async function saveQuestionAttemptsWithExposure(
  userId: string,
  attempts: QuestionAttemptInput[],
): Promise<QuestionExposureMap>;
```

The existing `saveQuestionAttempts` remains as a compatibility wrapper for paths that only need history recording. It calls the async helper without exposing or inventing exposure state.

- [ ] Write fetch-mocked tests proving: 100 attempts use one HTTP request; the exposure array becomes a question-ID map; a non-2xx response, malformed JSON, or network failure returns `unknown` for every requested canonical ID; empty input makes no request.
- [ ] Run `npx vitest run test/userSessionQuestionExposure.test.ts` and confirm RED.
- [ ] Implement the awaited helper with no per-question network calls and no retry that could create a second first claim.
- [ ] Keep `saveQuestionAttempts` source-compatible for check-pack callers, but implement it by discarding the awaited helper's result.
- [ ] Run the focused test until GREEN.
- [ ] Commit with `git commit -m "feat(learning): batch question exposure requests"`.

---

### Task 5: Connect Lesson, Review, and Checkpoints

**Files:**
- Modify: `lib/study.ts`
- Modify: `lib/studySession.ts`
- Modify: `lib/checkpointExam.ts`
- Modify: `lib/checkpoints.ts`
- Modify: `components/learn/TopicCompletionQuiz.tsx`
- Modify: `components/checkpoint/CheckpointExamRunner.tsx`
- Modify: `app/checkpoint/[checkpointId]/final/page.tsx`
- Modify: `test/study.test.ts`
- Modify: `test/learningLoopIntegration.test.ts`
- Modify: `test/checkpointExam.test.ts`
- Modify: `test/finalExam.test.ts`
- Modify: `test/TopicCompletionQuiz.test.tsx`

**Pure reducer signatures:**

```ts
completeTopicStudy(state, topicId, answers, exposures, now)
completeStudySession(state, topicId, answers, exposures, signals, now)
recordCheckpointExamResult(state, answers, exposures, now)
recordFinalExamAttempt(state, attempt, answers, exposures, signals, now)
```

- [ ] Add failing reducer tests where a fresh AppState plus server `seen` produces no bonus, server `first` produces the existing bonus, and server `unknown` produces none. Repeat with a prior incorrect history fixture.
- [ ] Add component tests proving logged-in flows await the batch exposure response before updating Mastery, while anonymous flows use `getAnonymousQuestionExposureStates` and complete without an API call.
- [ ] Add a same-canonical-ID test that records a question in checkpoint context and later classifies the lesson/review occurrence as `seen`.
- [ ] Run the five focused suites and confirm RED.
- [ ] Pass a required exposure map into each pure reducer and remove every `new Set(state.answers).has(...)` first-seen decision from these paths.
- [ ] In `TopicCompletionQuiz`, build one canonical attempt batch, await authoritative exposure for a logged-in user, then call `completeStudySession`; preserve `user_answers` compatibility persistence after classification. Use local fallback only when there is no logged-in user.
- [ ] Apply the same order in checkpoint and final runners: record/classify once, update Mastery, then persist AppState/progress. A failed authoritative call must keep UX moving with `unknown`.
- [ ] Run `npx vitest run test/study.test.ts test/learningLoopIntegration.test.ts test/checkpointExam.test.ts test/finalExam.test.ts test/TopicCompletionQuiz.test.tsx` until GREEN.
- [ ] Commit with `git commit -m "feat(learning): use server exposure in study checkpoints"`.

---

### Task 6: Connect Mock and Theme/Summary Exams

**Files:**
- Modify: `lib/mockExam.ts`
- Modify: `app/mock-exam/page.tsx`
- Modify: `lib/themeExam.ts`
- Modify: `components/themeExam/ThemeExamRunner.tsx`
- Modify: `test/mockExam.test.ts`
- Create: `test/themeExamLearningLoop.test.ts`
- Create: `test/ThemeExamRunner.test.tsx`

**Interfaces:**

```ts
recordMockExamResult(state, answers, result, now, exposures)

recordThemeExamLearningResult(
  state: AppState,
  result: ThemeExamResult,
  answeredAt: string,
  exposures: QuestionExposureMap,
): AppState
```

- [ ] Add a 100-question mock regression asserting one batch exposure request, server `seen` wins over a fresh AppState, and all evidence uses canonical question IDs.
- [ ] Add pure theme-exam tests proving incorrect answers create `summary_exam` evidence, a Weak Topic, and next-day Review Due; `first`, `seen`, and `unknown` obey the shared bonus rule.
- [ ] Add runner tests proving the theme result waits for exposure before saving updated AppState and still renders when classification fails.
- [ ] Run `npx vitest run test/mockExam.test.ts test/themeExamLearningLoop.test.ts test/ThemeExamRunner.test.tsx` and confirm RED.
- [ ] Change mock completion from fire-and-forget attempt persistence to one awaited batch classification before `recordMockExamResult`; retain the existing `user_answers` compatibility write without a second `question_attempts` write.
- [ ] Implement `recordThemeExamLearningResult` through `updateLearningLoopProgress` with `kind: "summary_exam"`, then call it from `ThemeExamRunner` after one batch classification.
- [ ] Preserve scoring, pass/fail displays, navigation, and current question shuffle behavior.
- [ ] Run the focused suites until GREEN.
- [ ] Commit with `git commit -m "feat(learning): classify mock and summary exam exposure"`.

---

### Task 7: Connect Official Past Exam Without Losing Resume Safety

**Files:**
- Modify: `types/pastExam.ts`
- Modify: `lib/pastExam/saveAttempts.ts`
- Modify: `lib/pastExam/scoring.ts`
- Modify: `components/pastExam/PastExamRunner.tsx`
- Modify: `test/pastExamSession.test.ts`
- Modify: `test/pastExamAttempts.test.ts`
- Modify: `test/pastExamLearningLoop.test.ts`
- Modify: `test/PastExamRunner.test.tsx`
- Modify: `test/PastExamSubmitOnce.test.tsx`

**Session compatibility:**

```ts
export type PastExamAnswer = {
  selected: string | null;
  answeredAt: string;
  timeSpentSeconds?: number;
  exposureState?: QuestionExposureState;
};
```

Keep existing sessions readable: the new field is optional and the parser accepts old schema-version-1 payloads.

- [ ] Add parser tests proving old resumable sessions without exposure state still load as `unknown`, and new sessions preserve `first`/`seen`/`unknown`.
- [ ] Add practice-mode tests proving each saved answer stores the returned state before later grading; on failure it stores `unknown`.
- [ ] Add exam-mode tests proving the full result is classified in one batch at grading, outstanding practice saves are awaited once, and an official retransmission is not counted as first.
- [ ] Add the cross-path regression: an ID previously answered incorrectly by mock/check-pack history is `seen` in official past exam despite a fresh local AppState.
- [ ] Run the five focused suites and confirm RED.
- [ ] Make `saveSingleAttempt` and `saveAllAttempts` async and return a `QuestionExposureMap`. Remove any second question-attempt write from the runner.
- [ ] Persist practice exposure state in the existing session answer object. At final grading, merge stored practice states with the exam-mode batch result; any missing ID becomes `unknown`.
- [ ] Pass the final map into `recordPastExamLearningResult` and remove its local seen-set decision.
- [ ] Run `npx vitest run test/pastExamSession.test.ts test/pastExamAttempts.test.ts test/pastExamLearningLoop.test.ts test/PastExamRunner.test.tsx test/PastExamSubmitOnce.test.tsx` until GREEN.
- [ ] Commit with `git commit -m "feat(learning): persist official exam exposure state"`.

---

### Task 8: Prove Cross-device, Canonical-ID, and P0 Regression Behavior

**Files:**
- Create: `test/crossDeviceFirstSeenIntegration.test.ts`
- Modify only if a canonical-ID regression is exposed: `lib/questionBank.ts`
- Modify only if a canonical-ID regression is exposed: `lib/checkpointExam.ts`
- Modify only if a canonical-ID regression is exposed: `lib/mockExam.ts`
- Modify only if a canonical-ID regression is exposed: `lib/themeExam.ts`

**End-to-end domain scenario:**

```text
device A answer -> persisted first
fresh device B AppState -> server seen
no first bonus for A on device B
unanswered B -> server first
first bonus for B
100-question mock -> one request / one RPC
```

- [ ] Write the complete scenario with mocked server persistence independent of AppState identity; include a first answer that is incorrect and a later occurrence from another delivery path.
- [ ] Assert canonical identity across lesson confirmation, review, checkpoint, mock, theme summary, and official past exam adapters. The same source problem must have the exact same string ID in every path.
- [ ] Assert the P0 sequence still works: learning → Mastery → Review Due → summary/mock miss → Weak Topic → Today priority → review success → Mastery update → later Review Due.
- [ ] Assert `unknown` never changes the expected score by the first-seen bonus and never becomes `first` merely because a new AppState lacks history.
- [ ] Run `npx vitest run test/crossDeviceFirstSeenIntegration.test.ts test/learningLoopIntegration.test.ts test/todaysLearningQueue.test.ts` and confirm RED before any canonical-ID fix, or document that RED is caused only by the new integration surface.
- [ ] Make only the smallest canonical-ID adapter correction required by the tests; do not introduce route-specific IDs.
- [ ] Run the focused suites until GREEN.
- [ ] Commit with `git commit -m "test(learning): verify cross-device first-seen flow"`.

---

### Task 9: Reconstruct Baseline → P0 → P1-1 Locally

**Files:**
- Verify: `supabase/migrations/20260813071636_production_baseline.sql`
- Verify: `supabase/migrations/20260814051517_learning_loop_p0.sql`
- Verify: `supabase/migrations/20260815064053_question_first_attempt_exposure.sql`
- Regenerate: `supabase/schema.sql`

- [ ] Confirm Docker and the Supabase CLI are available; use only a disposable local Supabase database and never `--linked`.
- [ ] Rebuild the empty local database so migrations apply exactly in baseline → P0 → P1-1 order.
- [ ] Seed only transaction-test fixtures in the disposable database: one user, one prior-correct question, one prior-incorrect question, and two simultaneous new attempts for one canonical ID.
- [ ] Execute the RPC tests against the local database and prove: no history → first; either prior correctness → seen; concurrent transactions produce exactly one `is_first_attempt=true`; 100 inputs are processed by one function call; duplicate official submission stays idempotent.
- [ ] Query the local catalog and confirm the column, partial unique index, two lookup indexes, function security, execute ACL, RLS status, and existing baseline/P0 objects.
- [ ] Generate `supabase/schema.sql` from the fully migrated local schema using the repository's documented schema-only snapshot process. Do not hand-edit it and keep migrations as the schema source of truth.
- [ ] Run `npx vitest run test/questionExposureMigration.test.ts test/questionAttemptsSchema.test.ts` after regeneration.
- [ ] Review `git diff -- supabase/schema.sql` and confirm it contains only the P1-1 generated schema effects.
- [ ] Commit with `git commit -m "chore(supabase): refresh generated schema snapshot"`.

---

### Task 10: Full Verification and Final Feature Commit

**Files:**
- Verify all changed TypeScript, TSX, SQL, test, schema snapshot, spec, and plan files.

- [ ] Run the focused P1-1 suite: `npx vitest run test/questionExposure.test.ts test/questionExposureMigration.test.ts test/questionExposureServer.test.ts test/userSessionQuestionExposure.test.ts test/crossDeviceFirstSeenIntegration.test.ts`.
- [ ] Run P0 and delivery-path regression suites: `npx vitest run test/learningLoop.test.ts test/learningLoopIntegration.test.ts test/todaysLearningQueue.test.ts test/study.test.ts test/checkpointExam.test.ts test/finalExam.test.ts test/mockExam.test.ts test/themeExamLearningLoop.test.ts test/pastExamLearningLoop.test.ts test/pastExamAttempts.test.ts`.
- [ ] Run `npm test` and confirm every suite passes.
- [ ] Run `npm run typecheck` and confirm exit 0.
- [ ] Run `npm run build` and confirm exit 0.
- [ ] Run ESLint only on changed TypeScript/TSX files with `npx eslint <changed-files>` and confirm exit 0.
- [ ] Run `git diff --check` and confirm no whitespace errors.
- [ ] Run `git status --short`, inspect every changed file, and confirm no secret, local Supabase state, build output, or unrelated change is included.
- [ ] If verification required a final code correction, first add a regression test, observe RED/GREEN, and commit with `git commit -m "fix(learning): finalize cross-device exposure integration"`.
- [ ] Record final test counts, migration filename, changed files, and commit SHA for the completion report.
- [ ] Stop on `feat/cross-device-first-seen`; do not push, open a PR, merge, or apply the migration to production.
