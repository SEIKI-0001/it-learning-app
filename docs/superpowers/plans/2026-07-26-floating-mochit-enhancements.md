# 常時表示モチット強化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 常時表示モチットを108pxへ拡大し、専用リアクション強度、優先度連動の吹き出し、主要画面へ移動できるクイックメニューを追加する。

**Architecture:** 既存の`useMochitController`をイベント受理の唯一の判断元に保ち、受理結果だけを`FloatingMochit`へ通知する。サイズ・viewport配置と吹き出し定義を純粋モジュールへ分離し、`Mochit`の描画プロファイルへ`floating`を追加する。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Vitest、Testing Library、Playwright、Rive、SVG/WAAPI

## Global Constraints

- 外側表示・ヒット領域は108px、内部モチット描画は84px。
- `floating`係数はmove 0.65、squash 0.75、rot 0.8、arm 0.7、gaze 0.9、antenna 1.0。
- 既存compact定数と常時表示版以外の挙動を変更しない。
- イベント優先度は既存`createMochitReactionController`だけが判断し、吹き出し専用キューを作らない。
- reduced-motionではtransform系の大きな動きと粒子を停止する。
- storage keyと保存データ形式を変更しない。
- 外側の粒子DOMを追加しない。
- コミット、push、PR作成を行わない。

---

### Task 1: 108pxサイズとviewport配置

**Files:**
- Create: `components/mochit/floatingMochitLayout.ts`
- Modify: `components/mochit/floatingMochitPreferences.ts`
- Modify: `components/mochit/FloatingMochit.tsx`
- Modify: `components/mochit/mochitTypes.ts`
- Modify: `components/mochit/Mochit.tsx`
- Test: `test/floatingMochitLayout.test.ts`
- Test: `test/floatingMochitPreferences.test.ts`
- Test: `test/FloatingMochit.test.tsx`

**Interfaces:**
- Produces: `FLOATING_MOCHIT_HIT_SIZE = 108`
- Produces: `FLOATING_MOCHIT_RENDER_SIZE = 84`
- Produces: `getFloatingMochitViewportMetrics(window): FloatingViewportMetrics`
- Produces: `clampFloatingMochitPoint(point, metrics): FloatingMochitPoint`
- Produces: `getDefaultFloatingMochitPoint(metrics): FloatingMochitPoint`
- Produces: `MochitSize` variant `"floating"` mapped to `h-[84px] w-[84px]`

- [ ] **Step 1: Write failing geometry tests**

Add tests asserting:

```ts
expect(FLOATING_MOCHIT_HIT_SIZE).toBe(108);
expect(FLOATING_MOCHIT_RENDER_SIZE).toBe(84);
expect(getDefaultFloatingMochitPoint({
  width: 390,
  height: 844,
  margin: 16,
  bottomClearance: 80,
})).toEqual({ x: 266, y: 16 });
expect(clampFloatingMochitPoint(
  { x: -20, y: 900 },
  { width: 390, height: 844, margin: 16, bottomClearance: 80 },
)).toEqual({ x: 16, y: 640 });
```

Update the preferences geometry tests from72px to108px and assert an old saved point at `{x:302,y:756}` is restored within the new bounds.

- [ ] **Step 2: Run the geometry tests and confirm RED**

Run:

```bash
npx vitest run test/floatingMochitLayout.test.ts test/floatingMochitPreferences.test.ts test/FloatingMochit.test.tsx
```

Expected: failures for missing layout module, old 72px coordinates, and missing84px renderer size.

- [ ] **Step 3: Implement layout constants and pure clamp helpers**

Create the layout module with:

```ts
export const FLOATING_MOCHIT_HIT_SIZE = 108;
export const FLOATING_MOCHIT_RENDER_SIZE = 84;
export const FLOATING_MOCHIT_VIEWPORT_MARGIN = 16;
export const FLOATING_MOCHIT_BOTTOM_NAV_HEIGHT = 64;

export type FloatingViewportMetrics = {
  width: number;
  height: number;
  margin: number;
  bottomClearance: number;
};
```

