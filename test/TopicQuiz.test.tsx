// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TopicQuiz from "@/components/learn/TopicQuiz";

describe("TopicQuiz", () => {
  it("records the per-question topic for checkpoint-style mixed-topic quizzes", () => {
    const onComplete = vi.fn();
    render(
      <TopicQuiz
        topicId="checkpoint"
        topicIdForQuestion={() => "tech-binary-data"}
        completeLabel="結果を見る"
        onComplete={onComplete}
        questions={[
          {
            id: "question-1",
            prompt: "正しい選択肢を選ぶ",
            choices: [
              { key: "A", text: "正解の選択肢" },
              { key: "B", text: "誤答の選択肢1" },
              { key: "C", text: "誤答の選択肢2" },
              { key: "D", text: "誤答の選択肢3" },
            ],
            correctChoice: "A",
            explanation: "解説",
            difficulty: 1,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /正解の選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0][0][0]).toEqual(
      expect.objectContaining({ questionId: "question-1", topicId: "tech-binary-data" }),
    );
  });
});
