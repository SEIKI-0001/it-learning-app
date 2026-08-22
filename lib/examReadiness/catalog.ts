import { topics } from "@/data/topics";
import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import { getAllQuestions } from "@/lib/questionBank";
import type { ReadinessTopic } from "@/types/examReadiness";

const CONFIGURED_FIELD_IDS = new Set<string>(
  EXAM_READINESS_CONFIG.fields.map((field) => field.fieldId),
);

export type ReadinessQuestionCatalogEntry = {
  canonicalQuestionId: string;
  topicId: string;
  fieldId: string;
};

export type ReadinessQuestionContext = ReadinessQuestionCatalogEntry & {
  officialExamFieldId?: string;
};

export class ExamReadinessCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExamReadinessCatalogError";
  }
}

export function buildReadinessTopicCatalog(): ReadinessTopic[] {
  return topics.map((topic) => ({
    topicId: topic.id,
    fieldId: topic.field,
    label: topic.title,
    importance: topic.importance,
  }));
}

export function buildReadinessQuestionCatalog(): ReadinessQuestionCatalogEntry[] {
  const topicById = new Map(buildReadinessTopicCatalog().map((topic) => [topic.topicId, topic]));
  const questionById = new Map<string, ReadinessQuestionCatalogEntry>();

  for (const topic of topics) {
    for (const question of topic.checkQuestions) {
      questionById.set(question.id, {
        canonicalQuestionId: question.id,
        topicId: topic.id,
        fieldId: topic.field,
      });
    }
  }
  for (const question of getAllQuestions()) {
    const topic = topicById.get(question.primaryTopicId);
    if (topic === undefined) {
      throw new ExamReadinessCatalogError(
        `Question ${question.id} has an unknown primary Topic: ${question.primaryTopicId}`,
      );
    }
    questionById.set(question.id, {
      canonicalQuestionId: question.id,
      topicId: topic.topicId,
      fieldId: topic.fieldId,
    });
  }

  return [...questionById.values()];
}

const TOPIC_BY_ID = new Map(buildReadinessTopicCatalog().map((topic) => [topic.topicId, topic]));
const QUESTION_BY_ID = new Map(
  buildReadinessQuestionCatalog().map((question) => [question.canonicalQuestionId, question]),
);

/**
 * Resolves the canonical question and its primary Topic classification.
 * Official exam classification is an independent stored fact and never replaces the Topic field.
 */
export function resolveReadinessQuestionContext(input: {
  questionId: string;
  topicId?: string | null;
  officialExamFieldId?: string | null;
}): ReadinessQuestionContext {
  const knownQuestion = QUESTION_BY_ID.get(input.questionId);
  const topicId = knownQuestion?.topicId ?? input.topicId;
  const topic = topicId === undefined || topicId === null ? undefined : TOPIC_BY_ID.get(topicId);
  if (topic === undefined) {
    throw new ExamReadinessCatalogError(
      `Question ${input.questionId} has an unknown readiness Topic: ${String(topicId)}`,
    );
  }
  if (
    input.officialExamFieldId !== undefined
    && input.officialExamFieldId !== null
    && !CONFIGURED_FIELD_IDS.has(input.officialExamFieldId)
  ) {
    throw new ExamReadinessCatalogError(
      `Question ${input.questionId} has an unknown official exam field: ${input.officialExamFieldId}`,
    );
  }

  return {
    canonicalQuestionId: input.questionId,
    topicId: topic.topicId,
    fieldId: topic.fieldId,
    ...(input.officialExamFieldId === undefined || input.officialExamFieldId === null
      ? {}
      : { officialExamFieldId: input.officialExamFieldId }),
  };
}
