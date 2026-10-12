// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TodayHero from "@/components/today/TodayHero";
import ComebackMissionCard from "@/components/today/ComebackMissionCard";
import type { PaceBudget } from "@/types/checkpoint";

// GF-P1-001 の中核: 選ばない人に決定を強いない（学習量は /today のヒーロー内で選ぶ）。
// GF-P1-002 の中核: 責めない・通常導線を消さない。

afterEach(cleanup);

function renderPicker(
  selectedMinutes: number | null,
  pace: PaceBudget | null = null,
  provisionalExam = false,
) {
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
      pace={pace}
      provisionalExam={provisionalExam}
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

// ペースメーカー: 試験日から逆算した今日の量を、責めずに1行で伝える。
describe("the pace line", () => {
  const pace = (overrides: Partial<PaceBudget>): PaceBudget => ({
    date: "2026-09-15",
    basis: "2026-10-13|20|60",
    minutes: 45,
    status: "raised",
    daysRemaining: 28,
    computedAt: "2026-09-15T00:00:00.000Z",
    ...overrides,
  });
  const text = () => document.querySelector("header")?.textContent ?? "";

  it("invites setting an exam date when there is none", () => {
    renderPicker(null);
    expect(text()).toContain("試験日を決めると、今日の量を逆算します。");
    expect(screen.getByRole("link", { name: "試験日を決める" }).getAttribute("href")).toBe("/settings");
  });

  it("says the declared time is enough when on pace", () => {
    renderPicker(null, pace({ status: "on_pace", minutes: 20 }));
    expect(text()).toContain("試験まであと28日。このペースで間に合います。");
  });

  it("explains why the automatic amount was raised", () => {
    renderPicker(null, pace({}));
    expect(text()).toContain("間に合わせるため、今日は多めにしています。");
  });

  it("keeps the user's own choice and only states the pace", () => {
    renderPicker(15, pace({}));
    expect(text()).toContain("おまかせなら今日は45分です。");
    expect(text()).not.toContain("多めにしています");
  });

  it("points to the plan instead of piling on when even the cap is not enough", () => {
    renderPicker(null, pace({ status: "over_cap", minutes: 120, daysRemaining: 6 }));
    expect(text()).toContain("頻出テーマから順に進めています。");
    expect(screen.getByRole("link", { name: "計画を見直す" }).getAttribute("href")).toBe("/plan");
  });

  it("marks a provisional exam date", () => {
    renderPicker(null, pace({ status: "on_pace" }), true);
    expect(text()).toContain("試験日は仮で3か月後にしています。");
  });
});
