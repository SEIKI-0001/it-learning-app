"use client";

import { useState, type CSSProperties } from "react";
import { SceneTimeline } from "../scene/SceneTimeline";
import { useReducedMotion } from "../scene/useReducedMotion";
import { useStepPlayer } from "../scene/useStepPlayer";
import { buildFlowTrace, describeStep, type TraceStep } from "./flowTrace";
import type { FlowNodeId } from "./learningModel";
import styles from "./flowrun.module.css";

// フローチャート＝絵ではなく「コンピュータが辿る実行経路」。
// 実行トークン（●）がノードからノードへ矢印の上を移動し、条件ノードの はい／いいえ で進む道が変わる。
// 横の「変数の箱」は、トークンが処理ノードを通るたびに値が書き換わる。
// ステージは 320×336px 固定（トークンの移動経路を px の offset-path で描くため）。

type Pt = [number, number];
type NodeBox = { cx: number; cy: number; w: number; h: number; kind: "terminal" | "process" | "decision" | "output" };

const NODES: Record<FlowNodeId, NodeBox> = {
  start: { cx: 104, cy: 22, w: 76, h: 24, kind: "terminal" },
  "initialize-total": { cx: 104, cy: 70, w: 128, h: 30, kind: "process" },
  "initialize-current": { cx: 104, cy: 118, w: 128, h: 30, kind: "process" },
  condition: { cx: 104, cy: 176, w: 112, h: 44, kind: "decision" },
  "add-current": { cx: 104, cy: 240, w: 128, h: 30, kind: "process" },
  "increment-current": { cx: 104, cy: 288, w: 128, h: 30, kind: "process" },
  "display-total": { cx: 258, cy: 240, w: 92, h: 30, kind: "output" },
  end: { cx: 258, cy: 300, w: 76, h: 24, kind: "terminal" },
};

const LOOP_X = 14;

/** 矢印の経路（出発ノードの中心 → 曲がり角 → 到着ノードの入口） */
const EDGES: { from: FlowNodeId; to: FlowNodeId; pts: Pt[]; label?: string }[] = [
  { from: "start", to: "initialize-total", pts: [[104, 34], [104, 55]] },
  { from: "initialize-total", to: "initialize-current", pts: [[104, 85], [104, 103]] },
  { from: "initialize-current", to: "condition", pts: [[104, 133], [104, 154]] },
  { from: "condition", to: "add-current", pts: [[104, 198], [104, 225]], label: "はい" },
  { from: "add-current", to: "increment-current", pts: [[104, 255], [104, 273]] },
  { from: "increment-current", to: "condition", pts: [[40, 288], [LOOP_X, 288], [LOOP_X, 176], [48, 176]], label: "条件へ戻る" },
  { from: "condition", to: "display-total", pts: [[160, 176], [258, 176], [258, 225]], label: "いいえ" },
  { from: "display-total", to: "end", pts: [[258, 255], [258, 288]] },
];

const edgeOf = (from: FlowNodeId | null, to: FlowNodeId) => EDGES.find((e) => e.from === from && e.to === to);

/** トークンが止まる位置＝到着した矢印の先端（開始はノードの上端） */
function restPoint(step: TraceStep): Pt {
  const edge = edgeOf(step.from, step.node);
  if (edge) return edge.pts[edge.pts.length - 1];
  const n = NODES[step.node];
  return [n.cx, n.cy - n.h / 2];
}

function tokenPath(prev: TraceStep | undefined, cur: TraceStep, animate: boolean): string {
  const end = restPoint(cur);
  if (!prev || !animate) return `M ${end[0]} ${end[1]}`;
  const start = restPoint(prev);
  const center: Pt = [NODES[prev.node].cx, NODES[prev.node].cy];
  const edge = edgeOf(prev.node, cur.node);
  const pts: Pt[] = [start, center, ...(edge?.pts ?? [end])];
  return pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
}

const LABEL: Record<FlowNodeId, (limit: number) => string> = {
  start: () => "開始",
  "initialize-total": () => "合計 ← 0",
  "initialize-current": () => "i ← 1",
  condition: (limit) => `i ≦ ${limit} ?`,
  "add-current": () => "合計 ← 合計 + i",
  "increment-current": () => "i ← i + 1",
  "display-total": () => "合計を表示",
  end: () => "終了",
};

const LIMITS = [5, 3] as const;

function VarBox({ name, value, prev, testId }: { name: string; value: number | null; prev: number | null; testId: string }) {
  const changed = value !== prev;
  return (
    <div className={styles.varRow}>
      <span className={styles.varName}>{name}</span>
      <span className={styles.varBox} data-changed={changed ? "true" : "false"} data-testid={testId} key={`${value}`}>
        {value ?? "？"}
      </span>
      <span className={styles.varDelta} aria-hidden>
        {changed && prev !== null ? `${prev} → ${value}` : changed ? "新しく入った" : ""}
      </span>
    </div>
  );
}

