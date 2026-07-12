# Roadmap Map Asset Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-drawn roadmap map with an accessible, mobile-first hybrid map using the supplied artwork while preserving checkpoint-driven progress behavior.

**Architecture:** `RoadmapMap.tsx` keeps its existing public props and owns only selection/reveal state. A `roadmap-map` directory separates immutable configuration, background imagery, route SVG, HTML node controls, fog, and detail sheet. The background artwork and fog are converted to alpha WebP offline with the existing `sharp` development dependency; the map remains usable if an image fails to load.

**Tech Stack:** Next.js 16.2.9, React 19, TypeScript, Tailwind CSS 4, `next/image`, Vitest, Testing Library, Playwright, Sharp 0.34.5.

## Global Constraints

- Keep `buildCheckpointRoadmap`, `expectedPhaseId`, `done / current / upcoming / goal`, and all plan/checkpoint domain logic unchanged.
- Do not add production dependencies, Canvas, or an animation library.
- Keep `components/RoadmapMap.tsx` as the compatible default-export entry point.
- Use `next/image` with explicit `sizes`; the map background is prioritized and detail artwork is lazy.
- Retain keyboard controls, aria-labels, 44px-or-larger tap targets, fog clearing, road drawing, and reduced-motion behavior.
- Never merge by overwriting `main`; verify `main` has no uncommitted tracked changes and integrate only by a non-destructive fast-forward or a reviewed merge commit.

---

### Task 1: Process and install supplied visual assets

**Files:**
- Create: `scripts/process-roadmap-map-assets.mjs`
- Create: `public/maps/roadmap/base-map.webp`
- Create: `public/maps/roadmap/effects/fog.webp`
- Create: `public/maps/roadmap/landmarks/{village,hill,forest,plains,swamp,canyon,gate,castle}.webp`

**Interfaces:**
- Consumes: `/Users/seikikobayashi/Downloads/ChatGPT Image 2026年7月12日 23_58_13.png`, `/Users/seikikobayashi/Downloads/ChatGPT Image 2026年7月12日 23_58_23.png`, and the supplied landmark ZIP.
- Produces: stable public URLs under `/maps/roadmap/**` used by `mapConfig.ts` and `MapBackground.tsx`.

- [x] **Step 1: Write the asset processor with an outer-background alpha algorithm**

```js
// scripts/process-roadmap-map-assets.mjs
// Decode to RGBA with sharp, flood-fill only low-saturation/high-value pixels
// connected to an image edge, set their alpha to zero, then write lossless-ish
// WebP. This preserves white wave foam and cloud highlights enclosed by artwork.
const isOuterBackground = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 238 && max - min < 14;
};
```

- [x] **Step 2: Run the processor and copy the eight runtime WebP landmark files**

Run: `node scripts/process-roadmap-map-assets.mjs`

Expected: `base-map.webp` and `fog.webp` have alpha channels; all eight named landmark files exist under `public/maps/roadmap/landmarks/`.

- [x] **Step 3: Verify output dimensions and alpha channels**

Run: `sips -g pixelWidth -g pixelHeight -g format -g hasAlpha public/maps/roadmap/base-map.webp public/maps/roadmap/effects/fog.webp public/maps/roadmap/landmarks/*.webp`

Expected: the background preserves a vertical ratio close to 1100:1429, fog and landmarks are WebP with alpha, and every landmark remains 512x512.

- [x] **Step 4: Commit the independently verifiable asset pipeline and output**

```bash
git add scripts/process-roadmap-map-assets.mjs public/maps/roadmap
git commit -m "feat: add roadmap map artwork"
```

### Task 2: Add the map configuration as the single source of stage metadata

**Files:**
- Create: `components/roadmap-map/mapConfig.ts`
- Create: `test/roadmapMapConfig.test.ts`

**Interfaces:**
- Consumes: `StudyPhaseId` from `@/types/plan` and the public asset URLs from Task 1.
- Produces: `MAP_VIEWBOX`, `ROADMAP_STAGES`, `ROADMAP_GOAL`, `MapStageConfig`, and `MapNodeConfig`.

