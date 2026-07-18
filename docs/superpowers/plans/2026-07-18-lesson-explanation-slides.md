# レッスン解説スライド化・確認問題コンパクト化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** トピックレッスンの解説をタイトル付きの横スライドにし、確認問題カードの縦幅を少し短くする。

**Architecture:** レッスン冒頭の `TopicContent` に、既存の学習パーツをスライド単位へ配置する `ExplanationSlides` クライアントコンポーネントを追加する。スライド状態・ボタン・スワイプだけを新コンポーネントが持ち、内容の描画は既存の `VisualLearningSection`、`ProcessDemoSection`、`DiagramRenderer`、概念カードを再利用する。`CheckQuestionCard` はTailwindの余白クラスだけを調整する。

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript, Tailwind CSS v4, Vitest, Testing Library

## Global Constraints

- `AGENTS.md` のNext.jsガイドに従い、既存のApp Router構成とNext.js 16.2.9を維持する。
- `.env` と `.projects` は読まない・編集しない。
- 既存の `app/lp/` と `docs/superpowers/plans/2026-07-12-mochit-integration.md` の未追跡変更には触れない。
- クイズの回答・記録・正誤判定・シャッフルの挙動は変更しない。
- サイトの新規作成やデプロイは行わず、既存のローカルサイトを変更する。

---

### Task 1: 解説スライダーのテストを追加

**Files:**
- Create: `components/learn/ExplanationSlides.tsx`
- Create: `test/ExplanationSlides.test.tsx`

**Interfaces:**
- Consumes: `slides: { id: string; label: string; content: React.ReactNode }[]`, `title?: string`
- Produces: レッスン冒頭で再利用できる横スライドUI。`aria-label="解説"`、現在位置表示、前後ボタン、番号ボタン、左右スワイプに対応する。

- [x] **Step 1: Write the failing test**

  `test/ExplanationSlides.test.tsx` に、3枚の文字列スライドを渡して次を検証するテストを追加する。

  ```tsx
  // @vitest-environment jsdom
  import { fireEvent, render, screen } from "@testing-library/react";
  import { describe, expect, it } from "vitest";
  import ExplanationSlides from "@/components/learn/ExplanationSlides";

  describe("ExplanationSlides", () => {
    const slides = [
      { id: "one", label: "全体像", content: <p>スライド1</p> },
      { id: "two", label: "ポイント", content: <p>スライド2</p> },
      { id: "three", label: "まとめ", content: <p>スライド3</p> },
    ];

    it("starts on the first slide and moves with navigation controls", () => {
      render(<ExplanationSlides slides={slides} />);

      expect(screen.getByText("スライド1")).toBeInTheDocument();
      expect(screen.queryByText("スライド2")).not.toBeInTheDocument();
      expect(screen.getByText("1 / 3")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "次の解説へ" }));
      expect(screen.getByText("スライド2")).toBeInTheDocument();
      expect(screen.getByText("2 / 3")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "解説3" }));
      expect(screen.getByText("スライド3")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "次の解説へ" })).toBeDisabled();
    });

    it("changes slides after a horizontal swipe", () => {
      render(<ExplanationSlides slides={slides} />);
      const viewport = screen.getByTestId("explanation-slides-viewport");

      fireEvent.touchStart(viewport, { changedTouches: [{ clientX: 240 }] });
      fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 80 }] });

      expect(screen.getByText("スライド2")).toBeInTheDocument();
    });
  });
  ```

- [x] **Step 2: Run test to verify it fails**

  Run: `npm test -- test/ExplanationSlides.test.tsx`

  Expected: FAIL because `@/components/learn/ExplanationSlides` does not exist.

- [x] **Step 3: Write minimal implementation**

  `ExplanationSlides.tsx` は以下を実装する。

  - `"use client"` と `useState` を使用する。
  - 空配列なら `null` を返す。
  - `activeIndex` を0から `slides.length - 1` の範囲に制限する。
  - 前後ボタンは端で `disabled` にする。
  - 番号ボタンは `aria-label="解説${index + 1}"` とし、選択中を `aria-current="step"` にする。
  - viewportに `data-testid="explanation-slides-viewport"` を付け、touchStart/touchEndの差分が56px以上なら左右移動する。
  - `aria-live="polite"` の `n / total` 表示と、各スライドの `aria-hidden` を付ける。
  - `transition-transform motion-reduce:transition-none` でReduced Motionに配慮する。

- [x] **Step 4: Run test to verify it passes**

  Run: `npm test -- test/ExplanationSlides.test.tsx`

  Expected: PASS with both tests passing.

### Task 2: TopicContentへ解説タイトルとスライド構成を組み込む

**Files:**
- Modify: `components/learn/TopicContent.tsx`
- Test: `test/ExplanationSlides.test.tsx`

