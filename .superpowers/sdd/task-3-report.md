# Task 3 Report: Route topic explanations through common slides

## Files

- Modified: `components/learn/TopicContent.tsx`
- Added: `test/TopicContent.test.tsx`
- Report (not committed, per the instruction to commit only owned source/test files): `.superpowers/sdd/task-3-report.md`

## Commit

- `18751c3 feat: unify topic explanation slides`

## Implementation

- Exported `buildExplanationSlides(topic)` as the focused slide-assembly helper.
- The helper adds exactly one optional first understanding slide in priority order: registered experience, process demo, then visual learning.
- It then always appends the existing `concept` and `exam-points` slides. The exam-points slide retains its existing body, key points, and diagram rendering; it now also exists when the topic has body text but no key points or diagram.
- `TopicContent` passes the assembled slides to `ExplanationSlides`. Check-question rendering and `TopicReviewSections` were not changed.

## TDD evidence

1. Added a focused test using the experience-backed `strat-enterprise-activities` topic. It requires the IDs `experience`, `concept`, and `exam-points` in that order.
2. RED command:

   ```sh
   npm test -- --run test/TopicContent.test.tsx
   ```

   Result: exited 1. The new test failed as expected with `TypeError: buildExplanationSlides is not a function`.
3. Implemented the smallest assembly extraction in `TopicContent.tsx`.
4. GREEN command:

   ```sh
   npm test -- --run test/TopicContent.test.tsx
   ```

   Result: exited 0; 1 test passed.

## Verification

```sh
npm test -- --run test/TopicContent.test.tsx test/ExplanationSlides.test.tsx test/EnterpriseActivitiesExperience.test.tsx
```

Result: exited 0; 3 test files and 8 tests passed.

```sh
npm run lint -- components/learn/TopicContent.tsx test/TopicContent.test.tsx
```

Result: exited 0; no lint output.

```sh
npm run typecheck
```

Result: exited 0; no type errors.

```sh
git diff --check -- components/learn/TopicContent.tsx test/TopicContent.test.tsx
```

Result: exited 0; no whitespace errors.

## Self-review

- Confirmed experience-backed topics now retain the concept and exam-points slides after the experience slide.
- Confirmed the existing experience, process-demo, and visual-learning components remain the mutually exclusive first understanding slide.
- Confirmed all pre-existing concept-card and exam-points markup was preserved, including optional analogy, diagrams, and key points.
- Confirmed `TopicReviewSections` and quiz rendering were not modified.
- The focused Vitest invocations emit Node's existing `DEP0205` `module.register()` deprecation warning. It does not fail the tests and is outside this task's files.