export function FlowRun() {
  const reducedMotion = useReducedMotion();
  const [limit, setLimit] = useState<(typeof LIMITS)[number]>(5);
  const trace = buildFlowTrace(limit);
  const player = useStepPlayer(trace.length, reducedMotion, 1500);
  const index = Math.min(player.index, trace.length - 1);
  const cur = trace[index];
  const prev = index > 0 ? trace[index - 1] : undefined;
  const { code, calc } = describeStep(cur, prev, limit);
  const visits = new Map<FlowNodeId, number>();
  for (const s of trace.slice(0, index + 1)) visits.set(s.node, (visits.get(s.node) ?? 0) + 1);
  const arrived = edgeOf(cur.from, cur.node);
  const nextEdge = cur.node === "condition" ? edgeOf("condition", cur.judge ? "add-current" : "display-total") : undefined;
  const animate = player.forward && !reducedMotion;
  const steps = trace.map((s) => ({ title: `${LABEL[s.node](limit)}${s.judge === undefined ? "" : s.judge ? " → はい" : " → いいえ"}` }));

  return (
    <section className="mt-5 border-t border-dashed border-gray-200 pt-4" aria-labelledby="flow-run-title">
      <h4 id="flow-run-title" className="text-sm font-bold text-gray-900">
        ▶ コンピュータになって最後まで実行
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">
        黄色い●が「いま実行している場所」。矢印の上を進み、<b>条件の答えで進む道が変わり</b>、くり返しでは<b>条件へ戻り</b>ます。
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span className="font-bold text-gray-500">くり返す上限：</span>
        {LIMITS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={limit === n}
            onClick={() => {
              setLimit(n);
              player.reset();
            }}
            className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition active:scale-95 ${
              limit === n ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"
            }`}
          >
            i ≦ {n}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className={styles.stage} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="flow-run" data-node={cur.node} data-index={index}>
          <svg className={styles.edges} viewBox="0 0 320 336" aria-hidden>
            <defs>
              <marker id="flow-run-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" />
              </marker>
            </defs>
            {EDGES.map((e) => {
              const from = NODES[e.from];
              const d = [e.from === "increment-current" || e.from === "condition" ? [from.cx, from.cy] : [from.cx, from.cy + from.h / 2], ...e.pts]
                .map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`)
                .join(" ");
              const state = e === arrived ? "taken" : e === nextEdge ? "next" : "idle";
              return <path key={`${e.from}-${e.to}`} d={d} className={styles.edge} data-state={state} data-edge={`${e.from}>${e.to}`} markerEnd="url(#flow-run-arrow)" />;
            })}
          </svg>

          <span className={`${styles.edgeLabel} ${styles.yes}`} style={{ left: 118, top: 210 }}>はい</span>
          <span className={`${styles.edgeLabel} ${styles.no}`} style={{ left: 196, top: 166 }}>いいえ</span>
          <span className={`${styles.edgeLabel} ${styles.loop}`} style={{ left: LOOP_X, top: 232 }}>↺ 条件へ戻る</span>

          {/* 実行トークン：ノードごとに作り直し、前の場所から矢印の上を移動してくる */}
          <span
            key={`${limit}-${index}`}
            className={styles.token}
            data-animate={animate ? "true" : "false"}
            style={{ offsetPath: `path("${tokenPath(prev, cur, animate)}")` } as CSSProperties}
            data-testid="flow-run-token"
            aria-hidden
          />

          {(Object.keys(NODES) as FlowNodeId[]).map((id) => {
            const n = NODES[id];
            const count = visits.get(id) ?? 0;
            return (
              <div
                key={id}
                className={styles.node}
                data-kind={n.kind}
                data-active={cur.node === id ? "true" : "false"}
                data-done={count > 0 && cur.node !== id ? "true" : "false"}
                data-judge={cur.node === id && cur.judge !== undefined ? String(cur.judge) : undefined}
                style={{ left: n.cx, top: n.cy, width: n.w, height: n.h }}
                data-testid={`flow-run-node-${id}`}
              >
                <span className={styles.nodeLabel}>{LABEL[id](limit)}</span>
                {count > 1 && <span className={styles.visits}>×{count}</span>}
              </div>
            );
          })}

          {cur.node === "condition" && (
            <span className={styles.judge} data-judge={String(cur.judge)} style={{ left: 214, top: 198 }} data-testid="flow-run-judge">
              {cur.i} ≦ {limit} → {cur.judge ? "はい" : "いいえ"}
            </span>
          )}
          {cur.lap > 0 && (
            <span className={styles.lap} style={{ left: 104, top: 322 }} data-testid="flow-run-lap">
              くり返し {cur.lap} 周目
            </span>
          )}

          {/* 変数の箱 */}
          <div className={styles.vars} data-testid="flow-run-vars">
            <span className={styles.varsTitle}>変数の箱</span>
            <VarBox name="i" value={cur.i} prev={prev ? prev.i : null} testId="flow-run-var-i" />
            <VarBox name="合計" value={cur.total} prev={prev ? prev.total : null} testId="flow-run-var-total" />
            {cur.node === "display-total" || cur.node === "end" ? (
              <span className={styles.screen} data-testid="flow-run-output">
                🖥 {cur.total}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-gray-900 px-3 py-2 text-white" aria-live="polite" data-testid="flow-run-now">
        <span className="block text-[10px] font-bold text-gray-400">いま実行した命令</span>
        <span className="font-mono text-sm font-bold">{code}</span>
        <span className="ml-2 text-xs text-amber-300">{calc}</span>
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={index}
          steps={steps}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="フローチャートを実行"
          timelineLabel="フローチャートの実行のタイムライン"
          startCaption="開始"
          endCaption="終了"
          stepTone={(i) => (trace[i]?.node === "condition" ? (trace[i].judge ? "bg-emerald-600" : "bg-rose-500") : "bg-amber-500")}
        />
      </div>
    </section>
  );
}
