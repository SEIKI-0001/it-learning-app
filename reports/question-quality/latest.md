# 問題品質レポート

`npm run questions:quality-report` の出力。実行時刻は含めない（再生成で無意味な差分を出さないため）。

## サマリ

| 指標 | 件数 |
| --- | ---: |
| 問題数 | 426 |
| blocker | 0 |
| warning | 155 |
| うち新規 warning（ベースライン外） | 0 |

### 出所別

| origin | 件数 |
| --- | ---: |
| official_past | 100 |
| app_original | 326 |
| ai_generated | 0 |
| modified_official | 0 |

### 公開状態別

| status | 件数 |
| --- | ---: |
| draft | 326 |
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
| review-self-review | 133 |
| choice-near-duplicate | 12 |
| absolute-word-hint | 9 |
| calculation-missing-unit | 1 |

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
| ipa-it-passport-2026-q075 | choice-near-duplicate | 選択肢 A と D の本文がほとんど同じです（類似度 0.964）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q084 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q086 | choice-near-duplicate | 選択肢 C と D の本文がほとんど同じです（類似度 0.842）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2026-q091 | absolute-word-hint | 「常に」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q091 | absolute-word-hint | 「全て」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2026-q094 | absolute-word-hint | 「常に」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| mgmt-development-process-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-development-process-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-estimation-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-estimation-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-facility-management-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-facility-management-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-itil-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-itil-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-pdca-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-pdca-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-pm-qcd-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-requirements-definition-ex1 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| mgmt-requirements-definition-ex2 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| mgmt-risk-management-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-risk-management-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-service-sla-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-service-sla-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-service-sla-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-system-audit-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-system-audit-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-testing-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-testing-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-wbs-gantt-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| mgmt-wbs-gantt-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-3c-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-accounting-break-even-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-bcp-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-bcp-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-business-process-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-corporate-strategy-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-corporate-strategy-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-ebusiness-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-ebusiness-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-financial-statements-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-financial-statements-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-generative-ai-dx-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-generative-ai-dx-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-generative-ai-dx-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-goal-evaluation-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-goal-evaluation-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-intellectual-property-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-intellectual-property-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-labor-laws-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-labor-laws-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-management-systems-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-management-systems-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-marketing-4p-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-marketing-4p-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-ppm-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-ppm-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-privacy-law-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-privacy-law-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-security-laws-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-security-laws-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-standardization-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-standardization-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-swot-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-swot-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-swot-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-system-strategy-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-system-strategy-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-value-chain-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| strat-value-chain-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-ai-ml-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-ai-ml-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-ai-ml-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-algorithm-flowchart-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-algorithm-flowchart-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-api-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-api-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-auth-authz-mfa-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-auth-authz-mfa-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-auth-authz-mfa-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-binary-data-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-binary-data-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-cloud-models-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-cloud-models-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-cloud-models-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-common-key-crypto-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-common-key-crypto-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-computer-core-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-cyber-attacks-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-cyber-attacks-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-data-structure-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-data-structure-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-data-utilization-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-data-utilization-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-database-sql-ex1 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.947）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| tech-database-sql-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-database-sql-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-database-sql-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-digital-signature-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-digital-signature-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-email-protocol-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-email-protocol-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-encryption-hash-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-encryption-hash-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-firewall-vpn-zero-trust-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-firewall-vpn-zero-trust-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-firewall-vpn-zero-trust-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-http-https-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-http-https-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-http-https-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-iot-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-iot-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-isms-risk-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-isms-risk-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-keys-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-keys-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-lan-wan-ex1 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.875）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| tech-logic-operations-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-logic-operations-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-malware-phishing-ransomware-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-malware-phishing-ransomware-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-malware-phishing-ransomware-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-network-address-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-network-address-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-network-address-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-normalization-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-normalization-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-os-software-hardware-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-os-software-hardware-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-programming-basics-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-programming-basics-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-public-key-crypto-ex1 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.889）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| tech-public-key-crypto-ex1 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.889）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| tech-public-key-crypto-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-public-key-crypto-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-reliability-availability-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-reliability-availability-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-security-cia-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-security-cia-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-security-cia-ex3 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-spreadsheet-ex1 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| tech-spreadsheet-ex1 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| tech-spreadsheet-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-spreadsheet-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-transaction-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-web-internet-basics-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-wireless-mobile-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-wireless-mobile-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |

</details>

## 類似度の検出結果

notice 帯より上の検出はなし。

