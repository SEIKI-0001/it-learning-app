// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  examDateChoiceFromProfile,
  monthsLater,
  resolveExamDateChoice,
} from "@/lib/examDateChoice";
import ExamDateField from "@/components/settings/ExamDateField";

// ペースメーカー: 試験日が未定でも、仮の試験日で今日の量を逆算できるようにする。

afterEach(cleanup);

const TODAY = new Date(2026, 9, 12, 9, 0, 0);

describe("monthsLater", () => {
  it("adds calendar months", () => {
    expect(monthsLater(TODAY, 1)).toBe("2026-11-12");
    expect(monthsLater(TODAY, 3)).toBe("2027-01-12");
  });

  it("clamps to the end of a shorter month", () => {
    expect(monthsLater(new Date(2027, 0, 31), 1)).toBe("2027-02-28");
  });
});

describe("resolveExamDateChoice", () => {
  it("turns a rough period into a decided date", () => {
    expect(resolveExamDateChoice({ kind: "months", months: 2 }, TODAY)).toEqual({
      examDate: "2026-12-12",
      examPlan: "decided",
    });
  });

  it("uses three months later as a provisional date when undecided", () => {
    expect(resolveExamDateChoice({ kind: "undecided" }, TODAY)).toEqual({
      examDate: "2027-01-12",
      examPlan: "provisional",
    });
  });

  it("does not push a saved provisional date forward on every save", () => {
    const current = { examDate: "2026-12-01", examPlan: "provisional" };
    expect(resolveExamDateChoice({ kind: "undecided" }, TODAY, current)).toEqual(current);
  });

  it("keeps a typed date as decided, and no date as before", () => {
    expect(resolveExamDateChoice({ kind: "date", date: "2026-11-30" }, TODAY).examPlan).toBe("decided");
    expect(resolveExamDateChoice(null, TODAY)).toEqual({ examDate: undefined, examPlan: "undecided" });
  });

  it("restores the on-screen choice from a saved profile", () => {
    expect(examDateChoiceFromProfile({ examDate: "2027-01-12", examPlan: "provisional" })).toEqual({ kind: "undecided" });
    expect(examDateChoiceFromProfile({ examDate: "2026-11-30", examPlan: "decided" })).toEqual({ kind: "date", date: "2026-11-30" });
    expect(examDateChoiceFromProfile({ examDate: undefined, examPlan: "undecided" })).toBeNull();
  });
});

describe("ExamDateField", () => {
  it("offers rough periods and passes the chosen one up", () => {
    const onChange = vi.fn();
    render(<ExamDateField choice={{ kind: "undecided" }} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "未定" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/3か月後を仮の試験日にして逆算します/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "2か月後" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "months", months: 2 });
  });

  it("treats a typed date as an exact date", () => {
    const onChange = vi.fn();
    render(<ExamDateField choice={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("日付で指定する"), { target: { value: "2026-11-30" } });
    expect(onChange).toHaveBeenCalledWith({ kind: "date", date: "2026-11-30" });
  });
});
