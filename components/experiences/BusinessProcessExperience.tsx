"use client";

import { useEffect, useState } from "react";
import { ProcessScene } from "./process/ProcessScene";
import { makespan, queueLengths, schedule, spotsAt } from "./process/processSim";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「業務プロセス改善」専用の体験。
//   ① 業務フローを見える化し、時間のかかる工程（ボトルネック）を見つける
//      受付→転記→承認→発送の机を書類が実際に流れ、遅い工程の前に書類が溜まる
//   ② 見つけた工程を改善 → 書類がスムーズに流れ、全体の時間が短くなるのを体感
//   ③ そのままシステム化の罠（まず見直す）クイズ
// ============================================================================

type Step = { name: string; emoji: string; base: number; improved: number; fix: string };

const STEPS: Step[] = [
  { name: "受付", emoji: "📥", base: 5, improved: 5, fix: "" },
  { name: "手書き転記", emoji: "✍️", base: 30, improved: 5, fix: "手入力をやめてデータ自動連携にする" },
  { name: "承認待ち", emoji: "⏳", base: 20, improved: 5, fix: "オンライン承認で待ち時間を減らす" },
  { name: "発送", emoji: "📦", base: 5, improved: 5, fix: "" },
];

const yen = (n: number) => `${n}分`;

const TICK_MS = 55;

function Flow() {
  const reducedMotion = useReducedMotion();
  const [fixed, setFixed] = useState<Set<number>>(new Set());
  const improvable = STEPS.map((s, i) => i).filter((i) => STEPS[i].base !== STEPS[i].improved);
  const times = STEPS.map((s, i) => (fixed.has(i) ? s.improved : s.base));
  const total = times.reduce((sum, t) => sum + t, 0);
  const baseTotal = STEPS.reduce((sum, s) => sum + s.base, 0);
  const maxBase = Math.max(...STEPS.map((s) => s.base));
  const allFixed = improvable.every((i) => fixed.has(i));

  const docs = schedule(times);
  const end = makespan(docs);
  // 書類の流れ（シミュレーション時刻）。reduced-motion では自動で進めず、スライダーで動かす。
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
  const bottleneck = queues.indexOf(Math.max(...queues));

  // reduced-motion では「書類が溜まっている途中（60分後）」を静止画で見せる
  const run = () => setClock(reducedMotion ? { t: 60, playing: false } : { t: 0, playing: true });

  const toggle = (i: number) => {
    if (STEPS[i].base === STEPS[i].improved) return; // 改善余地なし
    setFixed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    // 改善したら同じ6件をもう一度流して比べる
    setClock({ t: reducedMotion ? 60 : 0, playing: !reducedMotion });
  };

  return (
    <Panel>
      <SectionTitle step={1}>仕事の流れを「見える化」する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        注文を処理する流れです。注文書を流すと、<b className="text-gray-800">時間がかかる工程の前に書類が溜まります</b>。
        そこが改善のねらい目（ボトルネック）。
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <ProcessScene
          stations={STEPS.map((s, i) => ({
            name: s.name,
            emoji: s.emoji,
            minutes: times[i],
            improved: fixed.has(i),
            slow: s.base !== s.improved && !fixed.has(i),
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
        <span className="w-14 flex-none text-right text-xs font-bold tabular-nums text-gray-600" data-testid="sim-time">
          {t}分
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500" aria-live="polite" data-testid="sim-note">
        {queues[bottleneck] > 0
          ? `📄 いま「${STEPS[bottleneck].name}」の前に${queues[bottleneck]}件が溜まっている → ここがボトルネック`
          : t >= end
            ? `✅ 6件すべて発送まで ${end}分`
            : "書類がどこで溜まるかを見てみよう（10分ごとに1件届く）"}
      </p>
      {reducedMotion && (
        <p className="mt-1 text-[10px] text-gray-500">
          端末の「視差効果を減らす」設定に合わせ、自動再生は停止しています。スライダーで時間を進められます。
        </p>
      )}

      <p className="mt-4 text-xs font-bold text-gray-600">工程ごとの時間（オレンジをタップして直す）</p>
      <div className="mt-2 space-y-2">
        {STEPS.map((s, i) => {
          const cur = times[i];
          const canFix = s.base !== s.improved;
          const isFixed = fixed.has(i);
          const pct = (cur / maxBase) * 100;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggle(i)}
              disabled={!canFix}
              aria-pressed={canFix ? isFixed : undefined}
              className={`block w-full rounded-xl p-2.5 text-left ring-1 transition active:scale-[0.99] ${
                canFix
                  ? isFixed
                    ? "bg-emerald-50 ring-emerald-200"
                    : "bg-amber-50 ring-amber-300"
                  : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">
                  {s.emoji} {s.name}
                  {canFix && !isFixed && <span className="ml-1.5 text-amber-600">← 時間がかかる</span>}
                  {isFixed && <span className="ml-1.5 text-emerald-600">✓ 改善した</span>}
                </span>
                <span className="text-gray-500">{yen(cur)}</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded bg-white/70">
                <div
                  className={`h-full transition-all ${isFixed ? "bg-emerald-400" : canFix ? "bg-amber-400" : "bg-gray-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {canFix && (
                <p className="mt-1 text-[11px] text-gray-500">{isFixed ? `✅ ${s.fix}` : `改善案：${s.fix}`}</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200" data-testid="lead-time">
        <span className="text-sm font-bold text-gray-600">1件にかかる合計時間</span>
        <span className="text-sm">
          <b className={total < baseTotal ? "text-emerald-600" : "text-gray-800"}>{yen(total)}</b>
          {total < baseTotal && <span className="ml-1 text-gray-400 line-through">{yen(baseTotal)}</span>}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="bp-insight">
        {allFixed ? (
          <>🎉 ボトルネック（手書き転記・承認待ち）を直して <b>{baseTotal}分 → {total}分</b> に短縮！書類も溜まらず流れます。これが業務プロセス改善です。</>
        ) : fixed.size > 0 ? (
          <>👀 1か所直すと、<b>次に遅い工程の前</b>に書類が溜まり始めます。流れ全体を見て、ボトルネックを順に直そう。</>
        ) : (
          <>💡 いきなりITを入れるのではなく、まず<b>どこで時間がかかるか・書類が溜まるか</b>を見つけ、その工程を直すのがコツ。</>
        )}
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
