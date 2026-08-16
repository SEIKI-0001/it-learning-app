import type {
  QuestionExposure,
  QuestionExposureMap,
  QuestionExposureState,
  UserAnswer,
} from "@/types";

function uniqueQuestionIds(questionIds: string[]): string[] {
  return [...new Set(questionIds.filter((questionId) => questionId.length > 0))];
}

/** Anonymous users have no server identity, so their existing AppState is the fallback history. */
export function getAnonymousQuestionExposureStates(
  previousAnswers: Pick<UserAnswer, "questionId" | "answeredAt">[],
  questionIds: string[],
): QuestionExposureMap {
  return Object.fromEntries(
    uniqueQuestionIds(questionIds).map((questionId): [string, QuestionExposure] => {
      const prior = previousAnswers
        .filter((answer) => answer.questionId === questionId)
        .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
      const attemptedBefore = prior.length > 0;
      return [questionId, {
        questionId,
        state: attemptedBefore ? "seen" : "first",
        attemptedBefore,
        firstAttemptAt: prior[0]?.answeredAt ?? null,
        attemptCount: prior.length,
      }];
    }),
  );
}

/** A logged-in classification failure is deliberately conservative and never earns a bonus. */
export function getUnknownQuestionExposureStates(
  questionIds: string[],
): QuestionExposureMap {
  return Object.fromEntries(
    uniqueQuestionIds(questionIds).map((questionId): [string, QuestionExposure] => [
      questionId,
      {
        questionId,
        state: "unknown",
        attemptedBefore: null,
        firstAttemptAt: null,
        attemptCount: null,
      },
    ]),
  );
}

export function exposureStateFor(
  exposures: QuestionExposureMap,
  questionId: string,
): QuestionExposureState {
  return exposures[questionId]?.state ?? "unknown";
}
