# P1-2 Exam Readiness Design

## Status

This document consolidates the design sections approved on 2026-08-16. P1-2 defines the rule-based Exam Readiness calculation and its explainable output. It does not implement the calculator or UI.

Three configuration values remain explicitly open at the end of this document. They must be approved and included in `exam-readiness-rule-v1` before implementation begins; no implementation may invent them implicitly.

## Goal

Exam Readiness answers: "How close is the learner's demonstrated ability to the current IT Passport examination standard?"

It is distinct from:

- Learning Progress: how much learning activity is complete;
- Topic Mastery: the latest P0 mastery state per Topic;
- pass probability: a prediction that requires outcome data and validation.

The result must be explainable, reproducible from saved evidence, conservative under sparse data, and usable consistently by Today, Progress, LINE, badges, and learning recommendations.

## Non-goals

- No pass-probability wording.
- No IRT reproduction or conversion of practice accuracy into the official IRT score.
- No ML prediction.
- No strong score contribution from study time or content completion.
- No redesign of P0 Mastery or P1-1 first-attempt semantics.
- No UI-first implementation.

## Current-state findings

The current user-facing readiness value comes from `IntegratedLearningStatus.readinessScore`. Its rule combines learning input, basic questions, terminology, exam questions, and field balance. It does not consume the complete P0/P1-1 evidence model and does not provide confidence or a reproducible explanation.

P1-2 will replace that calculation as the sole Exam Readiness source. The existing `overallStatus` remains schedule health and must not be reused as the readiness band.

P0 and P1-1 remain authoritative for their own domains:

```text
Topic Mastery
-> topic_mastery_stats is the Source of Truth

First-attempt state
-> first | seen | unknown from P1-1
```

The Readiness Calculator does not implement its own Mastery mutation or reconstruction.

## Selected architecture

```text
DB and P0/P1-1 learning state
-> Evidence Collector
-> Readiness Calculator
-> Safety Gates
-> latest result + daily snapshot
-> getCurrentReadiness()
-> Today / Progress / LINE / badges / recommendations
```

Responsibilities:

- Evidence Collector: loads Mastery, first-attempt answers, assessment sessions, due-review outcomes, Topic importance, and versioned field configuration.
- Readiness Calculator: normalizes the available components to 0-100 and records the complete calculation trace.
- Safety Gates: applies Weak Topic penalties, field caps, and confidence caps.
- Persistence: stores a current result and one reproducible snapshot per day and version.
- Consumers: render the shared result; they do not calculate or expire readiness independently.

## Versioned configuration

The current versions are:

```text
modelVersion = exam-readiness-rule-v1
examSchemeVersion = ip-3field-2026
```

Both output fields have the TypeScript type `string`, not a literal type. Any change to weights, thresholds, freshness coefficients, evidence coefficients, rounding rules, or another setting that can affect a result requires a new `modelVersion`.

`ip-3field-2026` defines the current fields and scored-question ratios:

| Field ID | Label | Scored-question ratio |
| --- | --- | ---: |
| `strategy` | ストラテジ | `32 / 92` |
| `management` | マネジメント | `18 / 92` |
| `technology` | テクノロジ | `42 / 92` |

The field list, labels, ratios, and gates are loaded through `examSchemeVersion`. A future scheme can replace the configuration without changing the result contract.

## Result contract

