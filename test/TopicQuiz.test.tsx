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

  it("shows the reason for the selected wrong choice after answering", () => {
    render(
      <TopicQuiz
        topicId="topic-1"
        onComplete={vi.fn()}
        questions={[
          {
            id: "question-with-choice-reason",
            prompt: "誤答理由を表示する問題",
            choices: [
              { key: "A", text: "正解" },
              { key: "B", text: "誤答" },
              { key: "C", text: "別の誤答" },
              { key: "D", text: "さらに別の誤答" },
            ],
            correctChoice: "A",
            explanation: "共通解説",
            choiceExplanations: { B: "Bは条件を満たしていません。" },
            difficulty: 1,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByText(/^誤答$/).closest("button")!);
    expect(screen.getByText("選んだ選択肢が違う理由：Bは条件を満たしていません。")).toBeInTheDocument();
  });
});
