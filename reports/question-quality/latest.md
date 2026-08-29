# 問題品質レポート

`npm run questions:quality-report` の出力。実行時刻は含めない（再生成で無意味な差分を出さないため）。

## サマリ

| 指標 | 件数 |
| --- | ---: |
| 問題数 | 826 |
| blocker | 0 |
| warning | 206 |
| うち新規 warning（ベースライン外） | 0 |

### 出所別

| origin | 件数 |
| --- | ---: |
| official_past | 500 |
| app_original | 326 |
| ai_generated | 0 |
| modified_official | 0 |

### 公開状態別

| status | 件数 |
| --- | ---: |
| draft | 326 |
| content_verified | 0 |
| explanation_verified | 0 |
| published | 500 |
| retired | 0 |

### 類似度の帯

| band | 件数 |
| --- | ---: |
| exact_duplicate | 0 |
| block | 2 |
| review_required | 2 |
| notice | 18 |
| ok | 0 |

## blocker

なし。

## 新規 warning（ベースライン外）

なし。

## warning（全件）

| rule | 件数 |
| --- | ---: |
| review-self-review | 133 |
| choice-near-duplicate | 34 |
| absolute-word-hint | 20 |
| pattern-calculation-candidate | 6 |
| correct-choice-specificity | 4 |
| similarity-official-notice | 4 |
| calculation-missing-unit | 2 |
| correct-choice-longest | 2 |
| correct-choice-shortest | 1 |

<details><summary>明細</summary>