```ts
type ExamReadinessResult = {
  score: number | null
  band:
    | "measuring"
    | "needs_work"
    | "approaching"
    | "ready"
    | "stable"

  confidence: {
    score: number
    level: "low" | "medium" | "high"
    reasons: Array<{
      code:
        | "insufficient_evidence"
        | "insufficient_coverage"
        | "insufficient_field_evidence"
        | "insufficient_summative_sessions"
      fieldId?: string
      actual: number
      required: number
    }>
  }

  fields: Array<{
    fieldId: string
    label: string
    score: number | null
    evidenceSufficiency: number
    scoreGate: {
      evaluated: boolean
      cap: number | null
      reasonCode: string | null
    }
  }>

  components: {
    firstPerformance: number | null
    summativePerformance: number | null
    topicMastery: number | null
    retention: number | null
    assessmentCoverage: number
  }

  calculation: {
    baseScore: number | null
    weakTopicPenalty: number
    preGateScore: number | null
    appliedCaps: Array<{
      type: "field" | "confidence"
      cap: number
      reasonCode: string
      fieldId?: string
    }>
  }

  evidence: {
    uniqueQuestionCount: number
    weightedEvidenceUnits: number
    summativeSessionCount: number
    summativeSessionIds: string[]
    evidenceRevision: number
  }

  weakTopics: Array<{
    topicId: string
    label: string
    importance: number
    reason:
      | "low_mastery"
      | "repeated_incorrect"
      | "unresolved_summative_error"
      | "latest_review_failed"
    penalty: number
    penaltyApplied: boolean
  }>

  primaryImprovement: {
    code:
      | "collect_more_evidence"
      | "improve_field"
      | "review_weak_topic"
      | "improve_retention"
      | "take_summative_assessment"
    fieldId?: string
    topicId?: string
  } | null

  modelVersion: string
  examSchemeVersion: string
  calculationReferenceTime: string
  calculatedAt: string
  validUntil: string | null
  snapshotDate: string
}
```

Reason codes and measured values are saved. Japanese display strings are selected by the UI and LINE adapters and are not persisted as calculation facts.

## Component weights and missing data

Initial weights:

| Component | Weight |
| --- | ---: |
| First performance | 30 |
| Summative performance | 25 |
| Topic Mastery | 25 |
| Retention | 10 |
| Assessment coverage | 10 |

Missing components are not converted to zero. The available weights are renormalized to 100%:

```text
baseScore
= sum(availableComponentValue * configuredWeight)
  / sum(availableConfiguredWeight)
```

Sparse evidence is controlled by confidence and its score cap, not by inserting artificial zeroes.

If all four performance components below are `null`, coverage alone cannot create a score:

```text
firstPerformance
summativePerformance
topicMastery
retention
```

The result is then:

```text
baseScore = null
preGateScore = null
score = null
band = measuring
```

Weak penalties and score caps are not applied to a null score. Confidence and its reasons are still calculated.

## First performance

Only answers with `firstAttemptState = "first"` enter first performance. `seen` and `unknown` are not silently converted into first evidence. If there is no first evidence, the component is `null`.

The component is the weighted correct rate of eligible first answers. Source and freshness affect aggregation weight and confidence evidence; they do not turn a correct answer into a lower score.

```text
firstPerformance
= sum(isCorrect * evidenceWeight)
  / sum(evidenceWeight)
  * 100
```

The answer remains usable in a completed summative session. Reuse across components is allowed; confidence evidence is deduplicated separately.

## Summative performance

Eligible sources:

- `summary`;
- `mock`;
- `official_past` only when `mode = "exam"`.

Ineligible sources:

- `checkpoint`;
- `official_past` practice mode;
- `in_progress` sessions;
- `abandoned` sessions.

Use the most recently completed three eligible sessions. One or two sessions still produce the component, but reduce confidence.

Explicit submission with unanswered questions is allowed:

```text
sessionScore
= correctCount / questionCount * 100
```

Unanswered questions therefore lower the session score, but are not added to Mastery or evidence volume. `questionCount` is fixed when the session starts and cannot change after completion.

Source trust coefficients:

| Source | Trust coefficient |
| --- | ---: |
| Official past exam | 1.0 |
| Mock | 0.9 |
| Summary | 0.8 |
| Checkpoint | 0.6 |

Checkpoint trust is used outside summative performance for its eligible evidence roles.

Session evidence weight:

```text
sessionEvidenceWeight
= questionCount
  * sourceTrust
  * firstEvidenceCoefficient
  * freshnessCoefficient

firstEvidenceCoefficient
= 0.5 + 0.5 * firstRate

firstRate
= firstCount / (firstCount + seenCount)
```

`unknownCount` is preserved and excluded from the first-rate denominator. If all answers are `unknown`, first rate is missing and the first-evidence coefficient uses the neutral value `0.5`.

Source trust affects the weighted average and confidence evidence, not the raw session score.

```text
summativePerformance
= 0.7 * weightedMean(eligibleSessionScores, sessionEvidenceWeight)
  + 0.3 * min(eligibleSessionScores)
```