Clamp maximumY with:

```ts
Math.max(
  metrics.margin,
  metrics.height -
    FLOATING_MOCHIT_HIT_SIZE -
    metrics.margin -
    metrics.bottomClearance,
)
```

Use zero bottom clearance above the mobile breakpoint. At mobile widths, use64px plus the computed`env(safe-area-inset-bottom)` value exposed through a root CSS custom property. Prefer`window.visualViewport?.width/height` over`innerWidth/innerHeight`.

- [ ] **Step 4: Wire the new size through FloatingMochit and Mochit**

Add`"floating"` to`MochitSize`, map it to84px, keep its default reaction profile separate from size-based compact derivation, and render the outer fixed root as108px.

Replace every direct72px and viewport calculation in`FloatingMochit` with the shared metrics helpers. Continue to save the clamped top-left point in the existing preferences shape.

- [ ] **Step 5: Run tests and confirm GREEN**

Run the Task1 test command again and require zero failures.

### Task 2: floatingリアクションプロファイル

**Files:**
- Modify: `components/mochit/mochitReactionAnimation.ts`
- Modify: `components/mochit/MochitSvg.tsx`
- Modify: `components/mochit/MochitRive.tsx`
- Modify: `components/mochit/mochitTypes.ts`
- Modify: `components/mochit/Mochit.tsx`
- Test: `test/mochitReactionAnimation.test.ts`
- Test: `test/mochitRiveContract.test.ts`
- Test: `test/Mochit.test.tsx`

**Interfaces:**
- Produces: `MochitReactionProfile = "full" | "compact" | "floating"`
- Produces: `reactionProfile?: MochitReactionProfile` prop on`Mochit`
- Changes: `ReactionMode` to `{ profile: MochitReactionProfile; reducedMotion: boolean }`
- Produces: Rive energy0.85 for`floating`

- [ ] **Step 1: Write failing profile tests**

Add a`FLOATING` mode and assert:

```ts
const FLOATING = { profile: "floating", reducedMotion: false } as const;
const floatingCorrect = buildReactionSpec("correct", FLOATING)!;
```

Compare representative body, arm, gaze, and antenna transform values against full and compact so floating is strictly stronger than compact and no stronger than full. Assert the exact correct-event translateY peak equals the full peak multiplied by0.65.

Add a Rive input test asserting`buildMochitRiveInputValues` returns`energy:0.85` and does not treat floating as compact. Add a Mochit renderer-stub test asserting`reactionProfile="floating"` reaches the renderer.

- [ ] **Step 2: Run profile tests and confirm RED**

Run:

```bash
npx vitest run test/mochitReactionAnimation.test.ts test/mochitRiveContract.test.ts test/Mochit.test.tsx
```

Expected: missing profile type/prop and old compact boolean API failures.

- [ ] **Step 3: Implement explicit profile resolution**

Export:

```ts
export type MochitReactionProfile = "full" | "compact" | "floating";
```

Use these immutable scales:

```ts
const FULL_SCALE = { move: 1, squash: 1, rot: 1, arm: 1, gaze: 1, antenna: 1 };
const COMPACT_SCALE = { move: 0.3, squash: 0.4, rot: 0.5, arm: 0.35, gaze: 0.7, antenna: 0.8 };
const FLOATING_SCALE = { move: 0.65, squash: 0.75, rot: 0.8, arm: 0.7, gaze: 0.9, antenna: 1 };
```

Preserve existing choreography and reduced recipes. Select only the scale by profile.

- [ ] **Step 4: Propagate profile without changing other instances**

Resolve profile in`Mochit` without changing the legacy compact override:

