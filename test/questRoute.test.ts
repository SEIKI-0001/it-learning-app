// @vitest-environment jsdom

// loadStoredRoute/saveStoredRoute の localStorage テストのため jsdom を使う。
// 他のテストは純粋関数のみで環境に依存しない。
import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { getAllTopics } from "@/lib/content";
import { getLessonLocation } from "@/lib/learningCatalog";
import {
  buildQuestRoute,
  estimateTaskXpMax,
  isTaskDoneToday,
  loadStoredRoute,
  saveStoredRoute,
  TODAY_ROUTE_STORAGE_KEY,
  type TodayRouteTask,
} from "@/lib/questRoute";

// このjsdomバージョンは window.localStorage を既定で提供しない（getter が undefined を
// 返す）ため、テスト用にシンプルなインメモリ実装で差し替える。既存テストに前例が無いため、
// ここに最小限のスタブを直接書く。
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

Object.defineProperty(window, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

function emptyState(): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
}

function answer(topicId: string, answeredAt: string, isCorrect = true): UserAnswer {
  return {
    questionId: `${topicId}-q1`,
    selectedChoice: "A",
    isCorrect,
    answeredAt,
    tag: topicId,
    topicId,
  };
}

const NOW = new Date("2026-07-20T12:00:00");

describe("isTaskDoneToday", () => {
  it("同じローカル日に解答していればtrue", () => {
    const state = emptyState();
    state.answers.push(answer("topic-1", new Date("2026-07-20T02:00:00").toISOString()));
    expect(isTaskDoneToday(state, "topic-1", NOW)).toBe(true);
  });

  it("前日の解答はfalse（ローカル日境界）", () => {
    const state = emptyState();
    state.answers.push(answer("topic-1", new Date("2026-07-19T23:59:00").toISOString()));
    expect(isTaskDoneToday(state, "topic-1", NOW)).toBe(false);
  });

  it("解答が無ければfalse", () => {
    const state = emptyState();
    expect(isTaskDoneToday(state, "topic-1", NOW)).toBe(false);
  });
});

describe("buildQuestRoute", () => {
  const tasks: TodayRouteTask[] = [
    { topicId: "a", title: "A", estimatedMinutes: 5, activity: "learn" },
    { topicId: "b", title: "B", estimatedMinutes: 5, activity: "learn" },
    { topicId: "c", title: "C", estimatedMinutes: 5, activity: "review" },
  ];

  it("stored無しなら tasks の順にcurrent/up_next/lockedを割り当てる", () => {
    const state = emptyState();
    const route = buildQuestRoute(state, tasks, null, NOW);
    expect(route.map((n) => [n.topicId, n.state])).toEqual([
      ["a", "current"],
      ["b", "up_next"],
      ["c", "locked"],
    ]);
  });

  it("先頭が今日解答済みならdoneになり、次がcurrentへ繰り上がる", () => {
    const state = emptyState();
    state.answers.push(answer("a", NOW.toISOString()));
    const route = buildQuestRoute(state, tasks, null, NOW);
    expect(route.map((n) => [n.topicId, n.state])).toEqual([
      ["a", "done"],
      ["b", "current"],
      ["c", "up_next"],
    ]);
  });

  it("全て解答済みなら全てdone", () => {
    const state = emptyState();
    for (const t of tasks) state.answers.push(answer(t.topicId, NOW.toISOString()));
    const route = buildQuestRoute(state, tasks, null, NOW);
    expect(route.every((n) => n.state === "done")).toBe(true);
  });

  it("storedのうちtasksに残っていないが今日済みのidは、その位置のままdoneノードとして残る", () => {
    const state = emptyState();
    const realTopicId = getAllTopics().find((t) => getLessonLocation(t.id))!.id;
    state.answers.push(answer(realTopicId, NOW.toISOString()));
    // tasks には含まれていない（今日のタスク一覧から外れた想定）
    const stored = [realTopicId, "a", "b"];
    const route = buildQuestRoute(state, tasks, stored, NOW);
    expect(route[0].topicId).toBe(realTopicId);
    expect(route[0].state).toBe("done");
    expect(route.map((n) => n.topicId)).toEqual([realTopicId, "a", "b", "c"]);
  });

  it("storedに無い新規タスクは末尾に追加される", () => {
    const state = emptyState();
    const stored = ["b"];
    const route = buildQuestRoute(state, tasks, stored, NOW);
    expect(route.map((n) => n.topicId)).toEqual(["b", "a", "c"]);
  });

  it("storedの不正なid（tasksにも実在トピックにも無い）は落とされる", () => {
    const state = emptyState();
    const stored = ["not-a-real-topic-id", "a"];
    const route = buildQuestRoute(state, tasks, stored, NOW);
    expect(route.map((n) => n.topicId)).toEqual(["a", "b", "c"]);
  });

  it("topicIdの重複はde-dupeされる", () => {
    const state = emptyState();
    const stored = ["a", "a"];
    const route = buildQuestRoute(state, tasks, stored, NOW);
    expect(route.filter((n) => n.topicId === "a")).toHaveLength(1);
  });
});

describe("estimateTaskXpMax", () => {
  // n=4問のトピック。全問正解時: combo=min((4-2)*2,10)=4
  // base = 4*10 + 5 + 4 = 49。新規なら +20 = 69。
  const topicId = getAllTopics().find(
    (t) => t.checkQuestions.length >= 3 && getLessonLocation(t.id),
  )!.id;

  it("新規（未完了）トピックの全問正解最大XPを計算する", () => {
    const state = emptyState();
    const topic = getAllTopics().find((t) => t.id === topicId)!;
    const n = topic.checkQuestions.length;
    const combo = n >= 3 ? Math.min((n - 2) * 2, 10) : 0;
    const expected = n * 10 + 5 + combo + 20; // multiplier=1(new) + XP_NEW_TOPIC_BONUS
    expect(estimateTaskXpMax(state, topicId, NOW)).toBe(expected);
  });

  it("同日反復（multiplier=0）はnull", () => {
    const state = emptyState();
    state.progress.completedTopics.push(topicId);
    state.answers.push(answer(topicId, NOW.toISOString()));
    expect(estimateTaskXpMax(state, topicId, NOW)).toBeNull();
  });

  it("確認問題が存在しないトピックidはnull", () => {
    const state = emptyState();
    expect(estimateTaskXpMax(state, "no-such-topic", NOW)).toBeNull();
  });
});

describe("loadStoredRoute / saveStoredRoute", () => {
  it("保存した内容を同じ日付で読み込める", () => {
    saveStoredRoute("2026-07-20", ["a", "b"]);
    expect(loadStoredRoute("2026-07-20")).toEqual(["a", "b"]);
  });

  it("日付が異なればnull", () => {
    saveStoredRoute("2026-07-20", ["a", "b"]);
    expect(loadStoredRoute("2026-07-21")).toBeNull();
  });

  it("保存が無ければnull", () => {
    window.localStorage.removeItem(TODAY_ROUTE_STORAGE_KEY);
    expect(loadStoredRoute("2026-07-20")).toBeNull();
  });

  it("不正なJSONが入っていてもエラーにせずnullを返す", () => {
    window.localStorage.setItem(TODAY_ROUTE_STORAGE_KEY, "{not json");
    expect(loadStoredRoute("2026-07-20")).toBeNull();
  });
});
