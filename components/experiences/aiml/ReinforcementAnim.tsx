"use client";

import { StoryCaption, useStoryboard } from "./storyboard";

// 強化学習のアニメ。迷路のロボットが「1回目（でたらめ）→ 2回目（遠回り）→ 50回目（近道）」と上達する。
// 報酬のルールは2つだけ：1歩ごとに −1／ゴールで +20（近道ほど報酬が多い）。
// 歩数と報酬は、下の迷路と手順から計算する（数字を手で書かない）。

/** # = 壁、S = スタート、G = ゴール */
export const MAZE = [
  ". . . . G", //
  ". # # . #",
  ". . # . .",
  "# . . . #",
  "S . # . .",
].map((row) => row.split(" "));

const ROWS = MAZE.length;
const COLS = MAZE[0].length;
const find = (ch: string) => {
  const y = MAZE.findIndex((r) => r.includes(ch));
  return { x: MAZE[y].indexOf(ch), y };
};
const START = find("S");
const GOAL = find("G");

export const REWARD = { goal: 20, step: -1 } as const;

const DIR = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] } as const;
type Move = keyof typeof DIR;

type Step = { x: number; y: number; bump: Move | null; goal: boolean; reward: number };

/** 手順どおりに動かす。壁や外へ進もうとしたら、その場にとどまる（1歩はむだになる） */
export function simulate(moves: string) {
  let x = START.x;
  let y = START.y;
  let reward = 0;
  const steps: Step[] = [];
  for (const m of moves as Iterable<Move>) {
    const [dx, dy] = DIR[m];
    const nx = x + dx;
    const ny = y + dy;
    const blocked = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || MAZE[ny][nx] === "#";
    if (!blocked) {
      x = nx;
      y = ny;
    }
    reward += REWARD.step;
    const goal = x === GOAL.x && y === GOAL.y;
    if (goal) reward += REWARD.goal;
    steps.push({ x, y, bump: blocked ? m : null, goal, reward });
    if (goal) break;
  }
  const last = steps[steps.length - 1];
  return { steps, goal: last.goal, reward: last.reward };
}

export const TRIES = [
  { n: "1回目", act: "でたらめに動く", end: "ゴールできず", moves: "URRUUULDURUDDRDRLULU", ms: 220 },
  { n: "2回目", act: "遠回りしてゴール", end: "遠回りでゴール", moves: "RURRDRLULLULUURRRR", ms: 200 },
  { n: "50回目", act: "近道を覚えた", end: "近道でゴール", moves: "RURRUUUR", ms: 380 },
].map((t) => ({ ...t, ...simulate(t.moves) }));

const fmt = (r: number) => (r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : "0");

type Frame = { kind: "intro"; t: number } | { kind: "step"; t: number; i: number } | { kind: "end"; t: number } | { kind: "skip" };

const FRAMES: Frame[] = [];
const DURATIONS: number[] = [];
TRIES.forEach((tr, t) => {
  if (t === 2) {
    FRAMES.push({ kind: "skip" });
    DURATIONS.push(1600);
  }
  FRAMES.push({ kind: "intro", t });
  DURATIONS.push(900);
  tr.steps.forEach((s, i) => {
    FRAMES.push({ kind: "step", t, i });
    DURATIONS.push(s.bump ? tr.ms + 200 : tr.ms);
  });
  FRAMES.push({ kind: "end", t });
  DURATIONS.push(t === TRIES.length - 1 ? 0 : 2000);
});
const CELL = 34;
const PAD = 4;
const cx = (x: number) => PAD + x * CELL + CELL / 2;
const cy = (y: number) => PAD + y * CELL + CELL / 2;
const SIZE = PAD * 2 + COLS * CELL;

function caption(f: Frame) {
  if (f.kind === "skip") return "…何十回もくり返すと";
  const tr = TRIES[f.t];
  if (f.kind === "end") return `${tr.n}：${tr.end}`;
  return `${tr.n}：${tr.act}`;
}

