# 問題の実測難易度レポート

`npm run questions:analyze-quality` の出力。主指標は同一ユーザー・同一問題・同一versionの**最初の回答**のみで算出している（復習による正答率の上昇を難易度に混ぜないため）。

> **これは fixture（架空の回答履歴）から作ったレポートです。実データではありません。**
>
> 集計ロジックの動作確認用で、`test/fixtures/questionAttempts.sample.json` を入力にしています。実測値を見るには Supabase に接続して `npm run questions:analyze-quality` を実行してください。

個人を識別できる値（user_id・回答日時・attempt_id）はこのレポートに含めない。

## サマリ

| 指標 | 値 |
| --- | ---: |
| 集計対象（問題×version） | 3 |
| reliable（100ユーザー以上） | 1 |
| provisional（30〜99） | 1 |
| insufficient（30未満） | 1 |

## 異常フラグ

| 問題ID | ver | 標本 | ユーザー数 | 初回正答率 | 推奨難易度 | フラグ |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| ipa-it-passport-2026-q001 | 2 | reliable | 120 | 60.0% | 3 | non_functioning_distractor |
| ipa-it-passport-2026-q002 | 2 | provisional | 45 | 17.8% | 5 | too_hard, non_functioning_distractor, dominant_wrong_choice, unusually_slow, high_unanswered_rate |

## 全件

| 問題ID | ver | 標本 | ユーザー数 | 初回回答 | 全回答 | 初回正答率 | 全回答正答率 | 中央値(秒) | p90(秒) | 未回答率 | 推奨難易度 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ipa-it-passport-2026-q001 | 2 | reliable | 120 | 120 | 180 | 60.0% | 73.3% | 63.5 | 81 | 0.0% | 3 |
| ipa-it-passport-2026-q002 | 2 | provisional | 45 | 45 | 45 | 17.8% | 17.8% | 200 | 242 | 24.4% | 5 |
| tech-security-cia-ex1 | 1 | insufficient | 12 | 12 | 16 | 100.0% | 100.0% | 5 | 6 | 0.0% | 1（参考） |

