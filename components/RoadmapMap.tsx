"use client";

import { useState } from "react";
import type { PhaseProgress } from "@/types/plan";
import { STUDY_PHASES } from "@/lib/studyPlanner";

// 合格までのロードマップを「すごろく風の一本道マップ」で見せるコンポーネント。
// - データは plan.phases（PhaseProgress[]）＋ STUDY_PHASES の静的メタのみ。新規データは不要。
// - 道は SVG のスネーク曲線、チェックポイントは絶対配置のピン。
//   両者を同じ % 座標系（viewBox 0..100, preserveAspectRatio="none"）に載せて確実に重ねる。
//   線の太さは vector-effect="non-scaling-stroke" で歪ませない。
// - ピンをタップすると下から詳細シートが出る（文字はマップに詰め込まない方針）。

type NodeKind = "phase" | "goal";

type MapNode = {
  key: string;
  kind: NodeKind;
  emoji: string;
  title: string;
  summary: string;
  status: PhaseProgress["status"] | "goal";
  progress: number;
  hint: string;
  x: number; // 0..100
};

// 7フェーズ＋ゴールの計8ノードを左右に振って配置する。
const X_POSITIONS = [28, 70, 30, 68, 32, 66, 42, 50];

// RPG風の地図装飾（山・森・水・城）。ピンと重ならないよう端側に低透明度で散らす。
// x/y は % 座標、size は px（preserveAspectRatio の歪みを受けない絶対配置）。
const DECOR: {
  emoji: string;
  x: number;
  y: number;
  size: number;
  op: number;
  rot?: number;
}[] = [
  { emoji: "🏔️", x: 12, y: 5, size: 34, op: 0.55, rot: -6 },
  { emoji: "⛰️", x: 86, y: 8, size: 30, op: 0.5 },
  { emoji: "🌲", x: 84, y: 22, size: 22, op: 0.55 },
  { emoji: "🌲", x: 13, y: 26, size: 20, op: 0.5 },
  { emoji: "🌳", x: 88, y: 38, size: 22, op: 0.5 },
  { emoji: "🌊", x: 11, y: 48, size: 24, op: 0.45 },
  { emoji: "🏕️", x: 85, y: 55, size: 22, op: 0.5 },
  { emoji: "🌲", x: 15, y: 64, size: 20, op: 0.5 },
  { emoji: "🌳", x: 12, y: 82, size: 22, op: 0.5 },
  { emoji: "🏰", x: 82, y: 90, size: 30, op: 0.6, rot: 3 },
];

const STATUS_LABEL: Record<string, string> = {
  done: "クリア済み",
  current: "いまここ",
  upcoming: "これから",
  goal: "ゴール",
};

function buildNodes(phases: PhaseProgress[]): MapNode[] {
  const phaseNodes: MapNode[] = phases.map((p, i) => {
    const def = STUDY_PHASES.find((d) => d.id === p.id)!;
    return {
      key: p.id,
      kind: "phase",
      emoji: def.emoji,
      title: def.title,
      summary: def.summary,
      status: p.status,
      progress: p.progress,
      hint: p.hint,
      x: X_POSITIONS[i] ?? 50,
    };
  });

  const allDone = phases.every((p) => p.status === "done");
  const goal: MapNode = {
    key: "goal",
    kind: "goal",
    emoji: "🎓",
    title: "合格",
    summary: "ここまで来たら本番。積み上げてきた力を出し切りましょう。",
    status: "goal",
    progress: allDone ? 100 : 0,
    hint: "",
    x: X_POSITIONS[phaseNodes.length] ?? 50,
  };

  return [...phaseNodes, goal];
}

function yFor(index: number, total: number): number {
  return ((index + 0.5) / total) * 100;
}

// 2点間を縦方向のS字カーブでつなぐ cubic path。
function segmentPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string {
  const my = (y0 + y1) / 2;
  return `M ${x0} ${y0} C ${x0} ${my}, ${x1} ${my}, ${x1} ${y1}`;
}

