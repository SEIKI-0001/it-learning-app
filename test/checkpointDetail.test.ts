import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import type { CheckpointId, CheckpointProgress } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { TopicField } from "@/types/content";
import { getAllTopics } from "@/lib/content";
import {
  buildCheckpointGate,
  buildCheckpointRoadmap,
  CHECKPOINTS,
  gateCompletionRatio,
  getCheckpointStage,
} from "@/lib/checkpoints";
import { buildCheckpointDetail, formatBadgeGap } from "@/lib/checkpointDetail";
import { getRequiredBadges } from "@/lib/badges";

const now = new Date("2026-09-24T09:00:00.000Z");
const all = getAllTopics();
const byField = (field: TopicField) => all.filter((topic) => topic.field === field);

function answers(correct: number, wrong: number): UserAnswer[] {
  return Array.from({ length: correct + wrong }, (_, i) => ({
    questionId: `q-${i}`,
    selectedIndex: 0,
    isCorrect: i < correct,
    tag: "t",
    topicId: all[0].id,
    answeredAt: new Date(now.getTime() - (i + 1) * 60_000).toISOString(),
  }));
}

function makeState(
  cp: Partial<CheckpointProgress>,
  opts: { completed?: string[]; answers?: UserAnswer[]; profile?: boolean } = {},
): AppState {
  return {
    profile: opts.profile === false ? undefined : ({ examDate: "2026-12-01" } as AppState["profile"]),
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: opts.completed ?? [],
      topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, ...cp },
    },
    answers: opts.answers ?? [],
  };
}

const earned = (...ids: string[]) =>
  ids.map((badgeId) => ({ badgeId, earnedAt: "2026-09-01T00:00:00.000Z", fromDrop: false }));

