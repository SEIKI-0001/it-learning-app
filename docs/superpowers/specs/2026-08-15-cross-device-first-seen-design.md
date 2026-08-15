# P1-1 Cross-device First-seen Design

## Goal

Determine whether the current answer is a user's first answer to the same canonical `questionId` across devices, browsers, sessions, and delivery paths. Logged-in users use server-side answer history as the source of truth. Anonymous users retain the existing local fallback.

## Current State

- `question_attempts` stores check-pack, checkpoint/final, mock, theme exam, and official past-exam attempts.
- `user_answers` stores lesson confirmation, review, checkpoint, and mock answers.
- Mock answers are currently written to both tables.
- `AppState.answers` is local and is currently the only input used by P0 to set `LearningEvidence.isFirstSeen`.
- `TopicMasteryStats.recentEvidence` persists `questionId` and `isFirstSeen`, but the boolean is currently derived from local AppState rather than authoritative server history.
- Question-bank adapters preserve `QuestionRecord.id`. Lesson, review, mock, and checkpoint generators preserve the topic question ID. Theme exam and official past exam preserve the question-bank ID. Screen indexes and displayed question numbers are not canonical IDs.
- Production authentication resolves the internal user from the Google or LINE session. A body-supplied `userId` is not trusted in production.
- Official past-exam local sessions are already separated by user ID, and anonymous sessions are not migrated into a logged-in account.

## Considered Approaches

### 1. New `question_exposures` table

A `(user_id, question_id)` table would make atomic claims simple, but it would duplicate facts already present in the two answer-history tables and require ongoing synchronization. This is rejected.

### 2. Application-side batch SELECT followed by retrying INSERT

The API could batch-read both history tables and rely on a partial unique index to resolve concurrent first claims. Normal traffic would be efficient, but a conflicting batch requires repeated recomputation and cannot keep history lookup and insertion in one transaction. This is acceptable as a fallback but not the primary design.

### 3. Transactional database function over existing history

Add a first-attempt marker and partial unique index to `question_attempts`, then record a validated batch through one database function. The function serializes each `(user_id, question_id)` claim, checks both existing history tables, inserts the current attempt, and returns exposure states in the same transaction. This is the selected design.

## Data Model

Add one 14-digit UTC additive migration after `20260814051517_learning_loop_p0.sql`.

The migration will:

1. Add `question_attempts.is_first_attempt boolean`.
2. Mark an existing `question_attempts` row as first only when it is the earliest persisted row for that user and question across both history tables. If an earlier `user_answers` row exists, no later `question_attempts` row is marked first.
3. Set the column to `NOT NULL DEFAULT false` after backfill.
4. Add a partial unique index on `(user_id, question_id) WHERE is_first_attempt`.
5. Add composite lookup indexes on `(user_id, question_id, answered_at)` for both history tables.
6. Add `record_question_attempts_with_exposure(uuid, jsonb)`, callable only by `service_role`.

No table is added. The production baseline, legacy migrations, and archived files remain unchanged.

## Transaction and Race Handling

The server validates and normalizes attempts before invoking the database function. The function receives only server-approved row data.

Within one transaction it:

1. Extracts canonical question IDs from the JSON batch.
2. Locks unique question IDs in lexical order with a transaction-scoped advisory lock derived from `user_id + question_id`. Stable ordering avoids deadlocks for overlapping batches.
3. Checks both `question_attempts` and `user_answers` for records preceding the current insert.
4. Inserts each current attempt into `question_attempts`, setting `is_first_attempt=true` only when no prior history exists.
5. Returns an exposure result for every input row.

Concurrent tabs for the same user and question serialize on the same advisory lock. The first transaction inserts the unique first marker; the second sees that history and returns `seen`. The partial unique index remains a database invariant if an unexpected writer bypasses the normal call path.

Official past-exam retransmission remains idempotent under the existing attempt-group unique index. A repeated submission returns `seen` and does not create another official-attempt row.

## Exposure Contract

```ts
export type QuestionExposureState = "first" | "seen" | "unknown";

export type QuestionExposure = {
  questionId: string;
  state: QuestionExposureState;
  attemptedBefore: boolean | null;
  firstAttemptAt: string | null;
  attemptCount: number | null;
};
```

- `first`: the transaction proved that neither history table contained an earlier answer.
- `seen`: at least one earlier correct or incorrect answer exists.
- `unknown`: authentication, connectivity, migration availability, or persistence failure prevented an authoritative decision.
- `unknown` never receives the first-seen Mastery bonus.

