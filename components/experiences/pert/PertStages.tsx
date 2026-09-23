"use client";

import { useId, useState } from "react";
import styles from "../calc/calc.module.css";
import { Choices, Note, Replay, StepChips, type Choice } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";

// PERT・クリティカルパス。本試験の「全体で何日かかるか（最短所要日数）」を自力で解けるようにする。
//   ④ 一本道       ：A 3日 → B 5日。棒が日数ぶん伸びて 3＋5＝8日
//   ⑤ 並行作業     ：A のあと B（5日）と C（2日）が同時スタート。C は先に終わって「待機」。D はまだ始められない
//   ⑥ 全体の日数   ：B が終わってから D（4日）。3＋5＋4＝12日（C の2日は足さない）
//   ⑦ クリティカルパス：A→B→D＝12日 と A→C→D＝9日 を比べ、最長の経路を強調
//   ⑧ 解き方を固定 ：経路を探す → 各経路の日数を足す → 最長を選ぶ（試験の「最短日数」＝最長経路）
//   ⑨ 確認3問      ：一本道 → 並行あり → 本試験レベル。誤答はつまずいた手順を返す
// 最早・最遅結合点時刻や余裕日数は発展扱い（⑦で一言だけ触れ、確認問題では求めない）。

export const PERT_STEPS = ["① 経路を探す", "② 日数を足す", "③ 最長を選ぶ"];

const MAX_DAY = 12;
/** 棒が1日ぶん伸びる時間（ms） */
const DAY_MS = 380;
const pct = (day: number) => `${(day / MAX_DAY) * 100}%`;

type Tone = "brand" | "sky" | "emerald" | "amber" | "gray";
const BAR_TONE: Record<Tone, string> = {
  brand: "bg-brand-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  gray: "bg-gray-400",
};

type Bar = {
  id: string;
  label: string;
  start: number;
  days: number;
  tone: Tone;
  /** 伸び切っているか（false なら長さ 0） */
  on: boolean;
  /** 伸び始めるまでの遅れ（日）。同時スタートでも長さの違う棒の終わりをずらすのに使う */
  delayDays?: number;
  /** 棒の後ろに付ける「待機」区間（日） */
  wait?: { days: number; on: boolean; delayDays: number };
  /** 棒の代わりに出すメッセージ（まだ始められない等） */
  pending?: string;
};

