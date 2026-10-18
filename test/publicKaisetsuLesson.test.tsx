// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KaisetsuTopicPage from "@/app/kaisetsu/[id]/page";
import PublicTopicQuiz from "@/components/learn/PublicTopicQuiz";
import TopicContent from "@/components/learn/TopicContent";
import { TOPIC_EXPERIENCES } from "@/components/experiences/registry";
import { getAllTopics, getTopic } from "@/lib/content";
import { getLessonHref } from "@/lib/learningCatalog";
import type { CheckQuestion } from "@/types/content";

// 公開解説（/kaisetsu）の教材本体がアプリのレッスンと同じ部品で描かれ、
// 未ログインでも解答まで進められ、その間に通信も保存もしないこと。

let fetchSpy: ReturnType<typeof vi.fn>;
let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new Error("公開解説から通信してはいけない")));
  vi.stubGlobal("fetch", fetchSpy);
  setItemSpy = vi.spyOn(Storage.prototype, "setItem");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderPage(id: string) {
  return render(await KaisetsuTopicPage({ params: Promise.resolve({ id }) }));
}

describe("public kaisetsu page uses the app lesson", () => {
  it.each(getAllTopics().map((t) => [t.id]))("%s: 教材・確認問題・登録導線を出し、通信しない", async (id) => {
    const topic = getTopic(id)!;
    const { container } = await renderPage(id);

    const lesson = container.querySelector('section.k-lesson[aria-label="教材"]');
    expect(lesson).not.toBeNull();
    if (TOPIC_EXPERIENCES[id]) {
      expect(within(lesson as HTMLElement).getByTestId("experience-slides-viewport")).toBeInTheDocument();
    }
    // 確認問題はアプリと同じ問題（独自問題は全テーマにある）
    expect(screen.getByRole("heading", { name: `確認問題（${topic.checkQuestions.length}問）` })).toBeInTheDocument();
    expect(screen.getByText(`Q1. ${topic.checkQuestions[0].prompt}`)).toBeInTheDocument();

    // 下部の登録導線は、ログイン後にこのテーマのレッスンへ戻す
    const lessonHref = getLessonHref(id, { anchor: "lesson-content" });
    expect(lessonHref.startsWith("/learn/")).toBe(true);
    expect(screen.getByRole("link", { name: "無料で始める" })).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent(lessonHref)}`,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("教材本体はアプリのレッスンと同じ TopicContent の出力そのもの", async () => {
    for (const id of ["strat-swot", "tech-public-key-crypto", "mgmt-project-communication"]) {
      const { container } = await renderPage(id);
      const publicHtml = container.querySelector('section.k-lesson[aria-label="教材"]')!.innerHTML;
      cleanup();
      const app = render(<TopicContent topic={getTopic(id)!} showCheckQuestions={false} />);
      // useId の連番は描画位置で変わるので揃えてから比べる
      const normalize = (html: string) => html.replace(/_r_[a-z0-9]+_/g, "_r_");
      expect(normalize(publicHtml)).toBe(normalize(app.container.innerHTML));
      cleanup();
    }
  });

  it("体験教材が無いテーマでは、文章のおさらいで「イメージをつかむ」を重ねない", async () => {
    const id = "mgmt-project-communication";
    expect(TOPIC_EXPERIENCES[id]).toBeUndefined();
    const topic = getTopic(id)!;
    const { container } = await renderPage(id);
    const recap = container.querySelector(".k-recap")!;
    expect(recap.textContent).not.toContain(topic.conceptCard.body);
    expect(container.querySelector('section.k-lesson[aria-label="教材"]')!.textContent).toContain(
      topic.conceptCard.body,
    );
  });

  it("体験教材のテーマでは、検索で読まれる文章（概要・押さえどころ・試験での問われ方）を残す", async () => {
    const topic = getTopic("strat-swot")!;
    const { container } = await renderPage(topic.id);
    const recap = container.querySelector(".k-recap")!;
    expect(recap.textContent).toContain(topic.conceptCard.body);
    if (topic.examPoint) expect(recap.textContent).toContain(topic.examPoint);
  });

  it("体験教材のテーマでは、図解の言い直しの文章は畳み、試験の補足は開いたまま出す", async () => {
    const topic = getTopic("strat-swot")!;
    const { container } = await renderPage(topic.id);
    const more = container.querySelector(".k-recap details.k-more")!;
    expect(more.hasAttribute("open")).toBe(false);
    expect(more.textContent).toContain(topic.conceptCard.body);
    expect(more.textContent).toContain(topic.explanation.body);
    if (topic.examPoint) expect(more.textContent).not.toContain(topic.examPoint);
  });
});

describe("PublicTopicQuiz", () => {
  function answerAll(questions: CheckQuestion[], correctly: boolean) {
    questions.forEach((q, i) => {
      const correct = q.choices.find((c) => c.key === q.correctChoice)!.text;
      const wrong = q.choices.find((c) => c.key !== q.correctChoice)!.text;
      fireEvent.click(choiceButton(correctly ? correct : wrong));
      fireEvent.click(screen.getByRole("button", { name: i === questions.length - 1 ? "結果を見る" : /次へ/ }));
    });
  }

  it("その場で正誤・解説を出し、結果と登録の案内を見せる（保存も通信もしない）", async () => {
    const topic = getTopic("strat-swot")!;
    const lessonHref = getLessonHref(topic.id, { anchor: "lesson-content" });
    render(<PublicTopicQuiz topicId={topic.id} questions={topic.checkQuestions} lessonHref={lessonHref} />);

    // 1問目に答えると解説が出る。公開ページではAI相談ボタンを出さない
    const first = topic.checkQuestions[0];
    const correct = first.choices.find((c) => c.key === first.correctChoice)!.text;
    fireEvent.click(choiceButton(correct));
    expect(screen.getByText(first.explanation)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /モチットに聞く/ })).toBeNull();
    cleanup();

    render(<PublicTopicQuiz topicId={topic.id} questions={topic.checkQuestions} lessonHref={lessonHref} />);
    answerAll(topic.checkQuestions, true);
    expect(await screen.findByText(`${topic.checkQuestions.length}問中 ${topic.checkQuestions.length}問正解`)).toBeInTheDocument();
    expect(screen.getByText("この学習結果を記録して、合格までの学習を最適化しませんか？")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "無料で登録して記録する" })).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent(lessonHref)}`,
    );

    // もう一度解くと1問目から
    fireEvent.click(screen.getByRole("button", { name: "もう一度解く" }));
    expect(screen.getByText(`Q1. ${topic.checkQuestions[0].prompt}`)).toBeInTheDocument();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("間違えた数もそのまま出す", async () => {
    const topic = getTopic("tech-binary-data")!;
    render(<PublicTopicQuiz topicId={topic.id} questions={topic.checkQuestions} lessonHref="/learn/x" />);
    answerAll(topic.checkQuestions, false);
    expect(await screen.findByText(`${topic.checkQuestions.length}問中 0問正解`)).toBeInTheDocument();
  });
});

/** 選択肢のボタン（表示は「記号＋本文」。本文が完全一致するもの） */
function choiceButton(text: string): HTMLElement {
  const button = screen
    .getAllByRole("button")
    .find((b) => b.querySelector("span.flex-1")?.textContent === text);
  if (!button) throw new Error(`選択肢が見つからない: ${text}`);
  return button;
}
