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

    const viewport = screen.getByTestId("explanation-slides-viewport");
    expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3);
    expect(screen.getByText("スライド1")).toBeInTheDocument();
    expect(viewport.querySelector('[aria-label="ポイント"]')).toHaveClass("opacity-0");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "次の解説へ" }));
    expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3);
    expect(viewport.querySelector('[aria-label="全体像"]')).toHaveClass("opacity-0");
    expect(screen.getByText("スライド2")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3);
    expect(screen.getByText("スライド3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次の解説へ" })).toBeDisabled();
  });

  it("changes slides after a horizontal swipe", () => {
    render(<ExplanationSlides slides={slides} />);
    const viewport = screen.getByTestId("explanation-slides-viewport");

    fireEvent.touchStart(viewport, { changedTouches: [{ clientX: 240 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 80 }] });

    expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3);
    expect(screen.getByText("スライド2")).toBeInTheDocument();
  });

  it("keeps every slide mounted to reserve the tallest slide height", () => {
    render(<ExplanationSlides slides={slides} />);
    const viewport = screen.getByTestId("explanation-slides-viewport");
    const inactiveSlide = viewport.querySelector('[aria-label="ポイント"]');

    expect(viewport.querySelectorAll('[role="group"]')).toHaveLength(3);
    expect(screen.getByRole("group", { name: "全体像" })).toBeVisible();
    expect(inactiveSlide).toHaveAttribute("aria-hidden", "true");
    expect(inactiveSlide).toHaveClass("pointer-events-none");
    expect(screen.queryByRole("group", { name: "ポイント" })).not.toBeInTheDocument();
  });

  it("moves with arrow keys only while the explanation viewport has focus", () => {
    render(<ExplanationSlides slides={slides} />);
    const viewport = screen.getByTestId("explanation-slides-viewport");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    viewport.focus();
    expect(viewport).toHaveFocus();
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    viewport.focus();
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    screen.getByRole("button", { name: "次の解説へ" }).focus();
    expect(viewport).not.toHaveFocus();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("does not navigate when an active slide descendant has focus", () => {
    const slidesWithButton = [
      { id: "one", label: "全体像", content: <button type="button">操作</button> },
      { id: "two", label: "ポイント", content: <p>スライド2</p> },
    ];

    render(<ExplanationSlides slides={slidesWithButton} />);
    const viewport = screen.getByTestId("explanation-slides-viewport");
    const button = screen.getByRole("button", { name: "操作" });

    button.focus();
    expect(button).toHaveFocus();
    fireEvent.keyDown(button, { key: "ArrowRight" });

    expect(viewport).not.toHaveFocus();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("shows the section title and slide labels", () => {
    render(<ExplanationSlides title="📖 解説" slides={slides} />);

    expect(screen.getByRole("heading", { name: "📖 解説" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解説1" })).toHaveTextContent("全体像");
  });
});
