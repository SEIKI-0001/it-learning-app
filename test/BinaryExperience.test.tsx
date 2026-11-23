// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BinaryExperience from "@/components/experiences/BinaryExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("beginner binary lesson", () => {
  it("keeps the units slide open when a photo slider drag bubbles through the deck", () => {
    render(
      <ExperienceSlideDeck>
        <BinaryExperience />
      </ExperienceSlideDeck>,
    );
    for (let i = 0; i < 4; i++) click("次の解説へ");
    const slider = screen.getByLabelText("写真の枚数");
    fireEvent.touchStart(slider, { touches: [{ clientX: 100 }] });
    fireEvent.change(slider, { target: { value: "500" } });
    fireEvent.touchEnd(slider, { changedTouches: [{ clientX: 300 }] });
    expect(screen.getByRole("slider", { name: "写真の枚数" })).toBeVisible();
    expect(
      screen.getByRole("status", { name: "写真のデータ量" }),
    ).toHaveTextContent("2,000 MB = 2 GB");
  });
  it("connects one switch to a bit and allows turning it back off", () => {
    render(<BinaryExperience />);
    const toggle = screen.getByRole("button", { name: "1ビットのスイッチ" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("1");
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("0");
  });
  it("adds place values, handles zero and all four bits, and resets the exercise", () => {
    render(<BinaryExperience />);
    const lab = screen.getByRole("group", { name: "2進数を作る練習" });
    const bit = (weight: number) =>
      within(lab).getByRole("button", { name: `${weight}の位` });
    expect(within(lab).getByRole("status")).toHaveTextContent("0000");
    fireEvent.click(bit(4));
    fireEvent.click(bit(1));
    expect(within(lab).getByRole("status")).toHaveTextContent("0101");
    expect(within(lab).getByRole("status")).toHaveTextContent("4 + 1 = 5");
    fireEvent.click(bit(8));
    fireEvent.click(bit(2));
    expect(within(lab).getByRole("status")).toHaveTextContent(
      "8 + 4 + 2 + 1 = 15",
    );
    click("全部0に戻す");
    expect(within(lab).getByRole("status")).toHaveTextContent("0000");
  });
  it("explains a wrong answer and lets the learner correct it", () => {
    render(<BinaryExperience />);
    click("2個だから2");
    expect(
      screen.getByRole("status", { name: "読み方の答え合わせ" }),
    ).toHaveTextContent("1の個数");
    click("8 + 2で10");
    expect(
      screen.getByRole("status", { name: "読み方の答え合わせ" }),
    ).toHaveTextContent("正解");
  });
  it("converts MB in both directions and distinguishes bit from Byte", () => {
    render(<BinaryExperience />);
    const amount = screen.getByLabelText("写真の枚数");
    fireEvent.change(amount, { target: { value: "500" } });
    expect(
      screen.getByRole("status", { name: "写真のデータ量" }),
    ).toHaveTextContent("2,000 MB = 2 GB");
    fireEvent.change(amount, { target: { value: "1" } });
    expect(
      screen.getByRole("status", { name: "写真のデータ量" }),
    ).toHaveTextContent("4 MB = 0.004 GB");
    click("16ビット");
    expect(
      screen.getByRole("status", { name: "単位の答え合わせ" }),
    ).toHaveTextContent("正解");
  });
  it("preserves state when moving through the existing slide deck", () => {
    render(
      <ExperienceSlideDeck>
        <BinaryExperience />
      </ExperienceSlideDeck>,
    );
    click("1ビットのスイッチ");
    click("次の解説へ");
    expect(
      screen.queryByRole("button", { name: "1ビットのスイッチ" }),
    ).not.toBeInTheDocument();
    click("前の解説へ");
    expect(
      screen.getByRole("button", { name: "1ビットのスイッチ" }),
    ).toHaveAttribute("aria-pressed", "true");
    for (let i = 0; i < 5; i++) click("次の解説へ");
    expect(
      screen.getByRole("heading", { name: /覚えるのは、この3つ/ }),
    ).toBeInTheDocument();
  });
});
