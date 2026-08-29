# it-learning-app ゲームフルデザイン実装 要件定義書

**Version:** 2.0 (Claude Code implementation edition)  
**Status:** Approved for implementation planning  
**Target repository:** `SEIKI-0001/it-learning-app`  
**Recommended repository path:** `docs/requirements/gameful-design-v2.md`  
**Core loop:** 望ましい学習行動 → 実力向上 → 成長実感 → 再訪

---

## 0. この文書の使い方

この文書をゲームフルデザイン改善の **Single Source of Truth（正規仕様）** とする。

Claude Code / Codex / その他の実装エージェントは、実装時に会話履歴ではなく本書を優先して参照すること。

### 0.1 実装ルール

- 一度に全要件を実装しない。原則としてPR単位で分割する。
- 各PRは対象の要件IDを明記する。
- 各要件の `Acceptance Criteria` をすべて満たしてから完了扱いとする。
- 要件の意味を変更する必要が生じた場合、コード側だけで変更せず本書を先に更新する。
- `P0` は次期必須、`P1` は優先ファストフォロー、`P2` は条件付き将来候補とする。
- `Non-requirements` に記載された項目は、明示承認なしに実装しない。

### 0.2 実装ステータス表記

| Status | 意味 |
|---|---|
| `NOT_STARTED` | 未着手 |
| `IN_PROGRESS` | 実装中 |
| `IMPLEMENTED` | コード実装済み |
| `VERIFIED` | Acceptance Criteria・テストまで確認済み |
| `DEFERRED` | 条件未達等により延期 |
| `NOT_APPLICABLE` | 現行構成では不要と判断し、仕様更新済み |

---

# 1. 目的と基本方針

本改修の目的はゲーム要素の数を増やすことではない。

ユーザーが **「今の自分に最も有効な学習」** を迷わず開始し、学習後に実力の向上を認識し、翌日または離脱後にも再開しやすい状態を作る。

Version 2.0ではアプリ起動後のUXだけでなく、LINE通知等の **「アプリを開く前のUX」** も対象とする。

## 1.1 設計原則

1. 主目的は「ゲーム内報酬の獲得」ではなく **ITパスポート合格に必要な実力の向上** とする。
2. 合格準備度・習熟度・弱点判定は既存の証拠ベース評価ロジックを正とし、演出都合で数値を変更しない。
3. 既出問題による成長確認は成長実感に利用できるが、初見問題と同等の証拠として扱わない。
4. モチットの具体発言は、保存済み学習事実または確定済み計算結果からのみ生成する。
5. 各画面の強いCTAは原則1つ。推奨を既定値として強調しつつ、代替選択は残す。
6. ランダム報酬は補助報酬に限定し、必須バッジ・CP進行・合格準備度・試験解放条件をランダムで変動させない。
7. 損失回避は必ず救済可能性とセットで使い、罪悪感・脅迫・過度なFOMOを避ける。
8. 通知・同調・共有はオプトイン、頻度制御、プライバシー、事実性を満たす場合のみ利用する。
9. 表示確率と実際の確率を意図的に不一致にしない。抽選条件はユーザーを誤認させない。
10. ゲームフル手法の「対応率」をKPIにしない。採否は **望ましい学習行動 → 実力向上 → 成長実感 → 再訪** への寄与で判断する。

---

# 2. 対象ユーザーと3W1H

| Who | When | Which | Goal |
|---|---|---|---|
| 初回ユーザー | 初回設定完了直後 | 教材を探す / 推奨学習から始める | 推奨学習を1タップで開始 |
| 通常ユーザー | `/today`を開いた時 | 複数機能を見る / 今日の最優先を始める | 今日の最優先学習を開始 |
| 未学習ユーザー | 設定時刻になっても当日未学習 | 通知を無視 / 数分だけ再開 | その日の1タスクを完了 |
| スキマ時間ユーザー | 通勤・休憩等で数分だけ使える時 | SNS等へ流れる / 短時間学習 | 3〜5分で1行動を完了 |
| 弱点保有ユーザー | 弱点が検出された時 | 得意領域を続ける / 弱点復習 | 弱点復習を優先 |
| 学習直後ユーザー | 1セッション終了時 | そのまま離脱 / 成長を確認 | 成果差分を認識 |
| CP終盤ユーザー | 突破条件が近い時 | 通常学習 / 残条件達成 | CP突破条件を完成 |
| 離脱復帰ユーザー | 2〜3日以上空いた時 | 離脱継続 / 短時間復帰 | 3〜5分で再開 |
| 継続ユーザー | 複数日学習後 | 惰性的継続 / 過去と比較 | 過去の自分との差を実感 |

---

# 3. 現行実装の前提

本要件は既存機能を廃止して作り直すのではなく、役割の重複を整理し、未接続資産を接続し、学習成果との意味付けを強める前提とする。

現行の主要資産：

- CP0〜CP6、必須バッジ、突破試験、ロードマップ
- 合格準備度、分野別習熟度、弱点・復習キュー、推奨フォーカス
- XP、レベル、長期ランク、次の解放表示
- 今日の3ミッション、クエストルート、宝箱、ランダム追加報酬、レア天井
- ストリーク、おまもり、節目報酬
- モチットの常駐表示、イベントリアクション、吹き出し、成長段階
- 達成演出、バッジ獲得演出、CP突破イベント
- LINE連携の既存返信導線

LINEの定時pushリマインダーは現時点の既存返信機能とは別の要件として扱う。

---

# 4. Claude提案12案との統合判断

