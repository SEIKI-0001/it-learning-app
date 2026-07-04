import Link from "next/link";
import { getAllTopics } from "@/lib/content";
import BottomNav from "@/components/BottomNav";

// ── シラバスデータ ──────────────────────────────────────────────────────────

type SyllabusItem = {
  label: string;
  topicIds: string[];
};

type SyllabusCategory = {
  label: string;
  items: SyllabusItem[];
};

type SyllabusSection = {
  id: string;
  label: string;
  categories: SyllabusCategory[];
};

const SYLLABUS: SyllabusSection[] = [
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
          { label: "ハードウェア（入出力装置・各種デバイス）", topicIds: [] },
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
          { label: "ヒューマンインタフェース・UX", topicIds: [] },
          { label: "情報メディア・マルチメディア・圧縮", topicIds: [] },
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
          { label: "経営管理システム（CRM・SCM・ERP）", topicIds: ["strat-management-systems"] },
          { label: "BCP（事業継続計画）", topicIds: ["strat-bcp"] },
          { label: "生成AI・DX", topicIds: ["strat-generative-ai-dx"] },
          { label: "e-ビジネス（EC・EDI・フィンテック）", topicIds: ["strat-ebusiness"] },
          { label: "ソリューションビジネス・SI", topicIds: ["strat-solution-business"] },
        ],
      },
      {
        label: "システム戦略",
        items: [
          { label: "情報システム戦略", topicIds: ["strat-system-strategy"] },
          { label: "業務プロセス改善（BPR・BPM）", topicIds: ["strat-business-process"] },
          { label: "システム企画・RFP・調達管理", topicIds: [] },
        ],
      },
    ],
  },
];

// ── ページ本体 ──────────────────────────────────────────────────────────────

export default function SyllabusPage() {
  const topics = getAllTopics();
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  const allItems = SYLLABUS.flatMap((s) => s.categories.flatMap((c) => c.items));
  const coveredTotal = allItems.filter((i) => i.topicIds.length > 0).length;
  const total = allItems.length;
  const coveragePercent = Math.round((coveredTotal / total) * 100);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-4xl">
          <Link
            href="/topics"
            className="mb-2 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            ← トピック一覧
          </Link>
          <h1 className="text-2xl font-extrabold">シラバス対応表</h1>
          <p className="mt-1 text-sm text-white/90">
            ITパスポートシラバス Ver.6.5 との対応状況を確認できます。
          </p>

          <div className="mt-4 rounded-2xl bg-white/15 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">シラバス項目カバー率</span>
              <span className="text-xl font-extrabold">
                {coveredTotal}
                <span className="text-sm font-normal text-white/80">/{total}項目</span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-2 rounded-full bg-emerald-300"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-xs text-white/70">{coveragePercent}% カバー</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SYLLABUS.map((section) => {
              const items = section.categories.flatMap((c) => c.items);
              const covered = items.filter((i) => i.topicIds.length > 0).length;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30"
                >
                  {section.label}　{covered}/{items.length}
                </a>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-10 px-4 py-8 md:max-w-4xl">
        {SYLLABUS.map((section) => {
          const sectionItems = section.categories.flatMap((c) => c.items);
          const sectionCovered = sectionItems.filter((i) => i.topicIds.length > 0).length;
          return (
            <section key={section.id} id={section.id}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-gray-800">{section.label}</h2>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-600">
                  {sectionCovered}/{sectionItems.length}
                </span>
              </div>

              <div className="space-y-3">
                {section.categories.map((cat) => (
                  <div
                    key={cat.label}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                  >
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                      <h3 className="text-sm font-bold text-gray-700">{cat.label}</h3>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {cat.items.map((item) => {
                        const covered = item.topicIds.length > 0;
                        return (
                          <li key={item.label} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={`text-sm leading-snug ${
                                  covered ? "font-medium text-gray-800" : "text-gray-400"
                                }`}
                              >
                                {item.label}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  covered
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {covered ? "対応済" : "未対応"}
                              </span>
                            </div>
                            {covered && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {item.topicIds.map((id) => {
                                  const topic = topicMap.get(id);
                                  if (!topic) return null;
                                  return (
                                    <Link
                                      key={id}
                                      href={`/topics/${id}`}
                                      className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                                    >
                                      {topic.title}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-xs text-gray-400">
          ITパスポートシラバス Ver.6.5 をもとに作成。未対応項目は今後のトピック追加予定です。
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
