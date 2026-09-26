import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getCurrentReadiness: vi.fn(),
  getLatestIntegratedStatusRow: vi.fn(),
}));
vi.mock("@/lib/examReadiness/service", () => ({ getCurrentReadiness: mocks.getCurrentReadiness }));
vi.mock("@/lib/progressBootstrap", () => ({ getLatestIntegratedStatusRow: mocks.getLatestIntegratedStatusRow }));

import { buildMochitLearningContext } from "@/lib/mochitAi/learningContext";

type Query = { table: string; filters: [string, unknown][] };

/** 呼ばれたテーブルと絞り込み条件を記録する最小のクエリビルダー。 */
function fakeSupabase(rows: Record<string, unknown>) {
  const queries: Query[] = [];
  const client = {
    from(table: string) {
      const query: Query = { table, filters: [] };
      queries.push(query);
      const result = () => {
        const data = rows[table] ?? null;
        return Promise.resolve({ data, error: null });
      };
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          query.filters.push([column, value]);
          return builder;
        },
        gte: () => builder,
        order: () => builder,
        limit: () => result(),
        maybeSingle: () => result(),
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, queries };
}

const NOW = new Date("2026-09-26T03:00:00.000Z");
const topicId = "tech-network-ip-address";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentReadiness.mockResolvedValue(null);
  mocks.getLatestIntegratedStatusRow.mockResolvedValue(null);
});

describe("buildMochitLearningContext", () => {
  const attempts = Array.from({ length: 40 }, (_, i) => ({
    topic_id: topicId,
    is_correct: i % 2 === 0,
    answered_at: "2026-09-25T03:00:00.000Z",
  }));

  it("本人の行だけを読み、回答履歴は集計結果だけを渡す", async () => {
    const { client, queries } = fakeSupabase({
      user_profiles: { exam_date: "2026-10-26" },
      question_attempts: attempts,
    });
    const context = await buildMochitLearningContext({
      supabase: client,
      userId: "user-1",
      now: NOW,
      intent: "status",
      page: "progress",
      localDate: "2026-09-26",
      timezoneOffsetMinutes: -540,
      question: null,
      learnTopicId: null,
      today: null,
    });
    for (const query of queries) {
      expect(query.filters).toContainEqual(["user_id", "user-1"]);
    }
    expect(mocks.getCurrentReadiness).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
    const facts = context.facts as Record<string, unknown>;
    expect(facts.exam).toEqual({ examDate: "2026-10-26", daysUntilExam: expect.any(Number) });
    // 実力データが無ければ推測させず「判断材料不足」と渡す
    expect(facts.readiness).toContain("判断材料不足");
    expect(context.band).toBeNull();
    const serialized = JSON.stringify(facts);
    expect(serialized).not.toContain("answered_at");
    expect(serialized).not.toContain("2026-09-25T03:00:00.000Z");
    expect((facts.recent14Days as { answered: number }).answered).toBe(40);
  });

  it("問題の質問では実力の再計算を呼ばず、問題とそのトピックの状況だけを渡す", async () => {
    const { client } = fakeSupabase({ question_attempts: attempts });
    const context = await buildMochitLearningContext({
      supabase: client,
      userId: "user-1",
      now: NOW,
      intent: "question",
      page: "question",
      localDate: "2026-09-26",
      timezoneOffsetMinutes: -540,
      question: {
        questionId: "q1",
        topicId,
        prompt: "IPアドレスとは？",
        choices: [
          { label: "A", text: "住所" },
          { label: "B", text: "名前" },
        ],
        correctLabel: "A",
        selectedLabel: "B",
        explanation: "解説",
      },
      learnTopicId: null,
      today: null,
    });
    expect(mocks.getCurrentReadiness).not.toHaveBeenCalled();
    const facts = context.facts as { question: Record<string, unknown>; topicRecent: unknown };
    expect(facts.question).toMatchObject({ correct: "A", selected: "B", result: "不正解" });
    expect(facts.topicRecent).toEqual({ answered: 40, accuracy: 50, enoughData: true });
  });

  it("振り返りでは今日固定されたミッションだけを使う", async () => {
    const { client } = fakeSupabase({
      question_attempts: [],
      user_progress: {
        checkpoint_progress: { dailyQuests: { date: "2026-09-25", claimed: false, quests: [] } },
      },
    });
    const context = await buildMochitLearningContext({
      supabase: client,
      userId: "user-1",
      now: NOW,
      intent: "reflection",
      page: "today",
      localDate: "2026-09-26",
      timezoneOffsetMinutes: -540,
      question: null,
      learnTopicId: null,
      today: null,
    });
    expect((context.facts.today as { missions: unknown }).missions).toBeNull();
    expect(mocks.getCurrentReadiness).not.toHaveBeenCalled();
  });
});