describe("getCheckpointStage", () => {
  it("treats CPs before the current one as cleared, including CP0 which is never listed", () => {
    const progress = { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp3" as CheckpointId, clearedCheckpointIds: ["cp1", "cp2"] as CheckpointId[] };
    expect(CHECKPOINTS.map((cp) => getCheckpointStage(progress, cp.id))).toEqual([
      "cleared", "cleared", "cleared", "current", "next", "locked", "locked",
    ]);
  });

  it("marks the last CP cleared once its exam is passed", () => {
    const progress = { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp6" as CheckpointId, clearedCheckpointIds: ["cp6"] as CheckpointId[] };
    expect(getCheckpointStage(progress, "cp6")).toBe("cleared");
  });
});

describe("buildCheckpointDetail", () => {
  it("lists exactly the gate's conditions for the current CP and matches its verdicts", () => {
    const state = makeState(
      { currentCheckpointId: "cp3", clearedCheckpointIds: ["cp1", "cp2"], earnedBadges: earned("b-cp3-quiz-tech") },
      { completed: [byField("technology")[0].id, byField("management")[0].id], answers: answers(5, 5) },
    );
    const gate = buildCheckpointGate(state, "cp3");
    const detail = buildCheckpointDetail(state, "cp3", undefined, now);

    expect(detail.stage).toBe("current");
    expect(detail.conditions.map((c) => c.id)).toEqual(["badges", "fieldCoverage", "recentAccuracy", "finalExam"]);
    const byId = Object.fromEntries(detail.conditions.map((c) => [c.id, c]));
    expect(byId.badges.met).toBe(false);
    expect(byId.badges.count).toEqual({ current: gate.earnedRequiredCount, required: gate.requiredBadgeCount });
    expect(byId.fieldCoverage.met).toBe(gate.fieldCoverageMet);
    expect(byId.fieldCoverage.detail).toBe("まだ: ストラテジ系");
    expect(byId.recentAccuracy.met).toBe(gate.accuracyMet);
    expect(byId.recentAccuracy.detail).toBe("いま 50%");
    expect(byId.finalExam.locked).toBe(true);

    expect(detail.remaining).toEqual([
      "CP達成条件をあと3件満たす",
      "ストラテジ系のトピックを1つ完了する",
      "直近の正答率を60%以上にする",
      "突破試験に合格する",
    ]);
    expect(detail.requiredBadges.map((b) => b.def.id)).toEqual(getRequiredBadges("cp3").map((b) => b.id));
    const tech = detail.requiredBadges.find((b) => b.def.id === "b-cp3-quiz-tech")!;
    expect(tech.earned).toBe(true);
    const mgmt = detail.requiredBadges.find((b) => b.def.id === "b-cp3-quiz-mgmt")!;
    expect(mgmt.gaps).toEqual(["いま 0 / 4"]);
  });

  it("unlocks the exam row exactly when the gate unlocks the final exam", () => {
    const fields: TopicField[] = ["technology", "management", "strategy"];
    const state = makeState(
      { currentCheckpointId: "cp1", earnedBadges: earned(...getRequiredBadges("cp1").map((b) => b.id)) },
      { completed: fields.map((f) => byField(f)[0].id) },
    );
    const gate = buildCheckpointGate(state, "cp1");
    const detail = buildCheckpointDetail(state, "cp1", undefined, now);
    expect(gate.finalExamUnlocked).toBe(true);
    const exam = detail.conditions.find((c) => c.id === "finalExam")!;
    expect(exam.locked).toBe(false);
    expect(exam.met).toBe(false);
    expect(detail.remaining).toEqual(["突破試験に合格する"]);
  });

  it("keeps display and gate verdicts in agreement for every CP", () => {
    const states = [
      makeState({ currentCheckpointId: "cp1" }),
      makeState(
        { currentCheckpointId: "cp4", clearedCheckpointIds: ["cp1", "cp2", "cp3"], earnedBadges: earned(...getRequiredBadges("cp4").map((b) => b.id)) },
        { completed: [byField("technology")[0].id], answers: answers(9, 1) },
      ),
    ];
    for (const state of states) {
      for (const cp of CHECKPOINTS) {
        if (!cp.finalExam) continue;
        const gate = buildCheckpointGate(state, cp.id);
        const detail = buildCheckpointDetail(state, cp.id, undefined, now);
        const preExam = detail.conditions.filter((c) => c.id !== "finalExam");
        expect(preExam.every((c) => c.met)).toBe(gate.finalExamUnlocked);
        expect(detail.conditions.find((c) => c.id === "finalExam")!.met).toBe(gate.finalExamPassed);
        expect(detail.requiredBadges.filter((b) => b.earned)).toHaveLength(gate.earnedRequiredCount);
      }
    }
  });

  it("shows the unlock condition and current CP for future CPs", () => {
    const state = makeState({ currentCheckpointId: "cp3", clearedCheckpointIds: ["cp1", "cp2"] });
    const next = buildCheckpointDetail(state, "cp4", undefined, now);
    expect(next.stage).toBe("next");
    expect(next.currentCheckpoint.id).toBe("cp3");
    expect(next.unlockAfter?.id).toBe("cp3");
    const locked = buildCheckpointDetail(state, "cp5", undefined, now);
    expect(locked.stage).toBe("locked");
    expect(locked.unlockAfter?.id).toBe("cp4");
    expect(locked.conditions.map((c) => c.id)).toEqual(["badges", "fieldCoverage", "recentAccuracy", "finalExam"]);
  });

  it("returns the passing attempt for a cleared CP", () => {
    const state = makeState({
      currentCheckpointId: "cp2",
      clearedCheckpointIds: ["cp1"],
      earnedBadges: earned(...getRequiredBadges("cp1").map((b) => b.id), "b-cp1-final"),
      finalExamAttempts: [
        { checkpointId: "cp1", passed: false, correct: 3, total: 6, attemptedAt: "2026-09-02T00:00:00.000Z", wrongTopicIds: [] },
        { checkpointId: "cp1", passed: true, correct: 5, total: 6, attemptedAt: "2026-09-03T00:00:00.000Z", wrongTopicIds: [] },
      ],
    });
    const detail = buildCheckpointDetail(state, "cp1", undefined, now);
    expect(detail.stage).toBe("cleared");
    expect(detail.passedAttempt?.correct).toBe(5);
    expect(detail.attemptCount).toBe(2);
    expect(detail.extraEarnedCount).toBe(1);
  });

  it("describes CP0 by its setup condition only", () => {
    const detail = buildCheckpointDetail(makeState({ currentCheckpointId: "cp1" }), "cp0", undefined, now);
    expect(detail.stage).toBe("cleared");
    expect(detail.conditions).toHaveLength(1);
    expect(detail.conditions[0]).toMatchObject({ id: "setup", met: true });
  });
});

describe("gateCompletionRatio", () => {
  it("drives the roadmap progress with the same value", () => {
    const state = makeState({ currentCheckpointId: "cp2", clearedCheckpointIds: ["cp1"], earnedBadges: earned("b-cp2-basics-tech") });
    const ratio = gateCompletionRatio(buildCheckpointGate(state, "cp2"));
    expect(ratio).toBe(0.25);
    expect(buildCheckpointRoadmap(state).find((p) => p.status === "current")?.progress).toBe(25);
  });
});

describe("formatBadgeGap", () => {
  it("phrases decreasing and percentage criteria", () => {
    expect(formatBadgeGap({ metric: "reviewCount", current: 5, target: 3, direction: "decrease" })).toBe("復習待ち いま 5件（3件以下で達成）");
    expect(formatBadgeGap({ metric: "completedByField", field: "technology", current: 4, target: 6, direction: "increase" })).toBe("テクノロジ系の完了したトピック 4 / 6");
    expect(formatBadgeGap({ metric: "completedByField", field: "technology", current: 4, target: 6, direction: "increase" }, true)).toBe("いま 4 / 6");
    expect(formatBadgeGap({ metric: "recentAccuracy", current: 0.55, target: 0.7, direction: "increase" })).toBe("直近の正答率 いま 55%（70%以上で達成）");
  });
});
