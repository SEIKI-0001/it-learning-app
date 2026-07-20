// モチット描画系の共有型と、Riveステートマシン契約の定数。
// Rive側のアートボード名・ステートマシン名・入力名はここが唯一の真実。
// design/mochit/docs/mochit-rive-import-checklist.md と一致させること。

export type MochitState = "normal" | "happy" | "thinking" | "cheering";
export type MochitSize = "xs" | "small" | "medium" | "large";
export type MochitAnimation = "idle" | "bounce" | "tilt" | "celebrate" | "none";
export type MochitGrowthStage = 1 | 2 | 3;

export type MochitScreenContext =
  | "other"
  | "today"
  | "progress"
  | "avatar"
  | "quizResult"
  | "checkpoint"
  | "rank";

// Rive Number入力 screenContext へ渡す整数コード。
export const MOCHIT_SCREEN_CONTEXT_CODES: Record<MochitScreenContext, number> = {
  other: 0,
  today: 1,
  progress: 2,
  avatar: 3,
  quizResult: 4,
  checkpoint: 5,
  rank: 6,
};

// Rive Number入力 mood へ渡す値（-1=沈み気味〜1=最高潮）。
export const MOCHIT_STATE_MOOD_VALUES: Record<MochitState, number> = {
  normal: 0,
  thinking: -0.3,
  happy: 0.6,
  cheering: 1,
};

export const MOCHIT_RIVE_SRC = "/characters/mochit/mochit.riv";
export const MOCHIT_RIVE_ARTBOARD = "Mochit";
export const MOCHIT_RIVE_STATE_MACHINE = "MochitStateMachine";

export const MOCHIT_RIVE_BOOLEAN_INPUTS = [
  "isActive",
  "isVisible",
  "isFocused",
  "isAnswering",
  "isSleepy",
  "reducedMotion",
  "pointerEnabled",
  "primaryInstance",
] as const;

export const MOCHIT_RIVE_NUMBER_INPUTS = [
  "mood",
  "energy",
  "growthStage",
  "attentionX",
  "attentionY",
  "screenContext",
] as const;

export const MOCHIT_RIVE_TRIGGER_INPUTS = [
  "triggerTap",
  "triggerCorrect",
  "triggerIncorrect",
  "triggerAllCorrect",
  "triggerEncourage",
  "triggerTaskComplete",
  "triggerBadgeEarned",
  "triggerCheckpointClear",
  "triggerWakeUp",
] as const;

export type MochitRiveBooleanInput = (typeof MOCHIT_RIVE_BOOLEAN_INPUTS)[number];
export type MochitRiveNumberInput = (typeof MOCHIT_RIVE_NUMBER_INPUTS)[number];
export type MochitRiveTriggerInput = (typeof MOCHIT_RIVE_TRIGGER_INPUTS)[number];

export type MochitRiveInputValues = {
  booleans: Record<MochitRiveBooleanInput, boolean>;
  numbers: Record<MochitRiveNumberInput, number>;
};

// Rive未導入でも扱えるよう、StateMachineInput の必要最小限だけを見る。
export type MochitRiveInputLike = {
  name: string;
  value?: number | boolean;
  fire?: () => void;
};

export type MochitRiveInputSyncProps = {
  state: MochitState;
  growthStage: MochitGrowthStage;
  reducedMotion: boolean;
  compact: boolean;
  primary: boolean;
  visible: boolean;
  focused: boolean;
  screenContext: MochitScreenContext;
  mood?: number;
  energy?: number;
  attentionX?: number;
  attentionY?: number;
};

// セマンティックなpropsからRive入力値一式を組み立てる純関数。
export function buildMochitRiveInputValues(props: MochitRiveInputSyncProps): MochitRiveInputValues {
  return {
    booleans: {
      isActive: true,
      isVisible: props.visible,
      isFocused: props.focused,
      isAnswering: props.screenContext === "quizResult" || props.screenContext === "checkpoint",
      isSleepy: false,
      reducedMotion: props.reducedMotion,
      // reduced-motion時はポインタ追従も止める（既存CSS実装のポリシーを踏襲）
      pointerEnabled: !props.reducedMotion && !props.compact,
      primaryInstance: props.primary && !props.compact,
    },
    numbers: {
      mood: props.mood ?? MOCHIT_STATE_MOOD_VALUES[props.state],
      energy: props.energy ?? (props.compact ? 0.4 : 0.7),
      growthStage: props.growthStage,
      attentionX: props.attentionX ?? 0.5,
      attentionY: props.attentionY ?? 0.5,
      screenContext: MOCHIT_SCREEN_CONTEXT_CODES[props.screenContext],
    },
  };
}

// Riveステートマシンの入力配列へ値を適用する。欠けている入力はクラッシュさせず
// missing として返す（開発時のみ呼び出し元が警告を出す）。
export function applyMochitRiveInputs(
  inputs: readonly MochitRiveInputLike[],
  values: MochitRiveInputValues,
): { applied: string[]; missing: string[] } {
  const byName = new Map(inputs.map((input) => [input.name, input]));
  const applied: string[] = [];
  const missing: string[] = [];

  for (const name of MOCHIT_RIVE_BOOLEAN_INPUTS) {
    const input = byName.get(name);
    if (!input) {
      missing.push(name);
      continue;
    }
    input.value = values.booleans[name];
    applied.push(name);
  }
  for (const name of MOCHIT_RIVE_NUMBER_INPUTS) {
    const input = byName.get(name);
    if (!input) {
      missing.push(name);
      continue;
    }
    input.value = values.numbers[name];
    applied.push(name);
  }
  return { applied, missing };
}

// トリガーを安全に発火する。存在しない場合は false を返すだけでクラッシュしない。
export function fireMochitRiveTrigger(
  inputs: readonly MochitRiveInputLike[],
  trigger: MochitRiveTriggerInput,
): boolean {
  const input = inputs.find((candidate) => candidate.name === trigger);
  if (!input || typeof input.fire !== "function") return false;
  input.fire();
  return true;
}

// 再生を続けるべきかの判定（ビューポート外・タブ非表示では止める）。
export function shouldPlayMochitRive(args: {
  inViewport: boolean;
  documentHidden: boolean;
  loadFailed: boolean;
}): boolean {
  if (args.loadFailed) return false;
  return args.inViewport && !args.documentHidden;
}
