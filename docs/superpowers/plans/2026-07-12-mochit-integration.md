# モチット統合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 人型アバターをモチットへ完全置換し、既存の学習・バッジ・チェックポイント成果と連動する控えめな学習相棒を提供する。

**Architecture:** モチットの成長と報酬は、既存の `CheckpointProgress` とバッジ定義から純粋関数で導出する。表示とアニメーションは `components/mochit` に集約し、ページは共通コンポーネントへ状態とメッセージのみ渡す。旧アバターの永続データは正規化・マージで落とし、旧SVG・装備・通知を削除する。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS、Vitest、Next Image、ImageGen、Sharp。

## Global Constraints

- モチット画像は受領したマスターPNGを編集対象とし、顔、体形、輪郭、アンテナ、知識コア、配色を保つ。
- 実装画像は透明背景の約512px WebP、各100〜250KBを目標とする。
- 3D風、厚塗り、過剰な発光、複雑な装飾、文字、影、床、背景エフェクトは追加しない。
- `MochitState` は `normal | happy | thinking | cheering` の4状態のみとする。
- アニメーションは CSS の `transform`、`opacity`、`filter` のみを使い、`prefers-reduced-motion` では停止する。
- 成長はクリア済みチェックポイントにのみ連動し、正答率・合格率の低下で退化しない。
- 右下固定のキャラクター表示、ショップ、ガチャ、着せ替え、複数キャラクター、外見編集は作らない。
- `npm run typecheck`、`npm run lint`、`npm test`、`npm run build` を通す。

---

### Task 1: モチットの進行導出ロジック

**Files:**
- Create: `lib/mochit.ts`
- Create: `test/mochit.test.ts`
- Modify: `types/checkpoint.ts`
- Modify: `lib/storage.ts`
- Modify: `lib/mergeAppState.ts`
- Delete: `types/avatar.ts`
- Delete: `lib/avatarGrowth.ts`
- Delete: `lib/avatarItems.ts`
- Delete: `lib/avatarPresets.ts`
- Delete: `lib/avatarUnlocks.ts`

**Interfaces:**
- Produces: `MochitGrowthStage`, `MOCHIT_GROWTH_STAGE_LABELS`, `getMochitGrowthStage(state)`, `nextMochitGrowthStageInfo(state)`, `getMochitUnlockSummary(state)`.
- Consumes: `AppState`, `getCheckpointProgress(state)`, existing badge definitions.

- [ ] **Step 1: Write failing growth tests**

```ts
import { describe, expect, it } from "vitest";
import { getMochitGrowthStage, nextMochitGrowthStageInfo } from "@/lib/mochit";

it("keeps the highest growth stage from cleared checkpoints", () => {
  expect(getMochitGrowthStage(stateWithClears([]))).toBe(1);
  expect(getMochitGrowthStage(stateWithClears(["cp1", "cp2"]))).toBe(2);
  expect(getMochitGrowthStage(stateWithClears(["cp1", "cp2", "cp3", "cp4"]))).toBe(3);
});

it("describes the next checkpoint-only growth condition", () => {
  expect(nextMochitGrowthStageInfo(stateWithClears([]))).toMatchObject({
    stage: 2,
    conditionLabel: "チェックポイントを2回クリア",
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/mochit.test.ts`

Expected: FAIL because `@/lib/mochit` does not exist.

- [ ] **Step 3: Implement minimal checkpoint-only derivation**

```ts
export type MochitGrowthStage = 1 | 2 | 3;

export function getMochitGrowthStage(state: AppState): MochitGrowthStage {
  const clears = getCheckpointProgress(state).clearedCheckpointIds.length;
  if (clears >= 4) return 3;
  if (clears >= 2) return 2;
  return 1;
}
```

Implement `nextMochitGrowthStageInfo` with checkpoint counts only, and `getMochitUnlockSummary` returning earned badge count and cleared checkpoint count.

- [ ] **Step 4: Remove avatar state from normalization and merge**

Remove the `AvatarProfile` import, `mergeAvatar`, and `avatar` result property from `lib/mergeAppState.ts`. Remove `avatar?: AvatarProfile` from `CheckpointProgress`. In `normalizeAppState`, copy only supported checkpoint progress fields so persisted legacy `avatar` JSON is discarded on the next local save and sync.

- [ ] **Step 5: Run tests**

Run: `npm test -- test/mochit.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/mochit.ts test/mochit.test.ts types/checkpoint.ts lib/storage.ts lib/mergeAppState.ts types/avatar.ts lib/avatarGrowth.ts lib/avatarItems.ts lib/avatarPresets.ts lib/avatarUnlocks.ts
git commit -m "feat: derive Mochit growth from checkpoints"
```

### Task 2: マスターと4状態の軽量画像を作成

