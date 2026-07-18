### Task 2: 共通スライドUIを高さ固定・キーボード対応にする

**Files:**
- Modify: `components/learn/ExplanationSlides.tsx`
- Test: `test/ExplanationSlides.test.tsx`

**Interfaces:**
- Consumes: `slides: ExplanationSlide[]`, `title?: string | null`。
- Produces: `data-testid="explanation-slides-viewport"` を持つフォーカス可能な横スライド領域。`ArrowLeft` / `ArrowRight`、下部ボタン、番号、スワイプで同じ `moveTo` を呼び出す。

- [ ] **Step 1: Implement the minimal shared layout**

  `ExplanationSlides.tsx` を次の方針で変更する。

  ```tsx
  <div
    data-testid="explanation-slides-viewport"
    tabIndex={slides.length > 1 ? 0 : undefined}
    onKeyDown={handleKeyDown}
    className="touch-pan-y overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
  >
    <div className="grid">
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <article
            key={slide.id}
            role="group"
            aria-label={slide.label}
            aria-hidden={!isActive}
            inert={!isActive}
            className={`col-start-1 row-start-1 w-full transition duration-300 motion-reduce:transition-none ${
              isActive
                ? "relative z-10 translate-x-0 opacity-100"
                : index < activeIndex
                  ? "pointer-events-none -translate-x-full opacity-0"
                  : "pointer-events-none translate-x-full opacity-0"
            }`}
          >
            {slide.content}
          </article>
        );
      })}
    </div>
  </div>
  ```

  `handleKeyDown` は `ArrowLeft` と `ArrowRight` だけで `preventDefault()` 後に `moveTo` を呼ぶ。`input`、`textarea`、`select`、`[contenteditable]` をイベント起点とする場合は何もしない。

- [ ] **Step 2: Run the focused test to verify GREEN**

  Run: `npm test -- --run test/ExplanationSlides.test.tsx`

  Expected: PASS. 既存のクリック・番号・スワイプテストも維持する。

- [ ] **Step 3: Check focused lint and types**

  Run: `npx eslint components/learn/ExplanationSlides.tsx test/ExplanationSlides.test.tsx && npm run typecheck`

  Expected: exit code 0.

