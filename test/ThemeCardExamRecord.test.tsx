// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ThemeCard from "@/components/learn/ThemeCard";
import { getThemeBySlug } from "@/lib/learningCatalog";
import { recordThemeExamAttempt } from "@/lib/chapterReview";
import type { UserProgress } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";

afterEach(cleanup);

const baseProgress: UserProgress = {
  level: 1,
  exp: 0,
  streakCount: 0,
  weakTags: [],
  completedTopics: [],
  topicMastery: {},
  reviewQueue: [],
  currentDay: 1,
  completedDays: [],
  checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS },
};

function renderCard(userProgress: UserProgress) {
  const theme = getThemeBySlug("network")!;
  render(
    <ThemeCard
      theme={theme}
      progress={{
        themeId: theme.id,
        totalLessons: 7,
        completedLessons: 0,
        progressPercent: 0,
        reviewDueCount: 0,
        status: "in_progress",
        nextLessonId: null,
      }}
      masterState="in_progress"
      userProgress={userProgress}
      themeExam={{ themeSlug: "network", questionCount: 10, passRate: 60 }}
      isOpen
      onToggle={() => {}}
    />,
  );
}

describe("ThemeCard の総まとめ試験", () => {
  it("未受験なら問題数と合格ラインを出す", () => {
    renderCard(baseProgress);
    expect(screen.getByText("10問・合格ライン 60%・章を横断した出題")).toBeInTheDocument();
    expect(screen.queryByText("合格済み")).not.toBeInTheDocument();
  });

  it("合格済み・最新・最高を出す（再受験で下がっても合格済みは残る）", () => {
    const passed = recordThemeExamAttempt(
      baseProgress,
      { themeSlug: "network", rate: 90, correct: 9, total: 10, passed: true },
      "2026-09-01T00:00:00.000Z",
    );
    const retaken = recordThemeExamAttempt(
      passed,
      { themeSlug: "network", rate: 50, correct: 5, total: 10, passed: false },
      "2026-09-02T00:00:00.000Z",
    );
    renderCard(retaken);
    expect(screen.getByText("合格済み")).toBeInTheDocument();
    expect(screen.getByText("最新 50%・最高 90%・合格ライン 60%")).toBeInTheDocument();
  });
});