- [x] **Step 1: Write the failing configuration test**

```ts
import { describe, expect, it } from "vitest";
import { ROADMAP_GOAL, ROADMAP_STAGES } from "@/components/roadmap-map/mapConfig";

it("maps every phase and the goal to its configured artwork and coordinates", () => {
  expect(ROADMAP_STAGES).toHaveLength(7);
  expect(ROADMAP_STAGES.map((stage) => [stage.id, stage.place, stage.landmarkSrc, stage.x, stage.y])).toEqual([
    ["phase0", "旅立ちの村", "/maps/roadmap/landmarks/village.webp", 24, 107],
    ["phase1", "見晴らしの丘", "/maps/roadmap/landmarks/hill.webp", 62, 99],
    ["phase2", "賢者の森", "/maps/roadmap/landmarks/forest.webp", 28, 85],
    ["phase3", "修練の平原", "/maps/roadmap/landmarks/plains.webp", 69, 72],
    ["phase4", "霧の沼", "/maps/roadmap/landmarks/swamp.webp", 29, 59],
    ["phase5", "試練の峡谷", "/maps/roadmap/landmarks/canyon.webp", 68, 45],
    ["phase6", "最後の関所", "/maps/roadmap/landmarks/gate.webp", 35, 31],
  ]);
  expect(ROADMAP_GOAL).toMatchObject({ place: "合格の城", landmarkSrc: "/maps/roadmap/landmarks/castle.webp", x: 57, y: 22 });
});
```

- [x] **Step 2: Run the focused test and observe the missing-module failure**

Run: `npm test -- test/roadmapMapConfig.test.ts`

Expected: FAIL because `mapConfig` does not exist.

- [x] **Step 3: Implement the typed configuration**

```ts
export const MAP_VIEWBOX = { width: 100, height: 130 } as const;
export const ROADMAP_STAGES: readonly MapStageConfig[] = [
  { id: "phase0", place: "旅立ちの村", landmarkSrc: "/maps/roadmap/landmarks/village.webp", x: 24, y: 107, labelOffset: "left" },
  { id: "phase1", place: "見晴らしの丘", landmarkSrc: "/maps/roadmap/landmarks/hill.webp", x: 62, y: 99, labelOffset: "right" },
  { id: "phase2", place: "賢者の森", landmarkSrc: "/maps/roadmap/landmarks/forest.webp", x: 28, y: 85, labelOffset: "left" },
  { id: "phase3", place: "修練の平原", landmarkSrc: "/maps/roadmap/landmarks/plains.webp", x: 69, y: 72, labelOffset: "right" },
  { id: "phase4", place: "霧の沼", landmarkSrc: "/maps/roadmap/landmarks/swamp.webp", x: 29, y: 59, labelOffset: "left" },
  { id: "phase5", place: "試練の峡谷", landmarkSrc: "/maps/roadmap/landmarks/canyon.webp", x: 68, y: 45, labelOffset: "right" },
  { id: "phase6", place: "最後の関所", landmarkSrc: "/maps/roadmap/landmarks/gate.webp", x: 35, y: 31, labelOffset: "left" },
] as const;
export const ROADMAP_GOAL: MapGoalConfig = { id: "goal", place: "合格の城", landmarkSrc: "/maps/roadmap/landmarks/castle.webp", x: 57, y: 22, labelOffset: "right" };
```

- [x] **Step 4: Re-run the focused test**

Run: `npm test -- test/roadmapMapConfig.test.ts`

Expected: PASS.

- [x] **Step 5: Commit the config and its regression test**

```bash
git add components/roadmap-map/mapConfig.ts test/roadmapMapConfig.test.ts
git commit -m "feat: centralize roadmap map configuration"
```

### Task 3: Build the separable visual map layers and accessible detail sheet

