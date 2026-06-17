import { NextResponse } from "next/server";
import { getRepository } from "@/lib/storage";
import { lineUserIdToAppUserId, WEB_USER_ID } from "@/lib/session";
import { todayISO } from "@/lib/date";
import type { StudyDomain } from "@/types/content";
import type { ItExperience, UserProfile, Weekday } from "@/types/user";

type OnboardingPayload = {
  lineUserId?: string;
  examDate: string;
  weekdayMinutes: number;
  weekendMinutes: number;
  restWeekdays: Weekday[];
  selectedBookId: string;
  itExperience: ItExperience;
  weakDomains: StudyDomain[];
};

export async function POST(request: Request) {
  const payload = (await request.json()) as OnboardingPayload;
  const userId = payload.lineUserId ? lineUserIdToAppUserId(payload.lineUserId) : WEB_USER_ID;
  const repository = getRepository();
  const existing = await repository.getUserProfile(userId);
  const now = new Date().toISOString();

  const profile: UserProfile = {
    id: userId,
    lineUserId: payload.lineUserId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    examDate: payload.examDate,
    studyStartDate: existing?.studyStartDate ?? todayISO(),
    weekdayMinutes: Number(payload.weekdayMinutes),
    weekendMinutes: Number(payload.weekendMinutes),
    restWeekdays: payload.restWeekdays ?? [],
    selectedBookId: payload.selectedBookId || "generic",
    itExperience: payload.itExperience || "none",
    weakDomains: payload.weakDomains ?? []
  };

  if (!profile.examDate) {
    return NextResponse.json({ error: "examDate is required" }, { status: 400 });
  }

  await repository.upsertUserProfile(profile);
  return NextResponse.json({ ok: true, profile });
}
