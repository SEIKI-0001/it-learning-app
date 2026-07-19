# Algorithm Beginner Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tech-algorithm-flowchart` を、日常の手順から試験表現へ進む、現在ステップだけを描画する7ステップ学習体験へ置き換える。

**Architecture:** 対象トピック専用のクライアントコンポーネント内でウィザード状態を保持し、現在のステップだけをswitch分岐で描画する。学習データと純粋な計算処理、ステップ共通シェル、各ステップ表示を分離し、既存のレジストリ、共通スライド、完了クイズ、進捗保存経路には変更を加えない。

**Tech Stack:** Next.js 16.2.9 App Router、React 19.2.4、TypeScript 5、Tailwind CSS 4、Vitest 4、React Testing Library

## Global Constraints

- 対象トピックIDは `tech-algorithm-flowchart` のまま変更しない。
- 学習順序は「日常の手順 → 順番 → コンピュータの順次処理 → 箱としての変数 → 繰り返し → フローチャート → 試験表現」とする。
- STEP6より前に「フローチャート」を表示しない。
- 現在のステップ以外をDOMへ描画しない。
- 既存の4問確認問題、完了判定、XP、進捗保存、復習連携を変更しない。
- STEP7の3問は理解確認用で、既存確認問題を置き換えない。
- 共通 `ExperienceSlideDeck` と他トピックの体験コードを変更しない。
- 既存の `mochit` 関連未コミット変更を編集、ステージ、コミットしない。
- Next.jsのクライアント境界は `"use client"` を入口コンポーネントの先頭に置き、サーバーから非直列化propsを渡さない。
- TypeScript、ESLint、全Vitest、production buildを成功させる。

---

## File Structure

- Create: `components/experiences/algorithm/learningModel.ts` — 学習用定数、型、正誤判定、合計更新の純粋関数。
- Create: `components/experiences/algorithm/AlgorithmStepShell.tsx` — 7分割進捗、現在ステップ見出し、戻る・次へ、無効理由を表示する共通シェル。
- Create: `components/experiences/algorithm/AlgorithmSteps.tsx` — STEP1〜7とフローチャートモーダルの表示コンポーネント。
- Create: `components/experiences/algorithm/AlgorithmExperience.tsx` — 全状態を保持し、現在ステップだけを描画する親コンポーネント。
- Modify: `components/experiences/AlgorithmExperience.tsx` — 既存レジストリを維持するため新しい入口を再exportする。
- Create: `test/AlgorithmExperience.test.tsx` — 初期DOM、各体験、単一ステップ描画、状態保持、モーダル、正式表現を利用者視点で検証する。

---

### Task 1: 学習モデルをテストファーストで定義する

**Files:**
- Create: `components/experiences/algorithm/learningModel.ts`
- Create: `test/AlgorithmExperience.test.tsx`

**Interfaces:**
- Produces: `NOODLE_ACTIONS`, `COMPUTER_ACTIONS`, `FLOW_ACTIONS`, `FORMAL_MAPPINGS`, `MINI_QUESTIONS`
- Produces: `isCorrectNoodleOrder(order: NoodleActionId[]): boolean`
- Produces: `addCurrentNumber(state: RepetitionState): RepetitionState`
- Produces: `isRepetitionComplete(state: RepetitionState): boolean`

- [ ] **Step 1: Write failing model tests**

`test/AlgorithmExperience.test.tsx` の先頭に次を追加する。

```tsx
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AlgorithmExperience from "@/components/experiences/AlgorithmExperience";
import {
  addCurrentNumber,
  isCorrectNoodleOrder,
  isRepetitionComplete,
} from "@/components/experiences/algorithm/learningModel";

afterEach(cleanup);

describe("algorithm learning model", () => {
  it("accepts only the correct cup-noodle order", () => {
    expect(isCorrectNoodleOrder(["open", "pour", "wait"])).toBe(true);
    expect(isCorrectNoodleOrder(["wait", "pour", "open"])).toBe(false);
  });

  it("adds 1 through 5 and stops at 15", () => {
    let state = { total: 0, current: 1 };
    for (let count = 0; count < 5; count += 1) state = addCurrentNumber(state);
    expect(state).toEqual({ total: 15, current: 6 });
    expect(isRepetitionComplete(state)).toBe(true);
    expect(addCurrentNumber(state)).toEqual(state);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: FAIL because `components/experiences/algorithm/learningModel.ts` does not exist.

- [ ] **Step 3: Implement the complete learning model**

Create `components/experiences/algorithm/learningModel.ts`:

```ts
export const TOTAL_STEPS = 7;