## Topic Mastery

`topic_mastery_stats` is the only Mastery Source of Truth. Readiness does not replay evidence to create another Mastery value.

Readiness aggregates the latest P0-evaluated Topic Mastery using Topic importance. Unevaluated Topics are not inserted as zero; their absence is represented by assessment coverage and confidence.

```text
topicMastery
= sum(evaluatedTopicMastery * topicImportance)
  / sum(evaluatedTopicImportance)
```

If there are no P0-evaluated Topics, the component is `null`.

## Retention

Initial learning success is not retention evidence. Only an outcome after a Review Due deadline counts.

Per-Topic retention value:

| Latest due-review outcome | Retention value |
| --- | ---: |
| No due-review outcome | Excluded |
| Failure | 0 |
| Stage 2 success, 3-day interval | 50 |
| Stage 3 success, 7-day interval | 75 |
| Stage 4 success, 14-day interval | 90 |
| Stage 5+ success, 28+ day interval | 100 |

Overdue multipliers `0.7` and `0.4` apply only to Topics that already have retention evidence. A Topic with no due-review outcome remains excluded rather than becoming zero.

The overall component is the Topic-importance-weighted average of eligible Topic retention values after the applicable overdue multiplier.

## Assessment coverage

Each Topic contributes only its strongest evidence type, adjusted for freshness:

| Evidence | Coefficient |
| --- | ---: |
| Confirmation question | 0.4 |
| Checkpoint | 0.6 |
| Review | 0.7 |
| Summary | 0.8 |
| Mock | 0.9 |
| Official past exam | 1.0 |

```text
evidenceStrength
= evidenceCoefficient * freshnessCoefficient

assessmentCoverage
= sum(topicImportance * strongestTopicEvidenceStrength)
  / sum(allTopicImportance)
  * 100
```

A Topic with no evidence contributes zero only to coverage, not to Mastery or retention.

## Evidence deduplication and volume

Deduplication has two distinct stages:

1. Remove retransmitted copies of the same answer event by `answerId` or idempotency key.
2. For evidence-volume calculations only, group by `canonicalQuestionId` and keep the event with the greatest evidence strength.

The canonical-question collapse applies only to:

- `evidenceVolume`;
- `fieldEvidenceVolume`.

Retention, repeated misses, P0 Mastery, first performance, summative performance, and Weak Topic derivation use the event-deduplicated time series. Repeated review practice affects retention, not confidence volume.

```text
evidenceVolume
= min(
    100,
    weightedUniqueQuestionEvidenceUnits
    / targetEvidenceUnits
    * 100
  )

targetEvidenceUnits = 100
```

For each canonical question, its evidence unit is its strongest `evidenceCoefficient * freshnessCoefficient` value.

## Field evidence sufficiency

```text
targetFieldEvidenceUnits
= targetEvidenceUnits
  * fieldQuestionRatioFromExamSchemeVersion

fieldEvidenceVolume
= min(
    100,
    weightedUniqueQuestionEvidenceUnitsWithinField
    / targetFieldEvidenceUnits
    * 100
  )
```

```text
fieldAssessmentCoverage
= evaluatedTopicImportanceWithinField
  / allTopicImportanceWithinField
  * 100
```

An evaluated Topic is one with at least one qualifying assessment evidence item after event deduplication.

```text
fieldEvidenceSufficiency
= min(fieldEvidenceVolume, fieldAssessmentCoverage)

threeFieldEvidenceSufficiency
= min(allConfiguredFieldEvidenceSufficiencyValues)
```

The minimum prevents both concentrated repetition and shallow breadth from being treated as sufficient field evidence.

## Confidence

```text
confidence
= 0.35 * evidenceVolume
  + 0.25 * assessmentCoverage
  + 0.20 * threeFieldEvidenceSufficiency
  + 0.20 * summativeSessionSufficiency

summativeSessionSufficiency
= min(100, completedEligibleSummativeSessionCount / 3 * 100)
```

Confidence levels after applying confidence caps:

```text
0-59   -> low
60-79  -> medium
80-100 -> high
```

