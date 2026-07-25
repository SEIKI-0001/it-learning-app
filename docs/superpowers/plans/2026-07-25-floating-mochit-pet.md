# Floating Mochit Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a device-specific floating Mochit pet to every route that squishes, rebounds, drags, hides through right-click or long-press, and can be restored from the existing Mochit page.

**Architecture:** Mount one client-side `FloatingMochit` from the root layout and keep its fixed-position transform separate from its inner mochi deformation. Put versioned preference parsing, viewport clamping, storage, and same-window change notification in a focused module shared by the pet and the restore control.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS/global CSS animations, Pointer Events, Web Storage, Vitest, React Testing Library

## Global Constraints

- The pet renders on every route, including public, login, onboarding, and signed-in pages.
- The default position is upper-right with a 16-pixel margin and viewport clamping.
- Visibility and position are device-specific and must not use an account or database.
- Keep every existing page-specific Mochit presentation unchanged.
- Use the existing `Mochit` renderer; do not add a character-rendering dependency.
- Right-click and touch long-press expose only one contextual action: `Hide`.
- The More and Progress entry points continue to lead to `/avatar`; restoration lives on `/avatar`.
- Reduced motion keeps dragging and controls functional while removing decorative deformation and rebound.
- Do not add a drag-and-drop or physics package.
- Preserve unrelated worktree changes and stage only task-owned files.

---

### Task 1: Device-Specific Preferences and Viewport Geometry

**Files:**
- Create: `components/mochit/floatingMochitPreferences.ts`
- Create: `test/floatingMochitPreferences.test.ts`

**Interfaces:**
- Produces:
  - `type FloatingMochitPoint = { x: number; y: number }`
  - `type FloatingMochitPreferences = { visible: boolean; position: FloatingMochitPoint | null }`
  - `FLOATING_MOCHIT_STORAGE_KEY`
  - `getDefaultFloatingMochitPosition(viewportWidth, viewportHeight, petWidth, petHeight, margin?)`
  - `clampFloatingMochitPosition(point, viewportWidth, viewportHeight, petWidth, petHeight, margin?)`
  - `parseFloatingMochitPreferences(raw)`
  - `loadFloatingMochitPreferences()`
  - `saveFloatingMochitPreferences(preferences)`
  - `setFloatingMochitVisibility(visible)`
  - `subscribeToFloatingMochitPreferences(listener)`

- [ ] **Step 1: Write failing geometry and parsing tests**

```ts
import {
  clampFloatingMochitPosition,
  getDefaultFloatingMochitPosition,
  parseFloatingMochitPreferences,
} from "@/components/mochit/floatingMochitPreferences";

it("places the default pet at the upper-right margin", () => {
  expect(getDefaultFloatingMochitPosition(390, 844, 72, 72)).toEqual({ x: 302, y: 16 });
});

it("clamps the complete hit area inside the viewport", () => {
  expect(clampFloatingMochitPosition({ x: -20, y: 900 }, 390, 844, 72, 72)).toEqual({
    x: 16,
    y: 756,
  });
});

it("rejects malformed or non-finite saved preferences", () => {
  expect(parseFloatingMochitPreferences("{broken")).toEqual({ visible: true, position: null });
  expect(parseFloatingMochitPreferences('{"visible":false,"position":{"x":"no","y":2}}')).toEqual({
    visible: false,
    position: null,
  });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- test/floatingMochitPreferences.test.ts`

Expected: FAIL because `floatingMochitPreferences.ts` does not exist.

- [ ] **Step 3: Implement the pure geometry and parser**

