import { describe, expect, it } from "vitest";
import type { AppState, UserProfile, UserProgress } from "@/types";
import { getAllTopics } from "@/lib/content";
import { buildTodaysLearningQueue, BOOK_NEW_TOPIC_PRIORITY } from "@/lib/learningLoop";
import { generateTodayMenu } from "@/lib/aiPlanner";
import { buildWeeklyPlan, generateLearningPlan } from "@/lib/studyPlanner";
import { buildBookStudyOrder, nextBookTopicIds } from "@/lib/bookStudyOrder";
import {
  BOOK_NEW_SHARE,
  buildReferenceStudyPlan,
  isReferenceStudyPlanCurrent,
  referenceStudyPlanProgress,
  supplementDeadlineFor,
  type BookQueueOptions,
} from "@/lib/bookStudyPlan";
import { referenceBookFromPreset } from "@/lib/referenceBookPresets";
import { normalizeReferenceBook } from "@/lib/referenceBook";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";

// 参考書順（Book mode）のエンジン。新規は本の順・復習は割り込む・新規が止まらない。
// アプリ順（book なし）が従来と同一であることは、別途の差分検証と既存テストで確かめている。

const topics = getAllTopics();
const NOW = new Date("2026-10-04T09:00:00+09:00");
const kitami = buildBookStudyOrder(referenceBookFromPreset("gihyo-kitami-itpass-r08")!, topics)!;
const book: BookQueueOptions = { order: kitami };

function progress(over: Partial<UserProgress> = {}): UserProgress {
  return {
    currentDay: 1,
    completedDays: [],
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: [],
    topicMastery: {},
    reviewQueue: [],
    ...over,
  };
}

const profile: UserProfile = {
  itExperience: "",
  dailyMinutes: "",
  examPlan: "",
  confidence: 0,
  weekdayMinutes: 30,
  holidayMinutes: 30,
};

function state(p: UserProgress): AppState {
  return { profile, progress: p, answers: [] };
}

const newTopicIds = (items: { kind: string; topicId?: string }[]) =>
  items.filter((i) => i.kind === "new_topic").map((i) => i.topicId!);

describe("today queue in book mode", () => {
  it("orders new topics strictly by the book, with a fixed priority and a separate order index", () => {
    const p = progress();
    const queue = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW, book });
    const news = queue.filter((i) => i.kind === "new_topic");
    expect(news.map((i) => i.topicId)).toEqual(nextBookTopicIds(kitami, [], topics.length));
    expect(new Set(news.map((i) => i.priority))).toEqual(new Set([BOOK_NEW_TOPIC_PRIORITY]));
    const indexes = news.map((i) => i.bookOrderIndex!);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(news[0].reason).toContain("参考書の順");
  });

  it("does not let checkpoint needs reorder new topics (they do in app order)", () => {
    // 技術だけ1件学んだ CP1: アプリ順では未着手の分野が 1000+ で先頭に来る
    const firstTech = kitami.units[1].topicIds[0];
    const p = progress({
      completedTopics: [firstTech],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
    });
    const app = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW });
    expect(app.find((i) => i.kind === "new_topic")!.priority).toBeGreaterThanOrEqual(1000);
    const bookQueue = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW, book });
    expect(newTopicIds(bookQueue)[0]).toBe(nextBookTopicIds(kitami, [firstTech], 1)[0]);
  });

  it("still puts overdue reviews and weak topics before new topics", () => {
    const done = nextBookTopicIds(kitami, [], 3);
    const p = progress({
      completedTopics: done,
      reviewQueue: [{ topicId: done[0], dueAt: "2026-10-01T00:00:00.000Z", reason: "復習期限" }],
    });
    const queue = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW, book });
    expect(queue[0]).toMatchObject({ kind: "overdue_review", topicId: done[0] });
  });

  it("does not pull unlearned topics forward through legacy weak tags", () => {
    const later = topics.find((t) => kitami.orderIndex.get(t.id)! > 40 && t.tags.length > 0)!;
    const p = progress({ weakTags: [later.tags[0]] });
    const app = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW });
    expect(app.some((i) => i.kind === "low_mastery" && i.topicId === later.id)).toBe(true);
    const bookQueue = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW, book });
    expect(bookQueue.some((i) => i.kind === "low_mastery" && i.topicId === later.id)).toBe(false);
  });

  it("brings important supplements forward once the safety deadline has passed", () => {
    const supplement = kitami.supplementTopicIds[0];
    expect(topics.find((t) => t.id === supplement)!.importance).toBe(3);
    const p = progress();
    const before = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW, book: { order: kitami, supplementDeadline: "2026-10-05" } });
    expect(newTopicIds(before)[0]).not.toBe(supplement);
    const after = buildTodaysLearningQueue({ progress: p, topics, state: state(p), now: NOW, book: { order: kitami, supplementDeadline: "2026-10-04" } });
    expect(newTopicIds(after)[0]).toBe(supplement);
  });
});