```ts
const effectiveCompact = compact ?? (size === "small" || size === "xs");
const effectiveReactionProfile =
  reactionProfile ?? (effectiveCompact ? "compact" : "full");
```

Pass profile into SVG. For Rive, derive compact only when profile is`compact`; pass energy0.85 for`floating`, retain0.4/0.7 defaults for compact/full, and retain reduced-motion inputs.

Set`reactionProfile="floating"` only in`FloatingMochit`.

- [ ] **Step 5: Run tests and confirm GREEN**

Run the Task2 test command and require zero failures.

### Task 3: 優先度連動のリアクション吹き出し

**Files:**
- Create: `components/mochit/floatingMochitMessages.ts`
- Create: `components/mochit/FloatingMochitBubble.tsx`
- Modify: `components/mochit/Mochit.tsx`
- Modify: `components/mochit/FloatingMochit.tsx`
- Modify: `components/mochit/useMochitController.ts`
- Test: `test/floatingMochitMessages.test.ts`
- Test: `test/Mochit.test.tsx`
- Test: `test/FloatingMochit.test.tsx`

**Interfaces:**
- Produces: `FloatingMochitMessage = { text: string; durationMs: number }`
- Produces: `getFloatingMochitMessage(event, previousText, random?): FloatingMochitMessage | null`
- Produces: `onEventAccepted?: (signal: MochitEventSignal) => void` on`Mochit`
- Produces: bubble test id`floating-mochit-bubble`

- [ ] **Step 1: Write failing message-definition tests**

Assert exact durations1400/1800/2200/2800, null for tap/wakeUp, all required Japanese copy, and immediate-repeat avoidance with an injected deterministic random value.

- [ ] **Step 2: Write failing acceptance and bubble tests**

Add a Mochit test that sends checkpoint then tap and expects`onEventAccepted` only for checkpoint. Add FloatingMochit fake-timer tests for:

- correct displays one positive correct message;
- incorrect displays only a non-negative defined message;
- checkpoint replaces an active encourage bubble;
- tap does not replace an active checkpoint bubble;
- bubble disappears after its duration;
- crossing the drag threshold closes it;
- reduced motion still displays it;
- bubble has no`aria-live`.

- [ ] **Step 3: Run message/bubble tests and confirm RED**

Run:

```bash
npx vitest run test/floatingMochitMessages.test.ts test/Mochit.test.tsx test/FloatingMochit.test.tsx
```

- [ ] **Step 4: Implement acceptance callback and message definitions**

Keep`dispatch(event): boolean` unchanged. In the Mochit event effect:

```ts
if (dispatch(event.type)) onEventAccepted?.(event);
```

Store the latest callback in a ref so callback identity does not cause the same signal to replay.

Implement message selection without a queue. For multiple candidates, filter out`previousText` when another candidate exists, then select with`Math.floor(random() * candidates.length)`.

- [ ] **Step 5: Implement bubble lifecycle**

In`FloatingMochit`, create bubble state only from`onEventAccepted`. Clear and replace one timeout per accepted message. Close the menu before showing a learning-event bubble. Clear bubble on drag start, menu open, hide, and unmount.

Render`FloatingMochitBubble` as a non-live, pointer-events-none fixed overlay with220px maximum width.

- [ ] **Step 6: Run tests and confirm GREEN**

Run the Task3 test command and require zero failures.

### Task 4: クイックメニューと画面端オーバーレイ配置

**Files:**
- Create: `components/mochit/FloatingMochitMenu.tsx`
- Modify: `components/mochit/floatingMochitLayout.ts`
- Modify: `components/mochit/FloatingMochit.tsx`
- Modify: `app/globals.css`
- Test: `test/floatingMochitLayout.test.ts`
- Test: `test/FloatingMochit.test.tsx`

**Interfaces:**
- Produces: `getFloatingOverlayPosition(anchor, overlaySize, viewport): FloatingOverlayPosition`
- Produces: placement values`"top" | "right" | "bottom" | "left"`
- Produces: menu aria-label`モチットクイックメニュー`
- Produces: links `/today`, `/review`, `/plan`, `/progress`, `/avatar`

