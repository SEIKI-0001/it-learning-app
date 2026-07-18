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

