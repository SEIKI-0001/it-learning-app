// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllTopics } from "@/lib/content";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { isBadgeConditionMet } from "@/lib/badges";
import type { AppState } from "@/types";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

function completedState(): AppState {
  const topicIds = getAllTopics().map((topic) => topic.id);
  return {
    progress: {
      level: 10,
      exp: 10_000,
      streakCount: 30,
      weakTags: [],
      completedTopics: topicIds,
      topicMastery: Object.fromEntries(topicIds.map((topicId) => [topicId, 100])),
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 30,
      completedDays: [],
    },
    answers: [],
  };
}

describe("Exam Readiness badge signal", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => values.set(key, value)),
        removeItem: vi.fn((key: string) => values.delete(key)),
        clear: vi.fn(() => values.clear()),
        key: vi.fn(() => null),
        get length() {
          return values.size;
        },
      },
    });
  });

  it.each(["ready", "stable"] as const)(
    "awards high-readiness only from the shared %s band with non-low confidence",
    (band) => {
      const result = makeExamReadinessResult({
        score: band === "stable" ? 88 : 78,
        band,
        confidence: {
          score: band === "stable" ? 85 : 72,
          level: band === "stable" ? "high" : "medium",
          reasons: [],
        },
      });

      expect(isBadgeConditionMet("b-cp6-high-readiness", completedState(), {
        examReadiness: result,
      })).toBe(true);
    },
  );

  it("rejects other bands, low confidence, and absent readiness without learning-progress fallback", () => {
    const approaching = makeExamReadinessResult({ score: 74, band: "approaching" });
    const inconsistentLow = makeExamReadinessResult({
      score: 78,
      band: "ready",
      confidence: { score: 59, level: "low", reasons: [] },
    });

    expect(isBadgeConditionMet("b-cp6-high-readiness", completedState(), {
      examReadiness: approaching,
    })).toBe(false);
    expect(isBadgeConditionMet("b-cp6-high-readiness", completedState(), {
      examReadiness: inconsistentLow,
    })).toBe(false);
    expect(isBadgeConditionMet("b-cp6-high-readiness", completedState())).toBe(false);
  });

  it("carries the complete shared result and ignores the removed scalar cache", () => {
    const result = makeExamReadinessResult({ band: "stable" });
    window.localStorage.setItem("fequest:integratedReadiness", "99");

    const signals = getClientBadgeSignals(result);

    expect(signals.examReadiness).toBe(result);
    expect(signals).not.toHaveProperty("readinessScore");
  });
});
