# P1-2 Exam Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy progress-weighted readiness value with the approved, explainable, versioned P1-2 Exam Readiness model and make every consumer use one safely refreshed result.

**Architecture:** Build the rule engine as pure TypeScript over a normalized evidence bundle, with P0 `topic_mastery_stats` and P1-1 exposure facts retaining authority. Persist assessment sessions, evidence revisions, retryable recalculation jobs, current results, and daily snapshots in additive Supabase tables; a server-only service serializes recalculation per user and exposes lazy `getCurrentReadiness()` semantics to all consumers.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript 5, Vitest 4.1.10, Supabase JS 2.108.1, PostgreSQL/Supabase CLI, Node.js 22.x.

**Spec:** `docs/superpowers/specs/2026-08-16-exam-readiness-p1-2-design.md`

## Global Constraints

- `modelVersion` starts at `exam-readiness-rule-v1`; `examSchemeVersion` starts at `ip-3field-2026`.
- V1 field ratios are strategy `32/92`, management `18/92`, and technology `42/92`.
- V1 freshness is 1.0 for elapsed whole days 0-30, 0.8 for 31-60, 0.6 for 61-90, and 0.4 for 91+.
- V1 retention overdue multipliers are 1.0 before one full overdue day, 0.7 through the scheduled interval, and 0.4 after that interval.
- `insufficient_coverage.required` is 60; target evidence is 100 units; target summative sessions is 3.
- `topic_mastery_stats` is the only Topic Mastery Source of Truth. Do not replay answers to create another Mastery value.
- Preserve P1-1 `first | seen | unknown`; never convert `unknown` to `seen` or `first`.
- Collapse by `canonicalQuestionId` only for `evidenceVolume` and `fieldEvidenceVolume`; preserve the event-deduplicated time series for every other calculation.
- Official past evidence uses `official_exam_field` for exam-scheme field scoring; Topic Mastery, retention, Weak Topic, and Topic coverage use the field of `primaryTopicId`.
- Do not call the result a pass probability, do not display it with `%`, and do not use learning progress as a fallback readiness value.
- Keep the default Node.js runtime. Do not add `runtime = "edge"`.
- Before modifying Route Handlers, read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` completely.
- Before writing implementation code, read the `superpowers:test-driven-development` skill and follow RED-GREEN-REFACTOR for every task.
- Use only additive, unique 14-digit UTC migrations under `supabase/migrations/`; never edit `supabase/legacy_migrations/`.
- Generate `supabase/schema.sql` from a disposable local database after migrations apply; never hand-edit the snapshot.
- Do not change question-bank content. `npm run validate:questions` is still required before main because answer adapters and question metadata are in scope.
- Commit only explicitly listed files. Do not use `git add -A`.

## Planned File Structure

| File | Responsibility |
| --- | --- |
| `types/examReadiness.ts` | Public result, evidence, session, reason-code, and service contracts |
| `lib/examReadiness/config.ts` | Versioned model and exam-scheme constants |
| `lib/examReadiness/time.ts` | Freshness, overdue, snapshot date, and future-boundary functions |
| `lib/examReadiness/evidence.ts` | Event deduplication, canonical strongest-evidence selection, and catalog normalization |
| `lib/examReadiness/components.ts` | First, summative, Mastery, retention, coverage, confidence inputs, field components, and Weak penalty |
| `lib/examReadiness/calculator.ts` | Calculation order, rounding, caps, bands, trace, and final result |
| `lib/examReadiness/primaryImprovement.ts` | Deterministic improvement selection and tie-breaking |
| `lib/examReadiness/repository.ts` | Server-only Supabase queries and RPC adapters |
| `lib/examReadiness/service.ts` | Evidence-revision consistency, job retry, serialization, lazy refresh, and persistence orchestration |
| `lib/examReadiness/presentation.ts` | Shared Japanese labels and consumer-safe presentation helpers |
| `app/api/exam-readiness/current/route.ts` | Authenticated shared-current-result endpoint |
| `app/api/assessment-sessions/route.ts` | Authenticated, idempotent start/complete/abandon assessment endpoint |
| `components/progress/ExamReadinessCard.tsx` | Detailed Progress rendering |
| `components/today/ExamReadinessSummary.tsx` | Compact Today rendering |

---

### Task 1: Lock the Versioned Domain and Time Rules

**Files:**
- Create: `types/examReadiness.ts`
- Create: `lib/examReadiness/config.ts`
- Create: `lib/examReadiness/time.ts`
- Create: `test/examReadinessConfig.test.ts`
- Create: `test/examReadinessTime.test.ts`

**Interfaces:**

```ts
export const EXAM_READINESS_MODEL_VERSION = "exam-readiness-rule-v1";
export const EXAM_SCHEME_VERSION = "ip-3field-2026";

