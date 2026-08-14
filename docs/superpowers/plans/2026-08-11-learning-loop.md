# Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect existing learning, assessment, weakness detection, review scheduling, and today's learning into one deterministic loop.

**Architecture:** Extend the backward-compatible AppState with evidence-backed mastery details while keeping the existing numeric mastery projection. Put all decisions in pure domain modules, then route current quiz and exam completion handlers through those modules.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript, Vitest, Supabase/PostgreSQL.

## Global Constraints

- Preserve checkpoint and check-pack pass thresholds, including the existing 70% behavior.
- Do not infer mastery from content views, self-report, or legacy completion state.
- Git操作は実行時のユーザー指示を優先する。featureブランチをpush・PR作成・mainへmergeしない。
- Keep current pages and navigation; no parallel planning UI.

---

### Task 1: Mastery, Review, and Weak Topic Domain

**Files:**
- Create: `lib/learningLoop.ts`
- Modify: `types/index.ts`
- Test: `test/learningLoop.test.ts`

**Interfaces:**
- Produces: `applyLearningEvidence`, `scheduleTopicReview`, `getDueReviewTopics`, `getWeakTopics`, `computeExamReadiness`.

- [ ] Write literal, table-driven failing tests for confirmation/review/summary/mock/past/checkpoint evidence, upper/lower bounds, 3/7/14/28-day success intervals, next-day failure, due-only stage progression, and all weak reasons.
- [ ] Run `npx vitest run test/learningLoop.test.ts` and confirm failures are caused by missing interfaces.
- [ ] Implement the types, constants, and pure functions with no React or DB dependency.
- [ ] Run the focused test until green and refactor duplicated date/weight logic.

### Task 2: Backward-Compatible Persistence

**Files:**
- Modify: `lib/storage.ts`
- Modify: `lib/dbMappers.ts`
- Modify: `lib/mergeAppState.ts`
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/20260811_learning_loop_p0.sql`
- Test: `test/learningLoopPersistence.test.ts`

**Interfaces:**
- Consumes: `TopicMasteryStats` from Task 1.
- Produces: normalized, DB-mapped, and conflict-safe merged `topicMasteryStats`.

- [ ] Write failing tests proving old state defaults safely, mappings round-trip, and the newest evaluation wins even when its score is lower.
- [ ] Run the focused test and confirm RED.
- [ ] Add the AppState field, mapper column, merge rule, and additive migration.
- [ ] Run focused tests until GREEN.

### Task 3: Topic and Exam Result Integration

**Files:**
- Modify: `lib/study.ts`
- Modify: `lib/checkpointExam.ts`
- Modify: `lib/checkpoints.ts`
- Modify: `lib/mockExam.ts`
- Modify: `types/pastExam.ts`
- Modify: `lib/pastExam/scoring.ts`
- Modify: `components/pastExam/PastExamRunner.tsx`
- Modify: `app/mock-exam/page.tsx`
- Test: `test/learningLoopIntegration.test.ts`
- Test: `test/mockExam.test.ts`
- Test: `test/pastExamAttempts.test.ts`

**Interfaces:**
- Consumes: `applyLearningEvidence` and review scheduling from Task 1.
- Produces: updated AppState after confirmation, checkpoint, summary exam, and official past exam evidence; Topic-level exam summaries.

- [ ] Write failing scenario tests for learn → review due → summary miss → weak → review success → extended due date.
- [ ] Run focused tests and confirm RED.
- [ ] Route each completion function through the shared evidence reducer and ignore unresolved Topic IDs.
- [ ] Run focused integration and existing exam tests until GREEN.

### Task 4: Today's Learning Queue

**Files:**
- Modify: `lib/aiPlanner.ts`
- Modify: `types/index.ts`
- Modify: `app/today/page.tsx`
- Test: `test/todaysLearningQueue.test.ts`

**Interfaces:**
- Produces: `buildTodaysLearningQueue` with ordered candidates and deterministic reasons.

- [ ] Write failing tests proving overdue review > summary weak > low-mastery important > new learning.
- [ ] Run focused tests and confirm RED.
- [ ] Implement queue construction and adapt `generateTodayMenu` without changing page routes.
- [ ] Run focused tests until GREEN.

### Task 5: Summary Exam Result UX

**Files:**
- Modify: `app/mock-exam/page.tsx`
- Test: `test/MockExamPage.test.tsx`

**Interfaces:**
- Consumes: Topic summaries and weak topics from Task 3.
- Produces: overall/domain/topic result, top-three strengthening topics, deterministic next-action copy, and existing lesson CTA.

- [ ] Write a failing component test against the real result view behavior.
- [ ] Run the focused test and confirm RED.
- [ ] Render the minimal result additions and link the primary CTA to the existing review lesson route.
- [ ] Run focused component tests until GREEN.

### Task 6: Full Verification

**Files:**
- Verify all modified files and migration.

- [ ] Run `npm test` and confirm all suites pass.
- [ ] Run `npm run typecheck` and confirm exit 0.
- [ ] Run `npm run lint` and confirm exit 0.
- [ ] Run `npm run build` and confirm exit 0.
- [ ] Review `git diff --check`, `git status --short`, and the P0 scenario coverage; do not commit.
