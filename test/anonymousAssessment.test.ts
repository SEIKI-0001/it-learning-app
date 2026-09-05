import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import {
  AssessmentSessionClientError,
  startAssessmentSessionForCurrentSession,
  type QuestionAttemptInput,
} from "@/lib/userSession";
import {
  anonymousAssessmentExposures,
  beginAssessmentSession,
  finalizeAnonymousAssessment,
  isAssessmentAuthenticationError,
  isAuthenticatedAssessmentExposure,
} from "@/lib/examReadiness/assessmentMode";
import { recordFinalExamAttempt } from "@/lib/checkpoints";

// 未ログイン利用のサポート（QA H-2 の回帰対応）。
//
// 認証はサーバー永続化・端末間同期・verified evidence を可能にするためのもので、
// 学習や試験の完遂条件ではない。ただし匿名の結果を verified evidence と
// 同一に扱わないことも同時に守る。

const SESSION_ID = "20000000-0000-4000-8000-000000000009";

afterEach(() => {
  vi.unstubAllGlobals();
});

function attempt(questionId: string, isCorrect: boolean): QuestionAttemptInput {
  return {
    questionId,
    questionType: "mini_exam",
    topicId: "tech-binary-data",
    selectedAnswer: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt: "2026-09-05T00:00:00.000+09:00",
  };
}

function answer(questionId: string, answeredAt: string): Pick<UserAnswer, "questionId" | "answeredAt"> {
  return { questionId, answeredAt };
}

describe("starting an assessment without a session", () => {
  it("continues as anonymous when the server answers 401", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), { status: 401 }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(beginAssessmentSession({
      action: "start",
      sessionId: SESSION_ID,
      source: "checkpoint",
      mode: "exam",
      startedAt: "2026-09-05T00:00:00.000+09:00",
      questionCount: 6,
    })).resolves.toBe("anonymous");
  });

  it("reports authenticated when the server accepts the session", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      session: { sessionId: SESSION_ID, status: "in_progress" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(beginAssessmentSession({
      action: "start",
      sessionId: SESSION_ID,
      source: "checkpoint",
      mode: "exam",
      startedAt: "2026-09-05T00:00:00.000+09:00",
      questionCount: 6,
    })).resolves.toBe("authenticated");
  });

  // 未ログイン以外の失敗まで飲み込むと、本当に開始できない状況を隠してしまう。
  it("still fails loudly when the server is broken", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), { status: 503 }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(beginAssessmentSession({
      action: "start",
      sessionId: SESSION_ID,
      source: "checkpoint",
      mode: "exam",
      startedAt: "2026-09-05T00:00:00.000+09:00",
      questionCount: 6,
    })).rejects.toThrow(AssessmentSessionClientError);
  });

  it("classifies only the authentication failure as anonymous", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), { status: 401 }),
    );
    vi.stubGlobal("fetch", fetch);

    const error = await startAssessmentSessionForCurrentSession({
      action: "start",
      sessionId: SESSION_ID,
      source: "checkpoint",
      mode: "exam",
      startedAt: "2026-09-05T00:00:00.000+09:00",
      questionCount: 6,
    }).catch((cause: unknown) => cause);

    expect(isAssessmentAuthenticationError(error)).toBe(true);
    expect(isAssessmentAuthenticationError(new Error("boom"))).toBe(false);
  });
});

describe("anonymous exposure is never presented as authoritative", () => {
  it("marks the result as anonymous with no user id", () => {
    const exposure = anonymousAssessmentExposures([attempt("q1", true)], []);

    expect(exposure.authState).toBe("anonymous");
    expect(exposure.userId).toBeNull();
    expect(isAuthenticatedAssessmentExposure(exposure)).toBe(false);
  });

  it("derives first/seen from local answers only", () => {
    const exposure = anonymousAssessmentExposures(
      [attempt("q1", true), attempt("q2", false)],
      [answer("q1", "2026-08-01T00:00:00.000+09:00")],
    );

    expect(exposure.exposures.q1.attemptedBefore).toBe(true);
    expect(exposure.exposures.q1.state).toBe("seen");
    expect(exposure.exposures.q2.attemptedBefore).toBe(false);
    expect(exposure.exposures.q2.state).toBe("first");
  });
});

