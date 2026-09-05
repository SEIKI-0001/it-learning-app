// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuestRoute from "@/components/quest/QuestRoute";

afterEach(cleanup);

describe("QuestRoute current location", () => {
  it("marks the current node without rendering an embedded Mochit", () => {
    render(
      <QuestRoute
        nodes={[
          {
            topicId: "topic-current",
            title: "現在のレッスン",
            estimatedMinutes: 5,
            activity: "learn",
            state: "current",
          },
          {
            topicId: "topic-next",
            title: "次のレッスン",
            estimatedMinutes: 5,
            activity: "learn",
            state: "up_next",
          },
        ]}
        hrefFor={(node) => `/learn/${node.topicId}`}
        finalReward={{
          progressLabel: "0/3 達成",
          xp: 10,
          state: "locked",
          onClaim: vi.fn(),
        }}
      />,
    );

    expect(screen.getByLabelText("現在地")).toBeInTheDocument();
    expect(screen.getByText("いま挑戦中")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /モチット/ }),
    ).not.toBeInTheDocument();
  });
});

// GF-P0-001「ファーストビューの Primary CTA は原則1つ」。
// 現在ノードが「今日の最優先」と同じ行動なら、ルート側に同じ開始ボタンを重ねない。
describe("no duplicate primary CTA", () => {
  const NODES = [
    {
      topicId: "topic-current",
      title: "現在のレッスン",
      estimatedMinutes: 5,
      activity: "learn" as const,
      state: "current" as const,
    },
    {
      topicId: "topic-next",
      title: "次のレッスン",
      estimatedMinutes: 5,
      activity: "learn" as const,
      state: "up_next" as const,
    },
  ];
  const REWARD = { progressLabel: "0/3 達成", xp: 10, state: "locked" as const, onClaim: vi.fn() };
  const hrefFor = (node: { topicId: string }) => `/learn/${node.topicId}`;

  it("drops its own start button when the current node is the primary action", () => {
    render(
      <QuestRoute
        nodes={NODES}
        hrefFor={hrefFor}
        primaryHref="/learn/topic-current"
        finalReward={REWARD}
      />,
    );

    expect(screen.queryByRole("link", { name: "学習を始める" })).toBeNull();
    // 現在地としての表示と、開始導線の在り処は残す。
    expect(screen.getByText("いま挑戦中")).toBeInTheDocument();
    expect(screen.getByText("上の「今日の最優先」から始められます")).toBeInTheDocument();
  });

  it("keeps its start button when the primary action points elsewhere", () => {
    render(
      <QuestRoute
        nodes={NODES}
        hrefFor={hrefFor}
        primaryHref="/checkpoint/cp1/final"
        finalReward={REWARD}
      />,
    );

    expect(screen.getByRole("link", { name: "学習を始める" })).toBeInTheDocument();
    expect(screen.queryByText("上の「今日の最優先」から始められます")).toBeNull();
  });

  it("keeps its start button when no primary action is given", () => {
    render(<QuestRoute nodes={NODES} hrefFor={hrefFor} finalReward={REWARD} />);

    expect(screen.getByRole("link", { name: "学習を始める" })).toBeInTheDocument();
  });

  it("still offers the AI grading link on the suppressed node", () => {
    render(
      <QuestRoute
        nodes={NODES}
        hrefFor={hrefFor}
        primaryHref="/learn/topic-current"
        aiGradingHrefFor={() => "/ai-grading?topicId=topic-current"}
        finalReward={REWARD}
      />,
    );

    expect(
      screen.getByRole("link", { name: "自分の言葉で説明する" }),
    ).toBeInTheDocument();
  });
});
