"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./reliability.module.css";

// 稼働率の式を「実際の時間」に置き換える時間軸。
//   600時間を同じ縮尺で並べ、🟩稼働（MTBF）→⚡故障→🟥修理（MTTR）→✅復旧→🟩… を繰り返す。
//   MTBF を伸ばすと緑の区間が横に伸び、MTTR を縮めると赤の区間が縮む（幅が連続して変わる）。
//   ▶ で時計を進めると、稼働時間・停止時間が積み上がり、サイクルの終わりごとに式の答えと一致する。

export const WINDOW_H = 600;
const PLAY_MS = 7000;

type Seg = { kind: "up" | "down"; start: number; len: number };

// 縮尺は常に600時間＝全幅のまま、並べるのは「600時間に収まる完全なサイクル」だけ。
// 途中で切れたサイクルを入れないので、最後まで進めると実際の割合が式の答えとぴったり一致する。
export function cycleCount(mtbf: number, mttr: number) {
  return Math.max(1, Math.floor(WINDOW_H / (mtbf + mttr)));
}

export function endHour(mtbf: number, mttr: number) {
  return cycleCount(mtbf, mttr) * (mtbf + mttr);
}

export function segments(mtbf: number, mttr: number): Seg[] {
  const out: Seg[] = [];
  for (let c = 0; c < cycleCount(mtbf, mttr); c++) {
    const t = c * (mtbf + mttr);
    out.push({ kind: "up", start: t, len: mtbf });
    out.push({ kind: "down", start: t + mtbf, len: mttr });
  }
  return out;
}

export function accumulated(mtbf: number, mttr: number, hour: number) {
  let up = 0;
  let down = 0;
  for (const s of segments(mtbf, mttr)) {
    const part = Math.max(0, Math.min(s.len, hour - s.start));
    if (s.kind === "up") up += part;
    else down += part;
  }
  return { up, down };
}

export type Focus = "mtbf" | "mttr" | "cycle" | null;

const pct = (h: number) => `${(h / WINDOW_H) * 100}%`;