export type FirstAttemptState = "first" | "seen" | "unknown";
export type ReadinessBand = "measuring" | "needs_work" | "approaching" | "ready" | "stable";
export type ConfidenceLevel = "low" | "medium" | "high";

export function freshnessCoefficient(
  referenceTime: Date,
  evidenceTime: Date,
): number;

export function retentionOverdueMultiplier(args: {
  referenceTime: Date;
  dueAt: Date;
  scheduledIntervalDays: number;
}): number;

export function nextTimeBoundary(args: {
  calculationReferenceTime: Date;
  evidenceTimes: Date[];
  reviews: Array<{ dueAt: Date; scheduledIntervalDays: number }>;
}): Date | null;

export function snapshotDateInTokyo(calculatedAt: Date): string;
```

- [ ] Read the test-driven-development skill completely.
- [ ] Write table-driven tests for freshness at elapsed whole days 0, 30, 31, 60, 61, 90, 91, and a future evidence timestamp.
- [ ] Write retention tests for not due, due now, 0 full overdue days, 1 day, exactly the scheduled interval, and interval + 1 day.
- [ ] Write `nextTimeBoundary` tests proving the result is strictly later than the reference time, selects the earliest 31/61/91-day, Review Due, one-day-overdue, or interval-exceeded boundary, and returns `null` when none exists.
- [ ] Write Tokyo snapshot tests around `2026-08-22T14:59:59.999Z` and `2026-08-22T15:00:00.000Z`.
- [ ] Run `npx vitest run test/examReadinessConfig.test.ts test/examReadinessTime.test.ts` and confirm RED because the modules do not exist.
- [ ] Add the complete `ExamReadinessResult`, structured confidence reasons, field score gate, calculation trace, evidence summary, Weak Topic, primary improvement, normalized answer evidence, assessment session, and evidence-bundle types from the spec.
- [ ] Implement the exact V1 config objects and pure time functions. Use elapsed whole 24-hour days, not calendar dates, for freshness and overdue coefficients.
- [ ] Run the focused tests until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): define versioned readiness contract"` after explicitly adding the five task files.

---

### Task 2: Normalize Evidence Without Losing Time Series

**Files:**
- Create: `lib/examReadiness/evidence.ts`
- Create: `test/examReadinessEvidence.test.ts`
- Modify: `types/examReadiness.ts`

**Interfaces:**

```ts
export type ReadinessTopic = {
  topicId: string;
  fieldId: string;
  label: string;
  importance: 1 | 2 | 3;
};

export type ReadinessAnswerEvidence = {
  answerId: string | null;
  idempotencyKey: string;
  canonicalQuestionId: string;
  topicId: string;
  fieldId: string;
  kind: "confirmation" | "checkpoint" | "review" | "summary" | "mock" | "official_past";
  isCorrect: boolean;
  firstAttemptState: FirstAttemptState;
  answeredAt: string;
};

export function dedupeAnswerEvents(
  events: ReadinessAnswerEvidence[],
): ReadinessAnswerEvidence[];

export function strongestEvidenceByCanonicalQuestion(
  events: ReadinessAnswerEvidence[],
  calculationReferenceTime: Date,
): Map<string, { event: ReadinessAnswerEvidence; strength: number }>;

export function strongestEvidenceByTopic(
  events: ReadinessAnswerEvidence[],
  calculationReferenceTime: Date,
): Map<string, { event: ReadinessAnswerEvidence; strength: number }>;
```

- [ ] Write failing tests proving answer-ID duplication is removed first, idempotency-key duplication is removed when no answer ID exists, and two real repeated answers remain in chronological history.
- [ ] Add a test with one canonical question answered as confirmation, Review, mock, and official evidence; assert canonical selection keeps only the largest `evidenceCoefficient * freshnessCoefficient` for volume.
- [ ] Assert canonical collapse does not mutate or shorten the array returned by event deduplication.
- [ ] Add deterministic tie tests: greater strength, then later `answeredAt`, then lexical `idempotencyKey`.
- [ ] Run `npx vitest run test/examReadinessEvidence.test.ts` and confirm RED.
- [ ] Implement evidence-kind coefficients 0.4/0.6/0.7/0.8/0.9/1.0 and source normalization without importing React or Supabase.
- [ ] Preserve `unknown` as an explicit state. Legacy P0 evidence with `exposureState` missing maps `isFirstSeen === true` to `first` and `isFirstSeen === false` to `unknown`, never to `seen`.
- [ ] Run the focused suite until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): normalize unique readiness evidence"`.