| Claude案 | Requirement | Priority | 判断 |
|---|---|---:|---|
| LINEリマインダー | `GF-P0-006` | P0 | 採用。習慣UXの入口として必須化 |
| 欠片出口 + 3択宝箱 | `GF-P1-005` | P1 | 採用。既存`applyDropChoice`等の接続を優先 |
| レアリティ演出 | `GF-P1-006` | P1 | 採用。common/rare/epicを視覚差分化 |
| 同じ試験月の仲間 | `GF-P2-001` | P2 | 条件付き採用。十分な母数と匿名集計が前提 |
| モチット命名 + 理解者化 | `GF-P0-004`, `GF-P1-007` | P0/P1 | 理解者化をP0、命名を独立P1 |
| ヒートマップ + あゆみ | `GF-P1-004` | P1 | 採用。旧学習アルバムを拡張 |
| 単語帳図鑑 | `GF-P1-008` | P1 | 採用。既存進捗の表示強化を優先 |
| リロール + おまけくじ | `GF-P1-009` | P1 | リロール採用。表示確率と実確率をずらす仕様は不採用 |
| 合格宣言 | `GF-P1-010` | P1 | 任意オプトインとして採用 |
| イースターエッグ | `GF-P2-002` | P2 | 条件付き採用。学習評価値には影響させない |
| 時限チャンス | `GF-P2-004` | P2 | XP2倍は不採用。安全版のみ |
| シェアカード | `GF-P2-003` | P2 | 採用候補。明示操作・個人情報非掲載が必須 |

---

# 5. スコープと優先順位

| Priority | Scope | 判断 |
|---|---|---|
| P0 | `/today`主CTA統合、行動効果開示、成長確認、モチット理解者化、学習後成果差分、LINEリマインダー | 次期必須 |
| P1 | 学習量選択、復帰ミッション、CP非連続成長、ヒートマップ・あゆみ、報酬コレクション、レア演出、モチット命名、単語帳図鑑、ミッションリロール、合格宣言、世界観統一 | P0後に順次 |
| P2 | 匿名同調、イースターエッグ、シェア、安全な期間イベント等 | 条件付き導入 |
| Non-requirements | 過度なFOMO、サンクコスト煽り、横取り恐怖、眩暈演出、誤認を招く確率表示等 | 採用しない |

---

# 6. P0 必須機能要件

## GF-P0-001 `/today` の主CTA統合

**Priority:** P0  
**Status:** `NOT_STARTED`

### Purpose

アプリ起動後の選択負荷を下げ、最も優先度の高い学習へ即座に進める。

### Functional Requirements

- `/today` のファーストビューに「今日の最優先」を1件だけPrimaryとして表示する。
- Primary選定は既存の推奨学習、復習期限、弱点、CP進行条件、学習計画を入力として決定する。
- Primaryには以下を表示する。
  - タイトル
  - 種別（新規学習 / 復習等）
  - 所要時間
  - 推奨理由
  - 開始CTA
- 他の学習候補はSecondary領域に置き、Primaryと同等の視覚強調を行わない。
- `TodayPolicyStrip`、`QuestRoute`、`NextGoal` 等の重複する「次にやること」を整理する。
- 選択肢そのものは削除せず、推奨を既定値として強調する。

### Acceptance Criteria

- [ ] ファーストビューのPrimary CTAは原則1つ。
- [ ] Primary押下で対象学習へ直接遷移できる。
- [ ] 推奨対象取得失敗時は既存学習導線へ安全にフォールバックする。
- [ ] CPゲート・バッジ・学習計画の判定ロジックを変更していない。
- [ ] モバイル幅で「今やること」「理由」「所要時間」がファーストビューで理解できる。

### Dependencies

- 既存today menu / learning queue
- `lib/checkpoints.ts`
- 復習・弱点情報

---

## GF-P0-002 行動効果の情報開示

**Priority:** P0  
**Status:** `NOT_STARTED`

### Purpose

「この学習をすると何が進むか」を行動前に理解させる。

### Functional Requirements

- Primary CTA直前に、確実または高確度で更新対象となる項目を最大3件表示する。
- 候補：
  - 弱点再測定
  - 復習キュー消化
  - 必須バッジ条件
  - CP進行
  - 測定証拠追加
- 合格準備度の具体的な上昇値は事前予測しない。
- 完了後の実測差分のみ具体値として表示可能とする。
- 既存ロジックから正確に算出できるXP等は補助情報として表示してよい。
- 学習成果をPrimary、ゲーム報酬をSecondaryとして扱う。

### Acceptance Criteria

- [ ] 架空数値・保証できない「+○%」を表示しない。
- [ ] 少なくとも1件の推奨理由または効果を表示する。
- [ ] 表示内容と実際の学習種別が矛盾しない。
- [ ] 学習効果情報がXP/宝箱より上位の視覚階層にある。

### Dependencies

- `GF-P0-001`
- CP/Badge/Reviewの既存判定ロジック

---

## GF-P0-003 成長確認チャレンジ（踊り場）

**Priority:** P0  
**Status:** `NOT_STARTED`

### Purpose

過去に難しかった内容を再度解ける体験を作り、過去の自分との比較で成長実感を提供する。

### Functional Requirements

- 過去に誤答または低習熟だった問題・トピックから短い成長確認チャレンジを生成する。
- 前回学習から一定期間が経過した対象を優先し、直後の丸暗記確認を避ける。
- 終了時に「以前の結果」と「今回の結果」を比較表示する。
- 既出問題はquestion exposureを`seen`として維持し、初見証拠へ戻さない。
- 保存する証拠は既存の分類・鮮度・重複排除ルールに従う。
- CPゲート特別突破や合格準備度へのボーナス加点は行わない。

### Acceptance Criteria

- [ ] 過去比較材料がないユーザーには表示しない。
- [ ] 比較対象が同一トピックまたは`canonicalQuestionId`系統として説明可能である。
- [ ] 既出問題で初見率が改善しない。
- [ ] 結果画面に「前回 → 今回」が明示される。
- [ ] 成長確認を行っただけでCP・必須バッジ条件が特別免除されない。

### Dependencies

- question exposure
- canonical question mapping
- mastery / answers history

---

## GF-P0-004 モチットの理解者的コミュニケーション

**Priority:** P0  
**Status:** `NOT_STARTED`

### Purpose

汎用リアクションから、ユーザーの学習状況を理解している相棒へ強化する。

### Functional Requirements

- モチット発言はイベント種別に加えて学習コンテキストを受け取れるようにする。
- コンテキスト候補：
  - 前回誤答 → 今回正答
  - 残り必須バッジ
  - CP突破可能
  - 復習完了
  - 自己ベスト
  - ストリーク救済
- P0はテンプレートベースを優先し、LLM依存を必須にしない。
- 事実＋次の一手を短く伝え、ユーザーを責めない。
- 具体的な数値・状態は表示時点の確定データから取得する。
- 汎用「ナイス！」等はフォールバックとして残す。

