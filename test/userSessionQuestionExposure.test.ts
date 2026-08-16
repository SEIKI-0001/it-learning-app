import { afterEach, describe, expect, it, vi } from "vitest";
import {
  saveQuestionAttemptsForCurrentSession,
  saveQuestionAttemptsWithExposure,
  type QuestionAttemptInput,
} from "@/lib/userSession";

function attempt(questionId: string): QuestionAttemptInput {
  return {
    questionId,
    questionType: "mock_exam",
    topicId: "tech-security-cia",
    selectedAnswer: "A",
    isCorrect: true,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveQuestionAttemptsWithExposure", () => {
  it("classifies 100 questions with one batch request", async () => {
    const attempts = Array.from({ length: 100 }, (_, index) => attempt(`question-${index}`));
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      saved: 100,
      exposures: attempts.map((item, index) => ({
        questionId: item.questionId,
        state: index === 0 ? "first" : "seen",
        attemptedBefore: index !== 0,
        firstAttemptAt: "2026-08-15T04:00:00.000Z",
        attemptCount: index + 1,
      })),
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const exposures = await saveQuestionAttemptsWithExposure("user-1", attempts);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(exposures["question-0"].state).toBe("first");
    expect(exposures["question-99"].state).toBe("seen");
  });

  it.each([
    ["non-2xx", () => new Response(JSON.stringify({ ok: false }), { status: 500 })],
    ["malformed JSON", () => new Response("not-json", { status: 200 })],
  ])("returns unknown for every question after %s", async (_name, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));

    const exposures = await saveQuestionAttemptsWithExposure(
      "user-1",
      [attempt("question-a"), attempt("question-b")],
    );

    expect(exposures["question-a"].state).toBe("unknown");
    expect(exposures["question-b"].state).toBe("unknown");
  });

  it("returns unknown after a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const exposures = await saveQuestionAttemptsWithExposure(
      "user-1",
      [attempt("question-a")],
    );

    expect(exposures["question-a"].state).toBe("unknown");
  });

  it("fills a missing authoritative row with unknown", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      saved: 1,
      exposures: [{
        questionId: "question-a",
        state: "first",
        attemptedBefore: false,
        firstAttemptAt: "2026-08-15T04:00:00.000Z",
        attemptCount: 1,
      }],
    }), { status: 200 })));

    const exposures = await saveQuestionAttemptsWithExposure(
      "user-1",
      [attempt("question-a"), attempt("question-b")],
    );

    expect(exposures["question-a"].state).toBe("first");
    expect(exposures["question-b"].state).toBe("unknown");
  });

  it("does not call the API for an empty batch", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(saveQuestionAttemptsWithExposure("user-1", [])).resolves.toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the server-authenticated user and never sends a local user ID claim", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      userId: "server-user",
      saved: 1,
      exposures: [{
        questionId: "question-a",
        state: "seen",
        attemptedBefore: true,
        firstAttemptAt: "2026-08-14T04:00:00.000Z",
        attemptCount: 2,
      }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const result = await saveQuestionAttemptsForCurrentSession(
      [attempt("question-a")],
      [],
    );

    expect(result).toEqual(expect.objectContaining({
      authState: "authenticated",
      userId: "server-user",
      exposures: { "question-a": expect.objectContaining({ state: "seen" }) },
    }));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("userId");
  });

  it("uses local history only after the server explicitly confirms anonymous", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), { status: 401 }),
    ));

    const result = await saveQuestionAttemptsForCurrentSession(
      [attempt("question-a")],
      [],
    );

    expect(result.authState).toBe("anonymous");
    expect(result.userId).toBeNull();
    expect(result.exposures["question-a"].state).toBe("first");
  });

  it("does not turn an authentication or API failure into a local first claim", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), { status: 500 }),
    ));

    const result = await saveQuestionAttemptsForCurrentSession(
      [attempt("question-a")],
      [],
    );

    expect(result.authState).toBe("unknown");
    expect(result.userId).toBeNull();
    expect(result.exposures["question-a"].state).toBe("unknown");
  });
});
