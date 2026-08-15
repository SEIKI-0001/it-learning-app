import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppState, QuestionExposureMap, UserAnswer } from "@/types";
import { recordMockExamResult, type MockExamResult } from "@/lib/mockExam";

const getRequestUserId = vi.hoisted(() => vi.fn());
const canRecordStudyForUser = vi.hoisted(() => vi.fn());
const getServiceSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/apiUser", () => ({ getRequestUserId }));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser,
  recordingLockedResponse: () => new Response(null, { status: 403 }),
}));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase }));

import { POST } from "@/app/api/question-attempts/save/route";

const USER_ID = "10000000-0000-0000-0000-000000000001";
const ANSWERED_BEFORE = "tech-security-cia-ex1";
const NEVER_ANSWERED = "tech-security-cia-ex2";

function emptyDeviceState(): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: { "tech-security-cia": 50 },
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
}

async function saveFromDevice(
  questionId: string,
  questionType: "mock_exam" | "topic_quiz",
  selectedAnswer: string,
  isCorrect: boolean,
): Promise<QuestionExposureMap> {
  const response = await POST(new Request("http://localhost/api/question-attempts/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: USER_ID,
      attempts: [{
        questionId,
        questionType,
        topicId: "tech-security-cia",
        selectedAnswer,
        isCorrect,
        answeredAt: "2026-08-15T01:00:00.000Z",
      }],
    }),
  }));
  const body = await response.json() as {
    exposures: Array<QuestionExposureMap[string]>;
  };
  return Object.fromEntries(body.exposures.map((exposure) => [
    exposure.questionId,
    exposure,
  ]));
}

function answer(questionId: string): UserAnswer {
  return {
    questionId,
    selectedChoice: "A",
    isCorrect: true,
    answeredAt: "2026-08-16T01:00:00.000Z",
    tag: "security",
    topicId: "tech-security-cia",
  };
}

function result(): MockExamResult {
  return {
    correct: 1,
    total: 1,
    fieldScores: {
      strategy: { correct: 0, total: 0 },
      management: { correct: 0, total: 0 },
      technology: { correct: 1, total: 1 },
    },
    topicScores: [{ topicId: "tech-security-cia", correct: 1, total: 1, rate: 100 }],
    weakTopics: [],
    wrongTopicIds: [],
  } satisfies MockExamResult;
}

describe("cross-device authoritative first-seen integration", () => {
  const attempts = new Map<string, { count: number; firstAttemptAt: string }>();

  beforeEach(() => {
    attempts.clear();
    getRequestUserId.mockResolvedValue(USER_ID);
    canRecordStudyForUser.mockResolvedValue(true);
    getServiceSupabase.mockReturnValue({
      rpc: vi.fn(async (
        _name: string,
        params: { p_attempts: Array<Record<string, unknown>> },
      ) => ({
        error: null,
        data: params.p_attempts.map((row) => {
          const questionId = String(row.question_id);
          const previous = attempts.get(questionId);
          const firstAttemptAt = previous?.firstAttemptAt
            ?? String(row.answered_at ?? "2026-08-15T01:00:00.000Z");
          const count = (previous?.count ?? 0) + 1;
          attempts.set(questionId, { count, firstAttemptAt });
          return {
            question_id: questionId,
            state: previous ? "seen" : "first",
            attempted_before: Boolean(previous),
            first_attempt_at: firstAttemptAt,
            attempt_count: count,
            saved: true,
          };
        }),
      })),
    });
  });

  it("uses the same canonical ID across paths and does not trust a fresh AppState", async () => {
    // 端末A: mock examで不正解。正誤に関係なく回答済みになる。
    const deviceA = await saveFromDevice(ANSWERED_BEFORE, "mock_exam", "B", false);
    expect(deviceA[ANSWERED_BEFORE].state).toBe("first");

    // 端末B: AppStateは空でも、同じcanonical IDをtopic/review経路から送るとseen。
    const freshDeviceB = emptyDeviceState();
    expect(freshDeviceB.answers).toEqual([]);
    const seen = await saveFromDevice(ANSWERED_BEFORE, "topic_quiz", "A", true);
    const first = await saveFromDevice(NEVER_ANSWERED, "topic_quiz", "A", true);
    expect(seen[ANSWERED_BEFORE]).toMatchObject({
      state: "seen",
      attemptedBefore: true,
      attemptCount: 2,
    });
    expect(first[NEVER_ANSWERED]).toMatchObject({
      state: "first",
      attemptedBefore: false,
      attemptCount: 1,
    });

    const seenResult = recordMockExamResult(
      freshDeviceB,
      [answer(ANSWERED_BEFORE)],
      result(),
      seen,
      new Date("2026-08-16T01:00:00.000Z"),
    );
    const firstResult = recordMockExamResult(
      freshDeviceB,
      [answer(NEVER_ANSWERED)],
      result(),
      first,
      new Date("2026-08-16T01:00:00.000Z"),
    );

    expect(firstResult.progress.topicMastery["tech-security-cia"])
      .toBeGreaterThan(seenResult.progress.topicMastery["tech-security-cia"]);
    expect(seenResult.progress.topicMasteryStats?.["tech-security-cia"].recentEvidence[0])
      .toEqual(expect.objectContaining({ exposureState: "seen", isFirstSeen: false }));
  });
});
