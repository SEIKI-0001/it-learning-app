# Task 10 Report: Cut Every Consumer Over to the Shared Result

## Status

Implemented. Progress, Today, LINE, badges, plan adjustment, Mochit, and the legacy compatibility path now consume the complete shared `ExamReadinessResult`. Learning progress and schedule health remain separate concepts, and no consumer performs its own expiry check or chooses a replacement primary improvement.

Commit subject: `feat(readiness): use one explainable readiness result`

## RED / GREEN

### Initial consumer RED

The Task 10 presentation and consumer tests were added before production changes. After correcting test-only environment setup (`server-only` mock and a jsdom `localStorage` stub), the required pre-implementation run produced the intended RED:

- 8 test files failed.
- 10 tests failed and 7 passed.
- Failures identified the missing shared presentation module/components and the old scalar percentage/fallback consumer contracts.

Additional focused RED cases were added while auditing edge behavior:

- Saved plan primary improvement losing to an independently lower field: 1 of 4 failed.
- Retention Topic catalog lookup: 1 of 12 failed.
- Shared field lookup helper: 1 of 12 failed.
- Shared combined score/band label: 1 of 12 failed.
- Landing-page readiness example still using `68%` and retired formula copy: 1 of 4 failed.
- Today schedule refresh duplicating the current-readiness request: 2 of 14 failed.

Each RED was captured before its corresponding implementation.

### Final GREEN

- Required Task 10 plus learning/Today/current regressions: 11 files, 52 tests passed.
- Full suite: 116 files, 1202 tests passed.
- Typecheck and lint passed.

## Shared presentation

`lib/examReadiness/presentation.ts` is the sole Japanese translation layer for readiness presentation:

- Every band: measuring, needs work, approaching, ready, stable.
- Every confidence level and structured confidence reason.
- Field labels from the saved result first, then the configured field catalog.
- Topic labels from saved Weak Topics first, then the content catalog.
- Every primary-improvement code, including null.
- Score rendering as `/100`; a null score renders `測定中`.
- No readiness string uses `合格率`, `合格確率`, or `%`.

## Consumer mapping

| Consumer | Shared-result cutover |
| --- | --- |
| Progress | `ExamReadinessCard` receives `bootstrap.examReadiness` exactly. It shows score/band or measuring, all five components, fields and evidence sufficiency, confidence reasons, applied caps/gates, Weak Topic reason/top-five markers, and the saved next step. No integrated/readiness-progress fallback remains. |
| Today | `ExamReadinessSummary` renders the complete result and translates only its saved `primaryImprovement`. The page starts with the cached complete result when present. Its existing server schedule refresh now returns the same current result through one shared promise, avoiding a duplicate client request. |
| LINE | The progress reply lazily calls `getCurrentReadiness` before formatting and uses shared score/band/primary-improvement labels. Failure or absence remains `測定中`; no mastery ranking or integrated scalar fallback remains. |
| Badge | `BadgeSignals` carries `ExamReadinessResult`, never a scalar. `b-cp6-high-readiness` is awarded only for ready/stable with non-low confidence. The learning-progress and legacy localStorage scalar fallbacks are gone. |
| Plan adjustment | Schedule health remains the first argument and `ExamReadinessResult | null` is a separate second argument. Readiness score/band, stored field order, stored Weak Topic order, and saved primary improvement come only from the shared result. The planner does not sort reasons or select a replacement improvement. |
| Mochit | The helper accepts the complete result and presents shared score/band/saved next step. Null and measuring remain measuring; probability wording is removed. |
| Learning progress | `ProgressSummary.readinessPct` is renamed to `learningProgressPct` throughout and is explicitly documented as learning activity, not Exam Readiness. |
| Legacy integrated status | Schedule status no longer incorporates readiness score. The old weighted formula and constants/tests are removed. New compatibility `readiness_score` values are copied only from the shared result score. |
| Bootstrap/routes | Progress bootstrap, integrated refresh, and generated plan paths start one current-result promise early and share it with dependent work. Routes remain Node runtime; no Edge runtime or HTTP self-call was introduced. |
| Marketing/dead legacy surface | The landing-page readiness example now says `68/100`, shows a band and next step, and describes evidence-based calculation. The dead `learningLoop.computeExamReadiness` mastery-average formula and test were removed. |

## Legacy-removal search evidence

Final production/test searches showed:

- `readinessPct`, `READINESS_WEIGHTS_NORMAL`, `READINESS_WEIGHTS_DIRECT`, `ReadinessWeights`, `computeExamReadiness`, and `integratedReadiness`: no production matches. The only matches are intentional negative assertions for `readinessPct` and the ignored legacy scalar in badge tests.
- `合格率|合格確率`: no production matches in `app`, `components`, `lib`, or `types`.
- `validUntil`: only calculator, repository validation, and `getCurrentReadiness` service-boundary matches; no page, LINE, badge, plan, or client-cache comparison.
- `readinessScore`: only the legacy DB mapper/type/calculation compatibility path and the shared presentation helper name; no user-facing consumer reads the integrated scalar.
- `primaryImprovement`: calculator/repository ownership plus presentation calls that translate the saved value. No consumer sorting/reduction was found around fields, Weak Topics, confidence reasons, or primary improvement.

## React and Next.js review

- Read the installed Next 16 Route Handler guide completely before changing the LINE and server route paths.
- All changed route handlers use the Node default or explicitly retain `runtime = "nodejs"`; none use Edge.
- Bootstrap/current work is started early and shared across independent work. Today gets readiness from its existing server refresh rather than creating two client requests.
- New components are focused, use semantic `section`, heading, list, and description-list markup, and expose an accessible progress bar only when a numeric score exists.
- Render values are derived directly from props. No effect-derived presentation state or unnecessary memoization was added.
- Effects are limited to external server synchronization and include unmount guards. The complete cached result prevents an avoidable blank initial state while the current server result refreshes.

## Files

Created:

- `lib/examReadiness/presentation.ts`
- `components/progress/ExamReadinessCard.tsx`
- `components/today/ExamReadinessSummary.tsx`
- `test/examReadinessPresentation.test.ts`
- `test/ExamReadinessCard.test.tsx`
- `test/ExamReadinessSummary.test.tsx`
- `test/examReadinessLine.test.ts`
- `test/examReadinessBadges.test.ts`
- `test/examReadinessPlanAdjustment.test.ts`
- `test/progressSummary.test.ts`
- `test/fixtures/examReadiness/result.ts`

Modified consumer/integration files:

- `app/progress/page.tsx`
- `app/today/page.tsx`
- `app/api/line/webhook/route.ts`
- `app/api/progress/bootstrap/route.ts`
- `app/api/integrated-status/refresh/route.ts`
- `app/api/plan-adjustment/generate/route.ts`
- `app/lp/page.tsx`
- `components/today/TodayPolicyStrip.tsx`
- `components/progress/IntegratedStatusCard.tsx`
- `lib/badges.ts`
- `lib/badgeSignals.ts`
- `lib/planAdjustment.ts`
- `lib/mochitPresentation.ts`
- `lib/progressSummary.ts`
- `lib/progressBootstrap.ts`
- `lib/integratedStatus.ts`
- `lib/learningLoop.ts`
- `lib/userSession.ts`
- `types/integratedStatus.ts`
- `types/plan.ts`
- `test/examReadinessCurrentRoute.test.ts`
- `test/LandingPageCampaign.test.tsx`
- `test/mochitPresentation.test.ts`
- `test/learningLoop.test.ts`
- `test/learningLoopIntegration.test.ts`

## Verification

Final post-edit commands:

- `npx vitest run test/examReadinessPresentation.test.ts test/ExamReadinessCard.test.tsx test/ExamReadinessSummary.test.tsx test/examReadinessLine.test.ts test/examReadinessBadges.test.ts test/examReadinessPlanAdjustment.test.ts test/progressSummary.test.ts test/mochitPresentation.test.ts test/learningLoopIntegration.test.ts test/todaysLearningQueue.test.ts test/examReadinessCurrentRoute.test.ts` — 11 files, 52 tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 116 files, 1202 tests passed.
- `git diff --check` — passed.

## Concerns

- The legacy database column `integrated_learning_status.readiness_score` is non-null. A measuring/null shared score is therefore persisted as a compatibility sentinel `0`; no readiness consumer reads or displays this value, so null/measuring semantics remain intact on every current surface. Making that historical column nullable would require a separate migration.
- Test runs emit existing non-failing Node `module.register()` deprecation and localStorage experimental warnings.
- The Task 7 deferred current-route temporary-error classification was not changed here; this task did not modify that route.

## Fix Round 1 — 2026-08-23

### RED / GREEN

Fix-round regressions were written before production changes. The first focused run produced 8 intended failures across 5 files (18 tests already green):

