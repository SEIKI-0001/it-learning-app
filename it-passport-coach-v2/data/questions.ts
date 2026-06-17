import type { Question } from "@/types/content";

export const questions: Question[] = [
  {
    id: "q-business-model-1",
    topicId: "strategy-business-model",
    domain: "strategy",
    prompt: "サブスクリプション型ビジネスモデルの説明として最も適切なものはどれですか。",
    choices: [
      { id: "a", text: "商品を一度だけ販売して収益を得るモデル" },
      { id: "b", text: "利用期間に応じて継続的に料金を得るモデル" },
      { id: "c", text: "すべての機能を無料で提供するモデル" },
      { id: "d", text: "広告を一切使わず口コミだけで販売するモデル" }
    ],
    correctChoiceId: "b",
    explanation:
      "サブスクリプションは月額・年額など、利用期間に応じて継続課金するモデルです。",
    trap: "一回売り切りの販売モデルと区別します。",
    difficulty: "intro",
    relatedPastExamTheme: "eビジネス"
  },
  {
    id: "q-break-even-1",
    topicId: "strategy-break-even",
    domain: "strategy",
    prompt: "固定費が100万円、製品1個あたりの販売価格が1,000円、変動費が600円のとき、損益分岐点販売数量はどれですか。",
    choices: [
      { id: "a", text: "1,000個" },
      { id: "b", text: "1,667個" },
      { id: "c", text: "2,500個" },
      { id: "d", text: "4,000個" }
    ],
    correctChoiceId: "c",
    explanation:
      "1個あたりの限界利益は1,000円 - 600円 = 400円です。100万円 ÷ 400円 = 2,500個です。",
    trap: "販売価格ではなく、販売価格から変動費を引いた限界利益で固定費を割ります。",
    difficulty: "standard",
    relatedPastExamTheme: "損益分岐点"
  },
  {
    id: "q-legal-1",
    topicId: "strategy-legal-security",
    domain: "strategy",
    prompt: "個人情報保護の観点で、個人情報に該当する可能性が最も高いものはどれですか。",
    choices: [
      { id: "a", text: "誰のものか分からないアクセス数の合計" },
      { id: "b", text: "氏名とメールアドレスが結びついた会員データ" },
      { id: "c", text: "匿名化された売上総額" },
      { id: "d", text: "会社全体の平均年齢だけを示した表" }
    ],
    correctChoiceId: "b",
    explanation:
      "氏名とメールアドレスが結びつくと、特定の個人を識別できるため個人情報に該当します。",
    trap: "集計済み・匿名化済みの情報と、個人を識別できる情報を区別します。",
    difficulty: "intro",
    relatedPastExamTheme: "個人情報保護"
  },
  {
    id: "q-project-1",
    topicId: "management-project",
    domain: "management",
    prompt: "WBSの説明として最も適切なものはどれですか。",
    choices: [
      { id: "a", text: "作業を階層的に分解して整理したもの" },
      { id: "b", text: "完成したシステムの利用手順書" },
      { id: "c", text: "障害発生時の連絡網" },
      { id: "d", text: "売上と費用の関係を示すグラフ" }
    ],
    correctChoiceId: "a",
    explanation:
      "WBSはWork Breakdown Structureの略で、プロジェクトの作業を細かく分解して整理します。",
    trap: "ガントチャートのような日程表そのものではありません。",
    difficulty: "intro",
    relatedPastExamTheme: "プロジェクトマネジメント"
  },
  {
    id: "q-service-1",
    topicId: "management-service",
    domain: "management",
    prompt: "インシデント管理の目的として最も適切なものはどれですか。",
    choices: [
      { id: "a", text: "新規システムの売上予測を作ること" },
      { id: "b", text: "サービス停止や不具合の影響を早く小さくすること" },
      { id: "c", text: "監査報告書を作成すること" },
      { id: "d", text: "社員の人事評価を決めること" }
    ],
    correctChoiceId: "b",
    explanation:
      "インシデント管理は、障害や問い合わせに対応してサービスを早く通常状態に戻すことを重視します。",
    trap: "根本原因の追跡は問題管理の役割として問われることがあります。",
    difficulty: "standard",
    relatedPastExamTheme: "サービスマネジメント"
  },
  {
    id: "q-audit-1",
    topicId: "management-audit",
    domain: "management",
    prompt: "システム監査人に求められる性質として最も適切なものはどれですか。",
    choices: [
      { id: "a", text: "監査対象の開発責任者を兼任すること" },
      { id: "b", text: "監査対象から独立した立場で評価すること" },
      { id: "c", text: "必ずプログラムを直接修正すること" },
      { id: "d", text: "利用者からの問い合わせだけを処理すること" }
    ],
    correctChoiceId: "b",
    explanation:
      "システム監査では、客観性を保つために監査対象からの独立性が重要です。",
    trap: "監査人は改善提案をしますが、対象を直接修正する立場とは限りません。",
    difficulty: "intro",
    relatedPastExamTheme: "システム監査"
  },
  {
    id: "q-binary-1",
    topicId: "technology-binary",
    domain: "technology",
    prompt: "1バイトは一般的に何ビットですか。",
    choices: [
      { id: "a", text: "2ビット" },
      { id: "b", text: "4ビット" },
      { id: "c", text: "8ビット" },
      { id: "d", text: "16ビット" }
    ],
    correctChoiceId: "c",
    explanation: "1バイトは一般的に8ビットです。ITパスポートでは基本知識としてよく問われます。",
    trap: "10進数の感覚で10ビットと考えないようにします。",
    difficulty: "intro",
    relatedPastExamTheme: "データ表現"
  },
  {
    id: "q-db-1",
    topicId: "technology-database-normalization",
    domain: "technology",
    prompt: "データベースの正規化を行う主な目的はどれですか。",
    choices: [
      { id: "a", text: "データの重複や更新時の不整合を減らすこと" },
      { id: "b", text: "必ずすべての検索を高速化すること" },
      { id: "c", text: "表の列数を必ず1列にすること" },
      { id: "d", text: "データを暗号化すること" }
    ],
    correctChoiceId: "a",
    explanation:
      "正規化は、データの重複や更新漏れによる不整合を減らすために表を適切に分ける考え方です。",
    trap: "正規化は性能向上だけが目的ではありません。",
    difficulty: "standard",
    relatedPastExamTheme: "正規化"
  },
  {
    id: "q-network-1",
    topicId: "technology-network-ip",
    domain: "technology",
    prompt: "IPアドレスの説明として最も適切なものはどれですか。",
    choices: [
      { id: "a", text: "ネットワーク上の機器を識別するための住所のような情報" },
      { id: "b", text: "Webページの見た目を指定する情報" },
      { id: "c", text: "ファイルを圧縮するための方式" },
      { id: "d", text: "データベースの表を一意に識別するキー" }
    ],
    correctChoiceId: "a",
    explanation:
      "IPアドレスは、ネットワーク上で通信相手を識別するために使われる住所のような情報です。",
    trap: "MACアドレスやURLと役割を混同しないようにします。",
    difficulty: "intro",
    relatedPastExamTheme: "TCP/IP"
  },
  {
    id: "q-dns-1",
    topicId: "technology-dns",
    domain: "technology",
    prompt: "DNSの役割として最も適切なものはどれですか。",
    choices: [
      { id: "a", text: "ドメイン名に対応するIPアドレスを調べること" },
      { id: "b", text: "Webページの文字色を決めること" },
      { id: "c", text: "コンピュータの電源を管理すること" },
      { id: "d", text: "ファイルを暗号化して保存すること" }
    ],
    correctChoiceId: "a",
    explanation:
      "DNSはドメイン名をIPアドレスに変換する名前解決の仕組みです。",
    trap: "DNSはWebページの中身を返す仕組みではありません。",
    difficulty: "intro",
    relatedPastExamTheme: "DNS"
  },
  {
    id: "q-crypto-1",
    topicId: "technology-security-crypto",
    domain: "technology",
    prompt: "公開鍵暗号方式で、送信者が秘密にしたいデータを送るときに通常使う鍵はどれですか。",
    choices: [
      { id: "a", text: "送信者の公開鍵" },
      { id: "b", text: "送信者の秘密鍵" },
      { id: "c", text: "受信者の公開鍵" },
      { id: "d", text: "受信者のパスワードそのもの" }
    ],
    correctChoiceId: "c",
    explanation:
      "受信者の公開鍵で暗号化すると、対応する受信者の秘密鍵でしか復号できません。",
    trap: "電子署名の場面では秘密鍵を使うため、用途を切り分けます。",
    difficulty: "exam",
    relatedPastExamTheme: "暗号化"
  },
  {
    id: "q-algorithm-1",
    topicId: "technology-algorithm",
    domain: "technology",
    prompt: "フローチャートで条件によって処理を分けるときに使う基本構造はどれですか。",
    choices: [
      { id: "a", text: "順次" },
      { id: "b", text: "分岐" },
      { id: "c", text: "正規化" },
      { id: "d", text: "暗号化" }
    ],
    correctChoiceId: "b",
    explanation:
      "条件によって処理を分ける構造は分岐です。Yes/Noなどの判断で流れが変わります。",
    trap: "順次は上から順番に処理する構造です。",
    difficulty: "intro",
    relatedPastExamTheme: "アルゴリズム"
  }
];

export function getQuestionsByTopic(topicId: string): Question[] {
  return questions.filter((question) => question.topicId === topicId);
}

export function getQuestionById(questionId: string): Question | undefined {
  return questions.find((question) => question.id === questionId);
}
