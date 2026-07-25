# Learn Inline Theme Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/learn` 内でテーマを開閉し、セクションごとのレッスン一覧を確認できるようにする。

**Architecture:** `LearnHome` が開いているテーマIDを管理し、`ThemeCard` をリンク行から展開可能なテーマ行へ変更する。展開内容は既存カタログと進捗ヘルパーを使い、レッスンのURLとテーマ詳細URLは変更しない。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS、Vitest、Testing Library

## Global Constraints

- テーマの展開操作で `/learn/[themeSlug]` へ遷移しない。
- レッスンリンクは `getLessonHref` の既存URLを維持する。
- 一括開閉の対象は現在のフィルター・検索結果に表示中のテーマだけとする。
- `aria-expanded` と操作名で個別・一括の開閉状態を伝える。

---

### Task 1: テーマ一覧のインライン展開

**Files:**
- Modify: `components/learn/LearnHome.tsx`
- Modify: `components/learn/ThemeCard.tsx`
- Create: `test/LearnHome.test.tsx`

**Interfaces:**
- Consumes: `LearningTheme`, `ThemeProgress`, `getLessonsForSection`, `getLessonStatus`, `getLessonHref`
- Produces: `ThemeCard` に `isOpen: boolean` と `onToggle: () => void` を追加し、テーマ内のセクション・レッスンを描画する。

- [x] **Step 1: 開閉の失敗テストを書く**

```tsx
// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LearnHome from "@/components/learn/LearnHome";

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [null],
}));

describe("LearnHome", () => {
  it("opens a theme inline to show its sections and lessons", () => {
    render(<LearnHome />);

    fireEvent.click(screen.getByRole("button", { name: "企業活動を開く" }));

    expect(screen.getByRole("button", { name: "企業活動を閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("企業のしくみ")).toBeInTheDocument();
    expect(screen.getByText("企業活動とステークホルダ")).toBeInTheDocument();
  });

  it("opens and closes only the currently visible themes in bulk", () => {
    render(<LearnHome />);

    fireEvent.click(screen.getByRole("button", { name: "ストラテジ" }));
    fireEvent.click(screen.getByRole("button", { name: "すべて開く" }));

    expect(screen.getByRole("button", { name: "企業活動を閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "マネジメント" }));
    expect(screen.getByRole("button", { name: "システム開発を開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "ストラテジ" }));
    fireEvent.click(screen.getByRole("button", { name: "すべて閉じる" }));
    expect(screen.getByRole("button", { name: "企業活動を開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
```

- [x] **Step 2: テストが期待どおり失敗することを確認する**

Run: `npm test -- test/LearnHome.test.tsx`

Expected: FAIL — テーマ見出しの開閉ボタンと一括開閉ボタンがまだ存在しない。

- [x] **Step 3: 最小実装を追加する**

```tsx
// LearnHome.tsx
const [openThemeIds, setOpenThemeIds] = useState<Set<string>>(() => new Set());
const visibleThemeIds = visibleThemes.map((theme) => theme.id);
const hasOpenVisibleTheme = visibleThemeIds.some((id) => openThemeIds.has(id));

function toggleTheme(themeId: string) {
  setOpenThemeIds((current) => {
    const next = new Set(current);
    next.has(themeId) ? next.delete(themeId) : next.add(themeId);
    return next;
  });
}

function setVisibleThemesOpen(open: boolean) {
  setOpenThemeIds((current) => {
    const next = new Set(current);
    visibleThemeIds.forEach((id) => (open ? next.add(id) : next.delete(id)));
    return next;
  });
}
```

```tsx
// ThemeCard.tsx
type ThemeCardProps = {
  // 既存props
  isOpen: boolean;
  onToggle: () => void;
};

<button
  type="button"
  aria-expanded={isOpen}
  aria-label={`${theme.title}を${isOpen ? "閉じる" : "開く"}`}
  onClick={onToggle}
>
  {/* 既存のテーマ概要 */}
</button>

{isOpen && theme.sections.map((section) => (
  <section key={section.id} aria-label={section.title}>
    <h3>{section.order}. {section.title}</h3>
    <p>{section.description}</p>
    {getLessonsForSection(section).map((lesson) => (
      <Link key={lesson.id} href={getLessonHref(lesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}>
        {lesson.title}
      </Link>
    ))}
  </section>
))}
```

`ThemeCard` の既存「次に学ぶ」リンクは展開ボタンの外に置き、ネストしたインタラクティブ要素を作らない。展開部分の各レッスンには `getLessonStatus` に対応する既存の状態表示、所要時間、リンク先を表示する。`LearnHome` の絞り込みセクション直後に、`hasOpenVisibleTheme` に応じて「すべて開く」または「すべて閉じる」ボタンを置く。

- [x] **Step 4: 対象テストが通ることを確認する**

Run: `npm test -- test/LearnHome.test.tsx`

Expected: PASS

- [x] **Step 5: 関連する検証を実行する**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

Expected: すべて終了コード 0。既存のレッスンURL・カタログ検証・他コンポーネントのテストに回帰がない。

- [x] **Step 6: コミットする**

```bash
git add components/learn/LearnHome.tsx components/learn/ThemeCard.tsx test/LearnHome.test.tsx
git commit -m "feat: expand learn themes inline"
```
