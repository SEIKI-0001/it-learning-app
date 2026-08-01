# 統一問題バンク

アプリが出題する問題の**データの正**。取得は必ず `lib/questionBank/` 経由で行い、
画面・API からこの配下の JSON を直接 import しない。

```text
data/question-bank/
├── index.ts                       # JSON を束ねる唯一の場所
├── original/exam-level.json       # アプリ独自問題（146問）
├── official/ipa/                  # 公式過去問（令和8年度 ITパスポート 100問）
├── explanations/                  # 公式問題に対するアプリ独自の解説（原文と分ける）
├── sources/                       # 公式原文の転記結果（取り込みの入力）
├── candidates/ai-generated/       # AI生成問題の候補（取り込み前。README 参照）
├── reviews/                       # 公開前レビュー記録（1問1ファイル。README 参照）
├── quality-baseline.json          # 既存問題に残る既知 warning（新規悪化だけを検出するため）
└── manifests/                     # 生成時の件数・ID一覧（ドリフト検知用）
```

## status の意味 —— 出題可否のスイッチではない

`status` は**品質の監査がどこまで進んだか**を表す。出題するかどうかとは別軸。

| status | 意味 |
|---|---|
| `draft` | 未監査 |
| `content_verified` | 問題文・選択肢・正答を監査済み |
| `explanation_verified` | 解説の妥当性まで監査済み |
| `published` | 公開可。`contentHash` と `reviewedAt` / `reviewedBy` が必須 |
| `retired` | 出題停止（履歴保持のため削除はしない） |

### 現状: 既存146問は「draft だが確認パックでは出題中」

`original/exam-level.json` の146問は **`status: "draft"` のまま確認パックで出題されている。**
これは意図した状態で、矛盾ではない。

- 移行時に確認したのは「移行前後で内容が完全一致すること」だけ。
  問題内容の正確性・本試験水準としての品質は**まだ監査していない**。
- 今回の基盤作りの動機自体が既存問題の品質不足なので、
  ここで `content_verified` にすると今後“本当に監査した問題”と区別できなくなる。
- 確認パック（`data/topicCheckPacks.ts`）は**問題IDを明示的に参照**して出題する。
  `lib/checkPack.ts` → `getQuestionById()` は status で絞らないため、draft でも従来どおり解決する。

したがって:

- `getQuestionById()` … status を問わず引ける（**確認パックはこちら**）
- `getPublishedQuestions()` … `published` だけを返す。移行した既存問題は含まれない

既存問題を監査したら status を引き上げていく。`published` にする際は
`reviewedAt` / `reviewedBy` を必ず埋める（無いと `npm run validate:questions` が落ちる）。

## origin と公式出典の対応

| origin | `official`（出典情報） | `isModified` | `derivedFromQuestionId` | `generation` | status |
|---|---|---|---|---|---|
| `official_past` | **必須** | `false` | 付けない | 付けない | 制限なし |
| `modified_official` | **必須** | `true` | **必須** | 付けない | `published` は承認記録が必要 |
| `app_original` | 持たない | — | 付けない | 付けない | 制限なし |
| `ai_generated` | 持たない | — | 付けない | **必須（公開後も保持）** | `published` は承認記録が必要（下記） |

`modified_official` は公式問題を改変したものなので、**出典は必要**（非公式扱いにしない）。
加えて `official.derivedFromQuestionId` で改変元を明示する。改変問題が元の公式問題と
似ているのは当然なので、類似度検査の block 判定から外す必要があり、その根拠になる値。

AI生成問題が「どの公式問題を参考にしたか」は `generation.referenceQuestionIds` に持たせる。
`official` フィールドを流用しない。出典表示に使われるフィールドに
「参照しただけの問題」を入れると、出典表記が事実と食い違うため。

### AI生成問題の公開

**`origin` を `app_original` に書き換えて公開してはいけない。**
`generation` は `ai_generated` にしか付けられないので、origin を移すと来歴（どのモデルの
どのプロンプトで、いつ作った問題か）が消える。出題実績を分析するときに AI 生成問題を
識別できなくなり、生成方針に問題が見つかってもまとめて撤回できなくなる。

