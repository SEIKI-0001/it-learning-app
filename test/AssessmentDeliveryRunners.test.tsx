// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AppState, UserAnswer } from "@/types";
import { pendingAssessmentFinalizationStorageKey } from "@/lib/examReadiness/pendingFinalization";

const harness = vi.hoisted(() => ({
  state: undefined as unknown,
  setState: vi.fn(),
  replace: vi.fn(),
}));

const storageValues = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return storageValues.size;
  },
  clear() {
    storageValues.clear();
  },
  getItem(key) {
    return storageValues.get(key) ?? null;
  },
  key(index) {
    return [...storageValues.keys()][index] ?? null;
  },
  removeItem(key) {
    storageValues.delete(key);
  },
  setItem(key, value) {
    storageValues.set(key, String(value));
  },
};

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageStub,
  });
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: harness.replace }),
  useParams: () => ({ checkpointId: "cp1" }),
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [harness.state, harness.setState],
}));

vi.mock("@/lib/useBadgeSync", () => ({ useBadgeSync: () => undefined }));
vi.mock("@/lib/badgeSignals", () => ({
  getClientBadgeSignals: () => ({
    wordMasteredCount: 0,
    examReadiness: null,
    examReadinessVerified: true,
  }),
}));
vi.mock("@/components/checkpoints/FinalExamCard", () => ({
  default: () => <div data-testid="final-exam-card" />,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/components/LoadingScreen", () => ({ default: () => <div>loading</div> }));
vi.mock("@/components/billing/RecordingLockNotice", () => ({ default: () => null }));
vi.mock("@/lib/checkpoints", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/checkpoints")>();
  return {
    ...actual,
    buildCheckpointGate: () => ({
      finalExamUnlocked: true,
      finalExamPassed: false,
      missingBadges: [],
    }),
  };
});

vi.mock("@/components/learn/TopicQuiz", () => ({
  default: ({
    questions,
    onComplete,
  }: {
    questions: Array<{ id: string }>;
    onComplete: (answers: UserAnswer[]) => void | Promise<void>;
  }) => (
    <div data-testid="topic-quiz">
      <span>{questions[0]?.id}</span>
      <button
        type="button"
        onClick={() => void Promise.resolve(onComplete(
          questions.slice(0, 2).map((question, index) => ({
            questionId: question.id,
            selectedChoice: index === 0 ? "A" : undefined,
            isCorrect: index === 0,
            answeredAt: "2026-08-23T00:05:00.000Z",
            tag: question.id,
          })),
        )).catch(() => undefined)}
      >
        test-complete
      </button>
    </div>
  ),
}));

import MockExamPage from "@/app/mock-exam/page";
import CheckpointExamRunner from "@/components/checkpoint/CheckpointExamRunner";
import FinalExamPage from "@/app/checkpoint/[checkpointId]/final/page";

const CP1_TOPICS = [
  "tech-binary-data",
  "tech-computer-core",
  "mgmt-development-process",
  "strat-enterprise-activities",
];

function makeState(): AppState {
  return {
    profile: {
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    },
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: CP1_TOPICS,
      topicMastery: {},
      topicMasteryStats: {},
      reviewQueue: [],
      weeklyPlan: null,
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
}

type Deferred = {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
};

type MutableFrozenRunnerFinalization = {
  result: Record<string, unknown>;
  baseState: {
    tagged?: Array<{ isCorrect: boolean }>;
    answers?: Array<{ isCorrect: boolean }>;
  };
};

function deferredResponse(): Deferred {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function requestBodies(path: string): Array<Record<string, unknown>> {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  return fetchMock.mock.calls
    .filter(([url]) => url === path)
    .map(([, init]) => JSON.parse(String((init as RequestInit | undefined)?.body)));
}

function assessmentSuccess(action: string, sessionId: string): Response {
  const status = action === "start"
    ? "in_progress"
    : action === "complete"
      ? "completed"
      : "abandoned";
  return new Response(JSON.stringify({
    ok: true,
    session: { sessionId, status },
  }), { status: 200 });
}

function installFetch(
  startResponse?: Deferred,
  failures: Partial<Record<"start" | "complete" | "abandon", number>> = {},
  attemptFailure?: "network" | "http" | "malformed" | "unknown",
  progressFailures = 0,
) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/assessment-sessions") {
      const body = JSON.parse(String(init?.body)) as { action: "start" | "complete" | "abandon"; sessionId: string };
      const action = body.action;
      if (action === "start" && startResponse) return startResponse.promise;
      if ((failures[action] ?? 0) > 0) {
        failures[action] = (failures[action] ?? 0) - 1;
        return new Response(JSON.stringify({ error: "persistence_failed" }), { status: 503 });
      }
      return assessmentSuccess(action, body.sessionId);
    }
    if (url === "/api/question-attempts/save") {
      const attempts = JSON.parse(String(init?.body)).attempts as Array<{ questionId: string }>;
      if (attemptFailure) {
        const failure = attemptFailure;
        attemptFailure = undefined;
        if (failure === "network") throw new TypeError("connection lost");
        if (failure === "http") {
          return new Response(JSON.stringify({ ok: false }), { status: 503 });
        }
        if (failure === "malformed") return new Response("not-json", { status: 200 });
        return new Response(JSON.stringify({
          ok: true,
          userId: "user-1",
          exposures: attempts.map((attempt) => ({
            questionId: attempt.questionId,
            state: "unknown",
            attemptedBefore: false,
            firstAttemptAt: "2026-08-23T00:05:00.000Z",
            attemptCount: 1,
          })),
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ok: true,
        userId: "user-1",
        exposures: attempts.map((attempt) => ({
          questionId: attempt.questionId,
          state: "first",
          attemptedBefore: false,
          firstAttemptAt: "2026-08-23T00:05:00.000Z",
          attemptCount: 1,
        })),
      }), { status: 200 });
    }
    if (url === "/api/progress/save" && progressFailures > 0) {
      progressFailures -= 1;
      return new Response(JSON.stringify({ error: "response_lost" }), { status: 503 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }));
}

function frozenFinalization(
  sessionId: string,
  source: "mock" | "checkpoint",
  baseState: unknown,
  result: unknown,
) {
  return {
    version: 1,
    sessionId,
    source,
    attempts: [{
      questionId: "tech-binary-data-ex1",
      questionType: source === "mock" ? "mock_exam" : "mini_exam",
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
    baseState,
    result,
  };
}

function expectCompletionOrder() {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  const calls = fetchMock.mock.calls;
  const attemptIndex = calls.findIndex(([url]) => url === "/api/question-attempts/save");
  const completionIndex = calls.findIndex(([url, init]) =>
    url === "/api/assessment-sessions"
      && JSON.parse(String((init as RequestInit).body)).action === "complete"
  );
  const progressIndex = calls.findIndex(([url]) => url === "/api/progress/save");
  expect(attemptIndex).toBeGreaterThan(-1);
  expect(completionIndex).toBeGreaterThan(attemptIndex);
  expect(progressIndex).toBeGreaterThan(completionIndex);

  const completion = requestBodies("/api/assessment-sessions")
    .find((body) => body.action === "complete");
  expect(completion?.answers).toEqual([
    expect.objectContaining({
      idempotencyKey: expect.stringMatching(/^assessment:/),
      isCorrect: true,
    }),
  ]);
  expect(requestBodies("/api/progress/save")).toEqual([
    expect.objectContaining({
      readinessTrigger: {
        triggerType: "assessment",
        triggerId: completion?.sessionId,
      },
    }),
  ]);
}

beforeEach(() => {
  window.localStorage.clear();
  harness.state = makeState();
  harness.setState.mockReset();
  harness.replace.mockReset();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("assessment delivery runners", () => {
  it.each([
    [
      "mock",
      () => render(<MockExamPage />),
      () => frozenFinalization(
        "20000000-0000-4000-8000-000000000011",
        "mock",
        { appState: makeState(), tagged: null },
        {
          correct: 1,
          total: 1,
          fieldScores: {
            strategy: { correct: 0, total: 0 },
            management: { correct: 0, total: 0 },
            technology: { correct: 1, total: 1 },
          },
          topicScores: [{ topicId: "tech-binary-data", correct: 1, total: 1, rate: 100 }],
          weakTopics: [],
          wrongTopicIds: [],
        },
      ),
    ],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      () => frozenFinalization(
        "20000000-0000-4000-8000-000000000012",
        "checkpoint",
        {
          kind: "checkpoint",
          checkpointId: "cp-technology-foundations",
          appState: makeState(),
          tagged: null,
        },
        { correct: 1, total: 1, passed: true },
      ),
    ],
    [
      "checkpoint final",
      () => render(<FinalExamPage />),
      () => frozenFinalization(
        "20000000-0000-4000-8000-000000000013",
        "checkpoint",
        {
          kind: "checkpoint-final",
          checkpointId: "cp1",
          appState: makeState(),
          exam: {},
          answers: null,
          attempt: {
            checkpointId: "cp1",
            passed: false,
            correct: 0,
            total: 1,
            attemptedAt: "2026-08-30T00:00:01.000Z",
            wrongTopicIds: [],
          },
        },
        { correct: 0, total: 1, passed: false, wrongTopicIds: [] },
      ),
    ],
  ] as const)("%s rejects a malformed frozen runner shape before attempts, completion, or P0", async (
    _name,
    renderRunner,
    createPending,
  ) => {
    installFetch();
    const pending = createPending();
    window.localStorage.setItem(
      pendingAssessmentFinalizationStorageKey(pending.sessionId),
      JSON.stringify(pending),
    );

    renderRunner();

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(requestBodies("/api/question-attempts/save")).toHaveLength(0);
    expect(requestBodies("/api/assessment-sessions").filter((body) => body.action === "complete"))
      .toHaveLength(0);
    expect(requestBodies("/api/progress/save")).toHaveLength(0);
  });

  it("mock persists start before questions and completes after classification", async () => {
    const start = deferredResponse();
    installFetch(start);
    render(<MockExamPage />);

    fireEvent.click(screen.getByRole("button", { name: /模試を始める/ }));
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();
    await waitFor(() => expect(requestBodies("/api/assessment-sessions")[0]).toMatchObject({
      action: "start",
      source: "mock",
      mode: "exam",
      questionCount: 100,
    }));
    const startBody = requestBodies("/api/assessment-sessions")[0];
    start.resolve(assessmentSuccess("start", String(startBody.sessionId)));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    await waitFor(expectCompletionOrder);
  });

  it("checkpoint evidence starts explicitly and completes before P0", async () => {
    const start = deferredResponse();
    installFetch(start);
    render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />);

    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "チェックポイント試験を始める" }));
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();
    await waitFor(() => expect(requestBodies("/api/assessment-sessions")[0]).toMatchObject({
      action: "start",
      source: "checkpoint",
      mode: "exam",
      questionCount: 12,
    }));
    const startBody = requestBodies("/api/assessment-sessions")[0];
    start.resolve(assessmentSuccess("start", String(startBody.sessionId)));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    await waitFor(expectCompletionOrder);
  });

  it("checkpoint final persists start before questions and completes before P0", async () => {
    const start = deferredResponse();
    installFetch(start);
    render(<FinalExamPage />);

    fireEvent.click(screen.getByRole("button", { name: "突破試験に挑む" }));
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();
    await waitFor(() => expect(requestBodies("/api/assessment-sessions")[0]).toMatchObject({
      action: "start",
      source: "checkpoint",
      mode: "exam",
      questionCount: 6,
    }));
    const startBody = requestBodies("/api/assessment-sessions")[0];
    start.resolve(assessmentSuccess("start", String(startBody.sessionId)));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    await waitFor(expectCompletionOrder);
  });

  it("checkpoint final keeps the completed result while a retry start fails and swaps exams only after success", async () => {
    const failures: Partial<Record<"start" | "complete" | "abandon", number>> = {};
    installFetch(undefined, failures);
    render(<FinalExamPage />);

    fireEvent.click(screen.getByRole("button", { name: "突破試験に挑む" }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    expect(await screen.findByText("あと少し！次は合格できます")).toBeInTheDocument();
    const completedSessionId = requestBodies("/api/assessment-sessions")
      .find((body) => body.action === "complete")?.sessionId;

    failures.start = 1;
    fireEvent.click(screen.getByRole("button", { name: "もう一度挑戦する" }));

    expect(screen.getByText("あと少し！次は合格できます")).toBeInTheDocument();
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("開始");
    expect(screen.getByText("あと少し！次は合格できます")).toBeInTheDocument();
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "もう一度挑戦する" }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    expect(screen.queryByText("あと少し！次は合格できます")).not.toBeInTheDocument();

    const actions = requestBodies("/api/assessment-sessions");
    expect(actions.map((body) => body.action)).toEqual(["start", "complete", "start", "start"]);
    const retryStarts = actions.filter((body) => body.action === "start").slice(1);
    expect(retryStarts[0]).toEqual(retryStarts[1]);
    expect(retryStarts[0]?.sessionId).not.toBe(completedSessionId);
  });

  it.each([
    ["mock", () => render(<MockExamPage />), /模試を始める/],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
    ],
    ["checkpoint final", () => render(<FinalExamPage />), /突破試験に挑む/],
  ])("%s keeps questions unmounted when start persistence fails and allows retry", async (
    _name,
    renderRunner,
    startName,
  ) => {
    installFetch(undefined, { start: 1 });
    renderRunner();

    fireEvent.click(screen.getByRole("button", { name: startName }));

    expect(await screen.findByRole("alert")).toHaveTextContent("開始");
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    const starts = requestBodies("/api/assessment-sessions")
      .filter((body) => body.action === "start");
    expect(starts).toHaveLength(2);
    expect(starts[1]).toMatchObject({
      sessionId: starts[0].sessionId,
      startedAt: starts[0].startedAt,
      questionCount: starts[0].questionCount,
    });
  });

  it.each([
    ["mock", () => render(<MockExamPage />), /模試を始める/],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
    ],
    ["checkpoint final", () => render(<FinalExamPage />), /突破試験に挑む/],
  ])("%s does not write P0 or show a result when completion fails and allows retry", async (
    _name,
    renderRunner,
    startName,
  ) => {
    installFetch(undefined, { complete: 1 });
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.getByTestId("topic-quiz")).toBeInTheDocument();
    expect(harness.setState).not.toHaveBeenCalled();
    expect(requestBodies("/api/progress/save")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    await waitFor(() => expect(requestBodies("/api/progress/save")).toHaveLength(1));
    const completions = requestBodies("/api/assessment-sessions")
      .filter((body) => body.action === "complete");
    expect(completions).toHaveLength(2);
    expect(completions[1]).toMatchObject({
      sessionId: completions[0].sessionId,
      completedAt: completions[0].completedAt,
      answers: completions[0].answers,
    });
  });

  it.each([
    ["network", () => render(<MockExamPage />), /模試を始める/],
    ["http", () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />), /チェックポイント試験を始める/],
    ["malformed", () => render(<FinalExamPage />), /突破試験に挑む/],
    ["unknown", () => render(<MockExamPage />), /模試を始める/],
  ] as const)("does not cache %s assessment exposure data and retries the identical batch", async (
    failure,
    renderRunner,
    startName,
  ) => {
    installFetch(undefined, {}, failure);
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(harness.setState).not.toHaveBeenCalled();
    expect(requestBodies("/api/assessment-sessions").filter((body) => body.action === "complete")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    await waitFor(() => expect(requestBodies("/api/progress/save")).toHaveLength(1));
    const batches = requestBodies("/api/question-attempts/save");
    expect(batches).toHaveLength(2);
    expect(batches[1]).toEqual(batches[0]);
  });

  it.each([
    ["mock", () => render(<MockExamPage />), /模試を始める/],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
    ],
    ["checkpoint final", () => render(<FinalExamPage />), /突破試験に挑む/],
  ] as const)("%s resumes a frozen strict-save batch after a fresh mount", async (
    _name,
    renderRunner,
    startName,
  ) => {
    installFetch(undefined, {}, "network");
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    const frozenAttempts = JSON.stringify(requestBodies("/api/question-attempts/save")[0]);
    expect(requestBodies("/api/assessment-sessions").filter((body) => body.action === "complete"))
      .toHaveLength(0);

    cleanup();
    renderRunner();

    await waitFor(() => expect(requestBodies("/api/question-attempts/save")).toHaveLength(2));
    expect(JSON.stringify(requestBodies("/api/question-attempts/save")[1])).toBe(frozenAttempts);
    await waitFor(() => expect(requestBodies("/api/progress/save")).toHaveLength(1));
  });

  it.each([
    ["mock", () => render(<MockExamPage />), /模試を始める/],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
    ],
    ["checkpoint final", () => render(<FinalExamPage />), /突破試験に挑む/],
  ] as const)("%s does not start a second session while its frozen finalization resumes", async (
    _name,
    renderRunner,
    startName,
  ) => {
    installFetch(undefined, {}, "network");
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("保存");

    cleanup();
    vi.useFakeTimers();
    try {
      renderRunner();
      const start = screen.getByRole("button", { name: startName });

      fireEvent.click(start);
      expect(requestBodies("/api/assessment-sessions").filter((body) => body.action === "start"))
        .toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["mock", () => render(<MockExamPage />), /模試を始める/],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
    ],
    ["checkpoint final", () => render(<FinalExamPage />), /突破試験に挑む/],
  ] as const)("%s keeps its result hidden and P0 payload frozen until acknowledgement", async (
    _name,
    renderRunner,
    startName,
  ) => {
    installFetch(undefined, {}, undefined, 1);
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.getByTestId("topic-quiz")).toBeInTheDocument();
    expect(harness.setState).not.toHaveBeenCalled();
    const firstProgress = JSON.stringify(requestBodies("/api/progress/save")[0]);
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(true);

    cleanup();
    renderRunner();

    await waitFor(() => expect(requestBodies("/api/progress/save")).toHaveLength(2));
    expect(JSON.stringify(requestBodies("/api/progress/save")[1])).toBe(firstProgress);
    await waitFor(() => expect(harness.setState).toHaveBeenCalledOnce());
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(false);
  });

  it.each([
    ["mock", () => render(<MockExamPage />), /模試を始める/],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
    ],
    ["checkpoint final", () => render(<FinalExamPage />), /突破試験に挑む/],
  ] as const)("%s keeps pending and hides local completion when finalization storage removal fails", async (
    _name,
    renderRunner,
    startName,
  ) => {
    installFetch();
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    const removeItem = vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("storage is unavailable");
    });

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(harness.setState).not.toHaveBeenCalled();
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(true);

    removeItem.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "保存を再試行する" }));
    await waitFor(() => expect(harness.setState).toHaveBeenCalledOnce());
  });

  it.each([
    ["mock", () => render(<MockExamPage />), /模試を始める/],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
    ],
    ["checkpoint final", () => render(<FinalExamPage />), /突破試験に挑む/],
  ] as const)("%s keeps the frozen record and result hidden when local AppState read-back fails", async (
    _name,
    renderRunner,
    startName,
  ) => {
    installFetch();
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation((key, value) => {
      if (key === "fequest:appstate") {
        throw new DOMException("storage is unavailable");
      }
      storageValues.set(key, String(value));
    });

    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(harness.setState).not.toHaveBeenCalled();
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(true);

    setItem.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "保存を再試行する" }));
    await waitFor(() => expect(harness.setState).toHaveBeenCalledOnce());
  });

  it.each([
    [
      "mock",
      () => render(<MockExamPage />),
      /模試を始める/,
      (value: MutableFrozenRunnerFinalization) => {
        value.result = { ...value.result, correct: 0 };
      },
    ],
    [
      "checkpoint",
      () => render(<CheckpointExamRunner checkpointId="cp-technology-foundations" />),
      /チェックポイント試験を始める/,
      (value: MutableFrozenRunnerFinalization) => {
        const [answer] = value.baseState.tagged ?? [];
        if (answer === undefined) throw new Error("missing checkpoint answer");
        answer.isCorrect = false;
        value.result = { ...value.result, correct: 0 };
      },
    ],
    [
      "checkpoint final",
      () => render(<FinalExamPage />),
      /突破試験に挑む/,
      (value: MutableFrozenRunnerFinalization) => {
        const [answer] = value.baseState.answers ?? [];
        if (answer === undefined) throw new Error("missing final answer");
        answer.isCorrect = false;
      },
    ],
  ] as const)("%s rejects a shape-valid result/base frame that disagrees with frozen attempts before every remote replay", async (
    _name,
    renderRunner,
    startName,
    forge,
  ) => {
    installFetch(undefined, {}, undefined, 1);
    renderRunner();
    fireEvent.click(screen.getByRole("button", { name: startName }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    const key = [...storageValues.keys()].find((item) =>
      item.startsWith("fequest:assessmentFinalization:"),
    );
    expect(key).toBeDefined();
    const frozen = JSON.parse(storageValues.get(key!)!) as MutableFrozenRunnerFinalization;
    forge(frozen);
    storageValues.set(key!, JSON.stringify(frozen));
    const attemptCount = requestBodies("/api/question-attempts/save").length;
    const completionCount = requestBodies("/api/assessment-sessions")
      .filter((body) => body.action === "complete").length;
    const progressCount = requestBodies("/api/progress/save").length;

    cleanup();
    renderRunner();

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(requestBodies("/api/question-attempts/save")).toHaveLength(attemptCount);
    expect(requestBodies("/api/assessment-sessions").filter((body) => body.action === "complete"))
      .toHaveLength(completionCount);
    expect(requestBodies("/api/progress/save")).toHaveLength(progressCount);
  });

  it("checkpoint final rejects a forged pass rule before it can replay a forged canonical result", async () => {
    installFetch(undefined, {}, undefined, 1);
    render(<FinalExamPage />);
    fireEvent.click(screen.getByRole("button", { name: /突破試験に挑む/ }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "test-complete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    const key = [...storageValues.keys()].find((item) =>
      item.startsWith("fequest:assessmentFinalization:"),
    );
    expect(key).toBeDefined();
    const frozen = JSON.parse(storageValues.get(key!)!) as {
      baseState: {
        exam: { rule: { passThreshold: number } };
        attempt: { passed: boolean };
      };
      result: { passed: boolean };
    };
    // Keep the browser payload internally self-consistent while changing the
    // externally-defined pass rule. A runner must bind it to checkpoint data.
    frozen.baseState.exam.rule.passThreshold = 0;
    frozen.baseState.attempt.passed = true;
    frozen.result.passed = true;
    storageValues.set(key!, JSON.stringify(frozen));
    const attemptCount = requestBodies("/api/question-attempts/save").length;
    const completionCount = requestBodies("/api/assessment-sessions")
      .filter((body) => body.action === "complete").length;
    const progressCount = requestBodies("/api/progress/save").length;

    cleanup();
    render(<FinalExamPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(requestBodies("/api/question-attempts/save")).toHaveLength(attemptCount);
    expect(requestBodies("/api/assessment-sessions").filter((body) => body.action === "complete"))
      .toHaveLength(completionCount);
    expect(requestBodies("/api/progress/save")).toHaveLength(progressCount);
  });
});
