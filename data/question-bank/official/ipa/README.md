# 公式過去問（IPA）の収録場所

このディレクトリには、IPA（独立行政法人情報処理推進機構）が公開した過去問を
`QuestionBankFile` 形式の JSON として置く。

## 収録済み

| ファイル | 内容 | 件数 | status |
| --- | --- | --- | --- |
| `it-passport-2022.json` | 令和4年度 ITパスポート試験 公開問題 | 100問 | `published` |
| `it-passport-2023.json` | 令和5年度 ITパスポート試験 公開問題 | 100問 | `published` |
| `it-passport-2024.json` | 令和6年度 ITパスポート試験 公開問題 | 100問 | `published` |
| `it-passport-2025.json` | 令和7年度 ITパスポート試験 公開問題 | 100問 | `published` |
| `it-passport-2026.json` | 令和8年度 ITパスポート試験 公開問題 | 100問 | `published` |

これらの JSON は**手で編集しない**。生成物なので、直したいときは入力側

```text
data/question-bank/sources/official/ipa/it-passport-<西暦>.source.json
data/question-bank/explanations/official/ipa/it-passport-<西暦>.json
```

を直して `npm run questions:import:ipa -- <西暦>` を実行する（年度を省くと全年度）。
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
- `official.examField`（公式問題冊子上の出題区分）は必須。詳細は下の「3つの分類軸」。
- 収録したら `data/question-bank/index.ts` の `questionBankFiles` に追加する。
- ID は他ファイルと重複させない。重複するとローダーが例外を投げる。

## 3つの分類軸

似ているが**別物**の分類が3つある。混同すると分野別集計と復習導線の両方が壊れる。

| フィールド | 意味 | 何に使うか | 決め方 |
| --- | --- | --- | --- |
| `official.examField` | 公式問題冊子上の**出題区分** | 年度別・区分別の再現、出典表示 | 公式冊子の並び（問番号）から機械的に決める |
| `syllabusNode.field` | 問題の**内容**から見た IPA シラバス分類 | 弱点分析、分野別集計 | `primaryTopicId` → `data/ipaSyllabus.ts` から引く |
| `primaryTopicId` | アプリ内の**復習先トピック** | 間違えたときの戻り先 | 転記時に人が決めて source.json に書く |

`official.examField` は「公式ではこの区分の問だった」という**出典側の事実**、
`syllabusNode.field` は「何を問うている問題か」という**アプリ側の解釈**。
この2つは一致しないことがあり、一致させてもいけない。

```text
問16 … official.examField: "strategy"   / syllabusNode.field: "technology"
問52 … official.examField: "management" / syllabusNode.field: "strategy"
```

公式区分で `syllabusNode.field` を上書きすると、内容ベースの弱点分析が
公式冊子の並びに引きずられて壊れる。逆も同じ。

年度ごとの区分の境目は
`lib/questionBank/officialExamField.ts` の `getOfficialExamField(問番号, 西暦)` が持つ。

```text
令和4年度  問1〜35 / 問36〜54 / 問55〜100  （35・19・46問）
令和5年度  問1〜35 / 問36〜55 / 問56〜100  （35・20・45問）
令和6年度  問1〜35 / 問36〜55 / 問56〜100  （35・20・45問）
令和7年度  問1〜35 / 問36〜55 / 問56〜100  （35・20・45問）
令和8年度  問1〜34 / 問35〜54 / 問55〜100  （34・20・46問）
```

問番号から決まるので source.json に区分を手入力する必要はない。
**境目は年度ごとに動く**ので、新しい年度を収録するときは問題冊子の扉にある
「問1から問○までは，ストラテジ系の問題です。」という案内文を根拠に1行足すこと。
足し忘れると、その年度は区分の突き合わせ検証が素通りする。

なお `official.examField` は出典側のメタ情報なので **`contentHash` の対象外**
（対象は `prompt` / `choices` / `correctChoice` / `explanation` のみ）。
区分を直しても本文のハッシュは動かない。

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
