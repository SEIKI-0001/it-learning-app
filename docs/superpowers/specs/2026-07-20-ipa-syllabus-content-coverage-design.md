# IPAシラバス準拠 学習コンテンツ拡充設計

## 目的

`it-learning-app` の「学ぶ」画面から、IPA公式「ITパスポート試験シラバス Ver.6.5」の全63項目を、解説・図解・確認問題まで含めて学習できる状態にする。

市販参考書の目次は不足候補を発見する補助資料としてだけ扱う。参考書固有の番号、見出し、順序、書名は、対応表・テスト・カリキュラムの正式な基準にしない。

## 正式な基準

- 基準資料: IPA公式「ITパスポート試験シラバス Ver.6.5」
- 公開日: 2026年1月8日
- 公式一覧: https://www.ipa.go.jp/shiken/syllabus/gaiyou.html
- 公式PDF: https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kn1-att/syllabus_ip_ver6_5.pdf
- 対象単位: シラバス目次に示される項目1〜63
- 2027年度から予定される新試験制度のITパスポート試験シラバス案は、2026年7月20日時点で準備中のため対象外とする。

## 互換性と変更範囲

- 既存Topic IDは変更・削除しない。
- 既存Topicで自然に扱える内容は、そのTopicの解説・図解・問題を拡張する。
- 一つのTopicが複数の独立した学習目標を抱える場合は、新規Topicへ分離する。
- UI全体、認証、課金、モチット、進捗保存・解除条件などのロジックは変更しない。
- 既存の未コミット変更には触れず、コンテンツ、学習カタログ、対応表、対応テストだけを変更する。
- 解説文と問題文はIT未経験者向けに新規作成し、参考書本文を転載しない。

## データ設計

### IPAシラバス対応マニフェスト

`data/ipaSyllabus.ts` を追加し、IPAシラバスの63項目をアプリ内Topicへ対応付ける唯一の機械可読な基準とする。

各エントリは次を持つ。

- `id`: `ipa-01` から `ipa-63` までの安定した内部ID
- `number`: IPAシラバスの項目番号
- `field`: `strategy`、`management`、`technology`
- `majorCategory`: IPAの大分類名
- `middleCategory`: IPAの中分類名
- `item`: IPAの項目名
- `topicIds`: 学習を担う一つ以上のTopic ID
- `coverage`: `covered`、`expanded`、`new`
- `note`: 対応範囲や複数Topicの役割分担

シラバス項目は複数Topicに対応できる。Topicは内容上必要であれば複数のシラバス項目を支えられるが、学習カタログ上では一度だけ登録する。

### Topic品質

新規Topicは既存の `createCompactTopic` 形式を使い、少なくとも次を持つ。

- `summary`、`body`、`analogy`、`detail`
- `keyPoints`、`examPoint`、`commonMistakes`
- `relatedTerms`、`referenceKeywords`
- `diagram` または `explanationDiagram`
- 4問以上の4択確認問題
- 正答理由と各誤答理由
- 用語暗記だけでなく業務・利用場面を使った事例問題

RAID、生産管理、通信経路数、性能評価には計算問題を含める。正解だけが不自然に長い、問題文の語をそのまま繰り返すなど、選択肢の外形から答えを推測できる構成を避ける。

## コンテンツ構成

### A. ストラテジ

新規Topic:

1. `strat-corporation-management-organization`: 株式会社、経営理念、経営組織
2. `strat-decision-problem-solving`: 意思決定・問題解決手法
3. `strat-technology-development-strategy`: 技術開発戦略・技術開発計画
4. `strat-business-systems`: ビジネスシステム
5. `strat-engineering-systems`: エンジニアリングシステム
6. `strat-production-management`: 生産管理と計算
7. `strat-embedded-systems`: 組込みシステム

既存Topic拡張:

- `strat-enterprise-activities`: 企業の責任とステークホルダのつながりを維持
- `strat-management-systems`: ヒト・モノ・カネ・情報という経営資源を追加
- `strat-business-process`: 業務分析、業務計画、ボトルネック分析を追加
- `strat-financial-statements`: 売上総利益、営業利益、経常利益、税引前当期純利益、当期純利益の流れを追加
- `strat-system-strategy`: 利用者教育、導入促進、IT投資評価、導入後評価を追加

### B. マネジメント

新規Topic:

8. `mgmt-system-design`: 外部設計、内部設計、インタフェース設計、モジュール設計
9. `mgmt-operation-maintenance`: 運用監視、障害対応、修正・適応・予防保守
10. `mgmt-pmbok-basics`: PMBOKの位置付け、プロセス群、知識エリア
11. `mgmt-project-resource`: 要員計画、役割分担、RACI
12. `mgmt-project-communication`: コミュニケーション計画、報告経路、通信経路数

既存Topicとの重複を避け、QCD、WBS、リスク管理、開発プロセス、要件定義、テストへの関連導線を設定する。

### C. コンピュータ・ソフトウェア

新規Topic:

13. `tech-system-processing-architecture`: バッチ、リアルタイム、オンライン、集中・分散、クライアントサーバ、三層、P2P
14. `tech-raid`: RAID 0、1、5、6と容量計算
15. `tech-system-performance`: レスポンスタイム、ターンアラウンドタイム、スループット、ベンチマーク
16. `tech-parallel-systems`: マルチコア、マルチプロセッサ、並列処理
17. `tech-computer-types`: PC、サーバ、汎用機、スーパーコンピュータ、マイコン
18. `tech-file-system`: ファイル、ディレクトリ、パス、拡張子、アクセス権
19. `tech-backup`: フル、差分、増分、世代管理、復旧順序
20. `tech-network-devices`: リピータ、ブリッジ、ハブ、スイッチ、ルータ、ゲートウェイ、アクセスポイント

既存Topic拡張:

- `tech-programming-basics`: 機械語、アセンブラ、高水準言語、コンパイラ、インタプリタ
- `tech-io-devices`: USB、HDMI、Bluetooth、NFCなどの入出力インタフェース
- `tech-os-software-hardware`: ワープロ、表計算、プレゼンテーション、グループウェアというアプリケーションソフトウェアの分類

`tech-iot` はIoTの接続・データ活用を担当し、リアルタイム制御やセンサー・アクチュエータを含む組込みシステムは `strat-embedded-systems` で独立して扱う。

## 学習カタログ

`data/learningCatalog.ts` の既存18テーマと既存セクションを維持し、新規Topicを意味的に最も近いセクションへ一度だけ登録する。必要な場合のみ既存テーマ内へ小さなセクションを追加し、テーマの総数やUI構造は変更しない。

- ストラテジ7件: 企業活動、業務分析、経営・技術戦略、ビジネスインダストリへ配置
- マネジメント5件: システム開発、プロジェクトマネジメントへ配置
- テクノロジ8件: コンピュータシステム、ソフトウェア、ネットワークへ配置

## 対応表

`docs/content/ipa-syllabus-coverage.md` を作成し、IPAシラバス項目1〜63について次を記録する。

- IPA項目番号
- 分野・大分類・中分類
- IPA項目名
- 対応Topic ID
- `covered / expanded / new`
- 補足

参考書固有の章節番号、見出し、順序は記録しない。IPAの項目番号は公式シラバスを追跡するために用いる。

## 試験ガイド

IPAシラバスは試験範囲の知識項目を定義する資料であり、市販参考書の序章に相当する試験概要・学習方法を63項目へ混在させない。既存オンボーディング、ヘルプ、試験案内を確認し、最新の試験方式・合格基準・学習導線に不足がある場合だけ、既存の案内領域へ追加する。Topic進捗には含めない。

## 自動検証

`test/ipaSyllabusCoverage.test.ts` を追加し、次を検証する。

1. マニフェストの基準バージョンが `6.5` である。
2. 項目番号1〜63が欠番・重複なく存在する。
3. 全項目に一つ以上のTopic IDが対応する。
4. 対応するTopic IDがすべて実在する。
5. 全Topic IDが重複せず、学習カタログへ一意に登録される。
6. 今回の新規20Topicがすべてカタログに登録される。
7. 新規20Topicが必須本文、図解、関連語、参照キーワード、4問以上の問題を持つ。
8. 新規20Topicの各問題が4択、正答理由、3つの誤答理由を持つ。
9. RAID、生産管理、通信経路数、性能評価の各Topicに計算問題が存在する。
10. 既存Topic IDの集合が変更・削除されていないことを、変更前IDの固定リストで検証する。

既存の `test/learningCatalog.test.ts` と `test/syllabus.test.ts` も実行し、現在のカタログと学習画面の整合性を維持する。

## 段階実装と検証

1. A. ストラテジ: 先に対象テストを失敗させ、新規7件と既存5件の拡張、カタログ登録を行い、対象テストと型チェックを通す。
2. B. マネジメント: 新規5件の失敗テストを追加し、Topicとカタログ登録を行い、対象テストと型チェックを通す。
3. C. コンピュータ・ソフトウェア: 新規8件と既存3件の拡張をテスト先行で行い、対象テストと型チェックを通す。
4. D. 対応表と全体検証: 63項目のマニフェストと対応表を完成させ、欠番、存在しないID、未登録Topicを検出するテストを通す。
5. 最終確認: `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` を実行する。

各段階で既存Topic IDとユーザーの未コミット変更を再確認し、今回の対象外ファイルへ変更が広がっていないことを確認する。

## 完了条件

- IPA Ver.6.5の全63項目に、一つ以上の実在Topicが対応している。
- 今回指定された不足テーマを「学ぶ」画面から解説・図解・確認問題まで学習できる。
- 新規20Topicと拡張8Topicが品質要件を満たす。
- 既存Topic IDが一つも変更・削除されていない。
- カタログに重複・未登録・存在しないTopic IDがない。
- IPA基準の対応表と自動テストが追加されている。
- lint、型チェック、全テスト、buildが成功する。
