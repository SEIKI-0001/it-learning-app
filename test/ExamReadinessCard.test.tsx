// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ExamReadinessCard from "@/components/progress/ExamReadinessCard";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

afterEach(cleanup);

describe("ExamReadinessCard", () => {
  it("shows the shared score, components, fields, confidence, caps, and Weak top-five markers", () => {
    const weakTopics = Array.from({ length: 6 }, (_, index) => ({
      topicId: index === 0 ? "tech-network" : `topic-${index + 1}`,
      label: index === 0 ? "ネットワーク基礎" : `弱点${index + 1}`,
      importance: 3,
      reason: "repeated_incorrect" as const,
      penalty: 1.25,
      penaltyApplied: index < 5,
    }));
    const result = makeExamReadinessResult({
      score: 59,
      band: "measuring",
      confidence: {
        score: 58,
        level: "low",
        reasons: [
          {
            code: "insufficient_field_evidence",
            fieldId: "technology",
            actual: 39,
            required: 60,
          },
        ],
      },
      fields: [
        {
          fieldId: "technology",
          label: "テクノロジ",
          score: 39,
          evidenceSufficiency: 39,
          scoreGate: {
            evaluated: true,
            cap: 59,
            reasonCode: "field_score_below_40",
          },
        },
      ],
      calculation: {
        baseScore: 71,
        weakTopicPenalty: 6.25,
        preGateScore: 64.75,
        appliedCaps: [
          {
            type: "field",
            fieldId: "technology",
            cap: 59,
            reasonCode: "field_score_below_40",
          },
          { type: "confidence", cap: 59, reasonCode: "low_confidence" },
        ],
      },
      weakTopics,
    });

    render(<ExamReadinessCard result={result} />);

    expect(screen.getByText("59/100")).toBeInTheDocument();
    expect(screen.getByText("測定中")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "合格準備度" })).toHaveAttribute(
      "aria-valuenow",
      "59",
    );

    const components = screen.getByRole("group", { name: "準備度の構成要素" });
    expect(within(components).getByText("初回回答")).toBeInTheDocument();
    expect(within(components).getByText("81/100")).toBeInTheDocument();
    expect(within(components).getByText("本番形式")).toBeInTheDocument();
    expect(within(components).getByText("74/100")).toBeInTheDocument();
    expect(within(components).getByText("トピック習熟")).toBeInTheDocument();
    expect(within(components).getByText("定着")).toBeInTheDocument();
    expect(within(components).getByText("評価範囲")).toBeInTheDocument();

    expect(screen.getByText("テクノロジ")).toBeInTheDocument();
    const fieldValue = screen.getByText("39/100").closest("dd");
    expect(fieldValue).not.toBeNull();
    expect(within(fieldValue!).getByText("根拠 39/100")).toBeInTheDocument();
    expect(screen.getByText("信頼度 58/100（低）")).toBeInTheDocument();
    expect(screen.getByText("テクノロジの根拠がまだ不足しています（39/60）"))
      .toBeInTheDocument();
    expect(screen.getByText("テクノロジの分野ゲート：上限59/100"))
      .toBeInTheDocument();
    expect(screen.getByText("信頼度ゲート：上限59/100")).toBeInTheDocument();

    expect(screen.getAllByText("減点対象（上位5件）")).toHaveLength(5);
    expect(screen.getByText("参考")).toBeInTheDocument();
    expect(screen.getByText("弱点6")).toBeInTheDocument();
    expect(screen.getByText(/「ネットワーク基礎」を復習しましょう/))
      .toBeInTheDocument();
    expect(screen.getByRole("region", { name: "合格準備度の詳細" }).textContent)
      .not.toMatch(/合格率|合格確率|%/);
  });

  it("keeps null and unavailable results in a measuring state", () => {
    const measuring = makeExamReadinessResult({
      score: null,
      band: "measuring",
      confidence: {
        score: 12,
        level: "low",
        reasons: [
          { code: "insufficient_evidence", actual: 12, required: 100 },
        ],
      },
      primaryImprovement: { code: "collect_more_evidence" },
    });

    const view = render(<ExamReadinessCard result={measuring} />);
    expect(screen.getAllByText("測定中").length).toBeGreaterThan(0);
    expect(screen.getByText("回答の根拠がまだ不足しています（12/100）"))
      .toBeInTheDocument();

    view.rerender(<ExamReadinessCard result={null} />);
    expect(screen.getByText("判定材料を集めています")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "合格準備度" }))
      .not.toBeInTheDocument();
  });
});