export const NOODLE_ACTIONS = [
  { id: "wait", label: "3分待つ", emoji: "⏱️" },
  { id: "open", label: "ふたを開ける", emoji: "🥡" },
  { id: "pour", label: "お湯を入れる", emoji: "♨️" },
] as const;

export type NoodleActionId = (typeof NOODLE_ACTIONS)[number]["id"];
const CORRECT_NOODLE_ORDER: readonly NoodleActionId[] = ["open", "pour", "wait"];

export function isCorrectNoodleOrder(order: NoodleActionId[]): boolean {
  return order.length === CORRECT_NOODLE_ORDER.length &&
    order.every((action, index) => action === CORRECT_NOODLE_ORDER[index]);
}

export const COMPUTER_ACTIONS = ["3を受け取る", "2を受け取る", "足す", "5を表示"] as const;

export type RepetitionState = { total: number; current: number };

export function isRepetitionComplete(state: RepetitionState): boolean {
  return state.current > 5;
}

export function addCurrentNumber(state: RepetitionState): RepetitionState {
  if (isRepetitionComplete(state)) return state;
  return { total: state.total + state.current, current: state.current + 1 };
}

export const FLOW_ACTIONS = [
  { label: "開始", kind: "terminal" },
  { label: "合計を0にする", kind: "process" },
  { label: "数字を足す", kind: "process" },
  { label: "5以下か確認", kind: "decision" },
  { label: "次の数字へ", kind: "process" },
  { label: "合計を表示", kind: "output" },
  { label: "終了", kind: "terminal" },
] as const;

export const FORMAL_MAPPINGS = [
  { beginner: "合計の箱を0にする", formal: "合計 ← 0" },
  { beginner: "合計に現在の数字を足す", formal: "合計 ← 合計 + i" },
  { beginner: "次の数字へ", formal: "i ← i + 1" },
] as const;

