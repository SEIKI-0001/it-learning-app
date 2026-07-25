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

const OFFICIAL_IPA_65_ITEMS = [
  [1, "経営・組織論", "strategy", "企業と法務", "企業活動"],
  [2, "業務分析・データ利活用", "strategy", "企業と法務", "企業活動"],
  [3, "会計・財務", "strategy", "企業と法務", "企業活動"],
  [4, "知的財産権", "strategy", "企業と法務", "法務"],
  [5, "セキュリティ関連法規", "strategy", "企業と法務", "法務"],
  [6, "労働関連・取引関連法規", "strategy", "企業と法務", "法務"],
  [7, "その他の法律・ガイドライン・情報倫理", "strategy", "企業と法務", "法務"],
  [8, "標準化関連", "strategy", "企業と法務", "法務"],
  [9, "経営戦略手法", "strategy", "経営戦略", "経営戦略マネジメント"],
  [10, "マーケティング", "strategy", "経営戦略", "経営戦略マネジメント"],
  [11, "ビジネス戦略と目標・評価", "strategy", "経営戦略", "経営戦略マネジメント"],
  [12, "経営管理システム", "strategy", "経営戦略", "経営戦略マネジメント"],
  [13, "技術開発戦略の立案・技術開発計画", "strategy", "経営戦略", "技術戦略マネジメント"],
  [14, "ビジネスシステム", "strategy", "経営戦略", "ビジネスインダストリ"],
  [15, "エンジニアリングシステム", "strategy", "経営戦略", "ビジネスインダストリ"],
  [16, "e-ビジネス", "strategy", "経営戦略", "ビジネスインダストリ"],
  [17, "IoTシステム・組込みシステム", "strategy", "経営戦略", "ビジネスインダストリ"],
  [18, "情報システム戦略", "strategy", "システム戦略", "システム戦略"],
  [19, "業務プロセス", "strategy", "システム戦略", "システム戦略"],
  [20, "ソリューションビジネス", "strategy", "システム戦略", "システム戦略"],
  [21, "システム活用促進・評価", "strategy", "システム戦略", "システム戦略"],
  [22, "システム化計画", "strategy", "システム戦略", "システム企画"],
  [23, "要件定義", "strategy", "システム戦略", "システム企画"],
  [24, "調達計画・実施", "strategy", "システム戦略", "システム企画"],
  [25, "システム開発技術", "management", "開発技術", "システム開発技術"],
  [26, "開発プロセス・手法", "management", "開発技術", "ソフトウェア開発管理技術"],
  [27, "プロジェクトマネジメント", "management", "プロジェクトマネジメント", "プロジェクトマネジメント"],
  [28, "サービスマネジメント", "management", "サービスマネジメント", "サービスマネジメント"],
  [29, "サービスマネジメントシステム", "management", "サービスマネジメント", "サービスマネジメント"],
  [30, "ファシリティマネジメント", "management", "サービスマネジメント", "サービスマネジメント"],
  [31, "システム監査", "management", "サービスマネジメント", "システム監査"],
  [32, "内部統制", "management", "サービスマネジメント", "システム監査"],
  [33, "離散数学", "technology", "基礎理論", "基礎理論"],
  [34, "応用数学", "technology", "基礎理論", "基礎理論"],
  [35, "情報に関する理論", "technology", "基礎理論", "基礎理論"],
  [36, "データ構造", "technology", "基礎理論", "アルゴリズムとプログラミング"],
  [37, "アルゴリズムとプログラミング", "technology", "基礎理論", "アルゴリズムとプログラミング"],
  [38, "プログラム言語", "technology", "基礎理論", "アルゴリズムとプログラミング"],
  [39, "その他の言語", "technology", "基礎理論", "アルゴリズムとプログラミング"],
  [40, "プロセッサ", "technology", "コンピュータシステム", "コンピュータ構成要素"],
  [41, "メモリ", "technology", "コンピュータシステム", "コンピュータ構成要素"],
  [42, "入出力デバイス", "technology", "コンピュータシステム", "コンピュータ構成要素"],
  [43, "システムの構成", "technology", "コンピュータシステム", "システム構成要素"],
  [44, "システムの評価指標", "technology", "コンピュータシステム", "システム構成要素"],
  [45, "オペレーティングシステム", "technology", "コンピュータシステム", "ソフトウェア"],
  [46, "ファイルシステム", "technology", "コンピュータシステム", "ソフトウェア"],
  [47, "オフィスツール", "technology", "コンピュータシステム", "ソフトウェア"],
  [48, "オープンソースソフトウェア", "technology", "コンピュータシステム", "ソフトウェア"],
  [49, "ハードウェア（コンピュータ・入出力装置）", "technology", "コンピュータシステム", "ハードウェア"],
  [50, "情報デザイン", "technology", "技術要素", "情報デザイン"],
  [51, "インタフェース設計", "technology", "技術要素", "情報デザイン"],
  [52, "マルチメディア技術", "technology", "技術要素", "情報メディア"],
  [53, "マルチメディア応用", "technology", "技術要素", "情報メディア"],
  [54, "データベース方式", "technology", "技術要素", "データベース"],
  [55, "データベース設計", "technology", "技術要素", "データベース"],
  [56, "データ操作", "technology", "技術要素", "データベース"],
  [57, "トランザクション処理", "technology", "技術要素", "データベース"],
  [58, "ネットワーク方式", "technology", "技術要素", "ネットワーク"],
  [59, "通信プロトコル", "technology", "技術要素", "ネットワーク"],
  [60, "ネットワーク応用", "technology", "技術要素", "ネットワーク"],
  [61, "情報セキュリティ", "technology", "技術要素", "セキュリティ"],
  [62, "情報セキュリティ管理", "technology", "技術要素", "セキュリティ"],
  [63, "情報セキュリティ対策・情報セキュリティ実装技術", "technology", "技術要素", "セキュリティ"],
] as const;

