"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "../scene/useInView";
import { useReducedMotion } from "../scene/useReducedMotion";
import { Panel, SectionTitle } from "../ui";
import styles from "./reliability.module.css";

// 稼働率の「基本」4枚。どれも同じ 🟩稼働 90h ／ 🟥修理 10h の時間の帯を使い回す。
//   ① 意味　：100時間のうち何%動いていた？ → 稼働率＝動いていた時間÷全体の時間
//   ② 名前　：正常稼働→⚡故障→🔧修理→✅復旧→正常稼働 を時計の針が進み、緑に MTBF・赤に MTTR の名札が付く
//   ③ 導出　：動いていた÷全体 → 全体＝動いていた＋修理 → ラベルが MTBF / MTTR に置き換わる
//   ⑤ 1問　：MTBF 90h・MTTR 10h の稼働率（④ の実験は ReliabilityExperience 側）

const RUN = 90;
const FIX = 10;

type Part = { kind: "up" | "down" | "tail"; hours: number; label?: ReactNode; testId?: string };

const PART_TONE: Record<Part["kind"], string> = {
  up: "bg-emerald-400 text-white",
  down: "bg-rose-400 text-white",
  tail: `${styles.tail} text-emerald-800`,
};

/** 時間の帯。hours を total に対する割合の幅で並べる。 */
export function TimeBar({ parts, total, children }: { parts: Part[]; total: number; children?: ReactNode }) {
  return (
    <div className="relative h-9 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-300">
      <div className="flex h-full">
        {parts.map((p, i) => (
          <div
            key={i}
            className={`grid h-full flex-none place-items-center overflow-hidden whitespace-nowrap text-[10px] font-bold ${PART_TONE[p.kind]}`}
            style={{ width: `${(p.hours / total) * 100}%` }}
            data-testid={p.testId}
          >
            {p.label}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

/** 帯の下に付ける括弧（from〜to 時間）。 */
function Bracket({ from, to, total, tone, children }: { from: number; to: number; total: number; tone: string; children: ReactNode }) {
  return (
    <div className="relative h-7">
      <div
        className={`absolute top-0.5 h-2 border-x-2 border-b-2 ${tone}`}
        style={{ left: `${(from / total) * 100}%`, width: `${((to - from) / total) * 100}%` }}
      />
      <div
        className="absolute top-3 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold"
        style={{ left: `${((from + to) / 2 / total) * 100}%` }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 稼働率の意味（用語はまだ出さない）
// ---------------------------------------------------------------------------

const MEANING_CHOICES = [
  { v: 10, why: "10時間は「修理で止まっていた」ほうの時間です。" },
  { v: 90, why: "" },
  { v: 100, why: "10時間は修理で止まっていたので、100%ではありません。" },
];

export function MeaningStage() {
  const [pick, setPick] = useState<number | null>(null);
  const correct = pick === 90;
  return (
    <Panel>
      <SectionTitle step={1}>稼働率＝動いていた時間の割合</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ある機械を<b className="text-gray-800">100時間</b>見ていたら、<b className="text-emerald-700">90時間は動いて</b>、
        <b className="text-rose-700">10時間は修理で止まって</b>いました。
      </p>

      <div className="mt-4" data-testid="meaning-bar">
        <TimeBar
          total={100}
          parts={[
            { kind: "up", hours: RUN, label: "✅ 動いている 90h" },
            { kind: "down", hours: FIX, label: "🔧" },
          ]}
        />
        <div className="relative h-4 text-[10px] font-bold">
          <span className="absolute right-0 top-0.5 text-rose-700">修理 10h</span>
        </div>
        <Bracket from={0} to={100} total={100} tone="border-gray-400">
          <span className="text-gray-600">全体 100h</span>
        </Bracket>
      </div>

      <p className="mt-3 text-sm font-bold text-gray-800">この100時間のうち、何%動いていた？</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {MEANING_CHOICES.map((c) => {
          const tone =
            pick === null
              ? "bg-white text-gray-700 ring-1 ring-gray-300"
              : pick === c.v
                ? c.v === 90
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white"
                : c.v === 90
                  ? "bg-white text-emerald-700 ring-2 ring-emerald-400"
                  : "bg-white text-gray-400 ring-1 ring-gray-200";
          return (
            <button
              key={c.v}
              type="button"
              onClick={() => setPick(c.v)}
              aria-pressed={pick === c.v}
              className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${tone}`}
            >
              {c.v}%
            </button>
          );
        })}
      </div>

      {pick !== null && (
        <div className="mt-3 space-y-2" data-testid="meaning-answer">
          {!correct && <p className="text-xs font-bold text-rose-600">❌ {MEANING_CHOICES.find((c) => c.v === pick)?.why}</p>}
          <div className={`rounded-xl bg-gray-50 px-4 py-3 text-center ring-1 ring-gray-200 ${styles.reveal}`}>
            <div className="text-xs text-gray-500">
              稼働率 ＝ <b className="text-emerald-700">動いていた時間</b> ÷ <b className="text-gray-700">全体の時間</b>
            </div>
            <div className="mt-1 text-sm text-gray-700">
              ＝ <b className="text-emerald-700">90</b> ÷ <b className="text-gray-700">100</b>
            </div>
            <div className="mt-0.5 text-2xl font-bold text-brand-600">0.9（90%）</div>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
            💡 <b>稼働率＝動いていた時間の割合</b>。帯のうち<b>緑が占める割合</b>です。
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② MTBF / MTTR という名前を付ける
// ---------------------------------------------------------------------------

const NAMING_TOTAL = 120; // 90h 稼働 → 10h 修理 → 20h また稼働（帯の右端は「続き」）
// 実時間の配分：稼働はさっと、修理はゆっくり見せる
const LEGS: { to: number; ms: number }[] = [
  { to: RUN, ms: 2400 },
  { to: RUN + FIX, ms: 1800 },
  { to: NAMING_TOTAL, ms: 1400 },
];

function hourAt(elapsed: number) {
  let from = 0;
  let t = elapsed;
  for (const leg of LEGS) {
    if (t <= leg.ms) return from + ((leg.to - from) * t) / leg.ms;
    t -= leg.ms;
    from = leg.to;
  }
  return NAMING_TOTAL;
}

const PHASES = [
  { key: "run", label: "🟩 正常稼働" },
  { key: "fail", label: "⚡ 故障" },
  { key: "fix", label: "🔧 修理" },
  { key: "back", label: "✅ 復旧" },
  { key: "again", label: "🟩 正常稼働" },
] as const;

function phaseIndex(h: number) {
  if (h < RUN - 0.5) return 0;
  if (h < RUN + 1.5) return 1;
  if (h < RUN + FIX - 0.5) return 2;
  if (h < RUN + FIX + 2) return 3;
  return 4;
}

export function NamingStage() {
  const reducedMotion = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hour, setHour] = useState(0);
  const [runId, setRunId] = useState(0);
  const started = useRef(false);
  const done = reducedMotion || hour >= NAMING_TOTAL;

  // 初めて見えたときに1回だけ自動で進める（↺ で再生し直し）
  useEffect(() => {
    if (inView && !started.current) {
      started.current = true;
      setRunId((n) => n + 1);
    }
  }, [inView]);

  useEffect(() => {
    if (runId === 0 || reducedMotion) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const h = hourAt(now - t0);
      setHour(h);
      if (h < NAMING_TOTAL) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runId, reducedMotion]);

  const h = reducedMotion ? NAMING_TOTAL : hour;
  const phase = phaseIndex(h);
  const pct = (x: number) => `${(x / NAMING_TOTAL) * 100}%`;

  return (
    <Panel>
      <SectionTitle step={2}>「動いている時間」と「修理の時間」に名前を付ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">同じ機械の時間を、もう少し先まで見てみよう。</p>

      <div ref={ref} className="mt-3" data-testid="naming-stage" data-done={done ? "true" : "false"}>
        {/* 流れのチップ：針が通過したところが点灯する */}
        <ol className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[10.5px] font-bold" aria-label="故障と修理の流れ">
          {PHASES.map((p, i) => (
            <li key={i} className="flex items-center gap-0.5">
              {i > 0 && <span className="text-gray-300">→</span>}
              <span
                className={`rounded-full px-1.5 py-0.5 transition-colors ${
                  i === phase
                    ? p.key === "fail" || p.key === "fix"
                      ? "bg-rose-500 text-white"
                      : "bg-emerald-500 text-white"
                    : i < phase
                      ? "bg-gray-200 text-gray-600"
                      : "bg-gray-50 text-gray-300 ring-1 ring-gray-200"
                }`}
                aria-current={i === phase ? "step" : undefined}
              >
                {p.label}
              </span>
            </li>
          ))}
        </ol>

        {/* 名札（上）＝ MTBF */}
        <div className="relative mt-3 h-10">
          <div
            className={`absolute bottom-0 flex flex-col items-center transition-all duration-500 ${done ? "opacity-100" : "translate-y-1 opacity-0"}`}
            style={{ left: 0, width: pct(RUN) }}
            data-testid="tag-mtbf"
            aria-hidden={!done}
          >
            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">MTBF ＝ 故障せず動いている時間</span>
            <span className="mt-0.5 h-1.5 w-full border-x-2 border-t-2 border-emerald-500" />
          </div>
        </div>

        <TimeBar
          total={NAMING_TOTAL}
          parts={[
            { kind: "up", hours: RUN, label: "動いている 90h" },
            { kind: "down", hours: FIX, label: "🔧" },
            { kind: "tail", hours: NAMING_TOTAL - RUN - FIX, label: "また…" },
          ]}
        >
          {/* まだ来ていない時間は薄いカバーで隠す */}
          <div className="absolute inset-y-0 right-0 bg-white/70" style={{ left: pct(h) }} />
          {!done && <div className="absolute inset-y-0 w-0.5 bg-gray-900" style={{ left: pct(h) }} />}
          {h >= RUN - 0.5 && (
            <span className={`absolute -top-0.5 -translate-x-1/2 text-sm ${styles.pop}`} style={{ left: pct(RUN) }} aria-hidden>
              ⚡
            </span>
          )}
        </TimeBar>

        {/* 名札（下）＝ MTTR */}
        <div className="relative h-12">
          <div
            className={`absolute top-0 transition-all duration-500 ${done ? "opacity-100" : "-translate-y-1 opacity-0"}`}
            style={{ left: pct(RUN), width: pct(FIX) }}
            data-testid="tag-mttr"
            aria-hidden={!done}
          >
            <span className="block h-1.5 w-full border-x-2 border-b-2 border-rose-500" />
          </div>
          <span
            className={`absolute top-2.5 -translate-x-full whitespace-nowrap rounded bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}
            style={{ left: pct(RUN + FIX) }}
            aria-hidden={!done}
          >
            MTTR ＝ 故障 → 復旧までの時間
          </span>
        </div>

        <div className={`grid grid-cols-2 gap-1.5 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`} aria-hidden={!done}>
          <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] leading-snug text-emerald-900 ring-1 ring-emerald-200">
            MT<b className="text-base">B</b>F の <b>B＝Between</b>
            <br />
            故障と故障の<b>“間”</b>＝動いている
          </div>
          <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] leading-snug text-rose-900 ring-1 ring-rose-200">
            MTT<b className="text-base">R</b> の <b>R＝Repair</b>
            <br />
            <b>修理</b>にかかる時間
          </div>
        </div>
        <p className={`mt-2 text-[11px] text-gray-500 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`} aria-hidden={!done}>
          ※ 故障と修理は何回もくり返すので、その<b>平均（Mean）</b>を使います。MT＝Mean Time（平均時間）。
        </p>

        {!reducedMotion && (
          <button
            type="button"
            onClick={() => {
              setHour(0);
              setRunId((n) => n + 1);
            }}
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
          >
            ↺ もう一度見る
          </button>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 公式を導出する
// ---------------------------------------------------------------------------

const DERIVE_STEPS = 4;
const DERIVE_MS = 2300;

function Tok({ tone, children, flip }: { tone: "up" | "down" | "all"; children: ReactNode; flip?: string }) {
  const color =
    tone === "up"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
      : tone === "down"
        ? "bg-rose-100 text-rose-800 ring-rose-300"
        : "bg-gray-100 text-gray-700 ring-gray-300";
  return (
    // key を変えて付け替えると、ラベルがくるっと置き換わる
    <span key={flip} className={`mx-0.5 inline-block rounded px-1 py-0.5 font-bold ring-1 ${color} ${flip ? styles.flip : ""}`}>
      {children}
    </span>
  );
}

export function DerivationStage() {
  const reducedMotion = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const s = reducedMotion ? DERIVE_STEPS - 1 : step;
  const named = s >= 3;

  useEffect(() => {
    if (inView && !started.current) {
      started.current = true;
      setPlaying(true);
    }
  }, [inView]);

  useEffect(() => {
    if (!playing || reducedMotion || step >= DERIVE_STEPS - 1) return;
    const t = window.setTimeout(() => {
      setStep(step + 1);
      if (step + 1 >= DERIVE_STEPS - 1) setPlaying(false);
    }, DERIVE_MS);
    return () => window.clearTimeout(t);
  }, [playing, step, reducedMotion]);

  const up = named ? "MTBF" : "動いていた時間";
  const down = named ? "MTTR" : "修理していた時間";
  const flipKey = named ? "named" : "plain";

  return (
    <Panel>
      <SectionTitle step={3}>公式を組み立てる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ①の「動いていた時間 ÷ 全体の時間」を、②の名前に置き換えていくと…
      </p>

      <div ref={ref} className="mt-3" data-testid="derivation" data-step={s}>
        <TimeBar
          total={100}
          parts={[
            { kind: "up", hours: RUN, label: <span key={flipKey} className={styles.flip}>{named ? "MTBF 90h" : "動いていた 90h"}</span> },
            { kind: "down", hours: FIX, label: <span key={flipKey} className={styles.flip}>🔧</span> },
          ]}
        />
        <Bracket from={0} to={100} total={100} tone={s >= 1 ? "border-brand-500" : "border-gray-400"}>
          {s >= 1 ? (
            <span className="text-brand-700">
              全体 ＝ <span className="text-emerald-700">{named ? "MTBF" : "動いていた"}</span> ＋ <span className="text-rose-700">{named ? "MTTR" : "修理していた"}</span>
            </span>
          ) : (
            <span className="text-gray-600">全体の時間 100h</span>
          )}
        </Bracket>

        <div className="mt-2 space-y-1.5 text-center text-[12.5px] leading-relaxed text-gray-700">
          <div className="rounded-lg bg-gray-50 px-2 py-2 ring-1 ring-gray-200" data-testid="derive-line-1">
            稼働率 ＝ <Tok tone="up">動いていた時間</Tok> ÷ <Tok tone="all">全体の時間</Tok>
          </div>

          {s >= 1 && (
            <div className={styles.reveal}>
              <div className="text-[11px] font-bold text-brand-700">↓ 全体の時間 ＝ 動いていた ＋ 修理していた</div>
              <div className="mt-1 rounded-lg bg-gray-50 px-2 py-2 ring-1 ring-gray-200" data-testid="derive-line-2">
                稼働率 ＝ <Tok tone="up">動いていた時間</Tok> ÷（<Tok tone="up">動いていた時間</Tok>＋<Tok tone="down">修理していた時間</Tok>）
              </div>
            </div>
          )}

          {s >= 2 && (
            <div className={styles.reveal}>
              <div className="text-[11px] font-bold text-brand-700">↓ ②で付けた名前に置き換えると</div>
              <div
                className={`mt-1 rounded-lg px-2 py-2 ring-2 transition-colors ${named ? "bg-brand-50 ring-brand-400" : "bg-gray-50 ring-gray-200"}`}
                data-testid="derive-line-3"
              >
                稼働率 ＝ <Tok tone="up" flip={flipKey}>{up}</Tok> ÷（<Tok tone="up" flip={flipKey}>{up}</Tok>＋<Tok tone="down" flip={flipKey}>{down}</Tok>）
              </div>
            </div>
          )}
        </div>

        {named && (
          <div className={`mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200 ${styles.reveal}`}>
            💡 <b>分子＝緑（MTBF）だけ</b>、<b>分母＝緑＋赤（1サイクル全部）</b>。
            だから MTBF が上、MTBF＋MTTR が下になります。
          </div>
        )}

        {!reducedMotion && (
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
          >
            ↺ もう一度組み立てる
          </button>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 1問だけ基本計算
// ---------------------------------------------------------------------------

const CALC_CHOICES = [
  { v: "0.1（10%）", ok: false, why: "それは修理で止まっていた割合（MTTR ÷ 全体）です。" },
  { v: "0.9（90%）", ok: true, why: "" },
  { v: "0.99（99%）", ok: false, why: "99%になるのは、修理がもっとずっと短いときです。" },
];

export function BasicCalcStage() {
  const [pick, setPick] = useState<number | null>(null);
  const chosen = pick === null ? null : CALC_CHOICES[pick];
  return (
    <Panel>
      <SectionTitle step={5}>1問だけ：基本の計算</SectionTitle>
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 ring-1 ring-gray-200">
        MTBF ＝ <span className="text-emerald-700">90時間</span>、MTTR ＝ <span className="text-rose-700">10時間</span>
        のとき、稼働率は？
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {CALC_CHOICES.map((c, i) => {
          const tone =
            pick === null
              ? "bg-white text-gray-700 ring-1 ring-gray-300"
              : pick === i
                ? c.ok
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white"
                : c.ok
                  ? "bg-white text-emerald-700 ring-2 ring-emerald-400"
                  : "bg-white text-gray-400 ring-1 ring-gray-200";
          return (
            <button
              key={c.v}
              type="button"
              onClick={() => setPick(i)}
              aria-pressed={pick === i}
              className={`rounded-lg px-1 py-2 text-xs font-bold transition active:scale-95 ${tone}`}
            >
              {c.v}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div className="mt-3 space-y-2" data-testid="calc-answer">
          <p className={`text-xs font-bold ${chosen.ok ? "text-emerald-700" : "text-rose-600"}`}>
            {chosen.ok ? "⭕ 正解！" : `❌ ${chosen.why}`}
          </p>
          <TimeBar
            total={100}
            parts={[
              { kind: "up", hours: RUN, label: "MTBF 90h" },
              { kind: "down", hours: FIX, label: "🔧" },
            ]}
          />
          <div className={`rounded-xl bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-700 ring-1 ring-gray-200 ${styles.reveal}`}>
            <div>
              稼働率 ＝ <b className="text-emerald-700">動いていた時間</b> ÷ 全体の時間
            </div>
            <div>
              　　 ＝ <b className="text-emerald-700">MTBF</b> ÷（<b className="text-emerald-700">MTBF</b> ＋ <b className="text-rose-700">MTTR</b>）
            </div>
            <div>
              　　 ＝ <b className="text-emerald-700">90</b> ÷（<b className="text-emerald-700">90</b> ＋ <b className="text-rose-700">10</b>）＝ 90 ÷ 100
            </div>
            <div>
              　　 ＝ <b className="text-lg text-brand-600">0.9（90%）</b>
            </div>
          </div>
          <p className="text-xs text-gray-500">公式を忘れても「動いていた時間 ÷ 全体」から組み立て直せます。</p>
        </div>
      )}
    </Panel>
  );
}
