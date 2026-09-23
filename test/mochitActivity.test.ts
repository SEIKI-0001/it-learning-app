import { describe, expect, it } from "vitest";
import {
  activityAllowsMacroIdle,
  activityAllowsSleep,
  activityForFocusPhase,
  activityTransitionKind,
  buildActivityTransitionPlan,
  getActivityPose,
  getActivityRestingExpression,
  isNeutralActivityPose,
  MOCHIT_ACTIVITIES,
  nextActivityGaze,
  readingGazeOffsets,
  staticActivityGaze,
} from "@/components/mochit/mochitActivity";
import { canPlayMacroIdle, isMacroIdleAutoEnabled, type MacroIdleConditions } from "@/components/mochit/mochitMacroIdle";
import { getMochitRestingExpression } from "@/components/mochit/mochitRestingExpression";

const RANGE = { rangeX: 16, rangeY: 12 };

describe("mochitActivity: Focus Session との対応と優先順位", () => {
  it("focus=studying / break=resting / idle・paused=idle", () => {
    expect(activityForFocusPhase("focus")).toBe("studying");
    expect(activityForFocusPhase("break")).toBe("resting");
    expect(activityForFocusPhase("paused")).toBe("idle");
    expect(activityForFocusPhase("idle")).toBe("idle");
  });

  it("Activity 中は Sleep も Macro Idle も許さない", () => {
    expect(activityAllowsSleep("idle")).toBe(true);
    expect(activityAllowsSleep("studying")).toBe(false);
    expect(activityAllowsSleep("resting")).toBe(false);
    expect(activityAllowsMacroIdle("studying")).toBe(false);
    expect(activityAllowsMacroIdle("resting")).toBe(false);
    const base: MacroIdleConditions = {
      active: true,
      reducedMotion: false,
      compact: false,
      reacting: false,
      attention: "random",
    };
    expect(isMacroIdleAutoEnabled(base)).toBe(true);
    expect(isMacroIdleAutoEnabled({ ...base, activity: "idle" })).toBe(true);
    expect(canPlayMacroIdle({ ...base, activity: "studying" })).toBe(false);
    expect(canPlayMacroIdle({ ...base, activity: "resting" })).toBe(false);
  });
});

describe("mochitActivity: 表情", () => {
  it("studying は目線を落とし、resting は笑顔で目を細める。どちらも sleepy とは別", () => {
    const sleepy = getMochitRestingExpression("sleepy");
    const studying = getActivityRestingExpression("studying")!;
    const resting = getActivityRestingExpression("resting")!;
    expect(studying.eyelidRest).toBeGreaterThan(0);
    expect(studying.eyelidRest).toBeLessThan(sleepy.eyelidRest);
    expect(resting.mouth).toBe("smile");
    expect(sleepy.mouth).toBe("neutral");
    expect(getActivityRestingExpression("idle")).toBeNull();
  });

  it("顔を上げている間（lifted）は目を開ける", () => {
    expect(getActivityRestingExpression("studying", { lifted: true })!.eyelidRest).toBe(0);
    expect(getActivityRestingExpression("resting", { lifted: true })!.mouth).toBe("smile");
  });
});

describe("mochitActivity: 視線パターン", () => {
  it("studying は教材（下）を左から右へ読み、行末で左へ戻る", () => {
    const cursor = { index: 0 };
    const rng = () => 0.5;
    const stops = readingGazeOffsets(RANGE);
    const seen = Array.from({ length: 5 }, () => nextActivityGaze("studying", RANGE, cursor, rng));
    expect(seen.map((s) => s.offset)).toEqual([...stops, stops[0]]);
    for (const step of seen) expect(step.offset.y).toBeGreaterThan(0);
    expect(seen[4].moveMs).toBeGreaterThan(seen[1].moveMs);
  });

  it("studying はときどきユーザーをちらっと見る（読む位置は進めない）", () => {
    const cursor = { index: 1 };
    const glance = nextActivityGaze("studying", RANGE, cursor, () => 0.01);
    expect(glance.offset).toEqual({ x: 0, y: 0 });
    expect(cursor.index).toBe(1);
  });

  it("resting はゆっくり長めに止まりながら見回す。user は正面で止まる", () => {
    const step = nextActivityGaze("resting", RANGE, { index: 0 }, () => 0.9);
    expect(step.holdMs).toBeGreaterThanOrEqual(2200);
    expect(step.offset.x).not.toBe(0);
    expect(nextActivityGaze("user", RANGE, { index: 0 }).holdMs).toBe(Infinity);
    expect(staticActivityGaze("studying", RANGE).y).toBeGreaterThan(0);
  });
});

describe("mochitActivity: 切り替わりの振り付け", () => {
  it("遷移の種類", () => {
    expect(activityTransitionKind("idle", "studying")).toBe("enterStudying");
    expect(activityTransitionKind("studying", "idle")).toBe("exitStudying");
    expect(activityTransitionKind("studying", "resting")).toBe("enterResting");
    expect(activityTransitionKind("resting", "idle")).toBe("exitResting");
    expect(activityTransitionKind("resting", "studying")).toBe("exitResting");
    expect(activityTransitionKind("idle", "idle")).toBeNull();
  });

  it("全トラックは恒等で始まり恒等で終わる（Reaction と同じ契約＝位置飛びなし）", () => {
    for (const from of MOCHIT_ACTIVITIES) {
      for (const to of MOCHIT_ACTIVITIES) {
        const plan = buildActivityTransitionPlan(from, to, { profile: "floating", animate: true });
        if (!plan) continue;
        for (const track of plan.flourish!.tracks) {
          const first = track.keyframes[0];
          const last = track.keyframes.at(-1)!;
          expect(first.offset).toBe(0);
          expect(last.offset).toBe(1);
          expect(first.transform).toBe(last.transform);
        }
      }
    }
  });

  it("休憩に入る: 先に集中の姿勢を解き、伸びのあとで休憩姿勢へ", () => {
    const plan = buildActivityTransitionPlan("studying", "resting", { profile: "floating", animate: true })!;
    expect(plan.poseSteps).toHaveLength(2);
    expect(isNeutralActivityPose(plan.poseSteps[0].pose)).toBe(true);
    expect(plan.poseSteps[1].pose).toEqual(getActivityPose("resting"));
    expect(plan.poseSteps[1].delayMs).toBeGreaterThan(plan.poseSteps[0].ms);
    expect(plan.flourish!.totalMs).toBeGreaterThan(plan.poseSteps[1].delayMs);
  });

  it("動かせない時（reduced-motion・停止中）は振り付けなしで姿勢へ即座に移る", () => {
    const plan = buildActivityTransitionPlan("idle", "studying", { profile: "floating", animate: false })!;
    expect(plan.flourish).toBeNull();
    expect(plan.poseSteps).toEqual([{ pose: getActivityPose("studying"), delayMs: 0, ms: 0 }]);
  });

  it("compact は振り付けをアンテナだけにし、姿勢も弱める", () => {
    const plan = buildActivityTransitionPlan("idle", "studying", { profile: "compact", animate: true })!;
    expect(plan.flourish!.tracks.every((t) => t.target === "antenna")).toBe(true);
    expect(getActivityPose("studying", { compact: true }).dy).toBeLessThan(getActivityPose("studying").dy);
  });
});
