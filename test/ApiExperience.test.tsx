// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ApiExperience from "@/components/experiences/ApiExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderFlow() {
  render(
    <ExperienceSlideDeck>
      <ApiExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const capsule = () => screen.getByTestId("api-capsule");
const next = () => fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));

describe("ApiExperience", () => {
  it("keeps the restaurant analogy, the flow and the quiz", () => {
    render(
      <ExperienceSlideDeck>
        <ApiExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("注文口＝API")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(screen.getByText("アプリのボタンの色を変える")).toBeInTheDocument();
  });

  it("sends GET /weather through the API and shows the response in the app", () => {
    renderFlow();
    expect(screen.getByText("🧑‍🍳 注文口 ＝ API")).toBeInTheDocument();
    expect(capsule()).toHaveTextContent("GET /weather");
    expect(capsule()).toHaveAttribute("data-stop", "app");

    next();
    expect(screen.getByTestId("api-route")).toHaveTextContent("App → API");
    expect(capsule()).toHaveAttribute("data-stop", "apiIn");
    next();
    expect(capsule()).toHaveAttribute("data-stop", "svc");
    next();
    expect(capsule()).toHaveTextContent("{ temperature: 25 }");
    expect(capsule()).toHaveAttribute("data-capsule-kind", "response");
    next();
    expect(capsule()).toHaveAttribute("data-stop", "appBack");
    expect(screen.getByTestId("app-screen")).toHaveTextContent("25℃");
  });

  it("direct access to the service internals is blocked (only the API is the entrance)", () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: "🚫 APIを通さず、内部に直接アクセスしてみる" }));
    expect(screen.getByTestId("api-scene")).toHaveAttribute("data-bypass", "true");
    expect(capsule()).toHaveAttribute("data-stop", "wall");
    expect(screen.getByTestId("bypass-denied")).toHaveTextContent("入口は API だけ");

    fireEvent.click(screen.getByRole("button", { name: "↩ 正しいルート（API経由）に戻す" }));
    expect(screen.queryByTestId("bypass-denied")).toBeNull();
  });
});