describe("today menu in book mode", () => {
  it("keeps at least the new-topic share even when many reviews are overdue", () => {
    const done = nextBookTopicIds(kitami, [], 30);
    const p = progress({
      completedTopics: done,
      reviewQueue: done.map((id) => ({ topicId: id, dueAt: "2026-09-01T00:00:00.000Z", reason: "復習期限" })),
    });
    const app = generateTodayMenu(profile, p, topics, [], NOW);
    expect(app.items.filter((i) => i.kind === "learn")).toHaveLength(0); // 従来は新規が止まる

    const menu = generateTodayMenu(profile, p, topics, [], NOW, undefined, undefined, { book });
    const learn = menu.items.filter((i) => i.kind === "learn");
    expect(learn.length).toBeGreaterThanOrEqual(1);
    expect(learn[0].topicId).toBe(nextBookTopicIds(kitami, done, 1)[0]);
    const learnMinutes = learn.reduce((s, i) => s + i.estimatedMinutes, 0);
    expect(learnMinutes).toBeGreaterThanOrEqual(Math.min(learn[0].estimatedMinutes, 30 * BOOK_NEW_SHARE));
    expect(menu.items.some((i) => i.kind === "review")).toBe(true);
    expect(menu.totalMinutes).toBeLessThanOrEqual(30);
    expect(menu.bookUnitLabel).toBeTruthy();
  });

  it("never skips ahead in the book to fill leftover time", () => {
    const p = progress();
    const menu = generateTodayMenu({ ...profile, weekdayMinutes: 20 }, p, topics, [], NOW, undefined, undefined, { book });
    const learn = menu.items.filter((i) => i.kind === "learn").map((i) => i.topicId);
    expect(learn).toEqual(nextBookTopicIds(kitami, [], learn.length));
  });

  it("gives at least one new topic even with a tiny budget", () => {
    const menu = generateTodayMenu(profile, progress(), topics, [], NOW, 5, undefined, { book });
    expect(menu.items.filter((i) => i.kind === "learn")).toHaveLength(1);
  });

  it("falls back to the usual fill when the whole book is learned", () => {
    const all = topics.map((t) => t.id);
    const p = progress({ completedTopics: all, reviewQueue: [{ topicId: all[0], dueAt: "2026-09-01T00:00:00.000Z", reason: "復習期限" }] });
    const a = generateTodayMenu(profile, p, topics, [], NOW, undefined, undefined, { book });
    const b = generateTodayMenu(profile, p, topics, [], NOW);
    expect(a.items).toEqual(b.items);
  });
});

describe("weekly plan and reasons in book mode", () => {
  it("picks this week's new topics in book order, matching today", () => {
    const s = state(progress());
    const weekly = buildWeeklyPlan(s, topics, NOW, { book });
    expect(weekly.topicIds).toEqual(nextBookTopicIds(kitami, [], weekly.topicIds.length));
    const plan = generateLearningPlan(s, topics, NOW, undefined, undefined, { book });
    expect(plan.todayReasons[0]).toContain("参考書の順");
    expect(plan.todayMenu.items.find((i) => i.kind === "learn")!.topicId).toBe(weekly.topicIds[0]);
  });
});

