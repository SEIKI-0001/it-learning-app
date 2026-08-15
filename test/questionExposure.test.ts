import { describe, expect, it } from "vitest";
import {
  exposureStateFor,
  getAnonymousQuestionExposureStates,
  getUnknownQuestionExposureStates,
} from "@/lib/questionExposure";

describe("question exposure domain", () => {
  it("classifies an unanswered anonymous question as first", () => {
    const exposures = getAnonymousQuestionExposureStates([], ["question-a"]);

    expect(exposures["question-a"]).toEqual({
      questionId: "question-a",
      state: "first",
      attemptedBefore: false,
      firstAttemptAt: null,
      attemptCount: 0,
    });
  });

  it.each([true, false])(
    "classifies a prior anonymous answer as seen regardless of correctness (%s)",
    (isCorrect) => {
      const exposures = getAnonymousQuestionExposureStates(
        [{
          questionId: "question-a",
          answeredAt: "2026-08-14T01:02:03.000Z",
          isCorrect,
        }],
        ["question-a"],
      );

      expect(exposures["question-a"]).toEqual({
        questionId: "question-a",
        state: "seen",
        attemptedBefore: true,
        firstAttemptAt: "2026-08-14T01:02:03.000Z",
        attemptCount: 1,
      });
    },
  );

  it("deduplicates requested canonical IDs", () => {
    const exposures = getAnonymousQuestionExposureStates(
      [],
      ["question-a", "question-a", "question-b"],
    );

    expect(Object.keys(exposures)).toEqual(["question-a", "question-b"]);
  });

  it("uses unknown for an authoritative result that is missing", () => {
    const exposures = getUnknownQuestionExposureStates(["question-a"]);

    expect(exposureStateFor(exposures, "question-a")).toBe("unknown");
    expect(exposureStateFor(exposures, "missing-question")).toBe("unknown");
    expect(exposures["question-a"]).toEqual({
      questionId: "question-a",
      state: "unknown",
      attemptedBefore: null,
      firstAttemptAt: null,
      attemptCount: null,
    });
  });
});
