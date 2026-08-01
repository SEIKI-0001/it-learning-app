# 問題品質レポート

`npm run questions:quality-report` の出力。実行時刻は含めない（再生成で無意味な差分を出さないため）。

## サマリ

| 指標 | 件数 |
| --- | ---: |
| 問題数 | 246 |
| blocker | 0 |
| warning | 74 |
| うち新規 warning（ベースライン外） | 0 |

### 出所別

| origin | 件数 |
| --- | ---: |
| official_past | 100 |
| app_original | 146 |
| ai_generated | 0 |
| modified_official | 0 |

### 公開状態別

| status | 件数 |
| --- | ---: |
| draft | 146 |
| content_verified | 0 |
| explanation_verified | 0 |
| published | 100 |
| retired | 0 |

### 類似度の帯

| band | 件数 |
| --- | ---: |
| exact_duplicate | 0 |
| block | 0 |
| review_required | 0 |
| notice | 0 |
| ok | 0 |

## blocker

なし。

## 新規 warning（ベースライン外）

なし。

## warning（全件）

| rule | 件数 |
| --- | ---: |
| absolute-word-hint | 45 |
| choice-near-duplicate | 15 |
| correct-choice-longest | 8 |
| correct-choice-specificity | 2 |
| pattern-calculation-candidate | 2 |
| calculation-missing-unit | 1 |
| correct-choice-shortest | 1 |

<details><summary>明細</summary>

| 問題ID | rule | 根拠 | 最類似 | スコア |
| --- | --- | --- | --- | ---: |
| ipa-it-passport-2026-q003 | calculation-missing-unit | 計算問題ですが、選択肢がすべて単位のない数値で、問題文にも単位が見当たりません。何を答えるのかが曖昧です。 | - | - |
| ipa-it-passport-2026-q007 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.889）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q039 | absolute-word-hint | 「全て」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q040 | absolute-word-hint | 「必ず」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q040 | absolute-word-hint | 「全て」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q049 | absolute-word-hint | 「常に」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q049 | absolute-word-hint | 「全て」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q052 | absolute-word-hint | 「全て」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q068 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.941）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q074 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.867）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q074 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.867）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q074 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.867）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q074 | choice-near-duplicate | 選択肢 C と D の本文がほとんど同じです（類似度 0.867）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q075 | choice-near-duplicate | 選択肢 A と D の本文がほとんど同じです（類似度 0.964）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q084 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q086 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q086 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.875）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q086 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q086 | choice-near-duplicate | 選択肢 C と D の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q091 | absolute-word-hint | 「常に」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q091 | absolute-word-hint | 「全て」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q094 | absolute-word-hint | 「常に」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| mgmt-pm-qcd-ex2 | absolute-word-hint | 「すべて」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| mgmt-pm-qcd-ex2 | correct-choice-longest | 正答（A, 32文字）が最長の誤答（18文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| mgmt-requirements-definition-ex1 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| mgmt-requirements-definition-ex2 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| mgmt-system-audit-ex1 | absolute-word-hint | 「必ず」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| mgmt-system-audit-ex2 | absolute-word-hint | 「すべて」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-3c-ex2 | correct-choice-specificity | 正答（A）だけが数値を含み、誤答はいずれも含みません。具体性の差で正解が推測できます。 | - | - |
| strat-accounting-break-even-ex2 | absolute-word-hint | 「必ず」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-accounting-break-even-ex2 | correct-choice-longest | 正答（A, 26文字）が最長の誤答（16文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| strat-accounting-break-even-ex2 | correct-choice-specificity | 正答（A）だけが数値を含み、誤答はいずれも含みません。具体性の差で正解が推測できます。 | - | - |
| strat-business-process-ex2 | absolute-word-hint | 「必ず」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-business-process-ex2 | correct-choice-longest | 正答（A, 34文字）が最長の誤答（18文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| strat-generative-ai-dx-ex3 | absolute-word-hint | 「必ず」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-generative-ai-dx-ex3 | absolute-word-hint | 「すべて」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-legal-compliance-ex1 | absolute-word-hint | 「常に」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-legal-compliance-ex1 | absolute-word-hint | 「一切」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-legal-compliance-ex1 | correct-choice-longest | 正答（A, 30文字）が最長の誤答（18文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| strat-legal-compliance-ex2 | correct-choice-longest | 正答（A, 11文字）が最長の誤答（3文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| strat-privacy-law-ex1 | absolute-word-hint | 「すべて」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-privacy-law-ex1 | absolute-word-hint | 「一切」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-swot-ex3 | absolute-word-hint | 「すべて」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| strat-system-strategy-ex2 | absolute-word-hint | 「すべて」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-ai-ml-ex3 | absolute-word-hint | 「必ず」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-api-ex1 | absolute-word-hint | 「すべて」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-api-ex2 | absolute-word-hint | 「必ず」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-api-ex2 | absolute-word-hint | 「一切」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-binary-data-ex1 | absolute-word-hint | 「常に」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-binary-data-ex1 | absolute-word-hint | 「必ず」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-binary-data-ex2 | absolute-word-hint | 「必ず」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-cloud-models-ex3 | absolute-word-hint | 「必ず」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-cloud-models-ex3 | absolute-word-hint | 「すべて」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-common-key-crypto-ex1 | absolute-word-hint | 「必ず」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-common-key-crypto-ex2 | absolute-word-hint | 「絶対に」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-computer-core-ex1 | correct-choice-shortest | 正答（A, 3文字）が最短の誤答（9文字）より極端に短く、長さだけで正解が推測できます。 | - | - |
| tech-data-utilization-ex2 | absolute-word-hint | 「必ず」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-iot-ex1 | absolute-word-hint | 「必ず」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-iot-ex1 | absolute-word-hint | 「一切」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-isms-risk-ex2 | absolute-word-hint | 「すべて」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-keys-ex1 | absolute-word-hint | 「必ず」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-keys-ex1 | absolute-word-hint | 「すべて」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-lan-wan-ex1 | absolute-word-hint | 「必ず」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-lan-wan-ex1 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 1.000）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| tech-lan-wan-ex2 | absolute-word-hint | 「すべて」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-lan-wan-ex2 | correct-choice-longest | 正答（A, 39文字）が最長の誤答（18文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| tech-normalization-ex1 | absolute-word-hint | 「必ず」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-normalization-ex1 | absolute-word-hint | 「すべて」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-normalization-ex2 | absolute-word-hint | 「必ず」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-os-software-hardware-ex2 | absolute-word-hint | 「必ず」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| tech-programming-basics-ex1 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "application" です。"calculation" が適切ではないか確認してください。 | - | - |
| tech-reliability-availability-ex1 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "application" です。"calculation" が適切ではないか確認してください。 | - | - |
| tech-transaction-ex1 | correct-choice-longest | 正答（A, 32文字）が最長の誤答（19文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| tech-web-internet-basics-ex2 | correct-choice-longest | 正答（A, 12文字）が最長の誤答（4文字）より極端に長く、長さだけで正解が推測できます。 | - | - |

</details>

## 類似度の検出結果

notice 帯より上の検出はなし。

