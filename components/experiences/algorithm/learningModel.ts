// アルゴリズム体験の題材：「1〜N を足す」フローチャートの定義（ノード ID は flowTrace / FlowRun と共通）。

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

// 初心者のことば ⇔ 試験の書き方
export const FORMAL_MAPPINGS = [
  { beginner: "合計の箱を0にする", formal: "合計 ← 0" },
  { beginner: "合計に今の数字 i を足す", formal: "合計 ← 合計 + i" },
  { beginner: "i を1増やす", formal: "i ← i + 1" },
] as const;
