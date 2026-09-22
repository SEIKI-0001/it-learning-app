"use client";

import { useEffect, useRef } from "react";

// 直列／並列の小さなシステム図。装置をタップすると故障⇄復旧。
// 変えるたびに「リクエスト」の点が入口から1回だけ流れる：
//   直列 … 1台でも止まっていれば、そこで ✕ になって出口に届かない（システム停止）
//   並列 … 止まった装置を避けて、もう1台の経路を通って出口へ届く（継続）

export type Mode = "serial" | "parallel";
type P = [number, number];

const IN: P = [18, 75];
const OUT: P = [302, 75];
const POS: Record<Mode, { a: P; b: P }> = {
  serial: { a: [115, 75], b: [205, 75] },
  parallel: { a: [160, 36], b: [160, 114] },
};
const BOX = { w: 58, h: 38 };

export function systemUp(mode: Mode, aOk: boolean, bOk: boolean) {
  return mode === "serial" ? aOk && bOk : aOk || bOk;
}

// リクエストの通り道（止まる場合は止まる地点まで）
function route(mode: Mode, aOk: boolean, bOk: boolean): P[] {
  const { a, b } = POS[mode];
  if (mode === "serial") {
    if (!aOk) return [IN, [a[0] - BOX.w / 2 - 4, 75]];
    if (!bOk) return [IN, a, [b[0] - BOX.w / 2 - 4, 75]];
    return [IN, a, b, OUT];
  }
  const split: P = [62, 75];
  const merge: P = [258, 75];
  const via = aOk ? a : bOk ? b : null;
  if (!via) return [IN, split, [100, a[1]], [a[0] - BOX.w / 2 - 4, a[1]]];
  return [IN, split, [100, via[1]], via, [220, via[1]], merge, OUT];
}

function wirePath(points: P[]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
}

export function SystemDiagram({
  mode,
  aOk,
  bOk,
  runKey,
  reducedMotion,
  onToggle,
}: {
  mode: Mode;
  aOk: boolean;
  bOk: boolean;
  runKey: number;
  reducedMotion: boolean;
  onToggle: (which: "a" | "b") => void;
}) {
  const dot = useRef<SVGGElement>(null);
  const up = systemUp(mode, aOk, bOk);
  const path = route(mode, aOk, bOk);
  const { a, b } = POS[mode];
  const reached = path[path.length - 1] === OUT;

  useEffect(() => {
    const el = dot.current;
    if (!el || reducedMotion || typeof el.animate !== "function") return;
    // 通り道の長さに比例して時間を配分する
    const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    const total = lens.reduce((s, l) => s + l, 0);
    let acc = 0;
    const frames: Keyframe[] = path.map((p, i) => {
      if (i > 0) acc += lens[i - 1];
      return { transform: `translate(${p[0]}px, ${p[1]}px)`, offset: total ? acc / total : 0 };
    });
    const anim = el.animate(frames, { duration: 350 + total * 5.5, easing: "linear", fill: "forwards" });
    return () => anim.cancel();
    // runKey が変わるたびに1回だけ流す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, reducedMotion]);

  const wires =
    mode === "serial"
      ? [wirePath([IN, OUT])]
      : [wirePath([IN, [62, 75], [100, a[1]], [220, a[1]], [258, 75], OUT]), wirePath([[62, 75], [100, b[1]], [220, b[1]], [258, 75]])];
  const end = path[path.length - 1];

  return (
    <div className="relative mt-4 w-full rounded-xl bg-gray-50 ring-1 ring-gray-200" style={{ aspectRatio: "320 / 150" }} data-testid="system-diagram" data-up={up ? "true" : "false"}>
      <svg viewBox="0 0 320 150" className="absolute inset-0 h-full w-full">
        {wires.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#d1d5db" strokeWidth={3} strokeLinejoin="round" />
        ))}
        {/* 最後に通った（通れた）道を色で残す */}
        <path d={wirePath(path)} fill="none" stroke={reached ? "#10b981" : "#f43f5e"} strokeWidth={3} strokeLinejoin="round" opacity={0.7} />
        <text x={IN[0]} y={IN[1] - 12} textAnchor="middle" fontSize={10} fontWeight={700} fill="#6b7280">
          入口
        </text>
        <text x={OUT[0]} y={OUT[1] - 12} textAnchor="middle" fontSize={10} fontWeight={700} fill="#6b7280">
          出口
        </text>
        {!reached && (
          <text x={end[0]} y={end[1]} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={800} fill="#e11d48">
            ✕
          </text>
        )}
        {!reducedMotion && (
          <g ref={dot} key={runKey} style={{ transform: `translate(${IN[0]}px, ${IN[1]}px)` }}>
            <circle r={6} fill="#4f46e5" stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>

      {(["a", "b"] as const).map((k) => {
        const ok = k === "a" ? aOk : bOk;
        const p = k === "a" ? a : b;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            aria-pressed={!ok}
            aria-label={`装置${k.toUpperCase()}を${ok ? "故障させる" : "直す"}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg text-center text-[10px] font-bold leading-tight ring-2 transition active:scale-95 ${
              ok ? "bg-white text-gray-700 ring-emerald-400" : "bg-rose-50 text-rose-700 ring-rose-400"
            }`}
            style={{ left: `${(p[0] / 320) * 100}%`, top: `${(p[1] / 150) * 100}%`, width: BOX.w, height: BOX.h }}
            data-testid={`machine-${k}`}
          >
            {ok ? "⚙️" : "💥"} 装置{k.toUpperCase()}
            <br />
            {ok ? "稼働中" : "故障中"}
          </button>
        );
      })}
    </div>
  );
}
