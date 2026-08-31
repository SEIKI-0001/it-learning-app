// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPendingAssessmentFinalization,
  loadPendingAssessmentFinalization,
  pendingAssessmentFinalizationStorageKey,
  resumePendingAssessmentFinalization,
  savePendingAssessmentFinalization,
  type PendingAssessmentFinalization,
} from "@/lib/examReadiness/pendingFinalization";

const values = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return values.size;
  },
  clear() {
    values.clear();
  },
  getItem(key) {
    return values.get(key) ?? null;
  },
  key(index) {
    return [...values.keys()][index] ?? null;
  },
  removeItem(key) {
    values.delete(key);
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
};

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageStub,
  });
});

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

function pending(
  sessionId = "20000000-0000-4000-8000-000000000001",
): PendingAssessmentFinalization<{ answers: string[] }, { progress: string }, { score: number }> {
  return {
    version: 1,
    sessionId,
    source: "mock",
    attempts: [{
      questionId: "tech-binary-data-ex1",
      questionType: "mock_exam",
      topicId: "tech-binary-data",
      selectedAnswer: "A",
      isCorrect: true,
      answeredAt: "2026-08-30T00:00:00.000Z",
      attemptGroupId: sessionId,
    }],
    completion: {
      action: "complete",
      sessionId,
      completedAt: "2026-08-30T00:00:01.000Z",
      answers: [{
        idempotencyKey: `assessment:${sessionId}:tech-binary-data-ex1`,
        canonicalQuestionId: "tech-binary-data-ex1",
        topicId: "tech-binary-data",
        isCorrect: true,
        answeredAt: "2026-08-30T00:00:00.000Z",
      }],
    },
    baseState: { answers: ["A"] },
    exposureResult: {
      authState: "authenticated",
      userId: "user-1",
      exposures: {
        "tech-binary-data-ex1": {
          questionId: "tech-binary-data-ex1",
          state: "first",
          attemptedBefore: false,
          firstAttemptAt: "2026-08-30T00:00:00.000Z",
          attemptCount: 1,
        },
      },
    },
    completionAcknowledged: true,
    nextState: { progress: "frozen" },
    result: { score: 100 },
  };
}

