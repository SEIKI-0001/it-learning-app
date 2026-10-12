import { describe, expect, it } from "vitest";

import { topicCheckPacks } from "@/data/topicCheckPacks";
import {
  resolvePackExamAsCheckQuestions,
  resolvePackExamQuestions,
} from "@/lib/checkPack";
import { getQuestionById, getQuestionForDelivery } from "@/lib/questionBank/loader";

// ============================================================================
// 確認パック第3段階への IPA 公式過去問の組込み（2026-10-12）。
// ----------------------------------------------------------------------------
// ここが守っているもの:
//   - 置き換えで外した独自問題は削除せず、IDも流用しない（過去の回答履歴を解決できる）
//   - 公式問題は共通IDのまま参照し、1問を複数のパックに重ねない
//   - 公式問題はパックと同じトピックの問題だけ（保存時に topicId が問題バンク側の
//     primaryTopicId で上書きされるため、ずれると復習の導線が別トピックへ行く）
//   - 「公式で定義を確認 → 独自で深く確認」の順を崩さない
// ============================================================================

const isOfficialId = (id: string) => id.startsWith("ipa-it-passport-");

/** 公式問題に置き換えて、パックから外した独自問題。 */
const REPLACED_ORIGINAL_IDS = [
  "tech-security-cia-ex2",
  "tech-auth-authz-mfa-ex1",
  "tech-ai-ml-ex1",
  "tech-malware-phishing-ransomware-ex1",
  "mgmt-service-sla-ex3",
  "tech-normalization-ex2",
  "tech-common-key-crypto-ex2",
  "tech-reliability-availability-ex1",
  "tech-spreadsheet-ex2",
  "tech-transaction-ex2",
  "tech-isms-risk-ex2",
  "mgmt-wbs-gantt-ex1",
  "mgmt-system-audit-ex2",
  "mgmt-testing-ex1",
  "strat-accounting-break-even-ex1",
  "strat-legal-compliance-ex2",
  "strat-security-laws-ex1",
  "strat-business-process-ex1",
  "strat-goal-evaluation-ex1",
  "strat-labor-laws-ex2",
  "mgmt-facility-management-ex2",
  "mgmt-estimation-ex1",
  "tech-public-key-crypto-ex2",
  "tech-email-protocol-ex2",
  "mgmt-pm-qcd-ex1",
  "mgmt-itil-ex1",
  "strat-financial-statements-ex2",
  "strat-intellectual-property-ex1",
  "tech-keys-ex2",
  // 2026-10-12 後続: アルゴリズム単元に擬似言語の読み方を足してから置き換えた。
  "tech-algorithm-flowchart-ex2",
];

/** 独自問題の方が一段深いもの: 公式（定義の確認）→ 独自（深い確認）の順に並べる。 */
const DEFINITION_THEN_ORIGINAL: [official: string, original: string][] = [
  ["ipa-it-passport-2022-q064", "tech-firewall-vpn-zero-trust-ex3"],
  ["ipa-it-passport-2023-q100", "tech-database-sql-ex3"],
  ["ipa-it-passport-2024-q066", "tech-digital-signature-ex2"],
  ["ipa-it-passport-2024-q040", "mgmt-development-process-ex2"],
  ["ipa-it-passport-2022-q026", "strat-corporate-strategy-ex2"],
];

const allReferencedIds = topicCheckPacks.flatMap((p) => p.examLevelQuestionIds);

describe("置き換えで外した独自問題", () => {
  it("どのパックからも参照されない", () => {
    const referenced = new Set(allReferencedIds);
    for (const id of REPLACED_ORIGINAL_IDS) {
      expect(referenced.has(id), id).toBe(false);
    }
  });

  it("問題バンクには元の内容のまま残る（回答履歴の解決用）", () => {
    for (const id of REPLACED_ORIGINAL_IDS) {
      const record = getQuestionById(id);
      expect(record, id).toBeDefined();
      expect(record!.origin, id).toBe("app_original");
      expect(record!.status, id).not.toBe("retired");
    }
  });
});

describe("参照している公式過去問", () => {
  it("1問を複数のパックに重ねていない", () => {
    const officialIds = allReferencedIds.filter(isOfficialId);
    expect(new Set(officialIds).size).toBe(officialIds.length);
  });

  it("共通IDのまま、公開済みの公式レコードを指している", () => {
    for (const id of allReferencedIds.filter(isOfficialId)) {
      const record = getQuestionForDelivery(id, "check_pack");
      expect(record, id).toBeDefined();
      expect(record!.origin, id).toBe("official_past");
      expect(record!.status, id).toBe("published");
      // 年度別演習と同じレコード（別問題として二重登録していない）。
      expect(getQuestionForDelivery(id, "official_past_exam"), id).toBe(record);
    }
  });

  it("パックと同じトピックの問題だけを使っている", () => {
    for (const pack of topicCheckPacks) {
      for (const question of resolvePackExamQuestions(pack)) {
        expect(question.topicId, `${pack.packId} の ${question.id}`).toBe(pack.topicId);
      }
    }
  });

  it("公式の選択肢順と出典を保ったまま出題する", () => {
    for (const pack of topicCheckPacks) {
      for (const q of resolvePackExamAsCheckQuestions(pack).filter((q) => isOfficialId(q.id))) {
        expect(q.shuffleChoices, q.id).toBe(false);
        expect(q.official?.attribution, q.id).toMatch(/^出典：/);
      }
    }
  });

  it("推定難易度 4〜5 は出題側の範囲（1〜3）に丸める", () => {
    for (const pack of topicCheckPacks) {
      for (const q of resolvePackExamAsCheckQuestions(pack)) {
        expect([1, 2, 3], q.id).toContain(q.difficulty);
      }
      for (const q of resolvePackExamQuestions(pack)) {
        expect([1, 2, 3], q.id).toContain(q.difficulty);
      }
    }
  });
});

describe("公式で定義を確認してから、独自で深く確認する", () => {
  it("公式問題が独自問題の直前に並ぶ", () => {
    for (const [official, original] of DEFINITION_THEN_ORIGINAL) {
      const pack = topicCheckPacks.find((p) => p.examLevelQuestionIds.includes(original));
      expect(pack, original).toBeDefined();
      const ids = pack!.examLevelQuestionIds;
      expect(ids.indexOf(official), original).toBe(ids.indexOf(original) - 1);
    }
  });
});

/** 第1段階の確認問題と、第3段階の公式問題が同じ問いになっていた組（重なる論点は公式に任せる）。 */
const QUIZ_OVERLAPPING_OFFICIAL: [quiz: string, official: string][] = [
  ["tech-public-key-crypto-q2", "ipa-it-passport-2022-q060"],
  ["tech-public-key-crypto-q3", "ipa-it-passport-2022-q060"],
  ["tech-email-protocol-q3", "ipa-it-passport-2022-q087"],
  ["mgmt-pm-qcd-q3", "ipa-it-passport-2023-q045"],
  ["mgmt-itil-q2", "ipa-it-passport-2022-q044"],
];

describe("第1段階（基礎確認）と第3段階で同じ問いを重ねない", () => {
  it("公式問題を載せたパックの第1段階から、同じ問いの確認問題を外している", () => {
    for (const [quiz, official] of QUIZ_OVERLAPPING_OFFICIAL) {
      const pack = topicCheckPacks.find((p) => p.examLevelQuestionIds.includes(official));
      expect(pack, official).toBeDefined();
      expect(pack!.quizQuestionIds, pack!.packId).not.toContain(quiz);
      expect(pack!.quizQuestionIds, pack!.packId).toHaveLength(4);
    }
  });
});
