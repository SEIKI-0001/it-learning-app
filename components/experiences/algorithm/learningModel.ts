export const TOTAL_STEPS = 7;

export const NOODLE_ACTIONS = [
  { id: "wait", label: "3分待つ", emoji: "⏱️" },
  { id: "open", label: "ふたを開ける", emoji: "🥡" },
  { id: "pour", label: "お湯を入れる", emoji: "♨️" },
] as const;

export type NoodleActionId = (typeof NOODLE_ACTIONS)[number]["id"];

const CORRECT_NOODLE_ORDER: readonly NoodleActionId[] = [
  "open",
  "pour",
  "wait",
];

export function isCorrectNoodleOrder(order: NoodleActionId[]): boolean {
  return (
    order.length === CORRECT_NOODLE_ORDER.length &&
    order.every((action, index) => action === CORRECT_NOODLE_ORDER[index])
  );
}

export const COMPUTER_ACTIONS = [
  "3を受け取る",
  "2を受け取る",
  "足す",
  "5を表示",
] as const;

export type RepetitionState = {
  total: number;
  current: number;
};

export function isRepetitionComplete(state: RepetitionState): boolean {
  return state.current > 5;
}

export function addCurrentNumber(state: RepetitionState): RepetitionState {
  if (isRepetitionComplete(state)) return state;
  return {
    total: state.total + state.current,
    current: state.current + 1,
  };
}

export const FLOW_ACTIONS = [
  { label: "開始", kind: "terminal" },
  { label: "合計を0にする", kind: "process" },
  { label: "数字を足す", kind: "process" },
  { label: "5以下か確認", kind: "decision" },
  { label: "次の数字へ", kind: "process" },
  { label: "合計を表示", kind: "output" },
  { label: "終了", kind: "terminal" },
] as const;

export const FORMAL_MAPPINGS = [
  { beginner: "合計の箱を0にする", formal: "合計 ← 0" },
  { beginner: "合計に現在の数字を足す", formal: "合計 ← 合計 + i" },
  { beginner: "次の数字へ", formal: "i ← i + 1" },
] as const;

export const MINI_QUESTIONS = [
  {
    prompt: "「合計 ← 0」はどんな手順？",
    choices: ["合計の箱を0にする", "合計に1を足す"],
    correct: "合計の箱を0にする",
    explanation: "右側の0を、左側の『合計』という箱へ入れます。",
  },
  {
    prompt: "「合計 ← 合計 + i」はどんな手順？",
    choices: ["合計に現在の数字を足す", "合計を表示する"],
    correct: "合計に現在の数字を足す",
    explanation: "今の合計とiを足し、その結果を合計の箱へ入れ直します。",
  },
  {
    prompt: "「i ← i + 1」はどんな手順？",
    choices: ["次の数字へ進む", "最初の数字へ戻る"],
    correct: "次の数字へ進む",
    explanation: "iを1増やして、次に足す数字を準備します。",
  },
] as const;
