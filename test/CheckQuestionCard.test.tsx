// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CheckQuestionCard from "@/components/learn/CheckQuestionCard";

afterEach(cleanup);

describe("CheckQuestionCard", () => {
  it("uses compact answer choices to keep the confirmation question short", () => {
    render(
      <CheckQuestionCard
        number={1}
        q={{
          id: "compact-question",
          prompt: "正しい選択肢はどれですか？",
          choices: [
            { key: "A", text: "選択肢A" },
            { key: "B", text: "選択肢B" },
            { key: "C", text: "選択肢C" },
            { key: "D", text: "選択肢D" },
          ],
          correctChoice: "A",
          explanation: "解説です。",
          difficulty: 1,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /選択肢A/ })).toHaveClass(
      "py-2.5",
      "text-sm",
    );
  });
});
