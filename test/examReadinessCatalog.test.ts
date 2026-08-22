import { describe, expect, it } from "vitest";
import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import {
  buildReadinessQuestionCatalog,
  buildReadinessTopicCatalog,
  resolveReadinessQuestionContext,
} from "@/lib/examReadiness/catalog";
import { getAllQuestions } from "@/lib/questionBank";

describe("readiness catalog", () => {
  it("maps every Topic to a configured field with importance 1 through 3", () => {
    const configuredFields = new Set<string>(
      EXAM_READINESS_CONFIG.fields.map((field) => field.fieldId),
    );
    const catalog = buildReadinessTopicCatalog();

    expect(catalog.length).toBeGreaterThan(0);
    for (const topic of catalog) {
      expect(configuredFields.has(topic.fieldId), topic.topicId).toBe(true);
      expect([1, 2, 3], topic.topicId).toContain(topic.importance);
      expect(topic.label.length, topic.topicId).toBeGreaterThan(0);
    }
  });

  it("keeps every question-bank ID as its canonical readiness ID", () => {
    const readinessById = new Map(
      buildReadinessQuestionCatalog().map((question) => [question.canonicalQuestionId, question]),
    );

    for (const question of getAllQuestions()) {
      expect(readinessById.get(question.id)?.canonicalQuestionId, question.id).toBe(question.id);
    }
  });

  it("keeps the primary Topic field while preferring the stored official exam field", () => {
    const context = resolveReadinessQuestionContext({
      questionId: "ipa-it-passport-2026-q016",
      topicId: "tech-ai-ml",
      officialExamFieldId: "strategy",
    });

    expect(context).toEqual({
      canonicalQuestionId: "ipa-it-passport-2026-q016",
      topicId: "tech-ai-ml",
      fieldId: "technology",
      officialExamFieldId: "strategy",
    });
  });
});
