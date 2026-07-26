# Floating Mochit Reactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ログイン後の通常画面に表示するモチットを常時表示版1体へ集約し、学習イベントへ反応させる。

**Architecture:** ブラウザ専用CustomEventバスで一時イベントを配信し、FloatingMochitから既存Mochitコントローラへ渡す。表示対象はpathnameと設定済みAppStateを読む小さなクライアントゲートで管理し、各ページはイベント発火と情報表示だけを担当する。

**Tech Stack:** Next.js 16.2 App Router、React 19、TypeScript、Vitest、Testing Library、既存Rive/SVG Mochit

## Global Constraints

- AppState・DB・localStorageへ一時リアクションイベントを保存しない。
- 既存のイベント優先度、SVG/Rive、compact、prefers-reduced-motionを再利用する。
- 通常アプリ画面の動くモチットは原則1体とし、指定された例外画面だけ埋め込み版を残す。
- 既存の進捗、XP、バッジ、ストリーク、CelebrationHostを維持する。
- コミット、push、PR作成は行わない。

---

### Task 1: 一時イベントバスと完了イベント選択

**Files:**
- Create: `components/mochit/mochitEventBus.ts`
- Modify: `components/mochit/mochitEvents.ts`
- Create: `test/mochitEventBus.test.ts`
- Create: `test/mochitEventBusSsr.test.ts`
- Modify: `test/mochitEvents.test.ts`

**Interfaces:**
- Produces: `emitMochitEvent(event: MochitEvent): MochitEventSignal | null`
- Produces: `subscribeMochitEvent(listener: (signal: MochitEventSignal) => void): () => void`
- Produces: `createMochitEventSignal(event: MochitEvent): MochitEventSignal`
- Produces: `getMochitCompletionEvent(args): MochitEvent`

- [x] 同種連続発火、一意ID、購読解除、SSR no-op、完了優先順位の失敗テストを書く。
- [x] 対象テストを実行し、未実装による失敗を確認する。
- [x] 履歴・キューを持たない最小CustomEvent実装と純粋な完了選択関数を書く。
- [x] 対象テストを再実行して成功を確認する。

### Task 2: FloatingMochit購読と表示ゲート

**Files:**
- Modify: `components/mochit/Mochit.tsx`
- Modify: `components/mochit/FloatingMochit.tsx`
- Create: `components/mochit/FloatingMochitGate.tsx`
- Modify: `app/layout.tsx`
- Modify: `test/FloatingMochit.test.tsx`
- Create: `test/FloatingMochitGate.test.tsx`
- Modify: `test/Mochit.test.tsx`

**Interfaces:**
- Consumes: Task 1のイベントバス。
- Produces: 通常ログイン後ページだけでマウントされる常時表示モチット。

- [x] グローバルイベント購読、同種連続、タップ優先度、ドラッグ位置、非表示時、pathname/AppState表示条件の失敗テストを書く。
- [x] 対象テストを実行し、未実装による失敗を確認する。
- [x] 学習イベントとタップを同じsignal stateへ渡し、既存controllerのactive eventをDOMで確認可能にする。
- [x] `usePathname` と設定済みAppStateを隔離する表示ゲートを実装してlayoutへ置く。
- [x] 対象テストを再実行して成功を確認する。

### Task 3: 回答・完了・バッジ・チェックポイント発火

**Files:**
- Modify: `components/learn/TopicQuiz.tsx`
- Modify: `components/learn/TopicCompletionQuiz.tsx`
- Modify: `app/checkpoint/[checkpointId]/final/page.tsx`
- Modify: `app/today/page.tsx`
- Modify: `lib/celebration.ts`
- Modify: `test/TopicQuiz.test.tsx`
- Create: `test/TopicCompletionQuiz.test.tsx`

**Interfaces:**
- Consumes: Task 1の `emitMochitEvent` と `getMochitCompletionEvent`。
- Produces: 問題選択直後と成果確定時の一時リアクション。

- [x] 正解、不正解、二重クリック、全問正解、通常完了、CP優先の失敗テストを書く。
- [x] 対象テストを実行して期待どおり失敗することを確認する。
- [x] 同期回答ガードと各完了経路のイベント発火を実装する。
- [x] 埋め込み結果モチットを削除し、数値・文言・CTAを残す。
- [x] 対象テストを再実行して成功を確認する。

### Task 4: 通常ページの埋め込み表示とQuestRoute整理

**Files:**
- Modify: `app/progress/page.tsx`
- Modify: `app/rank/page.tsx`
- Modify: `app/today/page.tsx`
- Modify: `components/quest/QuestRoute.tsx`
- Create: `test/QuestRouteComponent.test.tsx`

**Interfaces:**
- Produces: モチットではない現在地マーカーと、埋め込みキャラクターを含まない通常情報ページ。

- [x] 現在ノードが視覚・アクセシブル名で判別できる失敗テストを書く。
- [x] 対象テストを実行して未実装による失敗を確認する。
- [x] QuestRouteの位置保存、DOM測定、滑走、Mochit描画を削除し、発光現在地マーカーへ置換する。
- [x] 進捗・ランク・今日完了カードの埋め込みMochitを削除して指定情報を残す。
- [x] 対象テストを再実行し、対象ファイルの不要importとMochit参照が無いことを確認する。

### Task 5: 全体検証

**Files:**
- Review: 変更した全ファイル

**Interfaces:**
- Consumes: Task 1〜4の完成状態。
- Produces: 型・Lint・テスト・production buildが通る変更一式。

- [x] 関連Vitestを実行する。
- [x] `npm run typecheck` を実行する。
- [x] `npm run lint` を実行する。
- [x] `npm test` を実行する。
- [x] `npm run build` を実行する。
- [x] 失敗があれば再現テストを維持したまま最小修正し、該当検証を再実行する。
- [x] `git diff --check` と `git status --short` で最終差分を確認する。