describe("reference study plan (planned dates)", () => {
  const withExam = { ...profile, examDate: "2026-12-20" };

  it("plans every unit in order and finishes the input phase before the exam", () => {
    const plan = buildReferenceStudyPlan({ order: kitami, bookId: "b", topics, profile: withExam, completedTopicIds: [], now: NOW });
    expect(plan.units.map((u) => u.unitId)).toEqual(kitami.units.map((u) => u.unitId));
    const dates = plan.units.map((u) => u.plannedDate);
    expect(dates).toEqual([...dates].sort());
    expect(plan.startDate).toBe("2026-10-04");
    expect(dates[dates.length - 1] <= plan.inputEndDate).toBe(true);
    expect(plan.inputEndDate < "2026-12-20").toBe(true);
    expect(plan.revision).toBe(1);
  });

  it("paces by the reserved share without an exam date", () => {
    const slow = buildReferenceStudyPlan({ order: kitami, bookId: "b", topics, profile: { ...profile, weekdayMinutes: 10, holidayMinutes: 10 }, completedTopicIds: [], now: NOW });
    const fast = buildReferenceStudyPlan({ order: kitami, bookId: "b", topics, profile: { ...profile, weekdayMinutes: 60, holidayMinutes: 60 }, completedTopicIds: [], now: NOW });
    expect(slow.inputEndDate > fast.inputEndDate).toBe(true);
  });

  it("revises (keeps revision history) only when inputs change", () => {
    const plan = buildReferenceStudyPlan({ order: kitami, bookId: "b", topics, profile: withExam, completedTopicIds: [], now: NOW });
    expect(isReferenceStudyPlanCurrent(plan, { bookId: "b", order: kitami, profile: withExam })).toBe(true);
    expect(isReferenceStudyPlanCurrent(plan, { bookId: "other", order: kitami, profile: withExam })).toBe(false);
    expect(isReferenceStudyPlanCurrent(plan, { bookId: "b", order: kitami, profile: { ...withExam, examDate: "2027-04-01" } })).toBe(false);
    expect(isReferenceStudyPlanCurrent(plan, { bookId: "b", order: kitami, profile: { ...withExam, weekdayMinutes: 90 } })).toBe(false);
    const reordered = buildBookStudyOrder(
      normalizeReferenceBook({ ...referenceBookFromPreset("gihyo-kitami-itpass-r08")!, chapters: [...referenceBookFromPreset("gihyo-kitami-itpass-r08")!.chapters].reverse() }),
      topics,
    )!;
    expect(isReferenceStudyPlanCurrent(plan, { bookId: "b", order: reordered, profile: withExam })).toBe(false);
    const next = buildReferenceStudyPlan({ order: kitami, bookId: "b", topics, profile: withExam, completedTopicIds: [], now: NOW, previous: plan });
    expect(next.revision).toBe(2);
    const otherBook = buildReferenceStudyPlan({ order: kitami, bookId: "c", topics, profile: withExam, completedTopicIds: [], now: NOW, previous: plan });
    expect(otherBook.revision).toBe(1);
  });

  it("measures ahead / behind by learned units only", () => {
    const plan = buildReferenceStudyPlan({ order: kitami, bookId: "b", topics, profile: withExam, completedTopicIds: [], now: NOW });
    const later = new Date("2026-10-25T09:00:00+09:00");
    const behind = referenceStudyPlanProgress(plan, kitami, [], later);
    expect(behind.deltaUnits).toBeLessThan(0);
    expect(behind.current?.unitId).toBe(kitami.units.find((u) => u.topicIds.length > 0)!.unitId);
    const firstUnits = kitami.units.filter((u) => u.topicIds.length > 0).slice(0, 4).flatMap((u) => u.topicIds);
    const ahead = referenceStudyPlanProgress(plan, kitami, firstUnits, NOW);
    expect(ahead.deltaUnits).toBe(4);
    expect(ahead.learnedUnits).toBe(4);
  });

  it("sets the supplement deadline a week before the input phase ends", () => {
    const plan = buildReferenceStudyPlan({ order: kitami, bookId: "b", topics, profile: withExam, completedTopicIds: [], now: NOW });
    const deadline = supplementDeadlineFor(plan)!;
    expect(deadline < plan.inputEndDate).toBe(true);
    expect(deadline >= plan.startDate).toBe(true);
    expect(supplementDeadlineFor(null)).toBeUndefined();
  });
});
