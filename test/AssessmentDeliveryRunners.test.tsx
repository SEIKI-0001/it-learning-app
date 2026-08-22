// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AppState, UserAnswer } from "@/types";

const harness = vi.hoisted(() => ({
  state: undefined as unknown,
  setState: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: harness.replace }),
  useParams: () => ({ checkpointId: "cp1" }),
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [harness.state, harness.setState],
}));

vi.mock("@/lib/useBadgeSync", () => ({ useBadgeSync: () => undefined }));
vi.mock("@/lib/badgeSignals", () => ({ getClientBadgeSignals: () => undefined }));
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
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }));
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
}

beforeEach(() => {
  harness.state = makeState();
  harness.setState.mockReset();
  harness.replace.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("assessment delivery runners", () => {
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
    expect(await screen.findByText("あと少し！次で突破できます")).toBeInTheDocument();
    const completedSessionId = requestBodies("/api/assessment-sessions")
      .find((body) => body.action === "complete")?.sessionId;

    failures.start = 1;
    fireEvent.click(screen.getByRole("button", { name: "もう一度挑戦する" }));

    expect(screen.getByText("あと少し！次で突破できます")).toBeInTheDocument();
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("開始");
    expect(screen.getByText("あと少し！次で突破できます")).toBeInTheDocument();
    expect(screen.queryByTestId("topic-quiz")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "もう一度挑戦する" }));
    expect(await screen.findByTestId("topic-quiz")).toBeInTheDocument();
    expect(screen.queryByText("あと少し！次で突破できます")).not.toBeInTheDocument();

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
});
