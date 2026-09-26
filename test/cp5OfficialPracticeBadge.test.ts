import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { BADGES, getRequiredBadgeGaps, isBadgeConditionMet } from "@/lib/badges";
import { buildCheckpointGate } from "@/lib/checkpoints";
import { buildCheckpointDetail } from "@/lib/checkpointDetail";
import { buildKakomonStages, KAKOMON_FIELD_DRILL_TARGET as PLANNER_TARGET } from "@/lib/studyPlanner";
import { KAKOMON_FIELD_DRILL_TARGET } from "@/lib/pastExam/kakomonRules";
import { getAllTopics } from "@/lib/content";

const BADGE = "b-cp5-kakomon-ready";
const now = new Date(2026, 8, 26, 12, 0, 0);
const at = new Date(2026, 8, 20, 12, 0, 0).toISOString();

/** 2026年度: ストラテジ1-34 / マネジメント35-54 / テクノロジ55-100 */
function official(from: number, count: number, isCorrect = false): UserAnswer[] {
  return Array.from({ length: count }, (_, i) => ({
    questionId: `ipa-it-passport-2026-q${String(from + i).padStart(3, "0")}`,
    isCorrect,
    answeredAt: at,
    tag: "t",
    topicId: "tech-network-address",
  }));
}

function state(answers: UserAnswer[], cp: CheckpointId = "cp5", earned: string[] = []): AppState {
  return {
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: [], topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: cp,
        earnedBadges: earned.map((badgeId) => ({ badgeId, earnedAt: at })),
      },
    },
    answers,
  } as AppState;
}

const T = KAKOMON_FIELD_DRILL_TARGET;
const threeFields = [...official(1, T), ...official(35, T), ...official(55, T)];

describe("CP5 必須バッジ「3分野実戦」", () => {
  it("名称・説明は公式過去問の実戦内容（内部 ID は互換のため維持）", () => {
    const def = BADGES.find((b) => b.id === BADGE)!;
    expect(def).toMatchObject({
      label: "3分野実戦",
      description: "公式過去問を3分野で一通り演習した証。",
      checkpointId: "cp5",
      requiredForGate: true,
    });
    expect(def.conditionLabel).toContain(`${T}問以上`);
  });

  it("公式過去問0問では獲得しない", () => {
    expect(isBadgeConditionMet(BADGE, state([]), undefined, now)).toBe(false);
  });

  it("1分野だけ15問では獲得しない（残り2分野が不足として出る）", () => {
    const s = state(official(55, T));
    expect(isBadgeConditionMet(BADGE, s, undefined, now)).toBe(false);
    const gaps = getRequiredBadgeGaps(BADGE, s, undefined, now)[0];
    expect(gaps.map((g) => [g.field, g.current, g.target]).sort()).toEqual([
      ["management", 0, T],
      ["strategy", 0, T],
    ]);
  });

  it("3分野各15問で獲得する（正答率は問わない）", () => {
    expect(isBadgeConditionMet(BADGE, state(threeFields), undefined, now)).toBe(true);
    // 同じ問題を何度解いても1問として数える
    const repeated = [...official(1, T - 1), ...official(1, T - 1), ...official(35, T), ...official(55, T)];
    expect(isBadgeConditionMet(BADGE, state(repeated), undefined, now)).toBe(false);
  });

  it("前倒し解禁中（CP3〜4）に解いた実績も CP5 でそのまま認める", () => {
    expect(isBadgeConditionMet(BADGE, state(threeFields, "cp4"), undefined, now)).toBe(true);
    // CP4 のまま演習した記録を持って CP5 に進んだ状態
    expect(isBadgeConditionMet(BADGE, state(threeFields, "cp5"), undefined, now)).toBe(true);
  });

  it("旧条件で獲得済みのバッジは剥奪しない（ゲートは獲得済みとして数える）", () => {
    const gate = buildCheckpointGate(state([], "cp5", [BADGE]), "cp5");
    expect(gate.missingBadges.map((b) => b.id)).not.toContain(BADGE);
  });

  it("buildKakomonStages と同じ閾値を使う（1か所で定義）", () => {
    expect(PLANNER_TARGET).toBe(KAKOMON_FIELD_DRILL_TARGET);
    const topics = getAllTopics();
    const random = (answers: UserAnswer[]) => buildKakomonStages(topics, state(answers).progress, answers, null, now)
      .find((stage) => stage.id === "random")!.unlocked;
    const almost = [...official(1, T), ...official(35, T), ...official(55, T - 1)];
    // 分野別を終えた（= バッジ条件を満たした）ところで混合・ランダムへ進む
    expect(random(almost)).toBe(false);
    expect(isBadgeConditionMet(BADGE, state(almost), undefined, now)).toBe(false);
    expect(random(threeFields)).toBe(true);
    expect(isBadgeConditionMet(BADGE, state(threeFields), undefined, now)).toBe(true);
  });

  it("CP 詳細は分野ごとの残りを同じ閾値で表示する", () => {
    const detail = buildCheckpointDetail(state(official(55, 4)), "cp5", undefined, now);
    const row = detail.requiredBadges.find((r) => r.def.id === BADGE)!;
    expect(row.gaps).toContain(`ストラテジ系の解いた公式過去問 0 / ${T}`);
    expect(row.gaps).toContain(`テクノロジ系の解いた公式過去問 4 / ${T}`);
  });
});
