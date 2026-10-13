import type { TopicCheckPack } from "@/types/checkPack";
import { topicWordIds } from "@/data/topicWordLinks";

// ============================================================================
// 確認パック（TopicCheckPack）の定義。
// ----------------------------------------------------------------------------
// 方針:
//   - 確認問題（基礎理解）＋ 関連単語（用語定着）＋ 過去問レベル問題（本番対応力）
//     を1トピック単位で束ねる。
//   - MVP。重要度の高いトピックから用意する（全トピックには作らない）。
//   - quizQuestionIds は topicId-q1..q4（topicFactory の採番）を指す。
//     解決側でトピックの checkQuestions と突き合わせ、無ければ全問にフォールバックする。
//   - flashcardIds はトピック↔単語の対応表（data/topicWordLinks）から引く。対応の正はそちら。
//   - examLevelQuestionIds は統一問題バンク（lib/questionBank）の id。
//
// 第3段階への IPA 公式過去問の組込み（2026-10-12）:
//   - 公式問題は共通ID（ipa-it-passport-<年>-q<番号>）をそのまま参照する。複製して別IDで登録しない。
//   - 独自問題と論点・難易度が一致するものは、その位置で公式問題に置き換えた。
//   - 独自問題の方が一段深いものは置き換えず、公式問題（定義の確認）をその直前に置き、
//     独自問題でさらに深く確認する。
//   - 論点が違う公式問題しかないトピックは、公式問題を先頭に追加した（過去問は繰り返し解いて覚えるため）。
//   - 外した独自問題（topicId-exN）は問題バンクに残す。過去の回答履歴を解決できるようにするため。
// ============================================================================

function quizIds(topicId: string, n = 4): string[] {
  return Array.from({ length: n }, (_, i) => `${topicId}-q${i + 1}`);
}

/**
 * 出題する確認問題を番号で選ぶ（確認問題が5問以上あるトピック用）。
 * 先頭4問に用語の言い換えだけの易しい問題や、第3段階（過去問レベル）と同じ問いが
 * 含まれるトピックでは、計算・応用の問題を優先して選ぶ（2026-10-12 監査）。
 * 第3段階の公式過去問と同じ問いになる確認問題は外し、その論点は公式問題に任せる
 * （公開鍵暗号・メール・QCD・ITIL。外した分は易しい確認問題を足して4問に保つ）。
 */
function pickQuizIds(topicId: string, numbers: number[]): string[] {
  return numbers.map((n) => `${topicId}-q${n}`);
}

function examIds(topicId: string, n = 2): string[] {
  return Array.from({ length: n }, (_, i) => `${topicId}-ex${i + 1}`);
}

