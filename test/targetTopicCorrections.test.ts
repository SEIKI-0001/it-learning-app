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
});