### Acceptance Criteria

- [ ] 具体メッセージは該当事実がある場合のみ表示される。
- [ ] 存在しない履歴・推測した成長を発言しない。
- [ ] モチット非表示時も学習機能に影響しない。
- [ ] 既存の短時間表示・`prefers-reduced-motion`配慮を維持する。
- [ ] 同一成果をCelebrationとモチットで過剰に重複通知しない。

### Dependencies

- Mochit event bus
- learning/session outcome context

---

## GF-P0-005 学習後の成果差分フィードバック

**Priority:** P0  
**Status:** `NOT_STARTED`

### Purpose

学習終了直後に「何が変わったか」を示し、達成欲求・有能欲求を満たす。

### Functional Requirements

- 学習開始前と完了後の状態差分を計算し、重要な変化を最大4件表示する。
- 候補：
  - 習熟度
  - 復習キュー
  - 弱点
  - バッジ
  - CP進捗
  - ストリーク
  - ランク
  - 合格準備度
  - 測定信頼度
- 合格準備度はサーバー再計算が成功し、比較可能な値がある場合のみ`X → Y`を表示する。
- 再計算未完了・証拠不足・値不変は「測定データを更新」等の事実表現を使う。
- XP・宝箱等は学習成果の後に補助報酬として表示する。
- 表示優先順位は `合格への意味 > 学習理解 > 進行 > ゲーム報酬` とする。

### Acceptance Criteria

- [ ] 少なくとも1件の実成果または測定更新を表示する。
- [ ] before/after比較基準が同一モデル・同一スキームで比較可能である。
- [ ] 演出だけで準備度・習熟度・弱点値を変更していない。
- [ ] Celebration / Mochit eventとの二重通知を避ける。
- [ ] 再計算失敗時でも学習完了処理そのものは成功する。

### Dependencies

- `GF-P0-001`, `GF-P0-002`
- integrated status / progress bootstrap
- session before/after state

---

## GF-P0-006 LINE学習リマインダー

**Priority:** P0  
**Status:** `NOT_STARTED`

### Purpose

アプリを開く前の無意識UXを整え、当日未学習と短期離脱からの復帰を支援する。

### Functional Requirements

- 通知は明示オプトイン制とする。
- ユーザーが通知時刻を設定・変更・停止できる。
- 定時リマインドは当日未学習ユーザーだけを対象とする。
- 送信直前に当日学習済みか再確認する。
- ストリーク危機通知は「失う」より「短時間で守れる」を主文にする。
- 3日以上離脱したユーザーには責めない復帰メッセージを送る。
- 同一目的の通知を同日複数回送らない。
- 通常リマインド、ストリーク危機、復帰通知を合わせても過剰送信しない上限を設定する。
- LINE push送信失敗は学習データ・ストリーク等へ影響させない。
- Cron実行は認証済みエンドポイントから行う。
- ユーザーのローカル日付/JST境界を正しく扱う。
- 通知タップで`/today`または適切な復帰/復習導線へ遷移する。

### Data / Idempotency

- `NotificationPreference`：optIn、希望時刻、timezone、通知種別等を永続化する。
- `NotificationDelivery`：重複防止・監査に必要な最小情報を保存する。
- 冪等キー例：`userId + notificationType + localDate`。

### Acceptance Criteria

- [ ] 通知OFFユーザーには送信されない。
- [ ] 当日学習済みユーザーへ通常リマインドが送信されない。
- [ ] 同一ユーザー・同一種別・同一日の重複送信を防止できる。
- [ ] 設定画面から時刻変更・停止が可能。
- [ ] 通知から`/today`または復帰ミッションへ直接遷移できる。
- [ ] Cron endpointが秘密情報で保護されている。
- [ ] LINE token等がクライアントへ露出しない。
- [ ] push失敗・Cron失敗時に学習状態へ副作用がない。

### Implementation Notes

- 既存LINE reply送信処理をpush対応に汎用化できるか実装時に確認する。
- `vercel.json` / Cron / `CRON_SECRET` / Supabase抽出の具体構成は実装開始時のリポジトリ状態に合わせて設計する。
- LP/login等で通知を訴求する場合、実機能と表現を一致させる。

---

# 7. P1 優先ファストフォロー要件

## P1 共通制約

- 3択宝箱は全候補を補助報酬に限定し、学習進行上の優劣を作らない。
- 欠片交換はコスメ・称号・記念品等に限定する。
- 合格準備度・必須バッジ・CP解放を欠片で直接購入できない。
- レア演出は色だけに依存せず、テキスト/アイコンでも区別する。
- ヒートマップは未学習日を「失敗」として扱わない。
- 合格宣言は任意。未達時に責める文言、損失、機能制限を付与しない。
- ミッションリロールは完了済み進捗を失わせない。

## P1 Requirement Index

| ID | Feature | Summary | Status |
|---|---|---|---|
| `GF-P1-001` | 学習量選択 | 5分/15分/30分等から量を選ぶ。何を学ぶかの優先順位はシステムが維持 | `NOT_STARTED` |
| `GF-P1-002` | 復帰ミッション | 2〜3日以上空いたユーザーに3〜5分の短い復帰ルート | `NOT_STARTED` |
| `GF-P1-003` | CP突破の非連続成長 | CP突破時にモチット成長・記念品・演出を連動 | `NOT_STARTED` |
| `GF-P1-004` | 学習ヒートマップ＋あゆみ | 日別学習、累計スタッツ、重要イベント年表 | `NOT_STARTED` |
| `GF-P1-005` | 報酬コレクション＋3択宝箱 | choice UI接続、欠片可視化、補助報酬への交換 | `NOT_STARTED` |
| `GF-P1-006` | レアリティ演出 | common/rare/epicをカード・glow・紙吹雪等で明確化 | `NOT_STARTED` |
| `GF-P1-007` | モチット命名 | 任意で命名・改名。未設定時は「モチット」 | `NOT_STARTED` |
| `GF-P1-008` | 単語帳図鑑 | カテゴリ別グリッド、コンプ率、カテゴリ達成 | `NOT_STARTED` |
| `GF-P1-009` | デイリーミッションリロール | 3件中1枠を1日1回差替可能 | `NOT_STARTED` |
| `GF-P1-010` | 合格宣言 | 試験日設定時に任意宣言。未宣言に不利益なし | `NOT_STARTED` |
| `GF-P1-011` | 世界観・ストーリー統一 | CP/バッジ/モチット/突破試験/報酬の語彙・演出統一 | `NOT_STARTED` |

