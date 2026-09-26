import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { evaluateKakomonAccess, checkpointOrderOf } from "@/lib/kakomonAccess";
import { buildKakomonStages, generateLearningPlan, isKakomonReady } from "@/lib/studyPlanner";
import { buildKakomonActivities } from "@/lib/todayKakomon";
import { getCheckpoint } from "@/lib/checkpoints";

const topics = getAllTopics();
const now = new Date(2026, 8, 26, 12, 0, 0);

function examDateAfter(days: number): string {
  const d = new Date(now.getTime() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function state(options: {
  cp?: CheckpointId | null;
  completedRatio?: number;
  examInDays?: number;
  answers?: UserAnswer[];
}): AppState {
  const count = Math.round(topics.length * (options.completedRatio ?? 0));
  return {
    profile: {
      examDate: options.examInDays === undefined ? undefined : examDateAfter(options.examInDays),
      weekdayMinutes: 30,
    },
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: topics.slice(0, count).map((t) => t.id),
      topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      ...(options.cp === null
        ? {}
        : { checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: options.cp ?? "cp1" } }),
    },
    answers: options.answers ?? [],
  } as unknown as AppState;
}

function daysRemaining(s: AppState): number | null {
  return generateLearningPlan(s, topics, now).daysUntilExam;
}

describe("過去問開始可否の Single Source of Truth", () => {
  it("CP5 以降は数値条件に関係なく解禁（基本ルート）", () => {
    expect(evaluateKakomonAccess({ checkpointOrder: 5, completedRatio: 0, recentAccuracy: null, daysRemaining: null }))
      .toEqual({ unlocked: true, reason: "checkpoint", route: "standard" });
    expect(evaluateKakomonAccess({ checkpointOrder: 6, completedRatio: 0, recentAccuracy: 0, daysRemaining: 90 }).unlocked)
      .toBe(true);
  });

  it("CP3〜4 は試験日が近い／実力が十分なときだけ前倒しで解禁", () => {
    expect(evaluateKakomonAccess({ checkpointOrder: 4, completedRatio: 0.3, recentAccuracy: null, daysRemaining: 10 }))
      .toMatchObject({ unlocked: true, reason: "exam_near", route: "early" });
    expect(evaluateKakomonAccess({ checkpointOrder: 3, completedRatio: 0.55, recentAccuracy: null, daysRemaining: 60 }))
      .toMatchObject({ unlocked: true, reason: "strong_progress" });
    expect(evaluateKakomonAccess({ checkpointOrder: 4, completedRatio: 0.4, recentAccuracy: 0.75, daysRemaining: 60 }))
      .toMatchObject({ unlocked: true, reason: "strong_progress" });
    expect(evaluateKakomonAccess({ checkpointOrder: 4, completedRatio: 0.3, recentAccuracy: 0.6, daysRemaining: 60 }))
      .toMatchObject({ unlocked: false, reason: "locked" });
  });

  it("CP1〜2 は数値条件を満たしても前倒ししない（過去問を強制しない）", () => {
    expect(evaluateKakomonAccess({ checkpointOrder: 2, completedRatio: 0.9, recentAccuracy: 1, daysRemaining: 3 }).unlocked)
      .toBe(false);
  });

  it("CP 進行が保存されていない旧データは従来の数値条件だけで判定する", () => {
    expect(checkpointOrderOf(state({ cp: null }).progress)).toBeNull();
    expect(isKakomonReady(topics, state({ cp: null, completedRatio: 0.5 }).progress, [], null)).toBe(true);
    expect(isKakomonReady(topics, state({ cp: null, completedRatio: 0.2 }).progress, [], null)).toBe(false);
  });

  it("学習計画（/plan）と Today の過去問タスクが同じ判定を使う", () => {
    const cases = [
      state({ cp: "cp5" }),
      state({ cp: "cp4", completedRatio: 0.3, examInDays: 10 }),
      state({ cp: "cp4", completedRatio: 0.3, examInDays: 60 }),
      state({ cp: "cp2", completedRatio: 0.9, examInDays: 5 }),
    ];
    for (const s of cases) {
      const plan = generateLearningPlan(s, topics, now);
      const todayTasks = buildKakomonActivities({
        topics, progress: s.progress, answers: s.answers,
        daysRemaining: daysRemaining(s), budgetMinutes: 30, now,
      });
      expect(todayTasks.length > 0).toBe(plan.kakomonReady);
      const stages = buildKakomonStages(topics, s.progress, s.answers, daysRemaining(s), now);
      expect(stages.find((stage) => stage.id === "field-drill")?.unlocked).toBe(plan.kakomonReady);
    }
  });

  it("CP5 の名称・説明は過去問実戦型（突破条件は変えない）", () => {
    const cp5 = getCheckpoint("cp5");
    expect(cp5.title).toBe("過去問実戦");
    expect(cp5.summary).toBe("公式過去問を使って、本番で解ける力を身につけます。");
    expect(cp5.finalExam).toEqual({ questionCount: 15, passThreshold: 11, weakRatio: 0.4 });
    expect(cp5.requiredBadgeCount).toBe(3);
    expect(cp5.recentAccuracyMin).toBe(0.65);
  });
});
