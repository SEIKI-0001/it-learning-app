import type { TopicCheckPack } from "@/types/checkPack";

// ============================================================================
// 確認パック（TopicCheckPack）の定義。
// ----------------------------------------------------------------------------
// 方針:
//   - 確認問題（基礎理解）＋ 関連単語（用語定着）＋ 過去問レベル問題（本番対応力）
//     を1トピック単位で束ねる。
//   - MVP。重要度の高いトピックから用意する（全トピックには作らない）。
//   - quizQuestionIds は topicId-q1..q4（topicFactory の採番）を指す。
//     解決側でトピックの checkQuestions と突き合わせ、無ければ全問にフォールバックする。
//   - flashcardIds は data/wordlist/itpassAcronyms.json のエントリ id。
//   - examLevelQuestionIds は data/examLevelQuestions.ts の id。
// ============================================================================

function quizIds(topicId: string, n = 4): string[] {
  return Array.from({ length: n }, (_, i) => `${topicId}-q${i + 1}`);
}

function examIds(topicId: string, n = 2): string[] {
  return Array.from({ length: n }, (_, i) => `${topicId}-ex${i + 1}`);
}

export const topicCheckPacks: TopicCheckPack[] = [
  {
    packId: "pack-tech-security-cia",
    topicId: "tech-security-cia",
    quizQuestionIds: quizIds("tech-security-cia"),
    flashcardIds: ["isms", "mfa", "sso"],
    examLevelQuestionIds: examIds("tech-security-cia"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-network-address",
    topicId: "tech-network-address",
    quizQuestionIds: quizIds("tech-network-address"),
    flashcardIds: ["nat", "dns", "dhcp"],
    examLevelQuestionIds: examIds("tech-network-address"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-http-https",
    topicId: "tech-http-https",
    quizQuestionIds: quizIds("tech-http-https"),
    flashcardIds: ["http", "https", "tcp"],
    examLevelQuestionIds: examIds("tech-http-https"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-firewall-vpn-zero-trust",
    topicId: "tech-firewall-vpn-zero-trust",
    quizQuestionIds: quizIds("tech-firewall-vpn-zero-trust"),
    flashcardIds: ["vpn", "waf", "zerotrust"],
    examLevelQuestionIds: examIds("tech-firewall-vpn-zero-trust"),
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-auth-authz-mfa",
    topicId: "tech-auth-authz-mfa",
    quizQuestionIds: quizIds("tech-auth-authz-mfa"),
    flashcardIds: ["mfa", "sso", "byod"],
    examLevelQuestionIds: examIds("tech-auth-authz-mfa"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-cloud-models",
    topicId: "tech-cloud-models",
    quizQuestionIds: quizIds("tech-cloud-models"),
    flashcardIds: ["saas", "paas", "iaas"],
    examLevelQuestionIds: examIds("tech-cloud-models"),
    recommendedTiming: "after_learning",
    difficulty: 3,
  },
  {
    packId: "pack-tech-ai-ml",
    topicId: "tech-ai-ml",
    quizQuestionIds: quizIds("tech-ai-ml"),
    flashcardIds: ["ai", "ml", "dl"],
    examLevelQuestionIds: examIds("tech-ai-ml"),
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-tech-database-sql",
    topicId: "tech-database-sql",
    quizQuestionIds: quizIds("tech-database-sql"),
    flashcardIds: ["sql", "dbms", "rdbms"],
    examLevelQuestionIds: examIds("tech-database-sql"),
    recommendedTiming: "after_learning",
    difficulty: 3,
  },
  {
    packId: "pack-tech-malware",
    topicId: "tech-malware-phishing-ransomware",
    quizQuestionIds: quizIds("tech-malware-phishing-ransomware"),
    flashcardIds: ["csirt", "soc", "ids"],
    examLevelQuestionIds: examIds("tech-malware-phishing-ransomware"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-service-sla",
    topicId: "mgmt-service-sla",
    quizQuestionIds: quizIds("mgmt-service-sla"),
    flashcardIds: ["sla", "slo", "sli"],
    examLevelQuestionIds: examIds("mgmt-service-sla"),
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-strat-swot",
    topicId: "strat-swot",
    quizQuestionIds: quizIds("strat-swot"),
    flashcardIds: ["swot", "pest", "ppm"],
    examLevelQuestionIds: examIds("strat-swot"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-generative-ai-dx",
    topicId: "strat-generative-ai-dx",
    quizQuestionIds: quizIds("strat-generative-ai-dx"),
    flashcardIds: ["genai", "llm", "rag"],
    examLevelQuestionIds: examIds("strat-generative-ai-dx"),
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
];