export const MINI_QUESTIONS = [
  {
    prompt: "「合計 ← 0」はどんな手順？",
    choices: ["合計の箱を0にする", "合計に1を足す"],
    correct: "合計の箱を0にする",
    explanation: "右側の0を、左側の『合計』という箱へ入れます。",
  },
  {
    prompt: "「合計 ← 合計 + i」はどんな手順？",
    choices: ["合計に現在の数字を足す", "合計を表示する"],
    correct: "合計に現在の数字を足す",
    explanation: "今の合計とiを足し、その結果を合計の箱へ入れ直します。",
  },
  {
    prompt: "「i ← i + 1」はどんな手順？",
    choices: ["次の数字へ進む", "最初の数字へ戻る"],
    correct: "次の数字へ進む",
    explanation: "iを1増やして、次に足す数字を準備します。",
  },
] as const;
```

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: model tests PASS. Component tests are not added yet.

- [ ] **Step 5: Commit only Task 1 files**

```bash
git add components/experiences/algorithm/learningModel.ts test/AlgorithmExperience.test.tsx
git commit -m "test: define beginner algorithm learning model"
```

---

### Task 2: 単一ステップ描画とSTEP1〜3を実装する

**Files:**
- Create: `components/experiences/algorithm/AlgorithmStepShell.tsx`
- Create: `components/experiences/algorithm/AlgorithmSteps.tsx`
- Create: `components/experiences/algorithm/AlgorithmExperience.tsx`
- Modify: `components/experiences/AlgorithmExperience.tsx`
- Modify: `test/AlgorithmExperience.test.tsx`

**Interfaces:**
- Consumes: Task 1の学習モデル定数と判定関数。
- Produces: `AlgorithmStepShellProps` with `step`, `title`, `canContinue`, `blockedHint`, `onBack`, `onNext`, `children`。
- Produces: default export `AlgorithmExperience` compatible with the existing `ComponentType` registry entry。

- [ ] **Step 1: Add failing tests for initial DOM and STEP1〜3**

`test/AlgorithmExperience.test.tsx` に次のdescribeを追加する。

```tsx
describe("AlgorithmExperience beginner flow", () => {
  it("renders only the current step", () => {
    render(<AlgorithmExperience />);
    expect(screen.getByRole("heading", { name: "カップ麺を作る順番を並べよう" })).toBeInTheDocument();
    expect(screen.queryByText("フローチャートを読んでみよう")).not.toBeInTheDocument();
    expect(screen.queryByText("試験で使う正式な表現")).not.toBeInTheDocument();
    expect(screen.getByText("STEP 1 / 7")).toBeInTheDocument();
  });

  it("unlocks the next step after the correct daily procedure", () => {
    render(<AlgorithmExperience />);
    fireEvent.click(screen.getByRole("button", { name: "ふたを開ける" }));
    fireEvent.click(screen.getByRole("button", { name: "お湯を入れる" }));
    fireEvent.click(screen.getByRole("button", { name: "3分待つ" }));
    expect(screen.getByText("目的を達成するための手順をアルゴリズムと呼びます")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("heading", { name: "順番が違うとどうなる？" })).toBeInTheDocument();
  });

  it("executes computer instructions one line at a time", () => {
    render(<AlgorithmExperience />);
    completeStepOne();
    fireEvent.click(screen.getByRole("button", { name: "うまくいかない" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("実行済み 0 / 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    expect(screen.getByText("実行済み 1 / 4")).toBeInTheDocument();
    expect(screen.queryByText("コンピュータも手順を上から順番に実行する")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    expect(screen.getByText("コンピュータも手順を上から順番に実行する")).toBeInTheDocument();
  });
});
```

同じファイルにテストヘルパーを追加する。

```tsx
function completeStepOne() {
  fireEvent.click(screen.getByRole("button", { name: "ふたを開ける" }));
  fireEvent.click(screen.getByRole("button", { name: "お湯を入れる" }));
  fireEvent.click(screen.getByRole("button", { name: "3分待つ" }));
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: FAIL because the legacy component shows the old multi-panel flow and lacks `STEP 1 / 7`.

- [ ] **Step 3: Implement the step shell**

Create `components/experiences/algorithm/AlgorithmStepShell.tsx` with a client-safe presentational component that renders:

```tsx
import type { ReactNode } from "react";
import { TOTAL_STEPS } from "./learningModel";

export type AlgorithmStepShellProps = {
  step: number;
  title: string;
  canContinue: boolean;
  blockedHint?: string;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
};

export default function AlgorithmStepShell(props: AlgorithmStepShellProps) {
  const { step, title, canContinue, blockedHint, onBack, onNext, children } = props;
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-100 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black tracking-wide text-indigo-600">STEP {step} / {TOTAL_STEPS}</p>
        <p className="text-xs font-bold text-gray-500">{step === TOTAL_STEPS ? "仕上げ" : "基礎からひとつずつ"}</p>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1" aria-label={`学習ステップ ${step} / ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <span key={index} aria-hidden className={`h-1.5 rounded-full ${index < step ? "bg-indigo-600" : "bg-gray-200"}`} />
        ))}
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-gray-900">{title}</h3>
      <div className="mt-4">{children}</div>
      <div className="mt-5 border-t border-gray-100 pt-4">
        {!canContinue && blockedHint ? <p className="mb-2 text-center text-xs font-semibold text-amber-700">{blockedHint}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onBack} disabled={step === 1} className="min-h-11 rounded-xl border border-gray-200 font-bold text-gray-700 disabled:opacity-35">戻る</button>
          <button type="button" onClick={onNext} disabled={!canContinue || step === TOTAL_STEPS} className="min-h-11 rounded-xl bg-indigo-600 font-bold text-white disabled:opacity-35">{step === TOTAL_STEPS ? "学習完了" : "次へ"}</button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement STEP1〜3 and parent state**

`AlgorithmSteps.tsx` に `ProcedureStep`、`OrderStep`、`ComputerStep` を名前付きexportで実装する。各コンポーネントは表示とイベントだけを担当し、正解判定と実行済み行数は親から受け取る。回答結果は `aria-live="polite"` へ表示する。

`algorithm/AlgorithmExperience.tsx` は `"use client"` を先頭に置き、次の状態を持つ。

```tsx
const [step, setStep] = useState(1);
const [noodleOrder, setNoodleOrder] = useState<NoodleActionId[]>([]);
const [orderAnswer, setOrderAnswer] = useState<"works" | "fails" | null>(null);
const [executedLines, setExecutedLines] = useState(0);
```

`switch (step)` で現在の1ステップだけを `content` へ代入し、`AlgorithmStepShell` のchildrenとして描画する。STEP1は正しい順番、STEP2は回答済み、STEP3は4行実行済みの場合だけ `canContinue=true` にする。

既存 `components/experiences/AlgorithmExperience.tsx` の内容は次の再exportだけへ置き換える。

```tsx
export { default } from "./algorithm/AlgorithmExperience";
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: all model and STEP1〜3 tests PASS.

- [ ] **Step 6: Commit Task 2 files**

```bash
git add components/experiences/AlgorithmExperience.tsx components/experiences/algorithm/AlgorithmStepShell.tsx components/experiences/algorithm/AlgorithmSteps.tsx components/experiences/algorithm/AlgorithmExperience.tsx test/AlgorithmExperience.test.tsx
git commit -m "feat: introduce beginner algorithm step flow"
```

---

### Task 3: STEP4〜5の箱と繰り返し体験を実装する

**Files:**
- Modify: `components/experiences/algorithm/AlgorithmSteps.tsx`
- Modify: `components/experiences/algorithm/AlgorithmExperience.tsx`
- Modify: `test/AlgorithmExperience.test.tsx`

**Interfaces:**
- Consumes: `RepetitionState`, `addCurrentNumber`, `isRepetitionComplete`。
- Produces: `BoxStep` and `RepetitionStep` controlled components。

- [ ] **Step 1: Add failing tests for box and repetition behavior**

```tsx
it("introduces a variable only after changing the named box", () => {
  render(<AlgorithmExperience />);
  advanceToBoxStep();
  expect(screen.queryByText("名前の付いた箱を変数と呼ぶ")).not.toBeInTheDocument();
  expect(screen.getByTestId("box-total")).toHaveTextContent("0");
  fireEvent.click(screen.getByRole("button", { name: "1を足す" }));
  expect(screen.getByTestId("box-total")).toHaveTextContent("1");
  fireEvent.click(screen.getByRole("button", { name: "2を足す" }));
  expect(screen.getByTestId("box-total")).toHaveTextContent("3");
  expect(screen.getByText("名前の付いた箱を変数と呼ぶ")).toBeInTheDocument();
  expect(screen.getByText("合計 ← 0")).toBeInTheDocument();
});

it("experiences repetition by adding the current number five times", () => {
  render(<AlgorithmExperience />);
  advanceToRepetitionStep();
  const addButton = screen.getByRole("button", { name: "現在の数字を足す" });
  for (let count = 0; count < 5; count += 1) fireEvent.click(addButton);
  expect(screen.getByTestId("repeat-total")).toHaveTextContent("15");
  expect(screen.getByTestId("repeat-current")).toHaveTextContent("6");
  expect(screen.getByText("同じ処理を何度も行うことを繰り返しと呼ぶ")).toBeInTheDocument();
});
```

テストヘルパー `advanceToBoxStep()` と `advanceToRepetitionStep()` は、画面上の実操作で前ステップを完了させる。内部stateや実装関数を直接操作しない。

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: FAIL because STEP4 and STEP5 are not implemented.

- [ ] **Step 3: Implement controlled STEP4 and STEP5**

親に次の状態を追加する。

```tsx
const [boxAdds, setBoxAdds] = useState(0);
const [repetition, setRepetition] = useState<RepetitionState>({ total: 0, current: 1 });
```

STEP4では `boxAdds` 0/1/2を合計0/1/3へ対応させ、順番どおりの単一ボタンだけを表示する。2回完了後に初めて「変数」「合計 ← 0」「←は右の値を左の箱へ入れる印」を表示する。

STEP5では `addCurrentNumber` をボタンイベントから呼び、主要カードは `data-testid="repeat-total"` と `data-testid="repeat-current"` の2つだけにする。`current > 5` で完了説明を表示し、追加ボタンを無効化する。

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: all tests through STEP5 PASS.

- [ ] **Step 5: Commit Task 3 files**

```bash
git add components/experiences/algorithm/AlgorithmSteps.tsx components/experiences/algorithm/AlgorithmExperience.tsx test/AlgorithmExperience.test.tsx
git commit -m "feat: add variable box and repetition experiences"
```

---

### Task 4: STEP6の3処理ビューと全体図モーダルを実装する

**Files:**
- Modify: `components/experiences/algorithm/AlgorithmSteps.tsx`
- Modify: `components/experiences/algorithm/AlgorithmExperience.tsx`
- Modify: `test/AlgorithmExperience.test.tsx`

**Interfaces:**
- Consumes: `FLOW_ACTIONS`。
- Produces: controlled `FlowchartStep({ flowIndex, isModalOpen, ...handlers })`。

- [ ] **Step 1: Add failing tests for late reveal and modal behavior**

```tsx
it("reveals the flowchart only at step 6 and limits the normal view to three actions", () => {
  render(<AlgorithmExperience />);
  expect(screen.queryByText("全体図を見る")).not.toBeInTheDocument();
  advanceToFlowchartStep();
  const window = screen.getByTestId("flow-window");
  expect(within(window).getAllByRole("listitem")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "処理を進める" }));
  expect(within(window).getAllByRole("listitem")).toHaveLength(3);
  expect(screen.queryByRole("dialog", { name: "フローチャート全体図" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "全体図を見る" }));
  const dialog = screen.getByRole("dialog", { name: "フローチャート全体図" });
  expect(within(dialog).getAllByRole("listitem")).toHaveLength(7);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "フローチャート全体図" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: FAIL because STEP6 and its modal do not exist.

- [ ] **Step 3: Implement the flow window and modal**

親に次を追加する。

```tsx
const [flowIndex, setFlowIndex] = useState(0);
const [isFlowModalOpen, setFlowModalOpen] = useState(false);
```

通常ビューは `FLOW_ACTIONS.slice(Math.max(0, flowIndex - 1), Math.min(FLOW_ACTIONS.length, flowIndex + 2))` だけをmapし、各項目へ「前」「現在」「次」のラベルを付ける。全体図は `isFlowModalOpen` のときだけ条件描画し、7項目を縦に表示する。

モーダル表示中はdocumentの `keydown` をeffectで購読し、Escapeで閉じる。effect cleanupで必ず解除する。背景要素のクリックは `event.target === event.currentTarget` の場合だけ閉じ、内容クリックでは閉じない。

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: STEP6 tests PASS and modal is absent from DOM while closed.

- [ ] **Step 5: Commit Task 4 files**

```bash
git add components/experiences/algorithm/AlgorithmSteps.tsx components/experiences/algorithm/AlgorithmExperience.tsx test/AlgorithmExperience.test.tsx
git commit -m "feat: reveal beginner flowchart in a focused window"
```

---

### Task 5: STEP7の対応表と3問ミニ確認を実装する

**Files:**
- Modify: `components/experiences/algorithm/AlgorithmSteps.tsx`
- Modify: `components/experiences/algorithm/AlgorithmExperience.tsx`
- Modify: `test/AlgorithmExperience.test.tsx`

**Interfaces:**
- Consumes: `FORMAL_MAPPINGS`, `MINI_QUESTIONS`。
- Produces: controlled `ExamExpressionStep` with three answer results and completion summary。

- [ ] **Step 1: Add failing tests for formal mappings and all mini questions**

```tsx
it("connects beginner language to exam expressions and completes three mini questions", () => {
  render(<AlgorithmExperience />);
  advanceToExamStep();
  expect(screen.getByText("合計の箱を0にする")).toBeInTheDocument();
  expect(screen.getByText("合計 ← 合計 + i")).toBeInTheDocument();
  expect(screen.getByText("i ← i + 1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "合計の箱を0にする" }));
  fireEvent.click(screen.getByRole("button", { name: "次のミニ問題" }));
  fireEvent.click(screen.getByRole("button", { name: "合計に現在の数字を足す" }));
  fireEvent.click(screen.getByRole("button", { name: "次のミニ問題" }));
  fireEvent.click(screen.getByRole("button", { name: "次の数字へ進む" }));

  expect(screen.getByText("日常の手順から試験の表現までつながりました")).toBeInTheDocument();
  expect(screen.getByText("3問中 3問正解")).toBeInTheDocument();
});

it("preserves completed interaction state after going back", () => {
  render(<AlgorithmExperience />);
  advanceToExamStep();
  fireEvent.click(screen.getByRole("button", { name: "戻る" }));
  fireEvent.click(screen.getByRole("button", { name: "戻る" }));
  expect(screen.getByTestId("repeat-total")).toHaveTextContent("15");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: FAIL because STEP7 does not exist.

- [ ] **Step 3: Implement formal mappings and mini questions**

親に次の状態を追加する。

```tsx
const [miniQuestionIndex, setMiniQuestionIndex] = useState(0);
const [miniAnswers, setMiniAnswers] = useState<(string | null)[]>(
  () => MINI_QUESTIONS.map(() => null),
);
```

対応表は3行すべてを表示し、正式表現を `code` で表す。ミニ問題は現在の1問だけを表示し、選択後に正誤と解説を `aria-live="polite"` に表示する。最終問題への回答後は正解数と完了メッセージを表示する。誤答でも次問へ進める。

STEP7の外側にある既存 `TopicCompletionQuiz`、`TopicQuiz`、`topic.checkQuestions` は変更しない。

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: all `AlgorithmExperience` tests PASS.

- [ ] **Step 5: Commit Task 5 files**

```bash
git add components/experiences/algorithm/AlgorithmSteps.tsx components/experiences/algorithm/AlgorithmExperience.tsx test/AlgorithmExperience.test.tsx
git commit -m "feat: bridge algorithm lessons to exam notation"
```

---

### Task 6: 回帰・品質・モバイル表示を検証する

**Files:**
- Modify if a verified issue is found: only files already listed in Tasks 1〜5
- Test: `test/AlgorithmExperience.test.tsx`

**Interfaces:**
- Consumes: completed implementation.
- Produces: clean TypeScript, lint, test, build evidence and a verified 390px layout.

- [ ] **Step 1: Run focused component tests**

Run: `npm test -- test/AlgorithmExperience.test.tsx`

Expected: PASS with no warnings.

- [ ] **Step 2: Run existing experience regression tests**

Run: `npm test -- test/SqlExperience.test.tsx test/EnterpriseActivitiesExperience.test.tsx`

Expected: PASS, proving the common deck and unrelated experiences are unchanged.

- [ ] **Step 3: Run TypeScript and lint**

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npm run lint`

Expected: exit code 0 with no new warnings or errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests PASS. If an unrelated dirty `mochit` test fails, report it separately and do not edit those files unless the failure is caused by this implementation.

- [ ] **Step 5: Run production build**

Run: `npm run build`

Expected: Next.js production build exits 0.

- [ ] **Step 6: Verify the rendered lesson at mobile width**

Run: `npm run dev`

Open the `tech-algorithm-flowchart` lesson at a 390px-wide viewport and verify:

- STEP1 initially shows one compact card and no flowchart/formal notation.
- Bottom navigation buttons are fully visible and tappable.
- Each normal step exposes only its current theme.
- STEP5 shows only the two primary number cards.
- STEP6 normal view contains at most three flow items.
- STEP6 modal scrolls internally without horizontal overflow.
- STEP7 mappings and choices do not overflow.
- Existing confirmation quiz still follows the explanation and completes the lesson.

- [ ] **Step 7: Inspect final scope**

Run: `git diff --check`

Run: `git status --short`

Expected: only the planned algorithm files, test, and plan are changed by this work; pre-existing `mochit` changes remain separate.

- [ ] **Step 8: Commit any verification-only corrections**

If Tasks 1〜5 already pass without corrections, skip this commit. Otherwise stage only planned files and run:

```bash
git commit -m "fix: polish beginner algorithm learning flow"
```
