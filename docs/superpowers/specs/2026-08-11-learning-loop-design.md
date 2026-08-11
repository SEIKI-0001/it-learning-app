# 学習ループ統合設計

## 目的

既存のTopic学習、確認問題、復習、チェックポイント、100問模試、公式過去問、今日の学習を、`学習 → 判定 → 弱点特定 → 復習 → 再判定` の一つのループとして接続する。既存の70%通過判定や進捗表示は維持し、Topic Masteryとは別概念として扱う。

## 既存構造と統合方針

- Learning Progressは既存の`completedTopics`、`topic_progress.stage`、`checkpointProgress`を正として維持する。
- Topic Masteryの表示互換値は既存の`topicMastery: Record<string, number>`を維持する。評価根拠は新しい`topicMasteryStats`に保持し、すべての更新を一つの純粋関数へ集約する。
- Review Dueは既存の`reviewQueue`を拡張し、`reviewStage`と`lastReviewedAt`を追加する。単語帳とTopic復習が同じ間隔定数を利用する。
- Weak Topicは保存せず、Mastery、回答履歴、評価イベントから決定的に導出する。
- Exam ReadinessはP0では純粋な算出インターフェースのみ追加し、既存の統合準備度UIは変更しない。
- 今日の学習は既存`generateTodayMenu`を入口として維持し、内部で単一の優先順位付きキューを作る。

## データモデル

`TopicMasteryStats`は`topicId`、`masteryScore`、`lastEvaluatedAt`、`correctCount`、`incorrectCount`、`reviewSuccessCount`、直近の評価イベントを持つ。評価イベントには問題ID、評価種別、正誤、初見か、日時を保存し、総まとめ試験誤答・復習誤答・連続誤答を後から導出可能にする。

`ReviewItem`は既存フィールドに`reviewStage`、`lastReviewedAt`、機械判定用の`reasonCode`を加える。旧データではstageを0として正規化する。初回成功は3日後に設定し、期限を迎えた復習機会の成功時だけ7、14、28日へstageを進める。その後は倍増し最大180日とする。期限前の再正答ではstageと期限を維持し、不正解ではstageを0へ戻して翌日に設定する。

Supabaseの`user_progress`へ`topic_mastery_stats jsonb not null default '{}'`を加える。旧ユーザーは空オブジェクトから開始し、既存の進捗や70%通過を習得済みに変換しない。

## Mastery評価

評価種別は`confirmation`、`review`、`summary_exam`、`mock_exam`、`past_exam`、`checkpoint`として保存する。初見かどうかは独立した`isFirstSeen`属性で保持する。現在は総まとめ・模試・過去問が同じ重みでも、将来は評価種別ごとに変更できる。確認問題は弱い重み、復習・総まとめ・初見は強い重みを持つ。1件ずつ加点・減点するが、初回正解だけでは100へ到達しない。復習・総まとめの誤答、同一Topicの連続誤答は強く減点する。結果は0〜100へclampする。重み、初見補正、連続誤答補正、Weak閾値、復習間隔は単一設定オブジェクトから参照する。

既存のTopic完了時、100問模試、公式過去問、チェックポイント試験、チェックポイント最終問題を同じ`applyLearningEvidence`へ通す。Topicを解決できない問題は評価対象から除外する。

## Weak Topicと今日のキュー

`getWeakTopics`は、低Mastery、直近複数誤答、総まとめ試験誤答、復習失敗を理由付きで返し、severity順に並べる。

`buildTodaysLearningQueue`は、期限超過Review、総まとめ試験由来の重大Weak Topic、低Masteryかつ重要なTopic、進行中の新規Topic、単語帳、追加演習の順で候補を並べる。P0の既存Today UIがTopic単位であるため、単語帳・追加演習は候補型と順位規則まで実装し、表示可能なTopic候補を時間予算内で採用する。

## 総まとめ試験後UX

100問模試の結果にTopic別集計と上位Weak Topicを追加する。結果画面には総合、分野別、強化が必要なTopic最大3件、決定的な次アクション文を表示し、最優先Topicの既存レッスン復習導線へ遷移させる。公式過去問も同じ評価更新へ接続するが、実試験の合否を示さない既存方針は維持する。

## エラー・後方互換

ローカル保存とDB保存の既存フォールバックを維持する。新フィールド欠落は正規化で安全に補完する。問題→Topicが解決できない場合はMasteryを更新しない。既存数値Masteryと詳細状態の端末間マージは、詳細状態の最新評価時刻を優先して誤答による減点を巻き戻さない。

## テスト

純粋関数でMasteryの評価種別・上下限、Review Dueの3/7/14/28日と翌日、期限前の同日連続正答でstageが進まないこと、Weak Topicの4理由、未評価TopicがWeakにならないこと、今日キューの優先順位、総まとめ試験のTopic集計と状態更新を検証する。既存Topic、checkpoint、mock exam、past exam、question-bank、保存マッパーの回帰テストも実行する。