/** 日数の目盛り＋作業ごとの棒。棒は日数に比例した時間で伸びるので「同時に進む」が見える。 */
function Timeline({ bars, finish, testId }: { bars: Bar[]; finish?: number; testId?: string }) {
  return (
    <div data-testid={testId} className="rounded-xl bg-gray-50 px-2 pb-2 pt-1 ring-1 ring-gray-200">
      <div className="grid grid-cols-[2.6rem_1fr] items-end gap-x-1.5">
        <span className="text-[9px] font-bold text-gray-400">作業</span>
        <div className="relative h-4" aria-hidden>
          {Array.from({ length: MAX_DAY + 1 }, (_, d) => (
            <span key={d} className="absolute -translate-x-1/2 text-[9px] tabular-nums text-gray-400" style={{ left: pct(d) }}>
              {d}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-0.5 space-y-1.5">
        {bars.map((b) => (
          <div key={b.id} className="grid grid-cols-[2.6rem_1fr] items-center gap-x-1.5">
            <span className="truncate text-[11px] font-bold text-gray-700">{b.label}</span>
            <div className="relative h-6 rounded bg-white ring-1 ring-gray-200">
              {/* 1日ごとの薄い区切り */}
              {Array.from({ length: MAX_DAY - 1 }, (_, d) => (
                <span key={d} className="absolute inset-y-0 w-px bg-gray-100" style={{ left: pct(d + 1) }} aria-hidden />
              ))}
              {b.pending ? (
                <span className="absolute inset-y-0 grid place-items-center whitespace-nowrap text-[10px] font-bold text-gray-500" style={{ left: pct(b.start) }}>
                  {b.pending}
                </span>
              ) : (
                <div
                  className={`${styles.grow} absolute inset-y-0.5 overflow-hidden rounded ${BAR_TONE[b.tone]}`}
                  style={{
                    left: pct(b.start),
                    width: b.on ? pct(b.days) : "0%",
                    transitionDuration: `${b.days * DAY_MS}ms`,
                    transitionDelay: `${(b.delayDays ?? 0) * DAY_MS}ms`,
                  }}
                  data-testid={`pert-bar-${b.id}`}
                  data-on={b.on ? "true" : "false"}
                >
                  <span className="absolute inset-0 grid place-items-center whitespace-nowrap text-[10px] font-bold text-white">
                    {b.days}日
                  </span>
                </div>
              )}
              {b.wait && (
                <div
                  className={`${styles.grow} absolute inset-y-0.5 overflow-hidden rounded border border-dashed border-gray-400 bg-[repeating-linear-gradient(135deg,#f3f4f6_0_4px,#e5e7eb_4px_8px)]`}
                  style={{
                    left: pct(b.start + b.days),
                    width: b.wait.on ? pct(b.wait.days) : "0%",
                    opacity: b.wait.on ? 1 : 0,
                    transitionDuration: `${b.wait.days * DAY_MS}ms`,
                    transitionDelay: `${b.wait.delayDays * DAY_MS}ms`,
                  }}
                  data-testid={`pert-wait-${b.id}`}
                >
                  <span className="absolute inset-0 grid place-items-center whitespace-nowrap text-[10px] font-bold text-gray-600">待機</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {finish !== undefined && (
        <div className="grid grid-cols-[2.6rem_1fr] gap-x-1.5">
          <span />
          <div className="relative h-5">
            <span
              className={`absolute top-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-1.5 text-[10px] font-bold text-white ${styles.pop}`}
              style={{ left: pct(finish) }}
              data-testid="pert-finish"
            >
              🏁 {finish}日
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④ 一本道
// ---------------------------------------------------------------------------

const LINE_DELAYS = [700, 3 * DAY_MS + 500, 5 * DAY_MS + 500, 1300];

export function LineStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, LINE_DELAYS);
  return (
    <Panel>
      <SectionTitle step={4}>一本道なら、日数を足すだけ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ここからは本試験の<b className="text-gray-800">「全体で何日かかるか」</b>を計算します。まずは、A が終わってから B を始める一本道。
      </p>
      <div className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-gray-600" aria-label="開始 → A 3日 → B 5日 → 完了">
        <span>開始</span>→<span className="rounded bg-brand-100 px-1.5 text-brand-800">A 3日</span>→
        <span className="rounded bg-sky-100 px-1.5 text-sky-800">B 5日</span>→<span>完了</span>
      </div>

      <div ref={ref} className="mt-3" data-testid="pert-line" data-beat={b}>
        <Timeline
          bars={[
            { id: "A", label: "A", start: 0, days: 3, tone: "brand", on: b >= 1 },
            { id: "B", label: "B", start: 3, days: 5, tone: "sky", on: b >= 2 },
          ]}
          finish={b >= 3 ? 8 : undefined}
        />
        {b >= 3 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="pert-line-eq">
            3 ＋ 5 ＝ <span className="text-brand-600">8日</span>
          </div>
        )}
        {b >= 4 && (
          <Note>
            💡 前の作業が終わらないと次を始められない<b>一本道は、日数をそのまま足す</b>。B は A が終わった3日目から始まります。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 並行作業
// ---------------------------------------------------------------------------

const PARALLEL_DELAYS = [700, 3 * DAY_MS + 500, 5 * DAY_MS + 600, 1500];

export function ParallelStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, PARALLEL_DELAYS);
  return (
    <Panel>
      <SectionTitle step={5}>並行作業 ― 同時に進む</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        A が終わったら、<b className="text-gray-800">B（5日）と C（2日）を同時にスタート</b>。D は <b className="text-gray-800">B と C の両方</b>が終わってから始めます。
      </p>

      <div ref={ref} className="mt-3" data-testid="pert-parallel" data-beat={b}>
        <Timeline
          bars={[
            { id: "A", label: "A", start: 0, days: 3, tone: "brand", on: b >= 1 },
            { id: "B", label: "B", start: 3, days: 5, tone: "sky", on: b >= 2 },
            { id: "C", label: "C", start: 3, days: 2, tone: "emerald", on: b >= 2, wait: { days: 3, on: b >= 2, delayDays: 2 } },
            { id: "D", label: "D", start: 3, days: 4, tone: "amber", on: false, pending: b >= 2 ? "🔒 B と C の両方を待つ" : undefined },
          ]}
        />
        {b >= 3 && (
          <p className={`mt-2 text-center text-sm font-bold text-gray-700 ${styles.reveal}`} data-testid="pert-wait-msg">
            C は<b className="text-emerald-700">5日目</b>に終了。でも B が終わる<b className="text-sky-700">8日目</b>まで D は始められない
          </p>
        )}
        {b >= 4 && (
          <Note>
            💡 <b>並行作業は、全部の日数を足すわけではない</b>。同時に進むので、B の5日の間に C の2日は終わっています。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 全体の日数
// ---------------------------------------------------------------------------

const TOTAL_DELAYS = [900, 4 * DAY_MS + 500, 1500];

export function TotalStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(4, TOTAL_DELAYS);
  return (
    <Panel>
      <SectionTitle step={6}>全体で何日かかる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">B が終わった8日目に、やっと D（4日）を始められます。</p>

      <div ref={ref} className="mt-3" data-testid="pert-total" data-beat={b}>
        <Timeline
          bars={[
            { id: "A", label: "A", start: 0, days: 3, tone: "brand", on: true },
            { id: "B", label: "B", start: 3, days: 5, tone: "sky", on: true },
            { id: "C", label: "C", start: 3, days: 2, tone: "emerald", on: true, wait: { days: 3, on: true, delayDays: 0 } },
            { id: "D", label: "D", start: 8, days: 4, tone: "amber", on: b >= 1 },
          ]}
          finish={b >= 2 ? 12 : undefined}
        />
        {b >= 2 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="pert-total-eq">
            <span className="text-brand-700">3</span> ＋ <span className="text-sky-700">5</span> ＋ <span className="text-amber-700">4</span> ＝{" "}
            <span className="text-brand-600">12日</span>
          </div>
        )}
        {b >= 3 && (
          <Note>
            💡 C の2日は足しません（3＋5＋2＋4＝14日 は間違い）。C は <b>B と同時に進んで、B より先に終わっている</b>からです。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// アローダイアグラム（丸＝区切り、矢印＝作業）
// ---------------------------------------------------------------------------

type Node = { id: string; x: number; y: number };
type Edge = { id: string; from: string; to: string; label: string; bend?: number };

const EDGE_COLOR = { idle: "#9ca3af", on: "#2463d1", alt: "#0ea5e9", critical: "#e11d48", dim: "#d1d5db" } as const;
type EdgeState = keyof typeof EDGE_COLOR;

function ArrowDiagram({
  nodes,
  edges,
  state,
  height = 120,
  testId,
}: {
  nodes: Node[];
  edges: Edge[];
  state: (edgeId: string) => EdgeState;
  height?: number;
  testId?: string;
}) {
  const at = (id: string) => nodes.find((n) => n.id === id)!;
  const R = 11;
  // 同じページに図が複数ある（非表示スライドにも）ので、矢じりの id は図ごとに分ける
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 320 ${height}`} className="w-full" role="img" aria-label="アローダイアグラム" data-testid={testId}>
      <defs>
        {(Object.keys(EDGE_COLOR) as EdgeState[]).map((k) => (
          <marker key={k} id={`pert-arrow-${uid}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={EDGE_COLOR[k]} />
          </marker>
        ))}
      </defs>
      {edges.map((e) => {
        const a = at(e.from);
        const z = at(e.to);
        const s = state(e.id);
        const bend = e.bend ?? 0;
        // 丸の縁から縁へ。曲げる矢印は制御点を上下にずらす
        const dx = z.x - a.x;
        const dy = z.y - a.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        const cx = (a.x + z.x) / 2;
        const cy = (a.y + z.y) / 2 + bend;
        const sx = a.x + ux * R;
        const sy = a.y + uy * R + (bend ? Math.sign(bend) * 4 : 0);
        const ex = z.x - ux * (R + 2);
        const ey = z.y - uy * (R + 2) + (bend ? Math.sign(bend) * 4 : 0);
        const d = bend ? `M${sx},${sy} Q${cx},${cy} ${ex},${ey}` : `M${sx},${sy} L${ex},${ey}`;
        // まっすぐな矢印のラベルは、線に垂直な上側へ逃がす（斜めの矢印で文字が線に乗らないように）
        // （矢印はすべて右向きなので、法線 (uy, -ux) が上側）
        const lx = bend ? cx : cx + uy * 10;
        const ly = bend ? (a.y + z.y) / 2 + bend / 2 + (bend < 0 ? -5 : 12) : cy - ux * 10 + 3;
        return (
          <g key={e.id} data-testid={`pert-edge-${e.id}`} data-state={s}>
            <path
              d={d}
              fill="none"
              stroke={EDGE_COLOR[s]}
              strokeWidth={s === "critical" ? 3.5 : s === "idle" || s === "dim" ? 1.8 : 2.8}
              markerEnd={`url(#pert-arrow-${uid}-${s})`}
              className={styles.svgMove}
            />
            <text x={lx} y={ly} textAnchor="middle" fontSize="11" fontWeight="700" fill={s === "dim" ? "#9ca3af" : s === "critical" ? "#be123c" : "#374151"}>
              {e.label}
            </text>
          </g>
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={R} fill="#fff" stroke="#6b7280" strokeWidth="1.5" />
          <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#4b5563">
            {n.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ⑦ クリティカルパス
// ---------------------------------------------------------------------------

const MAIN_NODES: Node[] = [
  { id: "1", x: 18, y: 62 },
  { id: "2", x: 110, y: 62 },
  { id: "3", x: 222, y: 62 },
  { id: "4", x: 302, y: 62 },
];
const MAIN_EDGES: Edge[] = [
  { id: "A", from: "1", to: "2", label: "A 3日" },
  { id: "B", from: "2", to: "3", label: "B 5日", bend: -44 },
  { id: "C", from: "2", to: "3", label: "C 2日", bend: 44 },
  { id: "D", from: "3", to: "4", label: "D 4日" },
];

const ROUTES = [
  { id: "ABD", name: "A → B → D", calc: "3 ＋ 5 ＋ 4", days: 12, edges: ["A", "B", "D"] },
  { id: "ACD", name: "A → C → D", calc: "3 ＋ 2 ＋ 4", days: 9, edges: ["A", "C", "D"] },
];

const CRITICAL_DELAYS = [900, 1800, 1800, 1500];

export function CriticalStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, CRITICAL_DELAYS);
  const critical = b >= 3;
  const edgeState = (id: string): EdgeState => {
    if (critical) return ROUTES[0].edges.includes(id) ? "critical" : "dim";
    if (b === 2) return ROUTES[1].edges.includes(id) ? "alt" : "dim";
    if (b === 1) return ROUTES[0].edges.includes(id) ? "on" : "dim";
    return "idle";
  };
  return (
    <Panel>
      <SectionTitle step={7}>クリティカルパス ＝ いちばん長い経路</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        試験ではこの形（<b className="text-gray-800">アローダイアグラム</b>）で出ます。矢印が作業、丸は区切り。開始①から完了④まで、通り道は2本あります。
      </p>

      <div ref={ref} className="mt-2" data-testid="pert-critical" data-beat={b}>
        <ArrowDiagram nodes={MAIN_NODES} edges={MAIN_EDGES} state={edgeState} testId="pert-diagram" />
        <div className="mt-1 space-y-1.5">
          {ROUTES.map((r, i) => {
            const shown = b >= i + 1;
            const isCritical = critical && i === 0;
            return (
              <div
                key={r.id}
                className={`rounded-xl px-3 py-2 ring-1 transition ${!shown ? "opacity-30 ring-gray-200" : isCritical ? "bg-rose-50 ring-2 ring-rose-400" : "bg-gray-50 ring-gray-200"}`}
                data-testid={`pert-route-${r.id}`}
                data-critical={isCritical ? "true" : undefined}
              >
                <div className="flex items-baseline justify-between gap-2 text-sm font-bold">
                  <span className="text-gray-700">{r.name}</span>
                  <span className="tabular-nums text-gray-800">
                    {shown ? (
                      <>
                        {r.calc} ＝ <span className={isCritical ? "text-rose-600" : "text-gray-900"}>{r.days}日</span>
                      </>
                    ) : (
                      "？日"
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                  <div
                    className={`${styles.width} h-full rounded-full ${isCritical ? "bg-rose-500" : i === 0 ? "bg-brand-500" : "bg-sky-500"}`}
                    style={{ width: shown ? pct(r.days) : "0%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {critical && (
          <p className={`mt-2 text-center text-sm font-bold text-rose-700 ${styles.reveal}`} data-testid="pert-critical-msg">
            いちばん長い経路（12日）＝ クリティカルパス
          </p>
        )}
        {b >= 4 && (
          <>
            <Note>
              💡 全部の作業が終わるのは、<b>いちばん長い経路が終わったとき</b>。だから全体の日数は12日。クリティカルパス上の作業（A・B・D）が1日遅れると、全体も1日遅れます。
            </Note>
            <p className={`mt-2 text-[11px] leading-relaxed text-gray-500 ${styles.reveal}`}>
              発展：短いほうの経路には 12−9＝3日 の余裕があります（C は3日まで遅れても全体は12日のまま）。まずは「最長の経路＝全体の日数」を確実に。
            </p>
          </>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑧ 解き方を固定
// ---------------------------------------------------------------------------

const SOLVE_DELAYS = [1100, 1100, 1300];
const SOLVE_ROWS = [
  { step: PERT_STEPS[0], calc: "A→B→D と A→C→D", tone: "text-brand-700" },
  { step: PERT_STEPS[1], calc: "12日 と 9日", tone: "text-sky-700" },
  { step: PERT_STEPS[2], calc: "12日 ＝ 全体の日数", tone: "text-rose-700" },
];

export function PertSolveStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(4, SOLVE_DELAYS);
  return (
    <Panel>
      <SectionTitle step={8}>解き方は3ステップ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">矢印がいくつあっても、この順番で解けます。</p>
      <div ref={ref} className="mt-3 space-y-2" data-testid="pert-solve" data-beat={b}>
        {SOLVE_ROWS.map(
          (r, i) =>
            b >= i && (
              <div key={r.step} className={`flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200 ${styles.reveal}`}>
                <b className={`text-sm ${r.tone}`}>{r.step}</b>
                <span className="text-sm font-bold tabular-nums text-gray-800">{r.calc}</span>
              </div>
            ),
        )}
        {b >= 3 && (
          <>
            <div className={`rounded-xl bg-brand-50 px-3 py-3 text-center ring-2 ring-brand-400 ${styles.reveal}`}>
              <div className="text-[11px] font-bold text-brand-700">覚える言葉</div>
              <div className="mt-0.5 text-base font-bold text-gray-800">経路を探す → 日数を足す → 最長を選ぶ</div>
            </div>
            <Note>
              ⚠ 試験の<b>「最短で何日で終わるか（最短所要日数）」</b>も、答えは<b>最長の経路の日数</b>。全部の作業が終わるには、どう急いでも一番長い経路ぶんはかかるからです。
            </Note>
          </>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑨ 確認3問
// ---------------------------------------------------------------------------

type Q = { level: string; prompt: string; figure?: "exam"; choices: Choice[]; solution: string };

// Lv.3 の図：開始から A と B が並行、A→C、B→D、C と D の両方が終わってから E
const EXAM_NODES: Node[] = [
  { id: "1", x: 18, y: 62 },
  { id: "2", x: 120, y: 22 },
  { id: "3", x: 120, y: 102 },
  { id: "4", x: 226, y: 62 },
  { id: "5", x: 302, y: 62 },
];
const EXAM_EDGES: Edge[] = [
  { id: "A", from: "1", to: "2", label: "A 4日" },
  { id: "B", from: "1", to: "3", label: "B 2日" },
  { id: "C", from: "2", to: "4", label: "C 3日" },
  { id: "D", from: "3", to: "4", label: "D 6日" },
  { id: "E", from: "4", to: "5", label: "E 2日" },
];

export const PERT_QUESTIONS: Q[] = [
  {
    level: "Lv.1 一本道",
    prompt: "作業A（4日）が終わってから作業B（6日）を始める。全体で何日かかる？",
    choices: [
      { label: "10日", ok: true },
      { label: "6日", why: "長い作業Bだけを見ています。一本道は A が終わってから B なので、4＋6 と足します。", step: 1 },
      { label: "24日", why: "掛けています。前の作業が終わってから次を始めるので、日数は足し算です。", step: 1 },
    ],
    solution: "一本道なので ② 4 ＋ 6 ＝ 10日",
  },
  {
    level: "Lv.2 並行あり",
    prompt: "作業A（2日）の後、作業B（6日）と作業C（3日）を並行して行い、BとCの両方が終わってから作業D（1日）を行う。全体で何日かかる？",
    choices: [
      { label: "9日", ok: true },
      { label: "12日", why: "並行する B と C を両方足しています（2＋6＋3＋1）。同時に進むので、長いほうの経路だけが全体の日数です。", step: 2 },
      { label: "6日", why: "短いほうの経路（A→C→D＝2＋3＋1）を選んでいます。D は B が終わるまで始められないので、長いほうを選びます。", step: 2 },
      { label: "8日", why: "最後の作業D（1日）を足し忘れています。経路は開始から完了まで、最後の矢印までたどります。", step: 0 },
    ],
    solution: "① A→B→D と A→C→D　② 2＋6＋1＝9日、2＋3＋1＝6日　③ 長いほう ＝ 9日",
  },
  {
    level: "Lv.3 本試験レベル",
    prompt: "図のアローダイアグラムで表されるプロジェクトの、最短所要日数は何日か。",
    figure: "exam",
    choices: [
      { label: "10日", ok: true },
      { label: "9日", why: "短いほうの経路（A→C→E＝4＋3＋2）を選んでいます。「最短所要日数」でも、答えは最長の経路です。", step: 2 },
      { label: "17日", why: "全部の作業を足しています（4＋2＋3＋6＋2）。A と B、C と D は並行して進みます。", step: 1 },
      { label: "8日", why: "最後の作業E（2日）を入れ忘れています（B→D＝2＋6）。経路は完了⑤までたどります。", step: 0 },
    ],
    solution: "① A→C→E と B→D→E　② 4＋3＋2＝9日、2＋6＋2＝10日　③ 最長 ＝ 10日（B→D→E がクリティカルパス）",
  },
];

export function PertPractice() {
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const q = PERT_QUESTIONS[index];
  const last = index === PERT_QUESTIONS.length - 1;
  return (
    <Panel>
      <SectionTitle step={9}>確認問題：3段階で本試験レベルへ</SectionTitle>
      <div className="mt-3">
        <StepChips steps={PERT_STEPS} />
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid="pert-practice" data-index={index}>
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-brand-700">{q.level}</span>
          <span className="text-gray-400">
            {index + 1} / {PERT_QUESTIONS.length}
          </span>
        </div>
        <p className="mt-1 text-sm font-bold leading-relaxed text-gray-800">{q.prompt}</p>
        {q.figure === "exam" && (
          <div className="mt-2 rounded-lg bg-white px-1 ring-1 ring-gray-200">
            <ArrowDiagram
              nodes={EXAM_NODES}
              edges={EXAM_EDGES}
              state={(id) => (answered && ["B", "D", "E"].includes(id) ? "critical" : "idle")}
              height={124}
              testId="pert-exam-diagram"
            />
          </div>
        )}
        <div className="mt-2">
          <Choices key={index} choices={q.choices} steps={PERT_STEPS} cols={q.choices.length === 4 ? 2 : 3} onAnswer={() => setAnswered(true)} />
        </div>
        {answered && <p className={`mt-2 text-xs leading-relaxed text-gray-600 ${styles.reveal}`}>{q.solution}</p>}
      </div>
      {answered && !last && (
        <button
          type="button"
          onClick={() => {
            setIndex(index + 1);
            setAnswered(false);
          }}
          className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          次の問題へ →
        </button>
      )}
      {answered && last && (
        <Note tone="emerald">
          🎉 ここまで解ければ、本試験のアローダイアグラムの日数計算に対応できます。迷ったら<b>経路を探す → 日数を足す → 最長を選ぶ</b>。
        </Note>
      )}
    </Panel>
  );
}
