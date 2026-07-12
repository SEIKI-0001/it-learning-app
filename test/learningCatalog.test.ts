import { describe, expect, it } from "vitest";
import { getAllThemes, getOrderedLessonIds, validateLearningCatalog } from "@/lib/learningCatalog";
import { getAllTopics } from "@/lib/content";

describe("learning catalog", () => {
  it("18テーマで全Topicを一意に登録する", () => {
    expect(getAllThemes()).toHaveLength(18);
    expect(getOrderedLessonIds()).toHaveLength(getAllTopics().length);
    expect(new Set(getOrderedLessonIds()).size).toBe(getAllTopics().length);
    expect(validateLearningCatalog()).toEqual([]);
  });
});