**Files:**
- Create: `public/characters/mochit/master.png`
- Create: `public/characters/mochit/normal.webp`
- Create: `public/characters/mochit/happy.webp`
- Create: `public/characters/mochit/thinking.webp`
- Create: `public/characters/mochit/cheering.webp`

**Interfaces:**
- Produces: `/characters/mochit/{state}.webp`, exactly matching the `MochitState` value.
- Consumes: `/Users/seikikobayashi/Downloads/ChatGPT Image 2026年7月12日 16_18_12.png` as the edit target.

- [ ] **Step 1: Preserve the supplied source**

Copy the supplied PNG to `public/characters/mochit/master.png` without altering it. Confirm its dimensions and source format with `sips`.

- [ ] **Step 2: Generate each state via ImageGen edit**

Use one built-in ImageGen edit per state after loading `master.png` into the conversation. Use this common constraint text:

```text
Use case: identity-preserve
Asset type: 512px web UI character state
Input image: Image 1 is the formal Mochit master and edit target.
Primary request: change only the specified expression, arm pose, and tiny body tilt.
Constraints: preserve the exact face proportions, round body, navy outline, mint antenna, cyan hexagonal knowledge core, palette, 2D line-art style, centered scale, and margins. Use a perfectly flat #ff00ff chroma-key background. No text, floor, shadow, speech bubble, glow effect, 3D rendering, painting, or new decoration.
```

State changes:

- `normal`: retain the neutral friendly expression and resting arms.
- `happy`: brighter small smile, arms subtly lifted, no new accessories.
- `thinking`: gentle thoughtful expression and a slight lean, still encouraging.
- `cheering`: happy expression with both arms raised; knowledge core may be brighter but must not add external effects.

- [ ] **Step 3: Remove chroma key and encode WebP**

For each generated source, use `$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` with auto-key, soft matte, thresholds `12` and `220`, and despill. Inspect alpha corners and run a second pass with `--edge-contract 1` only if fringing remains. Use Sharp to square-resize to 512px while preserving transparent padding and encode WebP at a quality that keeps each output between 100KB and 250KB.

- [ ] **Step 4: Validate assets**

Run `sips -g pixelWidth -g pixelHeight -g hasAlpha -g format` and `ls -lh public/characters/mochit`. Visually inspect all four images. Confirm each has transparent corners, matches the master drawing style, shares centering and margin, and has no text or backdrop.

- [ ] **Step 5: Commit**

```bash
git add public/characters/mochit
git commit -m "feat: add Mochit character states"
```

### Task 3: 再利用可能なモチット表示コンポーネント

**Files:**
- Create: `components/mochit/Mochit.tsx`
- Modify: `app/globals.css`
- Create: `test/Mochit.test.tsx`

**Interfaces:**
- Produces: `Mochit`, `MochitState`, `MochitSize`, `MochitAnimation`.
- Consumes: the state WebP assets from Task 2.

- [ ] **Step 1: Write failing component tests**

```tsx
render(<Mochit state="happy" size="medium" message="いいね。知識がつながってきた！" animation="bounce" />);
expect(screen.getByRole("img", { name: "よろこぶモチット" })).toHaveAttribute(
  "src",
  expect.stringContaining("/characters/mochit/happy.webp"),
);
expect(screen.getByText("いいね。知識がつながってきた！")).toBeInTheDocument();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/Mochit.test.tsx`

Expected: FAIL because `components/mochit/Mochit.tsx` does not exist.

- [ ] **Step 3: Implement the typed component**

```ts
export type MochitState = "normal" | "happy" | "thinking" | "cheering";
export type MochitSize = "small" | "medium" | "large";
export type MochitAnimation = "idle" | "bounce" | "tilt" | "celebrate" | "none";
```

Render `next/image` with fixed 512×512 intrinsic dimensions, `object-contain`, responsive `sizes`, and state-specific Japanese alt text. Render the message only when supplied and keep it as ordinary adjacent content rather than an overlay. Map small/medium/large to 96/128/240 CSS pixels.

- [ ] **Step 4: Add motion-safe CSS**

Add named keyframes: weak vertical `mochit-idle`, one-shot `mochit-bounce`, slight `mochit-tilt`, and short `mochit-cheer` scale/filter animation. Scope class names under `.mochit` and add an `@media (prefers-reduced-motion: reduce)` rule forcing animation and transition duration to zero.

- [ ] **Step 5: Run tests**

Run: `npm test -- test/Mochit.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/mochit/Mochit.tsx app/globals.css test/Mochit.test.tsx
git commit -m "feat: add reusable Mochit component"
```

### Task 4: ホームと学習結果へモチットを統合

**Files:**
- Modify: `app/today/page.tsx`
- Modify: `components/learn/TopicCompletionQuiz.tsx`
- Create: `components/mochit/mochitResult.ts`
- Create: `test/mochitResult.test.ts`
- Delete: `components/avatar/AvatarProgressCard.tsx`

