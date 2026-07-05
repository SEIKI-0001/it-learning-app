import type { ChoiceKey } from "@/types";
import type { ExamLevelQuestion } from "@/types/checkPack";
import type { Difficulty } from "@/types/content";

// ============================================================================
// 過去問レベル問題（本番対応力を見るオリジナル4択問題）
// ----------------------------------------------------------------------------
// 方針:
//   - 実際の過去問の転載ではなく、ITパスポート試験レベルのオリジナル問題。
//   - 確認問題（基礎理解）より一歩踏み込んだ、場面判断・比較・適用を問う。
//   - 重要度の高いトピックから作成（MVP）。全トピックには無理に作らない。
//   - 作成の手間を減らすため compact 形式（正解＋誤答3つ）で書き、
//     ビルド時に4択（A=正解）へ展開する。表示側（TopicQuiz）が選択肢を
//     シャッフルするため、正解位置がAに固定されても学習者には偏らない。
// ============================================================================

const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

type CompactExamQuestion = {
  topicId: string;
  prompt: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
  difficulty?: Difficulty;
  examTags?: string[];
};

function build(q: CompactExamQuestion, index: number): ExamLevelQuestion {
  const texts = [q.correct, ...q.distractors];
  const choices = texts.map((text, i) => ({ key: CHOICE_KEYS[i], text }));
  return {
    id: `${q.topicId}-ex${index + 1}`,
    topicId: q.topicId,
    prompt: q.prompt,
    choices,
    correctChoice: "A",
    explanation: q.explanation,
    difficulty: q.difficulty ?? 2,
    examTags: q.examTags,
  };
}

