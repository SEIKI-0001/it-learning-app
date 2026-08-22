import { describe, expect, it } from "vitest";

import {
  EXAM_READINESS_CONFIG,
  EXAM_READINESS_MODEL_VERSION,
  EXAM_SCHEME_VERSION,
} from "@/lib/examReadiness/config";

describe("V1 exam readiness configuration", () => {
  it("uses the approved versions, fields, weights, and shortage thresholds", () => {
    expect(EXAM_READINESS_MODEL_VERSION).toBe("exam-readiness-rule-v1");
    expect(EXAM_SCHEME_VERSION).toBe("ip-3field-2026");
    expect(EXAM_READINESS_CONFIG.fields).toEqual([
      { fieldId: "strategy", label: "ストラテジ", scoredQuestionRatio: 32 / 92 },
      { fieldId: "management", label: "マネジメント", scoredQuestionRatio: 18 / 92 },
      { fieldId: "technology", label: "テクノロジ", scoredQuestionRatio: 42 / 92 },
    ]);
    expect(EXAM_READINESS_CONFIG.componentWeights).toEqual({
      firstPerformance: 30,
      summativePerformance: 25,
      topicMastery: 25,
      retention: 10,
      assessmentCoverage: 10,
    });
    expect(EXAM_READINESS_CONFIG.shortageThresholds).toEqual({
      weightedEvidenceUnits: 100,
      assessmentCoverage: 60,
      fieldEvidenceSufficiency: 60,
      summativeSessionCount: 3,
    });
  });
});
