// @vitest-environment jsdom
//
// Today の単語タスク（4択）を終えたあとの流れ:
//   正誤 → 単語進捗（lib/wordlistProgress・DB 同期）→ 誤答語は次の Today で復習
//   全問回答 → Today のタスク完了（正答率は問わない）→ 今日のミッションへは正解数だけ

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: null as string | null,
  markTodayActivityDone: vi.fn(),
  loadAppState: vi.fn(),
  saveAppState: vi.fn(),
  saveProgressToDb: vi.fn(),
  applyDailyQuestProgress: vi.fn(),
}));

vi.mock("@/lib/userSession", () => ({
  getUserId: () => mocks.userId,
  saveProgressToDb: mocks.saveProgressToDb,
}));
vi.mock("@/lib/todayActivityLog", () => ({ markTodayActivityDone: mocks.markTodayActivityDone }));
vi.mock("@/lib/storage", () => ({ loadAppState: mocks.loadAppState, saveAppState: mocks.saveAppState }));
vi.mock("@/lib/dailyQuests", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dailyQuests")>();
  return { ...actual, applyDailyQuestProgress: mocks.applyDailyQuestProgress };
});

import { getQuestDef } from "@/lib/dailyQuests";
import { completeWordStudySession } from "@/lib/wordStudySession";
import { getWordProgressMap, recordQuizResult } from "@/lib/wordlistProgress";
import { selectVocabSpec } from "@/lib/todayVocab";

beforeEach(() => {
  window.localStorage.clear();
  mocks.userId = null;
  mocks.loadAppState.mockReturnValue({ progress: {} });
  mocks.applyDailyQuestProgress.mockImplementation((state) => ({ ...state, changed: true }));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Today の4択を最後まで答えたとき", () => {
  it("20問中14問正解: タスクは完了、ミッションには14語だけ（20語ではない）", () => {
    completeWordStudySession({ cleared: 14, todayTaskId: "act:vocab" });
    expect(mocks.markTodayActivityDone).toHaveBeenCalledWith("act:vocab");
    const event = mocks.applyDailyQuestProgress.mock.calls[0][1];
    expect(event).toMatchObject({ kind: "words", wordsCleared: 14, fromTodayTask: true });
    expect(getQuestDef("words_today")!.gain(event)).toBe(14);
  });

  it("全問不正解でもタスクは完了（誤答が次の復習の材料になる）。ミッションは進めない", () => {
    completeWordStudySession({ cleared: 0, todayTaskId: "act:vocab" });
    expect(mocks.markTodayActivityDone).toHaveBeenCalledWith("act:vocab");
    expect(mocks.applyDailyQuestProgress).not.toHaveBeenCalled();
  });

  it("Today 以外（自由学習）の正解は Today の用語ミッションに数えない", () => {
    completeWordStudySession({ cleared: 5, todayTaskId: null });
    const event = mocks.applyDailyQuestProgress.mock.calls[0][1];
    expect(event.fromTodayTask).toBe(false);
    expect(getQuestDef("words_today")!.gain(event)).toBe(0);
  });
});

describe("誤答語は weak になり、次の Today で復習に出る", () => {
  it("recordQuizResult(id, false) → weak・当日中に期限 → 次回の Today の復習タスクに入る", () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    mocks.userId = "10000000-0000-0000-0000-000000000001";

    recordQuizResult("dns", true);
    recordQuizResult("nat", false);
    recordQuizResult("dhcp", false);

    const map = getWordProgressMap();
    expect(map.nat).toMatchObject({ status: "weak", correctCount: 0, wrongCount: 1 });
    expect(map.dhcp).toMatchObject({ status: "weak" });
    expect(map.dns).toMatchObject({ status: "learning", correctCount: 1 });
    // 既存の単語進捗フローで DB（user_word_progress）へも送る
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([url]) => url === "/api/word-progress/save")).toBe(true);

    const tomorrow = new Date(Date.now() + 86_400_000);
    const spec = selectVocabSpec({
      checkpointOrder: 4, wordProgress: map, topicStages: {}, upcomingTopicIds: [], now: tomorrow,
    })!;
    expect(spec.variant).toBe("review");
    expect(spec.wordIds).toEqual(expect.arrayContaining(["nat", "dhcp"]));
    expect(spec.wordIds).not.toContain("dns"); // 正解した語は3日後まで出さない
  });
});
