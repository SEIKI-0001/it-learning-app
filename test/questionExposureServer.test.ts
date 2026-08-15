import { describe, expect, it, vi } from "vitest";
import {
  QuestionExposurePersistenceError,
  recordQuestionAttemptsWithExposure,
} from "@/lib/questionExposureServer";
import type { QuestionAttemptInput } from "@/lib/dbMappers";

function attempt(questionId: string): QuestionAttemptInput {
  return {
    questionId,
    questionType: "mock_exam",
    topicId: "tech-security-cia",
    selectedAnswer: "A",
    isCorrect: true,
    answeredAt: "2026-08-15T04:00:00.000Z",
    questionOrigin: "app_original",
    questionVersion: 3,
  };
}

describe("recordQuestionAttemptsWithExposure", () => {
  it("records 100 questions with one RPC and maps the authoritative rows", async () => {
    const inputs = Array.from({ length: 100 }, (_, index) => attempt(`question-${index}`));
    const rpc = vi.fn().mockResolvedValue({
      error: null,
      data: inputs.map((input, index) => ({
        question_id: input.questionId,
        state: index === 0 ? "first" : "seen",
        attempted_before: index !== 0,
        first_attempt_at: "2026-08-15T04:00:00.000Z",
        attempt_count: index + 1,
        saved: true,
      })),
    });

    const result = await recordQuestionAttemptsWithExposure(
      { rpc },
      "10000000-0000-0000-0000-000000000001",
      inputs,
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("record_question_attempts_with_exposure", {
      p_user_id: "10000000-0000-0000-0000-000000000001",
      p_attempts: expect.arrayContaining([
        expect.objectContaining({
          question_id: "question-0",
          question_type: "mock_exam",
          topic_id: "tech-security-cia",
          is_correct: true,
          question_origin: "app_original",
          question_version: 3,
        }),
      ]),
    });
    expect(result.saved).toBe(100);
    expect(result.exposures[0]).toEqual({
      questionId: "question-0",
      state: "first",
      attemptedBefore: false,
      firstAttemptAt: "2026-08-15T04:00:00.000Z",
      attemptCount: 1,
    });
  });

  it("does not send a client-supplied exposure claim", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: null,
      data: [{
        question_id: "question-a",
        state: "seen",
        attempted_before: true,
        first_attempt_at: "2026-08-14T04:00:00.000Z",
        attempt_count: 2,
        saved: true,
      }],
    });
    const untrusted = {
      ...attempt("question-a"),
      state: "first",
      isFirstSeen: true,
    } as QuestionAttemptInput;

    await recordQuestionAttemptsWithExposure(
      { rpc },
      "10000000-0000-0000-0000-000000000001",
      [untrusted],
    );

    const payload = rpc.mock.calls[0][1].p_attempts[0];
    expect(payload).not.toHaveProperty("state");
    expect(payload).not.toHaveProperty("isFirstSeen");
  });

  it.each([
    [{ state: "first" }],
    [{ question_id: "question-a", state: "invalid" }],
    null,
  ])("rejects malformed RPC data without inventing first (%j)", async (data) => {
    const rpc = vi.fn().mockResolvedValue({ error: null, data });

    await expect(recordQuestionAttemptsWithExposure(
      { rpc },
      "10000000-0000-0000-0000-000000000001",
      [attempt("question-a")],
    )).rejects.toBeInstanceOf(QuestionExposurePersistenceError);
  });

  it("rejects an RPC error without returning exposure", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "database unavailable" },
    });

    await expect(recordQuestionAttemptsWithExposure(
      { rpc },
      "10000000-0000-0000-0000-000000000001",
      [attempt("question-a")],
    )).rejects.toBeInstanceOf(QuestionExposurePersistenceError);
  });
});
