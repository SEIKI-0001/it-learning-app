# Task 1 Report

## Files changed

- `test/ExplanationSlides.test.tsx`: added `expect(viewport).toHaveFocus()` after focusing the explanation viewport, so the keyboard-navigation regression test verifies actual focusability.

No production files were changed.

## Commit

`8f27221cc37e8e433b031f430394ce56f8614f8b` — `test: require focusable explanation viewport`

## RED verification

Exact command:

```sh
npm test -- --run test/ExplanationSlides.test.tsx
```

Output:

```text
> it-learning-app@0.1.0 test
> vitest run --run test/ExplanationSlides.test.tsx

 RUN  v4.1.10 /Users/seikikobayashi/Documents/it-learning-app

(node:48452) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
 ❯ test/ExplanationSlides.test.tsx (5 tests | 4 failed) 61ms
     × starts on the first slide and moves with navigation controls 15ms
     × changes slides after a horizontal swipe 4ms
     × keeps every slide mounted to reserve the tallest slide height 1ms
     × moves with arrow keys only while the explanation viewport has focus 5ms

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > starts on the first slide and moves with navigation controls
AssertionError: expected …(1) to have a length of 3 but got 1

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > changes slides after a horizontal swipe
AssertionError: expected <article …(2)><p></p></article> to have a length of 3 but got 1

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > keeps every slide mounted to reserve the tallest slide height
AssertionError: expected …(1) to have a length of 3 but got 1

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > moves with arrow keys only while the explanation viewport has focus
Error: expect(element).toHaveFocus()

Expected element with focus:
  <div class="touch-pan-y overflow-hidden rounded-2xl" data-testid="explanation-slides-viewport">…</div>
Received element with focus:
  <body>…</body>

 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
   Start at  15:34:01
   Duration  421ms (transform 17ms, setup 26ms, import 40ms, tests 61ms, environment 206ms)
```

The expected RED state is confirmed: the component mounts one slide rather than all three, and the viewport is not focusable. The existing keyboard event assertion would also fail because arrow-key navigation is not implemented.

## Self-review

- Scoped production impact: none.
- Scoped test change: one focus assertion in the requested test file.
- The focused suite intentionally remains failing until the production behavior is implemented.
- Note: the two requested regression tests and related mounting assertions were already present in parent commit `a590913`; this task commit strengthens the focusability portion of the keyboard contract.

## Review follow-up

Updated only `test/ExplanationSlides.test.tsx` to assert that an inactive mounted slide has `aria-hidden="true"` and `pointer-events-none`, and to verify ArrowRight does not advance after focus moves from the viewport to the next-slide button.

## RED verification

Exact command:

```sh
npm test -- --run test/ExplanationSlides.test.tsx
```

Output:

```text

> it-learning-app@0.1.0 test
> vitest run --run test/ExplanationSlides.test.tsx


 RUN  v4.1.10 /Users/seikikobayashi/Documents/it-learning-app

(node:50531) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ❯ test/ExplanationSlides.test.tsx (5 tests | 4 failed) 61ms
     × starts on the first slide and moves with navigation controls 15ms
     × changes slides after a horizontal swipe 4ms
     × keeps every slide mounted to reserve the tallest slide height 3ms
     × moves with arrow keys only while the explanation viewport has focus 3ms

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > starts on the first slide and moves with navigation controls
AssertionError: expected …(1) to have a length of 3 but got 1

- Expected
+ Received

- 3
+ 1

 ❯ test/ExplanationSlides.test.tsx:20:57
     18|
     19|     const viewport = screen.getByTestId("explanation-slides-viewport");
     20|     expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3…
       |                                                         ^
     21|     expect(screen.getByText("スライド1")).toBeInTheDocument();
     22|     expect(screen.getByText("スライド2")).not.toBeVisible();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > changes slides after a horizontal swipe
AssertionError: expected <article …(2)><p></p></article> to have a length of 3 but got 1

- Expected
+ Received

- 3
+ 1

 ❯ test/ExplanationSlides.test.tsx:44:57
     42|     fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 80 }] });
     43|
     44|     expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3…
       |                                                         ^
     45|     expect(screen.getByText("スライド2")).toBeInTheDocument();
     46|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > keeps every slide mounted to reserve the tallest slide height
AssertionError: expected …(1) to have a length of 3 but got 1

- Expected
+ Received

- 3
+ 1

 ❯ test/ExplanationSlides.test.tsx:53:57
     51|     const inactiveSlide = viewport.querySelector('[aria-label="ポイント"]');
     52|
     53|     expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3…
       |                                                         ^
     54|     expect(screen.getByRole("group", { name: "全体像" })).toBeVisible();
     55|     expect(inactiveSlide).toHaveAttribute("aria-hidden", "true");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  test/ExplanationSlides.test.tsx > ExplanationSlides > moves with arrow keys only while the explanation viewport has focus
Error: expect(element).toHaveFocus()

Expected element with focus:
  <div
  class="touch-pan-y overflow-hidden rounded-2xl"
  data-testid="explanation-slides-viewport"
>
  <article
  aria-label="全体像"
  role="group"
>
  <p>
  スライド1
  </p>
  </article>
</div>
Received element with focus:
  <body>…</body>
 ❯ test/ExplanationSlides.test.tsx:68:22
     66|
     67|     viewport.focus();
     68|     expect(viewport).toHaveFocus();
     |                      ^


 Test Files  1 failed (5 tests | 4 failed)
      Tests  4 failed | 1 passed (5)
  Duration  635ms (transform 53ms, setup 26ms, import 40ms, tests 61ms)
```

The RED reasons are unchanged and expected: production mounts only the active slide, the inactive-slide interaction/accessibility contract is absent, and the viewport is not focusable or keyboard-controlled. The new post-focus-loss assertion is not reached because focusability fails first.

## Commit

`04d9a6e` — `test: cover inactive slide interaction and focus loss`

## Self-review

- Only `test/ExplanationSlides.test.tsx` was staged and committed; no production files were changed.
- The inactive-slide assertion checks both the interaction boundary (`pointer-events-none`) and accessibility exclusion (`aria-hidden` plus `queryByRole` absence).
- The keyboard regression now proves navigation occurs while the viewport is focused, then remains unchanged when ArrowRight is dispatched after focus moves to the next-slide button.
- The focused suite remains intentionally RED; the failure output identifies the missing production behavior rather than a test typo.