## GF-P1-001 学習量選択

### Requirements

- 5分 / 15分 / 30分等、ユーザーが当日の学習量を選択可能にする。
- 学習すべき対象の優先順位はシステム側が維持する。
- ユーザーは主に「How much」を選び、「What」の最適化を壊さない。
- 選択時間内に収まるタスク構成を作る。

### Acceptance Criteria

- [ ] 時間を変えても優先弱点・期限復習が不当に後回しにならない。
- [ ] 5分選択時にも意味のある完了単位が存在する。
- [ ] 30分選択を強制・優遇しない。

---

## GF-P1-002 復帰ミッション

### Requirements

- 2〜3日以上学習が空いたユーザーを対象とする。
- 最初に大量の未完了タスクを表示せず、3〜5分の復帰ルートを提示する。
- 過去に学んだ内容から短い確認を行う。
- 責める文言を使わない。

### Acceptance Criteria

- [ ] 対象ユーザーに通常の重いtoday画面より先に復帰導線を提示できる。
- [ ] 復帰ミッション終了後に通常学習へ遷移可能。
- [ ] 復帰失敗にペナルティを課さない。

---

## GF-P1-003 CP突破の非連続成長

### Requirements

- CP突破を明確な節目として演出する。
- モチット成長段階・記念品等の既存/追加資産と連動する。
- 単なるXP増加ではなく「段階が変わった」ことを可視化する。

### Acceptance Criteria

- [ ] CP突破時に通常学習完了とは異なる節目演出がある。
- [ ] `prefers-reduced-motion`時は簡略化される。
- [ ] 演出によってCP判定ロジックを変更しない。

---

## GF-P1-004 学習ヒートマップ＋あゆみ

### Requirements

- 月間の日別学習量を中立的に可視化する。
- 累計スタッツを表示する。
  - 総解答数
  - 総正解数
  - 学習日数
  - 最長ストリーク
- 「あゆみ」年表に重要イベントを表示する。
  - CP突破
  - バッジ獲得
  - 自己ベスト等
- 可能な限り既存ログから導出し、重複保存を避ける。

### Acceptance Criteria

- [ ] 未学習日は失敗・警告色として扱わない。
- [ ] 日付境界がユーザーのローカル日付と一致する。
- [ ] 既存ログから再構築可能な値を不要に二重保存しない。

---

## GF-P1-005 報酬コレクション＋3択宝箱

### Requirements

- 既存`choice`ドロップをUIへ接続する。
- 3択はすべて「当たり」とし、学習上の損失を生まない。
- `badgeFragments`を「たからもの」等として可視化する。
- 欠片の交換先はコスメ・称号・記念品・モチット装飾等に限定する。
- `checkpoint_progress`等のJSONB拡張時はmerge/normalize/旧データ互換を同時対応する。

### Acceptance Criteria

- [ ] 3択表示 → 選択 → 保存 → 再読込後も選択結果が維持される。
- [ ] 再送・再描画で報酬が二重付与されない。
- [ ] 欠片で合格準備度、必須バッジ、CP進行を購入できない。
- [ ] 既存pityロジックが維持される。

---

## GF-P1-006 レアリティ演出

### Requirements

- common / rare / epic の結果差をテキスト・アイコン・演出で識別可能にする。
- rare / epicは視覚的な差をつける。
- 抽選中演出は短時間とする。
- `prefers-reduced-motion`を尊重する。
- render中の`Math.random`を追加しない。

### Acceptance Criteria

- [ ] 色覚に依存せずrarityを識別できる。
- [ ] 抽選演出が学習再開を大きく阻害しない。
- [ ] reduced motion時に過剰アニメーションが無効化される。

---

## GF-P1-007 モチット命名

### Requirements

- 任意でモチットに名前を付けられる。
- いつでも改名可能。
- 未設定時の表示名は「モチット」。
- 名前は必要な箇所の発言・プロフィール等へ反映する。
- 長さ・空値・禁止文字等のvalidationを定義する。

### Acceptance Criteria

- [ ] 命名しなくても全機能が利用可能。
- [ ] 改名後、再読込・端末同期後も保持される。
- [ ] 不正文字列を安全に処理する。

---

## GF-P1-008 単語帳図鑑

### Requirements

- カテゴリ別グリッドで単語進捗を可視化する。
- 状態を少なくとも以下で区別する。
  - 定着
  - 学習中
  - 未学習
- カテゴリごとのコンプ率を表示する。
- 既存のwordlist progressを可能な限り再利用する。
- カテゴリ達成をバッジ等に接続する場合は既存`badgeSignals`経路を優先する。

### Acceptance Criteria

- [ ] 既存単語進捗と図鑑状態が一致する。
- [ ] 未学習語を隠しすぎて教材検索性を落とさない。
- [ ] コンプ報酬が学習評価値を直接変更しない。

---

## GF-P1-009 デイリーミッションリロール

### Requirements

- 3件中1枠を1日1回だけ差替可能にする。
- 差替結果は同一日内で再現可能に保存する。
- 完了済みミッションを不利益にしない。
- リロールで既に獲得した進捗を失わせない。

### Acceptance Criteria

- [ ] 1日2回以上リロールできない。
- [ ] ページ再読込で差替結果が変わらない。
- [ ] 日付更新時に新しい当日状態へ切り替わる。

---

## GF-P1-010 合格宣言

### Requirements

- 試験日設定時等に任意で合格宣言できる。
- `pledgedAt`等の宣言情報を保存する。
- 宣言日・試験までの日数等を表示可能とする。
- 宣言しないユーザーに一切不利益を与えない。
- 未達時に責める文言を使わない。

### Acceptance Criteria

- [ ] 宣言はskip可能。
- [ ] 解除/再宣言の仕様が明確。
- [ ] 宣言有無で合格準備度・報酬・機能アクセスが変わらない。

