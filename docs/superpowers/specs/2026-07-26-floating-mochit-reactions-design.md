# フローティングモチット・リアクション集約 設計

## 目的

ログイン後の通常画面では、ユーザーに付き添う動くモチットを常時表示版の1体に限定する。学習中に発生する正誤・完了・バッジ・チェックポイントの一時イベントを永続状態から分離し、既存のリアクション優先度、Rive/SVG、compact、reduced-motionの実装へ渡す。

## アーキテクチャ

`components/mochit/mochitEventBus.ts` にブラウザ内だけで動く `CustomEvent` バスを置く。`emitMochitEvent(MochitEvent)` は一意な `MochitEventSignal` を生成して同期的に配信し、`subscribeMochitEvent` は確実に解除できる関数を返す。SSRでは発火・購読ともno-opにし、履歴やキューは持たない。

`FloatingMochit` はバスを購読し、タップと学習イベントを同じ `event` propへ統合して内部の `Mochit` に渡す。受理・置換・破棄は既存の `useMochitController` だけが判断する。ドラッグ位置はイベント状態から独立したまま維持する。

`FloatingMochitGate` は `usePathname` と設定済みAppStateを使い、通常のログイン後画面だけで常時表示版をマウントする。`/`、`/login`、`/onboarding`、`/avatar`、`/dev` 配下は常に除外する。サーバーの `app/layout.tsx` はこのクライアント境界を置くだけにする。

## イベント発火

- `TopicQuiz`: 初回回答を同期ガードし、選択直後に `correct` または `incorrect`。
- `TopicCompletionQuiz`: チェックポイント突破、全問正解、通常完了の順で `checkpointClear`、`allCorrect`、`taskComplete` を1つだけ発火。
- チェックポイント最終問題: 開始・再挑戦時に `encourage`、合格時に `checkpointClear`、不合格時に `incorrect`。
- Celebration: バッジを含むバッチで `badgeEarned` を1回発火。より高いチェックポイントイベントや既存優先度が後続イベントとの競合を解決する。
- 今日の学習完了カード: 完了状態を表示したマウントで `taskComplete` を1回発火。

## 表示整理

`TopicCompletionQuiz`、チェックポイント最終問題、進捗、ランク、今日の完了カードから埋め込みモチットを削除する。進捗では成長段階名、`/avatar` 導線、再表示コントロールを通常情報ブロックで残す。

QuestRouteはモチットとそのlocalStorage・測定・滑走stateを削除し、現在ノードの `circle-dot` に発光リングと「現在地」ラベルを与える。`/avatar`、`/login`、未設定トップ、`/dev/mochit` の大型・プレビュー表示は維持する。

## アクセシビリティと検証

リアクションに新しいlive regionは追加しない。既存のキーボード、長押し、右クリック、ドラッグ、セーフエリア、画面内clamp、ユーザー非表示設定、compact/reduced-motionを維持する。

イベントバス、回答重複防止、完了イベント選択、FloatingMochit購読と優先度、ドラッグ保持、非表示時、表示ゲート、QuestRoute現在地をVitestで検証する。最後に関連テスト、全テスト、型チェック、Lint、buildを実行する。