export const topicCheckPacks: TopicCheckPack[] = [
  {
    packId: "pack-tech-security-cia",
    topicId: "tech-security-cia",
    quizQuestionIds: quizIds("tech-security-cia"),
    flashcardIds: topicWordIds("tech-security-cia"),
    examLevelQuestionIds: [
      "tech-security-cia-ex1",
      "ipa-it-passport-2024-q075",
      "tech-security-cia-ex3",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-network-address",
    topicId: "tech-network-address",
    quizQuestionIds: quizIds("tech-network-address"),
    flashcardIds: topicWordIds("tech-network-address"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q097",
      "tech-network-address-ex1",
      "tech-network-address-ex2",
      "tech-network-address-ex3",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-http-https",
    topicId: "tech-http-https",
    quizQuestionIds: quizIds("tech-http-https"),
    flashcardIds: topicWordIds("tech-http-https"),
    examLevelQuestionIds: examIds("tech-http-https", 3),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-firewall-vpn-zero-trust",
    topicId: "tech-firewall-vpn-zero-trust",
    quizQuestionIds: quizIds("tech-firewall-vpn-zero-trust"),
    flashcardIds: topicWordIds("tech-firewall-vpn-zero-trust"),
    examLevelQuestionIds: [
      "tech-firewall-vpn-zero-trust-ex1",
      "tech-firewall-vpn-zero-trust-ex2",
      "ipa-it-passport-2022-q064",
      "tech-firewall-vpn-zero-trust-ex3",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-auth-authz-mfa",
    topicId: "tech-auth-authz-mfa",
    quizQuestionIds: quizIds("tech-auth-authz-mfa"),
    flashcardIds: topicWordIds("tech-auth-authz-mfa"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q082",
      "tech-auth-authz-mfa-ex2",
      "tech-auth-authz-mfa-ex3",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-cloud-models",
    topicId: "tech-cloud-models",
    quizQuestionIds: quizIds("tech-cloud-models"),
    flashcardIds: topicWordIds("tech-cloud-models"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q082",
      "tech-cloud-models-ex1",
      "tech-cloud-models-ex2",
      "tech-cloud-models-ex3",
    ],
    recommendedTiming: "after_learning",
    difficulty: 3,
  },
  {
    packId: "pack-tech-ai-ml",
    topicId: "tech-ai-ml",
    quizQuestionIds: quizIds("tech-ai-ml"),
    flashcardIds: topicWordIds("tech-ai-ml"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q024",
      "tech-ai-ml-ex2",
      "tech-ai-ml-ex3",
    ],
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-tech-database-sql",
    topicId: "tech-database-sql",
    quizQuestionIds: quizIds("tech-database-sql"),
    flashcardIds: topicWordIds("tech-database-sql"),
    examLevelQuestionIds: [
      "tech-database-sql-ex1",
      "tech-database-sql-ex2",
      "ipa-it-passport-2023-q100",
      "tech-database-sql-ex3",
    ],
    recommendedTiming: "after_learning",
    difficulty: 3,
  },
  {
    packId: "pack-tech-malware",
    topicId: "tech-malware-phishing-ransomware",
    quizQuestionIds: quizIds("tech-malware-phishing-ransomware"),
    flashcardIds: topicWordIds("tech-malware-phishing-ransomware"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q100",
      "tech-malware-phishing-ransomware-ex2",
      "tech-malware-phishing-ransomware-ex3",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-service-sla",
    topicId: "mgmt-service-sla",
    quizQuestionIds: quizIds("mgmt-service-sla"),
    flashcardIds: topicWordIds("mgmt-service-sla"),
    examLevelQuestionIds: [
      "mgmt-service-sla-ex1",
      "mgmt-service-sla-ex2",
      "ipa-it-passport-2024-q038",
    ],
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-strat-swot",
    topicId: "strat-swot",
    quizQuestionIds: quizIds("strat-swot"),
    flashcardIds: topicWordIds("strat-swot"),
    examLevelQuestionIds: examIds("strat-swot", 3),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-generative-ai-dx",
    topicId: "strat-generative-ai-dx",
    quizQuestionIds: quizIds("strat-generative-ai-dx"),
    flashcardIds: topicWordIds("strat-generative-ai-dx"),
    examLevelQuestionIds: [
      "ipa-it-passport-2025-q010",
      "strat-generative-ai-dx-ex1",
      "strat-generative-ai-dx-ex2",
      "strat-generative-ai-dx-ex3",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },

  // ---- 正式運用向け追加パック（過去問レベル2問以上の主要トピック） ----
  {
    packId: "pack-tech-binary-data",
    topicId: "tech-binary-data",
    quizQuestionIds: pickQuizIds("tech-binary-data", [1, 2, 3, 5]),
    flashcardIds: topicWordIds("tech-binary-data"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q096",
      "tech-binary-data-ex1",
      "tech-binary-data-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-computer-core",
    topicId: "tech-computer-core",
    quizQuestionIds: quizIds("tech-computer-core"),
    flashcardIds: topicWordIds("tech-computer-core"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q056",
      "tech-computer-core-ex1",
      "tech-computer-core-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-os-software-hardware",
    topicId: "tech-os-software-hardware",
    quizQuestionIds: pickQuizIds("tech-os-software-hardware", [1, 2, 4, 6]),
    flashcardIds: topicWordIds("tech-os-software-hardware"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q082",
      "tech-os-software-hardware-ex1",
      "tech-os-software-hardware-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-web-internet-basics",
    topicId: "tech-web-internet-basics",
    quizQuestionIds: quizIds("tech-web-internet-basics"),
    flashcardIds: topicWordIds("tech-web-internet-basics"),
    examLevelQuestionIds: [
      // DNS の 2025-q058 は復習先を tech-network-address へ付け直したので、
      // 教材で扱う TCP/IP の階層を問う問題に差し替え。
      "ipa-it-passport-2023-q068",
      "tech-web-internet-basics-ex1",
      "tech-web-internet-basics-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-keys",
    topicId: "tech-keys",
    quizQuestionIds: quizIds("tech-keys"),
    flashcardIds: topicWordIds("tech-keys"),
    examLevelQuestionIds: [
      "tech-keys-ex1",
      "ipa-it-passport-2026-q072",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-normalization",
    topicId: "tech-normalization",
    quizQuestionIds: quizIds("tech-normalization"),
    flashcardIds: topicWordIds("tech-normalization"),
    examLevelQuestionIds: [
      "tech-normalization-ex1",
      "ipa-it-passport-2024-q081",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-encryption-hash",
    topicId: "tech-encryption-hash",
    quizQuestionIds: quizIds("tech-encryption-hash"),
    flashcardIds: topicWordIds("tech-encryption-hash"),
    examLevelQuestionIds: [
      "ipa-it-passport-2026-q091",
      "tech-encryption-hash-ex1",
      "tech-encryption-hash-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-common-key-crypto",
    topicId: "tech-common-key-crypto",
    quizQuestionIds: quizIds("tech-common-key-crypto"),
    flashcardIds: topicWordIds("tech-common-key-crypto"),
    examLevelQuestionIds: [
      "tech-common-key-crypto-ex1",
      "ipa-it-passport-2024-q057",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-public-key-crypto",
    topicId: "tech-public-key-crypto",
    quizQuestionIds: pickQuizIds("tech-public-key-crypto", [1, 4, 5, 6]),
    flashcardIds: topicWordIds("tech-public-key-crypto"),
    examLevelQuestionIds: [
      "tech-public-key-crypto-ex1",
      "ipa-it-passport-2022-q060",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-algorithm-flowchart",
    topicId: "tech-algorithm-flowchart",
    quizQuestionIds: quizIds("tech-algorithm-flowchart"),
    flashcardIds: topicWordIds("tech-algorithm-flowchart"),
    examLevelQuestionIds: [
      "tech-algorithm-flowchart-ex1",
      "ipa-it-passport-2025-q078",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-reliability-availability",
    topicId: "tech-reliability-availability",
    quizQuestionIds: quizIds("tech-reliability-availability"),
    flashcardIds: topicWordIds("tech-reliability-availability"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q067",
      "tech-reliability-availability-ex2",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-tech-logic-operations",
    topicId: "tech-logic-operations",
    quizQuestionIds: quizIds("tech-logic-operations"),
    flashcardIds: topicWordIds("tech-logic-operations"),
    examLevelQuestionIds: examIds("tech-logic-operations"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-spreadsheet",
    topicId: "tech-spreadsheet",
    quizQuestionIds: pickQuizIds("tech-spreadsheet", [1, 2, 4, 5]),
    flashcardIds: topicWordIds("tech-spreadsheet"),
    examLevelQuestionIds: [
      "tech-spreadsheet-ex1",
      "ipa-it-passport-2025-q076",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-tech-data-structure",
    topicId: "tech-data-structure",
    quizQuestionIds: quizIds("tech-data-structure"),
    flashcardIds: topicWordIds("tech-data-structure"),
    examLevelQuestionIds: examIds("tech-data-structure"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-transaction",
    topicId: "tech-transaction",
    quizQuestionIds: quizIds("tech-transaction"),
    flashcardIds: topicWordIds("tech-transaction"),
    examLevelQuestionIds: [
      "tech-transaction-ex1",
      "ipa-it-passport-2022-q077",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-tech-cyber-attacks",
    topicId: "tech-cyber-attacks",
    quizQuestionIds: quizIds("tech-cyber-attacks"),
    flashcardIds: topicWordIds("tech-cyber-attacks"),
    examLevelQuestionIds: [
      "ipa-it-passport-2026-q095",
      "tech-cyber-attacks-ex1",
      "tech-cyber-attacks-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-digital-signature",
    topicId: "tech-digital-signature",
    quizQuestionIds: quizIds("tech-digital-signature"),
    flashcardIds: topicWordIds("tech-digital-signature"),
    examLevelQuestionIds: [
      "tech-digital-signature-ex1",
      "ipa-it-passport-2024-q066",
      "tech-digital-signature-ex2",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-tech-isms-risk",
    topicId: "tech-isms-risk",
    quizQuestionIds: quizIds("tech-isms-risk"),
    flashcardIds: topicWordIds("tech-isms-risk"),
    examLevelQuestionIds: [
      "tech-isms-risk-ex1",
      "ipa-it-passport-2024-q086",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-wireless-mobile",
    topicId: "tech-wireless-mobile",
    quizQuestionIds: quizIds("tech-wireless-mobile"),
    flashcardIds: topicWordIds("tech-wireless-mobile"),
    examLevelQuestionIds: [
      "ipa-it-passport-2026-q059",
      "tech-wireless-mobile-ex1",
      "tech-wireless-mobile-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-email-protocol",
    topicId: "tech-email-protocol",
    quizQuestionIds: pickQuizIds("tech-email-protocol", [1, 2, 4, 5]),
    flashcardIds: topicWordIds("tech-email-protocol"),
    examLevelQuestionIds: [
      "tech-email-protocol-ex1",
      "ipa-it-passport-2022-q087",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-pm-qcd",
    topicId: "mgmt-pm-qcd",
    quizQuestionIds: pickQuizIds("mgmt-pm-qcd", [1, 2, 4, 5]),
    flashcardIds: topicWordIds("mgmt-pm-qcd"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q045",
      "mgmt-pm-qcd-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-wbs-gantt",
    topicId: "mgmt-wbs-gantt",
    quizQuestionIds: pickQuizIds("mgmt-wbs-gantt", [2, 3, 4, 5]),
    flashcardIds: topicWordIds("mgmt-wbs-gantt"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q036",
      "mgmt-wbs-gantt-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-system-audit",
    topicId: "mgmt-system-audit",
    quizQuestionIds: quizIds("mgmt-system-audit"),
    flashcardIds: topicWordIds("mgmt-system-audit"),
    examLevelQuestionIds: [
      "mgmt-system-audit-ex1",
      "ipa-it-passport-2023-q050",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-mgmt-development-process",
    topicId: "mgmt-development-process",
    quizQuestionIds: quizIds("mgmt-development-process"),
    flashcardIds: topicWordIds("mgmt-development-process"),
    examLevelQuestionIds: [
      "mgmt-development-process-ex1",
      "ipa-it-passport-2024-q040",
      "mgmt-development-process-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-requirements-definition",
    topicId: "mgmt-requirements-definition",
    quizQuestionIds: quizIds("mgmt-requirements-definition"),
    flashcardIds: topicWordIds("mgmt-requirements-definition"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q033",
      "mgmt-requirements-definition-ex1",
      "mgmt-requirements-definition-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-testing",
    topicId: "mgmt-testing",
    quizQuestionIds: quizIds("mgmt-testing"),
    flashcardIds: topicWordIds("mgmt-testing"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q042",
      "mgmt-testing-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-mgmt-pdca",
    topicId: "mgmt-pdca",
    quizQuestionIds: quizIds("mgmt-pdca"),
    flashcardIds: topicWordIds("mgmt-pdca"),
    examLevelQuestionIds: examIds("mgmt-pdca"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-risk-management",
    topicId: "mgmt-risk-management",
    quizQuestionIds: quizIds("mgmt-risk-management"),
    flashcardIds: topicWordIds("mgmt-risk-management"),
    examLevelQuestionIds: examIds("mgmt-risk-management"),
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-mgmt-itil",
    topicId: "mgmt-itil",
    quizQuestionIds: pickQuizIds("mgmt-itil", [1, 3, 4, 5]),
    flashcardIds: topicWordIds("mgmt-itil"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q044",
      "mgmt-itil-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-strat-3c",
    topicId: "strat-3c",
    quizQuestionIds: quizIds("strat-3c"),
    flashcardIds: topicWordIds("strat-3c"),
    examLevelQuestionIds: examIds("strat-3c"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-marketing-4p",
    topicId: "strat-marketing-4p",
    quizQuestionIds: quizIds("strat-marketing-4p"),
    flashcardIds: topicWordIds("strat-marketing-4p"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q002",
      "strat-marketing-4p-ex1",
      "strat-marketing-4p-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-accounting-break-even",
    topicId: "strat-accounting-break-even",
    quizQuestionIds: pickQuizIds("strat-accounting-break-even", [2, 3, 4, 5]),
    flashcardIds: topicWordIds("strat-accounting-break-even"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q013",
      "strat-accounting-break-even-ex2",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-strat-legal-compliance",
    topicId: "strat-legal-compliance",
    quizQuestionIds: quizIds("strat-legal-compliance"),
    flashcardIds: topicWordIds("strat-legal-compliance"),
    examLevelQuestionIds: [
      "strat-legal-compliance-ex1",
      "ipa-it-passport-2022-q005",
    ],
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-strat-intellectual-property",
    topicId: "strat-intellectual-property",
    quizQuestionIds: quizIds("strat-intellectual-property"),
    flashcardIds: topicWordIds("strat-intellectual-property"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q001",
      "strat-intellectual-property-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-strat-privacy-law",
    topicId: "strat-privacy-law",
    quizQuestionIds: quizIds("strat-privacy-law"),
    flashcardIds: topicWordIds("strat-privacy-law"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q027",
      "strat-privacy-law-ex1",
      "strat-privacy-law-ex2",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-strat-security-laws",
    topicId: "strat-security-laws",
    quizQuestionIds: quizIds("strat-security-laws"),
    flashcardIds: topicWordIds("strat-security-laws"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q009",
      "strat-security-laws-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-strat-system-strategy",
    topicId: "strat-system-strategy",
    quizQuestionIds: pickQuizIds("strat-system-strategy", [2, 3, 4, 5]),
    flashcardIds: topicWordIds("strat-system-strategy"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q007",
      "strat-system-strategy-ex1",
      "strat-system-strategy-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-business-process",
    topicId: "strat-business-process",
    quizQuestionIds: pickQuizIds("strat-business-process", [2, 3, 4, 5]),
    flashcardIds: topicWordIds("strat-business-process"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q007",
      "strat-business-process-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-ppm",
    topicId: "strat-ppm",
    quizQuestionIds: quizIds("strat-ppm"),
    flashcardIds: topicWordIds("strat-ppm"),
    examLevelQuestionIds: examIds("strat-ppm"),
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-strat-value-chain",
    topicId: "strat-value-chain",
    quizQuestionIds: quizIds("strat-value-chain"),
    flashcardIds: topicWordIds("strat-value-chain"),
    examLevelQuestionIds: examIds("strat-value-chain"),
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-strat-management-systems",
    topicId: "strat-management-systems",
    quizQuestionIds: quizIds("strat-management-systems"),
    flashcardIds: topicWordIds("strat-management-systems"),
    examLevelQuestionIds: [
      "ipa-it-passport-2026-q033",
      "strat-management-systems-ex1",
      "strat-management-systems-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-goal-evaluation",
    topicId: "strat-goal-evaluation",
    quizQuestionIds: quizIds("strat-goal-evaluation"),
    flashcardIds: topicWordIds("strat-goal-evaluation"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q008",
      "strat-goal-evaluation-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-financial-statements",
    topicId: "strat-financial-statements",
    quizQuestionIds: pickQuizIds("strat-financial-statements", [1, 2, 4, 6]),
    flashcardIds: topicWordIds("strat-financial-statements"),
    examLevelQuestionIds: [
      "strat-financial-statements-ex1",
      "ipa-it-passport-2024-q008",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-strat-corporate-strategy",
    topicId: "strat-corporate-strategy",
    quizQuestionIds: quizIds("strat-corporate-strategy"),
    flashcardIds: topicWordIds("strat-corporate-strategy"),
    examLevelQuestionIds: [
      "strat-corporate-strategy-ex1",
      "ipa-it-passport-2022-q026",
      "strat-corporate-strategy-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 2,
  },
  {
    packId: "pack-strat-ebusiness",
    topicId: "strat-ebusiness",
    quizQuestionIds: quizIds("strat-ebusiness"),
    flashcardIds: topicWordIds("strat-ebusiness"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q004",
      "strat-ebusiness-ex1",
      "strat-ebusiness-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-labor-laws",
    topicId: "strat-labor-laws",
    quizQuestionIds: quizIds("strat-labor-laws"),
    flashcardIds: topicWordIds("strat-labor-laws"),
    examLevelQuestionIds: [
      "strat-labor-laws-ex1",
      "ipa-it-passport-2025-q001",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-strat-bcp",
    topicId: "strat-bcp",
    quizQuestionIds: quizIds("strat-bcp"),
    flashcardIds: topicWordIds("strat-bcp"),
    examLevelQuestionIds: examIds("strat-bcp"),
    recommendedTiming: "review_day",
    difficulty: 3,
  },

  // ---- 中頻度・実務判断系の追加パック -------------------------------------
  {
    packId: "pack-tech-lan-wan",
    topicId: "tech-lan-wan",
    quizQuestionIds: pickQuizIds("tech-lan-wan", [2, 3, 5, 6]),
    flashcardIds: topicWordIds("tech-lan-wan"),
    examLevelQuestionIds: examIds("tech-lan-wan"),
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-iot",
    topicId: "tech-iot",
    quizQuestionIds: quizIds("tech-iot"),
    flashcardIds: topicWordIds("tech-iot"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q097",
      "tech-iot-ex1",
      "tech-iot-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-programming-basics",
    topicId: "tech-programming-basics",
    quizQuestionIds: pickQuizIds("tech-programming-basics", [2, 3, 4, 5]),
    flashcardIds: topicWordIds("tech-programming-basics"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q088",
      "tech-programming-basics-ex1",
      "tech-programming-basics-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-tech-data-utilization",
    topicId: "tech-data-utilization",
    quizQuestionIds: pickQuizIds("tech-data-utilization", [2, 4, 5, 6]),
    flashcardIds: topicWordIds("tech-data-utilization"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q059",
      "tech-data-utilization-ex1",
      "tech-data-utilization-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-api",
    topicId: "tech-api",
    quizQuestionIds: quizIds("tech-api"),
    flashcardIds: topicWordIds("tech-api"),
    examLevelQuestionIds: [
      "ipa-it-passport-2022-q061",
      "tech-api-ex1",
      "tech-api-ex2",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-mgmt-facility-management",
    topicId: "mgmt-facility-management",
    quizQuestionIds: quizIds("mgmt-facility-management"),
    flashcardIds: topicWordIds("mgmt-facility-management"),
    examLevelQuestionIds: [
      "mgmt-facility-management-ex1",
      "ipa-it-passport-2022-q046",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },
  {
    packId: "pack-mgmt-estimation",
    topicId: "mgmt-estimation",
    quizQuestionIds: pickQuizIds("mgmt-estimation", [1, 2, 4, 5]),
    flashcardIds: topicWordIds("mgmt-estimation"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q055",
      "mgmt-estimation-ex2",
    ],
    recommendedTiming: "exam_prep",
    difficulty: 3,
  },
  {
    packId: "pack-strat-standardization",
    topicId: "strat-standardization",
    quizQuestionIds: quizIds("strat-standardization"),
    flashcardIds: topicWordIds("strat-standardization"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q010",
      "strat-standardization-ex1",
      "strat-standardization-ex2",
    ],
    recommendedTiming: "review_day",
    difficulty: 3,
  },

  // ---- 2026-10-14 競合参考書との差分で足したトピック ----
  // 過去問レベルは、新トピックへ付け直した公式過去問と、テーマ別試験の独自問題で組む
  // （このトピック向けの独自 exN は無い）。確認問題は第3段階と同じ論点を外して選ぶ。
  {
    packId: "pack-strat-innovation-management",
    topicId: "strat-innovation-management",
    // q4（キャズム）は第3段階の 2026-q015 と同じ論点なので外す。q1（MOTの定義）は用語で確認する
    quizQuestionIds: pickQuizIds("strat-innovation-management", [2, 3, 5, 6]),
    flashcardIds: topicWordIds("strat-innovation-management"),
    // このトピックの公式過去問は5年分でキャズムの1問だけ。
    examLevelQuestionIds: ["ipa-it-passport-2026-q015"],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-new-business-development",
    topicId: "strat-new-business-development",
    // リーンスタートアップ・PoC・ハッカソン（q1・q3・q4）は第3段階の公式過去問に任せる
    quizQuestionIds: pickQuizIds("strat-new-business-development", [2, 5, 6, 7]),
    flashcardIds: topicWordIds("strat-new-business-development"),
    examLevelQuestionIds: [
      "ipa-it-passport-2023-q001",
      "ipa-it-passport-2022-q035",
      "ipa-it-passport-2025-q009",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-production-methods",
    topicId: "strat-production-methods",
    // JIT（q1）とムダ（q6）は第3段階の公式過去問に任せる。
    // 2023-q026 はかんばん方式と連携させるシステムを問う応用で、q2（かんばんの定義）とは論点が違う
    quizQuestionIds: pickQuizIds("strat-production-methods", [2, 3, 4, 5]),
    flashcardIds: topicWordIds("strat-production-methods"),
    examLevelQuestionIds: [
      "ipa-it-passport-2024-q015",
      "ipa-it-passport-2023-q026",
      "ipa-it-passport-2026-q031",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-strat-internet-business",
    topicId: "strat-internet-business",
    // レコメンデーション（q6）は第3段階の theme-exam-business-industry-10 に任せる
    quizQuestionIds: pickQuizIds("strat-internet-business", [1, 2, 3, 5]),
    flashcardIds: topicWordIds("strat-internet-business"),
    examLevelQuestionIds: [
      "ipa-it-passport-2026-q023",
      "theme-exam-business-industry-10",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
  {
    packId: "pack-tech-data-structure-list-tree",
    topicId: "tech-data-structure-list-tree",
    // 公式過去問は無い（2022-q090 の木構造はファイルシステムの問題として tech-file-system に置く）。
    // 配列とリストの比較（q1・q2・q6）と2分木（q5）は第3段階のテーマ別試験の問題に任せる
    quizQuestionIds: pickQuizIds("tech-data-structure-list-tree", [3, 4, 7, 8]),
    flashcardIds: topicWordIds("tech-data-structure-list-tree"),
    examLevelQuestionIds: [
      "theme-exam-algorithm-programming-02",
      "theme-exam-algorithm-programming-05",
    ],
    recommendedTiming: "after_learning",
    difficulty: 2,
  },
];
