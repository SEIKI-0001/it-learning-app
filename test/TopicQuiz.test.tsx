// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TopicQuiz from "@/components/learn/TopicQuiz";
import { subscribeMochitEvent } from "@/components/mochit/mochitEventBus";

const singleQuestion = {
  id: "reaction-question",
  prompt: "リアクションを確認する問題",
  choices: [
    { key: "A" as const, text: "正解の答え" },
    { key: "B" as const, text: "不正解の答え" },
    { key: "C" as const, text: "別の不正解" },
    { key: "D" as const, text: "もう一つの不正解" },
  ],
  correctChoice: "A" as const,
  explanation: "解説",
  difficulty: 1 as const,
};

afterEach(cleanup);

describe("TopicQuiz", () => {
  it("emits correct once immediately after a correct answer", () => {
    const events: string[] = [];
    const unsubscribe = subscribeMochitEvent((signal) =>
      events.push(signal.type),
    );
    render(
      <TopicQuiz
        topicId="topic-1"
        onComplete={vi.fn()}
        questions={[singleQuestion]}
      />,
    );

    fireEvent.click(screen.getByText("正解の答え").closest("button")!);
    unsubscribe();

    expect(events).toEqual(["correct"]);
  });

  it("emits incorrect once immediately after an incorrect answer", () => {
    const events: string[] = [];
    const unsubscribe = subscribeMochitEvent((signal) =>
      events.push(signal.type),
    );
    render(
      <TopicQuiz
        topicId="topic-1"
        onComplete={vi.fn()}
        questions={[singleQuestion]}
      />,
    );

    fireEvent.click(screen.getByText("不正解の答え").closest("button")!);
    unsubscribe();

    expect(events).toEqual(["incorrect"]);
  });

  it("does not emit a second reaction for a double-clicked answer", () => {
    const events: string[] = [];
    const unsubscribe = subscribeMochitEvent((signal) =>
      events.push(signal.type),
    );
    render(
      <TopicQuiz
        topicId="topic-1"
        onComplete={vi.fn()}
        questions={[singleQuestion]}
      />,
    );
    const answer = screen.getByText("正解の答え").closest("button")!;

    fireEvent.click(answer);
    fireEvent.click(answer);
    unsubscribe();

    expect(events).toEqual(["correct"]);
  });

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

  it("completes only once when the finish event is dispatched repeatedly before render", () => {
    const onComplete = vi.fn();
    render(
      <TopicQuiz topicId="topic-1" onComplete={onComplete} questions={[singleQuestion]} />,
    );
    fireEvent.click(screen.getByText("正解の答え").closest("button")!);
    const finish = screen.getByRole("button", { name: "完了する" });

    act(() => {
      finish.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      finish.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("unlocks completion for retry when asynchronous persistence fails", async () => {
    const onComplete = vi.fn()
      .mockRejectedValueOnce(new Error("persistence failed"))
      .mockResolvedValueOnce(undefined);
    render(
      <TopicQuiz topicId="topic-1" onComplete={onComplete} questions={[singleQuestion]} />,
    );
    fireEvent.click(screen.getByText("正解の答え").closest("button")!);

    fireEvent.click(screen.getByRole("button", { name: "完了する" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: "完了する" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "完了する" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "保存しました" })).toBeDisabled();
  });

  it("latches a failed timeout submission until an explicit retry despite callback rerenders", async () => {
    vi.useFakeTimers();
    try {
      const firstComplete = vi.fn().mockRejectedValue(new Error("persistence failed"));
      const { rerender } = render(
        <TopicQuiz
          topicId="topic-1"
          onComplete={firstComplete}
          questions={[singleQuestion]}
          timeLimitSeconds={1}
        />,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(firstComplete).toHaveBeenCalledTimes(1);

      const rerenderedComplete = vi.fn().mockRejectedValue(new Error("still unavailable"));
      rerender(
        <TopicQuiz
          topicId="topic-1"
          onComplete={rerenderedComplete}
          questions={[singleQuestion]}
          timeLimitSeconds={1}
        />,
      );
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
        await vi.runOnlyPendingTimersAsync();
      });
      expect(firstComplete).toHaveBeenCalledTimes(1);
      expect(rerenderedComplete).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "完了する" }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(rerenderedComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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