---

## GF-P1-011 世界観・ストーリー統一

### Requirements

- CP、バッジ、モチット、突破試験、報酬の語彙・演出を統一する。
- 「ゲームそのもの」に寄せすぎず、ITパスポート学習コーチとしての信頼感を維持する。
- 同一概念を複数の異なる名前で表現しない。

### Acceptance Criteria

- [ ] 主要画面の用語監査を実施する。
- [ ] ゲーム語彙が学習上の意味を隠していない。
- [ ] 初見ユーザーが各機能の目的を理解できる。

---

# 8. P2 条件付き将来要件

| ID | Feature | Adoption Conditions | Status |
|---|---|---|---|
| `GF-P2-001` | 匿名同調表示 | 同じ試験月等の匿名集計。割合は母数目安30以上。母数未満は非表示。遅れを煽らない | `DEFERRED` |
| `GF-P2-002` | イースターエッグ / イベントフラグ | 特別リアクション・記念日等。学習成果値を水増ししない | `DEFERRED` |
| `GF-P2-003` | シェアカード | 明示操作のみ。氏名・苦手等はデフォルト非掲載 | `DEFERRED` |
| `GF-P2-004` | 期間イベント（安全版） | 復習の発見性・コスメ報酬等。曜日XP倍率で学習優先順位を歪めない | `DEFERRED` |

## GF-P2-001 匿名同調表示

- 同じ試験月等の匿名集計のみ扱う。
- 割合表示は十分な母数（目安30以上）がある場合のみ。
- 個人特定につながる細分化を行わない。
- 遅れを煽る表現は禁止。
- 実データなしの架空の「○%の人が学習済み」を表示しない。

## GF-P2-002 イースターエッグ / イベントフラグ

- 特別リアクション、記念日サプライズ、翌日予告等を対象とする。
- 学習成果値を水増ししない。
- ランダム付与はコスメ/少量XP等の補助報酬に限定する。
- 表示確率と実確率を意図的にずらさない。

## GF-P2-003 シェアカード

- CP突破・ランク・合格報告等をユーザーの明示操作で共有できる。
- 氏名、詳細学習履歴、苦手内容はデフォルト非掲載。
- 合格準備度の共有はユーザーが明示選択した場合のみ。

## GF-P2-004 期間イベント（安全版）

- 「復習フェス」等は復習の発見性・コスメ報酬を高める用途に限定する。
- 曜日だけでXP倍率を大幅変更し、学習優先順位を歪める仕様は採用しない。

---

# 9. UX・画面設計要件

## 9.1 `/today` の情報階層

| Layer | Role | Example |
|---|---|---|
| Primary | 今やること | 今日の最優先1件 / なぜ / 何分 / 何が進む / 開始CTA |
| Secondary | 実行の選択肢 | 今日のルート、代替学習、CPの次の一手 |
| Tertiary | 補助動機 | デイリーミッション、XP、ランク、宝箱、ストリーク |

- `TodayPolicyStrip`、`NextGoal`、`QuestRoute`等は役割を「方針」「実行」「補助進捗」に分離する。
- 同一内容を複数カードで繰り返さない。
- ファーストビューでは「今やること」「なぜ」「何分」「何が進む」が理解できること。

## 9.2 フィードバック優先順位

| Rank | Content | Example |
|---:|---|---|
| 1 | 学習成果 | 昨日間違えた問題に正解 / 習熟度58→66 |
| 2 | 合格への意味 | 弱点1件を再測定 / 必須バッジまであと1 |
| 3 | 進行・継続 | CP2 3/4 / ストリーク7日 |
| 4 | ゲーム報酬 | +10 XP / レア欠片 |

## 9.3 文言ルール

- ユーザーを責める表現を使用しない。
- 「必ず合格」「合格率が○%上がる」等、根拠のない保証表現を使用しない。
- スコアが暫定・測定中の場合はその状態を明示する。
- 未達成条件は「不足」だけでなく「何をすれば満たせるか」を併記する。
- ストリーク危機は「失う」より「短時間で守れる」を主文にする。
- 通知・宣言・同調は焦りを煽らず、次の具体行動を示す。

---

# 10. 習慣UX・通知要件

| Item | Requirement |
|---|---|
| オプトイン | 初期OFFまたは明示許諾後のみON。いつでも停止可能 |
| 時刻 | ユーザー指定時刻を優先。timezone/JST境界を統一 |
| 未学習判定 | 当日の学習イベント/完了状態を正とし、送信直前に再確認 |
| 重複防止 | `userId + notificationType + localDate`等の冪等キー |
| 頻度 | 通常/危機/復帰を合わせても過剰送信しない上限 |
| Deep link | `/today`または適切な復帰/復習導線 |
| Failure | push/Cron失敗は学習状態へ副作用なし |
| Measurement | 送信・配信成功・クリック・学習開始・完了を最小限に計測 |

---

# 11. 報酬・ランダム性要件

| Principle | Requirement |
|---|---|
| 教育との分離 | ランダム報酬で準備度・習熟度・必須バッジ・CP進行を変動させない |
| 出口 | 欠片を可視化し、コスメ・称号・記念品等へ交換可能にする |
| 選択 | 3択はすべて「当たり」とし、学習上の損失を作らない |
| レアリティ | common/rare/epicをテキスト・アイコン・演出で認識可能にする |
| 天井 | 既存pityを維持。変更時はテストで固定確認 |
| 確率の誠実性 | 表示確率と実確率を意図的にずらさない |
| 演出時間 | 短時間。スキップ/reduced motionを考慮 |

---

# 12. データ・ドメイン要件

