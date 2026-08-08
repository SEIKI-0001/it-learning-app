# 作問の設計図（QuestionBlueprint）

1問につき1ファイル（`<id>.json`）。ファイル名と `id` は一致させます。

## なぜ設計図から作るのか

これまでの取り込み経路は「完成した候補JSON」から始まっていました。
何を測る問題を、どういう筋道で、どんな誤答で成立させるかは作った人の頭の中にしかなく、
出来上がったものを見て良し悪しを言うしかありませんでした。

設計図を先に書いて残すと、次ができるようになります。

- 完成品が狙いどおりか（設計図との整合）を機械的に検査できる
- 公式問題のレベル感を、参照した問題として明示できる
- 作り直すときに「何を作ろうとしていたか」から始められる

## 手順

```bash
# 1. レベル感の基準にする公式問題を2〜5問選ぶ
npm run questions:blueprint -- references --topic=strat-intellectual-property

# 2. 設計図のひな形を作る
npm run questions:blueprint -- template \
  --id=ai-strat-ip-002 \
  --topic=strat-intellectual-property \
  --pattern=application \
  --difficulty=2

# 3. 空欄を人が埋める（learningObjective / requiredReasoningSteps /
#    distractorStrategies / prohibitedCopyElements）

# 4. 設計図を検証する
npm run validate:blueprints

# 5. 候補JSONのひな形を作り、本文を入れる
npm run questions:blueprint -- to-candidate --blueprint=ai-strat-ip-002

# 6. 作問（data/question-bank/prompts/<promptVersion>.md の手順）
#    → 候補JSONの prompt / choices / correctChoice / explanation を埋める

# 7. 整合を検証 → 取り込み → 品質ゲート
npm run validate:blueprints
npm run questions:import:candidates
npm run questions:quality-report
```

## AI は実行時に呼ばない

このフローのスクリプトは、外部AIのSDK・APIキー・ネットワークを一切使いません。
作問そのもの（本文を書く工程）だけが手元での AI 利用で、それ以外
（参照抽出・ひな形出力・設計図検証・候補検証・類似度検査）は
**APIキーが無い環境でも全部動きます**。

## 各項目の意味

| 項目 | 何を書くか |
| --- | --- |
| `learningObjective` | 何が分かれば正解できるか。「〜を知っている」ではなく「〜を判断できる」の形で |
| `questionPattern` | knowledge / application / calculation / diagram / ordering |
| `targetDifficulty` | 1〜3。完成問題の `estimatedDifficulty` と一致させる |
| `requiredReasoningSteps` | 正解までに踏む段。application 以上は2段以上必要 |
| `distractorStrategies` | 誤答3つをどう成立させるか。3件以上必要 |
| `referenceQuestionIds` | レベル感の基準にする**公式**問題（2〜5件）。**出典ではない** |
| `prohibitedCopyElements` | 参照問題から持ち込まない要素。「参考にする」と「引き写す」の線 |
| `promptVersion` | `data/question-bank/prompts/<promptVersion>.md` に対応 |

`referenceQuestionIds` は出典ではありません。
「この公式問題をもとに出題した」と主張したい場合は、AI生成ではなく
`modified_official` + `official.derivedFromQuestionId` を使ってください。

## 検証されること

`npm run validate:blueprints`（CI でも走る）が見るもの:

- 設計図の空欄（狙いを決めずに作問へ進んでいないか）
- 参照問題が実在し、`official_past` であるか
- `promptVersion` に対応するテンプレートが Git 上にあるか
- 完成候補があれば、トピック・形式・難易度・参照が設計図と一致するか
