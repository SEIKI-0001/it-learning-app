// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ActionImpact, TodayPrimaryAction } from "@/types/gameful";
import TodayPrimaryCard from "@/components/today/TodayPrimaryCard";

// GF-P0-001 / GF-P0-002 の受け入れ基準のうち、画面でしか確かめられないもの:
//   - ファーストビューで「今やること」「なぜ」「何分」「何が進む」が読める
//   - 学習効果情報が XP より上位の視覚階層にある
//   - Primary CTA は1つ

afterEach(cleanup);

const TOPIC_ACTION: TodayPrimaryAction = {
  kind: "new_topic",
  topicId: "tech-binary-data",
  title: "2進数とデータ量",
  estimatedMinutes: 7,
  questionCount: null,
  reasonLabel: "次の新規Topic",
  href: "/learn/theme/section/tech-binary-data?from=today#lesson-content",
  activity: "learn",
};

const IMPACTS: ActionImpact[] = [
  { kind: "review_queue", label: "復習キューを1件消化します" },
  { kind: "required_badge", label: "必須バッジ「テクノロジ探訪」の条件を満たします" },
];

describe("first view content", () => {
  it("shows what to do, why, and how long", () => {
    render(<TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={24} />);

    expect(screen.getByText("2進数とデータ量")).toBeInTheDocument();
    expect(screen.getByText("次の新規Topic")).toBeInTheDocument();
    expect(screen.getByText("約7分")).toBeInTheDocument();
  });

  it("labels the kind of study", () => {
    render(<TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={null} />);

    expect(screen.getByText("新規学習")).toBeInTheDocument();
  });

  it("lists what the session will advance", () => {
    render(<TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={null} />);

    const list = screen.getByRole("list");
    expect(within(list).getByText("復習キューを1件消化します")).toBeInTheDocument();
    expect(
      within(list).getByText("必須バッジ「テクノロジ探訪」の条件を満たします"),
    ).toBeInTheDocument();
  });

  it("shows the question count instead of minutes for the final exam", () => {
    render(
      <TodayPrimaryCard
        action={{
          ...TOPIC_ACTION,
          kind: "final_exam",
          topicId: null,
          title: "CP1「全体像把握」の突破試験",
          estimatedMinutes: null,
          questionCount: 6,
          reasonLabel: "必須バッジ 3/3 が揃いました",
          href: "/checkpoint/cp1/final",
        }}
        impacts={[{ kind: "evidence", label: "突破試験の結果を測定データに追加します" }]}
        maxXp={null}
      />,
    );

    expect(screen.getByText("全6問")).toBeInTheDocument();
    expect(screen.getByText("突破試験に挑戦する")).toBeInTheDocument();
  });
});

describe("visual hierarchy", () => {
  it("places the learning impacts above the XP line", () => {
    const { container } = render(
      <TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={24} />,
    );

    const text = container.textContent ?? "";
    const impactIndex = text.indexOf("これが進みます");
    const xpIndex = text.indexOf("XP");

    expect(impactIndex).toBeGreaterThanOrEqual(0);
    expect(xpIndex).toBeGreaterThan(impactIndex);
  });

  it("places the reason above the XP line", () => {
    const { container } = render(
      <TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={24} />,
    );

    const text = container.textContent ?? "";
    expect(text.indexOf("次の新規Topic")).toBeLessThan(text.indexOf("XP"));
  });

  it("renders exactly one call to action", () => {
    render(<TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={24} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("href", TOPIC_ACTION.href);
  });
});

describe("optional pieces", () => {
  it("omits the XP line when no reward can be computed", () => {
    render(<TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={null} />);

    expect(screen.queryByText(/XP/)).toBeNull();
  });

  it("omits the impact block when there is nothing to disclose", () => {
    render(<TodayPrimaryCard action={TOPIC_ACTION} impacts={[]} maxXp={null} />);

    expect(screen.queryByText("これが進みます")).toBeNull();
    expect(screen.getByText("2進数とデータ量")).toBeInTheDocument();
  });

  it("never invents a percentage", () => {
    const { container } = render(
      <TodayPrimaryCard action={TOPIC_ACTION} impacts={IMPACTS} maxXp={24} />,
    );

    expect(container.textContent).not.toMatch(/%/);
  });
});