| Data | Handling | Requirement |
|---|---|---|
| `TodayPrimaryAction` | 導出 | 既存推奨キュー・CP・復習情報から生成。保存必須ではない |
| `ActionImpact` | 導出 | 更新対象を説明。予測スコアは保持しない |
| `GrowthComparison` | 導出＋必要時保存 | 過去回答・習熟度から比較。既出判定を維持 |
| `MochitContext` | 導出 | イベント発火時に事実データから生成。本文永続化不要 |
| `SessionOutcome` | 導出 | 学習前後AppState / integrated status差分 |
| `NotificationPreference` | 永続化 | optIn、希望時刻、timezone、通知種別 |
| `NotificationDelivery` | 永続化/ログ | 冪等・運用監査に必要な最小情報 |
| `LearningHistorySummary` | 導出優先 | 既存question_attempts等から集計 |
| `LearningAlbumEvent` | 必要時永続化 | 再構築困難な重要イベントのみ |
| `RewardInventory` | 永続化 | badgeFragments、交換済み装飾等 |
| `MochitName` | 永続化 | 任意文字列。長さ・禁止文字・空値fallback |
| `DailyQuestReroll` | 永続化 | 日付、差替枠、結果を保存し同日再現可能 |
| `Pledge` | 永続化 | pledgedAt等。任意。解除/再宣言を定義 |

## 12.1 再現性・証拠管理との整合

- 合格準備度計算は `evidenceRevision / modelVersion / examSchemeVersion / calculationReferenceTime` の再現性条件を維持する。
- 成長確認で同一問題を再利用した場合、question exposureは`seen`を維持する。
- `canonicalQuestionId`単位の証拠処理、イベント重複排除、鮮度判定をゲームフル機能側から変更しない。
- ゲーム報酬イベントを学習証拠として扱わない。
- `checkpoint_progress`等のJSONB拡張時は`lib/mergeAppState.ts`等の明示マージ規則を同時更新する。
- XP付与は既存の単一窓口（`grantExp`等）を維持し、exp/levelの乖離を作らない。

---

# 13. 既存機能との統合ポイント

| Domain | Existing modules/screens | Policy |
|---|---|---|
| `/today` | `app/today/page.tsx`, `TodayPolicyStrip`, `QuestRoute`, `NextGoal` | Primary CTA中心に再編。通知からの着地点にもする |
| CP/バッジ | `lib/checkpoints.ts`, `lib/badges.ts`, `/badges` | 判定ロジック維持。「あと少し」とコレクション表示を活用 |
| 報酬 | `lib/dailyQuests.ts`, `lib/badgeDrops.ts`, `lib/celebration.ts` | choice UI、欠片出口、rarity演出を接続。新規ガチャ増設はしない |
| ストリーク | `lib/streak.ts`, `StreakBanner` | おまもり・節目を維持。通知でも救済型フレーミング |
| モチット | `FloatingMochit`, `floatingMochitMessages`, event bus | P0でコンテキスト化、P1で命名 |
| 進捗 | `/progress`, `JourneyLedger`, `NextUnlocks` | 成果差分、ヒートマップ、あゆみとの役割分担 |
| 単語帳 | `app/glossary`, wordlist progress, `badgeSignals` | 既存進捗から図鑑を導出 |
| LINE | 既存webhook/reply送信、user profile | push通知、設定、Cron追加。既存返信を壊さない |

---

# 14. 非機能要件

| Category | Requirement |
|---|---|
| 性能 | `/today` Primary表示のために新たな直列ネットワーク往復を増やさない。既存cache/bootstrap/local state優先 |
| 通知性能 | Cronはバッチ処理し、timeout/rate limit/部分失敗に耐える |
| 信頼性 | 報酬、通知、履歴イベントは再実行で二重付与・二重送信・二重記録しない |
| 整合性 | CP/バッジ数は共通domain logicを正とし、UI独自計算を作らない |
| Accessibility | keyboard、aria、`prefers-reduced-motion`維持。重要情報を色だけで区別しない |
| Responsive | スマートフォン幅でPrimary CTAと成果差分が1画面内で理解可能 |
| Privacy | 通知・同調・共有は必要最小限。socialは匿名集計、共有は明示操作 |
| Security | Cron endpointを秘密情報で保護。LINE token等をclientへ露出しない |
| Observability | 表示・開始・完了・通知・クリック等を計測可能にする。不要な学習詳細を外部分析へ送らない |
| Purity | React render中の`Math.random`等、既存lintに反する非決定処理を追加しない |

---

# 15. KPI・計測要件

ゲームフル施策は「滞在時間」「宝箱開封率」単独では評価しない。学習行動・再訪・実力測定を中心に評価する。

| KPI | Definition | Direction |
|---|---|---|
| Primary CTA開始率 | Primary表示セッションのうち開始した割合 | ↑ |
| 学習セッション完了率 | 開始した推奨学習を完了した割合 | ↑ |
| 推奨復習完了率 | 期限/弱点由来の復習が完了した割合 | ↑ |
| D1 / D7再訪率 | 初回または学習日から1日/7日後の再訪 | ↑ |
| 通知→学習開始率 | リマインダーから当日学習を開始した割合 | 観測/改善 |
| 通知停止率 | 通知ONユーザーの停止割合 | 悪化監視 |
| 復帰成功率 | 2〜3日以上空いたユーザーが復帰ミッションを完了した割合 | ↑ |
| 成長確認改善率 | 成長確認で過去結果を上回った割合 | 観測 |
| 報酬選択率 | 3択宝箱表示後に選択完了した割合 | 観測 |
| 単語帳図鑑進行率 | 図鑑閲覧者の定着語増加・再訪 | 観測 |
| 準備度信頼度 | confidence level / evidence volume等 | 改善 |
| 不正なスコア上昇 | 既出問題・報酬のみで準備度が不適切に上昇する事象 | **0件** |

---

# 16. テスト要件

## 16.1 Unit Tests

- Primary Action選定：復習期限、弱点、CP条件、新規学習が競合した場合の優先順位。
- ActionImpact：保証できないスコア予測を返さない。
- GrowthComparison：過去結果なし、既出問題、canonical重複、日付境界。
- MochitContext：事実がない場合に具体メッセージを生成しない。
- SessionOutcome：before/after差分、値不変、再計算失敗時のfallback。
- Notification eligibility：opt-in、学習済み、時刻、ストリーク危機、離脱日数。
- Notification idempotency：同一日・同一種別の重複防止。
- Badge drop choice：choice反映、pity、再受取防止、rarity。
- Daily quest reroll：1日1回、完了済み保護、日付更新。
- JSONB merge：新フィールドが端末間マージで欠落しない。

## 16.2 Integration / E2E Tests

