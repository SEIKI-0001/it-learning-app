// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { AppState } from "@/types";
import { BADGES } from "@/lib/badges";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

const userSession = vi.hoisted(() => ({
  fetchCurrentExamReadiness: vi.fn(),
  getUserId: vi.fn(() => null),
  loadCachedProgressBootstrap: vi.fn(),
  saveProgressToDb: vi.fn(),
}));
const saveAppState = vi.hoisted(() => vi.fn());

vi.mock("@/lib/userSession", () => userSession);
vi.mock("@/lib/storage", () => ({ saveAppState }));
vi.mock("@/lib/celebration", () => ({
  badgeEarnedCelebrations: () => [],
  emitCelebration: vi.fn(),
}));

import { useBadgeSync } from "@/lib/useBadgeSync";

const HIGH_READINESS_BADGE_ID = "b-cp6-high-readiness";

function stateWithoutHighReadiness(): AppState {
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
        currentCheckpointId: "cp6",
        clearedCheckpointIds: [],
        earnedBadges: BADGES
          .filter((badge) => badge.id !== HIGH_READINESS_BADGE_ID)
          .map((badge) => ({
            badgeId: badge.id,
            earnedAt: "2026-08-22T00:00:00.000Z",
            fromDrop: false,
          })),
        badgeFragments: [],
        finalExamAttempts: [],
        rarePityCount: 0,
      },
    },
    answers: [],
  };
}

function Harness({ state, setState }: {
  state: AppState;
  setState: (next: AppState) => void;
}) {
  useBadgeSync(state, setState);
  return null;
}

describe("useBadgeSync readiness refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userSession.loadCachedProgressBootstrap.mockReturnValue({
      examReadiness: makeExamReadinessResult({
        validUntil: "2026-08-22T00:00:00.000Z",
      }),
    });
  });

  afterEach(() => cleanup());

  it("refreshes current readiness before awarding on direct navigation", async () => {
    userSession.fetchCurrentExamReadiness.mockResolvedValue(
      makeExamReadinessResult({ validUntil: null }),
    );
    const setState = vi.fn();

    render(<Harness state={stateWithoutHighReadiness()} setState={setState} />);

    await waitFor(() => expect(userSession.fetchCurrentExamReadiness).toHaveBeenCalledOnce());
    await waitFor(() => expect(setState).toHaveBeenCalledOnce());
    expect(
      setState.mock.calls[0][0].progress.checkpointProgress.earnedBadges,
    ).toContainEqual(expect.objectContaining({ badgeId: HIGH_READINESS_BADGE_ID }));
  });

  it("does not invent an award when the current-read refresh fails", async () => {
    userSession.fetchCurrentExamReadiness.mockResolvedValue(null);
    const setState = vi.fn();

    render(<Harness state={stateWithoutHighReadiness()} setState={setState} />);

    await waitFor(() => expect(userSession.fetchCurrentExamReadiness).toHaveBeenCalledOnce());
    await act(async () => Promise.resolve());
    expect(setState).not.toHaveBeenCalled();
    expect(saveAppState).not.toHaveBeenCalled();
  });
});
