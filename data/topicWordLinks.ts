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
  // ---- 確認パックから移した対応（出題順・内容とも従来どおり） ----
  "tech-network-address": ["nat", "dns", "dhcp"],
  "tech-security-cia": ["isms", "mfa", "sso"],
  "tech-lan-wan": ["lan", "wan", "vpn"],
  "tech-web-internet-basics": ["tcp", "udp", "http"],
  "tech-http-https": ["http", "https", "tcp"],
  "tech-database-sql": ["sql", "dbms", "rdbms"],
  "tech-keys": ["dbms", "rdbms", "sql"],
  "tech-normalization": ["dbms", "rdbms", "sql"],
  "tech-encryption-hash": ["https", "mfa", "isms"],
  "tech-common-key-crypto": ["https", "vpn", "isms"],
  "tech-public-key-crypto": ["https", "mfa", "isms"],
  "tech-auth-authz-mfa": ["mfa", "sso", "byod"],
  "tech-malware-phishing-ransomware": ["csirt", "soc", "ids"],
  "tech-firewall-vpn-zero-trust": ["vpn", "waf", "zerotrust"],
  "tech-cloud-models": ["saas", "paas", "iaas"],
  "tech-ai-ml": ["ai", "ml", "dl"],
  "tech-iot": ["iot", "m2m", "byod"],
  "tech-data-utilization": ["ai", "ml", "rpa"],
  "tech-api": ["api", "saas", "paas"],
  "tech-reliability-availability": ["sla", "slo", "sli"],
  "tech-transaction": ["dbms", "rdbms", "sql"],
  "tech-cyber-attacks": ["waf", "ids", "ips"],
  "tech-digital-signature": ["https", "isms", "mfa"],
  "tech-isms-risk": ["isms", "csirt", "soc"],
  "tech-wireless-mobile": ["lan", "wan", "byod"],
  "tech-email-protocol": ["tcp", "dns", "http"],
  "mgmt-pm-qcd": ["kpi", "kgi", "roi"],
  "mgmt-service-sla": ["sla", "slo", "sli"],
  "mgmt-itil": ["sla", "slo", "sli"],
  "mgmt-system-audit": ["isms", "soc", "csirt"],
  "mgmt-development-process": ["poc", "bpmn", "dfd"],
  "mgmt-requirements-definition": ["rfi", "rfp", "bpmn"],
  "mgmt-pdca": ["kpi", "kgi", "bpr"],
  "mgmt-risk-management": ["isms", "bcp", "drp"],
  "mgmt-facility-management": ["bcp", "drp", "sla"],
  "mgmt-estimation": ["rfi", "rfp", "roi"],
  "strat-swot": ["swot", "pest", "ppm"],
  "strat-3c": ["swot", "pest", "seo"],
  "strat-marketing-4p": ["seo", "ec", "o2o"],
  "strat-accounting-break-even": ["roi", "kpi", "kgi"],
  "strat-legal-compliance": ["nda", "aml", "cft"],
  "strat-privacy-law": ["ekyc", "aml", "mfa"],
  "strat-security-laws": ["mfa", "isms", "csirt"],
  "strat-system-strategy": ["ea", "bpr", "poc"],
  "strat-business-process": ["bpr", "bpmn", "dfd"],
  "strat-ppm": ["ppm", "roi", "kpi"],
  "strat-value-chain": ["scm", "crm", "erp"],
  "strat-management-systems": ["crm", "scm", "erp"],
  "strat-goal-evaluation": ["kgi", "kpi", "mbo"],
  "strat-financial-statements": ["roi", "cfo", "kpi"],
  "strat-generative-ai-dx": ["genai", "llm", "rag"],
  "strat-corporate-strategy": ["ma", "poc", "roi"],
  "strat-ebusiness": ["ec", "edi", "fintech"],
  "strat-labor-laws": ["nda", "hrm", "hrtech"],
  "strat-bcp": ["bcp", "drp", "isms"],
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