const FIELD_LABELS = {
  strategy: "ストラテジ",
  management: "マネジメント",
  technology: "テクノロジ",
} as const;

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

  it("matches the official 63-item classifications independently", () => {
    expect(
      ipaSyllabusItems.map((entry) => {
        const item = entry as unknown as Record<string, unknown>;
        return [
          item.number,
          item.item,
          item.field,
          item.majorCategory,
          item.middleCategory,
        ];
      }),
    ).toEqual(OFFICIAL_IPA_65_ITEMS);
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

  it("keeps every IPA document row exactly synchronized", () => {
    const coveragePath = path.join(
      process.cwd(),
      "docs/content/ipa-syllabus-coverage.md",
    );
    const coverageDocument = readFileSync(coveragePath, "utf8");
    const markers = coverageDocument.match(/<!-- ipa-\d{2} -->/g) ?? [];

    expect(markers).toHaveLength(63);
    for (const item of ipaSyllabusItems) {
      const marker = `<!-- ${item.id} -->`;
      const rows = coverageDocument
        .split("\n")
        .filter((line) => line.includes(marker));

      expect(rows, item.id).toHaveLength(1);
      const columns = rows[0].split("|").slice(1, -1).map((column) => column.trim());
      expect(columns, item.id).toHaveLength(8);
      expect(columns[0]).toBe(`${item.number} ${marker}`);
      expect(columns[1]).toBe(FIELD_LABELS[item.field]);
      expect(columns[2]).toBe(item.majorCategory);
      expect(columns[3]).toBe(item.middleCategory);
      expect(columns[4]).toBe(item.item);
      expect(columns[5].match(/`([^`]+)`/g)?.map((id) => id.slice(1, -1)) ?? []).toEqual(
        item.topicIds,
      );
      expect(columns[6]).toBe(item.coverage);
      expect(columns[7]).toBe(item.note);
    }
    expect(coverageDocument).not.toMatch(/\b(?:0[0-9]|1[0-5])-\d{2}\b/);
  });

  it("maps reviewed syllabus gaps to learning content with matching semantics", () => {
    const byNumber = new Map(ipaSyllabusItems.map((item) => [item.number, item]));

    expect(byNumber.get(34)).toMatchObject({
      item: "応用数学",
      topicIds: ["tech-data-utilization"],
      coverage: "expanded",
    });
    expect(byNumber.get(34)?.note).toMatch(/確率.*平均.*中央値.*最頻値.*分散.*標準偏差/);
    expect(byNumber.get(35)).toMatchObject({
      item: "情報に関する理論",
      topicIds: ["tech-binary-data", "tech-multimedia-compression", "tech-ai-ml"],
    });
    expect(byNumber.get(35)?.note).toContain("AI");
    expect(byNumber.get(50)).toMatchObject({
      middleCategory: "情報デザイン",
      coverage: "expanded",
    });
    expect(byNumber.get(50)?.note).toMatch(/LATCH/);
    expect(byNumber.get(52)).toMatchObject({
      middleCategory: "情報メディア",
      coverage: "covered",
    });
    expect(byNumber.get(53)).toMatchObject({
      middleCategory: "情報メディア",
      coverage: "expanded",
    });
    expect(byNumber.get(53)?.note).toMatch(/CG.*RGB.*CMYK.*VR.*AR.*MR/);
  });

  it("teaches representative values and dispersion through a data scenario", () => {
    const topic = getAllTopics().find((candidate) => candidate.id === "tech-data-utilization");
    const text = JSON.stringify(topic);

    for (const keyword of ["確率", "平均", "中央値", "最頻値", "分散", "標準偏差"]) {
      expect(text).toContain(keyword);
    }
    const scenario = topic?.checkQuestions.find(
      (question) => question.prompt.includes("代表値") || question.prompt.includes("ばらつき"),
    );
    expect(scenario).toBeDefined();
    expect(scenario?.choices).toHaveLength(4);
    expect(Object.values(scenario?.choiceExplanations ?? {})).toHaveLength(4);
  });

  it("teaches LATCH as a practical information-design choice", () => {
    const topic = getAllTopics().find((candidate) => candidate.id === "tech-ui-ux");
    const text = JSON.stringify(topic);

    for (const keyword of ["情報デザイン", "LATCH", "Location", "Alphabet", "Time", "Category", "Hierarchy"]) {
      expect(text).toContain(keyword);
    }
    expect(topic?.checkQuestions.some((question) => question.prompt.includes("並べ"))).toBe(true);
  });

  it("teaches CG, color models, and extended reality through scenarios", () => {
    const topic = getAllTopics().find(
      (candidate) => candidate.id === "tech-multimedia-compression",
    );
    const text = JSON.stringify(topic);

    for (const keyword of ["CG", "RGB", "CMYK", "VR", "AR", "MR"]) {
      expect(text).toContain(keyword);
    }
    expect(
      topic?.checkQuestions.some((question) => /RGB|CMYK|VR|AR|MR/.test(question.prompt)),
    ).toBe(true);
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
