import { expect, it } from "vitest";
import type { UserProgress } from "@/types";
import type { Topic } from "@/types/content";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import { generateTodayMenu } from "@/lib/aiPlanner";
import { getAllTopics } from "@/lib/content";

function topic(id: string, importance: 1 | 2 | 3): Topic {
  return {
    id,
    field: "technology",
    category: "test",
    title: id,
    summary: id,
    estimatedMinutes: 5,
    difficulty: 1,
    importance,
    tags: [],
    prerequisites: [],
    relatedTerms: [],
    commonMistakes: [],
    examPoint: id,
    reviewKeywords: [],
    lineSummary: id,
    examFrequency: "medium",
    reviewPriority: "medium",
    beginnerTrapLevel: "low",
    conceptCard: { heading: id, body: id, analogy: id, diagram: { type: "cards", items: [] } },
    checkQuestions: [],
    explanation: { body: id, keyPoints: [] },
    reviewPrompt: { question: id, answer: id },
    referenceHints: [],
    kakomonFields: [],
  };
}

it("orders overdue review before summary weakness, low mastery, and new learning", () => {
  const progress: UserProgress = {
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: ["due", "summary", "low"],
    topicMastery: { due: 70, summary: 70, low: 35 },
    topicMasteryStats: {
      summary: {
        topicId: "summary", masteryScore: 70, lastEvaluatedAt: "2026-08-11T00:00:00.000Z",
        correctCount: 0, incorrectCount: 1, reviewSuccessCount: 0,
        recentEvidence: [{ questionId: "q", kind: "summary_exam", isCorrect: false, isFirstSeen: true, answeredAt: "2026-08-11T00:00:00.000Z" }],
      },
      low: {
        topicId: "low", masteryScore: 35, lastEvaluatedAt: "2026-08-10T00:00:00.000Z",
        correctCount: 1, incorrectCount: 1, reviewSuccessCount: 0, recentEvidence: [],
      },
    },
    reviewQueue: [{ topicId: "due", dueAt: "2026-08-10T00:00:00.000Z", reason: "期限超過" }],
    currentDay: 1,
    completedDays: [],
  };

  const queue = buildTodaysLearningQueue({
    progress,
    topics: [topic("due", 2), topic("summary", 3), topic("low", 3), topic("new", 3)],
    now: new Date("2026-08-11T00:00:00.000Z"),
    includeFlashcards: true,
    includeExtraPractice: true,
  });

  expect(queue.map((item) => item.kind)).toEqual([
    "overdue_review",
    "summary_weak",
    "low_mastery",
    "new_topic",
    "flashcard",
    "extra_practice",
  ]);
});

it("feeds the ordered queue into the existing Today menu", () => {
  const now = new Date("2026-08-11T00:00:00.000Z");
  const progress: UserProgress = {
    level: 1, exp: 0, streakCount: 0, weakTags: [],
    completedTopics: ["tech-binary-data", "tech-network-address", "tech-security-cia"],
    topicMastery: {
      "tech-binary-data": 70,
      "tech-network-address": 70,
      "tech-security-cia": 35,
    },
    topicMasteryStats: {
      "tech-network-address": {
        topicId: "tech-network-address", masteryScore: 70, lastEvaluatedAt: now.toISOString(),
        correctCount: 0, incorrectCount: 1, reviewSuccessCount: 0,
        recentEvidence: [{ questionId: "q", kind: "summary_exam", isCorrect: false, isFirstSeen: true, answeredAt: now.toISOString() }],
      },
      "tech-security-cia": {
        topicId: "tech-security-cia", masteryScore: 35, lastEvaluatedAt: now.toISOString(),
        correctCount: 1, incorrectCount: 1, reviewSuccessCount: 0, recentEvidence: [],
      },
    },
    reviewQueue: [{
      topicId: "tech-binary-data", dueAt: "2026-08-10T00:00:00.000Z", reason: "期限超過",
    }],
    currentDay: 1, completedDays: [],
  };

  const menu = generateTodayMenu(
    { itExperience: "", dailyMinutes: "120", examPlan: "", confidence: 0, weekdayMinutes: 120 },
    progress,
    getAllTopics(),
    [],
    now,
  );

  expect(menu.items.slice(0, 4).map((item) => [item.topicId, item.kind])).toEqual([
    ["tech-binary-data", "review"],
    ["tech-network-address", "review"],
    ["tech-security-cia", "review"],
    [expect.any(String), "learn"],
  ]);
});

it("keeps legacy weakTags as a weak-topic candidate for existing users", () => {
  const legacyWeak = topic("legacy-weak-topic", 2);
  legacyWeak.tags = ["legacy-weak-tag"];
  const progress: UserProgress = {
    level: 1, exp: 0, streakCount: 0,
    weakTags: ["legacy-weak-tag"],
    completedTopics: [legacyWeak.id],
    topicMastery: {},
    reviewQueue: [],
    currentDay: 1, completedDays: [],
  };

  expect(buildTodaysLearningQueue({ progress, topics: [legacyWeak] })[0]).toEqual(
    expect.objectContaining({ topicId: legacyWeak.id, kind: "low_mastery" }),
  );
});