**Interfaces:**
- Consumes: `TopicContent` の `topic`、`VisualLearningSection`、`ProcessDemoSection`、`DiagramRenderer`。
- Produces: `TopicContent` の先頭に `📖 解説` 見出しと横スライドを表示し、確認問題は従来どおり後続に表示する。

- [x] **Step 1: Write the failing test**

  `ExplanationSlides` の利用例として、`title="📖 解説"` と `label` が表示できる契約テストを追加する。既存コンポーネントのServer/Client境界に依存しないよう、スライドのラベルとタイトルだけを確認する。

  ```tsx
  it("shows the section title and slide labels", () => {
    render(<ExplanationSlides title="📖 解説" slides={slides} />);
    expect(screen.getByRole("heading", { name: "📖 解説" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解説1" })).toHaveTextContent("全体像");
  });
  ```

- [x] **Step 2: Run test to verify it fails**

  Run: `npm test -- test/ExplanationSlides.test.tsx`

  Expected: FAIL because `title` is not yet rendered.

- [x] **Step 3: Write minimal implementation**

  `TopicContent.tsx` の通常トピック分岐を、次のスライド生成方針に置き換える。

  - `topic.visualLearning` がある場合は、スライド1に `VisualLearningSection` を置く。
  - スライド2に既存の概念カード（`topic.conceptCard`）を置く。
  - `topic.explanation.diagram` がある場合はスライド3に `DiagramRenderer` と要点を置く。ない場合は概念カード内の既存図解をそのまま概念スライド内に残し、スライド数を2枚にする。
  - `processDemo` またはテーマ専用 `experience` がある場合は、既存の専用コンテンツを1枚のスライドとして表示し、不要な空スライドを作らない。
  - 最上部に `ExplanationSlides title="📖 解説"` を配置する。
  - 確認問題の `Section` は変更せず、解説スライドの後に残す。

- [x] **Step 4: Run test to verify it passes**

  Run: `npm test -- test/ExplanationSlides.test.tsx test/TopicQuiz.test.tsx`

  Expected: PASS.

### Task 3: 確認問題カードをコンパクト化

**Files:**
- Modify: `components/learn/CheckQuestionCard.tsx`
- Test: `test/TopicQuiz.test.tsx` (behavior remains unchanged)

**Interfaces:**
- Consumes: 既存の `CheckQuestionCard` props。
- Produces: 同じクイズ挙動のまま、選択肢と正解表示の縦余白を少し縮める。

- [x] **Step 1: Write the failing test**

  既存の `TopicQuiz.test.tsx` の回答後表示テストを再利用し、正解理由と「もう一度ためす」が引き続き表示されることを確認する。スタイル値はTesting Libraryでは保証しにくいため、今回の見た目変更に専用のロジックテストは追加しない。

- [x] **Step 2: Run test to establish the current behavior**

  Run: `npm test -- test/TopicQuiz.test.tsx`

  Expected: PASS before style-only changes.

- [x] **Step 3: Write minimal implementation**

  `CheckQuestionCard.tsx` のクラスを次のように変更する。

  - 外側カード: `p-4` → `p-3`（小画面の読みやすさを保つため `sm:p-4` を追加してもよい）。
  - 選択肢列: `space-y-2.5` → `space-y-2`。
  - 回答結果: `mt-4 ... p-4` → `mt-3 ... p-3`。
  - 再挑戦ボタン: `mt-3` → `mt-2.5`。

- [x] **Step 4: Run test to verify it passes**

  Run: `npm test -- test/TopicQuiz.test.tsx`

  Expected: PASS.

### Task 4: 全体検証と差分確認

**Files:**
- Modify: `components/learn/ExplanationSlides.tsx`, `components/learn/TopicContent.tsx`, `components/learn/CheckQuestionCard.tsx`, `test/ExplanationSlides.test.tsx`, `docs/superpowers/specs/2026-07-18-lesson-explanation-slides-design.md`, `docs/superpowers/plans/2026-07-18-lesson-explanation-slides.md`

**Interfaces:**
- Consumes: Tasks 1〜3の実装。
- Produces: テスト・型・Lint・ビルドで検証可能な変更。

- [x] **Step 1: Run focused tests**

  Run: `npm test -- test/ExplanationSlides.test.tsx test/TopicQuiz.test.tsx`

  Expected: all focused tests pass.

- [x] **Step 2: Run project validation**

  Run: `npm run typecheck && npm run lint && npm test && npm run build`

  Expected: all commands exit with status 0.

- [x] **Step 3: Review the diff and status**

  Run: `git diff -- components/learn/ExplanationSlides.tsx components/learn/TopicContent.tsx components/learn/CheckQuestionCard.tsx test/ExplanationSlides.test.tsx`
  and `git status --short`.

  Expected: only the requested UI/test/docs files are changed by this task; unrelated pre-existing untracked files remain untouched.
