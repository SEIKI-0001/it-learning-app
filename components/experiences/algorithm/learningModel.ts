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

export type FlowNodeId =
  | "start"
  | "initialize-total"
  | "initialize-current"
  | "condition"
  | "add-current"
  | "increment-current"
  | "display-total"
  | "end";

export type FlowNode = {
  id: FlowNodeId;
  label: string;
  kind: "terminal" | "process" | "decision" | "output";
};

export type FlowEdge = {
  from: FlowNodeId;
  to: FlowNodeId;
  label?: "はい" | "いいえ" | "条件確認へ戻る";
  isLoop?: boolean;
};

export const FLOWCHART = {
  nodes: [
    { id: "start", label: "開始", kind: "terminal" },
    { id: "initialize-total", label: "合計を0にする", kind: "process" },
    { id: "initialize-current", label: "現在の数字を1にする", kind: "process" },
    { id: "condition", label: "現在の数字は5以下？", kind: "decision" },
    { id: "add-current", label: "合計に現在の数字を足す", kind: "process" },
    { id: "increment-current", label: "現在の数字を1増やす", kind: "process" },
    { id: "display-total", label: "合計を表示", kind: "output" },
    { id: "end", label: "終了", kind: "terminal" },
  ],
  edges: [
    { from: "start", to: "initialize-total" },
    { from: "initialize-total", to: "initialize-current" },
    { from: "initialize-current", to: "condition" },
    { from: "condition", to: "add-current", label: "はい" },
    { from: "condition", to: "display-total", label: "いいえ" },
    { from: "add-current", to: "increment-current" },
    {
      from: "increment-current",
      to: "condition",
      label: "条件確認へ戻る",
      isLoop: true,
    },
    { from: "display-total", to: "end" },
  ],
} as const satisfies {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
};

// 初心者向けの通常表示では、正しい実行順を一歩ずつ追う。
// 条件ノードを2回置くことで、ループ後に「いいえ」の出口へ進む様子も見せる。
export const FLOW_LEARNING_PATH: readonly FlowNodeId[] = [
  "start",
  "initialize-total",
  "initialize-current",
  "condition",
  "add-current",
  "increment-current",
  "condition",
  "display-total",
  "end",
];

export function getFlowNode(id: FlowNodeId): FlowNode {
  return FLOWCHART.nodes.find((node) => node.id === id) as FlowNode;
}

export function getOutgoingFlowEdges(id: FlowNodeId): readonly FlowEdge[] {
  return FLOWCHART.edges.filter((edge) => edge.from === id) as readonly FlowEdge[];
}

export const FORMAL_MAPPINGS = [
  { beginner: "合計の箱を0にする", formal: "合計 ← 0" },
  { beginner: "合計に現在の数字を足す", formal: "合計 ← 合計 + i" },
  { beginner: "現在の数字を1増やす", formal: "i ← i + 1" },
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
    choices: ["現在の数字を1増やす", "最初の数字へ戻る"],
    correct: "現在の数字を1増やす",
    explanation: "iを1増やして、次に足す数字を準備します。",
  },
] as const;