Field evidence safety rules, evaluated after rounding field evidence sufficiency:

```text
any field sufficiency < 40
-> overall confidence cap 59
-> do not evaluate the score gate for each insufficient field

no field below 40, but any field from 40 through 59
-> overall confidence cap 79
-> evaluate field score gates

all fields >= 60
-> no field-evidence confidence cap
-> evaluate field score gates
```

Low confidence applies an overall score cap of 59. It does not replace missing component values with zero.

Confidence reasons use structured codes with `actual` and `required`. The same answer may support multiple performance components but contributes only once to evidence volume.

## Field scores and gates

Each configured field recomputes the available components using evidence from that field and renormalizes their weights. The global top-five Weak Topic penalty is not subtracted again from field scores.

If all four performance components are `null` within a field, that field score is also `null`; field coverage alone cannot create a zero field score. A null field score has no score gate and remains governed by field evidence sufficiency and the resulting confidence cap.

Field scores are rounded before gate evaluation:

```text
eligible field score < 40
-> overall score cap 59

eligible field score from 40 through 59
-> overall score cap 74

eligible field score >= 60
-> no field score cap
```

An insufficient field is not treated as a zero score. Its score gate is not evaluated; confidence is capped instead.

## Weak Topic penalty

Weak reasons and coefficients:

| Reason | Coefficient |
| --- | ---: |
| Low Mastery | 1.0 |
| Consecutive incorrect answers | 1.25 |
| Unresolved summative miss | 1.5 |
| Latest Review failure | 1.5 |

If a Topic has multiple reasons, use only its greatest reason coefficient. Rank eligible Topics by their individual penalty and deterministic tie-break rules, then apply only the top five:

Weak reason detection retains the existing P0 definitions: low Mastery is an evaluated Topic below 60, consecutive incorrect means the latest two applicable outcomes are incorrect, unresolved summative error remains unresolved until later evidence overcomes it, and latest Review failure means the latest due-review outcome failed. An unevaluated Topic is not Weak merely because its stored or derived score is zero.

```text
weakTopicPenalty
= min(
    12,
    sum(topFive((topicImportance / 3) * reasonCoefficient))
  )
```

The output includes all reported Weak Topics and marks the top-five deduction set with `penaltyApplied`.

## Calculation order and rounding

The reproducibility tuple is:

```text
evidenceRevision
+ modelVersion
+ examSchemeVersion
+ calculationReferenceTime
```

Calculation order:

1. Freeze `calculationReferenceTime`.
2. Load evidence at the selected `evidenceRevision`.
3. Deduplicate identical answer events.
4. Read current P0 Topic Mastery and calculate time-series-derived components from the uncollapsed event history.
5. Collapse by canonical question only for evidence-volume calculations.
6. Calculate volume, coverage, and field evidence sufficiency.
7. Renormalize available components and calculate `baseScore`.
8. Apply the Weak Topic deduction to obtain `preGateScore`.
9. Calculate and round field scores, then derive field caps.
10. Calculate confidence, apply its caps, round it, and derive its level.
11. If confidence is low, add the score cap of 59.
12. Apply the smallest score cap to `preGateScore`.
13. Round final score and derive the band.
14. Select `primaryImprovement`.
15. Calculate `validUntil`.

```text
preGateScore = max(0, baseScore - weakTopicPenalty)
score = min(preGateScore, allAppliedCaps)
```

When no cap applies, `score = preGateScore`.

Rounding order:

```text
round field score
-> decide field cap from rounded field score

round fieldEvidenceSufficiency
-> decide confidence field cap from rounded sufficiency

apply confidence caps, then round confidence
-> decide confidence level from rounded confidence

apply all score caps, then round score
-> decide band from rounded score
```

Weighted means, component aggregation, `baseScore`, and `preGateScore` are not rounded during calculation. Unrounded values are preserved in the calculation trace where needed for reproduction.

## Bands

Evaluate in this priority order after all caps and rounding:

```text
score is null or confidence is low -> measuring
score >= 85 and confidence is high -> stable
score >= 75 -> ready
score >= 60 -> approaching
score >= 0 -> needs_work
```

A score of at least 85 with medium confidence is `ready`, not `stable`.

