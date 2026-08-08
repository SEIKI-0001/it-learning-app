// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TopicQuiz from "@/components/learn/TopicQuiz";
import type { CheckQuestion } from "@/types/content";

// ============================================================================
// 確認パックで公式問題を出したときの表示。
// ----------------------------------------------------------------------------
// 公式問題では次を必ず満たす:
//   - 選択肢を並び替えない（公式の並びそのものが出題の一部）
//   - 図表を問題文と選択肢の間に出す
//   - 年度・問番号・出典を出す
//   - 「問題文・選択肢はIPA公開問題／解説は本サービス独自」と明示する
// アプリ独自問題は従来どおり並び替える。
// ============================================================================

const CHOICES: CheckQuestion["choices"] = [
  { key: "A", text: "選択肢アの本文" },
  { key: "B", text: "選択肢イの本文" },
  { key: "C", text: "選択肢ウの本文" },
  { key: "D", text: "選択肢エの本文" },
];

const officialQuestion: CheckQuestion = {
  id: "ipa-it-passport-2026-q007",
  prompt: "公式問題の問題文",
  choices: CHOICES,
  correctChoice: "A",
  explanation: "本サービス独自の解説",
  difficulty: 2,
  origin: "official_past",
  version: 1,
  shuffleChoices: false,
  official: {
    attribution: "出典：令和8年度 ITパスポート試験 公開問題 問7",
    sourceUrl: "https://example.test/questions.pdf",
    answerSourceUrl: "https://example.test/answers.pdf",
    year: 2026,
    questionNumber: 7,
  },
  figures: [
    {
      id: "q007-figure-1",
      kind: "image",
      src: "/question-bank/q007-figure-1.png",
      alt: "投資戦略ごとの予想利益を示す表",
    },
  ],
};

const originalQuestion: CheckQuestion = {
  id: "exam-level-001",
  prompt: "アプリ独自問題の問題文",
  choices: CHOICES,
  correctChoice: "A",
  explanation: "解説",
  difficulty: 2,
};

/** 表示されている選択肢の本文を、画面上の並び順で取り出す。 */
function renderedChoiceTexts(): string[] {
  return CHOICES.map((c) => c.text).sort(
    (a, b) =>
      screen.getByText(a).compareDocumentPosition(screen.getByText(b)) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("確認パックの公式問題表示", () => {
  it("選択肢を並び替えない", () => {
    // シャッフルが走れば必ず並びが変わる乱数を固定する（下の対照実験で確認している）。
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(
      <TopicQuiz topicId="topic-1" onComplete={vi.fn()} questions={[officialQuestion]} />,
    );

    expect(renderedChoiceTexts()).toEqual([
      "選択肢アの本文",
      "選択肢イの本文",
      "選択肢ウの本文",
      "選択肢エの本文",
    ]);
  });

  it("アプリ独自問題は従来どおり並び替える", () => {
    // 対照実験。同じ乱数でこちらは並びが変わる＝上のテストが「並び替えない」を見ている。
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(
      <TopicQuiz topicId="topic-1" onComplete={vi.fn()} questions={[originalQuestion]} />,
    );

    expect(renderedChoiceTexts()).not.toEqual([
      "選択肢アの本文",
      "選択肢イの本文",
      "選択肢ウの本文",
      "選択肢エの本文",
    ]);
  });

  it("図表を問題文と選択肢の間に出す", () => {
    render(
      <TopicQuiz topicId="topic-1" onComplete={vi.fn()} questions={[officialQuestion]} />,
    );

    const figure = screen.getByAltText("投資戦略ごとの予想利益を示す表");
    const prompt = screen.getByText(/公式問題の問題文/);
    const firstChoice = screen.getByText("選択肢アの本文");

    // 問題文 → 図表 → 選択肢 の順で並んでいる。
    expect(
      prompt.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      figure.compareDocumentPosition(firstChoice) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("年度・問番号・出典を出す", () => {
    render(
      <TopicQuiz topicId="topic-1" onComplete={vi.fn()} questions={[officialQuestion]} />,
    );

    expect(screen.getByText("2026年度 公開問題 問7")).toBeInTheDocument();
    expect(
      screen.getByText("出典：令和8年度 ITパスポート試験 公開問題 問7"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("問題文・選択肢はIPA公開問題です。解説は本サービス独自のものです。"),
    ).toBeInTheDocument();
    expect(screen.getByText("IPA公式PDF（問題）を開く")).toHaveAttribute(
      "href",
      "https://example.test/questions.pdf",
    );
  });

  it("アプリ独自問題には出典も図表も出さない", () => {
    render(
      <TopicQuiz topicId="topic-1" onComplete={vi.fn()} questions={[originalQuestion]} />,
    );

    expect(
      screen.queryByText("問題文・選択肢はIPA公開問題です。解説は本サービス独自のものです。"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