**Files:**
- Create: `components/roadmap-map/MapBackground.tsx`
- Create: `components/roadmap-map/MapRoute.tsx`
- Create: `components/roadmap-map/MapNodes.tsx`
- Create: `components/roadmap-map/MapFog.tsx`
- Create: `components/roadmap-map/MapDetailSheet.tsx`
- Modify: `components/RoadmapMap.tsx`
- Create: `test/RoadmapMap.test.tsx`

**Interfaces:**
- Consumes: `PhaseProgress[]`, optional `StudyPhaseId`, and config from Task 2.
- Produces: the existing `RoadmapMap({ phases, expectedPhaseId })` API, HTML node buttons, and a modal detail sheet.

- [x] **Step 1: Write failing interaction and status tests**

```tsx
// @vitest-environment jsdom
it("keeps status, expected position, and current progress visible", () => {
  render(<RoadmapMap phases={phases} expectedPhaseId="phase2" />);
  expect(screen.getByLabelText("旅立ちの村・初回設定・診断（クリア済み）")).toBeVisible();
  expect(screen.getByText("いまここ")).toBeVisible();
  expect(screen.getByText("📍 予定ではこのあたり")).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "現在ステージの達成度" })).toHaveAttribute("aria-valuenow", "45");
});

it("opens the matching sheet without depending on a loaded image", async () => {
  const user = userEvent.setup();
  render(<RoadmapMap phases={phases} />);
  await user.click(screen.getByLabelText("賢者の森・テーマ別に理解する（これから）"));
  expect(screen.getByRole("dialog", { name: "賢者の森の詳細" })).toBeVisible();
  expect(screen.getByText("ステージ3")).toBeVisible();
});
```

- [x] **Step 2: Run the focused test and observe the expected failures**

Run: `npm test -- test/RoadmapMap.test.tsx`

Expected: FAIL because the new progressbar semantics and dialog are not implemented.

- [x] **Step 3: Implement each layer with the defined responsibilities**

```tsx
// MapBackground.tsx
<Image src="/maps/roadmap/base-map.webp" alt="" fill priority sizes="(max-width: 767px) calc(100vw - 2rem), 512px" className="object-contain" />

// MapNodes.tsx: each node is a native button with min-h-11 min-w-11,
// status colors, stage/check indicators, current and expected labels, and
// <div role="progressbar" aria-label="現在ステージの達成度" ... />.

// MapFog.tsx and MapRoute.tsx emit roadmap-fog-clearing and
// roadmap-path-draw so the reduced-motion behavior has dedicated selectors.

// MapDetailSheet.tsx
<div role="dialog" aria-modal="true" aria-label={`${node.place}の詳細`}>
  <Image src={node.landmarkSrc} alt="" width={512} height={512} sizes="(max-width: 767px) 50vw, 256px" />
  {/* existing formal title, summary, detail, checkpoints, completion goal, and progress */}
</div>
```

- [x] **Step 4: Preserve rendering compatibility in the entry point**

```tsx
export default function RoadmapMap({ phases, expectedPhaseId = null }: {
  phases: PhaseProgress[];
  expectedPhaseId?: StudyPhaseId | null;
}) {
  // Retain localStorage-based reveal tracking, build nodes from STUDY_PHASES,
  // and pass visual state into the layer components. Do not change callers.
}
```

- [x] **Step 5: Re-run the interaction tests**

Run: `npm test -- test/RoadmapMap.test.tsx`

Expected: PASS, including image-error-tolerant detail interaction.

- [x] **Step 6: Commit the layer split and component coverage**

```bash
git add components/RoadmapMap.tsx components/roadmap-map test/RoadmapMap.test.tsx
git commit -m "feat: refresh roadmap map interface"
```

### Task 4: Preserve motion preferences and perform responsive visual verification

**Files:**
- Modify: `app/globals.css`
- Create: `test/roadmapMapMotion.test.ts`

`playwright.config.ts` already starts `npm run dev` and targets port 3000, so it is not modified.

