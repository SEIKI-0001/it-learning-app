import { describe, expect, it } from "vitest";
import {
  confidenceReasonLabel,
  primaryImprovementLabel,
  readinessBandLabel,
  readinessFieldLabel,
  readinessResultLabel,
  readinessScoreLabel,
} from "@/lib/examReadiness/presentation";
import type {
  ReadinessBand,
  ReadinessConfidenceReason,
} from "@/types/examReadiness";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

describe("Exam Readiness presentation", () => {
  it.each<[ReadinessBand, string]>([
    ["measuring", "測定中"],
    ["needs_work", "要強化"],
    ["approaching", "あと一歩"],
    ["ready", "準備良好"],
    ["stable", "安定"],
  ])("labels the %s band in Japanese", (band, expected) => {
    expect(readinessBandLabel(band)).toBe(expected);
  });

  it.each<[ReadinessConfidenceReason, string]>([
    [
      { code: "insufficient_evidence", actual: 42, required: 100 },
      "回答の根拠がまだ不足しています（42/100）",
    ],
    [
      { code: "insufficient_coverage", actual: 35, required: 60 },
      "評価できた範囲がまだ不足しています（35/60）",
    ],
    [
      {
        code: "insufficient_field_evidence",
        fieldId: "technology",
        actual: 39,
        required: 60,
      },
      "テクノロジの根拠がまだ不足しています（39/60）",
    ],
    [
      { code: "insufficient_summative_sessions", actual: 1, required: 3 },
      "本番形式テストの完了回数がまだ不足しています（1/3回）",
    ],
  ])("labels the $code confidence reason", (reason, expected) => {
    expect(confidenceReasonLabel(reason)).toBe(expected);
  });

  it("uses saved field and Topic labels for every primary improvement", () => {
    const result = makeExamReadinessResult({
      fields: [
        {
          fieldId: "custom-field",
          label: "保存済み分野名",
          score: 38,
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
          topicId: "custom-topic",
          label: "保存済みトピック名",
          importance: 3,
          reason: "low_mastery",
          penalty: 1,
          penaltyApplied: true,
        },
      ],
    });

    expect(primaryImprovementLabel({ code: "collect_more_evidence" }, result))
      .toBe("問題に答えて、判定材料を増やしましょう");
    expect(primaryImprovementLabel({ code: "improve_field", fieldId: "custom-field" }, result))
      .toBe("「保存済み分野名」の問題を優先しましょう");
    expect(primaryImprovementLabel({ code: "review_weak_topic", topicId: "custom-topic" }, result))
      .toBe("「保存済みトピック名」を復習しましょう");
    expect(primaryImprovementLabel({ code: "improve_retention" }, result))
      .toBe("期限の来た復習に取り組みましょう");
    expect(primaryImprovementLabel({
      code: "improve_retention",
      topicId: "strat-swot",
    }, result)).toBe("「SWOT分析」の期限の来た復習に取り組みましょう");
    expect(primaryImprovementLabel({ code: "take_summative_assessment" }, result))
      .toBe("本番形式テストを完了しましょう");
    expect(primaryImprovementLabel(null, result)).toBeNull();
    expect(readinessFieldLabel("custom-field", result)).toBe("保存済み分野名");
    expect(readinessFieldLabel("technology", result)).toBe("テクノロジ");
  });

  it("renders a score out of 100 and preserves a null score as measuring", () => {
    expect(readinessScoreLabel(78)).toBe("78/100");
    expect(readinessScoreLabel(null)).toBe("測定中");
    expect(readinessResultLabel(makeExamReadinessResult())).toBe("78/100（準備良好）");
    expect(readinessResultLabel(makeExamReadinessResult({
      score: null,
      band: "measuring",
    }))).toBe("測定中");
  });

  it("never describes the result as a probability or appends a percent sign", () => {
    const result = makeExamReadinessResult();
    const strings = [
      readinessScoreLabel(result.score),
      ...(["measuring", "needs_work", "approaching", "ready", "stable"] as ReadinessBand[])
        .map(readinessBandLabel),
      confidenceReasonLabel({ code: "insufficient_evidence", actual: 42, required: 100 }),
      primaryImprovementLabel(result.primaryImprovement, result) ?? "",
    ];

    expect(strings.join(" ")).not.toMatch(/合格率|合格確率|%/);
  });
});