公開は `origin: "ai_generated"` のまま `status` を上げて行う。
`draft` → `content_verified` → `explanation_verified` → `published` の順路は
他の origin と同じで、`published` に上げるには次を**すべて**満たす必要がある。

| 条件 | 検査する場所 |
|---|---|
| `generation` の provider / model / promptVersion / generatedAt が埋まっている | `lib/questionBank/validate.ts` |
| `contentHash` が本文と一致する | 同上 |
| `reviewedAt` / `reviewedBy` が埋まっている | 同上 |
| `reviews/<question-id>.json` があり `decision` が `approve` | `lib/questionQuality/reviews.ts` |
| `contentReviewedBy` / `explanationReviewedBy` / `similarityReviewedBy` が埋まっている | 同上 |
| レビュー記録の `questionId` / `version` が問題側と一致する | 同上 |
| 類似度が `block` 帯に該当しない | `lib/questionQuality/gate.ts` |
| blocker が1件も無い | `lib/questionQuality/report.ts` |

`similarityReviewedBy` は、類似度が `review_required` 帯でなくても AI 生成問題では必須。
AI は既存問題の言い回しをなぞりやすく、閾値の下でも既視感のある問題が残るため。

**status を自動で書き換える処理はどこにも無い。** `published` にするのは、
Git 管理された問題データを人が明示的に編集する操作だけ
（`npm run questions:import:candidates` は常に `draft` で取り込み、status を上げない）。

## 公開前の品質検査

```bash
npm run questions:quality-report                      # 品質レポートを生成（blocker があれば失敗）
npm run questions:quality-report -- --update-baseline # 既知 warning を固定し直す
```

出力は `reports/question-quality/latest.json` と `latest.md`。
`npm run validate:questions` は blocker が1件でもあれば落ちる。

検査の中身:

- **類似度** … 外部APIを使わない決定的な検査（文字bi-gram Dice）。
  `exact_duplicate` / `block`（0.92）/ `review_required`（0.80）/ `notice`（0.70）。
  実装は `lib/questionQuality/similarity.ts`、閾値は `lib/questionQuality/thresholds.ts`。
- **品質ゲート** … 選択肢の重複・正答ヒント・解説の矛盾など（`lib/questionQuality/rules.ts`）。
  機械的に断定できるものだけが blocker で、それ以外はすべて warning。
- **レビュー記録** … `reviews/` の承認状況（`lib/questionQuality/reviews.ts`）。

既存問題に残る warning は `quality-baseline.json` に固定してある。
検証が落ちるのは **新しく増えた warning** と blocker だけ。
既存問題を直すときはベースラインも更新すること。

## 実測難易度

```bash
npm run questions:analyze-quality      # Supabase の回答実績から算出
npm run questions:analyze-quality -- --fixture test/fixtures/questionAttempts.sample.json
```

主指標は「同一ユーザー・同一問題・同一version の**最初の回答**」だけで作る
（復習による正答率の上昇を難易度に混ぜないため）。

結果は `question_quality_metrics` テーブルと `reports/question-quality/difficulty.{json,md}` へ。
**`recommendedDifficulty` は推奨値であって、`estimatedDifficulty` を自動更新することはない。**

## contentHash

形式は `sha256:` + 64文字の小文字hex。実装は `lib/questionBank/contentHash.ts`。

計算対象は **prompt / choices（key昇順）/ correctChoice / explanation のみ**。
status・tags・official・レビュー情報などのメタ情報は含めない
（メタ更新だけでハッシュが動くと、本文変更の検知が鈍るため）。

## 再生成

```bash
npm run questions:migrate            # data/examLevelQuestions.ts から再生成
npm run questions:import:ipa:2026    # 公式過去問（令和8年度 ITパスポート）を再生成
npm run questions:import:candidates  # AI生成候補を取り込む（candidates/ai-generated/）
npm run validate:questions           # 整合性検証 + 品質ゲート
```

生成物は決定的（実行時刻を持たない）。入力が変わっていなければ
`git diff --exit-code -- data/question-bank` は差分ゼロになる。
