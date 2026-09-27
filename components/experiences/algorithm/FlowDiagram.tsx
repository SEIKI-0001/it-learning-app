"use client";

import { useId, type ReactNode } from "react";

// 動かない（静的な）フローチャート。
// 「アルゴリズムとフローチャート」の FlowRun と同じ記号・同じ色のルールで描く：
//   開始/終了＝角丸の帯、処理＝四角、条件＝ひし形（黄）、入出力＝平行四辺形、
//   はい＝緑、いいえ＝赤、戻る矢印＝灰、呼び出し＝青の点線。
// focus を付けたノード・矢印だけ FlowRun の「いま実行している場所」と同じ琥珀色にして、
// その図で見てほしい所を1か所に絞る。座標は viewBox 上の値（FlowRun と同じく矢印の経路を点で指定）。

export type FlowKind = "terminal" | "process" | "decision" | "io";

export type FlowNodeSpec = {
  id: string;
  /** 中心座標 */
  x: number;
  y: number;
  w: number;
  h?: number;
  kind: FlowKind;
  label: ReactNode;
  focus?: boolean;
  /** 左に付ける番号（①〜） */
  badge?: string;
};

export type FlowEdgeSpec = {
  pts: [number, number][];
  kind?: "plain" | "yes" | "no" | "loop" | "call";
  focus?: boolean;
  label?: string;
  labelAt?: [number, number];
};

export type FlowGroupSpec = { x: number; y: number; w: number; h: number; label: string };

const DEFAULT_H: Record<FlowKind, number> = { terminal: 22, process: 28, decision: 42, io: 28 };

const EDGE_COLOR = { plain: "#94a3b8", yes: "#059669", no: "#e11d48", loop: "#64748b", call: "#2563eb" } as const;
const LABEL_COLOR = { plain: "#475569", yes: "#047857", no: "#be123c", loop: "#475569", call: "#1d4ed8" } as const;
const FOCUS = { fill: "#fef3c7", stroke: "#f59e0b", edge: "#f59e0b" };

function shape(n: FlowNodeSpec) {
  const h = n.h ?? DEFAULT_H[n.kind];
  const x0 = n.x - n.w / 2;
  const y0 = n.y - h / 2;
  const fill = n.focus ? FOCUS.fill : n.kind === "decision" ? "#fffbeb" : "#ffffff";
  const stroke = n.focus ? FOCUS.stroke : n.kind === "decision" ? "#fbbf24" : "#94a3b8";
  const sw = n.focus || n.kind === "decision" ? 1.8 : 1.2;
  switch (n.kind) {
    case "terminal":
      return <rect x={x0} y={y0} width={n.w} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "process":
      return <rect x={x0} y={y0} width={n.w} height={h} rx={5} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "decision":
      return (
        <polygon
          points={`${n.x},${y0} ${x0 + n.w},${n.y} ${n.x},${y0 + h} ${x0},${n.y}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    case "io": {
      const k = 8;
      return (
        <polygon
          points={`${x0 + k},${y0} ${x0 + n.w},${y0} ${x0 + n.w - k},${y0 + h} ${x0},${y0 + h}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    }
  }
}

export function FlowDiagram({
  width,
  height,
  nodes,
  edges,
  groups = [],
  title,
  maxWidth = "max-w-[17rem]",
  testId,
}: {
  width: number;
  height: number;
  nodes: FlowNodeSpec[];
  edges: FlowEdgeSpec[];
  groups?: FlowGroupSpec[];
  /** 図の内容を一文で（スクリーンリーダー向け） */
  title: string;
  maxWidth?: string;
  testId?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const marker = (k: string) => `flow-${uid}-${k}`;
  const kinds = ["plain", "yes", "no", "loop", "call", "focus"] as const;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`mx-auto block w-full ${maxWidth}`} role="img" aria-label={title} data-testid={testId}>
      <defs>
        {kinds.map((k) => (
          <marker key={k} id={marker(k)} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" fill={k === "focus" ? FOCUS.edge : EDGE_COLOR[k]} />
          </marker>
        ))}
      </defs>

      {groups.map((g) => (
        <g key={g.label}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={10} fill="#eff6ff" stroke="#93c5fd" strokeDasharray="4 3" />
          <text x={g.x + 8} y={g.y + 13} fontSize={9.5} fontWeight={800} fill="#1d4ed8">
            {g.label}
          </text>
        </g>
      ))}

      {edges.map((e, i) => {
        const kind = e.kind ?? "plain";
        const d = e.pts.map((p, j) => `${j ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={e.focus ? FOCUS.edge : EDGE_COLOR[kind]}
            strokeWidth={e.focus ? 2.4 : 1.5}
            strokeDasharray={kind === "call" ? "5 3" : undefined}
            strokeLinejoin="round"
            markerEnd={`url(#${marker(e.focus ? "focus" : kind)})`}
            data-edge-kind={kind}
          />
        );
      })}

      {nodes.map((n) => (
        <g key={n.id} data-node={n.id} data-focus={n.focus ? "true" : undefined}>
          {shape(n)}
          <text
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={n.kind === "terminal" ? 10 : 10.5}
            fontWeight={800}
            fill="#111827"
          >
            {n.label}
          </text>
          {n.badge && (
            <g>
              <circle cx={n.x - n.w / 2 - 12} cy={n.y} r={8} fill="#111827" />
              <text x={n.x - n.w / 2 - 12} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={800} fill="#ffffff">
                {n.badge}
              </text>
            </g>
          )}
        </g>
      ))}

      {/* 矢印のラベルは線の上に重ねるので最後に描く */}
      {edges
        .filter((e) => e.label)
        .map((e, i) => {
          const kind = e.kind ?? "plain";
          const [lx, ly] = e.labelAt ?? e.pts[0];
          return (
            <text
              key={`l${i}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9.5}
              fontWeight={800}
              fill={e.focus ? "#b45309" : LABEL_COLOR[kind]}
              stroke="#ffffff"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {e.label}
            </text>
          );
        })}
    </svg>
  );
}

/** フロー図の横（スマホでは下）に置く疑似コード。note は行末の灰色の注記。 */
export function CodeLines({
  lines,
  testId,
}: {
  lines: { code: string; indent?: boolean; note?: string; focus?: boolean }[];
  testId?: string;
}) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-gray-50 px-3 py-2.5 font-mono text-[12.5px] leading-[1.9] text-gray-900 ring-1 ring-gray-200" data-testid={testId}>
      {lines.map((l, i) => (
        <div key={i} className={`${l.indent ? "pl-5" : ""} ${l.focus ? "-mx-1 rounded bg-amber-100 px-1" : ""}`}>
          <span className="font-bold">{l.code}</span>
          {l.note && <span className="ml-2 font-sans text-[11px] font-medium text-gray-500">{l.note}</span>}
        </div>
      ))}
    </pre>
  );
}
