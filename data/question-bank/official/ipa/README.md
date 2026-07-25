# 公式過去問（IPA）の収録場所

このディレクトリには、IPA（独立行政法人情報処理推進機構）が公開した過去問を
`QuestionBankFile` 形式の JSON として置く。**本 PR ではまだ1件も収録していない。**

## ファイル命名

```text
official/ipa/it-passport-<年度>.json
```

例: `it-passport-2023.json`

## 収録するときの決まり

- `origin` は原文出題なら `"official_past"`、改変したなら `"modified_official"`。
- `official.isModified` は origin と必ず整合させる
  （`official_past` は `false`、`modified_official` は `true`）。
  ずれていると `npm run validate:questions` が落ちる。
- `official.original` に**公開時点の原文**（prompt / choices / correctChoice）を保存する。
  表示用に正規化した `prompt` / `choices` でここを上書きしない。
  出典表示の正確さと、改変有無の検証がここに依存している。
- `explanation` は**アプリ独自の解説**を書く。公式解答・解説の転載はしない。
- `sourceUrl`（問題冊子）と `answerSourceUrl`（解答表）は必須。
- 収録したら `data/question-bank/index.ts` の `questionBankFiles` に追加する。
- ID は他ファイルと重複させない。重複するとローダーが例外を投げる。

## 出典表示

`attribution` は画面に出す表記。出題画面での出典表示 UI は次の PR で実装する。