---

### Task 3: Implement the Component Calculators

**Files:**
- Create: `lib/examReadiness/components.ts`
- Create: `test/examReadinessComponents.test.ts`
- Modify: `types/examReadiness.ts`

**Interfaces:**

```ts
export function computeFirstPerformance(input: ComponentInput): number | null;
export function computeSummativePerformance(input: ComponentInput): number | null;
export function computeTopicMastery(input: ComponentInput): number | null;
export function computeRetention(input: ComponentInput): number | null;
export function computeAssessmentCoverage(input: ComponentInput): number;
export function computeFieldEvidence(input: ComponentInput): FieldEvidenceResult[];
export function computeWeakTopics(input: ComponentInput): WeakPenaltyResult;
export function computeConfidenceInputs(input: ComponentInput): ConfidenceInputs;
```

`ComponentInput.masteryByTopic` is the parsed latest `topic_mastery_stats`; no function in this file mutates or reconstructs it.

- [ ] Write first-performance tests for first/seen/unknown, source weighting, freshness weighting, no evidence returning `null`, and the same answer remaining eligible for summative calculation.
- [ ] Write summative tests for latest-three ordering; inclusion of summary, mock, and exam-mode official; exclusion of checkpoint, practice, in-progress, and abandoned; one/two-session calculation; unanswered questions in the denominator; source trust; `0.5 + 0.5 * firstRate`; all-unknown neutral 0.5; and `0.7 * weighted mean + 0.3 * minimum`.
- [ ] Write Mastery tests proving importance weighting reads evaluated `topic_mastery_stats`, unevaluated Topics are excluded, and no evaluated Topics returns `null`.
- [ ] Write retention tests proving initial stage-1 success is excluded, latest due-review failure is 0, stages 2/3/4/5 are 50/75/90/100, and overdue multipliers apply only to Topics with retention evidence.
- [ ] Write coverage tests for strongest Topic evidence, Topic importance, stale evidence, and a no-evidence result of 0.
- [ ] Write field tests for `targetEvidenceUnits * scheme ratio`, binary field Topic coverage, minimum of volume and coverage, and the minimum across all configured fields.
- [ ] Write Weak tests for P0 reason mapping, maximum reason per Topic, top-five ordering, importance divisor 3, and total cap 12.
- [ ] Run `npx vitest run test/examReadinessComponents.test.ts` and confirm RED.
- [ ] Implement each pure component exactly from the spec. Keep raw floating-point values; do not round inside these functions.
- [ ] Run the focused suite until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): calculate readiness evidence components"`.

---

### Task 4: Assemble Scores, Gates, Confidence, and Explanations

**Files:**
- Create: `lib/examReadiness/calculator.ts`
- Create: `lib/examReadiness/primaryImprovement.ts`
- Create: `test/examReadinessCalculator.test.ts`
- Create: `test/examReadinessGolden.test.ts`
- Create: `test/fixtures/examReadiness/v1-cases.ts`

**Interfaces:**

```ts
export type ExamReadinessDraft = Omit<
  ExamReadinessResult,
  "calculatedAt" | "snapshotDate"
>;

export function calculateExamReadinessDraft(args: {
  evidence: ExamReadinessEvidenceBundle;
  calculationReferenceTime: Date;
  modelVersion?: string;
  examSchemeVersion?: string;
}): ExamReadinessDraft;

export function finalizeExamReadinessResult(
  draft: ExamReadinessDraft,
  calculatedAt: Date,
): ExamReadinessResult;

export function selectPrimaryImprovement(args: {
  resultWithoutPrimary: Omit<ExamReadinessDraft, "primaryImprovement">;
  perTopicRetention: PerTopicRetention[];
}): ExamReadinessResult["primaryImprovement"];
```

