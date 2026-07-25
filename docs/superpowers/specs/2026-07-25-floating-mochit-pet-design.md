# Floating Mochit Pet Design

## Status

Approved on 2026-07-25.

## Goal

Turn Mochit into an independent floating pet that is available on every page, including public, login, onboarding, and signed-in learning pages. The pet starts near the upper-right corner, feels soft like Japanese mochi when touched, can be repositioned by dragging, and can be hidden through a contextual menu.

The existing Mochit presentations inside individual pages remain unchanged. Hiding the floating pet hides only the independent floating instance.

## Architecture

Add one client-side `FloatingMochit` component to the root application layout. This creates a single shared interaction surface across routes and prevents page implementations from duplicating pet state or omitting it on new routes.

`FloatingMochit` wraps the existing `Mochit` component rather than introducing another character renderer. WebP, SVG, and future Rive renderers continue to pass through the existing `Mochit` boundary.

Keep positioning and physical deformation on separate DOM layers:

- The outer layer owns fixed viewport positioning and drag translation.
- The inner layer owns press compression, drag stretch, release wobble, and the existing Mochit tap reaction.

This separation prevents the drag transform from overwriting the mochi deformation transform.

## Default Placement and Viewport Safety

The floating pet is displayed by default near the upper-right corner with a 16-pixel visual margin plus any browser safe-area inset. Its visual size is compact enough to remain a companion rather than page content, while its interactive hit area remains at least 44 by 44 pixels.

The pet position is clamped so the complete hit area remains inside the visible viewport. Re-clamping occurs when:

- a drag ends;
- the viewport is resized;
- device orientation changes; or
- a saved position is restored on a viewport with different dimensions.

The pet layer sits above page content and the fixed bottom navigation. Because it is draggable and viewport-clamped, users can move it away from content it covers.

## Pointer and Touch Interaction

Use Pointer Events so mouse, pen, and touch share one interaction model.

### Press and Tap

On pointer down, Mochit compresses vertically and widens slightly. The movement resembles soft mochi being pressed, without changing the fixed outer footprint.

If the pointer is released before crossing the drag threshold:

- Mochit rebounds through a short damped wobble;
- the existing semantic `tap` reaction is dispatched; and
- no navigation occurs.

The press and rebound are applied regardless of whether the current renderer is WebP, SVG, or Rive.

### Drag

Pointer movement beyond a small threshold changes the gesture from a tap to a drag. During a drag:

- the pointer is captured so the pet continues following it outside the original hit area;
- the pet follows the pointer without triggering page scrolling from that gesture;
- a subtle directional stretch communicates that the pet is being pulled; and
- any open Mochit context menu closes.

On release, the position is clamped, saved, and followed by one soft settling jiggle. A drag never dispatches a tap reaction.

### Long Press and Context Menu

Desktop right-click and touch long-press open the same custom context menu. Long-press is cancelled if the pointer moves far enough to become a drag or is released before the long-press delay.

The menu contains one action:

- `Hide`

Opening the custom menu suppresses the browser's native context menu for the pet only. Tapping outside the menu, starting a drag, pressing Escape, or choosing an item closes it.

## Visibility and Restoration

Choosing `Hide` removes the independent floating pet from every route on that device and browser profile.

The existing Mochit entries remain available:

- More (`/more`) continues to show its Mochit entry.
- Progress (`/progress`) continues to show its Mochit entry.
- Both entries lead to the existing Mochit page (`/avatar`).

More and Progress also render a restore-only control directly when the pet is hidden. This keeps restoration available even before onboarding, when `/avatar` redirects to onboarding because no learning profile exists. The restore-only control renders nothing while the pet is visible.

The Mochit page gains a clearly labelled full floating-pet control. When the pet is hidden, the control offers `Show floating Mochit`. Restoring from any of these controls makes the pet visible immediately and places it at the last valid saved position, or the default upper-right position if no saved position exists.

## Device-Specific Persistence

Store visibility and position in versioned `localStorage` keys. This persistence is intentionally device-specific:

- one user's choice does not affect other users;
- no account or database is required;
- public and signed-out pages can use the same preference;
- another device or browser starts with the pet visible at the default position; and
- clearing browser data resets visibility and position.

Storage access is guarded for server rendering, unavailable storage, and malformed values. A storage failure leaves the pet visible and usable for the current page without crashing the app.

## Keyboard and Accessibility

The floating pet is keyboard reachable and has an accessible name that describes it as an interactive Mochit pet.

- Enter or Space performs the same press-and-rebound tap reaction.
- Shift+F10 and the Context Menu key open the same `Hide` menu.
- Escape closes the menu.
- The custom menu uses menu semantics and exposes its item as a menu item.
- Focus remains visible through the application's existing focus-visible styling.

Dragging is an enhancement, not the only way to control visibility. Users who cannot drag can still interact with the pet, hide it from the menu, and restore it from the Mochit page.

## Reduced Motion

Respect both the existing explicit `reducedMotion` handling and the user's `prefers-reduced-motion` setting.

In reduced-motion mode:

- dragging, visibility controls, and menu behavior remain functional;
- position changes follow the pointer directly;
- press state may change instantly to communicate contact; and
- rebound, directional stretch, settling jiggle, and other decorative motion are removed.

## Gesture Rules

The gesture state is mutually exclusive:

- a gesture begins as a potential tap;
- crossing the movement threshold converts it permanently into a drag;
- reaching the long-press delay without meaningful movement opens the menu;
- opening the menu prevents the same gesture from firing a tap; and
- cancel or lost pointer capture resets the interaction safely.

Only one active pointer controls the pet at a time.

## Testing

Use test-first development for the following observable behavior:

- the global pet renders on public and signed-in route layouts when visible;
- it defaults to the upper-right;
- pointer press applies the compressed state;
- a tap rebounds and dispatches the Mochit tap reaction;
- movement beyond the threshold drags without dispatching a tap;
- drag release clamps and saves the position;
- saved positions are restored and re-clamped for the current viewport;
- right-click and long-press open the custom `Hide` menu;
- long-press is cancelled by dragging;
- hiding persists on the current device;
- the Mochit page restores the floating pet;
- keyboard activation and context-menu shortcuts work;
- reduced-motion mode removes decorative movement; and
- invalid or unavailable local storage fails safely.

Run the focused component tests first, then the complete test suite, lint, type checking, and the production build. Perform a browser-level check of touch, drag, hide, route navigation, and restore behavior at desktop and mobile viewport sizes.

## Out of Scope

- Synchronizing pet visibility or position between devices
- Saving pet preferences to a user account or database
- Removing or redesigning existing page-specific Mochit content
- Navigation or learning actions when the floating pet is tapped
- Additional context-menu commands beyond `Hide`
- A third-party drag-and-drop or physics dependency
