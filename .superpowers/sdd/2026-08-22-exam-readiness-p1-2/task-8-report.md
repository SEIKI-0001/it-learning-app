# Task 8 Report — Persist Common Assessment Sessions Across Delivery Paths

## Status

Implemented the authenticated common assessment-session boundary, atomic database completion RPC, and delivery integration for mock, theme summary, checkpoint evidence, checkpoint final, and official past exam/practice runners.

## RED / GREEN

### Server route, service, and migration

The route, persistence service, and additive migration tests were written before implementation.

```text
npx vitest run test/assessmentSessionRoute.test.ts test/assessmentSessionIntegration.test.ts test/assessmentSessionMigration.test.ts
Test Files  3 failed (3)
```

The expected failures were missing `app/api/assessment-sessions/route.ts`, missing `lib/examReadiness/assessmentSession.ts`, and missing `supabase/migrations/20260823070000_assessment_session_completion.sql`.

After implementation:

```text
Test Files  3 passed (3)
Tests  18 passed (18)
```

### Client and runner integration

- The new assessment client contract and theme runner boundary initially failed five tests because the helpers and runner wiring did not exist. After implementation, both files passed six tests.
- Three new official-past runner cases initially failed while the previous 32 cases remained green. After the start-before-render adaptation, `PastExamRunner` and the existing submit-once suite passed all 41 cases.
- The mock/checkpoint/checkpoint-final delivery suite initially failed all three cases because questions appeared without a persisted common session. After implementation it passed all three.
- A final summary-runner edge case was introduced RED: with P0 state unavailable, the UI showed its result but left the common session incomplete. Completion was moved ahead of the optional P0 guard, and all four theme runner tests passed.

Final focused delivery/server regression:

```text
npx vitest run test/assessmentSessionRoute.test.ts test/assessmentSessionIntegration.test.ts test/assessmentSessionMigration.test.ts test/assessmentSessionClient.test.ts test/AssessmentDeliveryRunners.test.tsx test/ThemeExamRunner.test.tsx test/PastExamRunner.test.tsx test/PastExamSubmitOnce.test.tsx test/mockExam.test.ts test/themeExamLearningLoop.test.ts test/pastExamSession.test.ts test/pastExamAttempts.test.ts test/checkpointExam.test.ts test/finalExam.test.ts
Test Files  14 passed (14)
Tests  126 passed (126)
```

## Route security and lifecycle behavior

- `POST /api/assessment-sessions` is a named Next.js Route Handler using native `Request`/`Response`, default Node runtime, private no-store responses, and server-only auth/database access.
- The authenticated internal user is the only identity used. A body `userId` is explicitly ignored and never reaches the service.
- The parser is a strict discriminated `start | complete | abandon` union. Unknown actions/fields, malformed IDs/timestamps/counts/answers, and any client `firstAttemptState` are rejected.
- Start inserts one immutable `in_progress` frame. An identical replay returns the existing frame; a different source, mode, start time, or question count conflicts. A concurrent unique-key race is reread and checked against the same frame.
- Abandon performs only `in_progress -> abandoned`. An identical abandoned replay is idempotent; completed, conflicting abandoned, and missing sessions reject without mutation.
- Completion rejects answers beyond the fixed `questionCount`, duplicate answer identities, abandoned sessions, and conflicting terminal payloads.
- First/seen is derived only from matching `question_attempts` rows for the authenticated user, session attempt group, question type, question ID, and answer time. Missing/unavailable authoritative attempts become `unknown`.
- Official-past correctness, canonical Topic, and official exam field come from the authoritative attempt plus question bank/catalog. Client-supplied official facts are not trusted.
- Unanswered questions are absent from `assessment_session_answers`; the immutable start-time `questionCount` remains their denominator.
- Completion calls the hardened RPC, then recalculates only when `completed_now = true`. Recalculation failure is caught after saved facts and does not make delivery fail.

## Atomic completion migration

Added only `supabase/migrations/20260823070000_assessment_session_completion.sql`; the reviewed `20260822070000_exam_readiness_p1_2.sql` migration and `supabase/schema.sql` were not edited.

`public.complete_assessment_session(uuid, uuid, timestamptz, jsonb)`:

