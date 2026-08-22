# Task 9 Report — Trigger Recalculation From P0 Learning and Review Changes

## Status

Implemented Task 9 with an additive atomic progress RPC, stable learning/review completion triggers, post-commit Exam Readiness recalculation, and replacement of the legacy integrated-status refresh in check-pack/topic-quiz completion routes.

No earlier reviewed migration or `supabase/schema.sql` was edited. The only database production change is `20260823080000_progress_readiness_completion.sql`, the next unique UTC timestamp after Task 8.

## RED / GREEN

### RED

The required five-suite command was run before production implementation. The four new Task 9 files failed for the intended missing behavior (11 failures), while the two existing `learningLoopIntegration` tests remained green:

- progress save returned no `readinessUpdated`, used direct upsert, and never recalculated;
- `completeStudySession` exposed no stable readiness trigger and the component did not pass one;
- check-pack/topic-quiz routes still called the legacy integrated refresh and exposed no readiness status;
- the new migration contract failed because the additive migration did not yet exist.

A later focused RED test also proved that a failed authoritative P0 save still allowed topic-quiz recalculation; the component was then changed to gate that secondary completion on successful P0 persistence.

### GREEN

- Required five suites: 5 files, 14 tests passed.
- Task 9 focused suites plus static migration contract: 6 files, 16 tests passed.
- Learning/session regression selection: 7 files, 73 tests passed.
- Full suite: 108 files, 1,158 tests passed.

## Atomic compare and retry behavior

`public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text)` now owns the progress transaction:

1. validates the exact typed progress payload and optional `learning_complete` / `review_complete` pair;
2. creates the default user row if absent, then locks `user_progress` for the authenticated user;
3. compares only authoritative `topic_mastery_stats` and `review_queue` with JSONB `IS DISTINCT FROM` semantics;
4. rejects a conflicting reuse of an already registered stable trigger before any update;
5. updates the complete progress row;
6. registers `${triggerType}:${triggerId}` in the same transaction only when one of the two evidence-bearing JSON fields changed;
7. returns whether evidence changed and whether the trigger is registered.

An identical retry finds the existing event without advancing the revision, so the route calls the recalculation service with the same `triggerType + triggerId`. Task 5's unique job key therefore reuses the same recalculation row; a failed row can be reclaimed by the existing service. A new trigger paired with semantically identical P0 evidence registers no event and starts no recalculation. A same-trigger/different-evidence retry fails atomically and leaves both progress and revision unchanged.

The RPC is `SECURITY DEFINER`, postgres-owned, fixed to `search_path = pg_catalog, public`, revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`, then granted only to `service_role`. Disposable PostgreSQL verification confirmed the effective service/anon/authenticated privileges.

## Stable completion triggers

- `completeStudySession` derives P0 event keys with the existing readiness/P0 identity: `questionId + U+001F + kind + U+001F + answeredAt`.
- It sorts those keys and joins them with U+001E, so answer ordering cannot alter the completion ID.
- It uses the same `studyXpReward` classification as `completeTopicStudy`: an actually due review emits `review_complete` with `review` event keys; initial/non-due learning emits `learning_complete` with `confirmation` keys.
- Topic quiz completion forwards that same stable P0 completion ID to its route.
- Check-pack completion uses a deterministic fingerprint of pack, topic, stable client start time (date fallback), and normalized component scores.

Identical calls therefore reuse both evidence event and recalculation-job identities.

## P0 ownership proof

`completeStudySession` remains the only lesson/review owner of Mastery and Review Due mutations. It still calls `completeTopicStudy`, then applies streak, quest, and badge effects. Readiness code does not replay answers or construct Mastery.

The regression test exercises the real orchestrator and proves:

- initial learning writes the expected `topicMasteryStats` result;
- a due successful review increments `reviewSuccessCount` and schedules the next due date;
- the component passes the returned latest `next.progress` unchanged to the persistence boundary together with the trigger;
- readiness work starts only after that authoritative progress save reports success.

The server recalculation service then reloads persisted evidence through its Task 6 repository boundary.

## Routes and components

- `POST /api/progress/save` now authenticates with `getInternalUserId`, ignores body identity, uses the atomic RPC, and recalculates only after the RPC commit. Recalculation failure keeps HTTP success and returns `readinessUpdated: false`.
- Profile-only saves bypass the evidence RPC/recalculation path.
- `TopicCompletionQuiz` awaits progress persistence for completion events. It preserves local completion if persistence fails, but does not start the topic-quiz readiness completion without authoritative P0 success. Ordinary progress callers may continue to ignore the returned Promise.
- `/review` snooze remains explicitly fire-and-forget because it is not a completion event.
- Check-pack and topic-quiz result routes authenticate server-side, preserve their existing progress writes, call `recalculateExamReadiness` afterward with stable completion keys, return `readinessUpdated`, and no longer import/call `refreshIntegratedStatusForUser`.
- All edited Route Handlers remain named `POST` handlers on the Node runtime.

## React self-review

The Vercel React best-practices checklist was applied after editing the two TSX files.

- Persistence remains in the explicit TopicQuiz completion event path, not an effect.
- The existing TopicQuiz submission latch/frozen answer payload prevents effect-driven or render-driven duplicate submission.
- The awaited calls are intentionally dependent: P0 progress must commit before the topic result is allowed to trigger readiness.
- Stable trigger inputs are derived from the frozen answer payload and do not depend on render order.
- No new component state, global listener, inline component, or unstable effect dependency was introduced.

## Files

Modified:

- `app/api/progress/save/route.ts`
- `lib/userSession.ts`
- `components/learn/TopicCompletionQuiz.tsx`
- `app/review/page.tsx`
- `lib/studySession.ts`
- `app/api/check-pack/submit/route.ts`
- `app/api/topic-progress/quiz-result/route.ts`

Added:

- `supabase/migrations/20260823080000_progress_readiness_completion.sql`
- `supabase/tests/progress_readiness_save_test.sql`
- `test/progressReadinessMigration.test.ts`
- `test/progressReadinessTriggerRoute.test.ts`
- `test/studyReadinessTrigger.test.tsx`
- `test/checkPackReadinessTriggerRoute.test.ts`
- `test/topicProgressReadinessTriggerRoute.test.ts`

## Verification

- Next.js 16 Route Handler guide read completely before Route Handler edits.
- Required focused command: 5 files, 14 tests passed.
- Static migration contract: 2 tests passed.
- Every active migration replayed successfully in a disposable `public.ecr.aws/supabase/postgres:17.6.1.158` container.
- pgTAP: 17/17 passed, including effective RPC privileges, first change, identical retry, non-evidence update, conflicting retry rollback, distinct event revision, and event count.
- The disposable database containers were removed after verification.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no errors or warnings.
- `npm test`: 108 files, 1,158 tests passed.
- `git diff --check`: passed before report creation and will be rerun before commit.

## Concerns

No Task 9 blocker remains. Test output contains the repository's existing Node `module.register()` deprecation and unavailable-localStorage experimental warnings; there were no failures. The check-pack route's date fallback is only used for older callers that omit `startedAt`; the current runner always supplies its stable start time.
