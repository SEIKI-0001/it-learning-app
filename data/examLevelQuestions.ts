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