- `/today`表示 → Primary開始 → 学習完了 → 成果差分 → 次行動。
- CP条件あと1件 → 該当学習完了 → ゲート表示更新。
- 既出問題を成長確認で解いてもfirst exposureに戻らない。
- モチット非表示、reduced motion、未ログイン/サーバー失敗時も学習可能。
- 宝箱choice → 選択 → 欠片/装飾反映 → 再読込後も維持。
- 通知ON → 未学習 → 送信。
- 学習済み → 非送信。
- 通知OFF → 非送信。
- 通知タップ → 適切なdeep link → 学習開始。
- 報酬受取・イベント再送でXP、欠片、履歴が二重付与されない。

## 16.3 Required Verification per PR

- unit tests
- integration tests
- relevant E2E
- lint
- typecheck
- build
- existing regression tests

既存テストを削除・skip・無効化して成功扱いにしてはならない。

---

# 17. 推奨実装順序 / PR分割

## 17.1 Recommended PR Map

| PR | Requirement IDs | Main Scope |
|---|---|---|
| PR1 | `GF-P0-001`, `GF-P0-002`, `GF-P0-005` | コア学習UX：Primary CTA、効果開示、学習後差分 |
| PR2 | `GF-P0-004` | モチット理解者化 |
| PR3 | `GF-P0-003` | 成長確認チャレンジ・exposure整合 |
| PR4 | `GF-P0-006` | LINE通知・設定・Cron・冪等 |
| PR5 | `GF-P1-005`, `GF-P1-006` | 3択宝箱・欠片出口・レア演出 |
| PR6 | `GF-P1-004`, `GF-P1-008` | ヒートマップ/あゆみ・単語帳図鑑 |
| PR7 | `GF-P1-001`, `GF-P1-002`, `GF-P1-009`, `GF-P1-010` | 自律性・復帰・リロール・宣言 |
| PR8 | `GF-P1-003`, `GF-P1-007`, `GF-P1-011` | モチット成長・命名・世界観統一 |
| P2 PRs | `GF-P2-*` | 条件達成時のみ個別実験 |

実際の依存関係調査でより安全な分割が判明した場合、PR分割は変更してよい。ただし要件IDの追跡性は維持する。

## 17.2 Step Sequence

| Step | Target | Completion condition |
|---:|---|---|
| 0 | 実装前プリフライト | canonical copy、main/origin/main、draft PR、未コミット差分確認。並行作業を別branch/worktreeへ分離 |
| 1 | `GF-P0-001`, `002` | `/today` Primary CTAと行動効果、重複表示整理 |
| 2 | `GF-P0-005` | 学習完了時の成果差分を共通ロジックで表示 |
| 3 | `GF-P0-004` | モチットへ事実ベース学習コンテキスト連携 |
| 4 | `GF-P0-003` | 成長確認追加。exposure/証拠ルール回帰テスト |
| 5 | `GF-P0-006` | LINE通知設定・対象抽出・push・冪等・Cron |
| 6 | P0統合QA | E2E、性能、a11y、スコア整合、通知頻度確認 |
| 7 | `GF-P1-005`, `006`, `008` | 既存資産接続効果が高い報酬/レア演出/単語帳図鑑 |
| 8 | P1残り | KPIと依存関係で優先 |
| 9 | P2 | 利用者数・運用体制・母数が条件を満たした施策のみ |

---

# 18. 明示的な非要件

以下は明示承認なしに実装しない。

- サンクコストを煽って離脱を防ぐ表現。
- 他者に報酬を奪われる横取り恐怖。
- 強いFOMOや過度な不安訴求。
- ユーザーの実力不足を隠すハッピーブラインドネス。
- 学習成果やCP進行を運で左右するブースター。
- 人工的な供給制限、学習を止めるダウンタイム。
- 激しい光・音・眩暈感を狙う演出。
- 利用者数が少ない段階での全国ランキング・序列化。
- 根拠のない同調表示。
- 表示確率と実際の抽選確率を意図的にずらす「期待値超過」仕様。
- 曜日や期間だけで学習XPを大幅倍率化し、学習優先順位を歪める設計。
- 通知OFF・宣言未実施・共有未実施のユーザーへの不利益。

---

# 19. Definition of Done

## 19.1 P0 DoD

- [ ] `GF-P0-001`〜`GF-P0-006`のAcceptance Criteriaをすべて満たす。
- [ ] 既存の質問・回答・CP・バッジ・ストリーク・報酬の主要テストが回帰しない。
- [ ] 合格準備度・習熟度・初見判定にゲーム演出由来の不正な加点がない。
- [ ] 同一成果が複数カード・モチット・celebrationで過剰に重複通知されない。
- [ ] `/today`のファーストビューで「今やること」「なぜ」「何分」「何が進む」が理解できる。
- [ ] 通知はopt-in・停止可能・学習済み抑止・重複防止を満たす。
- [ ] モバイル・デスクトップ・reduced motionで主要導線が利用できる。
- [ ] Primary開始率、完了率、通知→学習開始等を計測可能。

## 19.2 P1/P2 Common DoD

- [ ] 新規報酬・ソーシャル機能が学習証拠や合格準備度を直接変更しない。
- [ ] 新規JSONBフィールドはmerge・旧データ互換・端末間同期をテスト済み。
- [ ] ソーシャル表示は匿名性・十分な母数・明示opt-in（共有時）を満たす。
- [ ] ランダム性は誤認を招く確率表示を行わない。

---

# 20. ゲームフル手法 → 要件トレーサビリティ