- is `SECURITY DEFINER`, postgres-owned, fixed to `search_path = pg_catalog, public`, revoked from `PUBLIC`, `anon`, and `authenticated`, and executable only by `service_role`;
- locks the user/session row before terminal decisions;
- validates the complete seven-field server-built answer array before writes;
- preserves the immutable denominator, inserts only answered facts, derives all session counts, transitions only `in_progress -> completed`, and registers `assessment:{sessionId}` in the same transaction;
- treats an exactly identical completed retry as `completed_now = false`, without another evidence revision;
- rejects conflicting retries and abandoned/other terminal sessions;
- rolls back answer/session/evidence writes together if validation or answer insertion fails.

The static migration-contract test passes. Every active migration was also replayed into a disposable Supabase PostgreSQL 17.6 container. The pgTAP fixture passed all 18 assertions (`ok 1` through `ok 18`, `finish()` with no failures), covering atomic success, fixed unanswered denominator, invalid-answer rollback, failed-insert rollback, identical retry, conflicting retry, terminal immutability, and one stable evidence revision. The uniquely named disposable container was removed after the run.

## Runner integration and ordering

- Mock exam: creates one UUID/start time per attempt, persists `source=mock, mode=exam` before mounting questions, tags every authoritative attempt with the session group, awaits classification, completes with answered items only, then writes P0 progress/answers. Retry creates a fresh attempt after the prior terminal completion.
- Theme summary: creates one UUID/start time, persists `source=summary, mode=exam` before questions, awaits the attempt batch, completes, then updates P0 Mastery/progress. Common completion still occurs when optional P0 state is unavailable. Existing rapid-submit protection remains.
- Checkpoint exam: now exposes an accessible explicit start control, persists `source=checkpoint, mode=exam` before mounting the quiz, awaits classification, completes, then writes evidence-only P0 checkpoint progress. Retry creates a new attempt after the completed session.
- Checkpoint final: generates a stable final-exam attempt UUID, persists checkpoint start before mounting questions, awaits classification, completes, then records checkpoint/gate P0 state and progress. Retry creates a new attempt after completion.
- Official past: uses the resumable local session UUID/start as the common frame, persists start before questions, carries that UUID as `attemptGroupId`, awaits official authoritative classification, completes with selected answers only, then writes P0 progress. Practice remains stored but calculator-ineligible; one-answer locking and resumability remain green. Only the existing explicit “start over” path abandons the discarded in-progress session; ordinary navigation does not.

All runners invoke the P1-1 attempt endpoint before common completion and invoke P0 progress only after completion. Client helpers return a validated lifecycle result and throw typed failures for network, HTTP, malformed-response, and unexpected-status outcomes. The runners expose retryable errors before advancing UI or P0 state; readiness recalculation remains isolated server-side after facts commit.

## React self-review

Applied the Vercel React best-practices checklist after editing the runner TSX files.

- Persistence remains in user event handlers; no effect-derived session state was added.
- Stable attempt/session identities are created once per start/retry interaction and reused by question-attempt and completion payloads.
- Start controls are disabled while the start request is pending, and questions are not mounted before that await boundary.
- No unstable effect dependency loop or new global listener was introduced.
- Existing runner structure, result views, navigation, official-practice answer locking, timer protection, and accessible button semantics were preserved. The checkpoint runner's new start control is a native labeled button.
- No unnecessary memoization, component-in-component definition, or new client data-fetching effect was introduced.

## Files

Added:

- `app/api/assessment-sessions/route.ts`
- `lib/examReadiness/assessmentSession.ts`
- `supabase/migrations/20260823070000_assessment_session_completion.sql`
- `supabase/tests/assessment_session_completion_test.sql`
- `test/assessmentSessionRoute.test.ts`
- `test/assessmentSessionIntegration.test.ts`
- `test/assessmentSessionMigration.test.ts`
- `test/assessmentSessionClient.test.ts`
- `test/AssessmentDeliveryRunners.test.tsx`
- `.superpowers/sdd/2026-08-22-exam-readiness-p1-2/task-8-report.md`

Modified:

- `lib/userSession.ts`
- `app/mock-exam/page.tsx`
- `components/themeExam/ThemeExamRunner.tsx`
- `components/checkpoint/CheckpointExamRunner.tsx`
- `app/checkpoint/[checkpointId]/final/page.tsx`
- `components/pastExam/PastExamRunner.tsx`
- `lib/pastExam/session.ts`
- `types/pastExam.ts`
- `test/ThemeExamRunner.test.tsx`
- `test/PastExamRunner.test.tsx`
- `test/PastExamSubmitOnce.test.tsx`

## Verification

- Next.js 16 route-handler guide read completely before Route Handler implementation.
- Focused Task 8 and delivery regression: 14 files, 126 tests passed.
- Disposable PostgreSQL pgTAP: 18/18 assertions passed after all active migrations replayed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no errors.
- `npm test`: 103 files, 1095 tests passed.
- `git diff --check`: passed.
- Question-bank data was not modified, so `npm run validate:questions` was not required.

## Concerns

- The recorded V1 limitation remains intact: start persists only total `questionCount`, so field-level summative performance cannot assign unanswered questions to official exam fields. No per-field unanswered denominator was invented.
- Vitest prints the existing Node `module.register()` deprecation warning and the existing unavailable-localStorage experimental warning; neither affects results.
- No implementation blocker remains.

---

## Fix Round 1 — Authoritative lifecycle failures and temporal matching

### Status

Resolved all four review findings across the shared client, route, persistence service, and all five delivery paths. No migration or RPC source changed; the existing additive completion migration and pgTAP contract were rerun unchanged.

### RED / GREEN evidence

RED was established independently at each boundary before implementation:

- Client contract: 9 tests, 8 expected failures for boolean fallback, HTTP/network swallowing, malformed lifecycle acceptance, and terminal start acceptance.
- Route timestamp parser: 22 tests, 8 expected failures for date-only, timezone-less, locale, impossible calendar/time, and invalid offset inputs.
- Persistence integration: 12 tests, 5 expected failures for raw timestamp equality, terminal start replay, official attempt instant matching, query failure degradation, and malformed attempt-row filtering.
- `TopicQuiz`: 7 tests, 1 expected failure because asynchronous completion failure permanently latched the quiz as done.
- Mock/checkpoint/checkpoint-final runners: 9 tests, 6 expected failures because failed starts mounted questions and failed completions advanced result/P0 state.
- Theme summary runner: 6 tests, 2 expected failures for failed start and completion ordering.
- Official past runner: 38 tests, 3 expected failures for start, completion, and abandon failure handling.

Final focused GREEN:

```text
npx vitest run test/assessmentSessionMigration.test.ts test/assessmentSessionRoute.test.ts test/assessmentSessionIntegration.test.ts test/assessmentSessionClient.test.ts test/AssessmentDeliveryRunners.test.tsx test/ThemeExamRunner.test.tsx test/PastExamRunner.test.tsx test/PastExamSubmitOnce.test.tsx test/TopicQuiz.test.tsx test/mockExam.test.ts test/themeExamLearningLoop.test.ts test/pastExamSession.test.ts test/pastExamAttempts.test.ts test/checkpointExam.test.ts test/finalExam.test.ts
Test Files  15 passed (15)
Tests  172 passed (172)
```

### Route security, validation, and idempotency

- The authenticated server identity remains the sole user authority; body `userId` is still ignored.
- The client now validates `{ ok: true, session: { sessionId, status } }`, checks the response session ID and action-specific status, and throws `AssessmentSessionClientError` with `network | http | malformed_response | unexpected_status` instead of returning an ignored boolean.
- Start accepts only a confirmed `in_progress` lifecycle. The service rejects any start replay after `completed` or `abandoned`, even when every immutable frame field matches.
- Route timestamps now require an explicit ISO-8601 date-time with uppercase `Z` or a numeric `±HH:MM` offset. Calendar dates, clock ranges, and the ISO maximum offset (`±14:00`) are validated. Date-only, timezone-less, locale, impossible leap/day/time, and invalid offset values are rejected for start, completion, answer, and abandon timestamps.
- Start replay, abandon replay, and authoritative attempt matching compare parsed instants. Equivalent `Z`, `+00:00`, and fractional renderings are treated as the same time.
- A failed or non-array authoritative attempt query, or any malformed attempt row, now throws `persistence_failed`. Only a successful query with no match derives `unknown`; completion RPC is not called on query failure, the session remains `in_progress`, and the same payload can later retry successfully.

