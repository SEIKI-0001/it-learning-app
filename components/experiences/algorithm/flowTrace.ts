// フローチャート「1〜N を足す」を、コンピュータと同じ順番で1ノードずつ実行したときの記録。
// learningModel の FLOWCHART と同じノード ID を使う（見せ方だけを変える）。

import type { FlowNodeId } from "./learningModel";

export type TraceStep = {
  node: FlowNodeId;
  /** このノードを実行した「後」の変数（未設定は null） */
  i: number | null;
  total: number | null;
  /** 条件ノードでの判定結果 */
  judge?: boolean;
  /** 直前のノード（戻り道・分岐の経路を描くため） */
  from: FlowNodeId | null;
  /** 何周目のくり返しか（1始まり。ループの外は 0） */
  lap: number;
};

export function buildFlowTrace(limit: number): TraceStep[] {
  const steps: TraceStep[] = [];
  let i: number | null = null;
  let total: number | null = null;
  let lap = 0;
  const push = (node: FlowNodeId, extra: Partial<TraceStep> = {}) => {
    steps.push({ node, i, total, from: steps.at(-1)?.node ?? null, lap, ...extra });
  };

  push("start");
  total = 0;
  push("initialize-total");
  i = 1;
  push("initialize-current");
  for (;;) {
    const ok = i <= limit;
    if (ok) lap += 1;
    push("condition", { judge: ok });
    if (!ok) break;
    total += i;
    push("add-current");
    i += 1;
    push("increment-current");
  }
  lap = 0;
  push("display-total");
  push("end");
  return steps;
}

/** 画面に出す正式表現（試験の書き方）と、そのとき実際に起きた計算 */
export function describeStep(step: TraceStep, prev: TraceStep | undefined, limit: number): { code: string; calc: string } {
  switch (step.node) {
    case "start":
      return { code: "開始", calc: "ここから実行" };
    case "initialize-total":
      return { code: "合計 ← 0", calc: "合計の箱に 0 を入れる" };
    case "initialize-current":
      return { code: "i ← 1", calc: "i の箱に 1 を入れる" };
    case "condition":
      return { code: `i ≦ ${limit} ?`, calc: `${step.i} ≦ ${limit} → ${step.judge ? "はい" : "いいえ"}` };
    case "add-current":
      return { code: "合計 ← 合計 + i", calc: `${prev?.total} + ${step.i} = ${step.total}` };
    case "increment-current":
      return { code: "i ← i + 1", calc: `${prev?.i} + 1 = ${step.i}` };
    case "display-total":
      return { code: "合計を表示", calc: `画面に ${step.total} と表示` };
    case "end":
      return { code: "終了", calc: "おしまい" };
  }
}
