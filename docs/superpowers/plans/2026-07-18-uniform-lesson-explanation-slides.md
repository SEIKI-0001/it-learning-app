# 全トピック共通の解説スライド Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全トピックの解説を同一の横スライドUIで表示し、トピック内でスライド高さを固定したうえで、フォーカス時の左右矢印キーでも移動できるようにする。

**Architecture:** `TopicContent` は専用体験・プロセスデモの有無にかかわらず、既存の体験・概念カード・試験ポイントを1つの `ExplanationSlides` 配列に組み立てる。`ExplanationSlides` は全スライドをCSS Gridの同じセルに置き、最も高い内容で高さを確保しながら、アクティブなスライドだけを表示・操作可能にする。

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4, Vitest, Testing Library

## Global Constraints

- Next.js 16.2.9のApp Router構成を維持し、既存のServer/Client境界を広げない。
- `.env` と `.projects` は読まない・編集しない。
- 解説・体験・確認問題の既存コンテンツ、回答、正誤判定、シャッフルは削除・変更しない。
- キーボード操作は `ExplanationSlides` 自体にフォーカスがあるときだけ有効にし、フォーム要素の操作を奪わない。
- 非アクティブなスライドはアクセシビリティツリーとポインター操作から除外するが、レイアウト高さの計算には参加させる。

---

### Task 1: 高さ固定・キーボード操作の回帰テストを追加

**Files:**
- Modify: `test/ExplanationSlides.test.tsx`

**Interfaces:**
- Consumes: `ExplanationSlides` の既存 `slides`, `title` props。
- Produces: すべてのスライドをDOMに保持し、アクティブなスライドだけが操作・公開されること、フォーカス時の左右キー操作を保証するテスト。

- [ ] **Step 1: Write the failing tests**

  既存テストを次の契約に更新・追加する。

  ```tsx
  it("keeps every slide mounted to reserve the tallest slide height", () => {
    render(<ExplanationSlides slides={slides} />);
    const viewport = screen.getByTestId("explanation-slides-viewport");

    expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3);
    expect(screen.getByRole("group", { name: "全体像" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "ポイント" })).not.toBeInTheDocument();
  });

  it("moves with arrow keys only while the explanation viewport has focus", () => {
    render(<ExplanationSlides slides={slides} />);
    const viewport = screen.getByTestId("explanation-slides-viewport");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    viewport.focus();
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });
  ```

- [ ] **Step 2: Run the focused test to verify RED**

  Run: `npm test -- --run test/ExplanationSlides.test.tsx`

  Expected: FAIL because inactive slides are currently unmounted and the viewport is not keyboard-focusable.

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

### Task 3: 全トピックの解説構成を共通UIへ流す

**Files:**
- Modify: `components/learn/TopicContent.tsx`
- Test: `test/ExplanationSlides.test.tsx`

**Interfaces:**
- Consumes: `Topic`, `getTopicExperience`, `ProcessDemoSection`, `VisualLearningSection`, `DiagramRenderer`。
- Produces: 専用体験・プロセスデモの有無に関係なく、体験（ある場合）・概念カード・試験ポイントを同じ `ExplanationSlides` に渡す `ExplanationSlide[]`。

- [ ] **Step 1: Write the failing content-assembly test**

  `TopicContent` のスライド配列生成を小さな純粋関数 `buildExplanationSlides(topic)` としてexportし、専用体験を持つトピックでも `experience`、`concept`、`exam-points` が順に含まれることをテストする。

  ```tsx
  it("keeps the common explanation slides after a topic experience", () => {
    const slides = buildExplanationSlides(topicWithExperience);

    expect(slides.map((slide) => slide.id)).toEqual([
      "experience",
      "concept",
      "exam-points",
    ]);
  });
  ```

- [ ] **Step 2: Run the focused test to verify RED**

  Run: `npm test -- --run test/TopicContent.test.tsx`

  Expected: FAIL because the helper does not exist and experience topics currently omit the shared concept and exam slides.

- [ ] **Step 3: Implement the minimal content assembly**

  `TopicContent.tsx` を以下の順に構成する。

  1. `getTopicExperience(topic.id)` があるときは `experience` を追加し、なければ `processDemo`、なければ `visualLearning` を最初の理解スライドとして追加する。
  2. すべてのトピックで既存の概念カードを `concept` スライドとして追加する。ただし最初の理解スライドが概念カードそのものの場合は重複させない。
  3. すべてのトピックで既存の解説本文・要点・図解を `exam-points` スライドとして追加する。要点と図解がなくても本文を表示する。
  4. `ExplanationSlides title="📖 解説"` に生成した配列を渡す。確認問題と `TopicReviewSections` は変更しない。

- [ ] **Step 4: Run focused tests to verify GREEN**

  Run: `npm test -- --run test/TopicContent.test.tsx test/ExplanationSlides.test.tsx test/EnterpriseActivitiesExperience.test.tsx`

  Expected: PASS. 専用体験の既存操作は失われず、共通の解説ナビゲーションも利用できる。

### Task 4: 全体検証・ブラウザ確認・公開

**Files:**
- Modify: `components/learn/ExplanationSlides.tsx`, `components/learn/TopicContent.tsx`, `test/ExplanationSlides.test.tsx`, `test/TopicContent.test.tsx`

**Interfaces:**
- Consumes: Tasks 1〜3の実装。
- Produces: 全トピックで同じ解説UIを提供する、検証済みのmainブランチ変更。

- [ ] **Step 1: Run the complete validation suite**

  Run: `npm test && npm run typecheck && npx eslint components/learn/ExplanationSlides.tsx components/learn/TopicContent.tsx test/ExplanationSlides.test.tsx test/TopicContent.test.tsx`

  Expected: all tests pass, TypeScript exits 0, and changed-file lint exits 0.

- [ ] **Step 2: Build the learn routes**

  Run: `npx next build --turbo --debug-build-paths 'app/learn/**'`

  Expected: compilation, type checking, and 94-page static generation complete with exit code 0.

- [ ] **Step 3: Verify the rendered lesson flow**

  Start `npm run dev`, open an experience-backed lesson and a standard lesson, then confirm:

  - the first slide has a focus ring;
  - `ArrowRight` and `ArrowLeft` move only while that viewport is focused;
  - the section height stays unchanged between the tallest and shortest slides;
  - existing next/previous buttons, number buttons, and swipe still work;
  - confirmation questions and review sections remain visible.

- [ ] **Step 4: Commit and push only scoped files**

  Run: `git add components/learn/ExplanationSlides.tsx components/learn/TopicContent.tsx test/ExplanationSlides.test.tsx test/TopicContent.test.tsx docs/superpowers/plans/2026-07-18-uniform-lesson-explanation-slides.md && git commit -m "feat: unify lesson explanation slides" && git push origin main`

  Expected: only the implementation, regression tests, and this plan are committed to `main`; unrelated untracked files remain unmodified.
