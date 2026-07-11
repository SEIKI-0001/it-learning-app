import { describe, expect, it } from "vitest";
import { getWrittenQuestionsForTopic } from "@/data/writtenQuestions";

describe("written question topic mapping", () => {
  it("returns a related prompt for supported topics", () => {
    expect(getWrittenQuestionsForTopic("tech-auth-authz-mfa").map((q) => q.id)).toEqual([
      "sec-01",
    ]);
    expect(getWrittenQuestionsForTopic("strat-swot").map((q) => q.id)).toEqual([
      "str-01",
    ]);
  });

  it("returns no prompt when a topic has no mapped question", () => {
    expect(getWrittenQuestionsForTopic("tech-binary-data")).toEqual([]);
  });
});