### Runner integration and failure ordering

- Mock: preserves the generated exam, session ID, start time, answer timestamps, and completion time across an ambiguous retry. Failed start leaves the intro mounted; failed completion leaves the quiz mounted and writes neither result nor P0 progress.
- Theme summary: preserves the session frame and completion timestamp, disables interaction while saving, restores the grade action on failure, and advances Mastery/result only after confirmed completion.
- Checkpoint exam: preserves attempt/start/completion frames, keeps questions unmounted until confirmed start, and keeps checkpoint result/P0 state unchanged until confirmed completion.
- Checkpoint final: preserves the generated attempt and timestamps across retries, keeps the start screen or running quiz on failure, and records checkpoint/gate state only after confirmed completion.
- Official past: preserves resumable session identity, answer locking, and stored local progress. A failed explicit abandon keeps the prior resumable local session and does not start a replacement. Start, abandon, and completion retries reuse exactly the same immutable payload; failed completion leaves the running session and local resume record intact with no P0 write.
- `TopicQuiz` now awaits asynchronous completion, shows a saving state, retains the exact answer payload for retries, and reopens completion after rejection. Timer-driven submissions use the same path and remain retryable.
- Readiness recalculation failure remains nonfatal because the server still catches it only after the atomic completion RPC has committed session, answers, and evidence.

### React self-review

Applied the Vercel React best-practices checklist after all TSX edits:

- Interaction persistence remains in event handlers; effects only handle navigation, identity synchronization, and external timers.
- Transient immutable retry payloads use refs, avoiding effect-derived state and dependency churn.
- Start/submit controls expose pending states and prevent competing input while persistence is active.
- Failure messages use `role="alert"`; existing native button semantics, navigation, render structure, practice resumability, and one-answer locking remain intact.
- The timer completion effect schedules the external callback rather than synchronously cascading state from the effect body; lint confirms the hook boundary.

### Fix Round 1 files

Modified:

- `app/api/assessment-sessions/route.ts`
- `lib/examReadiness/assessmentSession.ts`
- `lib/userSession.ts`
- `app/mock-exam/page.tsx`
- `components/themeExam/ThemeExamRunner.tsx`
- `components/checkpoint/CheckpointExamRunner.tsx`
- `app/checkpoint/[checkpointId]/final/page.tsx`
- `components/pastExam/PastExamRunner.tsx`
- `components/learn/TopicQuiz.tsx`
- `test/assessmentSessionClient.test.ts`
- `test/assessmentSessionRoute.test.ts`
- `test/assessmentSessionIntegration.test.ts`
- `test/AssessmentDeliveryRunners.test.tsx`
- `test/ThemeExamRunner.test.tsx`
- `test/PastExamRunner.test.tsx`
- `test/PastExamSubmitOnce.test.tsx`
- `test/TopicQuiz.test.tsx`
- `.superpowers/sdd/2026-08-22-exam-readiness-p1-2/task-8-report.md`

Verified unchanged but rerun:

- `supabase/migrations/20260823070000_assessment_session_completion.sql`
- `supabase/tests/assessment_session_completion_test.sql`
- `test/assessmentSessionMigration.test.ts`

### Fix Round 1 verification

- Static migration contract: passed.
- Disposable Supabase PostgreSQL 17.6 migration replay: passed; only the existing `SET LOCAL` outside transaction warnings and idempotent-schema notices appeared.
- pgTAP: 18/18 assertions passed, including atomic success/rollback, identical retry, conflicting retry, terminal immutability, and one evidence revision. The uniquely named disposable container was removed afterward.
- Focused route/client/service/runner and delivery regressions: 15 files, 172 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no errors or warnings.
- `npm test`: 103 files, 1,135 tests passed.
- `git diff --check`: passed.

### Fix Round 1 concerns

- The V1 limitation remains unchanged: sessions persist only total `questionCount`, so field-level summative performance still cannot invent per-field unanswered denominators.
- Question-attempt batches can be repeated after an ambiguous completion response; their existing P1-1 idempotency keys/grouping remain the authority while the common completion payload itself is byte-for-byte stable across retry.
- Vitest continues to print the existing Node `module.register()` deprecation and unavailable-localStorage experimental warnings; neither affects results.
- No implementation blocker remains.