```ts
export const FLOATING_MOCHIT_STORAGE_KEY = "fequest:floatingMochit:v1";
export const FLOATING_MOCHIT_CHANGE_EVENT = "fequest:floating-mochit-change";
export const DEFAULT_FLOATING_MOCHIT_PREFERENCES = {
  visible: true,
  position: null,
} satisfies FloatingMochitPreferences;

export function getDefaultFloatingMochitPosition(
  viewportWidth: number,
  viewportHeight: number,
  petWidth: number,
  petHeight: number,
  margin = 16,
): FloatingMochitPoint {
  return clampFloatingMochitPosition(
    { x: viewportWidth - petWidth - margin, y: margin },
    viewportWidth,
    viewportHeight,
    petWidth,
    petHeight,
    margin,
  );
}

export function clampFloatingMochitPosition(
  point: FloatingMochitPoint,
  viewportWidth: number,
  viewportHeight: number,
  petWidth: number,
  petHeight: number,
  margin = 16,
): FloatingMochitPoint {
  return {
    x: Math.min(Math.max(point.x, margin), Math.max(margin, viewportWidth - petWidth - margin)),
    y: Math.min(Math.max(point.y, margin), Math.max(margin, viewportHeight - petHeight - margin)),
  };
}
```

The parser returns `{ visible: true, position: null }` for missing JSON, non-object JSON, or invalid visibility. It preserves a valid boolean visibility while dropping an invalid position to `null`.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- test/floatingMochitPreferences.test.ts`

Expected: PASS for upper-right placement, clamping, and malformed input.

- [ ] **Step 5: Write failing storage and notification tests**

```ts
it("persists preferences and notifies same-window subscribers", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeToFloatingMochitPreferences(listener);

  saveFloatingMochitPreferences({ visible: false, position: { x: 120, y: 80 } });

  expect(JSON.parse(localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY)!)).toEqual({
    visible: false,
    position: { x: 120, y: 80 },
  });
  expect(listener).toHaveBeenCalledWith({ visible: false, position: { x: 120, y: 80 } });
  unsubscribe();
});

it("still notifies the current page when localStorage throws", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new DOMException("blocked");
  });
  const listener = vi.fn();
  const unsubscribe = subscribeToFloatingMochitPreferences(listener);

  saveFloatingMochitPreferences({ visible: false, position: null });

  expect(listener).toHaveBeenCalledWith({ visible: false, position: null });
  unsubscribe();
});
```

- [ ] **Step 6: Run the focused tests and verify RED**

Run: `npm test -- test/floatingMochitPreferences.test.ts`

Expected: FAIL because storage functions and same-window notification are not implemented.

- [ ] **Step 7: Implement guarded storage and subscriptions**

`saveFloatingMochitPreferences` must attempt `localStorage.setItem` inside `try/catch`, then dispatch a typed `CustomEvent` even when storage throws. `subscribeToFloatingMochitPreferences` must listen to both that custom event and the browser `storage` event, returning a cleanup function. `setFloatingMochitVisibility` must preserve the last valid saved position.

- [ ] **Step 8: Run the focused tests and verify GREEN**

Run: `npm test -- test/floatingMochitPreferences.test.ts`

Expected: PASS with no warnings.

- [ ] **Step 9: Commit the preference unit**

```bash
git add components/mochit/floatingMochitPreferences.ts test/floatingMochitPreferences.test.ts
git commit -m "feat: add floating Mochit preferences"
```

---

### Task 2: Floating Pet Gestures, Menu, and Mochi Physics

**Files:**
- Create: `components/mochit/FloatingMochit.tsx`
- Create: `test/FloatingMochit.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes all preference and geometry functions from Task 1.
- Produces `FloatingMochit({ reducedMotion?: boolean })`.
- Uses existing `Mochit` props: `size="xs"`, `animation="idle"`, `reducedMotion`, and semantic `event={{ type: "tap", id }}`.

- [ ] **Step 1: Write failing render, tap, and reduced-motion tests**

Mock the child renderer so tests observe the semantic tap event without loading SVG/Rive:

```tsx
vi.mock("@/components/mochit/Mochit", () => ({
  default: ({ event, reducedMotion }: { event?: { type: string; id: number } | null; reducedMotion?: boolean }) => (
    <div data-testid="mochit-renderer" data-event={event?.type ?? ""} data-reduced={String(reducedMotion)} />
  ),
}));

it("renders at the saved upper-right position and compresses on press", async () => {
  render(<FloatingMochit reducedMotion={false} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });
  expect(pet.parentElement).toHaveStyle({ left: "302px", top: "16px" });

  fireEvent.pointerDown(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });
  expect(pet).toHaveAttribute("data-motion", "pressed");
});

it("rebounds and dispatches a semantic tap on pointer release", async () => {
  render(<FloatingMochit reducedMotion={false} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });

  fireEvent.pointerDown(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });
  fireEvent.pointerUp(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });

  expect(pet).toHaveAttribute("data-motion", "settling");
  expect(screen.getByTestId("mochit-renderer")).toHaveAttribute("data-event", "tap");
});

it("keeps reduced-motion interaction static", async () => {
  render(<FloatingMochit reducedMotion />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });
  fireEvent.pointerDown(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });
  fireEvent.pointerUp(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });
  expect(pet).toHaveAttribute("data-motion", "idle");
  expect(screen.getByTestId("mochit-renderer")).toHaveAttribute("data-reduced", "true");
});
```

Set `window.innerWidth = 390` and `window.innerHeight = 844` in test setup for this file.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- test/FloatingMochit.test.tsx`

Expected: FAIL because `FloatingMochit` does not exist.

- [ ] **Step 3: Implement hydrated rendering and tap state**

Implement these state values:

```ts
type MotionState = "idle" | "pressed" | "dragging" | "settling";
const PET_HIT_SIZE = 72;
const DRAG_THRESHOLD_PX = 6;
const LONG_PRESS_MS = 550;
```

Do not render until the first client effect loads preferences, preventing a hidden pet from flashing during hydration. Render a fixed outer positioner and an inner `button` with `touch-action: none`, `aria-label="モチットを触る"`, and `data-motion`.

- [ ] **Step 4: Add minimal mochi CSS**

```css
.floating-mochit-body {
  transform-origin: 50% 72%;
  will-change: transform;
}

.floating-mochit-body[data-motion="pressed"] {
  transform: translateY(4px) scaleX(1.12) scaleY(.86);
}

.floating-mochit-body[data-motion="dragging"] {
  transform: rotate(var(--mochit-drag-rotate, 0deg)) scaleX(1.06) scaleY(.92);
}

.floating-mochit-body[data-motion="settling"] {
  animation: floating-mochit-settle 520ms cubic-bezier(.22, .8, .3, 1);
}
```

Add a damped `floating-mochit-settle` keyframe and disable these transforms/animations inside the existing `prefers-reduced-motion: reduce` block.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- test/FloatingMochit.test.tsx`

Expected: PASS for render, tap, and reduced motion.

- [ ] **Step 6: Write failing drag tests**

```tsx
it("drags, clamps, saves, and does not dispatch tap", async () => {
  render(<FloatingMochit reducedMotion={false} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });

  fireEvent.pointerDown(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });
  fireEvent.pointerMove(pet, { pointerId: 1, clientX: -100, clientY: 900 });
  expect(pet).toHaveAttribute("data-motion", "dragging");
  fireEvent.pointerUp(pet, { pointerId: 1, clientX: -100, clientY: 900 });

  expect(JSON.parse(localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY)!)).toEqual({
    visible: true,
    position: { x: 16, y: 756 },
  });
  expect(screen.getByTestId("mochit-renderer")).toHaveAttribute("data-event", "");
});
```

- [ ] **Step 7: Run the drag test and verify RED**

Run: `npm test -- test/FloatingMochit.test.tsx -t "drags"`

Expected: FAIL because pointer capture, drag threshold, clamping, and saving are absent.

- [ ] **Step 8: Implement drag state**

