# 統一問題バンク

アプリが出題する問題の**データの正**。取得は必ず `lib/questionBank/` 経由で行い、
画面・API からこの配下の JSON を直接 import しない。

```text
data/question-bank/
├── index.ts                       # JSON を束ねる唯一の場所
├── original/exam-level.json       # アプリ独自問題（146問）
├── official/ipa/                  # 公式過去問（未収録。README 参照）
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

| origin | `official`（出典情報） | `isModified` |
|---|---|---|
| `official_past` | **必須** | `false` |
| `modified_official` | **必須** | `true` |
| `app_original` | 持たない | — |
| `ai_generated` | 持たない | — |

`modified_official` は公式問題を改変したものなので、**出典は必要**（非公式扱いにしない）。

AI生成問題が「どの公式問題を参考にしたか」を持たせたくなった場合は、
`official` フィールドを流用しない。出典表示に使われるフィールドに
「参照しただけの問題」を入れると、出典表記が事実と食い違うため。
将来 `referenceQuestionIds` 等の別フィールドを追加する（今回は未実装）。

## contentHash

形式は `sha256:` + 64文字の小文字hex。実装は `lib/questionBank/contentHash.ts`。

計算対象は **prompt / choices（key昇順）/ correctChoice / explanation のみ**。
status・tags・official・レビュー情報などのメタ情報は含めない
（メタ更新だけでハッシュが動くと、本文変更の検知が鈍るため）。

## 再生成

```bash
npm run questions:migrate      # data/examLevelQuestions.ts から再生成
npm run validate:questions     # 整合性検証
```

生成物は決定的（実行時刻を持たない）。入力が変わっていなければ
`git diff --exit-code -- data/question-bank` は差分ゼロになる。
