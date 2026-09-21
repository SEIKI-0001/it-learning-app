import { describe, expect, it } from "vitest";
import {
  clampMochitEnergy,
  createMochitBehaviorState,
  DEFAULT_MOCHIT_BEHAVIOR_STATE,
} from "@/components/mochit/mochitBehavior";

describe("mochitBehavior", () => {
  it("デフォルトの Behavior State", () => {
    expect(DEFAULT_MOCHIT_BEHAVIOR_STATE).toEqual({
      emotion: "neutral",
      attention: "user",
      idleBehavior: "normal",
      energy: 0.7,
    });
    expect(createMochitBehaviorState()).toEqual(DEFAULT_MOCHIT_BEHAVIOR_STATE);
  });

  it("部分指定をデフォルトへ merge する", () => {
    expect(createMochitBehaviorState({ emotion: "curious" })).toEqual({
      emotion: "curious",
      attention: "user",
      idleBehavior: "normal",
      energy: 0.7,
    });
    expect(
      createMochitBehaviorState({ emotion: "sleepy", idleBehavior: "sleepy", energy: 0.2 }),
    ).toEqual({ emotion: "sleepy", attention: "user", idleBehavior: "sleepy", energy: 0.2 });
  });

  it("指定していない値（undefined 含む）はデフォルトになる", () => {
    const state = createMochitBehaviorState({ attention: "result", emotion: undefined });
    expect(state.emotion).toBe("neutral");
    expect(state.attention).toBe("result");
    expect(state.idleBehavior).toBe("normal");
    expect(state.energy).toBe(0.7);
  });

  it("energy < 0 は 0 に clamp する", () => {
    expect(createMochitBehaviorState({ energy: -0.5 }).energy).toBe(0);
    expect(clampMochitEnergy(-Infinity)).toBe(0);
  });

  it("energy > 1 は 1 に clamp する", () => {
    expect(createMochitBehaviorState({ energy: 1.8 }).energy).toBe(1);
    expect(clampMochitEnergy(Infinity)).toBe(1);
  });

  it("範囲内の energy と境界値はそのまま、NaN はデフォルト", () => {
    expect(clampMochitEnergy(0)).toBe(0);
    expect(clampMochitEnergy(1)).toBe(1);
    expect(clampMochitEnergy(0.35)).toBe(0.35);
    expect(clampMochitEnergy(Number.NaN)).toBe(0.7);
  });

  it("デフォルト定数は変更できず、生成結果は毎回新しいオブジェクト", () => {
    expect(Object.isFrozen(DEFAULT_MOCHIT_BEHAVIOR_STATE)).toBe(true);
    const a = createMochitBehaviorState();
    a.energy = 0.1;
    expect(createMochitBehaviorState().energy).toBe(0.7);
    expect(DEFAULT_MOCHIT_BEHAVIOR_STATE.energy).toBe(0.7);
  });
});