**Interfaces:**
- Produces: `getMochitResultPresentation(before, after, correct, total)` returning `{ state, animation, message }`.
- Consumes: checkpoint state before and after an existing `completeStudySession` call.

- [ ] **Step 1: Write failing result-priority tests**

```ts
it("prioritizes checkpoint cheering over answer happiness", () => {
  expect(getMochitResultPresentation(before, afterWithNewClear, 3, 3)).toMatchObject({
    state: "cheering",
    animation: "celebrate",
  });
});

it("uses thinking with an encouraging message when any answer is incorrect", () => {
  expect(getMochitResultPresentation(before, before, 2, 3)).toMatchObject({
    state: "thinking",
    message: "惜しい。考え方を一緒に整理しよう",
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/mochitResult.test.ts`

Expected: FAIL because `getMochitResultPresentation` does not exist.

- [ ] **Step 3: Implement result presentation priority**

Compare `before` and `after` `clearedCheckpointIds`. Return `cheering` first for a new clear, then `happy` for all correct, then `thinking` for any incorrect result. Use the exact approved messages; default `normal` to a next-action message.

- [ ] **Step 4: Add compact home guidance**

In the existing first task card in `app/today/page.tsx`, render a flex row with medium normal/idle Mochit and one action-oriented message. Derive the copy from the existing first task and never use fixed or absolute page-edge positioning.

- [ ] **Step 5: Update the lesson completion card**

Store the before/after state result from `handleComplete`, call `getMochitResultPresentation`, and render medium Mochit within the result card. Keep all existing scores, XP, streak, next-lesson CTA, and progress navigation intact.

- [ ] **Step 6: Run tests**

Run: `npm test -- test/mochitResult.test.ts test/Mochit.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/today/page.tsx components/learn/TopicCompletionQuiz.tsx components/mochit/mochitResult.ts test/mochitResult.test.ts
git rm components/avatar/AvatarProgressCard.tsx
git commit -m "feat: show Mochit on study home and results"
```

### Task 5: モチットページとチェックポイント達成表示

**Files:**
- Modify: `app/avatar/page.tsx`
- Modify: `app/checkpoint/[checkpointId]/final/page.tsx`
- Modify: `app/progress/page.tsx`
- Modify: `app/rank/page.tsx`
- Modify: `app/more/page.tsx`
- Modify: `components/BottomNav.tsx`
- Create: `components/mochit/MochitProfileCard.tsx`
- Create: `components/mochit/MochitCheckpointCard.tsx`
- Create: `test/MochitProfileCard.test.tsx`
- Delete: `components/avatar/CheckpointBattleAvatar.tsx`
- Delete: `components/avatar/RankAvatarCard.tsx`
- Delete: `components/avatar/AvatarCreator.tsx`
- Delete: `components/avatar/AvatarEquipmentPanel.tsx`
- Delete: `components/avatar/AvatarRenderer.tsx`
- Delete: `components/avatar/AvatarGrowthArt.tsx`
- Delete: `components/avatar/AvatarItemArt.tsx`
- Delete: `components/avatar/AvatarPresetArt.tsx`

**Interfaces:**
- Produces: profile card and checkpoint card that accept only `AppState` plus display-mode props.
- Consumes: `Mochit`, `getMochitGrowthStage`, badge statuses, `CheckpointProgress`.

- [ ] **Step 1: Write failing profile-card tests**

```tsx
render(<MochitProfileCard state={stateWithTwoClearsAndBadges} />);
expect(screen.getByText("成長段階：成長期")).toBeInTheDocument();
expect(screen.getByText("次の段階：チェックポイントを4回クリア")).toBeInTheDocument();
expect(screen.getByText("獲得済みバッジ")).toBeInTheDocument();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/MochitProfileCard.test.tsx`

Expected: FAIL because `MochitProfileCard` does not exist.

- [ ] **Step 3: Implement the profile page**

Replace `/avatar` content with a non-interactive profile page titled `モチット`. Show large normal/idle Mochit at 200–280px, growth stage, next checkpoint-only growth condition, earned badges through existing `BadgeList` data or a compact read-only list, and unlocked core/light descriptions. Do not render presets, radio buttons, equipment controls, or any state mutation.

- [ ] **Step 4: Replace checkpoint battle visuals**

Remove `newUnlocks` and all avatar equipment imports from the final exam page. Before the exam, show small normal Mochit with a short preparatory message. On a passing result, show cheering/celebrate Mochit inside the existing pass card; on failure, show thinking/tilt Mochit with an encouraging next action. Preserve scoring, save, badge, and celebration behavior.

- [ ] **Step 5: Remove duplicate character roles**

