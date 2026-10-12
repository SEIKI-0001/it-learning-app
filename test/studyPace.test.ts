import { describe, expect, it } from "vitest";
import type { AppState, UserProfile, UserProgress } from "@/types";
import { getAllTopics } from "@/lib/content";
import { requiredMinutesEstimate } from "@/lib/studyPlanner";
import { GUIDE_FACTS } from "@/lib/guide/facts";
import {
  computeStudyPace,
  getPinnedPace,
  PACE_DAILY_CAP_MINUTES,
  paceSummary,
  resolveTodayPace,
} from "@/lib/studyPace";
import { declaredDailyMinutes } from "@/lib/dailyMinutes";

// ペースメーカー: 試験日から逆算して「おまかせ」の今日の量を決める。

const TOPICS = getAllTopics();
const MONDAY = new Date(2026, 8, 14, 9, 0, 0);
const SATURDAY = new Date(2026, 8, 19, 9, 0, 0);

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: [],
    topicMastery: {},
    topicMasteryStats: {},
    reviewQueue: [],
    currentDay: 1,
    completedDays: [],
    ...overrides,
  };
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    examDate: "2026-10-14",
    weekdayMinutes: 20,
    holidayMinutes: 60,
    examPlan: "decided",
    ...overrides,
  } as UserProfile;
}

describe("remaining required minutes", () => {
  it("matches the public guide's estimate from a blank start", () => {
    const blank = requiredMinutesEstimate(TOPICS, progress());
    const input = TOPICS.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    expect(blank).toBe(input + TOPICS.length * 10 + 600);
    expect(blank).toBe(GUIDE_FACTS.plannerRequiredMinutes);
  });

  it("shrinks as topics are learned, mastered and practised with past exams", () => {
    const blank = requiredMinutesEstimate(TOPICS, progress());
    const topic = TOPICS[0];
    const studied = requiredMinutesEstimate(
      TOPICS,
      progress({
        completedTopics: [topic.id],
        topicMastery: { [topic.id]: 80 },
        topicMasteryStats: {
          [topic.id]: {
            topicId: topic.id,
            masteryScore: 80,
            lastEvaluatedAt: "2026-09-13T00:00:00.000Z",
            correctCount: 1,
            incorrectCount: 0,
            reviewSuccessCount: 0,
            recentEvidence: [
              {
                questionId: "q",
                kind: "past_exam",
                isCorrect: true,
                answeredAt: "2026-09-13T00:00:00.000Z",
                isFirstSeen: true,
              } as never,
            ],
          },
        },
      }),
    );

    expect(studied).toBe(
      blank - topic.estimatedMinutes - 10 - (600 - Math.round((600 * (TOPICS.length - 1)) / TOPICS.length)),
    );
  });
});

describe("declared minutes", () => {
  it("uses the holiday amount on weekends", () => {
    expect(declaredDailyMinutes(profile(), MONDAY)).toBe(20);
    expect(declaredDailyMinutes(profile(), SATURDAY)).toBe(60);
    expect(declaredDailyMinutes(profile({ holidayMinutes: undefined }), SATURDAY)).toBe(20);
  });
});

