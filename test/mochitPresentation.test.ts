import { describe, expect, it } from "vitest";
import { getMochitProgressPresentation, getMochitResultPresentation } from "@/lib/mochitPresentation";
import { badgeEarnedCelebrations } from "@/lib/celebration";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

describe("Mochit presentations", () => {
  it("prioritizes checkpoint celebration over a perfect score", () => {
    expect(getMochitResultPresentation({ checkpointCleared: true, correct: 3, total: 3 })).toMatchObject({ state: "cheering", animation: "celebrate" });
  });
  it("uses happy for a perfect score and thinking for an incorrect answer", () => {
    expect(getMochitResultPresentation({ checkpointCleared: false, correct: 3, total: 3 }).state).toBe("happy");
    expect(getMochitResultPresentation({ checkpointCleared: false, correct: 2, total: 3 }).state).toBe("thinking");
  });
  it("prioritizes a plan adjustment over every progress condition", () => {
    expect(getMochitProgressPresentation({ readiness: makeExamReadinessResult({ score: 88, band: "stable" }), currentCheckpointId: "cp6", reviewCount: 9, planAdjustmentProposal: true, lastPlayedAt: undefined }).state).toBe("thinking");
  });
  it("covers review and the shared score, band, and saved primary improvement", () => {
    expect(getMochitProgressPresentation({ readiness: makeExamReadinessResult(), currentCheckpointId: "cp1", reviewCount: 5, planAdjustmentProposal: false, lastPlayedAt: undefined }).message).toContain("復習が5件");

    const ready = getMochitProgressPresentation({
      readiness: makeExamReadinessResult({
        score: 85,
        band: "ready",
        primaryImprovement: { code: "improve_field", fieldId: "technology" },
      }),
      currentCheckpointId: "cp5",
      reviewCount: 0,
      planAdjustmentProposal: false,
      lastPlayedAt: undefined,
    });
    expect(ready.state).toBe("happy");
    expect(ready.message).toContain("85/100");
    expect(ready.message).toContain("準備良好");
    expect(ready.message).toContain("「テクノロジ」の問題を優先しましょう");
    expect(ready.message).not.toMatch(/合格率|合格確率|%/);

    const measuring = getMochitProgressPresentation({
      readiness: makeExamReadinessResult({
        score: null,
        band: "measuring",
        primaryImprovement: { code: "collect_more_evidence" },
      }),
      currentCheckpointId: "cp1",
      reviewCount: 0,
      planAdjustmentProposal: false,
      lastPlayedAt: undefined,
    });
    expect(measuring.message).toContain("測定中");
    expect(measuring.message).toContain("判定材料を増やしましょう");
  });
  it("emits a badge celebration once per badge id", () => {
    expect(badgeEarnedCelebrations(["b-cp1-touch-tech", "b-cp1-touch-tech"])).toHaveLength(1);
  });
});