Track the active pointer ID, press point, origin position, and whether the threshold was crossed in refs. Capture the pointer on primary-button down. Once distance exceeds 6 pixels, cancel long-press, set `data-motion="dragging"`, clamp live coordinates, and derive a rotation custom property limited to `-6deg...6deg`. On pointer up, save the clamped position, release capture safely, and settle unless reduced motion is active.

- [ ] **Step 9: Run focused tests and verify GREEN**

Run: `npm test -- test/FloatingMochit.test.tsx`

Expected: PASS for tap-versus-drag behavior and saved clamped position.

- [ ] **Step 10: Write failing context-menu and keyboard tests**

```tsx
it("opens Hide on right-click and hides only the floating pet", async () => {
  render(<FloatingMochit reducedMotion={false} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });
  fireEvent.contextMenu(pet);
  fireEvent.click(screen.getByRole("menuitem", { name: "Hide" }));
  expect(screen.queryByRole("button", { name: "モチットを触る" })).not.toBeInTheDocument();
  expect(loadFloatingMochitPreferences().visible).toBe(false);
});

it("opens the same menu after a stationary long press", async () => {
  vi.useFakeTimers();
  render(<FloatingMochit reducedMotion={false} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });
  fireEvent.pointerDown(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });
  await act(async () => vi.advanceTimersByTime(550));
  expect(screen.getByRole("menuitem", { name: "Hide" })).toBeInTheDocument();
  vi.useRealTimers();
});

it("supports keyboard reaction and context-menu shortcuts", async () => {
  render(<FloatingMochit reducedMotion={false} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });
  fireEvent.keyDown(pet, { key: "Enter" });
  expect(screen.getByTestId("mochit-renderer")).toHaveAttribute("data-event", "tap");
  fireEvent.keyDown(pet, { key: "F10", shiftKey: true });
  expect(screen.getByRole("menuitem", { name: "Hide" })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("menuitem", { name: "Hide" })).not.toBeInTheDocument();
});
```

- [ ] **Step 11: Run menu tests and verify RED**

Run: `npm test -- test/FloatingMochit.test.tsx -t "Hide|long press|keyboard"`

Expected: FAIL because custom menu and keyboard behavior are absent.

- [ ] **Step 12: Implement menu, long-press cancellation, and keyboard behavior**

Render the custom menu beside the pet with `role="menu"` and a `button role="menuitem"`. Place it below the pet in the upper half of the viewport and above it in the lower half. Close it on outside pointer down, Escape, drag start, and action selection. Prevent a long-press gesture from also firing tap.

- [ ] **Step 13: Run focused tests and verify GREEN**

Run: `npm test -- test/FloatingMochit.test.tsx`

Expected: PASS with no act warnings.

- [ ] **Step 14: Commit the interactive pet**

```bash
git add components/mochit/FloatingMochit.tsx test/FloatingMochit.test.tsx app/globals.css
git commit -m "feat: add interactive floating Mochit"
```

---

### Task 3: Global Mount and Restore Control

**Files:**
- Create: `components/mochit/FloatingMochitVisibilityControl.tsx`
- Create: `test/FloatingMochitVisibilityControl.test.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/avatar/page.tsx`

**Interfaces:**
- Consumes `FloatingMochit` from Task 2.
- Consumes `loadFloatingMochitPreferences`, `setFloatingMochitVisibility`, and `subscribeToFloatingMochitPreferences` from Task 1.
- Produces `FloatingMochitVisibilityControl()` for `/avatar`.

- [ ] **Step 1: Write failing restore-control tests**