- [ ] Write null-path tests proving four null performance components produce `baseScore`, `preGateScore`, and `score` null; coverage alone cannot create zero; no Weak or score cap is applied; band is measuring.
- [ ] Write renormalization tests for each single component and mixed missing components using weights 30/25/25/10/10.
- [ ] Write field-sufficiency tests at rounded values 39/40/59/60 and assert confidence caps 59/79/none plus field-gate evaluation flags.
- [ ] Write field-score tests at rounded 39/40/59/60 and assert score caps 59/74/74/none.
- [ ] Write confidence tests at rounded 59/60/79/80; assert structured reasons contain code, field ID when needed, actual, and required.
- [ ] Write score-band tests at 59/60/74/75/84/85, including score 85 + medium confidence = ready and score 85 + high confidence = stable.
- [ ] Write calculation-trace assertions for raw `baseScore`, Weak deduction, raw `preGateScore`, every applied cap, and final integer score.
- [ ] Write primary-improvement tests for every ordered rule and tie-breaker from the spec.
- [ ] Add golden fixtures for: no data; sparse first evidence capped at 59; one low-evidence field; three stable summative sessions; Review failure; more than five Weak Topics; repeated canonical questions; and a time-boundary-only change.
- [ ] Run `npx vitest run test/examReadinessCalculator.test.ts test/examReadinessGolden.test.ts` and confirm RED.
- [ ] Implement the approved order in `calculateExamReadinessDraft`: components, normalized base, Weak penalty, rounded field gates, capped-and-rounded confidence, low-confidence score cap, final score rounding, band, primary improvement, and `validUntil`.
- [ ] Implement `finalizeExamReadinessResult` so the service injects processing-completion `calculatedAt` after pure calculation and derives `snapshotDate` from that timestamp in Asia/Tokyo.
- [ ] Run `npx vitest run test/examReadinessCalculator.test.ts test/examReadinessGolden.test.ts` until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): assemble explainable readiness result"`.

---

### Task 5: Add the Additive Persistence and Concurrency Migration

**Files:**
- Create: `supabase/migrations/20260822070000_exam_readiness_p1_2.sql`
- Create: `test/examReadinessMigration.test.ts`
- Create: `supabase/tests/exam_readiness_recalculation_test.sql`

**Database contract:**

```text
assessment_sessions
assessment_session_answers
exam_readiness_evidence_state
exam_readiness_evidence_events
exam_readiness_recalculation_jobs
exam_readiness_current
exam_readiness_snapshots
```

Required RPCs:

```sql
register_exam_readiness_evidence(
  p_user_id uuid,
  p_event_key text
) returns bigint;

claim_exam_readiness_recalculation(
  p_user_id uuid,
  p_trigger_type text,
  p_trigger_id text,
  p_model_version text,
  p_exam_scheme_version text,
  p_lease_seconds integer
) returns setof public.exam_readiness_recalculation_jobs;

complete_exam_readiness_recalculation(
  p_job_id uuid,
  p_expected_evidence_revision bigint,
  p_result jsonb
) returns text;

fail_exam_readiness_recalculation(
  p_job_id uuid,
  p_error_code text
) returns void;
```

`complete_exam_readiness_recalculation` returns `saved` or `stale`. On `saved`, it updates `exam_readiness_current` and the Tokyo-dated versioned snapshot in the same transaction. On `stale`, neither result table changes.

- [ ] Write a migration-contract test that asserts all seven tables, foreign keys to `users`, source/mode/status/first-state checks, nonnegative counts, immutable session question count, unique `(user_id, session_id)`, unique answer idempotency keys, and required indexes.
- [ ] Assert the recalculation unique key is `(user_id, trigger_type, trigger_id, model_version, exam_scheme_version)` and a failed row can transition back to processing without another insert.
- [ ] Assert every RPC is `SECURITY DEFINER`, owned by postgres, has `search_path = pg_catalog, public`, revokes PUBLIC/anon/authenticated execution, and grants only service role.
- [ ] Add pgTAP cases proving repeated evidence event keys do not increment revision, different event keys do, the same failed job row is reclaimed, only one per-user lease is active, stale revision cannot save, and current/snapshot update atomically for the latest revision.
- [ ] Run `npx vitest run test/examReadinessMigration.test.ts` and confirm RED because the migration is absent.
- [ ] Implement the migration with RLS enabled and no direct client grants. Use a per-user lease row in `exam_readiness_evidence_state` to serialize work without holding a database transaction open during TypeScript calculation.
- [ ] Extend `record_question_attempts_with_exposure` inside this additive migration so one successfully inserted batch registers one deterministic evidence event derived from its sorted answer fingerprints. A retransmitted batch with no new answer facts must not increment revision, and per-question practice saves bump revision without starting recalculation.
- [ ] Make the claim RPC reclaim `failed` and expired `processing` rows by updating attempts/status/lease; a succeeded row returns as already complete.
- [ ] Make the complete RPC acquire the user row lock, compare current revision, write current and snapshot, mark the job succeeded, and release the lease in one transaction.
- [ ] Run the migration-contract suite until GREEN.
- [ ] Commit with `git commit -m "feat(db): add readiness sessions and safe recalculation"`.

