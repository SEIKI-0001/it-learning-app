import { describe, expect, it } from "vitest";
import { getAllTopics } from "@/lib/content";
import { getOrderedLessonIds } from "@/lib/learningCatalog";

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

const STRATEGY_NEW_TOPIC_IDS = [
  "strat-corporation-management-organization",
  "strat-decision-problem-solving",
  "strat-technology-development-strategy",
  "strat-business-systems",
  "strat-engineering-systems",
  "strat-production-management",
  "strat-embedded-systems",
] as const;

const MANAGEMENT_NEW_TOPIC_IDS = [
  "mgmt-system-design",
  "mgmt-operation-maintenance",
  "mgmt-pmbok-basics",
  "mgmt-project-resource",
  "mgmt-project-communication",
] as const;

const assertCompactTopicQuality = (id: string) => {
  const topic = getAllTopics().find((candidate) => candidate.id === id);
  expect(topic, `${id} should exist`).toBeDefined();
  expect(getOrderedLessonIds().filter((candidate) => candidate === id)).toHaveLength(1);
  expect(topic?.summary.trim()).toBeTruthy();
  expect(topic?.conceptCard.body.trim()).toBeTruthy();
  expect(topic?.conceptCard.analogy?.trim()).toBeTruthy();
  expect(topic?.explanation.body.trim()).toBeTruthy();
  expect(topic?.explanation.keyPoints?.length).toBeGreaterThanOrEqual(3);
  expect(topic?.conceptCard.diagram ?? topic?.explanation.diagram).toBeDefined();
  expect(topic?.relatedTerms?.length).toBeGreaterThanOrEqual(3);
  expect(topic?.referenceHints[0]?.keywords.length).toBeGreaterThanOrEqual(3);
  expect(topic?.checkQuestions.length).toBeGreaterThanOrEqual(4);
  for (const question of topic?.checkQuestions ?? []) {
    expect(question.choices).toHaveLength(4);
    expect(question.choiceExplanations?.A).toBeTruthy();
    expect(question.choiceExplanations?.B).toBeTruthy();
    expect(question.choiceExplanations?.C).toBeTruthy();
    expect(question.choiceExplanations?.D).toBeTruthy();
  }
};

describe("IPA syllabus coverage", () => {
  it("keeps every pre-existing Topic ID", () => {
    const actual = new Set(getAllTopics().map((topic) => topic.id));
    expect(EXISTING_TOPIC_IDS.filter((id) => !actual.has(id))).toEqual([]);
  });

  describe("newly required Topic strategy content", () => {
    it.each(STRATEGY_NEW_TOPIC_IDS)("provides quality strategy Topic %s", (id) => {
      assertCompactTopicQuality(id);
    });
  });

  describe("newly required Topic management content", () => {
    it.each(MANAGEMENT_NEW_TOPIC_IDS)("provides quality management Topic %s", (id) => {
      assertCompactTopicQuality(id);
    });

    it("teaches the communication channel calculation", () => {
      const text = JSON.stringify(getAllTopics().find(
        (topic) => topic.id === "mgmt-project-communication",
      ));
      expect(text).toContain("n(n-1)/2");
      expect(text).toContain("6 × 5 ÷ 2 = 15");
    });
  });
});
