# 公開前レビュー記録

問題1件につき1ファイル（`<question-id>.json`）を置きます。

問題本文（`data/question-bank/**/*.json`）とは別ファイルにしています。
「誰がいつ承認したか」は本文の一部ではないので、本文のハッシュ（`contentHash`）に
含めたくないためです。混ぜると、レビューを追記しただけで本文が変わったように見えます。

## 形式

```json
{
  "questionId": "ai-strat-intellectual-property-001",
  "version": 1,
  "contentReviewedBy": "kobayashi",
  "explanationReviewedBy": "kobayashi",
  "similarityReviewedBy": "kobayashi",
  "reviewedAt": "2026-08-01T09:00:00.000Z",
  "decision": "approve",
  "notes": "公式問11と論点が近いが、問う角度が違うことを確認した。",
  "authoredBy": "claude-opus-5"
}
```

| 項目 | 必須 | 意味 |
| --- | --- | --- |
| `questionId` | ○ | 対象の問題ID。ファイル名と一致させる |
| `version` | ○ | レビューした時点の `QuestionRecord.version` |
| `contentReviewedBy` | ○ | 問題文・選択肢・正答を確認した人 |
| `explanationReviewedBy` | ○ | 解説・選択肢別解説を確認した人 |
| `similarityReviewedBy` | | 類似度検査の結果を確認した人 |
| `reviewedAt` | ○ | ISO8601 |
| `decision` | ○ | `approve` / `revise` / `reject` |
| `notes` | | 判断の理由 |
| `authoredBy` | | 作問者。レビュー者と同一なら warning が出る |

## 公開の制約

`npm run validate:questions` / `npm run questions:quality-report` が検査します。

- `origin: "ai_generated"` と `origin: "modified_official"` は、
  **`decision: "approve"` の記録がなければ `published` にできません**
- 類似度が `review_required` 帯（0.80 以上）の問題を `published` にするには、
  `similarityReviewedBy` まで埋まった `approve` の記録が必要です
- `version` が問題側と食い違う記録は失効扱いです。
  本文を直して `version` を上げたら、レビューもやり直してください
- 作成者とレビュー者が同じ場合は warning が出ます（公開は止めません）

なお `origin: "ai_generated"` は `status: "draft"` に固定されているため、
そもそも `published` にはできません。公開したい場合は、人の手で内容を確認・修正したうえで
`app_original` として作り直してください（AI の生成物をそのまま公開しない、という方針です）。