---

### Task 6: Build the Evidence Repository and Catalog Adapter

**Files:**
- Create: `lib/examReadiness/catalog.ts`
- Create: `lib/examReadiness/repository.ts`
- Create: `test/examReadinessCatalog.test.ts`
- Create: `test/examReadinessRepository.test.ts`

**Interfaces:**

```ts
export function buildReadinessTopicCatalog(): ReadinessTopic[];

export async function loadExamReadinessEvidence(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExamReadinessEvidenceBundle>;

export async function getStoredCurrentReadiness(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExamReadinessResult | null>;

export async function registerEvidenceEvent(
  supabase: SupabaseClient,
  userId: string,
  eventKey: string,
): Promise<number>;
```

`ExamReadinessEvidenceBundle.evidenceRevision` is the revision read before and after the evidence queries; both reads must match before calculation begins.

- [ ] Write catalog tests proving every Topic has importance 1-3 and a configured field, every question ID remains canonical, official attempts prefer `official_exam_field`, and Topic-derived components use the Topic field.
- [ ] Write repository tests proving the evidence bundle includes: latest `topic_mastery_stats`; Review queue; P0 recent evidence; question attempts; completed/in-progress/abandoned sessions; session answers; current evidence revision; and Topic catalog.
- [ ] Add parsing tests that reject malformed stored result JSON rather than returning a partial score, preserve unknown exposure, and map legacy P0 evidence as specified in Task 2.
- [ ] Add revision-consistency tests: read revision, load evidence, read revision again; retry the read when revisions differ; fail with a typed `evidence_revision_unstable` error after three consecutive changes.
- [ ] Run `npx vitest run test/examReadinessCatalog.test.ts test/examReadinessRepository.test.ts` and confirm RED.
- [ ] Implement server-only repository functions. Query only service-role data and never accept a body-supplied user ID as authority.
- [ ] Use `attempt_id` as answer ID for `question_attempts`; use the P0 event key `questionId + kind + answeredAt` when no database answer ID exists.
- [ ] Keep summative session ordering by `completed_at DESC, session_id ASC` and return at least the latest three eligible sessions plus checkpoint sessions needed for evidence.
- [ ] Run the focused tests until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): collect authoritative readiness evidence"`.

---

### Task 7: Orchestrate Retryable Recalculation and Lazy Current Reads

**Files:**
- Create: `lib/examReadiness/service.ts`
- Create: `app/api/exam-readiness/current/route.ts`
- Create: `test/examReadinessService.test.ts`
- Create: `test/examReadinessCurrentRoute.test.ts`
- Modify: `lib/progressBootstrap.ts`
- Modify: `lib/userSession.ts`

**Interfaces:**

```ts
export async function recalculateExamReadiness(args: {
  supabase: SupabaseClient;
  userId: string;
  triggerType: string;
  triggerId: string;
  now?: Date;
}): Promise<ExamReadinessResult>;

export async function getCurrentReadiness(args: {
  supabase: SupabaseClient;
  userId: string;
  now?: Date;
}): Promise<ExamReadinessResult | null>;
```

- [ ] Read the installed Route Handler guide completely.
- [ ] Write service tests proving `calculationReferenceTime` is frozen once, `calculatedAt` is later, a failed calculation marks the existing job failed, retry reclaims the same job, succeeded duplicate triggers return the saved result, and stale completion reloads latest evidence and retries.
- [ ] Add concurrent-call tests proving only one user lease calculates while the second caller waits for or reads the committed result.
- [ ] Add lazy-read tests proving unexpired current returns without recalculation, expired `validUntil` triggers `time_boundary + priorValidUntil`, null `validUntil` does not loop, and a future-only next boundary is stored.
- [ ] Write route tests for session-derived authentication, 401, 503, null current result, success, and server failure. The response shape is `{ ok: true, readiness }`.
- [ ] Run `npx vitest run test/examReadinessService.test.ts test/examReadinessCurrentRoute.test.ts` and confirm RED.
- [ ] Implement claim/calculate/complete/fail orchestration with a maximum of three stale-revision recomputations per request and a typed 503 after repeated instability.
- [ ] Implement `getCurrentReadiness()` as the sole expiry boundary. No page, LINE handler, badge helper, or client cache may compare `validUntil` itself.
- [ ] Add `examReadiness: ExamReadinessResult | null` to the progress bootstrap result and load it through `getCurrentReadiness()`.
- [ ] Replace client helpers `refreshIntegratedStatus`/`fetchLatestIntegratedStatus` for readiness usage with `fetchCurrentExamReadiness`; do not cache a scalar readiness percentage.
- [ ] Run `npx vitest run test/examReadinessService.test.ts test/examReadinessCurrentRoute.test.ts` until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): add safe current readiness service"`.

