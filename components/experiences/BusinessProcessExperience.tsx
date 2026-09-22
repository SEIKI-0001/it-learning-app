"use client";

import { useEffect, useState } from "react";
import { ProcessScene } from "./process/ProcessScene";
import { makespan, queueLengths, schedule, spotsAt } from "./process/processSim";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「業務プロセス改善」専用の体験。
//   ① 受付→転記→承認→発送の机（2.5D模型）に注文書を流す。上部の「改善前／改善後」で
//      同じ模型を切り替え、改善前は遅い工程（ボトルネック）の前に書類が山積みになり、
//      改善後は溜まらずに流れることを見比べる
//   ② そのままシステム化の罠（まず見直す）クイズ
// ============================================================================

type Step = { name: string; emoji: string; base: number; improved: number; fix: string };

const STEPS: Step[] = [
  { name: "受付", emoji: "📥", base: 5, improved: 5, fix: "" },
  { name: "手書き転記", emoji: "✍️", base: 30, improved: 5, fix: "手入力をやめてデータ自動連携にする" },
  { name: "承認待ち", emoji: "⏳", base: 20, improved: 5, fix: "オンライン承認で待ち時間を減らす" },
  { name: "発送", emoji: "📦", base: 5, improved: 5, fix: "" },
];

const BEFORE = STEPS.map((s) => s.base);
const AFTER = STEPS.map((s) => s.improved);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** 改善前でいちばん時間のかかる工程＝ボトルネック */
const BOTTLENECK = BEFORE.indexOf(Math.max(...BEFORE));

const TICK_MS = 55;
/** reduced-motion では「書類が溜まっている途中」を静止画で見せる */
const STILL_T = 60;

type Mode = "before" | "after";

const MODES: { id: Mode; label: string }[] = [
  { id: "before", label: "改善前" },
  { id: "after", label: "改善後" },
];

const DOCS: Record<Mode, ReturnType<typeof schedule>> = { before: schedule(BEFORE), after: schedule(AFTER) };
const END: Record<Mode, number> = { before: makespan(DOCS.before), after: makespan(DOCS.after) };
const MAX_MIN = Math.max(...BEFORE);

