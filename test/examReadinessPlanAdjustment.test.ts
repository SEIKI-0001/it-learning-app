import { describe, expect, it } from "vitest";
import { buildPlanAdjustmentProposal } from "@/lib/planAdjustment";
import { OPTION_ID } from "@/types/planAdjustment";
import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

function scheduleHealth(
  overrides: Partial<IntegratedLearningStatus> = {},
): IntegratedLearningStatus {
  return {
    statusDate: "2026-08-22",
    overallStatus: "on_track",
    readinessScore: 99,
    inputProgressRate: 90,
    basicUnderstandingRate: 90,
    flashcardMasteryRate: 90,
    examReadyRate: 90,
    fieldBalanceScore: 90,
    weakTopicCount: 1,
    examReadyTopicCount: 70,
    basicUnderstoodTopicCount: 80,
    reviewNeededTopicCount: 0,
    weakTopics: [
      { topicId: "legacy-topic", title: "旧統合ステータスの弱点", stage: "weak" },
    ],
    mainRisks: [],
    recommendedFocus: { textbook: 25, review: 40, examPractice: 35 },
    generatedMessage: "",
    ...overrides,
  };
}

describe("Exam Readiness plan adjustment", () => {
  it("uses shared score, fields, Weak Topics, and saved primary improvement", () => {
    const readiness = makeExamReadinessResult({
      score: 52,
      band: "needs_work",
      fields: [
        {
          fieldId: "technology",
          label: "テクノロジ",
          score: 38,
          evidenceSufficiency: 80,
          scoreGate: {
            evaluated: true,
            cap: 59,
            reasonCode: "field_score_below_40",
          },
        },
      ],
      weakTopics: [
        {
          topicId: "shared-topic",
          label: "共有ネットワーク",
          importance: 3,
          reason: "repeated_incorrect",
          penalty: 1.25,
          penaltyApplied: true,
        },
      ],
      primaryImprovement: { code: "improve_field", fieldId: "technology" },
    });

    const proposal = buildPlanAdjustmentProposal({
      statusDate: "2026-08-22",
      status: scheduleHealth(),
      daysUntilExam: 30,
    }, readiness);

    expect(proposal).not.toBeNull();
    expect(proposal?.triggerType).toBe("low_exam_ready");
    expect(proposal?.reasonSummary).toContain("テクノロジは38/100");
    expect(proposal?.reasonSummary).toContain("「テクノロジ」の問題を優先しましょう");
    const weakOption = proposal?.options.find((option) => option.optionId === OPTION_ID.weakFocus);
    expect(weakOption?.actions.join(" ")).toContain("共有ネットワーク");
    expect(JSON.stringify(proposal)).not.toContain("旧統合ステータスの弱点");
  });

  it("honors a saved Weak Topic improvement even when another reason looks larger", () => {
    const readiness = makeExamReadinessResult({
      score: 68,
      band: "approaching",
      confidence: {
        score: 61,
        level: "medium",
        reasons: [
          { code: "insufficient_evidence", actual: 1, required: 100 },
        ],
      },
      fields: [
        {
          fieldId: "management",
          label: "再順位付けなら選ばれる分野",
          score: 20,
          evidenceSufficiency: 80,
          scoreGate: {
            evaluated: true,
            cap: 59,
            reasonCode: "field_score_below_40",
          },
        },
      ],
      weakTopics: [
        {
          topicId: "saved-topic",
          label: "保存済み優先トピック",
          importance: 1,
          reason: "low_mastery",
          penalty: 0.33,
          penaltyApplied: false,
        },
      ],
      primaryImprovement: { code: "review_weak_topic", topicId: "saved-topic" },
    });

    const proposal = buildPlanAdjustmentProposal({
      statusDate: "2026-08-22",
      status: scheduleHealth(),
      daysUntilExam: 30,
    }, readiness);

    expect(proposal?.triggerType).toBe("weak_topics");
    expect(proposal?.reasonSummary).toContain("「保存済み優先トピック」を復習しましょう");
    expect(proposal?.reasonSummary).not.toContain("判定材料を増やしましょう");
    expect(proposal?.reasonSummary).not.toContain("再順位付けなら選ばれる分野");
  });

  it("retains schedule health as an independent proposal signal", () => {
    const readiness = makeExamReadinessResult({
      score: 88,
      band: "stable",
      confidence: { score: 86, level: "high", reasons: [] },
      weakTopics: [],
      primaryImprovement: null,
    });

    const proposal = buildPlanAdjustmentProposal({
      statusDate: "2026-08-22",
      status: scheduleHealth({
        overallStatus: "delayed",
        mainRisks: [{ type: "daily_progress_low", label: "ペース低下" }],
      }),
      daysUntilExam: 30,
    }, readiness);

    expect(proposal?.triggerType).toBe("delay");
    expect(proposal?.reasonSummary).toContain("ここ最近は少しペースが落ちています");
  });

  it("does not emit pass-probability wording or percentage-form readiness", () => {
    const proposal = buildPlanAdjustmentProposal({
      statusDate: "2026-08-22",
      status: scheduleHealth({ overallStatus: "delayed" }),
      daysUntilExam: 30,
    }, makeExamReadinessResult({ score: 50, band: "needs_work" }));

    expect(JSON.stringify(proposal)).not.toMatch(/合格率|合格確率|合格可能性|%/);
  });
});
