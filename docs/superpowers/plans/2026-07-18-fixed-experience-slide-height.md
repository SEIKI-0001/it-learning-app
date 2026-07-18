# Fixed Experience Slide Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep each topic's experience-slide area as tall as its tallest numbered panel, so changing slides does not move the content below it.

**Architecture:** `ExperienceSlideDeck` will register the rendered `Panel` elements. It will measure all panels within each experience root and set that root's minimum height to its fixed content height plus the tallest panel. Inactive panels remain mounted and invisible off the layout flow so they can be measured without being interactive.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Only change the shared experience-slide UI and its focused tests.
- Keep inactive slide contents inaccessible and non-interactive.
- Preserve unrelated Mochit worktree changes.

---

### Task 1: Reserve the tallest panel height for an experience deck

**Files:**
- Modify: `components/experiences/ui.tsx`
- Modify: `test/SqlExperience.test.tsx`

**Interfaces:**
- Consumes: `Panel` registrations from `ExperienceSlideDeck`.
- Produces: A fixed minimum height on each experience root with more than one registered panel.

- [x] **Step 1: Write the failing test**

```tsx
const secondPanel = screen
  .getByText("ミニSQL：選ぶと結果が変わる")
  .closest("section");

expect(secondPanel).not.toHaveClass("hidden");
expect(secondPanel).toHaveClass("absolute", "invisible");
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run test/SqlExperience.test.tsx`

Expected: FAIL because inactive panels use the `hidden` class and cannot be measured.

- [x] **Step 3: Write minimal implementation**

```tsx
// Inactive panels are absolutely positioned and invisible; the deck measures
// their heights and applies the maximum as the experience root's minHeight.
<section
  ref={panelRef}
  className={isActive ? "" : "pointer-events-none invisible absolute inset-x-0 top-0"}
  aria-hidden={!isActive}
  inert={!isActive}
>
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- --run test/SqlExperience.test.tsx test/EnterpriseActivitiesExperience.test.tsx test/TopicContent.test.tsx && npm run typecheck`

Expected: 3 focused test files pass and TypeScript reports no errors.

- [x] **Step 5: Run the lesson production build**

Run: `npx next build --turbo --debug-build-paths 'app/learn/**'`

Expected: The build completes and generates the learning routes.

- [x] **Step 6: Commit**

```bash
git add components/experiences/ui.tsx test/SqlExperience.test.tsx docs/superpowers/plans/2026-07-18-fixed-experience-slide-height.md
git commit -m "fix: keep experience slide heights stable"
```
