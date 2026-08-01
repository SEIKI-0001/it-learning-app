# 問題候補（公開前の置き場）

ここに置くのは「まだ問題バンクに入っていない問題の候補」です。
`data/question-bank/` 直下の JSON（＝出題される問題）とは別物として扱います。

```
candidates/
  ai-generated/           AI が生成した候補（*.json）
  ai-generated/example.candidate.json   書き方の見本（取り込み対象外）
```

## AI生成問題の扱い

**アプリの実行時に AI で問題を生成することはしません。**
本番リクエスト中に外部 AI を呼ぶ経路は作らず、生成はすべてオフラインで行います。

理由:

- 同じ問題が毎回同じ内容になること（再現性）を保てる
- 生成物を人がレビューしてから公開できる
- 出題のたびに費用と遅延が発生しない
- 生成に失敗しても出題が止まらない

手順:

1. Claude / Codex などで問題を作り、下の形式の JSON にする
2. `data/question-bank/candidates/ai-generated/` に置く
3. `npm run questions:import:candidates` で取り込む
4. `npm run questions:quality-report` で品質ゲートに通す
5. レビュー記録（`data/question-bank/reviews/<question-id>.json`）を作る
6. 公開するときは `data/question-bank/ai-generated/candidates.json` を手で編集し、
   `status` を `published` にして `reviewedAt` / `reviewedBy` を埋める

取り込まれた AI 生成問題は **必ず `draft`** になります
（`scripts/question-bank/candidate-record.mjs` が `origin` / `status` / `version` を固定）。
候補 JSON がこれらを指定していたら、無視ではなく**取り込みごと拒否**します。

`draft` から先へ status を上げる自動処理はありません。**公開は人の操作だけ**で、
条件を満たしているかは品質ゲートが検査します（[../README.md](../README.md) の
「AI生成問題の公開」を参照）。

公開しても **`origin` は `ai_generated` のまま**にしてください。
`app_original` などへ書き換えると `generation`（来歴）を持てなくなり、
どのモデルで作った問題かを後から追えなくなります。

## 候補 JSON の形式

```json
{
  "schemaVersion": 1,
  "generation": {
    "provider": "anthropic",
    "model": "claude-opus-5",
    "promptVersion": "ip-v1",
    "generatedAt": "2026-08-01T00:00:00.000Z"
  },
  "questions": [
    {
      "id": "ai-strat-intellectual-property-001",
      "primaryTopicId": "strat-intellectual-property",
      "questionPattern": "knowledge",
      "prompt": "…",
      "choices": [
        { "key": "A", "text": "…" },
        { "key": "B", "text": "…" },
        { "key": "C", "text": "…" },
        { "key": "D", "text": "…" }
      ],
      "correctChoice": "A",
      "explanation": "…",
      "estimatedDifficulty": 2,
      "tags": ["知的財産権"],
      "referenceQuestionIds": ["ipa-it-passport-2026-q011"]
    }
  ]
}
```

- `version` / `status` / `origin` / `contentHash` / `reviewedAt` / `reviewedBy` は
  取り込みスクリプトが決めます。候補 JSON には書きません
  （書いてあると「AI が公開状態を決められる」形になってしまうため）。
- `generation` はファイル単位でも問題単位でも書けます。問題単位が優先されます。
- `referenceQuestionIds` は **出典ではありません**。作問時に参考にした / 品質比較の
  対象にした問題IDで、既存の問題バンクに実在する必要があります。
  「この公式問題をもとに出題した」と主張したい場合は AI 生成ではなく
  `modified_official` + `official.derivedFromQuestionId` を使ってください。
- `*.candidate.json` で終わるファイルは見本として扱い、取り込みません。
