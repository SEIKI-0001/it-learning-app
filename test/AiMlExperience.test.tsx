// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AiMlExperience from "@/components/experiences/AiMlExperience";
import { BOUNDARY_FINAL, BOUNDARY_ROUGH, EXAMPLES, isCatSide, predict, UNKNOWNS } from "@/components/experiences/aiml/LearningScene";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderFlow() {
  render(
    <ExperienceSlideDeck>
      <AiMlExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const scene = () => screen.getByTestId("ml-scene");

describe("AiMlExperience", () => {
  it("keeps the nesting, supervised/unsupervised and reinforcement slides", () => {
    render(
      <ExperienceSlideDeck>
        <AiMlExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("言葉の大きさを整理")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("教師あり学習")).toBeInTheDocument();
    expect(screen.getByText("教師なし学習")).toBeInTheDocument();
    click("解説4");
    expect(screen.getByText("やってみて学ぶタイプ")).toBeInTheDocument();
  });

  it("the model starts empty and is built from the labelled examples", () => {
    renderFlow();
    expect(scene()).toHaveAttribute("data-learned", "0");
    expect(screen.queryByTestId("ml-boundary")).toBeNull();
    expect(screen.getByText("まだ知らない", { exact: false })).toBeInTheDocument();
    next();
    expect(scene()).toHaveAttribute("data-learned", "3");
    expect(screen.getByTestId("ml-boundary")).toHaveAttribute("data-angle", String(BOUNDARY_ROUGH.angle));
    expect(screen.getByTestId("ml-score")).toHaveTextContent("2/3");
    next();
    expect(scene()).toHaveAttribute("data-learned", "8");
    expect(screen.getByTestId("ml-boundary")).toHaveAttribute("data-angle", String(BOUNDARY_FINAL.angle));
    expect(screen.getByTestId("ml-score")).toHaveTextContent("8/8");
    expect(screen.getByTestId("ml-phase")).toHaveAttribute("data-phase", "1");
  });

  it("the rough boundary really misclassifies one example and the final one separates all", () => {
    const wrongRough = EXAMPLES.slice(0, 3).filter((e) => isCatSide(BOUNDARY_ROUGH, e.fx, e.fy) !== (e.kind === "cat"));
    expect(wrongRough).toHaveLength(1);
    expect(EXAMPLES.every((e) => isCatSide(BOUNDARY_FINAL, e.fx, e.fy) === (e.kind === "cat"))).toBe(true);
  });

  it("an unseen photo goes into the model and is predicted as 犬 92%", () => {
    renderFlow();
    for (let i = 0; i < 4; i++) next();
    expect(screen.getByTestId("ml-unknown")).toHaveAttribute("data-in", "true");
    expect(screen.getByTestId("ml-result")).toHaveAttribute("data-show", "false");
    next();
    expect(screen.getByTestId("ml-result")).toHaveTextContent("犬 92%");
    expect(screen.getByTestId("ml-insight")).toHaveTextContent("データからモデル");
  });

  it("changing the photo changes the prediction and its confidence", () => {
    renderFlow();
    for (let i = 0; i < 5; i++) next();
    click(/写真B/);
    expect(screen.getByTestId("ml-result")).toHaveAttribute("data-kind", "cat");
    click(/写真C/);
    expect(screen.getByTestId("ml-result")).toHaveTextContent("自信が低い");
    const c = predict(UNKNOWNS[2]);
    expect(c.pct).toBeLessThan(70);
  });
});