describe("pending assessment finalization storage", () => {
  it("round-trips the complete frozen attempt, completion, base-state, and result payload", () => {
    const value = pending();

    savePendingAssessmentFinalization(value);

    expect(loadPendingAssessmentFinalization(value.sessionId)).toEqual(value);
  });

  it("rejects malformed and cross-session pending records", () => {
    const value = pending();
    window.localStorage.setItem(pendingAssessmentFinalizationStorageKey(value.sessionId), "{oops");
    expect(loadPendingAssessmentFinalization(value.sessionId)).toBeNull();

    window.localStorage.setItem(
      pendingAssessmentFinalizationStorageKey(value.sessionId),
      JSON.stringify({ ...value, sessionId: "20000000-0000-4000-8000-000000000002" }),
    );
    expect(loadPendingAssessmentFinalization(value.sessionId)).toBeNull();

    window.localStorage.setItem(
      pendingAssessmentFinalizationStorageKey(value.sessionId),
      JSON.stringify({ ...value, version: 2 }),
    );
    expect(loadPendingAssessmentFinalization(value.sessionId)).toBeNull();
  });

  it("clears only the acknowledged session record", () => {
    const first = pending();
    const second = pending("20000000-0000-4000-8000-000000000002");
    savePendingAssessmentFinalization(first);
    savePendingAssessmentFinalization(second);

    clearPendingAssessmentFinalization(first.sessionId);

    expect(loadPendingAssessmentFinalization(first.sessionId)).toBeNull();
    expect(loadPendingAssessmentFinalization(second.sessionId)).toEqual(second);
  });

  it("keeps the frozen record when localStorage removal cannot be acknowledged", () => {
    const value = pending();
    savePendingAssessmentFinalization(value);
    const removeItem = vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("storage is unavailable");
    });

    expect(clearPendingAssessmentFinalization(value.sessionId)).toBe(false);
    expect(loadPendingAssessmentFinalization(value.sessionId)).toEqual(value);

    removeItem.mockRestore();
  });

  it("does not claim a frozen payload was persisted when localStorage set fails", () => {
    const value = pending();
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("storage is unavailable");
    });

    expect(() => savePendingAssessmentFinalization(value)).toThrow("Cannot persist");
    expect(loadPendingAssessmentFinalization(value.sessionId)).toBeNull();

    setItem.mockRestore();
  });

  it("persists each acknowledgement before resuming the next frozen stage", async () => {
    const value = pending();
    delete value.exposureResult;
    delete value.nextState;
    delete value.completionAcknowledged;
    const exposureResult = pending().exposureResult!;
    const saveAttempts = vi.fn().mockResolvedValue(exposureResult);
    const completeSession = vi.fn().mockResolvedValue(undefined);
    const deriveNextState = vi.fn().mockReturnValue({ progress: "frozen" });
    const saveProgress = vi.fn().mockResolvedValue(true);

    const completed = await resumePendingAssessmentFinalization(value, {
      saveAttempts,
      completeSession,
      deriveNextState,
      saveProgress,
    });

    expect(saveAttempts).toHaveBeenCalledWith(value.attempts);
    expect(completeSession).toHaveBeenCalledWith(value.completion);
    expect(deriveNextState).toHaveBeenCalledWith(expect.objectContaining({
      baseState: value.baseState,
      result: value.result,
    }));
    expect(saveProgress).toHaveBeenCalledWith({
      nextState: { progress: "frozen" },
      exposureResult,
      sessionId: value.sessionId,
    });
    expect(completed).toMatchObject({
      exposureResult,
      completionAcknowledged: true,
      nextState: { progress: "frozen" },
      progressAcknowledged: true,
    });
    expect(loadPendingAssessmentFinalization(value.sessionId)).toEqual(completed);
  });

  it("keeps the frozen record and does not advance after an ambiguous attempt save", async () => {
    const value = pending();
    delete value.exposureResult;
    delete value.nextState;
    delete value.completionAcknowledged;
    const completeSession = vi.fn();

    await expect(resumePendingAssessmentFinalization(value, {
      saveAttempts: vi.fn().mockRejectedValue(new TypeError("response lost")),
      completeSession,
      deriveNextState: vi.fn(),
      saveProgress: vi.fn(),
    })).rejects.toThrow("response lost");

    expect(completeSession).not.toHaveBeenCalled();
    expect(loadPendingAssessmentFinalization(value.sessionId)).toMatchObject({
      attempts: value.attempts,
      completion: value.completion,
    });
    expect(loadPendingAssessmentFinalization(value.sessionId)?.exposureResult).toBeUndefined();
  });

  it("rejects malformed cross-session payloads before any remote stage", async () => {
    const value = pending();
    const malformed = {
      ...value,
      completion: { ...value.completion, sessionId: "20000000-0000-4000-8000-000000000002" },
    } as PendingAssessmentFinalization<{ answers: string[] }, { progress: string }, { score: number }>;
    const saveAttempts = vi.fn();
    const completeSession = vi.fn();
    const saveProgress = vi.fn();

    await expect(resumePendingAssessmentFinalization(malformed, {
      saveAttempts,
      completeSession,
      deriveNextState: vi.fn(),
      saveProgress,
    })).rejects.toThrow("Cannot persist a malformed assessment finalization");

    expect(saveAttempts).not.toHaveBeenCalled();
    expect(completeSession).not.toHaveBeenCalled();
    expect(saveProgress).not.toHaveBeenCalled();
  });

  it.each([
    ["completion acknowledgement without an authoritative exposure", (value: ReturnType<typeof pending>) => {
      delete value.exposureResult;
      value.completionAcknowledged = true;
    }],
    ["frozen next state before completion acknowledgement", (value: ReturnType<typeof pending>) => {
      delete value.completionAcknowledged;
    }],
    ["P0 acknowledgement without its frozen next state", (value: ReturnType<typeof pending>) => {
      delete value.nextState;
      value.completionAcknowledged = true;
      value.progressAcknowledged = true;
    }],
    ["non-strict attempt timestamp", (value: ReturnType<typeof pending>) => {
      value.attempts[0].answeredAt = "August 30, 2026";
    }],
  ])("rejects impossible %s before every remote stage", async (_label, mutate) => {
    const value = pending();
    mutate(value);
    const saveAttempts = vi.fn();
    const completeSession = vi.fn();
    const saveProgress = vi.fn();

    await expect(resumePendingAssessmentFinalization(value, {
      saveAttempts,
      completeSession,
      deriveNextState: vi.fn(),
      saveProgress,
    })).rejects.toThrow("Cannot persist a malformed assessment finalization");

    expect(saveAttempts).not.toHaveBeenCalled();
    expect(completeSession).not.toHaveBeenCalled();
    expect(saveProgress).not.toHaveBeenCalled();
  });

  it.each(["attempt", "completion", "progress"] as const)(
    "replays the byte-identical frozen %s body after response loss",
    async (failedStage) => {
      const value = pending();
      const exposureResult = value.exposureResult!;
      if (failedStage === "attempt") {
        delete value.exposureResult;
        delete value.nextState;
        delete value.completionAcknowledged;
      }
      if (failedStage === "completion") {
        delete value.nextState;
        delete value.completionAcknowledged;
      }
      if (failedStage === "progress") {
        value.completionAcknowledged = true;
      }

      const saveAttempts = vi.fn().mockResolvedValue(exposureResult);
      const completeSession = vi.fn().mockResolvedValue(undefined);
      const deriveNextState = vi.fn().mockReturnValue({ progress: "frozen" });
      const saveProgress = vi.fn().mockResolvedValue(true);
      if (failedStage === "attempt") {
        saveAttempts.mockRejectedValueOnce(new TypeError("response lost"));
      }
      if (failedStage === "completion") {
        completeSession.mockRejectedValueOnce(new TypeError("response lost"));
      }
      if (failedStage === "progress") {
        saveProgress.mockResolvedValueOnce(false);
      }

      const stages = { saveAttempts, completeSession, deriveNextState, saveProgress };
      await expect(resumePendingAssessmentFinalization(value, stages)).rejects.toThrow();
      const persisted = loadPendingAssessmentFinalization(value.sessionId)!;
      await resumePendingAssessmentFinalization(persisted, stages);

      const calls = failedStage === "attempt"
        ? saveAttempts.mock.calls
        : failedStage === "completion"
          ? completeSession.mock.calls
          : saveProgress.mock.calls;
      expect(calls).toHaveLength(2);
      expect(JSON.stringify(calls[1][0])).toBe(JSON.stringify(calls[0][0]));
    },
  );
});
