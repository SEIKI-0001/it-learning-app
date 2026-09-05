// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildLearningHeatmap, buildJourneyTimeline } from "@/lib/learningHistory";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { AppState, UserAnswer } from "@/types";
import LearningHeatmap from "@/components/history/LearningHeatmap";
import JourneyTimeline from "@/components/history/JourneyTimeline";

afterEach(cleanup);

const NOW = new Date(2026, 7, 15, 12, 0, 0);

function answer(answeredAt: string): UserAnswer {
  return {
    questionId: `q-${answeredAt}`,
    topicId: "tech-binary-data",
    tag: "tag",
    selectedChoice: "A",
    isCorrect: true,
    answeredAt,
  };
}

describe("heatmap presentation", () => {
  it("marks an unstudied day without any warning colour", () => {
    const heatmap = buildLearningHeatmap({ answers: [], now: NOW });
    const { container } = render(<LearningHeatmap heatmap={heatmap} />);

    // 未学習日は失敗ではない。赤系・警告系のクラスを使わない。
    expect(container.innerHTML).not.toMatch(/bg-red|text-red|bg-accent-6|border-red/);
  });

  it("says plainly that empty days are not marked", () => {
    const heatmap = buildLearningHeatmap({ answers: [], now: NOW });
    const { container } = render(<LearningHeatmap heatmap={heatmap} />);

    expect(container.textContent).toContain("空いている日に印はつけません");
  });

  it("describes each day for screen readers rather than relying on colour", () => {
    const heatmap = buildLearningHeatmap({
      answers: [answer(new Date(2026, 7, 10, 12).toISOString())],
      now: NOW,
    });
    render(<LearningHeatmap heatmap={heatmap} />);

    expect(screen.getByLabelText("10日 1問")).toBeInTheDocument();
    expect(screen.getByLabelText("11日 学習なし")).toBeInTheDocument();
  });

  it("renders one cell per day of the month", () => {
    const heatmap = buildLearningHeatmap({ answers: [], now: NOW });
    render(<LearningHeatmap heatmap={heatmap} />);

    expect(screen.getAllByLabelText(/日 /)).toHaveLength(31);
  });
});

describe("journey timeline presentation", () => {
  function state(overrides: Partial<AppState["progress"]> = {}): AppState {
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
        checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
        ...overrides,
      },
      answers: [],
    };
  }

  it("renders nothing when there is no dated event", () => {
    const { container } = render(<JourneyTimeline events={buildJourneyTimeline(state())} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows an event with a machine-readable date", () => {
    const events = buildJourneyTimeline({
      ...state(),
      answers: [answer(new Date(2026, 6, 1, 12).toISOString())],
    });
    render(<JourneyTimeline events={events} />);

    expect(screen.getByText("学習をはじめた日")).toBeInTheDocument();
    expect(screen.getByText("2026/7/1")).toBeInTheDocument();
  });

  it("limits how many events it shows at once", () => {
    const events = Array.from({ length: 20 }, (_, i) => ({
      kind: "badge" as const,
      at: new Date(2026, 7, i + 1, 12).toISOString(),
      label: `バッジ${i}`,
    }));
    render(<JourneyTimeline events={events} limit={3} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
