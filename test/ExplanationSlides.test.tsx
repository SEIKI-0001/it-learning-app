// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ExplanationSlides from "@/components/learn/ExplanationSlides";

afterEach(cleanup);

describe("ExplanationSlides", () => {
  const slides = [
    { id: "one", label: "全体像", content: <p>スライド1</p> },
    { id: "two", label: "ポイント", content: <p>スライド2</p> },
    { id: "three", label: "まとめ", content: <p>スライド3</p> },
  ];

  it("starts on the first slide and moves with navigation controls", () => {
    render(<ExplanationSlides slides={slides} />);

    expect(screen.getByRole("group", { name: "全体像" })).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    expect(
      screen
        .getByTestId("explanation-slides-viewport")
        .querySelector('[aria-label="ポイント"]'),
    ).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "次の解説へ" }));
    expect(screen.getByRole("group", { name: "ポイント" })).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(
      screen
        .getByTestId("explanation-slides-viewport")
        .querySelector('[aria-label="まとめ"]'),
    ).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("button", { name: "次の解説へ" })).toBeDisabled();
  });

  it("changes slides after a horizontal swipe", () => {
    render(<ExplanationSlides slides={slides} />);
    const viewport = screen.getByTestId("explanation-slides-viewport");

    fireEvent.touchStart(viewport, { changedTouches: [{ clientX: 240 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 80 }] });

    expect(
      viewport.querySelector('[aria-label="ポイント"]'),
    ).toHaveAttribute("aria-hidden", "false");
  });

  it("shows the section title and slide labels", () => {
    render(<ExplanationSlides title="📖 解説" slides={slides} />);

    expect(screen.getByRole("heading", { name: "📖 解説" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解説1" })).toHaveTextContent("全体像");
  });
});
