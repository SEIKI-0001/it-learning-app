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

All runners invoke the P1-1 attempt endpoint before common completion and invoke P0 progress only after completion. Client helpers intentionally return `false` on persistence/network failure so saved assessment facts or readiness follow-up failures never replace an already available result UI with a failure screen.

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