---

### Task 8: Persist Common Assessment Sessions Across Delivery Paths

**Files:**
- Create: `app/api/assessment-sessions/route.ts`
- Create: `lib/examReadiness/assessmentSession.ts`
- Create: `test/assessmentSessionRoute.test.ts`
- Create: `test/assessmentSessionIntegration.test.ts`
- Modify: `lib/userSession.ts`
- Modify: `app/mock-exam/page.tsx`
- Modify: `components/themeExam/ThemeExamRunner.tsx`
- Modify: `components/checkpoint/CheckpointExamRunner.tsx`
- Modify: `app/checkpoint/[checkpointId]/final/page.tsx`
- Modify: `components/pastExam/PastExamRunner.tsx`
- Modify: `types/pastExam.ts`

**Client contract:**

```ts
export type StartAssessmentSessionInput = {
  action: "start";
  sessionId: string;
  source: "checkpoint" | "summary" | "mock" | "official_past";
  mode: "practice" | "exam";
  startedAt: string;
  questionCount: number;
};

export type CompleteAssessmentSessionInput = {
  action: "complete";
  sessionId: string;
  completedAt: string;
  answers: Array<{
    idempotencyKey: string;
    canonicalQuestionId: string;
    topicId: string;
    isCorrect: boolean;
    answeredAt: string;
  }>;
};

export type AbandonAssessmentSessionInput = {
  action: "abandon";
  sessionId: string;
  completedAt: string;
};
```

- [ ] Write route tests proving authenticated user resolution ignores body user ID; repeated start is idempotent; start stores `in_progress`; abandon stores `abandoned`; completion stores `completed`; question count is fixed at start; and completed/abandoned sessions are immutable.
- [ ] Add tests proving the server derives first/seen from matching persisted P1-1 attempts and uses unknown when no authoritative attempt exists; the client cannot submit `firstAttemptState`.
- [ ] Add official-past tests proving correctness, Topic, and official exam field are re-derived from the question bank; practice mode is stored but excluded by the calculator.
- [ ] Add session-score tests proving unanswered questions are absent from session answers but remain in `questionCount`, so `correctCount / questionCount * 100` treats them as incorrect.
- [ ] Add delivery integration tests proving summary, mock, official exam mode are summative; checkpoint is evidence-only; in-progress and abandoned are excluded; each completion registers one stable evidence event and triggers recalculation once.
- [ ] Run `npx vitest run test/assessmentSessionRoute.test.ts test/assessmentSessionIntegration.test.ts` and confirm RED.
- [ ] Implement one server Route Handler with a strict discriminated `action` parser. Start inserts the immutable session frame, abandon changes only `in_progress -> abandoned`, and completion validates answers, looks up authoritative attempts, builds first/seen/unknown counts, changes only `in_progress -> completed`, registers `assessment:{sessionId}`, and recalculates after commit.
- [ ] Give mock, theme summary, checkpoint, checkpoint final, and official past runners a stable session ID and start time. Persist start before showing questions; await question-attempt classification, then complete, then persist P0 progress; send abandon when the existing explicit restart/cancel path discards an in-progress session; preserve UI success when readiness recalculation fails after facts are saved.
- [ ] Keep official practice resumability and one-answer locking. Final submission stores the practice session but cannot enter summative performance.
- [ ] Run `npx vitest run test/assessmentSessionRoute.test.ts test/assessmentSessionIntegration.test.ts test/mockExam.test.ts test/themeExamLearningLoop.test.ts test/pastExamSession.test.ts test/pastExamAttempts.test.ts` until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): persist common assessment sessions"`.

---

### Task 9: Trigger Recalculation From P0 Learning and Review Changes

**Files:**
- Modify: `app/api/progress/save/route.ts`
- Modify: `lib/userSession.ts`
- Modify: `components/learn/TopicCompletionQuiz.tsx`
- Modify: `app/review/page.tsx`
- Modify: `lib/studySession.ts`
- Modify: `app/api/check-pack/submit/route.ts`
- Modify: `app/api/topic-progress/quiz-result/route.ts`
- Create: `test/progressReadinessTriggerRoute.test.ts`
- Create: `test/studyReadinessTrigger.test.tsx`
- Create: `test/checkPackReadinessTriggerRoute.test.ts`
- Create: `test/topicProgressReadinessTriggerRoute.test.ts`

