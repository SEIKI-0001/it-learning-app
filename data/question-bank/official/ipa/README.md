# 公式過去問（IPA）の収録場所

このディレクトリには、IPA（独立行政法人情報処理推進機構）が公開した過去問を
`QuestionBankFile` 形式の JSON として置く。

## 収録済み

| ファイル | 内容 | 件数 | status |
| --- | --- | --- | --- |
| `it-passport-2026.json` | 令和8年度 ITパスポート試験 公開問題 | 100問 | `content_verified` |

`it-passport-2026.json` は**手で編集しない**。生成物なので、直したいときは入力側

```text
data/question-bank/sources/official/ipa/it-passport-2026.source.json
```

を直して `npm run questions:import:ipa:2026` を実行する。
入力が同じなら出力も同じになる（実行時刻などを埋め込まない）。

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
  ただし解説は `status` が `explanation_verified` / `published` のときだけ必須。
  原文を収録しただけの `content_verified` 段階では空でよい
  （埋めるためだけの解説を書かせないため）。
- `sourceUrl`（問題冊子）と `answerSourceUrl`（解答表）は必須。
- 収録したら `data/question-bank/index.ts` の `questionBankFiles` に追加する。
- ID は他ファイルと重複させない。重複するとローダーが例外を投げる。

## 図表

問題成立に必要な図・表は公式PDFのページ画像から切り出して

```text
public/question-bank/official/ipa/it-passport/<年度>/q<問番号3桁>-figure-<連番>.png
```

に置く。描き直し・AI生成はしない。切り出し元のページ番号とピクセル座標は
source.json の `figures[].pdfPage` / `pdfRect` に残してあるので後から照合できる。

`official.original.figureIds` に、その問題が本文で参照する図表IDを**参照順**で持たせる。
`figures` の並びとずれると `npm run validate:questions` が落ちる。

## 出典表示

`attribution` は画面に出す表記。出題画面での出典表示 UI は次の PR で実装する。
