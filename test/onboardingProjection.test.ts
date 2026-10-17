import { describe, expect, it } from "vitest";
import type { UserProfile } from "@/types";
import { projectStudyTime } from "@/lib/onboardingProjection";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { buildInitialAppState } from "@/lib/storage";

// 初回設定の見通しは、計画エンジンが実際に使う数字と一致させる（画面のために盛らない）。
describe("projectStudyTime", () => {
  const now = new Date("2026-10-17T09:00:00+09:00");
  const profile: UserProfile = {
    examDate: "2026-12-17",
    planStartDate: "2026-10-17",
    weekdayMinutes: 30,
    holidayMinutes: 60,
    confidence: 2,
    weakFields: [],
    studyStyle: "balanced",
    itExperience: "none",
    dailyMinutes: "30",
    examPlan: "decided",
  };

  it("試験日までの日数・使える時間・必要量が計画エンジンと一致する", () => {
    const projection = projectStudyTime(profile, now);
    const plan = generateLearningPlan(buildInitialAppState(profile), undefined, now);
    expect(projection.days).toBe(plan.daysUntilExam);
    expect(projection.availableMinutes).toBe(plan.totalAvailableMinutes);
    expect(projection.requiredMinutes).toBe(plan.requiredMinutesEstimate);
  });

  it("学習時間を増やすと見通しが良くなる", () => {
    const low = projectStudyTime({ ...profile, weekdayMinutes: 10, holidayMinutes: 15 }, now);
    const high = projectStudyTime({ ...profile, weekdayMinutes: 60, holidayMinutes: 120 }, now);
    expect(low.level).toBe("sprint");
    expect(high.level).toBe("comfortable");
  });

  it("試験日が無ければ使える時間は出さない", () => {
    expect(projectStudyTime({ ...profile, examDate: undefined }, now).availableMinutes).toBeNull();
  });
});
