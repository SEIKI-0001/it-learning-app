# 作問プロンプト ip-v1（ITパスポート／過去問レベル）

`promptVersion: "ip-v1"` に対応するテンプレート。
作問方針を変えたら、このファイルを書き換えず **新しい版（ip-v2.md）を作る**。
過去に作った問題がどの方針で作られたかを追えなくなるため。

このテンプレートは手元で実行するもの。アプリの実行時に AI を呼ぶ経路は作らない。

---

## 前提

1. `npm run questions:blueprint -- references --topic=<topicId>` で参照問題を選ぶ
2. `npm run questions:blueprint -- template --id=<id> --topic=<topicId>` で設計図のひな形を作る
3. 設計図の空欄を人が埋める
4. 下のプロンプトで作問する
5. `npm run questions:blueprint -- to-candidate --blueprint=<id>` で候補のひな形を作り、本文を入れる
6. `npm run questions:blueprint -- validate` → `npm run questions:import:candidates` → `npm run questions:quality-report`

---

## プロンプト

```
あなたはITパスポート試験の作問者です。以下の設計図に従って4択問題を1問作ってください。

## 設計図

<設計図JSON（data/question-bank/blueprints/<id>.json）をそのまま貼る>

## 参照問題（レベル感の基準）

<referenceQuestionIds の問題文・選択肢をそのまま貼る>

## 守ること

1. 参照問題は「難しさ・問い方・文章量の基準」として見る。
   題材・数値・固有名詞・言い回しを引き写さない。
   設計図の prohibitedCopyElements に挙げた要素は特に持ち込まない。

2. learningObjective に書かれた判断ができる人だけが正解できる問題にする。
   その判断をせずに、用語を1つ知っているだけで解ける問題にしない。

3. requiredReasoningSteps に書いた段を、すべて踏まないと正解にたどり着けないようにする。

4. 誤答3つは distractorStrategies に書いた作り方でそれぞれ成立させる。
   - 誤答も「一見もっともらしい」こと。明らかに的外れな選択肢を混ぜない
   - 「必ず」「すべて」「決して」などの断定語だけで消去できる選択肢にしない
   - 選択肢どうしが言い換えにならないようにする（同じことを2つ書かない）

5. 正解の選択肢だけが長い・具体的、という形にしない。
   4つの選択肢の文字数と具体性の水準をそろえる。

6. 問題文だけで一意に答えが決まること。
   条件が足りない、複数の選択肢が正解になりうる、という状態にしない。

7. 解説は「なぜ正解か」に加えて「なぜ他が違うか」を選択肢ごとに書く。
   公式の解説を引き写さない。本サービス独自の説明として書く。

8. 出力は下のJSON形式のみ。前後に説明を書かない。

## 出力形式

{
  "prompt": "…",
  "choices": [
    { "key": "A", "text": "…" },
    { "key": "B", "text": "…" },
    { "key": "C", "text": "…" },
    { "key": "D", "text": "…" }
  ],
  "correctChoice": "A",
  "explanation": "…",
  "choiceExplanations": { "A": "…", "B": "…", "C": "…", "D": "…" },
  "tags": ["…"]
}
```

---

## 作ったあとに必ず通すもの

| 検査 | コマンド | 何を見るか |
| --- | --- | --- |
| 設計図との整合 | `npm run questions:blueprint -- validate` | トピック・形式・難易度・参照が設計図どおりか |
| 取り込み | `npm run questions:import:candidates` | 形式が正しいか（必ず `draft` で入る） |
| 品質・類似度 | `npm run questions:quality-report` | 既存問題との類似度、選択肢の作りの偏り |

`published` へ上げるには、別途 `data/question-bank/reviews/<id>.json` に
レビュー記録（`decision: "approve"` と各レビュー担当者）が要る。
AI生成問題は類似度の帯にかかわらず `similarityReviewedBy` が必須。