export function ReinforcementAnim() {
  const { ref, frame, done, replay } = useStoryboard(DURATIONS);
  const f = FRAMES[frame];
  const t = f.kind === "skip" ? 1 : f.t;
  const tr = TRIES[t];
  const stepIdx = f.kind === "step" ? f.i : f.kind === "end" || f.kind === "skip" ? tr.steps.length - 1 : -1;
  const cur = stepIdx >= 0 ? tr.steps[stepIdx] : { x: START.x, y: START.y, bump: null, goal: false, reward: 0 };
  const finished = TRIES.filter((_, i) => i < t || (i === t && (f.kind === "end" || f.kind === "skip"))).length;
  const trail = [START, ...tr.steps.slice(0, stepIdx + 1)].map((p) => `${cx(p.x)},${cy(p.y)}`).join(" ");
  const nudge = cur.bump ? DIR[cur.bump].map((d) => d * CELL * 0.3) : [0, 0];
  const best = t === TRIES.length - 1;

  return (
    <div ref={ref} className="mx-auto mt-3 max-w-sm" data-testid="ml-rl-anim" data-frame={frame}>
      <StoryCaption step={0} total={0} text={caption(f)} done={done} replay={replay} testId="ml-rl-caption" />
      <div className="mt-1.5 flex items-center gap-3 rounded-xl p-2 ring-1 ring-gray-200">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-[62%] flex-none" role="img" aria-label="迷路のロボットが試行錯誤でゴールへの近道を覚える様子">
          {MAZE.map((row, y) =>
            row.map((ch, x) => (
              <rect
                key={`${x}-${y}`}
                x={PAD + x * CELL + 1}
                y={PAD + y * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={4}
                fill={ch === "#" ? "#4b5563" : ch === "G" ? "#d1fae5" : "#f3f4f6"}
              />
            )),
          )}
          <text x={cx(START.x)} y={cy(START.y) + 13} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#6b7280">
            スタート
          </text>
          <text x={cx(GOAL.x)} y={PAD + 10} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#047857">
            ゴール
          </text>

          <polyline points={trail} fill="none" stroke={best ? "#059669" : "#93c5fd"} strokeWidth={best ? 4 : 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />

          <g
            data-testid="ml-rl-robot"
            data-x={cur.x}
            data-y={cur.y}
            style={{
              transform: `translate(${cx(cur.x) + nudge[0]}px, ${cy(cur.y) + nudge[1]}px)`,
              transition: `transform ${Math.round(tr.ms * 0.8)}ms ease-out`,
            }}
          >
            <rect x={-9} y={-8} width={18} height={15} rx={4} fill="#1d4ed8" />
            <line x1={0} y1={-8} x2={0} y2={-12} stroke="#1d4ed8" strokeWidth={1.5} />
            <circle cx={0} cy={-13} r={1.8} fill="#1d4ed8" />
            <circle cx={-3.5} cy={-1.5} r={2} fill="#fff" />
            <circle cx={3.5} cy={-1.5} r={2} fill="#fff" />
          </g>
          {f.kind === "step" && cur.goal && (
            <text x={cx(cur.x)} y={cy(cur.y) - 16} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#059669" style={{ animation: "float-up 900ms ease-out forwards" }}>
              +{REWARD.goal}
            </text>
          )}
        </svg>

        <div className="min-w-0 flex-1 text-center">
          <div className="text-[11px] font-bold text-gray-500">報酬</div>
          <div
            data-testid="ml-rl-reward"
            className={`text-3xl font-bold tabular-nums ${cur.reward > 0 ? "text-emerald-600" : cur.reward < 0 ? "text-rose-600" : "text-gray-700"}`}
          >
            {fmt(cur.reward)}
          </div>
          <div className="mt-2 text-[11px] leading-snug text-gray-500">
            1歩ごとに −1
            <br />
            ゴールで +20
          </div>
        </div>
      </div>

      <ol className="mt-2 grid grid-cols-3 gap-1.5 text-center" aria-label="回ごとの報酬">
        {TRIES.map((r, i) => {
          const shown = i < finished;
          const now = i === t && f.kind !== "skip" && !shown;
          return (
            <li
              key={r.n}
              data-testid={shown ? "ml-rl-row" : undefined}
              className={`rounded-lg px-1 py-1.5 ring-1 transition-colors ${
                now ? "bg-brand-50 ring-brand-300" : shown ? "bg-white ring-gray-200" : "bg-gray-50 ring-gray-100"
              }`}
            >
              <div className={`text-[11px] font-bold ${shown || now ? "text-gray-700" : "text-gray-400"}`}>{r.n}</div>
              <div className={`text-[15px] font-bold tabular-nums ${!shown ? "text-gray-300" : r.reward > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {shown ? fmt(r.reward) : "…"}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
