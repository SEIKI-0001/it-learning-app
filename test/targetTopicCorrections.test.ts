import { describe, expect, it } from "vitest";
import { topics } from "@/data/topics";
import type { Topic } from "@/types/content";

const targetTopic = (id: string): Topic => {
  const topic = topics.find((candidate) => candidate.id === id);
  expect(topic, `topic ${id} should exist`).toBeDefined();
  return topic!;
};

const allTopicText = (topic: Topic): string => JSON.stringify(topic);

describe("corrected target topic content", () => {
  it("adds the required strategy calculations and existing-topic expansions", () => {
    const textOf = (id: string) => JSON.stringify(targetTopic(id));
    for (const keyword of ["MRP", "発注", "40 × 3 - 25 = 95"]) {
      expect(textOf("strat-production-management")).toContain(keyword);
    }
    for (const [id, keywords] of [
      ["strat-management-systems", ["ヒト", "モノ", "カネ", "情報"]],
      ["strat-business-process", ["業務分析", "業務計画", "ボトルネック"]],
      ["strat-financial-statements", ["売上総利益", "営業利益", "経常利益", "当期純利益"]],
      ["strat-system-strategy", ["利用者教育", "導入促進", "IT投資評価", "導入後評価"]],
    ] as const) {
      for (const keyword of keywords) expect(textOf(id)).toContain(keyword);
    }
    expect(textOf("strat-enterprise-activities")).toContain("CSR");
    expect(textOf("strat-enterprise-activities")).toContain("ステークホルダ");
  });

  it("keeps every MRP arithmetic distractor aligned with its explanation", () => {
    const question = targetTopic("strat-production-management").checkQuestions.find(
      (candidate) => candidate.id === "strat-production-management-q1",
    );

    expect(question).toBeDefined();
    expect(question?.choices).toContainEqual({ key: "D", text: "15個" });
    expect(question?.choiceExplanations?.D).toContain("40 - 25 = 15");
    expect(JSON.stringify(question)).not.toContain("55個");
  });

  it("uses neutral POS-data objectives while only one choice changes ordering", () => {
    const question = targetTopic("strat-business-systems").checkQuestions.find(
      (candidate) => candidate.id === "strat-business-systems-q1",
    );

    expect(question).toBeDefined();
    expect(question?.choices.map((choice) => choice.text)).toEqual([
      "時間帯別の販売実績に合わせて発注量を変え、品切れと余剰在庫を減らす",
      "商品別の販売数量を分析して売場の陳列を見直す",
      "店舗別の売上高を集計して店舗の業績を比較する",
      "時間帯別の取引件数を分析してレジ要員の配置を見直す",
    ]);
    expect(question?.choices.filter((choice) => choice.text.includes("発注"))).toHaveLength(1);
    expect(question?.choiceExplanations?.B).toContain("売場");
    expect(question?.choiceExplanations?.C).toContain("店舗別売上");
    expect(question?.choiceExplanations?.D).toContain("レジ要員");
  });

  it("uses the current Act on Ensuring Proper Transactions Involving Small and Medium-Sized Entrusted Business Operators", () => {
    const topic = targetTopic("strat-labor-laws");
    const content = allTopicText(topic);
    const currentLawQuestion = topic.checkQuestions.find((question) =>
      question.prompt.includes("取適法"),
    );

    expect(content).toContain("中小受託取引適正化法");
    expect(content).toContain("通称「取適法」");
    expect(content).toContain("旧称「下請法」");
    expect(content).toContain("委託事業者");
    expect(content).toContain("中小受託事業者");
    expect(content).toContain("従業員基準");
    expect(content).toContain("手形払");
    expect(content).toContain("基本表現も「親事業者・下請事業者」から「委託事業者・中小受託事業者」に変わりました");
    expect(topic.examPoint).not.toContain("下請法");
    expect(topic.relatedTerms).not.toContain("下請法");
    expect(currentLawQuestion).toBeDefined();
    expect(JSON.stringify(currentLawQuestion)).toContain("従業員基準");
    expect(JSON.stringify(currentLawQuestion)).toContain("手形払");
  });

  it("states the purpose and justification requirements for security offences", () => {
    const topic = targetTopic("strat-security-laws");
    const content = allTopicText(topic);
    const credentialQuestion = topic.checkQuestions.find((question) =>
      question.prompt.includes("保管"),
    );

    expect(content).toContain("不正アクセス行為に使用する目的");
    expect(content).toContain("提供には業務その他の正当な理由");
    expect(content).toContain("正当な理由がない");
    expect(content).toContain("他人のコンピュータで実行させる目的");
    expect(content).toContain("正当なセキュリティ研究や業務");
    expect(content).not.toContain("不正に取得・保管したり第三者に教えたりする行為も処罰");
    expect(credentialQuestion).toBeDefined();
    expect(credentialQuestion?.prompt).toContain("不正アクセス行為に使用する目的");
    expect(JSON.stringify(credentialQuestion?.choiceExplanations)).toContain(
      "不正アクセス行為に使用する目的",
    );
  });

  it("distinguishes personal information from personal data and explains sharing exceptions", () => {
    const topic = targetTopic("strat-privacy-law");
    const content = allTopicText(topic);
    const thirdPartyQuestion = topic.checkQuestions.find((question) =>
      question.prompt.includes("第三者"),
    );

    expect(content).toContain("個人データは");
    expect(content).toContain("個人情報データベース等");
    expect(content).toContain("要配慮個人情報");
    expect(content).toContain("法令に基づく場合");
    expect(content).toContain("生命・身体・財産");
    expect(content).toContain("同じ会社の別部署");
    expect(content).toContain("第三者提供には当たりません");
    expect(content).toContain("利用目的の範囲");
    expect(content).not.toContain("本人の同意なく第三者に渡さない");
    expect(thirdPartyQuestion?.prompt).toContain("個人データ");
    expect(JSON.stringify(thirdPartyQuestion?.choiceExplanations)).toContain(
      "法令に基づく場合",
    );
  });

  it("explains that system audits can be internal or external while remaining independent", () => {
    const topic = targetTopic("mgmt-system-audit");
    const content = allTopicText(topic);
    const auditTypeQuestion = topic.checkQuestions.find((question) =>
      question.prompt.includes("内部監査部門"),
    );

    expect(content).toContain("内部監査");
    expect(content).toContain("外部監査");
    expect(content).toContain("社内の内部監査部門");
    expect(content).toContain("独立性");
    expect(content).toContain("客観性");
    expect(content).toContain("開発・運用・修正");
    expect(content).not.toContain("監査は「外からの点検」");
    expect(auditTypeQuestion).toBeDefined();
    expect(JSON.stringify(auditTypeQuestion)).toContain("適切");
  });

  it("limits HTTPS and certificate assurances to their actual roles", () => {
    const topic = targetTopic("tech-http-https");
    const content = allTopicText(topic);
    const certificateQuestion = topic.checkQuestions.find((question) =>
      question.prompt.includes("DV証明書"),
    );

    expect(content).toContain("接続先ドメインと公開鍵");
    expect(content).toContain("DV証明書");
    expect(content).toContain("OV・EV証明書");
    expect(content).toContain("サイトの内容");
    expect(content).toContain("商取引");
    expect(content).toContain("詐欺サイト");
    expect(content).not.toContain("サイトの正当性を保証");
    expect(content).not.toContain("サイト運営者）が実在");
    expect(certificateQuestion).toBeDefined();
    expect(JSON.stringify(certificateQuestion)).toContain("ドメイン管理権限");
    expect(JSON.stringify(certificateQuestion)).toContain("組織の実在");
  });

  it("adds calculations and required technology expansions", () => {
    const textOf = (id: string) => JSON.stringify(targetTopic(id));
    for (const keyword of ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "16TB", "12TB"]) {
      expect(textOf("tech-raid")).toContain(keyword);
    }
    for (const keyword of ["レスポンスタイム", "ターンアラウンドタイム", "スループット", "60件/分"]) {
      expect(textOf("tech-system-performance")).toContain(keyword);
    }
    for (const [id, keywords] of [
      ["tech-programming-basics", ["機械語", "アセンブラ", "高水準言語", "コンパイラ", "インタプリタ", "HTML", "XML", "JSON"]],
      ["tech-io-devices", ["USB", "HDMI", "Bluetooth", "NFC"]],
      ["tech-os-software-hardware", ["ワープロ", "表計算", "プレゼンテーション", "グループウェア", "OSS", "GPL", "コピーレフト"]],
    ] as const) {
      for (const keyword of keywords) expect(textOf(id)).toContain(keyword);
    }
  });

  it("teaches RAID capacities with aligned arithmetic explanations", () => {
    const topic = targetTopic("tech-raid");
    const raid5 = topic.checkQuestions.find((question) =>
      question.prompt.includes("RAID 5"),
    );
    const raid6 = topic.checkQuestions.find((question) =>
      question.prompt.includes("RAID 6"),
    );

    expect(raid5?.correctChoice).toBe("A");
    expect(raid5?.choices[0]).toEqual({ key: "A", text: "16TB" });
    expect(raid5?.choiceExplanations?.A).toContain("4TB × (5 - 1) = 16TB");
    expect(raid6?.correctChoice).toBe("A");
    expect(raid6?.choices[0]).toEqual({ key: "A", text: "12TB" });
    expect(raid6?.choiceExplanations?.A).toContain("4TB × (5 - 2) = 12TB");
  });

  it("teaches system throughput with an aligned calculation", () => {
    const question = targetTopic("tech-system-performance").checkQuestions.find(
      (candidate) => candidate.prompt.includes("10分で600件"),
    );

    expect(question?.correctChoice).toBe("A");
    expect(question?.choices[0]).toEqual({ key: "A", text: "60件/分" });
    expect(question?.choiceExplanations?.A).toContain("600件 ÷ 10分 = 60件/分");
  });

  it("uses scenarios for backup recovery order and network device distinctions", () => {
    const backupQuestion = targetTopic("tech-backup").checkQuestions.find(
      (candidate) => candidate.prompt.includes("日曜にフル"),
    );
    const routerQuestion = targetTopic("tech-network-devices").checkQuestions.find(
      (candidate) => candidate.prompt.includes("異なるIPネットワーク"),
    );

    expect(backupQuestion?.choices[0]).toEqual({
      key: "A",
      text: "日曜フル → 月曜増分 → 火曜増分 → 水曜増分",
    });
    expect(backupQuestion?.choiceExplanations?.A).toContain(
      "取得した順にすべて適用",
    );
    expect(routerQuestion?.choices[0]).toEqual({ key: "A", text: "ルータ" });
    expect(routerQuestion?.choiceExplanations?.A).toContain("パケット");
  });
});
