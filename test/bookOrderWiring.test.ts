import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, UserProfile, UserProgress, WeeklyPlan } from "@/types";
import { getAllTopics } from "@/lib/content";
import { buildBookStudyOrder, nextBookTopicIds } from "@/lib/bookStudyOrder";
import { referenceBookFromPreset } from "@/lib/referenceBookPresets";
import { resolveWeeklyPlan, weekStartKey } from "@/lib/studyPlanner";
import { mergeProgress } from "@/lib/mergeAppState";
import { isSameOrderKey, resolveStudyContext, studyOrderKey } from "@/lib/studyContext";

const mocks = vi.hoisted(() => ({
  getRequestUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
}));
vi.mock("@/lib/apiUser", () => ({
  getRequestUserId: mocks.getRequestUserId,
  getRequestUserIdFast: mocks.getRequestUserId,
}));
vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser: async () => true,
  recordingLockedResponse: () => new Response(null, { status: 402 }),
}));

import { POST as UPSERT_TASKS } from "@/app/api/daily-tasks/upsert/route";
import { loadServerStudyContext } from "@/lib/serverStudyContext";

// 参考書順の配線: 学習順の前提（orderKey）で古い保存物を作り直す・サーバーも同じ判定を使う。
// アプリ順（鍵なし）は従来と同じ扱い。

const NOW = new Date("2026-10-04T09:00:00+09:00");
const topics = getAllTopics();
const kitamiBook = referenceBookFromPreset("gihyo-kitami-itpass-r08")!;
const kitami = buildBookStudyOrder(kitamiBook, topics)!;
const profile: UserProfile = { itExperience: "", dailyMinutes: "", examPlan: "", confidence: 0, weekdayMinutes: 30 };

function progress(weeklyPlan?: WeeklyPlan): UserProgress {
  return { currentDay: 1, completedDays: [], level: 1, exp: 0, streakCount: 0, weakTags: [], completedTopics: [], topicMastery: {}, reviewQueue: [], weeklyPlan: weeklyPlan ?? null };
}
const state = (w?: WeeklyPlan): AppState => ({ profile, progress: progress(w), answers: [] });

describe("order key", () => {
  it("is 'app' for app order and changes with book, structure and plan revision", () => {
    const base = { preference: "book" as const, book: kitamiBook, topics, flag: "optin" as const };
    const ctx = resolveStudyContext(base);
    expect(studyOrderKey(resolveStudyContext({ ...base, flag: "off" }))).toBe("app");
    expect(studyOrderKey(ctx, 1)).not.toBe(studyOrderKey(ctx, 2));
    expect(studyOrderKey(ctx, 1)).toContain(kitamiBook.id);
    expect(isSameOrderKey(undefined, "app")).toBe(true);
    expect(isSameOrderKey(undefined, studyOrderKey(ctx, 1))).toBe(false);
  });
});

describe("weekly plan resolution with the order key", () => {
  const thisWeek = weekStartKey(NOW);
  const legacy: WeeklyPlan = { weekStartDate: thisWeek, topicIds: ["x"], reviewIds: [] };

  it("keeps an app-order week as before", () => {
    const s = state(legacy);
    expect(resolveWeeklyPlan(s, topics, NOW)).toBe(legacy);
    expect(resolveWeeklyPlan(s, topics, NOW, { orderKey: "app" })).toBe(legacy);
  });

  it("rebuilds the same week in book order when the order key changes", () => {
    const key = "book:b:h:1";
    const rebuilt = resolveWeeklyPlan(state(legacy), topics, NOW, { book: { order: kitami }, orderKey: key });
    expect(rebuilt.orderKey).toBe(key);
    expect(rebuilt.revisedAt).toBe(NOW.toISOString());
    expect(rebuilt.topicIds).toEqual(nextBookTopicIds(kitami, [], rebuilt.topicIds.length));
    // 同じ前提なら週の途中で変えない
    expect(resolveWeeklyPlan(state(rebuilt), topics, NOW, { book: { order: kitami }, orderKey: key })).toBe(rebuilt);
    // アプリ順へ戻したら作り直す
    const back = resolveWeeklyPlan(state(rebuilt), topics, NOW, { orderKey: "app" });
    expect(back.orderKey).toBeUndefined();
    expect(back.revisedAt).toBe(NOW.toISOString());
  });

  it("keeps the order key through a same-week merge", () => {
    const a: WeeklyPlan = { weekStartDate: thisWeek, topicIds: ["a"], reviewIds: [], orderKey: "book:1" };
    const b: WeeklyPlan = { weekStartDate: thisWeek, topicIds: ["b"], reviewIds: [], orderKey: "book:1" };
    expect(mergeProgress(progress(a), progress(b)).weeklyPlan?.orderKey).toBe("book:1");
    const legacyMerge = mergeProgress(progress(legacy), progress({ ...legacy, topicIds: ["y"] })).weeklyPlan!;
    expect("orderKey" in legacyMerge).toBe(false);
  });
});

