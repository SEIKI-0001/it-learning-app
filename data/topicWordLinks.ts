// トピック ↔ 関連単語（英略語単語帳）の対応。Single Source of Truth。
//
// 「確認パックがあるから単語がある」のではなく、トピック・関連単語・確認パックは別の概念。
//   - Today の「関連用語を4択で確認」（lib/todayVocab）
//   - 確認パックの用語ステップ（data/topicCheckPacks の flashcardIds）
// はどちらもこの表を参照する。確認パックの無いトピックでも、ここに書けば Today に出る。
//
// 値は data/wordlist/itpassAcronyms.json の id。存在しない id は test/topicWordLinks.test.ts が落とす。
// 単語帳で扱うべき略語が無いトピック（処理形態・ファイルシステム・組織形態など）は
// 無理に書かない（未掲載＝関連語なし）。並びは確認パックの出題順を兼ねる。

export const TOPIC_WORD_LINKS: Readonly<Record<string, readonly string[]>> = {
  // ---- 確認パックの関連語（2026-10-12 監査でトピックと無関係な語を外した） ----
  "tech-network-address": ["nat", "dns", "dhcp"],
  "tech-security-cia": ["isms"],
  "tech-lan-wan": ["lan", "wan", "vpn"],
  "tech-web-internet-basics": ["tcp", "udp", "http"],
  "tech-http-https": ["http", "https", "tls"],
  "tech-database-sql": ["sql", "dbms", "rdbms"],
  "tech-keys": ["dbms", "rdbms", "sql"],
  "tech-normalization": ["dbms", "rdbms", "sql"],
  "tech-encryption-hash": ["sha", "tls"],
  "tech-common-key-crypto": ["aes"],
  "tech-public-key-crypto": ["pki", "ca"],
  "tech-auth-authz-mfa": ["mfa", "sso", "otp"],
  "tech-malware-phishing-ransomware": ["csirt", "soc", "ids"],
  "tech-firewall-vpn-zero-trust": ["vpn", "waf", "zerotrust"],
  "tech-cloud-models": ["saas", "paas", "iaas"],
  "tech-ai-ml": ["ai", "ml", "dl"],
  "tech-iot": ["iot", "m2m", "lpwa"],
  "tech-data-utilization": ["bi", "dwh"],
  "tech-api": ["api", "json"],
  "tech-reliability-availability": ["mtbf", "mttr"],
  "tech-transaction": ["acid", "dbms"],
  "tech-cyber-attacks": ["ddos", "xss", "waf"],
  "tech-digital-signature": ["ca", "pki"],
  "tech-isms-risk": ["isms", "csirt", "soc"],
  "tech-wireless-mobile": ["ssid", "wpa", "mvno"],
  "tech-email-protocol": ["smtp", "pop", "imap"],
  "mgmt-pm-qcd": ["qcd", "pmbok"],
  "mgmt-service-sla": ["sla", "slo", "sli"],
  "mgmt-itil": ["itil", "sla"],
  "mgmt-pdca": ["pdca"],
  "mgmt-risk-management": ["isms", "bcp", "drp"],
  "mgmt-facility-management": ["ups", "bcp"],
  "mgmt-estimation": ["fp", "wbs"],
  "strat-swot": ["swot", "pest"],
  "strat-3c": ["swot", "pest"],
  "strat-marketing-4p": ["seo", "ec", "o2o"],
  "strat-legal-compliance": ["nda", "csr"],
  "strat-privacy-law": ["gdpr"],
  "strat-system-strategy": ["ea", "bpr", "poc"],
  "strat-business-process": ["bpr", "bpm", "bpmn"],
  "strat-ppm": ["ppm"],
  "strat-value-chain": ["scm"],
  "strat-management-systems": ["crm", "scm", "erp"],
  "strat-goal-evaluation": ["kgi", "kpi", "csf", "bsc"],
  "strat-financial-statements": ["roe", "roi"],
  "strat-generative-ai-dx": ["genai", "llm", "rag"],
  "strat-corporate-strategy": ["ma", "mbo", "tob"],
  "strat-ebusiness": ["ec", "edi", "fintech"],
  "strat-bcp": ["bcp", "rto", "rpo", "drp"],
  // ---- 確認パックで用語が空だったトピック（2026-10-12 監査で追加） ----
  "tech-computer-core": ["cpu", "gpu", "ssd"],
  "tech-os-software-hardware": ["os", "oss"],
  "tech-data-structure": ["lifo", "fifo"],
  "mgmt-wbs-gantt": ["wbs"],
  "strat-standardization": ["jis", "iso", "qr"],
  // ---- 確認パックの無いトピック（2026-09-26 監査で追加） ----
  "tech-raid": ["raid"], // 新規収録
  "tech-backup": ["rpo", "rto"], // 新規収録
  "tech-io-devices": ["nfc"], // 新規収録
  "tech-ui-ux": ["ui", "ux"], // 既存語の未リンク
  "tech-multimedia-compression": ["ar", "vr"], // 新規収録
  "mgmt-pmbok-basics": ["pmbok"], // 新規収録
  "strat-business-systems": ["pos", "gps"], // POS=新規収録 / GPS=既存語の未リンク
  "strat-engineering-systems": ["cad", "cam"], // 既存語の未リンク
  "strat-production-management": ["mrp"], // 新規収録
  "strat-enterprise-activities": ["csr"], // 新規収録
  "strat-system-planning-rfp": ["rfp", "rfi", "rfq"], // RFP/RFI=既存語の未リンク / RFQ=新規収録
};

/** トピックの関連単語 id（関連語が無いトピックは空配列）。 */
export function topicWordIds(topicId: string): string[] {
  return [...(TOPIC_WORD_LINKS[topicId] ?? [])];
}
