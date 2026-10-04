// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { AppState, UserProfile } from "@/types";
import { referenceBookFromPreset } from "@/lib/referenceBookPresets";

const sync = vi.hoisted(() => ({
  loadReferenceBookSynced: vi.fn(),
  persistReferenceStudyPlan: vi.fn(),
  loadLocalStudyPlans: vi.fn(() => ({})),
  subscribeReferenceBookChanges: vi.fn(() => () => {}),
}));
vi.mock("@/lib/referenceBookSync", () => sync);

import { useStudyContext } from "@/lib/useStudyContext";

// 画面の学習コンテキスト。アプリ順のユーザーは何も読み込まず即 ready（従来どおり）。

const profile: UserProfile = { itExperience: "", dailyMinutes: "", examPlan: "", confidence: 0, weekdayMinutes: 30, examDate: "2026-12-20" };
const state = (p: UserProfile): AppState => ({
  profile: p,
  progress: { currentDay: 1, completedDays: [], level: 1, exp: 0, streakCount: 0, weakTags: [], completedTopics: [], topicMastery: {}, reviewQueue: [] },
  answers: [],
});
const original = process.env.NEXT_PUBLIC_BOOK_ORDER_MODE;

beforeEach(() => {
  vi.clearAllMocks();
  sync.loadReferenceBookSynced.mockResolvedValue(referenceBookFromPreset("gihyo-kitami-itpass-r08"));
});
afterEach(() => {
  process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = original;
});

describe("useStudyContext", () => {
  it("is ready immediately in app order and loads nothing", () => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "optin";
    const { result } = renderHook(() => useStudyContext(state(profile)));
    expect(result.current.ready).toBe(true);
    expect(result.current.bookQueue).toBeNull();
    expect(result.current.orderKey).toBe("app");
    expect(sync.loadReferenceBookSynced).not.toHaveBeenCalled();
  });

  it("stays app order when the flag is off even if the user opted in", () => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "off";
    const { result } = renderHook(() => useStudyContext(state({ ...profile, studyOrderPreference: "book" })));
    expect(result.current.ready).toBe(true);
    expect(result.current.context.reason).toBe("flag_off");
    expect(sync.loadReferenceBookSynced).not.toHaveBeenCalled();
  });

  it("waits for the book, then follows it and creates the plan", async () => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "optin";
    const s = state({ ...profile, studyOrderPreference: "book" });
    const { result } = renderHook(() => useStudyContext(s));
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.context.effectiveMode).toBe("book");
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    expect(sync.persistReferenceStudyPlan).toHaveBeenCalledTimes(1);
    expect(result.current.orderKey).toMatch(/^book:.+:1$/);
    expect(result.current.bookQueue?.supplementDeadline).toBeTruthy();
  });
});
