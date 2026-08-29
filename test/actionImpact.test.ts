import { describe, expect, it } from "vitest";
import type { AppState, TopicMasteryStats } from "@/types";
import type { CheckpointGate } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { TodayPrimaryAction } from "@/types/gameful";
import { ACTION_IMPACT_LIMIT } from "@/types/gameful";
import { buildActionImpact } from "@/lib/actionImpact";
import { buildCheckpointGate } from "@/lib/checkpoints";
import { buildBadgeStatuses } from "@/lib/badges";

// GF-P0-002「行動効果の情報開示」。要件書 §16.1 が求める
// 「保証できないスコア予測を返さない」ことを最優先で固定する。

const TECH_TOPIC = "tech-binary-data";
const MGMT_TOPIC = "mgmt-pm-qcd";

function state(overrides: Partial<AppState["progress"]> = {}): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
      ...overrides,
    },
    answers: [],
  };
}

function weakStats(topicId: string): Record<string, TopicMasteryStats> {
  return {
    [topicId]: {
      topicId,
      masteryScore: 10,
      lastEvaluatedAt: "2026-08-20T00:00:00.000Z",
      correctCount: 1,
      incorrectCount: 5,
      reviewSuccessCount: 0,
      recentEvidence: [],
    },
  };
}

function topicAction(topicId: string): TodayPrimaryAction {
  return {
    kind: "new_topic",
    topicId,
    title: "テスト用トピック",
    estimatedMinutes: 7,
    questionCount: null,
    reasonLabel: "次の新規Topic",
    href: "/learn/x/y/z",
    activity: "learn",
  };
}

const EXAM_ACTION: TodayPrimaryAction = {
  kind: "final_exam",
  topicId: null,
  title: "CP1「全体像把握」の突破試験",
  estimatedMinutes: null,
  questionCount: 6,
  reasonLabel: "必須バッジ 3/3 が揃いました",
  href: "/checkpoint/cp1/final",
  activity: "learn",
};

function build(appState: AppState, action: TodayPrimaryAction, gate?: CheckpointGate) {
  return buildActionImpact({
    state: appState,
    action,
    gate: gate ?? buildCheckpointGate(appState, "cp1"),
  });
}

describe("honesty guarantees", () => {
  it("never returns a percentage or a predicted score", () => {
    const cases = [
      build(state(), topicAction(TECH_TOPIC)),
      build(state({ reviewQueue: [{ topicId: TECH_TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }] }), topicAction(TECH_TOPIC)),
      build(state(), EXAM_ACTION),
    ];

    for (const impacts of cases) {
      for (const impact of impacts) {
        expect(impact.label).not.toMatch(/%/);
        expect(impact.label).not.toMatch(/\+\s*\d/);
        expect(impact.label).not.toMatch(/合格準備度/);
      }
    }
  });

  it("always returns at least one item", () => {
    expect(build(state(), topicAction(TECH_TOPIC)).length).toBeGreaterThanOrEqual(1);
    expect(build(state(), EXAM_ACTION).length).toBeGreaterThanOrEqual(1);
  });

  it("never returns more than the disclosure limit", () => {
    const loaded = state({
      completedTopics: [],
      reviewQueue: [{ topicId: TECH_TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }],
      topicMasteryStats: weakStats(TECH_TOPIC),
    });

    expect(build(loaded, topicAction(TECH_TOPIC)).length).toBeLessThanOrEqual(ACTION_IMPACT_LIMIT);
  });

  it("falls back to the measurement update when nothing else applies", () => {
    const done = state({ completedTopics: [TECH_TOPIC, MGMT_TOPIC] });

    expect(build(done, topicAction(TECH_TOPIC))).toEqual([
      { kind: "evidence", label: "理解度の測定データを更新します" },
    ]);
  });
});

