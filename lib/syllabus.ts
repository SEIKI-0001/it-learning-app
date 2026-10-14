import type { Topic } from "@/types/content";

// ── シラバスデータ ──────────────────────────────────────────────────────────

export type SyllabusItem = {
  label: string;
  topicIds: string[];
};

export type SyllabusCategory = {
  label: string;
  items: SyllabusItem[];
};

export type SyllabusSection = {
  id: string;
  label: string;
  categories: SyllabusCategory[];
};

export const SYLLABUS: SyllabusSection[] = [
  {
    id: "technology",
    label: "テクノロジ系",
    categories: [
      {
        label: "基礎理論",
        items: [
          { label: "情報の表現（2進数・データ量の単位）", topicIds: ["tech-binary-data"] },
          { label: "論理演算・真理値表", topicIds: ["tech-logic-operations"] },
          { label: "アルゴリズムとフローチャート", topicIds: ["tech-algorithm-flowchart"] },
          { label: "データ構造（スタック・キュー等）", topicIds: ["tech-data-structure"] },
          { label: "データ構造（配列・リスト・木構造）", topicIds: ["tech-data-structure-list-tree"] },
          { label: "プログラミング基礎", topicIds: ["tech-programming-basics"] },
          { label: "表計算ソフトの活用", topicIds: ["tech-spreadsheet"] },
        ],
      },
      {
        label: "コンピュータシステム",
        items: [
          { label: "コンピュータ構成要素（CPU・メモリ・ストレージ）", topicIds: ["tech-computer-core"] },
          { label: "OSとソフトウェアの役割", topicIds: ["tech-os-software-hardware"] },
          { label: "稼働率・信頼性設計（MTBF・MTTR）", topicIds: ["tech-reliability-availability"] },
          { label: "クラウドコンピューティング（SaaS/PaaS/IaaS）", topicIds: ["tech-cloud-models"] },
          { label: "ハードウェア（入出力装置・各種デバイス）", topicIds: ["tech-io-devices"] },
        ],
      },
      {
        label: "データベース",
        items: [
          { label: "SQLによるデータ操作", topicIds: ["tech-database-sql"] },
          { label: "主キー・外部キー・参照整合性", topicIds: ["tech-keys"] },
          { label: "データベースの正規化", topicIds: ["tech-normalization"] },
          { label: "トランザクション管理・ACID特性", topicIds: ["tech-transaction"] },
        ],
      },
      {
        label: "ネットワーク",
        items: [
          { label: "IPアドレス・サブネット・DNS", topicIds: ["tech-network-address"] },
          { label: "LAN・WAN・ネットワーク機器", topicIds: ["tech-lan-wan"] },
          { label: "インターネットの基礎・プロトコル", topicIds: ["tech-web-internet-basics"] },
          { label: "HTTP・HTTPS・Web技術", topicIds: ["tech-http-https"] },
          { label: "無線LAN・モバイル通信（5G・MVNO）", topicIds: ["tech-wireless-mobile"] },
          { label: "メールプロトコル（SMTP・POP・IMAP）", topicIds: ["tech-email-protocol"] },
        ],
      },
      {
        label: "情報セキュリティ",
        items: [
          { label: "情報セキュリティの3要素（CIA）", topicIds: ["tech-security-cia"] },
          { label: "暗号化・ハッシュ関数", topicIds: ["tech-encryption-hash"] },
          { label: "共通鍵暗号方式", topicIds: ["tech-common-key-crypto"] },
          { label: "公開鍵暗号方式", topicIds: ["tech-public-key-crypto"] },
          { label: "ディジタル署名・PKI・認証局", topicIds: ["tech-digital-signature"] },
          { label: "認証・認可・多要素認証（MFA）", topicIds: ["tech-auth-authz-mfa"] },
          { label: "マルウェア・フィッシング・ランサムウェア", topicIds: ["tech-malware-phishing-ransomware"] },
          { label: "ファイアウォール・VPN・ゼロトラスト", topicIds: ["tech-firewall-vpn-zero-trust"] },
          { label: "サイバー攻撃の手口（DoS・SQLi・XSS等）", topicIds: ["tech-cyber-attacks"] },
          { label: "ISMS・リスクアセスメント", topicIds: ["tech-isms-risk"] },
        ],
      },
      {
        label: "ヒューマンインタフェース・マルチメディア・新技術",
        items: [
          { label: "ヒューマンインタフェース・UX", topicIds: ["tech-ui-ux"] },
          { label: "情報メディア・マルチメディア・圧縮", topicIds: ["tech-multimedia-compression"] },
          { label: "AI・機械学習", topicIds: ["tech-ai-ml"] },
          { label: "IoT（モノのインターネット）", topicIds: ["tech-iot"] },
          { label: "データ活用・BI・データマイニング", topicIds: ["tech-data-utilization"] },
          { label: "API・サービス連携", topicIds: ["tech-api"] },
        ],
      },
    ],
  },
  {
    id: "management",
    label: "マネジメント系",
    categories: [
      {
        label: "開発技術",
        items: [
          { label: "システム開発プロセス（ウォーターフォール・アジャイル）", topicIds: ["mgmt-development-process"] },
          { label: "要件定義", topicIds: ["mgmt-requirements-definition"] },
          { label: "テスト手法（V字モデル・ブラックボックス等）", topicIds: ["mgmt-testing"] },
          { label: "開発見積り（FP法・類推法）", topicIds: ["mgmt-estimation"] },
        ],
      },
      {
        label: "プロジェクトマネジメント",
        items: [
          { label: "QCDとプロジェクト管理", topicIds: ["mgmt-pm-qcd"] },
          { label: "WBS・ガントチャート", topicIds: ["mgmt-wbs-gantt"] },
          { label: "リスクマネジメント", topicIds: ["mgmt-risk-management"] },
        ],
      },
      {
        label: "サービスマネジメント・システム監査",
        items: [
          { label: "PDCA", topicIds: ["mgmt-pdca"] },
          { label: "SLA・サービスレベル管理", topicIds: ["mgmt-service-sla"] },
          { label: "ITIL（インシデント・問題・変更管理）", topicIds: ["mgmt-itil"] },
          { label: "ファシリティマネジメント（UPS等）", topicIds: ["mgmt-facility-management"] },
          { label: "システム監査", topicIds: ["mgmt-system-audit"] },
        ],
      },
    ],
  },
  {
    id: "strategy",
    label: "ストラテジ系",
    categories: [
      {
        label: "企業活動",
        items: [
          { label: "企業の組織・ステークホルダー", topicIds: ["strat-enterprise-activities"] },
          { label: "損益計算・損益分岐点", topicIds: ["strat-accounting-break-even"] },
          { label: "財務諸表（BS・PL）", topicIds: ["strat-financial-statements"] },
          { label: "業績評価指標（KGI/KPI/CSF/BSC）", topicIds: ["strat-goal-evaluation"] },
        ],
      },
      {
        label: "法務・コンプライアンス",
        items: [
          { label: "コンプライアンス", topicIds: ["strat-legal-compliance"] },
          { label: "知的財産権（著作権・特許権・商標権）", topicIds: ["strat-intellectual-property"] },
          { label: "個人情報保護法", topicIds: ["strat-privacy-law"] },
          { label: "セキュリティ関連法規（不正アクセス禁止法等）", topicIds: ["strat-security-laws"] },
          { label: "労働関係法規（労働基準法・派遣法）", topicIds: ["strat-labor-laws"] },
          { label: "標準化（JIS・ISO・デファクト）", topicIds: ["strat-standardization"] },
        ],
      },
      {
        label: "経営戦略",
        items: [
          { label: "SWOT分析", topicIds: ["strat-swot"] },
          { label: "3C分析", topicIds: ["strat-3c"] },
          { label: "マーケティング（4P等）", topicIds: ["strat-marketing-4p"] },
          { label: "PPM（プロダクト・ポートフォリオ・マネジメント）", topicIds: ["strat-ppm"] },
          { label: "バリューチェーン", topicIds: ["strat-value-chain"] },
          { label: "競争戦略（M&A・コアコンピタンス等）", topicIds: ["strat-corporate-strategy"] },
          { label: "技術戦略（ロードマップ・MOT・イノベーション・新事業）", topicIds: ["strat-technology-development-strategy", "strat-innovation-management", "strat-new-business-development"] },
          { label: "経営管理システム（CRM・SCM・ERP）", topicIds: ["strat-management-systems"] },
          { label: "BCP（事業継続計画）", topicIds: ["strat-bcp"] },
          { label: "生成AI・DX", topicIds: ["strat-generative-ai-dx"] },
          { label: "e-ビジネス（EC・EDI・フィンテック）", topicIds: ["strat-ebusiness"] },
          { label: "ネットビジネスの戦略（ロングテール・O2O・オムニチャネル）", topicIds: ["strat-internet-business"] },
          { label: "生産方式（ライン・セル・JIT・BTO）", topicIds: ["strat-production-methods"] },
          { label: "ソリューションビジネス・SI", topicIds: ["strat-solution-business"] },
        ],
      },
      {
        label: "システム戦略",
        items: [
          { label: "情報システム戦略", topicIds: ["strat-system-strategy"] },
          { label: "業務プロセス改善（BPR・BPM）", topicIds: ["strat-business-process"] },
          { label: "システム企画・RFP・調達管理", topicIds: ["strat-system-planning-rfp"] },
        ],
      },
    ],
  },
];

/** シラバス定義と教材データの整合性を、ビルド時とテストで検証する。 */
export function validateSyllabus(
  syllabus: SyllabusSection[],
  topics: Topic[],
): string[] {
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));
  const errors: string[] = [];

  for (const section of syllabus) {
    for (const category of section.categories) {
      for (const item of category.items) {
        const location = `${section.label} > ${category.label} > ${item.label}`;
        if (item.topicIds.length === 0) {
          errors.push(`${location}: 対応トピックがありません`);
          continue;
        }
        for (const topicId of item.topicIds) {
          const topic = topicMap.get(topicId);
          if (!topic) {
            errors.push(`${location}: topicId「${topicId}」が存在しません`);
            continue;
          }
          if (topic.checkQuestions.length < 4) {
            errors.push(`${topicId}: 確認問題が4問未満です`);
          }
          if (!topic.explanation?.body || !topic.explanation.keyPoints?.length) {
            errors.push(`${topicId}: 解説または重要ポイントがありません`);
          }
          if (!topic.reviewPrompt?.question || !topic.reviewPrompt.answer) {
            errors.push(`${topicId}: 復習問題または回答がありません`);
          }
        }
      }
    }
  }
  return errors;
}

