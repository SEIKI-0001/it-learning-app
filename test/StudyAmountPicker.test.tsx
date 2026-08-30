// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudyAmountPicker from "@/components/today/StudyAmountPicker";
import ComebackMissionCard from "@/components/today/ComebackMissionCard";

// GF-P1-001 の中核: 選ばない人に決定を強いない。
// GF-P1-002 の中核: 責めない・通常導線を消さない。

afterEach(cleanup);

function renderPicker(selectedMinutes: number | null) {
  const onSelect = vi.fn();
  const onClear = vi.fn();
  const { container } = render(
    <StudyAmountPicker
      selectedMinutes={selectedMinutes}
      defaultMinutes={20}
      onSelect={onSelect}
      onClear={onClear}
    />,
  );
  return { onSelect, onClear, container };
}

describe("the default is already answered", () => {
  it("shows the automatic option as selected when nothing was chosen", () => {
    renderPicker(null);

    expect(screen.getByText(/おまかせ/).getAttribute("aria-pressed")).toBe("true");
  });

  it("tells the user how much the automatic option means", () => {
    renderPicker(null);

    expect(screen.getByText("おまかせ（20分）")).toBeInTheDocument();
  });

  it("leaves every explicit amount unselected by default", () => {
    renderPicker(null);

    for (const label of ["5分", "15分", "30分"]) {
      expect(screen.getByText(label).getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("never marks the longest amount as the default", () => {
    renderPicker(null);

    expect(screen.getByText("30分").getAttribute("aria-pressed")).toBe("false");
  });

  it("asks no question and demands no confirmation", () => {
    const { container } = renderPicker(null);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/\?|選んでください|決めて|必須/);
  });
});

describe("choosing and undoing", () => {
  it("reports the chosen amount", () => {
    const { onSelect } = renderPicker(null);
    fireEvent.click(screen.getByText("15分"));

    expect(onSelect).toHaveBeenCalledWith(15);
  });

  it("marks the chosen amount as selected", () => {
    renderPicker(5);

    expect(screen.getByText("5分").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/おまかせ/).getAttribute("aria-pressed")).toBe("false");
  });

  it("can return to the automatic option", () => {
    const { onClear } = renderPicker(30);
    fireEvent.click(screen.getByText(/おまかせ/));

    expect(onClear).toHaveBeenCalled();
  });

  it("styles every amount the same way", () => {
    const { container } = renderPicker(null);
    const classes = ["5分", "15分", "30分"].map(
      (label) => screen.getByText(label).className,
    );

    expect(new Set(classes).size).toBe(1);
    expect(container.textContent).not.toMatch(/おすすめ|推奨/);
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