describe("certain updates", () => {
  it("reports clearing the review queue when the topic is queued", () => {
    const queued = state({
      reviewQueue: [{ topicId: TECH_TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }],
      completedTopics: [TECH_TOPIC, MGMT_TOPIC],
    });

    expect(build(queued, topicAction(TECH_TOPIC)).map((i) => i.kind)).toContain("review_queue");
  });

  it("does not report the review queue for an unqueued topic", () => {
    expect(build(state(), topicAction(TECH_TOPIC)).map((i) => i.kind)).not.toContain("review_queue");
  });

  it("reports re-measuring a weak topic", () => {
    const weak = state({
      topicMasteryStats: weakStats(TECH_TOPIC),
      completedTopics: [TECH_TOPIC, MGMT_TOPIC],
    });

    expect(build(weak, topicAction(TECH_TOPIC)).map((i) => i.kind)).toContain("weak_remeasure");
  });

  it("does not report a weak re-measure for a healthy topic", () => {
    expect(build(state(), topicAction(TECH_TOPIC)).map((i) => i.kind)).not.toContain(
      "weak_remeasure",
    );
  });
});

describe("required badge detection", () => {
  it("reports the required badge a completion would satisfy", () => {
    const impacts = build(state(), topicAction(TECH_TOPIC));
    const badge = impacts.find((i) => i.kind === "required_badge");

    expect(badge?.label).toBe("必須バッジ「テクノロジ探訪」の条件を満たします");
  });

  it("agrees with the existing badge evaluation", () => {
    // 独自条件ではなく buildBadgeStatuses の再評価であることを突き合わせる。
    const base = state();
    const hypothetical: AppState = {
      ...base,
      progress: { ...base.progress, completedTopics: [TECH_TOPIC] },
    };
    const flipped = buildBadgeStatuses(hypothetical)
      .filter((s) => s.def.requiredForGate && !s.earned && s.conditionMet)
      .map((s) => s.def.id);

    expect(flipped).toContain("b-cp1-touch-tech");
    expect(build(base, topicAction(TECH_TOPIC)).map((i) => i.kind)).toContain("required_badge");
  });

  it("does not report a badge that is already satisfied", () => {
    const already = state({ completedTopics: [TECH_TOPIC] });

    expect(build(already, topicAction(TECH_TOPIC)).map((i) => i.kind)).not.toContain(
      "required_badge",
    );
  });

  it("does not report a badge for a field that is not advanced", () => {
    // 技術トピックを完了してもマネジメントの必須バッジは満たされない。
    const impacts = build(state({ completedTopics: [MGMT_TOPIC] }), topicAction(MGMT_TOPIC));

    expect(impacts.map((i) => i.kind)).not.toContain("required_badge");
  });
});

describe("checkpoint unlock detection", () => {
  it("announces the final exam unlock only when it is the last missing badge", () => {
    // 必須3件のうち2件を獲得済みにし、残り1件を今回の完了で満たす状況を作る。
    const base = buildCheckpointGate(state(), "cp1");
    const gate: CheckpointGate = {
      ...base,
      missingBadges: base.missingBadges.filter((b) => b.id === "b-cp1-touch-tech"),
      earnedRequiredCount: 2,
      fieldCoverageMet: true,
      accuracyMet: true,
      finalExamUnlocked: false,
    };
    const impacts = build(state(), topicAction(TECH_TOPIC), gate);

    expect(impacts.map((i) => i.kind)).toContain("checkpoint");
    expect(impacts.find((i) => i.kind === "checkpoint")?.label).toBe(
      "CP1の突破試験が解放されます",
    );
  });

  it("stays silent while other required badges are still missing", () => {
    const impacts = build(state(), topicAction(TECH_TOPIC));

    expect(impacts.map((i) => i.kind)).not.toContain("checkpoint");
  });
});

describe("final exam action", () => {
  it("does not promise a pass", () => {
    const impacts = build(state(), EXAM_ACTION);

    expect(impacts.find((i) => i.kind === "checkpoint")?.label).toContain("合格すると");
    expect(impacts.map((i) => i.kind)).toContain("evidence");
  });

  it("stays within the disclosure limit", () => {
    expect(build(state(), EXAM_ACTION).length).toBeLessThanOrEqual(ACTION_IMPACT_LIMIT);
  });
});

describe("purity", () => {
  it("does not mutate the state it evaluates", () => {
    const input = state({ reviewQueue: [{ topicId: TECH_TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }] });
    const snapshot = structuredClone(input);

    build(input, topicAction(TECH_TOPIC));

    expect(input).toEqual(snapshot);
  });

  it("leaves completedTopics untouched when probing the hypothetical completion", () => {
    const input = state();
    build(input, topicAction(TECH_TOPIC));

    expect(input.progress.completedTopics).toEqual([]);
  });
});
