import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IPA_SYLLABUS_VERSION, ipaSyllabusItems } from "@/data/ipaSyllabus";
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

const TECHNOLOGY_NEW_TOPIC_IDS = [
  "tech-system-processing-architecture",
  "tech-raid",
  "tech-system-performance",
  "tech-parallel-systems",
  "tech-computer-types",
  "tech-file-system",
  "tech-backup",
  "tech-network-devices",
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
  it("tracks IPA syllabus 6.5 items 1 through 63 without gaps", () => {
    expect(IPA_SYLLABUS_VERSION).toBe("6.5");
    expect(ipaSyllabusItems).toHaveLength(63);
    expect(ipaSyllabusItems.map((item) => item.number)).toEqual(
      Array.from({ length: 63 }, (_, index) => index + 1),
    );
    expect(new Set(ipaSyllabusItems.map((item) => item.id)).size).toBe(63);
  });

  it("maps every IPA item to existing learning content", () => {
    const topicIds = new Set(getAllTopics().map((topic) => topic.id));
    for (const item of ipaSyllabusItems) {
      expect(item.topicIds.length, item.id).toBeGreaterThan(0);
      expect(item.topicIds.filter((id) => !topicIds.has(id)), item.id).toEqual([]);
      expect(["covered", "expanded", "new"]).toContain(item.coverage);
      expect(item.note.trim(), item.id).toBeTruthy();
    }
  });

  it("registers every Topic in the learning catalog exactly once", () => {
    const allTopicIds = getAllTopics().map((topic) => topic.id);
    const orderedLessonIds = getOrderedLessonIds();

    expect(orderedLessonIds).toHaveLength(allTopicIds.length);
    expect(new Set(orderedLessonIds)).toEqual(new Set(allTopicIds));
  });

  it("keeps the human-readable IPA coverage document synchronized", () => {
    const coveragePath = path.join(
      process.cwd(),
      "docs/content/ipa-syllabus-coverage.md",
    );
    const coverageDocument = readFileSync(coveragePath, "utf8");
    const markers = coverageDocument.match(/<!-- ipa-\d{2} -->/g) ?? [];

    expect(markers).toHaveLength(63);
    expect(new Set(markers).size).toBe(63);
    for (const item of ipaSyllabusItems) {
      const marker = `<!-- ${item.id} -->`;
      const row = coverageDocument
        .split("\n")
        .find((line) => line.includes(marker));

      expect(row, item.id).toBeDefined();
      expect(row).toContain(item.majorCategory);
      expect(row).toContain(item.middleCategory);
      expect(row).toContain(item.name);
      expect(row).toContain(item.coverage);
      expect(row).toContain(item.note);
      for (const topicId of item.topicIds) {
        expect(row).toContain(`\`${topicId}\``);
      }
    }
    expect(coverageDocument).not.toMatch(/\b(?:0[0-9]|1[0-5])-\d{2}\b/);
  });

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
      const topic = getAllTopics().find(
        (topic) => topic.id === "mgmt-project-communication",
      );
      const sixPersonQuestion = topic?.checkQuestions.find(
        (question) => question.prompt.includes("6人のメンバー"),
      );

      expect(JSON.stringify(topic)).toContain("n(n-1)/2");
      expect(sixPersonQuestion).toBeDefined();
      expect(sixPersonQuestion?.correctChoice).toBe("A");
      expect(sixPersonQuestion?.choices).toEqual([
        { key: "A", text: "15本" },
        { key: "B", text: "6本" },
        { key: "C", text: "30本" },
        { key: "D", text: "12本" },
      ]);
      expect(sixPersonQuestion?.choiceExplanations?.A).toContain("6 × 5 ÷ 2 = 15");
    });

    it("teaches PMBOK process groups as overlapping management-purpose groupings", () => {
      const topic = getAllTopics().find((candidate) => candidate.id === "mgmt-pmbok-basics");
      const text = JSON.stringify(topic);

      expect(topic?.explanation.body).toContain("管理上の目的");
      expect(topic?.explanation.body).toContain("重なり");
      expect(topic?.explanation.body).toContain("繰り返");
      expect(topic?.explanation.body).toContain("実行と並行して");
      expect(text).not.toContain("時間的なまとまり");
      expect(text).not.toContain("活動の段階");
      expect(text).not.toContain("代表的なプロセス群の並び");
      expect(text).not.toContain("基本の並び");
    });
  });

  describe("newly required Topic technology content", () => {
    it.each(TECHNOLOGY_NEW_TOPIC_IDS)("provides quality technology Topic %s", (id) => {
      assertCompactTopicQuality(id);
    });
  });
});