- LINE omitted the shared score/band/saved improvement when legacy progress was absent, and also omitted measuring when both values were absent.
- The progress card placed field evidence sufficiency outside the field value's `<dd>`.
- An actual repository revision-instability error returned 500, while an arbitrary authentication error shaped as `{ retryable: true }` incorrectly returned 503.
- Missing/measuring compatibility readiness became numeric `0` in the integrated status and mapper round trip.
- The required additive nullable/legacy-clearing migration did not exist.

After the fixes:

- Fix focus: 5 files, 26 tests passed.
- Task 10, LINE, Today, current-route, integrated-status, migration, and landing regressions: 13 files, 62 tests passed.
- Full suite: 117 files, 1208 tests passed.

### LINE without legacy progress

The LINE progress formatter now creates the readiness and saved-improvement lines independently of `UserProgress`. Learning-count and streak/XP lines are conditional on progress; exam-date status and the Web link remain available. A complete shared result therefore still shows its exact score, band, and saved improvement, while no result remains `測定中` even if legacy progress is also absent.

### Nullable compatibility persistence

The new additive migration `20260823090000_integrated_status_nullable_readiness.sql` drops `NOT NULL` from `integrated_learning_status.readiness_score` and clears every numeric value present before the P1-2 cutover. No earlier migration or `supabase/schema.sql` was edited.

`IntegratedLearningStatus`, `IntegratedStatusRow`, the row mappers, and `computeIntegratedStatus` now preserve `number | null` exactly. Absent readiness and a complete measuring result both persist as SQL `NULL`; numeric scores remain exact. The prior sentinel-`0` concern is resolved.

Database verification used a uniquely named disposable Supabase PostgreSQL 17.6 container:

- Replayed all six prior active migrations successfully.
- Inserted a synthetic pre-cutover compatibility score of `87`.
- Applied the new migration (`UPDATE 1`) and verified `is_nullable = YES` plus the legacy row cleared to `NULL`.
- Ran the new pgTAP contract: 3/3 assertions passed for column nullability, null insert, and null readback.
- Removed the disposable container after verification.

### Current-route temporary classification

The current Route Handler now returns 503 only for typed, known temporary readiness failures:

- retryable service codes: `claim_failed`, `completion_failed`, `current_read_unstable`, `recalculation_busy`, and `recalculation_unstable`;
- repository code: `evidence_revision_unstable`.

Typed invalid/permanent failures and arbitrary auth/client objects with matching `retryable` or `code` properties remain generic no-store 500 responses. This resolves the earlier Task 7 deferred concern without exposing error details.

### Accessibility

Each field's score and evidence-sufficiency explanation now share the same semantic `<dd>`. The regression finds the numeric field value's closest `<dd>` and requires the evidence text inside it.

### Fix Round 1 files

Modified:

- `app/api/exam-readiness/current/route.ts`
- `app/api/line/webhook/route.ts`
- `components/progress/ExamReadinessCard.tsx`
- `lib/dbMappers.ts`
- `lib/integratedStatus.ts`
- `types/integratedStatus.ts`
- `test/ExamReadinessCard.test.tsx`
- `test/examReadinessCurrentRoute.test.ts`
- `test/examReadinessLine.test.ts`
- `test/learningLoopIntegration.test.ts`

Added:

- `supabase/migrations/20260823090000_integrated_status_nullable_readiness.sql`
- `supabase/tests/integrated_status_nullable_readiness_test.sql`
- `test/integratedStatusReadinessMigration.test.ts`

### Fix Round 1 verification

- `npx vitest run test/examReadinessPresentation.test.ts test/ExamReadinessCard.test.tsx test/ExamReadinessSummary.test.tsx test/examReadinessLine.test.ts test/examReadinessBadges.test.ts test/examReadinessPlanAdjustment.test.ts test/progressSummary.test.ts test/mochitPresentation.test.ts test/learningLoopIntegration.test.ts test/todaysLearningQueue.test.ts test/examReadinessCurrentRoute.test.ts test/integratedStatusReadinessMigration.test.ts test/LandingPageCampaign.test.tsx` — 13 files, 62 tests passed.
- Disposable migration replay and seeded legacy clearing — passed.
- New pgTAP contract — 3/3 passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 117 files, 1208 tests passed.
- Legacy searches — no production matches for retired readiness formulas/scalars, probability wording, consumer expiry comparisons, or a readiness `?? 0` fallback.
- `git diff --check` — passed.

### Fix Round 1 concerns

No fix-round blocker remains. Test output retains the repository's existing non-failing Node `module.register()` deprecation and unavailable-localStorage experimental warnings.
