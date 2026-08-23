// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ExamReadinessSummary from "@/components/today/ExamReadinessSummary";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

afterEach(cleanup);

describe("ExamReadinessSummary", () => {
  it("shows the saved primary improvement without independently ranking reasons", () => {
    const result = makeExamReadinessResult({
      confidence: {
        score: 58,
        level: "low",
        reasons: [
          { code: "insufficient_evidence", actual: 20, required: 100 },
        ],
      },
      fields: [
        {
          fieldId: "technology",
          label: "再順位付けなら選ばれる分野",
          score: 20,
          evidenceSufficiency: 80,
          scoreGate: {
            evaluated: true,
            cap: 59,
            reasonCode: "field_score_below_40",
          },
        },
      ],
      weakTopics: [
        {
          topicId: "saved-topic",
          label: "保存済みの次の一歩",
          importance: 1,
          reason: "low_mastery",
          penalty: 0.33,
          penaltyApplied: false,
        },
      ],
      primaryImprovement: {
        code: "review_weak_topic",
        topicId: "saved-topic",
      },
    });

    render(<ExamReadinessSummary result={result} />);

    expect(screen.getByText("78/100")).toBeInTheDocument();
    expect(screen.getByText("準備良好")).toBeInTheDocument();
    expect(screen.getByText(/「保存済みの次の一歩」を復習しましょう/))
      .toBeInTheDocument();
    expect(screen.queryByText(/再順位付けなら選ばれる分野/)).not.toBeInTheDocument();
    expect(screen.queryByText(/回答の根拠がまだ不足/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "今日の合格準備度" }).textContent)
      .not.toMatch(/合格率|合格確率|%/);
  });

  it("shows measuring without inventing a fallback score", () => {
    render(<ExamReadinessSummary result={null} />);

    expect(screen.getByText("測定中")).toBeInTheDocument();
    expect(screen.getByText("判定材料を集めています")).toBeInTheDocument();
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
  });
});