| 問題ID | rule | 根拠 | 最類似 | スコア |
| --- | --- | --- | --- | ---: |
| ipa-it-passport-2022-q017 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2022-q032 | choice-near-duplicate | 選択肢 B と C の本文がほとんど同じです（類似度 0.851）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2022-q036 | absolute-word-hint | 「全て」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2022-q039 | correct-choice-specificity | 正答（A）だけが数値を含み、誤答はいずれも含みません。具体性の差で正解が推測できます。 | - | - |
| ipa-it-passport-2022-q043 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "diagram" です。"calculation" が適切ではないか確認してください。 | - | - |
| ipa-it-passport-2022-q060 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2022-q060 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2022-q066 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2022-q077 | absolute-word-hint | 「全て」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2022-q079 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "diagram" です。"calculation" が適切ではないか確認してください。 | - | - |
| ipa-it-passport-2022-q081 | correct-choice-specificity | 正答（A）だけが数値を含み、誤答はいずれも含みません。具体性の差で正解が推測できます。 | - | - |
| ipa-it-passport-2023-q007 | correct-choice-shortest | 正答（A, 3文字）が最短の誤答（9文字）より極端に短く、長さだけで正解が推測できます。 | - | - |
| ipa-it-passport-2023-q030 | correct-choice-longest | 正答（A, 26文字）が最長の誤答（10文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| ipa-it-passport-2023-q040 | absolute-word-hint | 「全て」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2023-q047 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q072 | similarity-official-notice | 公式過去問どうしが酷似しています（公開は阻害しません）。最類似: "ipa-it-passport-2024-q064"（official_past） / 代表スコア 0.839 / prompt 0.839 / 全体 0.316 / 正答本文 0.172 | ipa-it-passport-2024-q064 | 0.839 |
| ipa-it-passport-2023-q075 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.913）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q075 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.913）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q075 | choice-near-duplicate | 選択肢 A と D の本文がほとんど同じです（類似度 0.826）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q075 | choice-near-duplicate | 選択肢 B と C の本文がほとんど同じです（類似度 0.826）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q075 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.913）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q075 | choice-near-duplicate | 選択肢 C と D の本文がほとんど同じです（類似度 0.913）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q092 | absolute-word-hint | 「全て」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2023-q096 | choice-near-duplicate | 選択肢 B と C の本文がほとんど同じです（類似度 0.833）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2023-q096 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.917）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2024-q008 | calculation-missing-unit | 計算問題ですが、選択肢がすべて単位のない数値で、問題文にも単位が見当たりません。何を答えるのかが曖昧です。 | - | - |
| ipa-it-passport-2024-q011 | correct-choice-specificity | 正答（B）だけが数値を含み、誤答はいずれも含みません。具体性の差で正解が推測できます。 | - | - |
| ipa-it-passport-2024-q032 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 1.000）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2024-q037 | absolute-word-hint | 「全て」を含む選択肢が B だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2024-q040 | absolute-word-hint | 「全て」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2024-q064 | similarity-official-notice | 公式過去問どうしが酷似しています（公開は阻害しません）。最類似: "ipa-it-passport-2023-q072"（official_past） / 代表スコア 0.839 / prompt 0.839 / 全体 0.316 / 正答本文 0.172 | ipa-it-passport-2023-q072 | 0.839 |
| ipa-it-passport-2024-q073 | absolute-word-hint | 「常に」を含む選択肢が A だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2024-q081 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.952）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2024-q081 | choice-near-duplicate | 選択肢 A と C の本文がほとんど同じです（類似度 0.857）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2024-q085 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.936）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2024-q085 | choice-near-duplicate | 選択肢 C と D の本文がほとんど同じです（類似度 0.936）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2024-q093 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "diagram" です。"calculation" が適切ではないか確認してください。 | - | - |
| ipa-it-passport-2025-q005 | choice-near-duplicate | 選択肢 C と D の本文がほとんど同じです（類似度 1.000）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2025-q025 | absolute-word-hint | 「全て」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2025-q028 | absolute-word-hint | 「一切」を含む選択肢が A だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2025-q040 | absolute-word-hint | 「全て」を含む選択肢が D だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2025-q058 | choice-near-duplicate | 選択肢 C と D の本文がほとんど同じです（類似度 0.877）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2025-q059 | correct-choice-longest | 正答（A, 75文字）が最長の誤答（43文字）より極端に長く、長さだけで正解が推測できます。 | - | - |
| ipa-it-passport-2025-q061 | absolute-word-hint | 「全て」を含む選択肢が C だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。 | - | - |
| ipa-it-passport-2025-q066 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.824）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2025-q066 | choice-near-duplicate | 選択肢 B と D の本文がほとんど同じです（類似度 0.824）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2025-q078 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "application" です。"calculation" が適切ではないか確認してください。 | - | - |
| ipa-it-passport-2025-q088 | similarity-official-notice | 公式過去問どうしが酷似しています（公開は阻害しません）。最類似: "ipa-it-passport-2026-q094"（official_past） / 代表スコア 1.000 / prompt 1.000 / 全体 0.328 / 正答本文 0.000 | ipa-it-passport-2026-q094 | 1.000 |
| ipa-it-passport-2025-q090 | correct-choice-specificity | 正答（D）だけが数値を含み、誤答はいずれも含みません。具体性の差で正解が推測できます。 | - | - |
| ipa-it-passport-2025-q091 | choice-near-duplicate | 選択肢 A と B の本文がほとんど同じです（類似度 0.935）。言い換えただけで実質同じことを述べていないか確認してください。 | - | - |
| ipa-it-passport-2025-q098 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "application" です。"calculation" が適切ではないか確認してください。 | - | - |
| ipa-it-passport-2025-q099 | pattern-calculation-candidate | 選択肢がすべて数値ですが questionPattern が "application" です。"calculation" が適切ではないか確認してください。 | - | - |
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
| ipa-it-passport-2026-q094 | similarity-official-notice | 公式過去問どうしが酷似しています（公開は阻害しません）。最類似: "ipa-it-passport-2025-q088"（official_past） / 代表スコア 1.000 / prompt 1.000 / 全体 0.328 / 正答本文 0.000 | ipa-it-passport-2025-q088 | 1.000 |
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
| tech-spreadsheet-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-spreadsheet-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-transaction-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-web-internet-basics-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-wireless-mobile-ex1 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |
| tech-wireless-mobile-ex2 | review-self-review | 作成者（claude-code:exam-level-quality-2026-08）とレビュー者が同一です。可能なら別の人に確認してもらってください。 | - | - |

</details>

## 類似度の検出結果

| 問題ID | origin | 最類似 | 相手のorigin | band | prompt | 全体 | 正答本文 |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| ipa-it-passport-2023-q072 | official_past | ipa-it-passport-2024-q064 | official_past | review_required | 0.839 | 0.316 | 0.172 |
| ipa-it-passport-2024-q064 | official_past | ipa-it-passport-2023-q072 | official_past | review_required | 0.839 | 0.316 | 0.172 |
| ipa-it-passport-2025-q088 | official_past | ipa-it-passport-2026-q094 | official_past | block | 1.000 | 0.328 | 0.000 |
| ipa-it-passport-2026-q094 | official_past | ipa-it-passport-2025-q088 | official_past | block | 1.000 | 0.328 | 0.000 |

