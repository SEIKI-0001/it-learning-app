"use client";

import type { ReactNode } from "react";
import styles from "./calc/calc.module.css";
import { Note, Replay } from "./calc/CalcParts";
import { useBeats } from "./calc/useBeats";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「組込みシステムと制御」。
//   ① フィードバック制御の循環：センサー → 制御部 → アクチュエータ → 結果 → センサー を3周（軽い段階アニメ）
//      室温 30℃ → 27.5 → 26 → 25.2 と目標 25℃ に近づき、ずれが小さくなるとファンも弱まる
//   ② 入力と出力：センサー（測る）とアクチュエータ（動かす）の例を左右に（静的）
//   ③ リアルタイム制御：「平均が速い」ではなく「毎回期限内」を棒で比べる（静的）
//   ④ 試験ポイント

export default function EmbeddedControlExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        🔌 エアコンや自動車の中には、<b>その機能のためだけのコンピュータ</b>が入っています。これが組込みシステム。<b>測る → 決める → 動かす → また測る</b>を繰り返して機械を制御します。
      </Lead>
      <LoopPanel />
      <IoPanel />
      <RealtimePanel />
      <PointsPanel
        step={4}
        points={[
          <>センサー＝<b>測る</b>（入力）、制御部＝<b>目標と比べて決める</b>、アクチュエータ＝<b>実際に動かす</b>（出力）</>,
          <>結果をまた測って、ずれに応じて次の動作を調整＝<b>フィードバック制御</b></>,
          <>リアルタイム制御＝決められた<b>期限内に必ず</b>応答すること（単に速いことではない）</>,
        ]}
        traps={[
          ["センサーがモーターを直接動かす", "センサーは測るだけ。動かすのはアクチュエータ（指示は制御部）"],
          ["リアルタイム＝処理が速い", "平均が速くても、1回でも期限に遅れたらリアルタイム制御にならない"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① フィードバック制御の循環
// ---------------------------------------------------------------------------

const TARGET = 25;
const TEMPS = [30, 27.5, 26, 25.2];
const fan = (diff: number) => (diff >= 4 ? "強" : diff >= 1.5 ? "中" : "弱");
const LAPS = TEMPS.length - 1;
// beat 0 は待機。1周＝4拍（測る → 比べる → 動かす → 結果）。最後にまとめ
const LOOP_BEATS = LAPS * 4 + 2;
const LOOP_DELAYS = [700, 1000, 1000, 1000, 1000];

type Phase = "sense" | "decide" | "act" | "result" | "idle";

function phaseOf(beat: number): { lap: number; phase: Phase } {
  if (beat === 0) return { lap: 0, phase: "idle" };
  if (beat > LAPS * 4) return { lap: LAPS - 1, phase: "idle" };
  const i = beat - 1;
  return { lap: Math.floor(i / 4), phase: (["sense", "decide", "act", "result"] as const)[i % 4] };
}

function LoopNode({ active, title, icon, children, testId }: { active: boolean; title: string; icon: string; children: ReactNode; testId: string }) {
  return (
    <div
      className={`rounded-xl px-1.5 py-1.5 text-center transition-all duration-300 ${active ? "bg-brand-600 text-white shadow-md ring-2 ring-brand-300" : "bg-white text-gray-700 ring-1 ring-gray-300"}`}
      data-testid={testId}
      data-active={active ? "true" : undefined}
    >
      <div className="text-[13px] font-bold">
        <span aria-hidden>{icon}</span> {title}
      </div>
      <div className={`mt-0.5 min-h-[2.1rem] text-[12px] leading-snug ${active ? "text-white" : "text-gray-500"}`}>{children}</div>
    </div>
  );
}

function LoopArrow({ glyph, on }: { glyph: string; on: boolean }) {
  return (
    <div className={`grid place-items-center text-xl font-bold leading-none transition-colors duration-300 ${on ? "text-brand-500" : "text-gray-300"}`} aria-hidden>
      {glyph}
    </div>
  );
}

function LoopPanel() {
  const { ref, beat, done, reducedMotion, replay } = useBeats(LOOP_BEATS, LOOP_DELAYS);
  const { lap, phase } = phaseOf(beat);
  const before = done ? TEMPS[LAPS] : TEMPS[lap];
  const after = TEMPS[lap + 1];
  const diff = before - TARGET;
  const showResult = phase === "result" || done;
  const shownTemp = done ? TEMPS[LAPS] : showResult ? after : before;
  // 何周目の結果までグラフに出すか
  const plotted = done ? LAPS + 1 : phase === "result" ? lap + 2 : lap + 1;
  return (
    <Panel>
      <SectionTitle step={1}>測る → 決める → 動かす → また測る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        部屋を<b className="text-gray-800">目標25℃</b>に保つエアコン。いまは30℃です。光っている所が、いま働いている部品です。
      </p>

      <div ref={ref} className="mt-3" data-testid="embedded-loop" data-beat={beat} data-phase={phase}>
        <div className="grid grid-cols-[1fr_1.6rem_1fr] grid-rows-[auto_2.2rem_auto] gap-y-0.5">
          <LoopNode testId="loop-sense" active={phase === "sense"} title="センサー" icon="🌡️">
            測る：<b className="tabular-nums">{before.toFixed(1)}℃</b>
          </LoopNode>
          <LoopArrow glyph="→" on={phase === "decide"} />
          <LoopNode testId="loop-decide" active={phase === "decide"} title="制御部" icon="🧠">
            目標より<b className="tabular-nums">+{diff.toFixed(1)}℃</b>
            <br />→ ファン「{fan(diff)}」
          </LoopNode>

          <LoopArrow glyph="↑" on={phase === "sense" && lap > 0} />
          <div />
          <LoopArrow glyph="↓" on={phase === "act"} />

          <LoopNode testId="loop-result" active={phase === "result"} title="結果（室温）" icon="🏠">
            <b className="tabular-nums">{shownTemp.toFixed(1)}℃</b>
            {showResult && beat > 0 && <> に下がる</>}
          </LoopNode>
          <LoopArrow glyph="←" on={phase === "result"} />
          <LoopNode testId="loop-act" active={phase === "act"} title="アクチュエータ" icon="🌀">
            モーターで
            <br />
            ファンを「{fan(diff)}」
          </LoopNode>
        </div>

        {/* 室温の記録。目標線に近づき、ずれが小さくなる */}
        <div className="mt-3 rounded-xl bg-gray-50 px-2 pb-1 pt-2 ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <Caption>室温の記録（緑の点線＝目標25℃）</Caption>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-gray-600 ring-1 ring-gray-200" data-testid="loop-lap">
              {beat === 0 ? "待機中" : done ? `${LAPS}周して目標に` : `${lap + 1}周目`}
            </span>
          </div>
          <svg viewBox="0 0 280 74" className="w-full mx-auto max-w-md" role="img" aria-label="室温が30℃から25.2℃へ、目標25℃に近づいていく">
            <line x1="30" x2="272" y1={ty(TARGET)} y2={ty(TARGET)} className="stroke-emerald-500" strokeDasharray="4 3" />
            <text x="26" y={ty(TARGET) + 4} textAnchor="end" fontSize="11" className="fill-emerald-700 font-bold">
              25
            </text>
            <text x="26" y={ty(30) + 4} textAnchor="end" fontSize="11" className="fill-gray-500">
              30
            </text>
            <polyline points={TEMPS.slice(0, plotted).map((t, i) => `${tx(i)},${ty(t)}`).join(" ")} className="fill-none stroke-brand-500" strokeWidth="2" />
            {TEMPS.slice(0, plotted).map((t, i) => (
              <g key={i} className={styles.reveal}>
                <circle cx={tx(i)} cy={ty(t)} r="4" className="fill-brand-600" />
                <text x={tx(i)} y={ty(t) - 8} textAnchor="middle" fontSize="11" className="fill-gray-700 font-bold">
                  {t}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {done && (
          <Note>
            💡 結果をもう一度センサーで測り、<b>ずれが小さくなるほどファンを弱める</b>。この「結果を戻して調整する」のが<b>フィードバック制御</b>です。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

const tx = (i: number) => 50 + i * 70;
const ty = (t: number) => 18 + (30 - t) * 10;

// ---------------------------------------------------------------------------
// ② 入力と出力
// ---------------------------------------------------------------------------

const SENSORS = ["🌡️ 温度", "💡 明るさ", "📏 距離", "📳 加速度"];
const ACTUATORS = ["⚙️ モーター", "🚰 弁（バルブ）", "🔥 ヒーター", "🔊 スピーカー"];

function IoPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>センサーは入口、アクチュエータは出口</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">間に制御部（マイコン）が入ります。センサーが直接モーターを回すことはありません。</p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5" data-testid="embedded-io">
        <div className="rounded-xl bg-sky-50 p-2 ring-1 ring-sky-200">
          <div className="text-center text-[13px] font-bold text-sky-900">センサー</div>
          <div className="text-center text-[11px] font-bold text-sky-700">世界を<b>測る</b>（入力）</div>
          <ul className="mt-1.5 space-y-1">
            {SENSORS.map((s) => (
              <li key={s} className="rounded-md bg-white px-1.5 py-1 text-center text-[12px] font-bold text-gray-700">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-lg font-bold text-gray-400" aria-hidden>→</span>
          <div className="rounded-lg bg-brand-600 px-1.5 py-2 text-center text-[12px] font-bold leading-tight text-white">
            制御部
            <br />
            <span className="text-[11px] font-normal text-white/85">判断</span>
          </div>
          <span className="text-lg font-bold text-gray-400" aria-hidden>→</span>
        </div>
        <div className="rounded-xl bg-accent-50 p-2 ring-1 ring-accent-200">
          <div className="text-center text-[13px] font-bold text-accent-800">アクチュエータ</div>
          <div className="text-center text-[11px] font-bold text-accent-700">実際に<b>動かす</b>（出力）</div>
          <ul className="mt-1.5 space-y-1">
            {ACTUATORS.map((s) => (
              <li key={s} className="rounded-md bg-white px-1.5 py-1 text-center text-[12px] font-bold text-gray-700">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ リアルタイム制御
// ---------------------------------------------------------------------------

// 障害物を見つけてからブレーキを指示するまでの時間（ミリ秒）。期限は 100ms
const DEADLINE = 100;
const SYS = [
  { name: "A：平均は速い", times: [30, 25, 35, 140, 28], avg: 52 },
  { name: "B：毎回期限内", times: [70, 75, 72, 78, 70], avg: 73 },
];

function RealtimePanel() {
  return (
    <Panel>
      <SectionTitle step={3}>リアルタイム制御 ＝ 期限を必ず守る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        自動ブレーキは、障害物を見つけてから<b className="text-gray-800">100ミリ秒以内</b>に必ず動く必要があります。5回測った応答時間です。
      </p>
      <div className="mt-3 space-y-3" data-testid="embedded-realtime">
        {SYS.map((s) => {
          const ok = s.times.every((t) => t <= DEADLINE);
          return (
            <div key={s.name}>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-gray-800">{s.name}</span>
                <span className="text-[11px] font-bold tabular-nums text-gray-500">平均 {s.avg}ms</span>
              </div>
              <div className="relative mt-1 h-4" aria-hidden>
                <span className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-rose-600" style={{ left: `${(DEADLINE / 150) * 100}%` }}>
                  期限 100ms
                </span>
              </div>
              <div className="relative space-y-0.5">
                <div className="absolute inset-y-0 border-l-2 border-dashed border-rose-400" style={{ left: `${(DEADLINE / 150) * 100}%` }} aria-hidden />
                {s.times.map((t, i) => (
                  <div key={i} className="h-3 rounded-sm bg-gray-100">
                    <div className={`h-3 rounded-sm ${t > DEADLINE ? "bg-rose-500" : "bg-brand-500"}`} style={{ width: `${(Math.min(t, 150) / 150) * 100}%` }} />
                  </div>
                ))}
              </div>
              <p className={`mt-1 text-[12px] font-bold ${ok ? "text-emerald-700" : "text-rose-700"}`}>
                {ok ? "✅ 5回とも期限内 → リアルタイム制御に使える" : "❌ 4回目が140ms。1回でも遅れたら事故になる"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">💡 大事なのは平均の速さではなく、<b className="text-gray-800">毎回、決められた時間内に応答できること</b>。</p>
    </Panel>
  );
}