## Primary improvement

Use the first matching rule:

1. `score === null` -> `collect_more_evidence`.
2. Confidence is low and has evidence-volume, coverage, or field-evidence insufficiency -> `collect_more_evidence`.
3. Confidence is low and its only shortage is summative sessions -> `take_summative_assessment`.
4. A field cap was applied -> `improve_field`.
5. A penalty-applied Weak Topic exists -> `review_weak_topic`.
6. `retention !== null && retention < 75` -> `improve_retention`.
7. Fewer than three eligible completed summative sessions exist -> `take_summative_assessment`.
8. Otherwise -> `null`.

Tie-breaking:

- field: lowest cap, then lowest field score, then exam-scheme order;
- Weak Topic: greatest individual penalty, then greatest importance, then ascending `topicId`;
- retention Topic: lowest retention, then greatest importance, then ascending `topicId`;
- confidence reason: field evidence, coverage, evidence volume, then summative sessions.

All consumers use the saved `primaryImprovement`; they do not select it independently.

## Assessment session contract

Checkpoint, summary, mock, and official past exam share a persisted session representation:

```ts
type AssessmentSession = {
  sessionId: string
  userId: string
  source: "checkpoint" | "summary" | "mock" | "official_past"
  mode: "practice" | "exam"
  status: "in_progress" | "completed" | "abandoned"
  startedAt: string
  completedAt: string | null
  questionCount: number
  answeredCount: number
  correctCount: number
  firstCount: number
  seenCount: number
  unknownCount: number
}
```

Each persisted answer exposes at least:

```ts
type AssessmentAnswer = {
  answerId: string
  idempotencyKey: string
  sessionId: string
  canonicalQuestionId: string
  topicId: string
  fieldId: string
  isCorrect: boolean
  firstAttemptState: "first" | "seen" | "unknown"
  answeredAt: string
}
```

`unknown` is never rewritten to `seen`. A session becomes completed only through explicit submission. Completed question composition is immutable; another attempt receives a new `sessionId`.

Checkpoint sessions are stored for first performance, Mastery, coverage, and confidence evidence, but never enter summative performance.

## Recalculation triggers and idempotency

Recalculate after successful finalization of:

- a learning session;
- a due Review outcome;
- a checkpoint;
- a summary assessment;
- a mock;
- an official past-exam session.

Answer-write idempotency and recalculation idempotency are separate:

```text
recalculationTriggerKey
= triggerType
  + triggerId
  + modelVersion
  + examSchemeVersion
```

The key has a unique constraint on a recalculation-processing record. The unique constraint prevents duplicate records, not retry:

- a failed retry reuses the same processing record and increments its attempt state;
- a succeeded record is a no-op on retransmission;
- concurrent retry is controlled by processing state and per-user serialization.

Recalculation is serialized per user. It saves the input `evidenceRevision`. A result older than the user's current revision cannot overwrite current state; it recomputes from the latest evidence instead. Current state and the daily snapshot update in one transaction.

Failure does not roll back the already-saved answer or completed session.

## Time boundaries and lazy refresh

`calculationReferenceTime` is fixed at calculation start. `calculatedAt` is the processing completion time.

```text
validUntil
= the earliest change boundary strictly after calculationReferenceTime
```

Candidate boundaries are freshness-coefficient changes, Review Due arrival, and overdue-multiplier changes. Boundaries at or before the reference time are reflected in the current calculation and cannot become `validUntil`. If no future boundary exists, `validUntil = null`.

All consumers use:

```text
getCurrentReadiness()
-> read saved result
-> if validUntil is expired, recalculate
-> return the latest result
```

Expired lazy recalculation uses:

```text
triggerType = time_boundary
triggerId = prior result validUntil
```

No consumer performs its own expiry test or formula, and no all-user daily batch is required.

## Snapshot persistence

Persist two views:

- current state: one row per user;
- daily snapshot: one row per user, `snapshotDate`, `modelVersion`, and `examSchemeVersion`.

```text
snapshotDate
= date of calculatedAt in Asia/Tokyo
```

V1 uses `Asia/Tokyo`. Recalculations on the same date update that date's versioned snapshot; past dates are immutable. Current state and the daily snapshot are updated together.