| Gameful technique | Requirement | Priority |
|---|---|---|
| 初期設定 / 単純化 / フレーミング | `GF-P0-001` | P0 |
| 情報開示 / 期待 | `GF-P0-002` | P0 |
| 踊り場 / 有能欲求 / 原体験想起 | `GF-P0-003` | P0 |
| 理解者的コミュニケーション / メンターシップ | `GF-P0-004` | P0 |
| 達成欲求 / ポジティブフィードバック | `GF-P0-005` | P0 |
| リマインダー / クイックルーティン / 首の皮一枚 | `GF-P0-006` | P0 |
| 自律的選択 / 複数最適解 | `GF-P1-001`, `GF-P1-009` | P1 |
| 緊張の緩和 / 一縷の望み | `GF-P1-002` | P1 |
| 非連続成長 / 達成演出 / 視覚的インパクト | `GF-P1-003`, `GF-P1-006` | P1 |
| ヒストリー / 保存欲求 / 進捗可視化 | `GF-P1-004` | P1 |
| コレクション / 保有先行 / 獲得欲求 | `GF-P1-005`, `GF-P1-008` | P1 |
| 社会的対象化 / ネームプレート | `GF-P1-007` | P1 |
| コミットメント / 使命感 | `GF-P1-010` | P1 |
| 世界観 / ストーリーテリング | `GF-P1-011` | P1 |
| 同調 / 所属意識 / 相対的進捗 | `GF-P2-001` | Conditional P2 |
| イースターエッグ / イベントフラグ | `GF-P2-002` | Conditional P2 |
| ショーケース / ドヤスペース | `GF-P2-003` | Conditional P2 |
| 時限付きチャンス | `GF-P2-004` | Safe P2 only |

---

# 21. Requirement Implementation Tracker

この表を各PR完了時に更新する。

| Requirement | Priority | Status | PR | Tests | Notes |
|---|---:|---|---|---|---|
| `GF-P0-001` | P0 | `NOT_STARTED` | - | - | Today Primary |
| `GF-P0-002` | P0 | `NOT_STARTED` | - | - | Action impact |
| `GF-P0-003` | P0 | `NOT_STARTED` | - | - | Growth challenge |
| `GF-P0-004` | P0 | `NOT_STARTED` | - | - | Contextual Mochit |
| `GF-P0-005` | P0 | `NOT_STARTED` | - | - | Session outcome |
| `GF-P0-006` | P0 | `NOT_STARTED` | - | - | LINE reminder |
| `GF-P1-001` | P1 | `NOT_STARTED` | - | - | Session length choice |
| `GF-P1-002` | P1 | `NOT_STARTED` | - | - | Comeback mission |
| `GF-P1-003` | P1 | `NOT_STARTED` | - | - | CP evolution |
| `GF-P1-004` | P1 | `NOT_STARTED` | - | - | Heatmap/journey |
| `GF-P1-005` | P1 | `NOT_STARTED` | - | - | Reward inventory |
| `GF-P1-006` | P1 | `NOT_STARTED` | - | - | Rarity feedback |
| `GF-P1-007` | P1 | `NOT_STARTED` | - | - | Mochit naming |
| `GF-P1-008` | P1 | `NOT_STARTED` | - | - | Glossary collection |
| `GF-P1-009` | P1 | `NOT_STARTED` | - | - | Quest reroll |
| `GF-P1-010` | P1 | `NOT_STARTED` | - | - | Pledge |
| `GF-P1-011` | P1 | `NOT_STARTED` | - | - | Narrative consistency |
| `GF-P2-001` | P2 | `DEFERRED` | - | - | Requires sufficient population |
| `GF-P2-002` | P2 | `DEFERRED` | - | - | Conditional experiment |
| `GF-P2-003` | P2 | `DEFERRED` | - | - | Conditional sharing |
| `GF-P2-004` | P2 | `DEFERRED` | - | - | Safe event only |

---

# 22. 実装前プリフライト

実装開始時に必ず実施する。

1. canonicalな作業コピーを確認する。
2. `git fetch`を行う。
3. `main` / `origin/main` / 現在branch / 未マージPR / working tree差分を確認する。
4. 以前の提案書に記載された「`~/Developer/it-learning-app`がcanonical」「draft PR#16と本番が乖離」は固定前提にせず、開始時点で再確認する。
5. Claude Code・Codex等を並行利用する場合、同一working treeへ直接並行編集しない。branch/worktreeを分離する。
6. 既存変更を消す可能性がある`reset`、`checkout`、`stash apply`等は変更所有者を確認してから行う。
7. `checkpoint_progress`等のschema/JSONBを変更するPRは、アプリ側merge/normalize/DB migration/testを同一PRで完結させる。
8. XP付与経路が`grantExp`等の既存共通窓口を通ることを確認する。
9. React render中に`Math.random`等の非純粋処理を追加しない。

---

# 23. 現行コード参照（開始時に再確認）

- `app/today/page.tsx`
- `components/today/TodayPolicyStrip.tsx`
- `components/today/StreakBanner.tsx`
- `components/today/DailyQuestCard.tsx`
- `components/quest/QuestRoute.tsx`
- `lib/nextGoals.ts`
- `lib/checkpoints.ts`
- `lib/badges.ts`
- `lib/dailyQuests.ts`
- `lib/badgeDrops.ts`
- `lib/celebration.ts`
- `lib/game.ts`
- `lib/rank.ts`
- `lib/streak.ts`
- `components/mochit/FloatingMochit.tsx`
- `components/mochit/floatingMochitMessages.ts`
- Mochit event bus関連
- `app/progress/page.tsx`
- `components/progress/JourneyLedger.tsx`
- `components/progress/NextUnlocks.tsx`
- `app/onboarding/page.tsx`
- `app/glossary/page.tsx`
- `badgeSignals`関連
- LINE webhook / 送信処理
- `user_profiles`
- 進捗保存 / `mergeAppState`関連

---

# 24. Claude Codeへの実装指示規約

Claude Codeに各PRを依頼する際、最低限以下を含める。

```text
正規仕様: docs/requirements/gameful-design-v2.md
対象要件: GF-Px-xxx[, GF-Px-xxx...]

最初に正規仕様の対象要件、依存関係、Acceptance Criteriaを読み、
現在コードとの差分を確認してください。

対象外の要件は実装しないでください。
既存の他者作業を削除・上書き・巻き戻ししないでください。

実装後は対象Acceptance Criteriaごとに、
- 実装箇所
- テスト
- 確認結果
を対応付けて報告してください。

lint / typecheck / relevant tests / build を実行し、
既存テストをskip・削除して成功扱いにしないでください。

コミット前に Requirement Implementation Tracker の更新案も提示してください。
```

---

# 25. 最終判断原則

> ゲームフル手法の対応率ではなく、
> **「望ましい学習行動 → 実力向上 → 成長実感 → 再訪」**
> に寄与するかで採否を決める。

