import type { TopicField } from "@/types/content";

export const IPA_SYLLABUS_VERSION = "6.5" as const;

export type IpaCoverageStatus = "covered" | "expanded" | "new";

export type IpaSyllabusItem = {
  id: `ipa-${string}`;
  number: number;
  field: TopicField;
  majorCategory: string;
  middleCategory: string;
  item: string;
  topicIds: readonly string[];
  coverage: IpaCoverageStatus;
  note: string;
};

export const ipaSyllabusItems = [
  {
    id: "ipa-01", number: 1, field: "strategy", majorCategory: "企業と法務", middleCategory: "企業活動",
    item: "経営・組織論",
    topicIds: ["strat-enterprise-activities", "strat-corporation-management-organization", "strat-management-systems", "strat-bcp"],
    coverage: "new",
    note: "企業の社会的責任、株式会社と経営理念、組織形態、経営資源、BCP・BCMを学ぶ。",
  },
  {
    id: "ipa-02", number: 2, field: "strategy", majorCategory: "企業と法務", middleCategory: "企業活動",
    item: "業務分析・データ利活用",
    topicIds: ["strat-business-process", "strat-decision-problem-solving", "tech-data-utilization"],
    coverage: "new",
    note: "業務フローとボトルネックの分析、問題解決技法、データ分析・BIの活用を学ぶ。",
  },
  {
    id: "ipa-03", number: 3, field: "strategy", majorCategory: "企業と法務", middleCategory: "企業活動",
    item: "会計・財務",
    topicIds: ["strat-accounting-break-even", "strat-financial-statements"],
    coverage: "expanded",
    note: "損益分岐点、財務諸表、売上高から当期純利益までの利益段階を学ぶ。",
  },
  {
    id: "ipa-04", number: 4, field: "strategy", majorCategory: "企業と法務", middleCategory: "法務",
    item: "知的財産権", topicIds: ["strat-intellectual-property"], coverage: "covered",
    note: "著作権、特許権、実用新案権、意匠権、商標権と営業秘密を学ぶ。",
  },
  {
    id: "ipa-05", number: 5, field: "strategy", majorCategory: "企業と法務", middleCategory: "法務",
    item: "セキュリティ関連法規", topicIds: ["strat-security-laws"], coverage: "covered",
    note: "不正アクセス禁止法、サイバーセキュリティ基本法など情報セキュリティに関わる法規を学ぶ。",
  },
  {
    id: "ipa-06", number: 6, field: "strategy", majorCategory: "企業と法務", middleCategory: "法務",
    item: "労働関連・取引関連法規", topicIds: ["strat-labor-laws"], coverage: "covered",
    note: "労働基準法、労働者派遣法、請負・派遣の違い、取引上の契約を学ぶ。",
  },
  {
    id: "ipa-07", number: 7, field: "strategy", majorCategory: "企業と法務", middleCategory: "法務",
    item: "その他の法律・ガイドライン・情報倫理",
    topicIds: ["strat-legal-compliance", "strat-privacy-law"], coverage: "covered",
    note: "コンプライアンス、情報倫理、個人情報保護、プライバシーに関する基本ルールを学ぶ。",
  },
  {
    id: "ipa-08", number: 8, field: "strategy", majorCategory: "企業と法務", middleCategory: "法務",
    item: "標準化関連", topicIds: ["strat-standardization"], coverage: "covered",
    note: "JIS・ISOなどの標準、デファクトスタンダード、代表的なマネジメント規格を学ぶ。",
  },
  {
    id: "ipa-09", number: 9, field: "strategy", majorCategory: "経営戦略", middleCategory: "経営戦略マネジメント",
    item: "経営戦略手法",
    topicIds: ["strat-swot", "strat-3c", "strat-ppm", "strat-value-chain", "strat-corporate-strategy"],
    coverage: "covered",
    note: "SWOT・3C・PPM・バリューチェーンと、M&Aやアライアンスなどの戦略を学ぶ。",
  },
  {
    id: "ipa-10", number: 10, field: "strategy", majorCategory: "経営戦略", middleCategory: "経営戦略マネジメント",
    item: "マーケティング", topicIds: ["strat-marketing-4p"], coverage: "covered",
    note: "市場調査、セグメンテーション、ターゲティング、ポジショニング、4Pを学ぶ。",
  },
  {
    id: "ipa-11", number: 11, field: "strategy", majorCategory: "経営戦略", middleCategory: "経営戦略マネジメント",
    item: "ビジネス戦略と目標・評価",
    topicIds: ["strat-corporate-strategy", "strat-goal-evaluation"], coverage: "covered",
    note: "競争優位を作る戦略と、KGI・CSF・KPI・BSCによる目標設定と評価を学ぶ。",
  },
  {
    id: "ipa-12", number: 12, field: "strategy", majorCategory: "経営戦略", middleCategory: "経営戦略マネジメント",
    item: "経営管理システム", topicIds: ["strat-management-systems"], coverage: "expanded",
    note: "ヒト・モノ・カネ・情報の経営資源と、CRM・SCM・ERPの役割を学ぶ。",
  },
  {
    id: "ipa-13", number: 13, field: "strategy", majorCategory: "経営戦略", middleCategory: "技術戦略マネジメント",
    item: "技術開発戦略の立案・技術開発計画",
    topicIds: ["strat-technology-development-strategy"], coverage: "new",
    note: "技術ポートフォリオ、技術ロードマップ、研究開発テーマの選択と評価を学ぶ。",
  },
  {
    id: "ipa-14", number: 14, field: "strategy", majorCategory: "経営戦略", middleCategory: "ビジネスインダストリ",
    item: "ビジネスシステム", topicIds: ["strat-business-systems"], coverage: "new",
    note: "POS、ICカード、GPSなど、店舗・交通・物流を支える情報システムを学ぶ。",
  },
  {
    id: "ipa-15", number: 15, field: "strategy", majorCategory: "経営戦略", middleCategory: "ビジネスインダストリ",
    item: "エンジニアリングシステム",
    topicIds: ["strat-engineering-systems", "strat-production-management"], coverage: "new",
    note: "CAD・CAM・CAE・コンカレントエンジニアリングと、MRP・在庫・発注量の計算を学ぶ。",
  },
  {
    id: "ipa-16", number: 16, field: "strategy", majorCategory: "経営戦略", middleCategory: "ビジネスインダストリ",
    item: "e-ビジネス", topicIds: ["strat-ebusiness"], coverage: "covered",
    note: "EC・EDI、BtoB・BtoC・CtoC、フィンテック、シェアリングエコノミーを学ぶ。",
  },
  {
    id: "ipa-17", number: 17, field: "strategy", majorCategory: "経営戦略", middleCategory: "ビジネスインダストリ",
    item: "IoTシステム・組込みシステム",
    topicIds: ["tech-iot", "strat-embedded-systems"], coverage: "new",
    note: "IoTの通信・データ活用と、組込み機器のリアルタイム制御・センサー・アクチュエータを分けて学ぶ。",
  },
  {
    id: "ipa-18", number: 18, field: "strategy", majorCategory: "システム戦略", middleCategory: "システム戦略",
    item: "情報システム戦略", topicIds: ["strat-system-strategy"], coverage: "expanded",
    note: "経営戦略と整合した情報システム戦略、全体最適化、導入方針を学ぶ。",
  },
  {
    id: "ipa-19", number: 19, field: "strategy", majorCategory: "システム戦略", middleCategory: "システム戦略",
    item: "業務プロセス", topicIds: ["strat-business-process"], coverage: "expanded",
    note: "BPR・BPM、業務フロー、業務計画、ボトルネック分析による改善を学ぶ。",
  },
  {
    id: "ipa-20", number: 20, field: "strategy", majorCategory: "システム戦略", middleCategory: "システム戦略",
    item: "ソリューションビジネス",
    topicIds: ["strat-solution-business", "strat-generative-ai-dx"], coverage: "covered",
    note: "SI・ソリューション提供の形態と、生成AIを含むデジタル技術によるDX支援を学ぶ。",
  },
  {
    id: "ipa-21", number: 21, field: "strategy", majorCategory: "システム戦略", middleCategory: "システム戦略",
    item: "システム活用促進・評価", topicIds: ["strat-system-strategy"], coverage: "expanded",
    note: "利用者教育、導入促進、IT投資評価、導入後の効果測定と改善を学ぶ。",
  },
  {
    id: "ipa-22", number: 22, field: "strategy", majorCategory: "システム戦略", middleCategory: "システム企画",
    item: "システム化計画", topicIds: ["strat-system-planning-rfp"], coverage: "covered",
    note: "システム化構想から計画化までの目的、対象範囲、費用、スケジュールを学ぶ。",
  },
  {
    id: "ipa-23", number: 23, field: "strategy", majorCategory: "システム戦略", middleCategory: "システム企画",
    item: "要件定義",
    topicIds: ["strat-system-planning-rfp", "mgmt-requirements-definition"], coverage: "covered",
    note: "業務要件とシステム要件、機能・非機能要件、関係者間の合意を学ぶ。",
  },
  {
    id: "ipa-24", number: 24, field: "strategy", majorCategory: "システム戦略", middleCategory: "システム企画",
    item: "調達計画・実施", topicIds: ["strat-system-planning-rfp"], coverage: "covered",
    note: "RFI・RFP、提案評価、契約、受入れまでの調達手順を学ぶ。",
  },
  {
    id: "ipa-25", number: 25, field: "management", majorCategory: "開発技術", middleCategory: "システム開発技術",
    item: "システム開発技術",
    topicIds: ["mgmt-requirements-definition", "mgmt-system-design", "mgmt-testing", "mgmt-operation-maintenance"],
    coverage: "new",
    note: "要件定義、外部・内部・インタフェース・モジュール設計、テスト、運用・保守を学ぶ。",
  },
  {
    id: "ipa-26", number: 26, field: "management", majorCategory: "開発技術", middleCategory: "ソフトウェア開発管理技術",
    item: "開発プロセス・手法", topicIds: ["mgmt-development-process"], coverage: "covered",
    note: "ウォーターフォール、アジャイル、プロトタイピングなどの開発プロセスと使い分けを学ぶ。",
  },
  {
    id: "ipa-27", number: 27, field: "management", majorCategory: "プロジェクトマネジメント", middleCategory: "プロジェクトマネジメント",
    item: "プロジェクトマネジメント",
    topicIds: ["mgmt-pm-qcd", "mgmt-pmbok-basics", "mgmt-wbs-gantt", "mgmt-estimation", "mgmt-project-resource", "mgmt-project-communication", "mgmt-risk-management", "mgmt-pdca"],
    coverage: "new",
    note: "QCD、PMBOK、WBS・日程、見積り、要員・RACI、コミュニケーション経路、リスク、PDCAを学ぶ。",
  },
  {
    id: "ipa-28", number: 28, field: "management", majorCategory: "サービスマネジメント", middleCategory: "サービスマネジメント",
    item: "サービスマネジメント",
    topicIds: ["mgmt-service-sla", "mgmt-itil"], coverage: "covered",
    note: "ITサービスの価値、SLA、インシデント・問題・変更管理を学ぶ。",
  },
  {
    id: "ipa-29", number: 29, field: "management", majorCategory: "サービスマネジメント", middleCategory: "サービスマネジメント",
    item: "サービスマネジメントシステム",
    topicIds: ["mgmt-itil", "mgmt-service-sla"], coverage: "covered",
    note: "ITILを手掛かりに、サービスの計画・運用・測定・継続的改善とSLA管理を学ぶ。",
  },
  {
    id: "ipa-30", number: 30, field: "management", majorCategory: "サービスマネジメント", middleCategory: "サービスマネジメント",
    item: "ファシリティマネジメント", topicIds: ["mgmt-facility-management"], coverage: "covered",
    note: "設備、電源、UPS、入退室、災害対策などIT環境の維持管理を学ぶ。",
  },
  {
    id: "ipa-31", number: 31, field: "management", majorCategory: "サービスマネジメント", middleCategory: "システム監査",
    item: "システム監査", topicIds: ["mgmt-system-audit"], coverage: "covered",
    note: "監査人の独立性、監査計画、証拠収集、評価、報告とフォローアップを学ぶ。",
  },
  {
    id: "ipa-32", number: 32, field: "management", majorCategory: "サービスマネジメント", middleCategory: "システム監査",
    item: "内部統制", topicIds: ["mgmt-system-audit"], coverage: "covered",
    note: "内部統制の目的、職務分掌、承認、記録など業務を適切に保つ統制活動を学ぶ。",
  },
  {
    id: "ipa-33", number: 33, field: "technology", majorCategory: "基礎理論", middleCategory: "基礎理論",
    item: "離散数学", topicIds: ["tech-binary-data", "tech-logic-operations"], coverage: "covered",
    note: "2進数などの基数変換、集合・論理演算、真理値表の基礎を学ぶ。",
  },
  {
    id: "ipa-34", number: 34, field: "technology", majorCategory: "基礎理論", middleCategory: "基礎理論",
    item: "応用数学", topicIds: ["tech-data-utilization"], coverage: "expanded",
    note: "確率の基本と、平均・中央値・最頻値、分散・標準偏差からデータの中心とばらつきを読み取る。",
  },
  {
    id: "ipa-35", number: 35, field: "technology", majorCategory: "基礎理論", middleCategory: "基礎理論",
    item: "情報に関する理論",
    topicIds: ["tech-binary-data", "tech-multimedia-compression", "tech-ai-ml"], coverage: "covered",
    note: "情報量とデータ量の単位、符号化・圧縮の考え方、AIと機械学習の基本を学ぶ。",
  },
  {
    id: "ipa-36", number: 36, field: "technology", majorCategory: "基礎理論", middleCategory: "アルゴリズムとプログラミング",
    item: "データ構造", topicIds: ["tech-data-structure"], coverage: "covered",
    note: "配列、リスト、スタック、キュー、木構造などデータの持ち方と操作を学ぶ。",
  },
  {
    id: "ipa-37", number: 37, field: "technology", majorCategory: "基礎理論", middleCategory: "アルゴリズムとプログラミング",
    item: "アルゴリズムとプログラミング",
    topicIds: ["tech-algorithm-flowchart"], coverage: "covered",
    note: "順次・分岐・反復、フローチャート、探索・整列など処理手順の表現を学ぶ。",
  },
  {
    id: "ipa-38", number: 38, field: "technology", majorCategory: "基礎理論", middleCategory: "アルゴリズムとプログラミング",
    item: "プログラム言語", topicIds: ["tech-programming-basics"], coverage: "expanded",
    note: "機械語、アセンブリ言語、高水準言語と、コンパイラ・インタプリタの違いを学ぶ。",
  },
  {
    id: "ipa-39", number: 39, field: "technology", majorCategory: "基礎理論", middleCategory: "アルゴリズムとプログラミング",
    item: "その他の言語", topicIds: ["tech-programming-basics"], coverage: "expanded",
    note: "HTML・XML・JSONなど、Web表示やデータ記述・交換に使う言語形式を学ぶ。",
  },
  {
    id: "ipa-40", number: 40, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "コンピュータ構成要素",
    item: "プロセッサ",
    topicIds: ["tech-computer-core", "tech-parallel-systems"], coverage: "new",
    note: "CPUの命令実行とクロック、マルチコア・マルチプロセッサ・並列処理を学ぶ。",
  },
  {
    id: "ipa-41", number: 41, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "コンピュータ構成要素",
    item: "メモリ", topicIds: ["tech-computer-core"], coverage: "covered",
    note: "主記憶、キャッシュメモリ、補助記憶、揮発性と不揮発性、記憶階層を学ぶ。",
  },
  {
    id: "ipa-42", number: 42, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "コンピュータ構成要素",
    item: "入出力デバイス", topicIds: ["tech-io-devices"], coverage: "expanded",
    note: "入力・出力・補助記憶装置と、USB・HDMI・Bluetooth・NFCの接続特性を学ぶ。",
  },
  {
    id: "ipa-43", number: 43, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "システム構成要素",
    item: "システムの構成",
    topicIds: ["tech-system-processing-architecture", "tech-raid", "tech-cloud-models"], coverage: "new",
    note: "バッチ・リアルタイム・オンライン、集中・分散、クライアントサーバ・三層・P2P、RAID、クラウド構成を学ぶ。",
  },
  {
    id: "ipa-44", number: 44, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "システム構成要素",
    item: "システムの評価指標",
    topicIds: ["tech-system-performance", "tech-reliability-availability"], coverage: "new",
    note: "レスポンスタイム、ターンアラウンドタイム、スループット、ベンチマーク、MTBF・MTTR・稼働率を学ぶ。",
  },
  {
    id: "ipa-45", number: 45, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "ソフトウェア",
    item: "オペレーティングシステム", topicIds: ["tech-os-software-hardware"], coverage: "expanded",
    note: "OSによるCPU・メモリ・ファイル・入出力装置の管理と、基本ソフトウェアの役割を学ぶ。",
  },
  {
    id: "ipa-46", number: 46, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "ソフトウェア",
    item: "ファイルシステム", topicIds: ["tech-file-system", "tech-backup"], coverage: "new",
    note: "ファイル・ディレクトリ・パス・拡張子・アクセス権と、バックアップ・復旧手順を学ぶ。",
  },
  {
    id: "ipa-47", number: 47, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "ソフトウェア",
    item: "オフィスツール",
    topicIds: ["tech-os-software-hardware", "tech-spreadsheet"], coverage: "expanded",
    note: "ワープロ、表計算、プレゼンテーション、グループウェア、Webブラウザの用途と表計算操作を学ぶ。",
  },
  {
    id: "ipa-48", number: 48, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "ソフトウェア",
    item: "オープンソースソフトウェア", topicIds: ["tech-os-software-hardware"], coverage: "expanded",
    note: "ソースコード公開、再配布、無保証、ライセンス、GPLとコピーレフトの考え方を学ぶ。",
  },
  {
    id: "ipa-49", number: 49, field: "technology", majorCategory: "コンピュータシステム", middleCategory: "ハードウェア",
    item: "ハードウェア（コンピュータ・入出力装置）",
    topicIds: ["tech-computer-types", "tech-computer-core", "tech-io-devices"], coverage: "new",
    note: "PC、サーバ、汎用機、スーパーコンピュータ、マイコンと、CPU・記憶・入出力装置を学ぶ。",
  },
  {
    id: "ipa-50", number: 50, field: "technology", majorCategory: "技術要素", middleCategory: "情報デザイン",
    item: "情報デザイン", topicIds: ["tech-ui-ux"], coverage: "expanded",
    note: "情報デザインの原則と、Location・Alphabet・Time・Category・Hierarchyで整理するLATCHを学ぶ。",
  },
  {
    id: "ipa-51", number: 51, field: "technology", majorCategory: "技術要素", middleCategory: "情報デザイン",
    item: "インタフェース設計", topicIds: ["tech-ui-ux"], coverage: "covered",
    note: "ユーザビリティ、アクセシビリティ、ユニバーサルデザイン、GUI部品の使い分けを学ぶ。",
  },
  {
    id: "ipa-52", number: 52, field: "technology", majorCategory: "技術要素", middleCategory: "情報メディア",
    item: "マルチメディア技術", topicIds: ["tech-multimedia-compression"], coverage: "covered",
    note: "画像・音声・動画のデジタル化、解像度、色、代表的な圧縮方式を学ぶ。",
  },
  {
    id: "ipa-53", number: 53, field: "technology", majorCategory: "技術要素", middleCategory: "情報メディア",
    item: "マルチメディア応用", topicIds: ["tech-multimedia-compression"], coverage: "expanded",
    note: "CG、RGB・CMYKの色表現、VR・AR・MRと、用途に応じたマルチメディア表現を学ぶ。",
  },
  {
    id: "ipa-54", number: 54, field: "technology", majorCategory: "技術要素", middleCategory: "データベース",
    item: "データベース方式",
    topicIds: ["tech-database-sql", "tech-keys"], coverage: "covered",
    note: "関係データベース、表・行・列、主キー・外部キー、DBMSの基本を学ぶ。",
  },
  {
    id: "ipa-55", number: 55, field: "technology", majorCategory: "技術要素", middleCategory: "データベース",
    item: "データベース設計",
    topicIds: ["tech-normalization", "tech-keys"], coverage: "covered",
    note: "主キーと外部キー、参照整合性、重複や更新矛盾を減らす正規化を学ぶ。",
  },
  {
    id: "ipa-56", number: 56, field: "technology", majorCategory: "技術要素", middleCategory: "データベース",
    item: "データ操作", topicIds: ["tech-database-sql"], coverage: "covered",
    note: "SQLのSELECT・INSERT・UPDATE・DELETE、抽出条件、集計、結合の基本を学ぶ。",
  },
  {
    id: "ipa-57", number: 57, field: "technology", majorCategory: "技術要素", middleCategory: "データベース",
    item: "トランザクション処理", topicIds: ["tech-transaction"], coverage: "covered",
    note: "ACID特性、コミット・ロールバック、排他制御、障害時の回復を学ぶ。",
  },
  {
    id: "ipa-58", number: 58, field: "technology", majorCategory: "技術要素", middleCategory: "ネットワーク",
    item: "ネットワーク方式",
    topicIds: ["tech-lan-wan", "tech-network-devices", "tech-wireless-mobile"], coverage: "new",
    note: "LAN・WAN、リピータ・ブリッジ・ハブ・スイッチ・ルータ・ゲートウェイ・AP、無線・モバイル通信を学ぶ。",
  },
  {
    id: "ipa-59", number: 59, field: "technology", majorCategory: "技術要素", middleCategory: "ネットワーク",
    item: "通信プロトコル",
    topicIds: ["tech-web-internet-basics", "tech-http-https", "tech-email-protocol"], coverage: "covered",
    note: "TCP/IPの階層、HTTP・HTTPS、SMTP・POP・IMAPなど通信手順の役割を学ぶ。",
  },
  {
    id: "ipa-60", number: 60, field: "technology", majorCategory: "技術要素", middleCategory: "ネットワーク",
    item: "ネットワーク応用",
    topicIds: ["tech-network-address", "tech-api", "tech-cloud-models"], coverage: "covered",
    note: "IPアドレス・DNS、APIによるサービス連携、クラウドを利用するネットワークサービスを学ぶ。",
  },
  {
    id: "ipa-61", number: 61, field: "technology", majorCategory: "技術要素", middleCategory: "セキュリティ",
    item: "情報セキュリティ",
    topicIds: ["tech-security-cia", "tech-malware-phishing-ransomware", "tech-cyber-attacks"], coverage: "covered",
    note: "機密性・完全性・可用性、脅威と脆弱性、マルウェア、フィッシング、代表的なサイバー攻撃を学ぶ。",
  },
  {
    id: "ipa-62", number: 62, field: "technology", majorCategory: "技術要素", middleCategory: "セキュリティ",
    item: "情報セキュリティ管理", topicIds: ["tech-isms-risk"], coverage: "covered",
    note: "ISMS、リスク特定・分析・評価・対応、セキュリティ方針と継続的改善を学ぶ。",
  },
  {
    id: "ipa-63", number: 63, field: "technology", majorCategory: "技術要素", middleCategory: "セキュリティ",
    item: "情報セキュリティ対策・情報セキュリティ実装技術",
    topicIds: ["tech-firewall-vpn-zero-trust", "tech-auth-authz-mfa", "tech-encryption-hash", "tech-common-key-crypto", "tech-public-key-crypto", "tech-digital-signature"],
    coverage: "covered",
    note: "ファイアウォール・VPN・ゼロトラスト、認証・認可・MFA、暗号・ハッシュ・ディジタル署名を学ぶ。",
  },
] as const satisfies readonly IpaSyllabusItem[];
