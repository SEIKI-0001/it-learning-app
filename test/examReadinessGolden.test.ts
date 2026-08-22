import { describe, expect, it } from "vitest";

import { calculateExamReadinessDraft } from "@/lib/examReadiness/calculator";
import {
  REFERENCE_TIME,
  V1_GOLDEN_CASES,
} from "@/test/fixtures/examReadiness/v1-cases";

describe("Exam Readiness V1 golden cases", () => {
  it.each(V1_GOLDEN_CASES)("matches $name", ({ evidence, expected }) => {
    const result = calculateExamReadinessDraft({
      evidence,
      calculationReferenceTime: REFERENCE_TIME,
    });

    expect(result).toMatchObject(expected);
    if (result.validUntil !== null) {
      expect(new Date(result.validUntil).getTime()).toBeGreaterThan(REFERENCE_TIME.getTime());
    }
  });

  it("changes only time-derived facts when crossing the fixture boundary", () => {
    const fixture = V1_GOLDEN_CASES.find(({ name }) => name === "time-boundary-only change")!;
    const boundary = "2026-08-23T00:00:00.000Z";
    const before = calculateExamReadinessDraft({
      evidence: fixture.evidence,
      calculationReferenceTime: REFERENCE_TIME,
    });
    const after = calculateExamReadinessDraft({
      evidence: fixture.evidence,
      calculationReferenceTime: new Date(boundary),
    });

    expect(before.validUntil).toBe(boundary);
    expect(after.calculationReferenceTime).toBe(boundary);
    expect(after.validUntil).not.toBe(before.validUntil);
    expect(after.components.firstPerformance).toBe(before.components.firstPerformance);
    expect(after.components.assessmentCoverage).toBeLessThan(before.components.assessmentCoverage);
  });
});