describe("daily tasks: replacing the pending menu", () => {
  type Call = { op: string; filters: [string, unknown][] };
  let calls: Call[] = [];
  beforeEach(() => {
    calls = [];
    mocks.getRequestUserId.mockResolvedValue("u1");
    mocks.getServiceSupabase.mockReturnValue({
      from() {
        const call: Call = { op: "", filters: [] };
        const chain: Record<string, unknown> = {};
        chain.delete = () => ((call.op = "delete"), chain);
        chain.upsert = () => ((call.op = "upsert"), chain);
        chain.eq = (k: string, v: unknown) => (call.filters.push([k, v]), chain);
        chain.is = (k: string, v: unknown) => (call.filters.push([k, v]), chain);
        chain.then = (resolve: (v: unknown) => unknown) => {
          calls.push(call);
          return Promise.resolve({ error: null }).then(resolve);
        };
        return chain;
      },
    });
  });

  const req = (body: unknown) =>
    new Request("http://x/api/daily-tasks/upsert", { method: "POST", body: JSON.stringify(body) });
  const tasks = [{ taskType: "topic_quiz", topicId: "t", title: "T", source: "today_menu" }];

  it("only adds rows by default (unchanged behavior)", async () => {
    await UPSERT_TASKS(req({ date: "2026-10-04", tasks }));
    expect(calls.map((c) => c.op)).toEqual(["upsert"]);
  });

  it("deletes only untouched auto-generated rows of that day before adding", async () => {
    await UPSERT_TASKS(req({ date: "2026-10-04", tasks, replacePendingTodayMenu: true }));
    expect(calls.map((c) => c.op)).toEqual(["delete", "upsert"]);
    expect(calls[0].filters).toEqual([
      ["user_id", "u1"],
      ["date", "2026-10-04"],
      ["source", "today_menu"],
      ["status", "pending"],
      ["completion_source", "self_report"],
      ["activity_key", null],
    ]);
  });
});

describe("server study context (LINE / reports)", () => {
  const original = process.env.NEXT_PUBLIC_BOOK_ORDER_MODE;
  afterEach(() => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = original;
  });

  function supabaseWith(row: unknown) {
    const from = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: row, error: null });
      return chain;
    });
    return { from } as unknown as Parameters<typeof loadServerStudyContext>[0] & { from: typeof from };
  }

  const row = {
    user_id: "u1",
    book_id: kitamiBook.id,
    title: kitamiBook.title,
    edition: kitamiBook.edition,
    active: true,
    chapters: kitamiBook.chapters,
    study_plan: null,
  };

  it("does not read the book for app-order users", async () => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "optin";
    const supabase = supabaseWith(row);
    const result = await loadServerStudyContext(supabase, "u1", profile);
    expect(result.bookQueue).toBeNull();
    expect(result.orderKey).toBe("app");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("does not read the book when the flag is off", async () => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "off";
    const supabase = supabaseWith(row);
    const result = await loadServerStudyContext(supabase, "u1", { ...profile, studyOrderPreference: "book" });
    expect(result.bookQueue).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns the same book order as the web for opted-in users", async () => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "optin";
    const result = await loadServerStudyContext(supabaseWith(row), "u1", { ...profile, studyOrderPreference: "book" });
    expect(result.context.effectiveMode).toBe("book");
    expect(result.bookQueue?.order.structureHash).toBe(kitami.structureHash);
    expect(result.orderKey).toBe(studyOrderKey(result.context, undefined));
  });
});