**Progress save extension:**

```ts
type ReadinessTriggerInput = {
  triggerType: "learning_complete" | "review_complete";
  triggerId: string;
};

type ProgressSaveBody = {
  progress?: UserProgress;
  profile?: UserProfile;
  readinessTrigger?: ReadinessTriggerInput;
};
```

- [ ] Write route tests proving only a successful change to `topic_mastery_stats` or `review_queue` registers evidence; profile-only and byte-identical progress saves do not increment revision.
- [ ] Add retry tests proving the same `triggerType + triggerId` reuses the recalculation job and does not create another evidence revision event.
- [ ] Write component tests proving a lesson completion sends a stable ID from sorted P0 answer event keys, and a due Review completion sends `review_complete` while initial learning success sends `learning_complete`.
- [ ] Add a P0 regression proving `completeStudySession` still owns Mastery and Review Due updates and Readiness receives only the persisted latest `topic_mastery_stats` afterward.
- [ ] Add route tests proving completed check-pack and topic-quiz result events register stable completion trigger IDs and replace the legacy `refreshIntegratedStatusForUser` hook with the new recalculation service.
- [ ] Run `npx vitest run test/progressReadinessTriggerRoute.test.ts test/studyReadinessTrigger.test.tsx test/checkPackReadinessTriggerRoute.test.ts test/topicProgressReadinessTriggerRoute.test.ts test/learningLoopIntegration.test.ts` and confirm RED.
- [ ] Replace direct progress upsert with a service-role RPC or transaction-safe repository call that compares the existing P0 JSON, writes it, and registers the stable evidence event only when the evidence-bearing fields changed.
- [ ] Trigger recalculation after the progress transaction commits. A recalculation failure returns progress-save success with `readinessUpdated: false`; it must not roll back learning.
- [ ] Update lesson and Review callers to await progress persistence for completion events; keep non-evidence progress writes fire-and-forget.
- [ ] Run the five focused suites until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): refresh after learning and review"`.

---

### Task 10: Cut Every Consumer Over to the Shared Result

**Files:**
- Create: `lib/examReadiness/presentation.ts`
- Create: `components/progress/ExamReadinessCard.tsx`
- Create: `components/today/ExamReadinessSummary.tsx`
- Create: `test/examReadinessPresentation.test.ts`
- Create: `test/ExamReadinessCard.test.tsx`
- Create: `test/ExamReadinessSummary.test.tsx`
- Create: `test/examReadinessLine.test.ts`
- Create: `test/examReadinessBadges.test.ts`
- Create: `test/examReadinessPlanAdjustment.test.ts`
- Create: `test/progressSummary.test.ts`
- Modify: `app/progress/page.tsx`
- Modify: `app/today/page.tsx`
- Modify: `app/api/line/webhook/route.ts`
- Modify: `lib/badges.ts`
- Modify: `lib/badgeSignals.ts`
- Modify: `lib/planAdjustment.ts`
- Modify: `lib/mochitPresentation.ts`
- Modify: `components/today/TodayPolicyStrip.tsx`
- Modify: `lib/progressSummary.ts`
- Modify: `types/integratedStatus.ts`
- Modify: `lib/integratedStatus.ts`
- Modify: `test/mochitPresentation.test.ts`
- Modify: `test/learningLoopIntegration.test.ts`

**Presentation interfaces:**

```ts
export function readinessBandLabel(band: ReadinessBand): string;
export function confidenceReasonLabel(reason: ConfidenceReason): string;
export function primaryImprovementLabel(
  improvement: ExamReadinessResult["primaryImprovement"],
  result: ExamReadinessResult,
): string | null;
```

