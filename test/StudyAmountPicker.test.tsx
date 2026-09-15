// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TodayHero from "@/components/today/TodayHero";
import ComebackMissionCard from "@/components/today/ComebackMissionCard";

// GF-P1-001 の中核: 選ばない人に決定を強いない（学習量は /today のヒーロー内で選ぶ）。
// GF-P1-002 の中核: 責めない・通常導線を消さない。

afterEach(cleanup);

function renderPicker(selectedMinutes: number | null) {
  const onSelect = vi.fn();
  const onClear = vi.fn();
  render(
    <TodayHero
      dateLabel="9月15日（火）"
      slots={[]}
      selectedMinutes={selectedMinutes}
      defaultMinutes={20}
      onSelectMinutes={onSelect}
      onClearMinutes={onClear}
    />,
  );
  const group = screen.getByRole("group", { name: "今日の学習量" });
  const button = (name: string | RegExp) => within(group).getByRole("button", { name });
  return { onSelect, onClear, group, button };
}

describe("the default is already answered", () => {
  it("shows the automatic option as selected when nothing was chosen", () => {
    const { button } = renderPicker(null);

    expect(button(/おまかせ/).getAttribute("aria-pressed")).toBe("true");
  });

  it("tells the user how much the automatic option means", () => {
    const { button } = renderPicker(null);

    expect(button(/おまかせ/).textContent).toBe("おまかせ 20分");
  });

  it("leaves every explicit amount unselected by default", () => {
    const { button } = renderPicker(null);

    for (const label of ["5分", "15分", "30分"]) {
      expect(button(label).getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("never marks the longest amount as the default", () => {
    const { button } = renderPicker(null);

    expect(button("30分").getAttribute("aria-pressed")).toBe("false");
  });

  it("asks no question and demands no confirmation", () => {
    const { group } = renderPicker(null);
    const text = group.textContent ?? "";

    expect(text).not.toMatch(/\?|選んでください|決めて|必須/);
  });
});

describe("choosing and undoing", () => {
  it("reports the chosen amount", () => {
    const { onSelect, button } = renderPicker(null);
    fireEvent.click(button("15分"));

    expect(onSelect).toHaveBeenCalledWith(15);
  });

  it("marks the chosen amount as selected", () => {
    const { button } = renderPicker(5);

    expect(button("5分").getAttribute("aria-pressed")).toBe("true");
    expect(button(/おまかせ/).getAttribute("aria-pressed")).toBe("false");
  });

  it("can return to the automatic option", () => {
    const { onClear, button } = renderPicker(30);
    fireEvent.click(button(/おまかせ/));

    expect(onClear).toHaveBeenCalled();
  });

  it("styles every amount the same way", () => {
    const { group, button } = renderPicker(null);
    const classes = ["5分", "15分", "30分"].map((label) => button(label).className);

    expect(new Set(classes).size).toBe(1);
    expect(group.textContent).not.toMatch(/おすすめ|推奨/);
  });
});

describe("the comeback card does not blame", () => {
  const mission = {
    daysAway: 5,
    items: [
      { topicId: "tech-binary-data", title: "2進数とデータ量", estimatedMinutes: 3 },
    ],
    totalMinutes: 3,
  };

  it("greets rather than scolds", () => {
    const { container } = render(<ComebackMissionCard mission={mission} />);
    const text = container.textContent ?? "";

    expect(text).toContain("おかえりなさい");
    expect(text).not.toMatch(/サボ|遅れ|失敗|途切れ|ダメ|久しく怠/);
  });

  it("states the gap once, as a fact", () => {
    render(<ComebackMissionCard mission={mission} />);

    expect(screen.getByText(/5日ぶりです/)).toBeInTheDocument();
  });

  it("keeps the normal route available", () => {
    const { container } = render(<ComebackMissionCard mission={mission} />);

    expect(container.textContent).toContain("やらなくても大丈夫です");
    expect(container.textContent).toContain("今日のルート");
  });

  it("offers a short, concrete restart", () => {
    render(<ComebackMissionCard mission={mission} />);

    expect(screen.getByText(/約3分だけ思い出す/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      expect.stringContaining("tech-binary-data"),
    );
  });

  it("shows no penalty or deadline", () => {
    const { container } = render(<ComebackMissionCard mission={mission} />);

    expect(container.textContent).not.toMatch(/期限|失う|ペナルティ|減少/);
  });
});