describe("computeStudyPace", () => {
  it("does not pace without an exam date or on/after the exam day", () => {
    expect(computeStudyPace({ profile: profile({ examDate: undefined }), progress: progress(), topics: TOPICS, now: MONDAY })).toBeNull();
    expect(computeStudyPace({ profile: profile({ examDate: "2026-09-14" }), progress: progress(), topics: TOPICS, now: MONDAY })).toBeNull();
  });

  it("keeps the declared time when it is enough", () => {
    const pace = computeStudyPace({ profile: profile({ examDate: "2027-09-14" }), progress: progress(), topics: TOPICS, now: MONDAY });

    expect(pace?.status).toBe("on_pace");
    expect(pace?.todayMinutes).toBe(20);
  });

  it("raises the automatic amount when the declared time falls short", () => {
    // 30日・平日20分/休日60分 ≒ 943分 < 必要量 ≒ 2,221分
    const pace = computeStudyPace({ profile: profile(), progress: progress(), topics: TOPICS, now: MONDAY });

    expect(pace?.daysRemaining).toBe(30);
    expect(pace?.status).toBe("raised");
    expect(pace?.todayMinutes).toBeGreaterThan(20);
    expect(pace?.todayMinutes).toBeLessThanOrEqual(PACE_DAILY_CAP_MINUTES);
    expect(pace!.todayMinutes % 5).toBe(0);
  });

  it("gives weekends the larger share when more time was declared for them", () => {
    const weekday = computeStudyPace({ profile: profile(), progress: progress(), topics: TOPICS, now: MONDAY })!;
    const saturday = computeStudyPace({ profile: profile(), progress: progress(), topics: TOPICS, now: SATURDAY })!;

    expect(saturday.neededTodayMinutes).toBeGreaterThan(weekday.neededTodayMinutes * 2);
  });

  it("caps the amount and says so when even the cap is not enough", () => {
    const pace = computeStudyPace({ profile: profile({ examDate: "2026-09-17" }), progress: progress(), topics: TOPICS, now: MONDAY });

    expect(pace?.status).toBe("over_cap");
    expect(pace?.todayMinutes).toBe(PACE_DAILY_CAP_MINUTES);
  });

  it("flags a provisional exam date", () => {
    const pace = computeStudyPace({ profile: profile({ examPlan: "provisional" }), progress: progress(), topics: TOPICS, now: MONDAY });
    expect(pace?.provisional).toBe(true);
  });
});

describe("resolveTodayPace", () => {
  const state = (p: UserProfile = profile(), pr: UserProgress = progress()): AppState => ({
    profile: p,
    progress: pr,
    answers: [],
  });

  it("pins the first result of the day so the menu does not shrink while studying", () => {
    const first = resolveTodayPace(state(), TOPICS, MONDAY);
    expect(first.pace?.status).toBe("raised");

    // 学習が進んで残りが減っても、当日中は同じ量。
    const later = new Date(MONDAY.getTime() + 3 * 3600_000);
    const advanced: AppState = {
      ...first.state,
      progress: {
        ...first.state.progress,
        completedTopics: TOPICS.slice(0, 40).map((t) => t.id),
      },
    };
    const again = resolveTodayPace(advanced, TOPICS, later);

    expect(again.pace).toEqual(first.pace);
    expect(again.state).toBe(advanced);
  });

  it("recalculates on the next day and when the exam date or declared time changes", () => {
    const first = resolveTodayPace(state(), TOPICS, MONDAY);
    const tuesday = new Date(MONDAY.getTime() + 24 * 3600_000);

    expect(getPinnedPace(first.state, tuesday)).toBeUndefined();
    expect(getPinnedPace({ ...first.state, profile: profile({ weekdayMinutes: 30 }) }, MONDAY)).toBeUndefined();
    expect(getPinnedPace({ ...first.state, profile: profile({ examDate: "2026-11-14" }) }, MONDAY)).toBeUndefined();
  });

  it("leaves the state untouched without an exam date", () => {
    const s = state(profile({ examDate: undefined }));
    const result = resolveTodayPace(s, TOPICS, MONDAY);

    expect(result.pace).toBeNull();
    expect(result.state).toBe(s);
  });
});

describe("paceSummary (/progress)", () => {
  it("uses the same judgement as Today", () => {
    expect(paceSummary(null).label).toBe("試験日が未設定");
    expect(paceSummary({ status: "on_pace", minutes: 20 })).toMatchObject({ label: "間に合うペース", tone: "good" });
    expect(paceSummary({ status: "raised", minutes: 50 }).note).toBe("今日は50分で間に合うペースです");
    expect(paceSummary({ status: "over_cap", minutes: 120 }).tone).toBe("warn");
  });
});