describe("finalizing an assessment anonymously", () => {
  const completion = {
    action: "complete" as const,
    sessionId: SESSION_ID,
    completedAt: "2026-09-05T00:10:00.000+09:00",
    answers: [],
  };

  it("produces a result and a next state without any server call", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const finalized = finalizeAnonymousAssessment(
      {
        sessionId: SESSION_ID,
        baseState: { score: 5 },
        attempts: [attempt("q1", true)],
        completion,
        result: { correct: 5 },
        answers: [],
      },
      {
        deriveNextState: ({ baseState, exposureResult }) => ({
          score: baseState.score,
          seen: Object.keys(exposureResult.exposures).length,
        }),
      },
    );

    expect(finalized.mode).toBe("anonymous");
    expect(finalized.result).toEqual({ correct: 5 });
    expect(finalized.nextState).toEqual({ score: 5, seen: 1 });
    expect(fetch).not.toHaveBeenCalled();
  });

  // ローカル結果を権威にしない点は strict 版と同じ。
  it("rebuilds the result from the immutable request frame", () => {
    const finalized = finalizeAnonymousAssessment(
      {
        sessionId: SESSION_ID,
        baseState: { score: 0 },
        attempts: [attempt("q1", true), attempt("q2", false)],
        completion,
        result: { correct: 99 },
        answers: [],
      },
      {
        rederiveResult: ({ attempts }) => ({
          correct: attempts.filter((item) => item.isCorrect).length,
        }),
        deriveNextState: ({ result }) => result,
      },
    );

    expect(finalized.result).toEqual({ correct: 1 });
  });

  // サーバー保存済みと偽らない: 受領証にあたるフィールドを一切持たない。
  it("never reports a server receipt it does not have", () => {
    const finalized = finalizeAnonymousAssessment(
      {
        sessionId: SESSION_ID,
        baseState: {},
        attempts: [attempt("q1", true)],
        completion,
        result: {},
        answers: [],
      },
      { deriveNextState: () => ({}) },
    );

    expect(finalized.exposureResult.authState).toBe("anonymous");
    expect(finalized.exposureResult.userId).toBeNull();
    expect(finalized).not.toHaveProperty("completionAcknowledged");
    expect(finalized).not.toHaveProperty("progressAcknowledged");
  });
});

describe("checkpoint progression works anonymously", () => {
  function stateAt(checkpointId: "cp1"): AppState {
    return {
      progress: {
        level: 1,
        exp: 0,
        streakCount: 0,
        weakTags: [],
        completedTopics: [],
        topicMastery: {},
        topicMasteryStats: {},
        reviewQueue: [],
        currentDay: 1,
        completedDays: [],
        checkpointProgress: {
          ...INITIAL_CHECKPOINT_PROGRESS,
          currentCheckpointId: checkpointId,
          clearedCheckpointIds: ["cp0"],
        },
      },
      answers: [],
    };
  }

  const completion = {
    action: "complete" as const,
    sessionId: SESSION_ID,
    completedAt: "2026-09-05T00:10:00.000+09:00",
    answers: [],
  };

  function finalizeWith(passed: boolean) {
    const appState = stateAt("cp1");
    return finalizeAnonymousAssessment(
      {
        sessionId: SESSION_ID,
        baseState: { appState },
        attempts: [attempt("q1", passed)],
        completion,
        result: { passed },
        answers: [],
      },
      {
        deriveNextState: ({ baseState, exposureResult, result }) => ({
          appState: recordFinalExamAttempt(
            baseState.appState,
            {
              checkpointId: "cp1",
              passed: result.passed,
              correct: result.passed ? 6 : 1,
              total: 6,
              attemptedAt: completion.completedAt,
              wrongTopicIds: result.passed ? [] : ["tech-binary-data"],
            },
            [],
            exposureResult.exposures,
            undefined,
            new Date(completion.completedAt),
          ),
        }),
      },
    );
  }

  it("advances the checkpoint locally when the exam is passed", () => {
    const next = finalizeWith(true).nextState.appState.progress.checkpointProgress;

    expect(next?.clearedCheckpointIds).toContain("cp1");
    expect(next?.currentCheckpointId).toBe("cp2");
    expect(next?.finalExamAttempts.at(-1)?.passed).toBe(true);
  });

  it("records the attempt but does not advance when the exam is failed", () => {
    const next = finalizeWith(false).nextState.appState.progress.checkpointProgress;

    expect(next?.clearedCheckpointIds).not.toContain("cp1");
    expect(next?.currentCheckpointId).toBe("cp1");
    expect(next?.finalExamAttempts.at(-1)?.passed).toBe(false);
  });
});
