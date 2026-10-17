// 初回設定の「見通し」。選んだ試験日と学習時間で、試験日までに使える時間と
// 合格までに必要な学習量の目安を並べる（Noom の「この調子なら◯日に目標達成」型の手応え）。
// 数字は計画エンジン（lib/studyPlanner.ts）と同じ式から出し、画面のために盛らない。

import type { UserProfile, UserProgress } from "@/types";
import type { OnTrackLevel } from "@/types/plan";
import { getAllTopics } from "@/lib/content";
import { daysUntilExam } from "@/lib/aiPlanner";
import {
  computeOnTrack,
  requiredMinutesEstimate,
  totalAvailableMinutes,
} from "@/lib/studyPlanner";

export type StudyTimeProjection = {
  /** 試験日までの日数。試験日が無ければ null */
  days: number | null;
  /** 試験日までに使える学習時間（分）。試験日が無ければ null */
  availableMinutes: number | null;
  /** まっさらな状態から合格までに必要な学習量の目安（分） */
  requiredMinutes: number;
  level: OnTrackLevel;
};

const EMPTY_PROGRESS = { completedTopics: [], topicMastery: {} } as unknown as UserProgress;

export function projectStudyTime(
  profile: Pick<UserProfile, "examDate" | "weekdayMinutes" | "holidayMinutes"> & Partial<UserProfile>,
  now: Date = new Date(),
): StudyTimeProjection {
  const days = daysUntilExam(profile as UserProfile, now);
  const availableMinutes = totalAvailableMinutes(profile as UserProfile, days);
  const requiredMinutes = requiredMinutesEstimate(getAllTopics(), EMPTY_PROGRESS);
  return {
    days,
    availableMinutes,
    requiredMinutes,
    level: computeOnTrack(availableMinutes, requiredMinutes),
  };
}

/** 分を「約◯時間」の数字にする（1時間未満は1）。 */
export function roundHours(minutes: number): number {
  return Math.max(1, Math.round(minutes / 60));
}