// トピックごとの過去問レベル問題（compact）。ここを増やせば出題も増える。
const COMPACT: CompactExamQuestion[] = [
  // ---- tech-security-cia（情報セキュリティのCIA）----------------------------
  {
    topicId: "tech-security-cia",
    prompt:
      "Webサーバへの攻撃で、保存されている顧客データが第三者に読み取られてしまった。主にどの要素が損なわれたか。",
    correct: "機密性（Confidentiality）",
    distractors: [
      "完全性（Integrity）",
      "可用性（Availability）",
      "責任追跡性（Accountability）",
    ],
    explanation:
      "権限のない者にデータを見られた＝機密性の侵害。改ざんは完全性、使えなくなるのは可用性。",
    difficulty: 2,
    examTags: ["CIA", "機密性"],
  },
  {
    topicId: "tech-security-cia",
    prompt:
      "災害でサーバが停止し、利用者が長時間サービスを使えなくなった。CIAのどの要素を高める対策が最も直接的か。",
    correct: "冗長化やバックアップで可用性を高める",
    distractors: [
      "暗号化を強化して機密性を高める",
      "ハッシュ値で完全性を検証する",
      "アクセスログで機密性を監査する",
    ],
    explanation:
      "「使い続けられる」は可用性。停止対策は冗長構成・バックアップ・復旧手順が中心になる。",
    difficulty: 2,
    examTags: ["CIA", "可用性"],
  },

  // ---- tech-network-address（IPアドレス・NAT・DHCP）-------------------------
  {
    topicId: "tech-network-address",
    prompt:
      "社内の多数の端末が、1つのグローバルIPアドレスを共有してインターネットに接続している。この変換を行う仕組みはどれか。",
    correct: "NAT（NAPT）",
    distractors: ["DNS", "DHCP", "VPN"],
    explanation:
      "プライベートIPとグローバルIPを変換するのがNAT。ポートも使い分けて多対1にするのがNAPT。",
    difficulty: 2,
    examTags: ["NAT", "アドレス変換"],
  },
  {
    topicId: "tech-network-address",
    prompt:
      "PCをLANに接続すると、IPアドレスが自動で割り当てられて通信できるようになる。この割り当てを担うのはどれか。",
    correct: "DHCP",
    distractors: [
      "DNS",
      "NAT",
      "ARP",
    ],
    explanation:
      "IPアドレスなどの設定を自動配布するのがDHCP。名前とIPの対応はDNS、アドレス変換はNAT。",
    difficulty: 2,
    examTags: ["DHCP"],
  },

  // ---- tech-http-https ------------------------------------------------------
  {
    topicId: "tech-http-https",
    prompt:
      "ログイン情報を安全に送るため、通信を暗号化したい。HTTPに対して何を組み合わせればよいか。",
    correct: "TLSで暗号化するHTTPS",
    distractors: [
      "圧縮を行うHTTP/2",
      "アドレス変換を行うNAT",
      "名前解決を行うDNS",
    ],
    explanation:
      "HTTPSはHTTPをTLSで暗号化した通信。盗聴・改ざん・なりすましを防ぎ、ログイン等に使う。",
    difficulty: 2,
    examTags: ["HTTPS", "TLS"],
  },
  {
    topicId: "tech-http-https",
    prompt:
      "HTTPSで通信するとき、接続先が本物のサーバであることを確認するために使われるものはどれか。",
    correct: "サーバ証明書（デジタル証明書）",
    distractors: [
      "共通鍵のパスワード",
      "MACアドレス",
      "セッションクッキー",
    ],
    explanation:
      "サーバ証明書で相手の正当性を確認し、その後の通信を暗号化する。なりすまし防止に働く。",
    difficulty: 3,
    examTags: ["証明書", "HTTPS"],
  },

  // ---- tech-firewall-vpn-zero-trust ----------------------------------------
  {
    topicId: "tech-firewall-vpn-zero-trust",
    prompt:
      "「社内ネットワークだから安全」という前提を置かず、すべてのアクセスを検証する考え方はどれか。",
    correct: "ゼロトラスト",
    distractors: [
      "多層防御（多重防御）",
      "境界防御モデル",
      "フェールセーフ",
    ],
    explanation:
      "ゼロトラストは内部・外部を問わず「常に検証」する考え方。従来の境界防御の弱点を補う。",
    difficulty: 3,
    examTags: ["ゼロトラスト"],
  },
  {
    topicId: "tech-firewall-vpn-zero-trust",
    prompt:
      "外出先から社内システムへ、通信内容を暗号化した安全な経路で接続したい。適切な手段はどれか。",
    correct: "VPNで接続する",
    distractors: [
      "WAFを導入する",
      "IDSを設置する",
      "DMZに公開する",
    ],
    explanation:
      "VPNは公衆網の上に暗号化した仮想的な専用線を作る。WAFはWeb攻撃対策、IDSは侵入検知。",
    difficulty: 2,
    examTags: ["VPN"],
  },

  // ---- tech-auth-authz-mfa --------------------------------------------------
  {
    topicId: "tech-auth-authz-mfa",
    prompt:
      "パスワードに加えてスマートフォンに届くワンタイムコードの入力を求める。これは何の強化にあたるか。",
    correct: "多要素認証（MFA）による本人認証の強化",
    distractors: [
      "認可（アクセス権付与）の強化",
      "シングルサインオンの導入",
      "暗号化通信の強化",
    ],
    explanation:
      "「知識（パスワード）」＋「所持（スマホ）」など複数要素で認証するのがMFA。本人確認を強くする。",
    difficulty: 2,
    examTags: ["MFA", "認証"],
  },
  {
    topicId: "tech-auth-authz-mfa",
    prompt:
      "ログイン後に「この利用者はどのファイルを編集してよいか」を制御する仕組みはどれにあたるか。",
    correct: "認可（アクセス権の付与・制御）",
    distractors: [
      "認証（本人であることの確認）",
      "識別（IDの申告）",
      "暗号化（内容の秘匿）",
    ],
    explanation:
      "本人確認が認証、できることの範囲を決めるのが認可。試験ではこの区別が問われやすい。",
    difficulty: 2,
    examTags: ["認可", "認証"],
  },

  // ---- tech-cloud-models（SaaS/PaaS/IaaS）----------------------------------
  {
    topicId: "tech-cloud-models",
    prompt:
      "利用者が自分でアプリを開発できるよう、OSや実行環境まで提供されるクラウドサービスの区分はどれか。",
    correct: "PaaS",
    distractors: ["SaaS", "IaaS", "オンプレミス"],
    explanation:
      "PaaSは開発・実行のプラットフォームを提供。完成アプリの利用はSaaS、基盤のみはIaaS。",
    difficulty: 3,
    examTags: ["PaaS", "クラウド"],
  },
  {
    topicId: "tech-cloud-models",
    prompt:
      "電子メールや表計算などの完成したソフトを、ブラウザからそのまま使うクラウドの区分はどれか。",
    correct: "SaaS",
    distractors: ["PaaS", "IaaS", "ハウジング"],
    explanation:
      "SaaSは完成したソフトウェアをサービスとして利用する形態。利用者は開発も基盤管理も不要。",
    difficulty: 2,
    examTags: ["SaaS", "クラウド"],
  },

  // ---- tech-ai-ml -----------------------------------------------------------
  {
    topicId: "tech-ai-ml",
    prompt:
      "正解ラベル付きの大量データを与えて、予測モデルに規則性を学習させる方法はどれか。",
    correct: "教師あり学習",
    distractors: ["教師なし学習", "強化学習", "転移学習"],
    explanation:
      "正解付きデータで学ぶのが教師あり学習。正解なしで構造を見つけるのが教師なし、試行錯誤で報酬最大化が強化学習。",
    difficulty: 2,
    examTags: ["機械学習", "教師あり学習"],
  },
  {
    topicId: "tech-ai-ml",
    prompt:
      "エージェントが行動の結果として得られる報酬を手がかりに、より良い方策を学んでいく手法はどれか。",
    correct: "強化学習",
    distractors: [
      "教師あり学習",
      "教師なし学習",
      "クラスタリング",
    ],
    explanation:
      "報酬を最大化するよう試行錯誤で学ぶのが強化学習。ゲームAIやロボット制御で使われる。",
    difficulty: 3,
    examTags: ["機械学習", "強化学習"],
  },

  // ---- tech-database-sql ----------------------------------------------------
  {
    topicId: "tech-database-sql",
    prompt:
      "リレーショナルデータベースで、特定の条件に合う行だけを取り出すSQLの操作はどれか。",
    correct: "SELECT 文の WHERE 句で絞り込む",
    distractors: [
      "INSERT 文で行を追加する",
      "UPDATE 文で値を書き換える",
      "CREATE TABLE で表を定義する",
    ],
    explanation:
      "行の抽出はSELECT＋WHERE。追加はINSERT、更新はUPDATE、表定義はCREATE TABLE。",
    difficulty: 2,
    examTags: ["SQL", "SELECT"],
  },
  {
    topicId: "tech-database-sql",
    prompt:
      "複数の利用者が同じデータを同時に更新しても矛盾が起きないよう、DBMSが持つ仕組みはどれか。",
    correct: "排他制御（ロック）",
    distractors: [
      "正規化",
      "インデックス",
      "バックアップ",
    ],
    explanation:
      "同時更新の矛盾を防ぐのが排他制御。正規化は重複排除、インデックスは検索高速化の仕組み。",
    difficulty: 3,
    examTags: ["排他制御", "DBMS"],
  },

  // ---- tech-malware-phishing-ransomware ------------------------------------
  {
    topicId: "tech-malware-phishing-ransomware",
    prompt:
      "PC内のファイルが勝手に暗号化され、元に戻す条件として金銭を要求された。この攻撃はどれか。",
    correct: "ランサムウェア",
    distractors: ["フィッシング", "スパイウェア", "SQLインジェクション"],
    explanation:
      "データを暗号化し身代金を要求するのがランサムウェア。定期バックアップが有効な対策になる。",
    difficulty: 2,
    examTags: ["ランサムウェア"],
  },
  {
    topicId: "tech-malware-phishing-ransomware",
    prompt:
      "銀行を装ったメールで偽サイトへ誘導し、IDやパスワードを入力させて盗む手口はどれか。",
    correct: "フィッシング",
    distractors: [
      "ランサムウェア",
      "DoS攻撃",
      "ゼロデイ攻撃",
    ],
    explanation:
      "正規サービスを装って認証情報をだまし取るのがフィッシング。URLや送信元の確認が対策になる。",
    difficulty: 2,
    examTags: ["フィッシング"],
  },

  // ---- mgmt-service-sla -----------------------------------------------------
  {
    topicId: "mgmt-service-sla",
    prompt:
      "サービス提供者と利用者の間で、稼働率や応答時間などのサービス品質水準を数値で合意した文書はどれか。",
    correct: "SLA（サービスレベル合意）",
    distractors: [
      "SLM（サービスレベル管理）",
      "RFP（提案依頼書）",
      "NDA（秘密保持契約）",
    ],
    explanation:
      "品質水準を数値で取り決める合意がSLA。それをPDCAで維持・改善する活動がSLM。",
    difficulty: 2,
    examTags: ["SLA"],
  },
  {
    topicId: "mgmt-service-sla",
    prompt:
      "SLAで合意したサービスレベルを継続的に測定・評価し、維持向上させていく管理活動はどれか。",
    correct: "SLM（サービスレベル管理）",
    distractors: [
      "SLA（サービスレベル合意）",
      "SLO（サービスレベル目標）",
      "BCP（事業継続計画）",
    ],
    explanation:
      "合意（SLA）に対し、測定・評価・改善を回す管理がSLM。SLOは内部で持つ目標値。",
    difficulty: 3,
    examTags: ["SLM", "SLA"],
  },

  // ---- strat-swot -----------------------------------------------------------
  {
    topicId: "strat-swot",
    prompt:
      "SWOT分析で、自社の技術力の高さは内部環境のどの区分に分類されるか。",
    correct: "強み（Strength）",
    distractors: [
      "機会（Opportunity）",
      "弱み（Weakness）",
      "脅威（Threat）",
    ],
    explanation:
      "内部のプラス要因が強み、内部のマイナスが弱み。外部のプラスが機会、外部のマイナスが脅威。",
    difficulty: 2,
    examTags: ["SWOT", "強み"],
  },
  {
    topicId: "strat-swot",
    prompt:
      "市場の拡大や規制緩和など、自社にとって追い風となる外部環境はSWOTのどれにあたるか。",
    correct: "機会（Opportunity）",
    distractors: [
      "強み（Strength）",
      "弱み（Weakness）",
      "脅威（Threat）",
    ],
    explanation:
      "外部環境のプラス要因が機会。競合の台頭や景気悪化などのマイナス外部要因は脅威になる。",
    difficulty: 2,
    examTags: ["SWOT", "機会"],
  },

  // ---- strat-generative-ai-dx ----------------------------------------------
  {
    topicId: "strat-generative-ai-dx",
    prompt:
      "生成AIが、事実に基づかないもっともらしい誤った内容を生成してしまう現象はどれか。",
    correct: "ハルシネーション",
    distractors: [
      "オーバーフィッティング",
      "アルゴリズムバイアス",
      "ディープフェイク",
    ],
    explanation:
      "生成AIが誤情報をもっともらしく出す現象がハルシネーション。出力の事実確認が欠かせない。",
    difficulty: 3,
    examTags: ["生成AI", "ハルシネーション"],
  },
  {
    topicId: "strat-generative-ai-dx",
    prompt:
      "生成AIの回答精度を高めるため、社内文書などの外部知識を検索して回答に反映させる手法はどれか。",
    correct: "RAG（検索拡張生成）",
    distractors: [
      "ファインチューニング",
      "プロンプトインジェクション",
      "エッジコンピューティング",
    ],
    explanation:
      "外部知識を検索して回答に組み込むのがRAG。最新・社内情報を根拠づけて答えさせやすい。",
    difficulty: 3,
    examTags: ["生成AI", "RAG"],
  },

  // ---- 正式運用向け拡充：既存重点トピックの3問目 --------------------------
  {
    topicId: "tech-security-cia",
    prompt:
      "顧客情報を扱う社内システムで、担当者以外が顧客データを閲覧できないようにしたい。CIAの観点で最も直接的な対策はどれか。",
    correct: "アクセス権を必要最小限に設定し、機密性を保つ",
    distractors: [
      "二重化構成にして可用性を高める",
      "入力値の検証で完全性だけを確認する",
      "古いログを削除して保存容量を空ける",
    ],
    explanation:
      "閲覧できる人を制限する対策は機密性を守るもの。二重化は可用性、入力値検証は完全性の観点が中心になる。",
    difficulty: 2,
    examTags: ["CIA", "アクセス制御", "機密性"],
  },
  {
    topicId: "tech-network-address",
    prompt:
      "社内LANで端末を増やしたところ、IPアドレスの重複による通信障害が増えた。運用ミスを減らすために最も適切な対応はどれか。",
    correct: "DHCPで割り当て範囲を管理し、自動配布する",
    distractors: [
      "DNSのキャッシュ時間を短くする",
      "全端末に同じプライベートIPを設定する",
      "HTTPをHTTPSに変更する",
    ],
    explanation:
      "IPアドレスの重複防止にはDHCPによる自動割り当てが有効。DNSやHTTPSはアドレス配布の重複対策ではない。",
    difficulty: 3,
    examTags: ["DHCP", "IPアドレス", "運用"],
  },
  {
    topicId: "tech-http-https",
    prompt:
      "社内ポータルをHTTPS化したが、ブラウザに証明書の警告が表示される。利用者のなりすまし確認を適切に行うための対応はどれか。",
    correct: "信頼された認証局が発行した有効期限内のサーバ証明書を設定する",
    distractors: [
      "HTMLファイルを圧縮して転送量を減らす",
      "プライベートIPアドレスを固定する",
      "Cookieの保存期間を長くする",
    ],
    explanation:
      "HTTPSではサーバ証明書で接続先の正当性を確認する。圧縮、IP固定、Cookie期間は証明書警告の解消にならない。",
    difficulty: 3,
    examTags: ["HTTPS", "サーバ証明書", "認証局"],
  },
  {
    topicId: "tech-firewall-vpn-zero-trust",
    prompt:
      "公開WebサイトへのSQLインジェクションやクロスサイトスクリプティングを検知・遮断したい。最も適切な対策はどれか。",
    correct: "WAFを導入してWebアプリケーション層の攻撃を防ぐ",
    distractors: [
      "VPNで社外から社内LANへ接続する",
      "DNSでドメイン名をIPアドレスへ変換する",
      "DHCPで端末にIPアドレスを配布する",
    ],
    explanation:
      "WAFはWebアプリへの攻撃を防ぐ仕組み。VPNは暗号化された接続経路、DNS/DHCPはネットワークの基本機能。",
    difficulty: 3,
    examTags: ["WAF", "Web攻撃", "ファイアウォール"],
  },
  {
    topicId: "tech-auth-authz-mfa",
    prompt:
      "ある社員はログインには成功するが、経理データの閲覧は許可しないようにしたい。この制御で中心となる考え方はどれか。",
    correct: "認可で、利用できる操作やデータの範囲を制御する",
    distractors: [
      "認証で、パスワードの文字数だけを増やす",
      "暗号化で、画面の表示順を入れ替える",
      "バックアップで、閲覧権限を自動付与する",
    ],
    explanation:
      "ログインできるかを確かめるのが認証、ログイン後に何をしてよいかを決めるのが認可。権限管理は認可の領域。",
    difficulty: 2,
    examTags: ["認証", "認可", "アクセス権"],
  },
  {
    topicId: "tech-cloud-models",
    prompt:
      "繁忙期だけWebサーバを増やし、閑散期は台数を減らして費用を抑えたい。クラウド利用の利点として最も当てはまるものはどれか。",
    correct: "需要に応じてリソースを増減しやすいスケーラビリティ",
    distractors: [
      "すべての障害が自動的にゼロになること",
      "利用者が必ずOSのパッチ適用を不要にできること",
      "社内ネットワークだけで完結し外部接続が不要になること",
    ],
    explanation:
      "クラウドは必要なときにリソースを増減しやすい。障害ゼロや全管理不要はサービス形態によっても異なり、過大な理解。",
    difficulty: 3,
    examTags: ["クラウド", "スケーラビリティ", "IaaS"],
  },
  {
    topicId: "tech-ai-ml",
    prompt:
      "採用支援AIの判定が特定の属性に不利に働いている疑いがある。まず確認すべき観点として最も適切なものはどれか。",
    correct: "学習データや評価指標に偏りが含まれていないか確認する",
    distractors: [
      "モデルを大きくすれば偏りは必ず消えると判断する",
      "正解率だけ高ければ公平性の確認は不要とする",
      "入力データを暗号化すれば判定の偏りは解消すると考える",
    ],
    explanation:
      "AIの偏りは学習データや評価方法に起因することがある。精度だけでなく公平性や説明可能性の確認が必要。",
    difficulty: 3,
    examTags: ["AI", "アルゴリズムバイアス", "データ品質"],
  },
  {
    topicId: "tech-database-sql",
    prompt:
      "注文表にある顧客IDを使って、顧客表の氏名と注文表の購入金額を組み合わせて表示したい。SQLで主に使う操作はどれか。",
    correct: "JOINで複数の表を結合する",
    distractors: [
      "DELETEで不要な行を削除する",
      "COMMITで処理結果を確定する",
      "CREATE DATABASEで新しいデータベースを作る",
    ],
    explanation:
      "複数表の関連する行を組み合わせるのはJOIN。DELETE、COMMIT、CREATE DATABASEは目的が異なる。",
    difficulty: 3,
    examTags: ["SQL", "JOIN", "リレーショナルデータベース"],
  },
  {
    topicId: "tech-malware-phishing-ransomware",
    prompt:
      "ランサムウェア対策としてバックアップを取っていたが、常時接続された保存先も同時に暗号化された。改善策として最も適切なものはどれか。",
    correct: "バックアップを世代管理し、オフラインまたは書換え不可の保管も行う",
    distractors: [
      "バックアップファイル名を短くする",
      "バックアップを同じPCの同じフォルダにだけ保存する",
      "感染後にパスワードを長くすれば暗号化済みファイルが戻る",
    ],
    explanation:
      "ランサムウェアでは接続中のバックアップも暗号化され得る。世代管理、隔離保管、復元訓練が重要。",
    difficulty: 3,
    examTags: ["ランサムウェア", "バックアップ", "復旧"],
  },
  {
    topicId: "mgmt-service-sla",
    prompt:
      "SLAで月間稼働率99.9%以上を約束している。これを継続的に守るための活動として最も適切なものはどれか。",
    correct: "実績を測定し、未達の原因分析と改善を行う",
    distractors: [
      "一度SLAを締結したら測定を省略する",
      "障害件数を利用者に知らせず記録から削除する",
      "サービス品質ではなく広告文だけを変更する",
    ],
    explanation:
      "SLMはSLAで合意した水準を測定・評価し、改善する活動。測定しない、隠す、広告だけ変えるのは管理にならない。",
    difficulty: 3,
    examTags: ["SLA", "SLM", "継続的改善"],
  },
  {
    topicId: "strat-swot",
    prompt:
      "自社は技術力が高い一方、販売網が弱い。市場は拡大している。SWOTを踏まえた施策として最も自然なものはどれか。",
    correct: "技術力という強みを生かし、販売提携で機会を取り込む",
    distractors: [
      "市場拡大を内部の弱みとして分類する",
      "販売網の弱さを外部の脅威として分類する",
      "強みと機会を無視し、既存事業をすべて停止する",
    ],
    explanation:
      "技術力は内部の強み、市場拡大は外部の機会。弱みを補う提携などで機会を取り込む判断が自然。",
    difficulty: 3,
    examTags: ["SWOT", "クロスSWOT", "経営戦略"],
  },
  {
    topicId: "strat-generative-ai-dx",
    prompt:
      "社員が公開型の生成AIに未公表の顧客情報を入力して要約させようとしている。最も重視すべきリスクはどれか。",
    correct: "機密情報や個人情報が外部へ漏えいするリスク",
    distractors: [
      "入力文が短いほど必ず回答精度が下がるリスク",
      "生成AIを使うと社内規程が自動的に整備されるリスク",
      "RAGを使えばすべての法的責任がなくなるリスク",
    ],
    explanation:
      "公開型AIへ機密・個人情報を入力すると外部送信や学習利用のリスクがある。利用ルールとデータ分類が必要。",
    difficulty: 3,
    examTags: ["生成AI", "個人情報", "情報漏えい"],
  },

  // ---- technology ----------------------------------------------------------
  {
    topicId: "tech-binary-data",
    prompt:
      "8ビットで表せる状態数が256通りになる理由として正しいものはどれか。",
    correct: "各ビットが0または1の2通りを持ち、2の8乗で数えるから",
    distractors: [
      "8ビットは常に10進数の8通りだけを表すから",
      "1バイトは1,000ビットなので1,000通りになるから",
      "文字コードでは必ず128通りに制限されるから",
    ],
    explanation:
      "1ビットは2通り。8個並ぶと2を8回掛けるので256通りになる。1バイト=8ビットも合わせて覚える。",
    difficulty: 3,
    examTags: ["2進数", "ビット", "バイト"],
  },
  {
    topicId: "tech-binary-data",
    prompt:
      "画像ファイルのサイズを比較するとき、2MBと800KBでは一般にどちらが大きいか。",
    correct: "2MBの方が大きい",
    distractors: [
      "800KBの方が大きい",
      "単位が違うので大小は判断できない",
      "どちらも必ず同じ大きさになる",
    ],
    explanation:
      "1MBは約1,000KBなので、2MBは約2,000KB。800KBより大きい。単位換算の読み取り問題でよく問われる。",
    difficulty: 2,
    examTags: ["データ量", "単位換算", "KB", "MB"],
  },
  {
    topicId: "tech-computer-core",
    prompt:
      "表計算ソフトで大きなファイルを開くと動作が重くなるため、同時に扱える作業領域を増やしたい。主に増設を検討するものはどれか。",
    correct: "メモリ",
    distractors: ["CPUの命令セット", "ディスプレイの解像度", "ネットワークのドメイン名"],
    explanation:
      "メモリは作業中のデータを一時的に置く領域。大きなファイルや複数アプリを同時に扱う場合に不足しやすい。",
    difficulty: 2,
    examTags: ["メモリ", "主記憶", "ハードウェア"],
  },
  {
    topicId: "tech-computer-core",
    prompt:
      "電源を切っても写真や文書ファイルを保存しておく役割を持つ装置はどれか。",
    correct: "SSDやHDDなどのストレージ",
    distractors: ["CPUのレジスタ", "メインメモリのみ", "ブラウザのタブ"],
    explanation:
      "長期保存はストレージの役割。メモリは高速だが通常は電源を切ると内容が消える。",
    difficulty: 2,
    examTags: ["ストレージ", "補助記憶装置", "SSD"],
  },
  {
    topicId: "tech-os-software-hardware",
    prompt:
      "アプリケーションがプリンタやファイル保存を直接細かく制御しなくても利用できるのは、主に何が仲介しているからか。",
    correct: "OSがハードウェア資源を管理してアプリに機能を提供するから",
    distractors: [
      "CPUが利用者の意図を自動で読み取るから",
      "ストレージが画面表示を直接制御するから",
      "LANケーブルがアプリの権限を決めるから",
    ],
    explanation:
      "OSはアプリとハードウェアの間で資源管理や入出力機能を提供する基本ソフト。役割の階層を区別する。",
    difficulty: 2,
    examTags: ["OS", "ソフトウェア", "ハードウェア"],
  },
  {
    topicId: "tech-os-software-hardware",
    prompt:
      "スマートフォンで地図アプリを削除しても、OS自体は起動し続ける。この説明として最も適切なものはどれか。",
    correct: "地図アプリはOS上で動くアプリケーションの一つだから",
    distractors: [
      "地図アプリはCPUそのものだから",
      "OSは写真データだけを保存する装置だから",
      "アプリケーションは必ずハードウェアと同じ意味だから",
    ],
    explanation:
      "OSは基本ソフト、アプリはOS上で特定の目的を果たすソフト。アプリ削除とOS停止は同じではない。",
    difficulty: 2,
    examTags: ["OS", "アプリケーション", "基本ソフト"],
  },
  {
    topicId: "tech-web-internet-basics",
    prompt:
      "Webページ閲覧、メール送信、ファイル転送などで、通信の手順や形式を定めた約束事を何と呼ぶか。",
    correct: "プロトコル",
    distractors: ["コンパイラ", "デバイスドライバ", "データベース"],
    explanation:
      "通信の約束事がプロトコル。HTTP/HTTPS、SMTP、TCP/IPなどは用途別のプロトコルとして整理する。",
    difficulty: 2,
    examTags: ["プロトコル", "TCP/IP", "インターネット"],
  },
  {
    topicId: "tech-web-internet-basics",
    prompt:
      "Webブラウザでページを表示するとき、アプリケーション層で主に使われるプロトコルはどれか。",
    correct: "HTTPまたはHTTPS",
    distractors: ["DHCP", "SQL", "CSV"],
    explanation:
      "Webのデータ転送にはHTTP/HTTPSを使う。DHCPはIP設定配布、SQLはデータベース操作、CSVはデータ形式。",
    difficulty: 2,
    examTags: ["HTTP", "HTTPS", "アプリケーション層"],
  },
  {
    topicId: "tech-keys",
    prompt:
      "社員表で社員番号を主キーにする理由として最も適切なものはどれか。",
    correct: "各社員を一意に識別でき、同じ値が重複しないから",
    distractors: [
      "氏名より文字数が長いほど検索が遅くなるから",
      "主キーは必ず外部の会社が発行する番号だから",
      "主キーにすると表のすべての列が暗号化されるから",
    ],
    explanation:
      "主キーは行を一意に識別する列。重複しないこと、値が空でないことが重要な性質になる。",
    difficulty: 2,
    examTags: ["主キー", "DBMS", "一意性"],
  },
  {
    topicId: "tech-keys",
    prompt:
      "注文表の顧客IDが、顧客表の顧客IDを参照している。この注文表側の顧客IDは何にあたるか。",
    correct: "外部キー",
    distractors: ["主記憶", "サブネットマスク", "公開鍵"],
    explanation:
      "別の表の主キーを参照し、表同士の関係を表す列が外部キー。参照整合性の理解につながる。",
    difficulty: 2,
    examTags: ["外部キー", "参照整合性", "リレーショナルデータベース"],
  },
  {
    topicId: "tech-normalization",
    prompt:
      "受注明細に顧客住所を毎行重複して持たせた結果、住所変更時に一部の行だけ古い住所のまま残った。主にどの問題を避けるために正規化を行うか。",
    correct: "データの重複による更新不整合を防ぐため",
    distractors: [
      "すべての検索を必ず遅くするため",
      "表を1つにまとめて重複を増やすため",
      "通信内容を暗号化するため",
    ],
    explanation:
      "正規化は重複を減らし、更新・追加・削除時の不整合を防ぐ設計。暗号化や通信速度の話ではない。",
    difficulty: 3,
    examTags: ["正規化", "更新不整合", "データベース設計"],
  },
  {
    topicId: "tech-normalization",
    prompt:
      "商品マスタと売上明細に分ける設計の説明として最も適切なものはどれか。",
    correct: "商品名や単価などの商品情報を一か所で管理し、明細から参照する",
    distractors: [
      "同じ商品名を売上明細の全行に必ず手入力する",
      "商品情報を削除して売上だけを保存する",
      "商品マスタを作ると主キーが不要になる",
    ],
    explanation:
      "マスタ情報を分離し、明細はキーで参照することで重複を減らす。主キーは参照のためにも重要。",
    difficulty: 3,
    examTags: ["正規化", "マスタ", "外部キー"],
  },
  {
    topicId: "tech-encryption-hash",
    prompt:
      "保存したパスワードそのものを復元できない形で照合したい。適切な方式はどれか。",
    correct: "ソルトを加えたハッシュ値を保存して照合する",
    distractors: [
      "平文パスワードをそのまま保存する",
      "可逆な暗号化だけで全員同じ鍵を共有する",
      "パスワードを画面に表示して利用者に確認させる",
    ],
    explanation:
      "パスワード保存では復号を前提にしないハッシュ化が基本。ソルトで同じパスワードでも異なる値にし、総当たりを難しくする。",
    difficulty: 3,
    examTags: ["ハッシュ", "ソルト", "パスワード"],
  },
  {
    topicId: "tech-encryption-hash",
    prompt:
      "ファイルが改ざんされていないことを確認したい。送信前後で比較する値として最も適切なものはどれか。",
    correct: "ハッシュ値",
    distractors: ["IPアドレス", "画面解像度", "メール件名"],
    explanation:
      "ハッシュ値はデータから固定長の値を計算し、改ざん検知に使える。内容を秘匿する暗号化とは目的が異なる。",
    difficulty: 2,
    examTags: ["ハッシュ", "完全性", "改ざん検知"],
  },
  {
    topicId: "tech-common-key-crypto",
    prompt:
      "共通鍵暗号方式の特徴として正しいものはどれか。",
    correct: "暗号化と復号に同じ鍵を使うため、鍵の安全な共有が課題になる",
    distractors: [
      "暗号化には公開鍵、復号には秘密鍵を必ず使う",
      "鍵を使わずにデータの改ざんだけを検知する",
      "通信相手が増えても鍵管理の手間はまったく増えない",
    ],
    explanation:
      "共通鍵暗号は同じ鍵で暗号化・復号するため高速だが、相手に鍵を安全に渡す必要がある。",
    difficulty: 3,
    examTags: ["共通鍵暗号", "暗号化", "鍵配送"],
  },
  {
    topicId: "tech-common-key-crypto",
    prompt:
      "大量データの暗号化処理で、公開鍵暗号より共通鍵暗号がよく使われる理由として最も適切なものはどれか。",
    correct: "一般に処理が高速で、大量データの暗号化に向いているから",
    distractors: [
      "鍵を秘密にしなくても安全だから",
      "復号できない一方向処理だから",
      "認証局がなければ絶対に使えないから",
    ],
    explanation:
      "共通鍵暗号は高速で大量データ向き。鍵の秘密保持は必要であり、一方向処理はハッシュの説明。",
    difficulty: 3,
    examTags: ["共通鍵暗号", "性能", "暗号化"],
  },
  {
    topicId: "tech-public-key-crypto",
    prompt:
      "Aさんにだけ読めるようにメッセージを送りたい。公開鍵暗号方式で送信者が暗号化に使う鍵はどれか。",
    correct: "Aさんの公開鍵",
    distractors: [
      "Aさんの秘密鍵",
      "送信者の公開鍵",
      "全員で共有する同じパスワード",
    ],
    explanation:
      "受信者の公開鍵で暗号化し、対応する受信者の秘密鍵で復号する。秘密鍵は本人だけが持つ。",
    difficulty: 3,
    examTags: ["公開鍵暗号", "公開鍵", "秘密鍵"],
  },
  {
    topicId: "tech-public-key-crypto",
    prompt:
      "公開鍵暗号方式の説明として最も適切なものはどれか。",
    correct: "公開鍵は配布でき、秘密鍵は本人だけが厳重に管理する",
    distractors: [
      "公開鍵も秘密鍵も全員にメールで配布する",
      "秘密鍵だけで相手の本人確認が不要になる",
      "同じ鍵を全員で共有して暗号化と復号に使う",
    ],
    explanation:
      "公開鍵暗号は鍵のペアを使う。公開鍵は広く配布できるが、秘密鍵は本人だけが守る必要がある。",
    difficulty: 2,
    examTags: ["公開鍵暗号", "鍵管理", "秘密鍵"],
  },
  {
    topicId: "tech-algorithm-flowchart",
    prompt:
      "入力された点数が80点以上なら「合格」、そうでなければ「再学習」と表示する処理は、基本構造のどれか。",
    correct: "分岐",
    distractors: ["順次", "繰り返し", "排他制御"],
    explanation:
      "条件によって処理を変えるのが分岐。順次は上から実行、繰り返しは同じ処理を反復する。",
    difficulty: 2,
    examTags: ["アルゴリズム", "分岐", "フローチャート"],
  },
  {
    topicId: "tech-algorithm-flowchart",
    prompt:
      "1から10までの数を順に合計する処理で、同じ加算処理を条件が終わるまで行う。基本構造として最も当てはまるものはどれか。",
    correct: "繰り返し",
    distractors: ["暗号化", "正規化", "名前解決"],
    explanation:
      "同じ処理を条件付きで反復するのが繰り返し。合計、検索、件数カウントなどでよく使われる。",
    difficulty: 2,
    examTags: ["アルゴリズム", "繰り返し", "合計"],
  },
  {
    topicId: "tech-reliability-availability",
    prompt:
      "稼働率が0.9の装置を2台直列に接続したシステムの稼働率はどれか。",
    correct: "0.81",
    distractors: ["0.99", "0.9", "1.8"],
    explanation:
      "直列構成はすべて動く必要があるため稼働率を掛け合わせる。0.9×0.9=0.81。",
    difficulty: 3,
    examTags: ["稼働率", "直列構成", "計算"],
  },
  {
    topicId: "tech-reliability-availability",
    prompt:
      "MTBFが長く、MTTRが短いシステムの特徴として最も適切なものはどれか。",
    correct: "故障しにくく、故障しても早く復旧できる",
    distractors: [
      "故障しやすく、復旧にも時間がかかる",
      "故障の平均間隔と復旧時間は稼働率に関係しない",
      "MTBFは短いほど信頼性が高い",
    ],
    explanation:
      "MTBFは平均故障間隔で長いほど故障しにくい。MTTRは平均修復時間で短いほど復旧が早い。",
    difficulty: 3,
    examTags: ["MTBF", "MTTR", "信頼性"],
  },
  {
    topicId: "tech-logic-operations",
    prompt:
      "会員であり、かつ、年齢が18歳以上の利用者だけ申込み可能にしたい。条件式で中心となる論理演算はどれか。",
    correct: "AND",
    distractors: ["OR", "NOT", "XOR"],
    explanation:
      "両方の条件を同時に満たす必要がある場合はAND。どちらか一方ならOR、否定ならNOT。",
    difficulty: 2,
    examTags: ["論理演算", "AND", "条件式"],
  },
  {
    topicId: "tech-logic-operations",
    prompt:
      "「在庫がない」ことを条件にしたい。真偽値で条件を反転させる論理演算はどれか。",
    correct: "NOT",
    distractors: ["AND", "OR", "JOIN"],
    explanation:
      "NOTは真偽を反転する演算。AND/ORは複数条件の組合せ、JOINはデータベースの表結合。",
    difficulty: 2,
    examTags: ["論理演算", "NOT", "真理値"],
  },
  {
    topicId: "tech-spreadsheet",
    prompt:
      "セルB2の式 `=$A$1*B2` をC3へコピーしたとき、参照 `$A$1` はどうなるか。",
    correct: "$A$1のまま変わらない",
    distractors: ["$B$2に変わる", "A1に戻る", "C3に変わる"],
    explanation:
      "$A$1は列も行も固定した絶対参照なので、コピー先が変わっても参照先は変わらない。",
    difficulty: 3,
    examTags: ["表計算", "絶対参照", "セル参照"],
  },
  {
    topicId: "tech-spreadsheet",
    prompt:
      "税率セルだけを固定し、商品価格の行に合わせて計算式を下へコピーしたい。税率セルの参照として適切なものはどれか。",
    correct: "$B$1",
    distractors: ["B1", "B$1C", "税率"],
    explanation:
      "税率セルを固定するには絶対参照にする。列B・行1を固定する表記は$B$1。",
    difficulty: 2,
    examTags: ["表計算", "絶対参照", "計算式"],
  },
  {
    topicId: "tech-data-structure",
    prompt:
      "最後に入れたデータを最初に取り出すデータ構造はどれか。",
    correct: "スタック",
    distractors: ["キュー", "DNS", "リレーショナルデータベース"],
    explanation:
      "スタックはLIFO（後入れ先出し）。キューはFIFO（先入れ先出し）で、待ち行列のイメージ。",
    difficulty: 2,
    examTags: ["スタック", "LIFO", "データ構造"],
  },
  {
    topicId: "tech-data-structure",
    prompt:
      "コールセンターの受付順に問い合わせを処理する仕組みに近いデータ構造はどれか。",
    correct: "キュー",
    distractors: ["スタック", "ハッシュ値", "公開鍵"],
    explanation:
      "先に入ったものを先に処理するのがキュー（FIFO）。受付順の処理や印刷待ち行列に使われる。",
    difficulty: 2,
    examTags: ["キュー", "FIFO", "待ち行列"],
  },
  {
    topicId: "tech-transaction",
    prompt:
      "銀行振込で、出金処理は成功したが入金処理に失敗した。この不整合を避けるために必要な考え方はどれか。",
    correct: "一連の処理をトランザクションとして扱い、失敗時はロールバックする",
    distractors: [
      "出金処理だけをコミットして終了する",
      "入金先口座を削除して処理を軽くする",
      "処理結果をログに残さず再実行を禁止する",
    ],
    explanation:
      "関連する複数処理は全部成功して確定、失敗したら元に戻す。これがトランザクション管理の基本。",
    difficulty: 3,
    examTags: ["トランザクション", "ロールバック", "整合性"],
  },
  {
    topicId: "tech-transaction",
    prompt:
      "同じ在庫数を複数の利用者が同時に更新し、在庫数がずれることを防ぐ仕組みはどれか。",
    correct: "排他制御",
    distractors: ["正規化だけ", "DNSラウンドロビン", "画像圧縮"],
    explanation:
      "同時更新の競合を防ぐには排他制御（ロック）を使う。正規化はデータ構造の重複削減が中心。",
    difficulty: 3,
    examTags: ["排他制御", "ロック", "同時更新"],
  },
  {
    topicId: "tech-cyber-attacks",
    prompt:
      "Web入力欄に不正なSQL断片を入れて、意図しない検索や更新を実行させる攻撃はどれか。",
    correct: "SQLインジェクション",
    distractors: ["DoS攻撃", "フィッシング", "ブルートフォース攻撃"],
    explanation:
      "SQLインジェクションは入力値を悪用してSQLを改変する攻撃。入力値検証やプレースホルダが対策になる。",
    difficulty: 2,
    examTags: ["SQLインジェクション", "Web攻撃", "入力値検証"],
  },
  {
    topicId: "tech-cyber-attacks",
    prompt:
      "多数の端末から大量の通信を送り、サービスを利用できない状態にする攻撃はどれか。",
    correct: "DDoS攻撃",
    distractors: ["ディジタル署名", "正規化", "RAG"],
    explanation:
      "分散した多数の端末から過大な負荷をかけるのがDDoS攻撃。可用性を損なう攻撃として整理する。",
    difficulty: 2,
    examTags: ["DDoS", "可用性", "サイバー攻撃"],
  },
  {
    topicId: "tech-digital-signature",
    prompt:
      "電子契約書が本人から送られ、送信後に改ざんされていないことを確認したい。利用する仕組みはどれか。",
    correct: "ディジタル署名",
    distractors: ["NAT", "DHCP", "キャッシュ削除"],
    explanation:
      "ディジタル署名は送信者の確認と改ざん検知に使う。暗号化だけとは目的が異なる。",
    difficulty: 3,
    examTags: ["ディジタル署名", "完全性", "本人確認"],
  },
  {
    topicId: "tech-digital-signature",
    prompt:
      "公開鍵が本当に本人のものかを確認するため、公開鍵と所有者を結び付ける役割を持つものはどれか。",
    correct: "認証局が発行する電子証明書",
    distractors: ["プライベートIPアドレス", "表計算の相対参照", "ロールバックログ"],
    explanation:
      "電子証明書は公開鍵と所有者情報を結び付け、認証局が信頼を支える。HTTPSでも重要な役割を持つ。",
    difficulty: 3,
    examTags: ["認証局", "電子証明書", "公開鍵"],
  },
  {
    topicId: "tech-isms-risk",
    prompt:
      "情報資産を洗い出し、脅威と脆弱性からリスクを評価して対策を決める活動はどれか。",
    correct: "リスクアセスメント",
    distractors: ["リスクの完全放置", "画面デザインレビュー", "売上予測だけの分析"],
    explanation:
      "リスクアセスメントは情報資産・脅威・脆弱性を踏まえてリスクを評価する活動。ISMSの重要要素。",
    difficulty: 2,
    examTags: ["ISMS", "リスクアセスメント", "情報資産"],
  },
  {
    topicId: "tech-isms-risk",
    prompt:
      "ISMSを継続的に改善するための考え方として最も適切なものはどれか。",
    correct: "PDCAサイクルを回して管理策を見直す",
    distractors: [
      "一度文書を作成したら見直しをしない",
      "事故が起きたら記録を残さず担当者だけで処理する",
      "セキュリティ対策をすべて利用者任せにする",
    ],
    explanation:
      "ISMSは組織的な情報セキュリティ管理で、リスクに応じた管理策を継続的に改善する。",
    difficulty: 3,
    examTags: ["ISMS", "PDCA", "継続的改善"],
  },
  {
    topicId: "tech-wireless-mobile",
    prompt:
      "店舗の無料Wi-Fiで、SSIDだけが正規店名に似ているアクセスポイントを見つけた。利用前の判断として最も適切なものはどれか。",
    correct: "店舗が掲示する正規SSIDか確認し、不明な場合は接続しない",
    distractors: [
      "SSIDが似ていれば暗号化されているとみなす",
      "パスワード不要のWi-Fiほど安全と判断する",
      "通信内容がHTTPでも個人情報を入力する",
    ],
    explanation:
      "偽アクセスポイントに接続すると盗聴や誘導のリスクがある。SSID名だけで安全とは判断できない。",
    difficulty: 2,
    examTags: ["無線LAN", "SSID", "盗聴対策"],
  },
  {
    topicId: "tech-wireless-mobile",
    prompt:
      "スマートフォンの回線を使ってPCをインターネットに接続する機能はどれか。",
    correct: "テザリング",
    distractors: ["ハウジング", "正規化", "ロールバック"],
    explanation:
      "テザリングはスマートフォンを中継して他端末をネット接続する機能。通信量やセキュリティ設定に注意する。",
    difficulty: 2,
    examTags: ["テザリング", "モバイル通信", "無線LAN"],
  },
  {
    topicId: "tech-email-protocol",
    prompt:
      "メールを送信するために主に使われるプロトコルはどれか。",
    correct: "SMTP",
    distractors: ["POP3", "IMAP", "DHCP"],
    explanation:
      "メール送信はSMTP。受信はPOP3やIMAPが使われる。DHCPはIPアドレスなどの自動配布。",
    difficulty: 2,
    examTags: ["SMTP", "メール", "プロトコル"],
  },
  {
    topicId: "tech-email-protocol",
    prompt:
      "複数端末で同じメールボックスを同期しながら扱いたい。受信方式として適切なものはどれか。",
    correct: "IMAP",
    distractors: ["SMTPだけ", "NAT", "SQL"],
    explanation:
      "IMAPはサーバ上のメールを参照し、複数端末で状態を共有しやすい。POP3は端末へ取り込む利用が中心。",
    difficulty: 3,
    examTags: ["IMAP", "POP3", "メール受信"],
  },

  // ---- management ----------------------------------------------------------
  {
    topicId: "mgmt-pm-qcd",
    prompt:
      "納期を守るためにテスト期間を極端に短縮すると、最も直接的に悪化しやすいQCDの要素はどれか。",
    correct: "Quality（品質）",
    distractors: ["Cost（費用）だけ", "Delivery（納期）だけ", "DNS（名前解決）"],
    explanation:
      "QCDは品質・費用・納期のバランス。テスト不足は品質低下につながりやすく、単純な納期優先は危険。",
    difficulty: 2,
    examTags: ["QCD", "品質", "プロジェクト管理"],
  },
  {
    topicId: "mgmt-pm-qcd",
    prompt:
      "要件追加により作業量が増えた。納期と品質を維持したい場合、プロジェクト管理上まず検討すべき対応はどれか。",
    correct: "追加費用やスコープ調整を含め、QCD全体の影響を関係者と合意する",
    distractors: [
      "担当者に無断で残業を前提にする",
      "テストをすべて省略して品質を維持する",
      "変更内容を記録せずに進める",
    ],
    explanation:
      "スコープ変更はQCDに影響するため、費用・納期・品質のトレードオフを可視化し合意する必要がある。",
    difficulty: 3,
    examTags: ["QCD", "スコープ変更", "合意形成"],
  },
  {
    topicId: "mgmt-wbs-gantt",
    prompt:
      "プロジェクトの作業を成果物単位で細かく分解し、漏れを防ぎたい。作成するものはどれか。",
    correct: "WBS",
    distractors: ["SLA", "NAT", "貸借対照表"],
    explanation:
      "WBSは作業分解構成図。やるべき作業を階層的に分解し、見積りや担当割当の土台にする。",
    difficulty: 2,
    examTags: ["WBS", "プロジェクト管理", "作業分解"],
  },
  {
    topicId: "mgmt-wbs-gantt",
    prompt:
      "各作業の開始日・終了日・前後関係を横棒で示し、進捗を見える化したい。適切な図はどれか。",
    correct: "ガントチャート",
    distractors: ["SWOTマトリクス", "ER図", "真理値表"],
    explanation:
      "ガントチャートは時間軸上に作業期間を示す管理図。WBSで分解した作業のスケジュール管理に使う。",
    difficulty: 2,
    examTags: ["ガントチャート", "進捗管理", "スケジュール"],
  },
  {
    topicId: "mgmt-system-audit",
    prompt:
      "システム監査人に求められる立場として最も適切なものはどれか。",
    correct: "監査対象から独立した立場で客観的に評価する",
    distractors: [
      "開発担当者として仕様を自由に変更する",
      "監査対象部門の成果を必ず承認する",
      "利用者のパスワードを収集して公開する",
    ],
    explanation:
      "システム監査では独立性と客観性が重要。監査対象を評価し、改善提案を行うが運用の責任者そのものではない。",
    difficulty: 2,
    examTags: ["システム監査", "独立性", "内部統制"],
  },
  {
    topicId: "mgmt-system-audit",
    prompt:
      "内部統制の説明として最も適切なものはどれか。",
    correct: "業務の有効性、法令遵守、財務報告の信頼性などを確保する仕組み",
    distractors: [
      "すべての業務判断を外部監査人だけが行う仕組み",
      "社員の裁量を完全になくし、改善提案も禁止する仕組み",
      "情報システムの画面色を統一するだけの活動",
    ],
    explanation:
      "内部統制は組織が目的を達成し、不正や誤りを防ぐための仕組み。IT統制もその一部として問われる。",
    difficulty: 3,
    examTags: ["内部統制", "IT統制", "コンプライアンス"],
  },
  {
    topicId: "mgmt-development-process",
    prompt:
      "要件定義、設計、実装、テストを順番に進め、前工程の成果物を確認しながら進める開発モデルはどれか。",
    correct: "ウォータフォールモデル",
    distractors: ["アジャイル開発", "ランサムウェア", "PPM"],
    explanation:
      "ウォータフォールは工程を上流から下流へ順に進めるモデル。変更には弱いが計画管理しやすい。",
    difficulty: 2,
    examTags: ["ウォータフォール", "開発プロセス", "工程"],
  },
  {
    topicId: "mgmt-development-process",
    prompt:
      "短い期間で動くソフトを少しずつ作り、利用者の反応を得ながら改善したい。適した開発の考え方はどれか。",
    correct: "アジャイル開発",
    distractors: ["一括移行だけ", "完全な手作業運用", "単純なデータ圧縮"],
    explanation:
      "アジャイルは短い反復で開発し、変化に対応しながら価値を高める。要件が変わりやすい場面に向く。",
    difficulty: 2,
    examTags: ["アジャイル", "反復開発", "利用者フィードバック"],
  },
  {
    topicId: "mgmt-requirements-definition",
    prompt:
      "システムに「何をさせるか」を表す、注文登録や在庫照会などの要件はどれか。",
    correct: "機能要件",
    distractors: ["非機能要件", "法定耐用年数", "公開鍵"],
    explanation:
      "機能要件はシステムが提供する機能。性能、可用性、セキュリティなど品質面は非機能要件。",
    difficulty: 2,
    examTags: ["要件定義", "機能要件", "非機能要件"],
  },
  {
    topicId: "mgmt-requirements-definition",
    prompt:
      "「ピーク時でも3秒以内に検索結果を返す」という要件の分類として最も適切なものはどれか。",
    correct: "非機能要件",
    distractors: ["機能要件", "著作権", "主キー"],
    explanation:
      "応答時間や稼働率など品質・制約に関する条件は非機能要件。処理内容そのものとは区別する。",
    difficulty: 2,
    examTags: ["非機能要件", "性能", "要件定義"],
  },
  {
    topicId: "mgmt-testing",
    prompt:
      "個々のプログラム部品が設計どおり動くかを確認する最初の段階のテストはどれか。",
    correct: "単体テスト",
    distractors: ["受入テスト", "運用テスト", "システム監査"],
    explanation:
      "単体テストは部品単位の確認。結合テスト、システムテスト、受入テストへと範囲が広がる。",
    difficulty: 2,
    examTags: ["テスト", "単体テスト", "開発工程"],
  },
  {
    topicId: "mgmt-testing",
    prompt:
      "利用部門が、完成したシステムが業務要件を満たしているかを最終確認するテストはどれか。",
    correct: "受入テスト",
    distractors: ["単体テスト", "結合テスト", "静的コード解析だけ"],
    explanation:
      "受入テストは利用者側が業務要件への適合を確認するテスト。開発者だけの部品確認とは目的が違う。",
    difficulty: 3,
    examTags: ["受入テスト", "要件確認", "利用者"],
  },
  {
    topicId: "mgmt-pdca",
    prompt:
      "問い合わせ対応時間を短縮するため、目標を決めて改善策を実施し、結果を測定して次の改善につなげる考え方はどれか。",
    correct: "PDCAサイクル",
    distractors: ["CIA", "NAT", "SQLインジェクション"],
    explanation:
      "PDCAはPlan、Do、Check、Actの改善サイクル。継続的な業務改善やサービス管理で使われる。",
    difficulty: 2,
    examTags: ["PDCA", "継続的改善", "管理"],
  },
  {
    topicId: "mgmt-pdca",
    prompt:
      "改善施策を実施した後、目標値と実績を比較して効果を確認する段階はどれか。",
    correct: "Check",
    distractors: ["Plan", "Do", "Act"],
    explanation:
      "Checkは評価・確認の段階。Planは計画、Doは実行、Actは改善・標準化など次の行動。",
    difficulty: 2,
    examTags: ["PDCA", "Check", "評価"],
  },
  {
    topicId: "mgmt-risk-management",
    prompt:
      "重要サーバの停止リスクに対し、冗長化して発生時の影響を小さくする対応はどれか。",
    correct: "リスク低減",
    distractors: ["リスク回避", "リスク移転", "リスク受容"],
    explanation:
      "対策により発生確率や影響を小さくするのが低減。活動をやめるのが回避、保険などは移転、小さいリスクを受け入れるのが受容。",
    difficulty: 3,
    examTags: ["リスク管理", "リスク低減", "冗長化"],
  },
  {
    topicId: "mgmt-risk-management",
    prompt:
      "自社で設備を持つリスクを減らすため、専門業者へ運用を委託して契約で責任分担を決める対応はどれか。",
    correct: "リスク移転",
    distractors: ["リスク受容", "リスク発生", "リスク隠蔽"],
    explanation:
      "委託や保険でリスクの影響や負担を他者へ移すのがリスク移転。ただし責任が完全になくなるわけではない。",
    difficulty: 3,
    examTags: ["リスク管理", "リスク移転", "委託"],
  },
  {
    topicId: "mgmt-itil",
    prompt:
      "利用者から「業務システムにログインできない」と連絡があった。まずサービスを早く使える状態に戻す活動はどれか。",
    correct: "インシデント管理",
    distractors: ["問題管理", "変更管理", "財務会計"],
    explanation:
      "インシデント管理はサービスの早期復旧を目的とする。問題管理は根本原因の分析、変更管理は変更の影響評価と統制。",
    difficulty: 2,
    examTags: ["ITIL", "インシデント管理", "サービス管理"],
  },
  {
    topicId: "mgmt-itil",
    prompt:
      "同じ障害が繰り返し発生しているため、根本原因を分析し再発防止策を決めたい。ITILの活動として最も適切なものはどれか。",
    correct: "問題管理",
    distractors: ["インシデント管理だけ", "変更管理だけ", "販売促進管理"],
    explanation:
      "問題管理は根本原因を特定し、恒久対策や再発防止につなげる。単に早く復旧させるだけならインシデント管理。",
    difficulty: 3,
    examTags: ["ITIL", "問題管理", "再発防止"],
  },

  // ---- strategy ------------------------------------------------------------
  {
    topicId: "strat-3c",
    prompt:
      "3C分析で、自社の強みや経営資源を分析する視点はどれか。",
    correct: "Company（自社）",
    distractors: ["Customer（顧客）", "Competitor（競合）", "Cost（費用）"],
    explanation:
      "3CはCustomer、Competitor、Company。自社の強み・弱みや経営資源はCompanyの視点で見る。",
    difficulty: 2,
    examTags: ["3C", "Company", "経営分析"],
  },
  {
    topicId: "strat-3c",
    prompt:
      "新サービス検討で、顧客ニーズ、競合の提供価値、自社の実現力を比較したい。使う分析手法として最も適切なものはどれか。",
    correct: "3C分析",
    distractors: ["正規化", "ディジタル署名", "MTBF分析だけ"],
    explanation:
      "3Cは顧客・競合・自社の3視点で市場を整理する。サービス戦略やマーケティングの初期検討に向く。",
    difficulty: 2,
    examTags: ["3C", "顧客", "競合"],
  },
  {
    topicId: "strat-marketing-4p",
    prompt:
      "新商品の価格設定や割引方針を検討している。4Pのどの要素か。",
    correct: "Price",
    distractors: ["Product", "Place", "Promotion"],
    explanation:
      "価格、割引、支払条件はPrice。製品はProduct、流通はPlace、広告や販売促進はPromotion。",
    difficulty: 2,
    examTags: ["4P", "Price", "マーケティング"],
  },
  {
    topicId: "strat-marketing-4p",
    prompt:
      "ECだけでなく実店舗でも受け取れるようにする施策は、4Pでは主にどれに関係するか。",
    correct: "Place（流通）",
    distractors: ["Price（価格）", "Product（製品）", "Patent（特許）"],
    explanation:
      "顧客にどこでどのように届けるかはPlace。販売チャネルや物流の設計が含まれる。",
    difficulty: 2,
    examTags: ["4P", "Place", "チャネル"],
  },
  {
    topicId: "strat-accounting-break-even",
    prompt:
      "固定費100万円、販売単価5,000円、1個当たり変動費3,000円の商品の損益分岐点販売数量はどれか。",
    correct: "500個",
    distractors: ["200個", "333個", "1,000個"],
    explanation:
      "1個当たりの限界利益は5,000-3,000=2,000円。固定費1,000,000円÷2,000円=500個。",
    difficulty: 3,
    examTags: ["損益分岐点", "固定費", "変動費", "計算"],
  },
  {
    topicId: "strat-accounting-break-even",
    prompt:
      "損益分岐点を下げる施策として最も適切なものはどれか。",
    correct: "固定費を削減する、または1個当たりの限界利益を高める",
    distractors: [
      "固定費を増やし、販売単価を下げる",
      "売上に関係なく変動費を必ず増やす",
      "利益計算から固定費を除外する",
    ],
    explanation:
      "損益分岐点は固定費÷限界利益。固定費を下げるか、単価上昇・変動費低減で限界利益を高めると下がる。",
    difficulty: 3,
    examTags: ["損益分岐点", "限界利益", "利益管理"],
  },
  {
    topicId: "strat-legal-compliance",
    prompt:
      "法令には違反していなくても、社会的信用を損なう行為を避けるべきという考え方として最も適切なものはどれか。",
    correct: "コンプライアンスは法令だけでなく社会規範や倫理も含めて考える",
    distractors: [
      "法律に罰則がなければ何をしてもよい",
      "社内規程は顧客対応には一切関係しない",
      "倫理より短期売上を常に優先する",
    ],
    explanation:
      "コンプライアンスは法令遵守に加え、社内規程や社会倫理を含む。信用リスクの観点で問われる。",
    difficulty: 2,
    examTags: ["コンプライアンス", "企業倫理", "法務"],
  },
  {
    topicId: "strat-legal-compliance",
    prompt:
      "取引先から受け取った未公開情報を外部に漏らさない義務を契約で明確にしたい。締結する契約はどれか。",
    correct: "NDA（秘密保持契約）",
    distractors: ["SLA", "WBS", "DNS"],
    explanation:
      "秘密情報の取扱いを定める契約がNDA。SLAはサービス水準、WBSは作業分解、DNSは名前解決。",
    difficulty: 2,
    examTags: ["NDA", "秘密保持", "契約"],
  },
  {
    topicId: "strat-intellectual-property",
    prompt:
      "自社が開発した新しい技術的アイデアを保護したい。主に対象となる権利はどれか。",
    correct: "特許権",
    distractors: ["著作権", "商標権", "肖像権だけ"],
    explanation:
      "技術的な発明は特許権で保護する。著作権は表現、商標権は商品・サービスの識別標識を保護する。",
    difficulty: 2,
    examTags: ["特許権", "知的財産権", "発明"],
  },
  {
    topicId: "strat-intellectual-property",
    prompt:
      "Webサイトに掲載する文章やイラストを、作者の許諾なくコピーして使うと問題になり得る権利はどれか。",
    correct: "著作権",
    distractors: ["主キー", "NAT", "MTTR"],
    explanation:
      "文章、画像、音楽、プログラムなどの創作的表現は著作権で保護される。利用条件やライセンス確認が必要。",
    difficulty: 2,
    examTags: ["著作権", "ライセンス", "知的財産権"],
  },
  {
    topicId: "strat-privacy-law",
    prompt:
      "キャンペーン応募で個人情報を取得する際、最初に行うべき対応として最も適切なものはどれか。",
    correct: "利用目的をできるだけ具体的に示し、必要な範囲で取得する",
    distractors: [
      "利用目的を知らせず、将来使うかもしれない情報もすべて集める",
      "取得後は本人からの開示請求に一切応じない",
      "同意がなくても無制限に第三者へ販売する",
    ],
    explanation:
      "個人情報は利用目的を明示し、目的達成に必要な範囲で取り扱う。過剰取得や無断提供は不適切。",
    difficulty: 2,
    examTags: ["個人情報保護", "利用目的", "取得"],
  },
  {
    topicId: "strat-privacy-law",
    prompt:
      "個人データを委託先に扱わせる場合の対応として最も適切なものはどれか。",
    correct: "委託先を適切に監督し、安全管理措置を契約などで確認する",
    distractors: [
      "委託した時点で自社の管理責任は完全になくなる",
      "委託先には目的外利用を自由に認める",
      "漏えい時の連絡手順を決めない",
    ],
    explanation:
      "委託先に個人データを扱わせる場合も、委託元は適切な監督が必要。契約、管理状況確認、事故対応手順が重要。",
    difficulty: 3,
    examTags: ["個人情報保護", "委託先管理", "安全管理措置"],
  },
  {
    topicId: "strat-security-laws",
    prompt:
      "他人のIDとパスワードを無断で使い、本人になりすましてシステムへログインする行為を禁じる法律はどれか。",
    correct: "不正アクセス禁止法",
    distractors: ["著作権法", "労働基準法", "独占禁止法"],
    explanation:
      "無断ログインや識別符号の不正取得・提供は不正アクセス禁止法の対象。セキュリティ関連法規の頻出。",
    difficulty: 2,
    examTags: ["不正アクセス禁止法", "情報セキュリティ法規", "認証情報"],
  },
  {
    topicId: "strat-security-laws",
    prompt:
      "正当な理由なく、他人のPCで動作して被害を与えるウイルスを作成・提供する行為が処罰対象となる法律上の考え方はどれか。",
    correct: "不正指令電磁的記録に関する罪",
    distractors: ["商標権の更新", "SLA違反だけ", "景品表示法の優良誤認だけ"],
    explanation:
      "マルウェアの作成・提供などは刑法の不正指令電磁的記録に関する罪で問われる。名称と対象行為を結び付ける。",
    difficulty: 3,
    examTags: ["不正指令電磁的記録", "マルウェア", "法規"],
  },
  {
    topicId: "strat-system-strategy",
    prompt:
      "経営目標を達成するため、どの業務をどのようにIT化するかを全体方針として定める活動はどれか。",
    correct: "システム戦略の策定",
    distractors: ["単体テストの実施", "DNSサーバの再起動", "表計算のセル結合"],
    explanation:
      "システム戦略は経営戦略とIT活用を結び付ける全体方針。個別の実装作業より上流の活動。",
    difficulty: 2,
    examTags: ["システム戦略", "経営戦略", "IT化"],
  },
  {
    topicId: "strat-system-strategy",
    prompt:
      "現行業務をそのままシステム化すると非効率も残るため、業務手順を見直してからIT導入したい。適切な考え方はどれか。",
    correct: "業務改革や業務改善と合わせてシステム化を検討する",
    distractors: [
      "非効率な作業をすべて手入力のまま増やす",
      "経営目標と関係なく最新技術だけを導入する",
      "利用部門の意見を聞かずに画面色だけ決める",
    ],
    explanation:
      "IT導入は目的ではなく手段。業務プロセスや経営目標と合わせて検討することで効果が出る。",
    difficulty: 3,
    examTags: ["システム戦略", "業務改革", "IT投資"],
  },
  {
    topicId: "strat-business-process",
    prompt:
      "受注から出荷までの作業を図にし、重複入力や承認待ちの停滞を見つけて改善したい。まず有効な活動はどれか。",
    correct: "業務フローを可視化し、ボトルネックを分析する",
    distractors: [
      "現行業務を確認せず新システムを即時導入する",
      "担当者ごとの暗黙知をさらに増やす",
      "問題点を記録せず個人の努力だけに任せる",
    ],
    explanation:
      "業務改善では現状を可視化し、ムダや停滞の原因を特定してから改善策を考える。",
    difficulty: 2,
    examTags: ["業務プロセス", "可視化", "ボトルネック"],
  },
  {
    topicId: "strat-business-process",
    prompt:
      "紙の申請を単にPDFにしただけで、承認ルートや判断基準は変わっていない。この状態の説明として最も適切なものはどれか。",
    correct: "デジタル化はしているが、業務プロセス改善としては不十分な可能性がある",
    distractors: [
      "必ずDXが完了して競争優位が確立した",
      "個人情報保護の義務がなくなった",
      "業務要件を確認する必要がなくなった",
    ],
    explanation:
      "紙を電子化するだけでは業務改革とは限らない。流れや判断、価値提供の改善まで考える必要がある。",
    difficulty: 3,
    examTags: ["業務改善", "デジタル化", "DX"],
  },
  {
    topicId: "strat-ppm",
    prompt:
      "市場成長率が高く、市場占有率も高い事業に対するPPM上の分類はどれか。",
    correct: "花形",
    distractors: ["金のなる木", "問題児", "負け犬"],
    explanation:
      "高成長・高シェアは花形。投資も必要だが将来の収益源として期待される。",
    difficulty: 2,
    examTags: ["PPM", "花形", "市場成長率"],
  },
  {
    topicId: "strat-ppm",
    prompt:
      "市場成長率は低いが市場占有率が高く、安定した資金を生む事業はPPMで何と呼ぶか。",
    correct: "金のなる木",
    distractors: ["問題児", "花形", "負け犬"],
    explanation:
      "低成長・高シェアは金のなる木。大きな成長投資は少なく、得た資金を他事業へ回す判断が問われる。",
    difficulty: 2,
    examTags: ["PPM", "金のなる木", "市場占有率"],
  },
  {
    topicId: "strat-value-chain",
    prompt:
      "購買物流、製造、出荷物流、販売・マーケティング、サービスを一連の価値活動として分析する手法はどれか。",
    correct: "バリューチェーン分析",
    distractors: ["SWOTの脅威分析だけ", "公開鍵暗号方式", "排他制御"],
    explanation:
      "バリューチェーンは企業活動を価値の連鎖として見て、どこで価値やコストが生まれるか分析する。",
    difficulty: 2,
    examTags: ["バリューチェーン", "主活動", "競争優位"],
  },
  {
    topicId: "strat-value-chain",
    prompt:
      "製造部門だけでなく、人事、技術開発、調達などが主活動を支えるという見方はどの分析に含まれるか。",
    correct: "バリューチェーン分析",
    distractors: ["真理値表", "ランサムウェア分析", "サブネット分割"],
    explanation:
      "バリューチェーンでは主活動と支援活動を分けて、価値創出への貢献を分析する。",
    difficulty: 3,
    examTags: ["バリューチェーン", "支援活動", "価値創出"],
  },
  {
    topicId: "strat-management-systems",
    prompt:
      "顧客の購入履歴や問い合わせ履歴を活用し、関係を強化して売上向上を図るシステムはどれか。",
    correct: "CRM",
    distractors: ["SCM", "ERP", "DNS"],
    explanation:
      "CRMは顧客関係管理。SCMは供給連鎖、ERPは企業資源を統合管理する仕組み。",
    difficulty: 2,
    examTags: ["CRM", "顧客管理", "経営管理システム"],
  },
  {
    topicId: "strat-management-systems",
    prompt:
      "調達、生産、物流、販売までの流れを全体最適し、在庫過多や欠品を減らす仕組みはどれか。",
    correct: "SCM",
    distractors: ["CRM", "MFA", "WBS"],
    explanation:
      "SCMはサプライチェーン全体を管理する考え方。部門や企業をまたいだモノと情報の流れを最適化する。",
    difficulty: 2,
    examTags: ["SCM", "サプライチェーン", "在庫管理"],
  },
  {
    topicId: "strat-goal-evaluation",
    prompt:
      "ECサイトで「年間売上10億円」を最終目標に置いた。この指標はどれか。",
    correct: "KGI",
    distractors: ["KPI", "CSF", "SLA"],
    explanation:
      "KGIは最終目標を表す指標。KPIは達成までの途中指標、CSFは成功要因。",
    difficulty: 2,
    examTags: ["KGI", "KPI", "目標管理"],
  },
  {
    topicId: "strat-goal-evaluation",
    prompt:
      "最終目標の売上達成に向けて、月間購入率やリピート率を追跡する。このような途中指標はどれか。",
    correct: "KPI",
    distractors: ["KGI", "NDA", "DHCP"],
    explanation:
      "KPIは重要業績評価指標で、KGI達成までの進捗を測る。途中指標と最終指標の区別が頻出。",
    difficulty: 2,
    examTags: ["KPI", "KGI", "評価指標"],
  },
  {
    topicId: "strat-financial-statements",
    prompt:
      "ある時点の資産、負債、純資産の状態を示す財務諸表はどれか。",
    correct: "貸借対照表（B/S）",
    distractors: ["損益計算書（P/L）", "WBS", "ガントチャート"],
    explanation:
      "貸借対照表は一定時点の財政状態を示す。損益計算書は一定期間の収益・費用・利益を示す。",
    difficulty: 2,
    examTags: ["貸借対照表", "財務諸表", "BS"],
  },
  {
    topicId: "strat-financial-statements",
    prompt:
      "売上高から売上原価や販管費などを差し引き、一定期間の利益を示す財務諸表はどれか。",
    correct: "損益計算書（P/L）",
    distractors: ["貸借対照表（B/S）", "ER図", "サーバ証明書"],
    explanation:
      "損益計算書は一定期間の経営成績を示す。売上、費用、利益の関係を読む問題で問われる。",
    difficulty: 2,
    examTags: ["損益計算書", "財務諸表", "PL"],
  },
  {
    topicId: "strat-corporate-strategy",
    prompt:
      "他社がまねしにくく、競争優位の源泉となる自社の中核的能力はどれか。",
    correct: "コアコンピタンス",
    distractors: ["ランサムウェア", "サブネットマスク", "単体テスト"],
    explanation:
      "コアコンピタンスは競争力の源泉となる中核能力。単なる保有設備や一時的流行とは区別する。",
    difficulty: 2,
    examTags: ["コアコンピタンス", "競争優位", "経営戦略"],
  },
  {
    topicId: "strat-corporate-strategy",
    prompt:
      "技術を持つ企業を買収して自社グループに取り込み、事業拡大を図る戦略はどれか。",
    correct: "M&A",
    distractors: ["アライアンス", "アウトソーシング", "NAT"],
    explanation:
      "M&Aは合併・買収。アライアンスは別会社のまま提携、アウトソーシングは業務委託。",
    difficulty: 2,
    examTags: ["M&A", "アライアンス", "成長戦略"],
  },
  {
    topicId: "strat-ebusiness",
    prompt:
      "企業間で受発注データを標準化した形式で電子的に交換する仕組みはどれか。",
    correct: "EDI",
    distractors: ["EC", "SEO", "MFA"],
    explanation:
      "EDIは企業間の電子データ交換。ECは電子商取引全般、SEOは検索エンジン最適化。",
    difficulty: 2,
    examTags: ["EDI", "eビジネス", "企業間取引"],
  },
  {
    topicId: "strat-ebusiness",
    prompt:
      "スマートフォン決済やオンライン送金など、金融とITを組み合わせたサービス分野はどれか。",
    correct: "フィンテック",
    distractors: ["ハウジング", "正規化", "フェールセーフ"],
    explanation:
      "フィンテックは金融（Finance）と技術（Technology）を組み合わせたサービスや事業領域。",
    difficulty: 2,
    examTags: ["フィンテック", "eビジネス", "決済"],
  },
  {
    topicId: "strat-labor-laws",
    prompt:
      "派遣契約で、派遣先が派遣労働者に業務上の指揮命令を行う形態はどれか。",
    correct: "労働者派遣",
    distractors: ["請負", "売買", "NDA"],
    explanation:
      "派遣は派遣先が指揮命令を行う。請負は請負会社が仕事の完成責任を負い、発注者が作業者へ直接指揮命令しない。",
    difficulty: 3,
    examTags: ["労働者派遣", "請負", "指揮命令"],
  },
  {
    topicId: "strat-labor-laws",
    prompt:
      "請負契約として適切な運用はどれか。",
    correct: "受注会社が自社の作業者に指揮命令し、成果物の完成責任を負う",
    distractors: [
      "発注者が請負会社の作業者へ日々直接指示する",
      "発注者が請負会社の勤怠や残業を直接命令する",
      "成果物ではなく作業者の貸出しだけを目的にする",
    ],
    explanation:
      "請負では請負会社が指揮命令と完成責任を負う。発注者が直接指示すると偽装請負の問題になり得る。",
    difficulty: 3,
    examTags: ["請負", "偽装請負", "労働関連法規"],
  },
  {
    topicId: "strat-bcp",
    prompt:
      "大規模災害時にも重要業務を継続・早期復旧できるよう、事前に優先業務や代替手段を決める計画はどれか。",
    correct: "BCP",
    distractors: ["PPM", "SQL", "WAF"],
    explanation:
      "BCPは事業継続計画。災害や障害時に重要業務を止めない、または早く復旧するための計画。",
    difficulty: 2,
    examTags: ["BCP", "事業継続", "災害対策"],
  },
  {
    topicId: "strat-bcp",
    prompt:
      "BCPで、どの業務をどの順に復旧するかを決める際に重視すべき観点はどれか。",
    correct: "事業への影響度と許容停止時間",
    distractors: [
      "担当者の好みだけ",
      "画面デザインの派手さだけ",
      "ファイル名の長さだけ",
    ],
    explanation:
      "BCPでは重要業務、影響度、目標復旧時間などから優先順位を決める。限られた資源で復旧する判断が必要。",
    difficulty: 3,
    examTags: ["BCP", "復旧優先順位", "RTO"],
  },

  // ---- 追加拡充：中頻度だが実務判断で差が出る領域 ------------------------
  {
    topicId: "tech-lan-wan",
    prompt:
      "本社ビル内の各フロアのPCやプリンタを接続するネットワークと、本社と支社を通信事業者の回線で結ぶネットワークの組合せとして適切なものはどれか。",
    correct: "ビル内はLAN、本社と支社の接続はWAN",
    distractors: [
      "ビル内はWAN、本社と支社の接続はLAN",
      "どちらも必ずBluetoothで接続する",
      "どちらもデータベースの正規化で実現する",
    ],
    explanation:
      "LANは建物や敷地内など近い範囲、WANは離れた拠点間など広い範囲をつなぐ。Wi-Fiは無線LANの一種。",
    difficulty: 2,
    examTags: ["LAN", "WAN", "ネットワーク"],
  },
  {
    topicId: "tech-lan-wan",
    prompt:
      "支店から本社サーバへの通信が遅い。原因調査で最初に切り分ける観点として最も適切なものはどれか。",
    correct: "支店内LAN、本社内LAN、拠点間WANのどこで遅延しているかを分けて確認する",
    distractors: [
      "すべてのPCの画面解像度を同じにする",
      "支店のプリンタ名を短くする",
      "データベースの主キーを削除する",
    ],
    explanation:
      "ネットワーク障害は範囲を切り分けることが重要。LAN内の問題か、拠点間WANの問題かで対策が変わる。",
    difficulty: 3,
    examTags: ["LAN", "WAN", "障害切り分け"],
  },
  {
    topicId: "tech-iot",
    prompt:
      "工場設備にセンサーを取り付け、振動データを収集して故障の兆候を検知したい。IoT活用として最も適切な説明はどれか。",
    correct: "モノの状態をネットワーク経由で集め、分析して保全に活用する",
    distractors: [
      "設備をネットにつなげばパスワード管理は不要になる",
      "センサーは必ず人が紙に記録するためだけに使う",
      "IoTではクラウドやエッジでの処理は一切使わない",
    ],
    explanation:
      "IoTはモノの状態をセンサーで取得し、ネットワーク経由で収集・分析・制御に使う。セキュリティ対策もセットで必要。",
    difficulty: 2,
    examTags: ["IoT", "センサー", "予知保全"],
  },
  {
    topicId: "tech-iot",
    prompt:
      "IoT機器を大量導入する際のセキュリティ対策として最も適切なものはどれか。",
    correct: "初期パスワード変更、更新適用、不要な通信の制限を行う",
    distractors: [
      "初期パスワードのままにして管理を簡単にする",
      "インターネットに接続すれば更新作業は不要とする",
      "全機器を同じ管理者IDで外部公開する",
    ],
    explanation:
      "IoT機器は攻撃の入口になり得る。初期設定の見直し、脆弱性修正、通信制御、資産管理が重要。",
    difficulty: 3,
    examTags: ["IoT", "セキュリティ", "脆弱性管理"],
  },
  {
    topicId: "tech-programming-basics",
    prompt:
      "変数xに3を入れた後、`x ← x + 2` を2回実行した。最後のxの値はどれか。",
    correct: "7",
    distractors: ["5", "6", "10"],
    explanation:
      "最初は3。1回目で5、2回目で7になる。代入は右辺の計算結果を左辺の変数へ入れ直す操作。",
    difficulty: 3,
    examTags: ["プログラミング", "変数", "代入", "計算"],
  },
  {
    topicId: "tech-programming-basics",
    prompt:
      "同じ処理を必要な回数だけ実行したいが、終了条件を誤ると処理が終わらない。これに関係が深い基本構造はどれか。",
    correct: "繰り返し",
    distractors: ["順次", "暗号化", "正規化"],
    explanation:
      "繰り返しでは終了条件が重要。条件が満たされない設計だと無限ループになり、処理が終わらない。",
    difficulty: 2,
    examTags: ["プログラミング", "繰り返し", "終了条件"],
  },
  {
    topicId: "tech-data-utilization",
    prompt:
      "店舗別の売上、在庫、来店者数をダッシュボードで可視化し、発注量の判断に使いたい。最も適切な仕組みはどれか。",
    correct: "BIツール",
    distractors: ["UPS", "NAT", "ディジタル署名"],
    explanation:
      "BIは蓄積データを集計・可視化して意思決定を支援する。UPSは電源対策、NATはアドレス変換。",
    difficulty: 2,
    examTags: ["BI", "データ活用", "可視化"],
  },
  {
    topicId: "tech-data-utilization",
    prompt:
      "分析に使う顧客データで、同じ顧客が表記ゆれや重複で複数件登録されていた。分析前に行うべき作業として最も適切なものはどれか。",
    correct: "データクレンジングで誤り、重複、表記ゆれを補正する",
    distractors: [
      "誤りを含むまま分析すれば必ず精度が上がる",
      "データを暗号化すれば重複は自動的に統合される",
      "分析目的を決めずに全データを無制限に収集する",
    ],
    explanation:
      "データ品質が低いと分析結果も信用しにくい。分析前に重複、欠損、表記ゆれを整えることが重要。",
    difficulty: 3,
    examTags: ["データクレンジング", "データ品質", "分析"],
  },
  {
    topicId: "tech-api",
    prompt:
      "自社アプリに外部の地図サービスを組み込み、住所から地図を表示したい。利用する仕組みとして最も適切なものはどれか。",
    correct: "外部サービスが提供するWeb APIを呼び出す",
    distractors: [
      "外部サービスのサーバ室に物理的に入る",
      "利用者のブラウザ履歴だけを解析する",
      "DBの主キーをすべて削除する",
    ],
    explanation:
      "APIは外部サービスの機能やデータを決まった形式で利用する入口。内部実装を直接触る必要はない。",
    difficulty: 2,
    examTags: ["API", "Web API", "システム連携"],
  },
  {
    topicId: "tech-api",
    prompt:
      "API連携で、相手システムの内部処理をすべて公開せずに機能を提供できる理由として最も適切なものはどれか。",
    correct: "決められたリクエストとレスポンスの形式だけを公開すればよいから",
    distractors: [
      "APIを使うと認証や利用制限が一切不要になるから",
      "APIは画面デザインを自動で統一する機能だから",
      "APIでは通信内容が必ず紙で郵送されるから",
    ],
    explanation:
      "APIは窓口の仕様を公開し、内部実装は隠したまま連携できる。認証、権限、利用回数制限などの設計も重要。",
    difficulty: 3,
    examTags: ["API", "インタフェース", "カプセル化"],
  },
  {
    topicId: "mgmt-facility-management",
    prompt:
      "停電が発生した瞬間にサーバが突然停止しないよう、短時間だけ電力を供給して安全な停止時間を確保する装置はどれか。",
    correct: "UPS（無停電電源装置）",
    distractors: ["WAF", "DHCPサーバ", "データマイニングツール"],
    explanation:
      "UPSは停電時に一時的な電力を供給する装置。長時間の電源確保は自家発電装置などと組み合わせる。",
    difficulty: 2,
    examTags: ["UPS", "ファシリティマネジメント", "電源対策"],
  },
  {
    topicId: "mgmt-facility-management",
    prompt:
      "サーバ室の可用性を維持するためのファシリティ管理として不適切なものはどれか。",
    correct: "誰でも自由に入室できるようにし、入退室記録を残さない",
    distractors: [
      "空調で温度と湿度を管理する",
      "UPSや自家発電装置で停電に備える",
      "ICカードなどで入退室を管理する",
    ],
    explanation:
      "サーバ室は物理的セキュリティも重要。入退室管理をしないと盗難、破壊、誤操作のリスクが高まる。",
    difficulty: 3,
    examTags: ["ファシリティマネジメント", "入退室管理", "可用性"],
  },
  {
    topicId: "mgmt-estimation",
    prompt:
      "10人月の作業量を、2人で担当する場合の単純計算上の期間はどれか。",
    correct: "5か月",
    distractors: ["2か月", "10か月", "20か月"],
    explanation:
      "工数は人数×期間で表す。10人月÷2人=5か月。ただし実務では人数を増やせば必ず比例して短縮できるとは限らない。",
    difficulty: 3,
    examTags: ["人月", "工数", "見積り", "計算"],
  },
  {
    topicId: "mgmt-estimation",
    prompt:
      "開発規模を、プログラム行数ではなく、画面・帳票・入出力など利用者から見た機能の数と複雑さで見積もる方法はどれか。",
    correct: "FP法（ファンクションポイント法）",
    distractors: ["ウォータフォールモデル", "クリティカルパス法", "リスク移転"],
    explanation:
      "FP法は利用者から見た機能に着目して規模を見積もる。まだコードがない段階でも見積りやすい。",
    difficulty: 2,
    examTags: ["FP法", "見積り", "ファンクションポイント"],
  },
  {
    topicId: "strat-standardization",
    prompt:
      "国内だけでなく海外企業とも部品仕様を合わせ、相互接続性を高めたい。国際的な標準として参照するものはどれか。",
    correct: "ISOなどの国際規格",
    distractors: ["自社内だけの口頭ルール", "担当者個人の好み", "未公開の一時的なメモ"],
    explanation:
      "国際的な相互接続性や取引にはISOなどの国際規格が使われる。JISは日本の国家規格。",
    difficulty: 2,
    examTags: ["標準化", "ISO", "国際規格"],
  },
  {
    topicId: "strat-standardization",
    prompt:
      "ある製品仕様が公的機関で定められたわけではないが、市場で圧倒的に普及し事実上の標準になった。このような標準はどれか。",
    correct: "デファクトスタンダード",
    distractors: ["JIS", "ISO 9001", "SLA"],
    explanation:
      "デファクトスタンダードは市場で広く使われた結果として標準になったもの。JISやISOのような公的規格とは成り立ちが異なる。",
    difficulty: 3,
    examTags: ["デファクトスタンダード", "標準化", "市場"],
  },
];

/** すべての過去問レベル問題（id は topicId-ex1, topicId-ex2 … の連番）。 */
export const examLevelQuestions: ExamLevelQuestion[] = (() => {
  const perTopicIndex = new Map<string, number>();
  return COMPACT.map((q) => {
    const idx = perTopicIndex.get(q.topicId) ?? 0;
    perTopicIndex.set(q.topicId, idx + 1);
    return build(q, idx);
  });
})();