For legacy dual-written records, exposure correctness depends only on existence. `attemptCount` counts distinct persisted answer facts after normalizing the compatible columns from both tables; it is diagnostic and does not affect Mastery.

## API and Client Flow

`POST /api/question-attempts/save` remains the shared write endpoint. Its successful response is extended with an `exposures` array. The server continues to resolve the authenticated internal user and continues server-side validation of official past-exam correctness and metadata.

The client helper becomes asynchronous and returns a question-ID exposure map. Logged-in flows use this result before producing Mastery evidence:

```text
validated answer batch
  -> one server request
  -> one transactional batch RPC
  -> first / seen / unknown map
  -> LearningEvidence
  -> Mastery and Review Due update
  -> progress persistence
```

If the authoritative call fails, the learning UI continues and the current evidence is recorded as `unknown`, without a first-seen bonus. The client never upgrades a logged-in `unknown` result to `first` from local state.

Anonymous flows do not call the authenticated API. They compare canonical question IDs with `AppState.answers`; no local match means `first`, and a match of either correctness means `seen`.

## Mastery Compatibility

`LearningEvidence` receives `exposureState`. P0's persisted evidence keeps `isFirstSeen` for backward compatibility and adds an optional exposure state so `seen` and `unknown` remain distinguishable.

`applyLearningEvidence` derives the bonus only from `exposureState === "first"`. Existing Mastery weights, the confirmation exception, Review Due intervals, Weak Topic thresholds, and Today ordering are not changed.

Existing persisted evidence without `exposureState` remains readable. It retains its historical `isFirstSeen` value; new logged-in evidence never trusts a client-supplied `isFirstSeen=true`.

## Delivery-path Integration

- Lesson confirmation and review: record the completed answer batch through the shared endpoint, then complete the study session with returned exposure states. Continue writing `user_answers` for compatibility.
- Checkpoint exam and checkpoint final: batch-record attempts once, then update checkpoint Mastery using returned states.
- Mock exam: replace the separate fire-and-forget attempt write with one awaited batch record; keep `user_answers` compatibility persistence.
- Theme/summary exam: batch-record attempts and connect the graded result to `summary_exam` Mastery evidence using returned states. This closes the audited gap where theme attempts were stored but did not update P0 Mastery.
- Official past exam: practice-mode per-question responses persist their returned exposure state in the resumable session; exam mode records and classifies the full batch at grading. Final Mastery waits for outstanding saves and uses the recorded states.
- Check pack: continue recording canonical question IDs through the shared endpoint so later lesson, review, mock, checkpoint, theme, or official delivery sees the same history.

Every path uses the existing canonical question ID. No route-specific prefix, array index, displayed question number, or session ID is substituted for it.

## Error Handling

- Unauthenticated writes return the existing `401`; anonymous UI uses local fallback without calling the endpoint.
- Recording lock behavior remains unchanged.
- Missing Supabase or RPC failure returns no authoritative first result. The client uses `unknown`, preserves local UX, and applies no bonus.
- Invalid attempts remain rejected before database execution.
- Progress persistence occurs after the exposure decision; failure to save progress does not mutate the exposure result or retry a first claim.
- The API does not accept exposure state or `isFirstSeen` from clients.

## Performance

- A 100-question mock uses one client request and one RPC.
- History lookup uses two indexed set-based scans inside the function, not one SELECT per question.
- Advisory locks are acquired for the unique sorted question-ID set.
- The normal path inserts the entire validated batch transactionally.
- No client N+1 history requests are introduced.

## Testing

Add tests covering:

- no prior history returns `first`;
- prior correct or incorrect history returns `seen`;
- a fresh AppState on a second-device simulation still uses DB `seen`;
- the same canonical ID across mock, official/check-pack delivery, review, and checkpoint resolves as one question;
- authoritative failure returns `unknown` and produces no bonus;
- 100 IDs use one batch API/RPC call;
- duplicate or concurrent first claims can produce only one `is_first_attempt=true` row;
- anonymous local first/seen fallback;
- canonical IDs remain unchanged through adapters and generators;
- P0 Mastery, Review Due, Weak Topics, Today, checkpoint, mock, official past exam, and theme exam regression behavior.

Validation includes targeted tests, the full Vitest suite, typecheck, production build, changed-file ESLint, `git diff --check`, and disposable local Supabase reconstruction from baseline through P0 and P1-1.

## Out of Scope

No Exam Readiness UI, readiness-weight changes, Mastery weight redesign, word-list integration, ML/IRT, response-time weighting, anonymous-account migration, broad UI redesign, production migration application, push, PR, or main merge is included.
