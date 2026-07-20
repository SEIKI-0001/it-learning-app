import { describe, expect, it } from "vitest";
import { getAllTopics } from "@/lib/content";

const EXISTING_TOPIC_IDS = [
  "tech-binary-data", "tech-network-address", "tech-security-cia",
  "tech-computer-core", "tech-os-software-hardware", "tech-lan-wan",
  "tech-web-internet-basics", "tech-http-https", "tech-database-sql",
  "tech-keys", "tech-normalization", "tech-encryption-hash",
  "tech-common-key-crypto", "tech-public-key-crypto", "tech-auth-authz-mfa",
  "tech-malware-phishing-ransomware", "tech-firewall-vpn-zero-trust",
  "tech-cloud-models", "tech-ai-ml", "tech-iot", "tech-algorithm-flowchart",
  "tech-programming-basics", "tech-data-utilization", "tech-api",
  "tech-reliability-availability", "tech-logic-operations", "tech-spreadsheet",
  "tech-data-structure", "tech-transaction", "tech-cyber-attacks",
  "tech-digital-signature", "tech-isms-risk", "tech-wireless-mobile",
  "tech-email-protocol", "tech-io-devices", "tech-ui-ux",
  "tech-multimedia-compression", "mgmt-pm-qcd", "mgmt-wbs-gantt",
  "mgmt-service-sla", "mgmt-itil", "mgmt-system-audit",
  "mgmt-development-process", "mgmt-requirements-definition", "mgmt-testing",
  "mgmt-pdca", "mgmt-risk-management", "mgmt-facility-management",
  "mgmt-estimation", "strat-swot", "strat-enterprise-activities", "strat-3c",
  "strat-marketing-4p", "strat-accounting-break-even", "strat-legal-compliance",
  "strat-intellectual-property", "strat-privacy-law", "strat-security-laws",
  "strat-system-strategy", "strat-business-process", "strat-solution-business",
  "strat-ppm", "strat-value-chain", "strat-management-systems",
  "strat-goal-evaluation", "strat-financial-statements", "strat-generative-ai-dx",
  "strat-corporate-strategy", "strat-ebusiness", "strat-standardization",
  "strat-labor-laws", "strat-bcp", "strat-system-planning-rfp",
] as const;

describe("IPA syllabus coverage", () => {
  it("keeps every pre-existing Topic ID", () => {
    const actual = new Set(getAllTopics().map((topic) => topic.id));
    expect(EXISTING_TOPIC_IDS.filter((id) => !actual.has(id))).toEqual([]);
  });
});