The snapshot stores the complete result contract, evidence revision, selected session IDs, calculation reference time, completion time, and applied reason codes so the final score can be reproduced.

## Presentation rules

- Display `72/100`, not `72%` and not pass probability.
- `measuring` explains that the value is provisional or unavailable and names the structured shortage.
- Progress shows components, fields, confidence, Weak Topics, and applied gates.
- Today shows the score, band, and saved `primaryImprovement`.
- LINE includes the score and the same primary field, Topic, or evidence action.
- Badges and recommendations consume the shared band, confidence, and Weak Topic result.
- Learning progress is never used as a fallback Exam Readiness value.

## Migration and rollout

1. Add the common session, recalculation-processing, current-result, and daily-snapshot structures through additive timestamped migrations.
2. Preserve `topic_mastery_stats` and P1-1 first-attempt semantics.
3. Do not include historical answers in summative performance when a completed session cannot be proven.
4. Historical identifiable answers may support first performance, coverage, and confidence; legacy unknown exposure remains unknown.
5. Run the new calculator in record-only mode while existing UI remains unchanged.
6. Verify reproducibility and anomalous values.
7. Move Today, Progress, LINE, badges, and recommendations to `getCurrentReadiness()`.
8. Remove the legacy readiness formula and learning-progress fallback only after the shared path is verified.

## Required tests

### Formula and evidence tests

- All four performance components null produces a null score even when coverage is zero.
- Partial components renormalize available weights.
- Canonical-question collapse affects only evidence volume.
- Repeating one question cannot grow confidence volume indefinitely.
- Initial learning success does not create retention.
- Review stages, failures, and overdue multipliers honor their boundaries.
- Overdue multipliers affect only Topics with retention evidence.
- Only eligible completed summary, mock, and exam-mode official sessions enter summative performance.
- Checkpoint, practice mode, in-progress, and abandoned sessions are excluded.
- Unanswered questions lower session score but add no evidence.
- First, seen, and unknown counts remain distinct.
- Cross-component answer reuse does not duplicate confidence evidence.
- Source trust changes evidence weight, not raw correctness.
- Weak deduction uses at most five Topics and at most 12 points.
- Field sufficiency boundaries 39, 40, 59, and 60 behave as specified.
- Field score boundaries 39, 40, 59, and 60 produce the specified caps.
- Confidence boundaries 59, 60, 79, and 80 produce the specified levels.
- Score boundaries 59, 60, 74, 75, 84, and 85 produce the specified bands.
- Rounding occurs before each documented boundary decision.
- Identical reproducibility tuples produce identical results and primary improvements.

### Persistence and integration tests

- A stale evidence revision cannot overwrite a newer result.
- Retry reuses the same recalculation-processing record.
- Current state and daily snapshot commit atomically.
- `validUntil` is strictly future or null.
- An expired read recalculates once without a loop.
- All consumers receive the same shared result.
- P0 Mastery and P1-1 first-state behavior remain unchanged.
- No UI or LINE message calls the result a pass probability.

## Acceptance criteria

- Current versions are `exam-readiness-rule-v1` and `ip-3field-2026`.
- Every consumer uses `getCurrentReadiness()`.
- Sparse data cannot produce a score above 59 under low confidence.
- Unmeasured fields are not treated as zero and cannot coexist with high confidence.
- The saved calculation trace reproduces the displayed score and band.
- The result explains confidence shortage, field restriction, Weak deduction, and the next improvement.
- P0 Mastery and P1-1 first-attempt meanings are unchanged.

## Open configuration values before implementation

The approved design references the following values but has not yet assigned reproducible V1 constants:

1. Freshness schedule: elapsed-time boundaries and coefficients used by answer evidence, assessment coverage, session evidence weight, and `validUntil`.
2. Retention overdue schedule: the exact overdue-duration boundary that selects multiplier `0.7` versus `0.4`.
3. Overall coverage reason threshold: the V1 `required` value for `insufficient_coverage` in structured confidence reasons.

These are calculation-affecting values. They must be chosen before implementation and become part of `exam-readiness-rule-v1`; changing them later requires a new `modelVersion`.