In progress and rank views, replace any avatar renderer with a link or compact static Mochit summary only when it communicates progress; otherwise remove it. Rename `/more` link to `モチット` with a pet-appropriate emoji and adjust its description. Keep `/avatar` as the route for existing links and bookmarks, while BottomNav continues grouping it under Other.

- [ ] **Step 6: Run component and feature tests**

Run: `npm test -- test/MochitProfileCard.test.tsx test/mochit.test.ts test/finalExam.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/avatar/page.tsx app/checkpoint/[checkpointId]/final/page.tsx app/progress/page.tsx app/rank/page.tsx app/more/page.tsx components/BottomNav.tsx components/mochit
git rm components/avatar/CheckpointBattleAvatar.tsx components/avatar/RankAvatarCard.tsx components/avatar/AvatarCreator.tsx components/avatar/AvatarEquipmentPanel.tsx components/avatar/AvatarRenderer.tsx components/avatar/AvatarGrowthArt.tsx components/avatar/AvatarItemArt.tsx components/avatar/AvatarPresetArt.tsx
git commit -m "feat: replace avatar pages with Mochit"
```

### Task 6: 通知・オンボーディング・旧素材を整理

**Files:**
- Modify: `app/onboarding/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `lib/unlockNotice.ts`
- Modify: `lib/useBadgeSync.ts`
- Modify: `components/learn/TopicCompletionQuiz.tsx`
- Create: `test/unlockNotice.test.ts`
- Delete: `components/avatar/AvatarUnlockToast.tsx`
- Delete: `components/avatar/UnlockNoticeHost.tsx`
- Delete: `components/avatar/`

**Interfaces:**
- Produces: badge-only unlock notification with `badgeLabels: string[]`.
- Consumes: existing `emitUnlockNotice` call sites.

- [ ] **Step 1: Write a failing notification test**

```ts
it("emits only newly earned badge labels", () => {
  expect(buildUnlockNotice(before, after, ["badge-topic-1"])).toEqual({
    badgeLabels: ["…"],
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/unlockNotice.test.ts`

Expected: FAIL because the badge-only notice builder does not exist.

- [ ] **Step 3: Make notifications badge-only**

Remove `itemIds`, `newlyUnlockedItems`, and avatar toast hosting. Either keep the existing event bus with a small generic badge host or remove the bus and retain page-local badge/result messaging where already present. Do not retain a fixed character widget. Remove `UnlockNoticeHost` from root layout.

- [ ] **Step 4: Remove avatar onboarding**

After profile setup, persist the initialized state and navigate directly to `/today`. Delete avatar-specific imports, intermediate state, and selection step from `app/onboarding/page.tsx`.

- [ ] **Step 5: Delete the empty avatar directory**

After replacing all imports, run `rg -n "avatar|Avatar" app components lib types test` and resolve every production reference. Remove the now-empty `components/avatar` directory with `git rm` for every tracked file; do not remove unrelated user changes.

- [ ] **Step 6: Run focused checks**

Run: `npm test -- test/unlockNotice.test.ts test/mochit.test.ts test/mochitResult.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/onboarding/page.tsx app/layout.tsx lib/unlockNotice.ts lib/useBadgeSync.ts components/learn/TopicCompletionQuiz.tsx test/unlockNotice.test.ts
git rm components/avatar/AvatarUnlockToast.tsx components/avatar/UnlockNoticeHost.tsx
git commit -m "refactor: remove legacy avatar rewards"
```

### Task 7: 全体検証とモバイル確認

**Files:**
- Modify: only files required by failures discovered below.

**Interfaces:**
- Consumes: completed Tasks 1–6.

- [ ] **Step 1: Verify old implementation is gone**

Run: `rg -n "avatar|Avatar|装備を整える|見た目を整える|プリセット" app components lib types test`

Expected: no production result except the compatibility route pathname `/avatar` and intentional migration comments.

- [ ] **Step 2: Run type check and lint**

Run: `npm run typecheck && npm run lint`

Expected: both exit 0.

- [ ] **Step 3: Run all automated tests**

Run: `npm test`

Expected: all Vitest suites pass.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Next.js build exits 0.

- [ ] **Step 5: Manually verify responsive behavior**

Run the dev server and inspect at 375px and desktop width:

- `/today`: one medium Mochit inside the primary task card, no fixed character.
- a lesson completion: happy or thinking state and readable result CTA.
- a checkpoint pass result: cheering state appears once in the result card.
- `/avatar`: 200–280px Mochit, stage, next condition, earned badges, no controls.
- reduced-motion setting: all Mochit animations are stopped.

- [ ] **Step 6: Inspect the final diff**

Run: `git status --short && git diff --check`

Expected: only the intended Mochit assets, replacements, tests, and legacy-avatar removals remain; the working tree has no whitespace errors. If this verification exposes a defect, return to the owning task, add a failing regression test, make the minimal correction, and repeat Tasks 7.1–7.5.
