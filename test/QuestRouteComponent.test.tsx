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