```tsx
it("shows the current floating-pet state and restores a hidden pet", async () => {
  localStorage.setItem(
    FLOATING_MOCHIT_STORAGE_KEY,
    JSON.stringify({ visible: false, position: { x: 120, y: 80 } }),
  );
  render(<FloatingMochitVisibilityControl />);

  const restore = await screen.findByRole("button", { name: "フローティングモチットを表示" });
  fireEvent.click(restore);

  expect(loadFloatingMochitPreferences()).toEqual({
    visible: true,
    position: { x: 120, y: 80 },
  });
  expect(screen.getByText("フローティングモチットは表示中です")).toBeInTheDocument();
});

it("updates when the floating pet is hidden in the same window", async () => {
  render(<FloatingMochitVisibilityControl />);
  await screen.findByText("フローティングモチットは表示中です");
  setFloatingMochitVisibility(false);
  expect(await screen.findByRole("button", { name: "フローティングモチットを表示" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- test/FloatingMochitVisibilityControl.test.tsx`

Expected: FAIL because the control does not exist.

- [ ] **Step 3: Implement the restore control**

Render a small settings section with hydrated visibility state. When visible, show `フローティングモチットは表示中です`. When hidden, show explanatory text and a button labelled `フローティングモチットを表示` that calls `setFloatingMochitVisibility(true)`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- test/FloatingMochitVisibilityControl.test.tsx`

Expected: PASS for initial state, restore, and same-window updates.

- [ ] **Step 5: Mount the pet globally and place the control on `/avatar`**

Update `app/layout.tsx`:

```tsx
import FloatingMochit from "@/components/mochit/FloatingMochit";

<body className="min-h-screen">
  {children}
  <FloatingMochit />
  <CelebrationHost />
</body>
```

Update `app/avatar/page.tsx` to render `<FloatingMochitVisibilityControl />` in its own bordered section after the growth summary and before earned badges. Do not change the existing More or Progress links.

- [ ] **Step 6: Run focused and existing Mochit tests**

Run: `npm test -- test/FloatingMochitVisibilityControl.test.tsx test/FloatingMochit.test.tsx test/Mochit.test.tsx`

Expected: PASS.

- [ ] **Step 7: Run type checking and lint on the integration**

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run lint`

Expected: exit 0 with no new warnings.

- [ ] **Step 8: Commit the global integration**

```bash
git add components/mochit/FloatingMochitVisibilityControl.tsx test/FloatingMochitVisibilityControl.test.tsx app/layout.tsx app/avatar/page.tsx
git commit -m "feat: mount floating Mochit across the app"
```

---

### Task 4: Full Verification and Browser Check

**Files:**
- Modify only files from Tasks 1-3 if verification exposes a defect.

**Interfaces:**
- Verifies the completed feature; produces no new public API.

- [ ] **Step 1: Run the complete unit and component test suite**

Run: `npm test`

Expected: all tests pass with no unhandled errors.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run lint`

Expected: exit 0 with no new warnings.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Next.js production build exits 0.

- [ ] **Step 4: Start the app and verify desktop behavior**

Run: `npm run dev`

At a desktop viewport:

- open `/`, `/login`, `/onboarding`, `/today`, and `/progress`;
- confirm the floating pet appears upper-right on every page;
- tap/click and confirm press plus one soft rebound;
- drag it to multiple edges and confirm the hit area remains visible;
- navigate between routes and reload to confirm the position persists;
- right-click, choose `Hide`, and confirm only the floating instance disappears; and
- follow Progress → Mochit, restore it, and confirm it reappears immediately.

- [ ] **Step 5: Verify mobile touch behavior**

At a mobile viewport:

- long-press without moving and confirm `Hide` opens;
- move before 550 milliseconds and confirm the gesture becomes drag instead;
- release after drag and confirm there is no tap reaction;
- hide it, follow More → Mochit, and restore it; and
- enable reduced motion and confirm there is no decorative rebound or stretch.

- [ ] **Step 6: Inspect the final diff**

Run: `git status --short`

Run: `git diff --check`

Run: `git diff --stat HEAD~3..HEAD`

Expected: only the planned Mochit, layout, avatar, CSS, test, spec, and plan paths are part of this feature; unrelated work is untouched.