export function UptimeTimeline({ mtbf, mttr, focus, reducedMotion }: { mtbf: number; mttr: number; focus: Focus; reducedMotion: boolean }) {
  const segs = segments(mtbf, mttr);
  const end = endHour(mtbf, mttr);
  const [hour, setHour] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const clock = useRef(0);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      clock.current = Math.min(end, clock.current + ((now - last) / PLAY_MS) * WINDOW_H);
      last = now;
      setHour(clock.current);
      if (clock.current >= end) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reducedMotion, end]);

  function play() {
    if (playing) {
      setPlaying(false);
      return;
    }
    clock.current = hour === null || hour >= end ? 0 : hour;
    setHour(clock.current);
    setPlaying(true);
  }

  function scrub(h: number) {
    setPlaying(false);
    clock.current = h;
    setHour(h);
  }

  const shown = Math.min(hour ?? end, end);
  const acc = accumulated(mtbf, mttr, shown);
  const cur = segs.find((s) => shown >= s.start && shown < s.start + s.len);
  const ratio = acc.up + acc.down > 0 ? acc.up / (acc.up + acc.down) : 0;
  const dim = (kind: "up" | "down", i: number) => {
    if (!focus) return false;
    if (focus === "mtbf") return kind !== "up";
    if (focus === "mttr") return kind !== "down";
    return i > 1; // cycle：最初の1サイクル（緑＋赤）だけ
  };

  return (
    <div className="mt-4" data-testid="uptime-timeline" data-segments={segs.length}>
      {/* 1サイクル目の目盛り（上：MTBF、下：MTTR） */}
      <div className="relative h-5">
        <div
          className={`${styles.width} absolute bottom-0.5 h-2 border-x-2 border-t-2 border-emerald-500`}
          style={{ left: 0, width: pct(Math.min(mtbf, WINDOW_H)) }}
        />
        <span className="absolute left-0 top-[-2px] whitespace-nowrap rounded bg-emerald-600 px-1 text-[10px] font-bold text-white" data-testid="label-mtbf">
          MTBF {mtbf}h
        </span>
      </div>

      <div className="relative h-8 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-300">
        <div className="flex h-full">
          {segs.map((s, i) => (
            <div
              key={`${s.kind}-${i}`}
              className={`${styles.width} relative h-full flex-none ${s.kind === "up" ? "bg-emerald-400" : "bg-rose-400"} ${dim(s.kind, i) ? "opacity-25" : ""}`}
              style={{ width: pct(s.len) }}
              data-testid={`seg-${s.kind}`}
            >
              {s.kind === "down" && s.len >= 14 && <span className="absolute inset-0 grid place-items-center text-[10px]">🔧</span>}
            </div>
          ))}
        </div>
        {/* 時計の針 */}
        {hour !== null && <div className="absolute inset-y-0 w-0.5 bg-gray-900" style={{ left: pct(shown) }} data-testid="uptime-cursor" />}
      </div>

      <div className="relative h-9">
        {mtbf < WINDOW_H && (
          <>
            <div
              className={`${styles.width} absolute top-0.5 h-2 border-x-2 border-b-2 border-rose-500`}
              style={{ left: pct(mtbf), width: pct(Math.min(mttr, WINDOW_H - mtbf)) }}
            />
            <span
              className={`${styles.left} absolute top-3 whitespace-nowrap rounded bg-rose-500 px-1 text-[10px] font-bold text-white`}
              style={{ left: pct(mtbf) }}
              data-testid="label-mttr"
            >
              ⚡故障→🔧修理 MTTR {mttr}h→✅復旧
            </span>
          </>
        )}
      </div>

      {/* 1サイクル＝MTBF＋MTTR の括弧 */}
      <div className={`relative h-5 transition-opacity ${focus === "cycle" ? "opacity-100" : "opacity-60"}`}>
        <div
          className={`${styles.width} absolute top-0 h-2 border-x-2 border-b-2 border-brand-500`}
          style={{ left: 0, width: pct(Math.min(mtbf + mttr, WINDOW_H)) }}
        />
        <span className="absolute left-0 top-2 whitespace-nowrap text-[10px] font-bold text-brand-700">
          1サイクル＝MTBF＋MTTR＝{mtbf + mttr}h
        </span>
      </div>

      <div className="mt-1 flex justify-between text-[10px] font-bold text-gray-400">
        <span>0h</span>
        <span>
          {segs.length / 2}サイクル＝{end}h（目盛りは600hで固定）
        </span>
      </div>

      {/* 時計を進めて、実際に積み上がる時間を数える */}
      <div className="mt-2 flex items-center gap-2">
        {!reducedMotion && (
          <button type="button" onClick={play} className="flex-none rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95">
            {playing ? "⏸ 止める" : "▶ 時計を進める"}
          </button>
        )}
        <input
          type="range"
          min={0}
          max={end}
          step={5}
          value={shown}
          onChange={(e) => scrub(Number(e.target.value))}
          aria-label="経過時間"
          className="min-w-0 flex-1 accent-brand-600"
        />
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center text-[11px]" data-testid="uptime-acc">
        <div className={`rounded-lg px-1 py-1 font-bold ${!cur ? "bg-brand-50 text-brand-800" : cur.kind === "up" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
          {Math.round(shown)}h：{!cur ? `✅ 復旧（${segs.length / 2}サイクル）` : cur.kind === "up" ? "🟩 稼働中" : "🟥 修理中"}
        </div>
        <div className="rounded-lg bg-gray-50 px-1 py-1 text-gray-700 ring-1 ring-gray-200">
          稼働 <b className="text-emerald-700">{Math.round(acc.up)}h</b> / 停止 <b className="text-rose-700">{Math.round(acc.down)}h</b>
        </div>
        <div className="rounded-lg bg-gray-50 px-1 py-1 text-gray-700 ring-1 ring-gray-200">
          実際の割合 <b className="text-brand-700">{(ratio * 100).toFixed(1)}%</b>
        </div>
      </div>
    </div>
  );
}