**Interfaces:**
- Consumes: `.roadmap-fog-clearing` and `.roadmap-path-draw` classes rendered by Task 3.
- Produces: animation-free end states for `prefers-reduced-motion: reduce` and reproducible browser screenshots.

- [ ] **Step 1: Write a failing reduced-motion CSS contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

it("stops roadmap fog and route animations for reduced motion", () => {
  const css = readFileSync("app/globals.css", "utf8");
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.roadmap-fog-clearing[\s\S]*animation: none/);
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.roadmap-path-draw[\s\S]*animation: none/);
});
```

- [ ] **Step 2: Run the CSS contract test**

Run: `npm test -- test/roadmapMapMotion.test.ts`

Expected: FAIL because the dedicated roadmap selectors do not exist yet.

- [ ] **Step 3: Add or adjust only roadmap-specific CSS animation rules**

```css
@media (prefers-reduced-motion: reduce) {
  .roadmap-fog-clearing { animation: none; opacity: 0; }
  .roadmap-path-draw { animation: none; stroke-dashoffset: 0; }
}
```

- [ ] **Step 4: Re-run the motion test**

Run: `npm test -- test/roadmapMapMotion.test.ts`

Expected: PASS.

- [ ] **Step 5: Capture mobile, desktop, and reduced-motion screenshots**

Run: `npm run dev`

Verify through the browser at `/plan` using seeded/available progress state:

```text
390px width: labels do not overlap, nodes stay fully visible, 44px targets work.
Desktop width: map is capped instead of stretched; image aspect ratio remains vertical.
Reduced motion: fog clearing and road drawing do not animate.
```

- [ ] **Step 6: Commit motion styling and browser test support**

```bash
git add app/globals.css test/roadmapMapMotion.test.ts
git commit -m "test: verify roadmap motion and responsive layout"
```

### Task 5: Run complete verification and safely integrate with main

**Files:**
- Modify: no production files expected beyond fixes discovered by validation.

**Interfaces:**
- Consumes: the complete feature branch and current `main`.
- Produces: verified feature commits integrated without deleting current `main` content.

- [ ] **Step 1: Run the required verification suite**

Run:

```bash
npm test -- test/roadmapMapConfig.test.ts test/RoadmapMap.test.tsx test/roadmapMapMotion.test.ts
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: every command exits 0; report any pre-existing warning separately.

- [ ] **Step 2: Review the branch diff against its base**

Run: `git diff --check main...HEAD && git diff --stat main...HEAD && git diff --name-status main...HEAD && git log --oneline main..HEAD`

Expected: only the roadmap components, assets, styles, tests, processor, and the approved docs are present; no `D` (deleted path) entry exists.

- [ ] **Step 3: Request and address code review before integration**

Review against the requirements: no domain logic changes, correct config mapping, accessibility, image-failure tolerance, reduced motion, and mobile layout.

- [ ] **Step 4: Re-check the current main checkout before integration**

Run in the main checkout: `git status --short && git log -1 --oneline main && git merge-base --is-ancestor main codex/roadmap-map-assets && git diff --name-status main...codex/roadmap-map-assets`

Expected: no tracked local edits on `main`, `main` is an ancestor of the feature branch, the pending diff has no `D` (deleted path) entry, and unrelated untracked user files remain untouched.

- [ ] **Step 5: Integrate non-destructively**

Run in the main checkout: `git merge --ff-only codex/roadmap-map-assets`

Expected: Git fast-forwards `main` with no deleted path; `RoadmapMap.tsx` is modified in place and no existing repository path is removed.

- [ ] **Step 6: Confirm main contains all changes after integration**

Run in the main checkout: `git status --short && git diff --check main@{1}..HEAD && git diff --name-status main@{1}..HEAD && git log --oneline -8`

Expected: the working tree preserves unrelated untracked user files, the integration range has no `D` (deleted path) entry, and `main` points at the integrated roadmap commits.
