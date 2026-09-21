// モチットの「普段の状態」(Behavior State) の型と純粋ロジック。
// 一時的な出来事への反応 (Reaction Event: mochitEvents.ts / useMochitController.ts) とは
// 責務を分ける。リアクションは終わると、ここで表す普段の状態へ戻る想定。
// MochitState (mochitTypes.ts) は表示用プリセットで、これとは別に共存する。
// DOM/React には依存しない。

export type MochitEmotion = "neutral" | "happy" | "curious" | "thinking" | "sleepy";

export type MochitAttention = "user" | "content" | "result" | "random";

export type MochitIdleBehavior = "normal" | "lookAround" | "curious" | "stretch" | "sleepy";

export type MochitBehaviorState = {
  emotion: MochitEmotion;
  attention: MochitAttention;
  idleBehavior: MochitIdleBehavior;
  // 0（ぐったり）〜1（元気いっぱい）
  energy: number;
};

export const DEFAULT_MOCHIT_BEHAVIOR_STATE: Readonly<MochitBehaviorState> = Object.freeze({
  emotion: "neutral",
  attention: "user",
  idleBehavior: "normal",
  energy: 0.7,
});

// energy を 0〜1 に収める。NaN はデフォルト値に戻す（±Infinity は端へ寄る）。
export function clampMochitEnergy(energy: number): number {
  if (Number.isNaN(energy)) return DEFAULT_MOCHIT_BEHAVIOR_STATE.energy;
  return Math.min(1, Math.max(0, energy));
}

// 部分指定から完全な Behavior State を作る。未指定（undefined）の項目はデフォルト値。
export function createMochitBehaviorState(
  overrides: Partial<MochitBehaviorState> = {},
): MochitBehaviorState {
  const base = DEFAULT_MOCHIT_BEHAVIOR_STATE;
  return {
    emotion: overrides.emotion ?? base.emotion,
    attention: overrides.attention ?? base.attention,
    idleBehavior: overrides.idleBehavior ?? base.idleBehavior,
    energy: clampMochitEnergy(overrides.energy ?? base.energy),
  };
}