- [ ] **Step 1: Write failing overlay tests**

For anchors near all four edges, assert the returned fixed left/top keeps a220x100 bubble and288px-wide menu within16px viewport margins. Assert the selected placement points toward available space and accounts for the mobile bottom clearance.

- [ ] **Step 2: Write failing menu interaction tests**

Replace old Hide-only assertions with:

- tap opens menu and fires`tap`;
- a drag does not open menu;
- Enter and Space each open it;
- long press, contextmenu, ContextMenu key, Shift+F10 open the same menu;
- Escape and outside pointerdown close it;
- link click closes it;
- menu opening closes a bubble;
- five link labels have exact hrefs;
- non-display action persists`visible:false` and current position.

- [ ] **Step 3: Run layout/menu tests and confirm RED**

Run:

```bash
npx vitest run test/floatingMochitLayout.test.ts test/FloatingMochit.test.tsx
```

- [ ] **Step 4: Implement measured fixed overlay positioning**

Use one pure placement function shared by menu and bubble. Prefer vertical placement when it fits, otherwise horizontal, then clamp final coordinates. Measure overlay dimensions after mount with`getBoundingClientRect`; refresh after resize and content changes.

Keep overlays fixed so nested transforms do not distort their coordinates. Add placement data attributes for arrow styling.

- [ ] **Step 5: Implement menu semantics and gestures**

Use Next.js`Link` with`role="menuitem"` for navigation items and a button for non-display. Render primary actions as a2-column grid, then divider and secondary actions.

For a non-drag pointerup:

```ts
setReactionSignal(createMochitEventSignal("tap"));
openMenu();
```

Use the same action for Enter/Space. Preserve existing drag threshold, pointer capture, long press, right click, Escape focus restoration, storage, and outside dismissal.

- [ ] **Step 6: Add focused CSS**

Add bubble/menu entrance and arrow styles. Under`prefers-reduced-motion`, disable their transform animation while keeping them visible. Keep root z-index above BottomNav and below full-screen Celebration.

- [ ] **Step 7: Run tests and confirm GREEN**

Run the Task4 test command and require zero failures.

### Task 5: E2E座標更新と全体検証

**Files:**
- Modify: `e2e/floating-mochit.spec.ts`
- Modify when required by verified regression only: related Mochit tests

**Interfaces:**
- Verifies:108px hit box, viewport clamp, menu routes, drag persistence, reduced motion, mobile bottom clearance

- [ ] **Step 1: Write/update E2E assertions**

Update hidden-menu text to「モチットを非表示」. Add:

```ts
expect(Math.round(box!.width)).toBe(108);
expect(Math.round(box!.height)).toBe(108);
```

Assert all quick-menu hrefs, tap opens, drag does not open, right-click/long-press/keyboard open, Escape/outside close, and the mobile bounding box bottom is above the reserved BottomNav area.

- [ ] **Step 2: Run focused E2E and fix only observed failures**

Run:

```bash
npx playwright test e2e/floating-mochit.spec.ts
```

- [ ] **Step 3: Run related unit tests**

Run:

```bash
npx vitest run test/FloatingMochit.test.tsx test/floatingMochitLayout.test.ts test/floatingMochitMessages.test.ts test/floatingMochitPreferences.test.ts test/Mochit.test.tsx test/mochitReactionAnimation.test.ts test/mochitRiveContract.test.ts test/mochitEventBus.test.ts test/mochitEvents.test.ts
```

- [ ] **Step 4: Run complete verification**

Run fresh, in order:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Record exact pass/fail counts and any environment-only blocker. Do not claim completion for a command that did not exit0.

- [ ] **Step 5: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Confirm there are no unrelated refactors, commits, staged files, pushes, or PRs.
