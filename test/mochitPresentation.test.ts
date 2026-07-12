import { describe, expect, it } from "vitest";
import { getMochitProgressPresentation, getMochitResultPresentation } from "@/lib/mochitPresentation";
import { badgeEarnedCelebrations } from "@/lib/celebration";

describe("Mochit presentations", () => {
  it("prioritizes checkpoint celebration over a perfect score", () => {
    expect(getMochitResultPresentation({ checkpointCleared: true, correct: 3, total: 3 })).toMatchObject({ state: "cheering", animation: "celebrate" });
  });
  it("uses happy for a perfect score and thinking for an incorrect answer", () => {
    expect(getMochitResultPresentation({ checkpointCleared: false, correct: 3, total: 3 }).state).toBe("happy");
    expect(getMochitResultPresentation({ checkpointCleared: false, correct: 2, total: 3 }).state).toBe("thinking");
  });
  it("prioritizes a plan adjustment over every progress condition", () => {
    expect(getMochitProgressPresentation({ readinessScore: 100, currentCheckpointId: "cp6", reviewCount: 9, planAdjustmentProposal: true, lastPlayedAt: undefined }).state).toBe("thinking");
  });
  it("covers review, readiness, and initial progress messages", () => {
    expect(getMochitProgressPresentation({ readinessScore: 30, currentCheckpointId: "cp1", reviewCount: 5, planAdjustmentProposal: false, lastPlayedAt: undefined }).message).toContain("復習が5件");
    expect(getMochitProgressPresentation({ readinessScore: 85, currentCheckpointId: "cp5", reviewCount: 0, planAdjustmentProposal: false, lastPlayedAt: undefined }).state).toBe("happy");
    expect(getMochitProgressPresentation({ readinessScore: 0, currentCheckpointId: "cp1", reviewCount: 0, planAdjustmentProposal: false, lastPlayedAt: undefined }).message).toContain("ここから");
  });
  it("emits a badge celebration once per badge id", () => {
    expect(badgeEarnedCelebrations(["b-cp1-touch-tech", "b-cp1-touch-tech"])).toHaveLength(1);
  });
});