export default function RoadmapMap({ phases }: { phases: PhaseProgress[] }) {
  const [selected, setSelected] = useState<MapNode | null>(null);
  const nodes = buildNodes(phases);
  const total = nodes.length;
  const height = total * 84;

  return (
    <div>
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 shadow-inner ring-2 ring-amber-800/30"
        style={{ height }}
      >
        {/* 宝の地図風の枠 */}
        <div className="pointer-events-none absolute inset-1.5 rounded-2xl border-2 border-dashed border-amber-800/25" />

        {/* RPG風の地図装飾（山・森・水・城） */}
        {DECOR.map((d, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none"
            style={{
              top: `${d.y}%`,
              left: `${d.x}%`,
              fontSize: d.size,
              opacity: d.op,
              transform: `translate(-50%,-50%) rotate(${d.rot ?? 0}deg)`,
            }}
          >
            {d.emoji}
          </span>
        ))}

        {/* 道（SVG）— 通ってきた道は焦げ茶の実線、これからの道は破線の足跡風 */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {nodes.slice(0, -1).map((n, i) => {
            const next = nodes[i + 1];
            const y0 = yFor(i, total);
            const y1 = yFor(i + 1, total);
            // このノードを通過済み（done）なら次への道を色付き。
            const traveled = n.status === "done";
            return (
              <path
                key={n.key}
                d={segmentPath(n.x, y0, next.x, y1)}
                fill="none"
                stroke={traveled ? "#b45309" : "#a1662f"}
                strokeWidth={traveled ? 5 : 4}
                strokeLinecap="round"
                strokeOpacity={traveled ? 0.9 : 0.55}
                strokeDasharray={traveled ? "0" : "1 6"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* チェックポイント（ピン） */}
        {nodes.map((n, i) => {
          const top = yFor(i, total);
          const isCurrent = n.status === "current";
          const isDone = n.status === "done";
          const isGoal = n.kind === "goal";

          const circleCls = isGoal
            ? "bg-gradient-to-br from-amber-300 to-amber-500 ring-white"
            : isDone
              ? "bg-emerald-500 ring-white"
              : isCurrent
                ? "bg-indigo-600 ring-white"
                : "bg-white ring-white";

          const emojiCls = isDone && !isGoal ? "opacity-0" : "";

          return (
            <button
              key={n.key}
              type="button"
              onClick={() => setSelected(n)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
              style={{ top: `${top}%`, left: `${n.x}%` }}
              aria-label={`${n.title}（${STATUS_LABEL[n.status]}）`}
            >
              {isCurrent && (
                <span className="absolute -top-6 whitespace-nowrap rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  いまここ
                </span>
              )}
              <span className="relative">
                {isCurrent && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-60" />
                )}
                <span
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-md ring-4 transition active:scale-95 ${circleCls} ${
                    isCurrent ? "scale-110" : ""
                  } ${n.status === "upcoming" ? "ring-2 ring-amber-800/20" : ""}`}
                >
                  <span className={emojiCls} aria-hidden>
                    {n.emoji}
                  </span>
                  {isDone && !isGoal && (
                    <span className="absolute text-white" aria-hidden>
                      ✓
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`mt-1 max-w-[96px] rounded-full bg-white/75 px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight backdrop-blur-[1px] ${
                  isCurrent
                    ? "text-indigo-700"
                    : isGoal
                      ? "text-amber-700"
                      : isDone
                        ? "text-emerald-700"
                        : "text-amber-900/70"
                }`}
              >
                {n.title}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-gray-400">
        チェックポイントをタップすると詳細が見られます
      </p>

      {/* 詳細シート */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {selected.emoji}
              </span>
              <div>
                <p className="text-lg font-extrabold text-gray-800">
                  {selected.title}
                </p>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                    selected.status === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : selected.status === "current"
                        ? "bg-indigo-100 text-indigo-700"
                        : selected.status === "goal"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {selected.summary}
            </p>

            {(selected.status === "done" || selected.status === "current") && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500">
                  <span>達成度</span>
                  <span>{selected.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${
                      selected.status === "done"
                        ? "bg-emerald-400"
                        : "bg-indigo-500"
                    }`}
                    style={{ width: `${selected.progress}%` }}
                  />
                </div>
              </div>
            )}

            {selected.status === "current" && selected.hint && (
              <p className="mt-4 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700">
                👉 {selected.hint}
              </p>
            )}

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-2xl bg-gray-800 py-3 text-sm font-bold text-white active:scale-[0.99]"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