- [ ] Write presentation tests for every band, confidence reason, field/topic lookup, null score, and primary improvement; assert no result string contains `合格率`, `合格確率`, or `%`.
- [ ] Write Progress card tests proving it shows `/100`, components, fields, confidence, applied gates, top-five markers, and measuring state.
- [ ] Write Today summary tests proving it uses the saved primary improvement and does not independently rank reasons.
- [ ] Add LINE tests proving the same score/band/improvement appears and lazy current retrieval is used before formatting.
- [ ] Change badge readiness input from a scalar/fallback percentage to the shared band and confidence. `b-cp6-high-readiness` passes only for `ready` or `stable`; remove `summary.readinessPct` fallback.
- [ ] Change plan adjustment to consume `ExamReadinessResult` for readiness, Weak Topics, fields, and primary improvement while retaining schedule-health inputs as a separate argument.
- [ ] Change Mochit to consume score/band/primary improvement and replace the existing `合格率` message.
- [ ] Run `npx vitest run test/examReadinessPresentation.test.ts test/ExamReadinessCard.test.tsx test/ExamReadinessSummary.test.tsx test/examReadinessLine.test.ts test/examReadinessBadges.test.ts test/examReadinessPlanAdjustment.test.ts test/progressSummary.test.ts test/mochitPresentation.test.ts` and confirm RED before implementation.
- [ ] Implement the shared Japanese mapping and both components. Update Progress, Today, LINE, badge, plan, and Mochit consumers to use the bootstrap/current result only.
- [ ] Remove the user-facing use of `computeProgressSummary().readinessPct`; rename that field to `learningProgressPct` so it cannot masquerade as Exam Readiness.
- [ ] Refactor legacy integrated status so schedule health remains distinct and any compatibility `readiness_score` is populated from the shared Exam Readiness score, never the old input/basic/terms/exam/balance formula. Remove `READINESS_WEIGHTS_NORMAL`, `READINESS_WEIGHTS_DIRECT`, and their tests.
- [ ] Run `npx vitest run test/examReadinessPresentation.test.ts test/ExamReadinessCard.test.tsx test/ExamReadinessSummary.test.tsx test/examReadinessLine.test.ts test/examReadinessBadges.test.ts test/examReadinessPlanAdjustment.test.ts test/progressSummary.test.ts test/mochitPresentation.test.ts test/learningLoopIntegration.test.ts test/todaysLearningQueue.test.ts` until GREEN.
- [ ] Commit with `git commit -m "feat(readiness): use one explainable readiness result"`.

---

### Task 11: Reconstruct the Database, Verify the Whole Feature, and Prepare Rollout

**Files:**
- Regenerate: `supabase/schema.sql`
- Verify: `docs/superpowers/specs/2026-08-16-exam-readiness-p1-2-design.md`
- Verify: every file changed by Tasks 1-10

- [ ] Confirm Docker and Supabase CLI availability. Rebuild a disposable local database from baseline through P0, P1-1, and `20260822070000_exam_readiness_p1_2.sql`; never use `--linked` in this step.
- [ ] Run the pgTAP recalculation suite and prove: one evidence revision per event key; failed-row reuse; expired lease recovery; per-user serialization; stale-result rejection; atomic current/snapshot writes; and immutable completed session composition.
- [ ] Generate `supabase/schema.sql` with `supabase db dump --local --schema public --file supabase/schema.sql`, inspect the diff, and confirm it contains only generated P1-2 objects.
- [ ] Run the focused P1-2 suites: `npx vitest run test/examReadinessConfig.test.ts test/examReadinessTime.test.ts test/examReadinessEvidence.test.ts test/examReadinessComponents.test.ts test/examReadinessCalculator.test.ts test/examReadinessGolden.test.ts test/examReadinessMigration.test.ts test/examReadinessCatalog.test.ts test/examReadinessRepository.test.ts test/examReadinessService.test.ts test/examReadinessCurrentRoute.test.ts test/assessmentSessionRoute.test.ts test/assessmentSessionIntegration.test.ts test/progressReadinessTriggerRoute.test.ts`.
- [ ] Run P0/P1-1 regression suites: `npx vitest run test/learningLoop.test.ts test/learningLoopIntegration.test.ts test/learningLoopPersistence.test.ts test/questionAttemptsExposureRoute.test.ts test/questionAttemptsSaveRoute.test.ts test/pastExamLearningLoop.test.ts test/themeExamLearningLoop.test.ts test/mockExam.test.ts`.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run validate:questions`; confirm every command exits 0.
- [ ] Run `git diff --check` and inspect `git status --short`; explicitly verify no `.projects` state, environment files, build output, or unrelated shared-worktree changes are staged.
- [ ] Commit the generated schema and any final verification-only test correction with explicit file paths and message `chore(readiness): finalize P1-2 verification`.
- [ ] Deploy the DB/code additions first with consumers still on record-only mode, observe saved results and recalculation failures, then deploy the Task 10 consumer cutover after the recorded calculation trace reproduces sampled scores. Production migration and deployment require the normal PR-to-main process and are not performed merely by executing this local plan.
- [ ] After production cutover, verify Today, Progress, LINE, badge, plan adjustment, and Mochit all show the same result; verify an unauthenticated API call remains 401; verify no page uses learning progress as readiness.
- [ ] Record final test counts, migration version, production verification evidence, merged commit SHA, and deployed Vercel commit SHA in the completion report.