function Flow() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("before");
  const times = mode === "before" ? BEFORE : AFTER;
  const docs = DOCS[mode];
  const end = END[mode];
  const [clock, setClock] = useState({ t: 0, playing: false });
  const t = Math.min(clock.t, end);

  useEffect(() => {
    if (!clock.playing || reducedMotion) return;
    const timer = window.setInterval(() => {
      setClock((c) => (c.t >= end ? { t: end, playing: false } : { t: c.t + 1, playing: true }));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [clock.playing, end, reducedMotion]);

  const spots = spotsAt(docs, t);
  const queues = queueLengths(spots, STEPS.length);
  const busy = STEPS.map((_, i) => spots.some((s) => s.kind === "work" && s.station === i));
  const pile = queues[BOTTLENECK];

  const run = () => setClock(reducedMotion ? { t: STILL_T, playing: false } : { t: 0, playing: true });
  // 切り替えたら同じ6件を最初から流し直して見比べる
  const switchTo = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    run();
  };

  const note =
    mode === "before"
      ? pile > 0
        ? `🚨 「${STEPS[BOTTLENECK].name}」の前に${pile}件が渋滞中。1件${BEFORE[BOTTLENECK]}分かかるので、10分ごとに届く書類をさばけない → ここがボトルネック`
        : t >= end
          ? `⌛ 6件すべて発送まで ${end}分。「改善後」に切り替えて比べてみよう`
          : `🚨 ボトルネックは「${STEPS[BOTTLENECK].name}」（1件${BEFORE[BOTTLENECK]}分）。流すとこの前に書類が溜まっていく`
      : t >= end
        ? `✅ 6件すべて発送まで ${end}分（改善前は ${END.before}分）`
        : "✅ 転記と承認を直したので、どの机の前にも書類が溜まらない";

  return (
    <Panel>
      <SectionTitle step={1}>仕事の流れを「見える化」する</SectionTitle>
      <div
        role="radiogroup"
        aria-label="改善前と改善後の切り替え"
        className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-gray-100 p-1"
        data-testid="bp-mode"
      >
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => switchTo(m.id)}
              className={`rounded-full py-2 text-sm font-bold transition active:scale-95 ${
                on
                  ? m.id === "before"
                    ? "bg-rose-600 text-white shadow"
                    : "bg-emerald-600 text-white shadow"
                  : "text-gray-500"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        注文書が<b className="text-gray-800">10分ごとに1件</b>届きます。
        {mode === "before" ? (
          <>流すと、<b className="text-gray-800">時間がかかる工程の前に書類が溜まります</b>。そこが改善のねらい目（ボトルネック）。</>
        ) : (
          <>手書き転記を<b className="text-gray-800">データ自動連携</b>に、承認を<b className="text-gray-800">オンライン承認</b>に変えた流れです。</>
        )}
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl" data-testid="bp-scene" data-mode={mode}>
        <ProcessScene
          stations={STEPS.map((s, i) => ({
            name: s.name,
            emoji: s.emoji,
            minutes: times[i],
            improved: mode === "after" && s.base !== s.improved,
            slow: mode === "before" && s.base !== s.improved,
            queue: queues[i],
            busy: busy[i],
          }))}
          docs={spots}
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          className="flex-none rounded-full bg-gray-900 px-3.5 py-2 text-xs font-bold text-white transition active:scale-95"
        >
          {t >= end ? "▶ もう一度流す" : clock.playing ? "流しています…" : "▶ 注文を6件流す"}
        </button>
        <input
          type="range"
          min={0}
          max={end}
          step={1}
          value={t}
          onChange={(e) => setClock({ t: Number(e.target.value), playing: false })}
          className="min-w-0 flex-1 accent-brand-600"
          aria-label="経過時間"
          aria-valuetext={`${t}分経過`}
        />
        <span className="w-12 flex-none text-right text-xs font-bold tabular-nums text-gray-600" data-testid="sim-time">
          {t}分
        </span>
      </div>
      <p
        className={`mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${
          mode === "before"
            ? pile > 0
              ? "bg-rose-600 font-bold text-white"
              : "bg-rose-50 text-rose-800"
            : "bg-emerald-50 text-emerald-800"
        }`}
        aria-live="polite"
        data-testid="sim-note"
      >
        {note}
      </p>
      {reducedMotion && (
        <p className="mt-1.5 text-[10px] text-gray-500">
          端末の「視差効果を減らす」設定に合わせ、自動再生は停止しています。スライダーで時間を進められます。
        </p>
      )}

      <p className="mt-4 text-xs font-bold text-gray-600">工程ごとの時間（{mode === "before" ? "改善前" : "改善後"}）</p>
      <div className="mt-2 space-y-2" data-testid="bp-steps">
        {STEPS.map((s, i) => {
          const canFix = s.base !== s.improved;
          const slow = mode === "before" && canFix;
          const fixed = mode === "after" && canFix;
          return (
            <div
              key={s.name}
              className={`rounded-xl p-2.5 ring-1 ${
                slow ? "bg-amber-50 ring-amber-300" : fixed ? "bg-emerald-50 ring-emerald-200" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">
                  {s.emoji} {s.name}
                  {slow && <span className="ml-1.5 text-amber-600">← 時間がかかる</span>}
                  {fixed && <span className="ml-1.5 text-emerald-600">✓ 改善</span>}
                </span>
                <span className="text-gray-500">
                  {fixed && <span className="mr-1 text-gray-400 line-through">{s.base}分</span>}
                  {times[i]}分
                </span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded bg-white/70">
                <div
                  className={`h-full transition-all duration-500 ${fixed ? "bg-emerald-400" : slow ? "bg-amber-400" : "bg-gray-300"}`}
                  style={{ width: `${(times[i] / MAX_MIN) * 100}%` }}
                />
              </div>
              {canFix && <p className="mt-1 text-[11px] text-gray-500">{fixed ? `✅ ${s.fix}` : `改善案：${s.fix}`}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-gray-200" data-testid="lead-time">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              <th className="px-2.5 py-1.5 text-left font-bold"> </th>
              <th className={`px-2 py-1.5 font-bold text-rose-700 ${mode === "before" ? "bg-rose-50" : ""}`}>改善前</th>
              <th className={`px-2 py-1.5 font-bold text-emerald-700 ${mode === "after" ? "bg-emerald-50" : ""}`}>改善後</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="px-2.5 py-1.5 font-bold text-gray-700">1件にかかる合計</td>
              <td className={`px-2 py-1.5 text-center font-bold text-rose-700 ${mode === "before" ? "bg-rose-50" : ""}`}>{sum(BEFORE)}分</td>
              <td className={`px-2 py-1.5 text-center font-bold text-emerald-700 ${mode === "after" ? "bg-emerald-50" : ""}`}>{sum(AFTER)}分</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="px-2.5 py-1.5 font-bold text-gray-700">6件すべて終わるまで</td>
              <td className={`px-2 py-1.5 text-center font-bold text-rose-700 ${mode === "before" ? "bg-rose-50" : ""}`}>{END.before}分</td>
              <td className={`px-2 py-1.5 text-center font-bold text-emerald-700 ${mode === "after" ? "bg-emerald-50" : ""}`}>{END.after}分</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="bp-insight">
        💡 いきなりITを入れるのではなく、まず<b>どこで書類が溜まるか（ボトルネック）</b>を見える化し、その工程を直す。
        手書き転記と承認待ちを直すと <b>1件 {sum(BEFORE)}分 → {sum(AFTER)}分</b>、6件なら <b>{END.before}分 → {END.after}分</b>。これが業務プロセス改善です。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "今のムダな手作業をそのままシステム化する", ok: false, why: "ムダごとIT化すると非効率が固定される。まず流れを見直す。" },
  { t: "どこで時間やミスが起きるかを先に調べる", ok: true, why: "見える化して問題を見つけるのが第一歩。" },
  { t: "手順を見直してから、必要な所だけIT化する", ok: true, why: "改善が先、IT化は手段。正しい順番。" },
  { t: "改善は現場の根性だけに任せる", ok: false, why: "仕組み・流れの見直しが必要。根性論では続かない。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>改善の進め方として正しい？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "⭕ 正しい" },
                  { v: false, label: "🙅 ちがう" },
                ].map((opt) => {
                  const picked = chosen === opt.v;
                  const tone = !answered
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 業務の流れを根本から見直すのが <b>BPR</b>、継続的に管理・改善するのが <b>BPM</b>。
      </div>
    </Panel>
  );
}

export default function BusinessProcessExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔧 <b>業務プロセス改善</b>は、仕事の流れを<b>見える化</b>して、時間のかかる所やミスの起きる所を見つけ、
        手順の見直しやIT化でよくする活動です。
      </div>

      <Flow />
      <Quiz />
    </div>
  );
}
