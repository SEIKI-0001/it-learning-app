"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../scene/useReducedMotion";
import styles from "./devprocess.module.css";

// 同じプロジェクトを、同じ時間軸（週）の上でウォーターフォールとアジャイルの2本で進める。
// 5.5週目に同じ「⚡仕様変更」が入ると——
//   WF    … 現在地（製造）から要件定義まで大きく戻る弧が描かれ、完成済みの設計・作りかけの製造が
//           赤く「やり直し」になり、その後ろにやり直しのブロックが並ぶ。反映は14週目。
//   Agile … 変更は次のスプリント(S4)へ小さく取り込まれるだけ。反映は8週目（S4のレビュー）。
// 「戻る距離（弧の長さ）」「作り直す量（赤い面積）」「反映までの時間（下の括弧）」を同じ画面で比べる。

export const END = 14.5;
const AXIS = 15;
export const CHANGE_AT = 5.5;
export const AGILE_REFLECT = 8;
export const WF_REFLECT = 14;
const WEEK_MS = 450;
const HOLD_MS = 1400;

type Block = { s: number; e: number; label: string; kind: "plan" | "waste" | "redo" | "change" };

const WF: Block[] = [
  { s: 0, e: 2, label: "要件定義", kind: "plan" },
  { s: 2, e: 4, label: "設計", kind: "waste" },
  { s: 4, e: 5.5, label: "製造", kind: "waste" },
  { s: 5.5, e: 6.5, label: "要件", kind: "redo" },
  { s: 6.5, e: 8.5, label: "設計", kind: "redo" },
  { s: 8.5, e: 12, label: "製造", kind: "redo" },
  { s: 12, e: 14, label: "テスト", kind: "plan" },
];

const AGILE: Block[] = [
  { s: 0, e: 2, label: "S1", kind: "plan" },
  { s: 2, e: 4, label: "S2", kind: "plan" },
  { s: 4, e: 6, label: "S3", kind: "plan" },
  { s: 6, e: 8, label: "S4 ⚡", kind: "change" },
  { s: 8, e: 10, label: "S5", kind: "plan" },
];

const x = (t: number) => `${(t / AXIS) * 100}%`;

function Track({ blocks, t, reviews }: { blocks: Block[]; t: number; reviews?: boolean }) {
  const changed = t >= CHANGE_AT;
  return (
    <div className="relative h-9 rounded-md bg-white ring-1 ring-gray-200">
      {blocks.map((b, i) => {
        if (t <= b.s) return null;
        const p = Math.min(1, (t - b.s) / (b.e - b.s));
        const tone =
          b.kind === "redo"
            ? "bg-rose-100 text-rose-800 ring-rose-300"
            : b.kind === "change"
              ? "bg-emerald-200 text-emerald-900 ring-emerald-400"
              : "bg-brand-100 text-brand-800 ring-brand-200";
        return (
          <div key={i} className="absolute inset-y-1" style={{ left: x(b.s), width: x(b.e - b.s) }} data-testid={`dev-block-${b.kind}`}>
            <div className={`relative h-full overflow-hidden rounded-[4px] ring-1 ${tone}`} style={{ width: `${p * 100}%` }}>
              {/* 変更が入った瞬間、ここまでの成果物が「やり直し」に変わる */}
              {b.kind === "waste" && <div className={`absolute inset-0 ${styles.waste} ${changed ? styles.wasteOn : ""}`} />}
              <span className="absolute inset-0 grid place-items-center whitespace-nowrap text-[10px] font-bold leading-none">{b.label}</span>
            </div>
            {reviews && p >= 1 && (
              <span className="absolute -right-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-amber-400 ring-1 ring-white" title="レビュー" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// 「戻る」「取り込む」の弧（トラックの上に描く）
function Arc({ from, to, height, on, tone, label, testId }: { from: number; to: number; height: number; on: boolean; tone: string; label: string; testId: string }) {
  const x1 = (from / AXIS) * 300;
  const x2 = (to / AXIS) * 300;
  const mid = (x1 + x2) / 2;
  return (
    <div className="relative h-7" data-testid={testId} data-on={on ? "true" : "false"}>
      <svg viewBox="0 0 300 28" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <path
          d={`M${x1},26 Q${mid},${26 - height} ${x2},26`}
          fill="none"
          stroke={tone}
          strokeWidth={2.2}
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          className={`${styles.arc} ${on ? styles.arcOn : ""}`}
        />
      </svg>
      {on && (
        <span
          className={`absolute top-1 ml-1.5 whitespace-nowrap rounded px-1 text-[10px] font-bold text-white ${styles.pop}`}
          style={{ left: x(Math.max(from, to)), background: tone }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// 変更発生から反映までの括弧
function Span({ to, t, tone, testId }: { to: number; t: number; tone: string; testId: string }) {
  if (t < CHANGE_AT) return <div className="h-5" />;
  const end = Math.min(t, to);
  const done = t >= to;
  const weeks = to - CHANGE_AT;
  return (
    <div className="relative h-5" data-testid={testId} data-done={done ? "true" : "false"}>
      <div className="absolute top-1.5 h-2 border-x-2 border-b-2" style={{ left: x(CHANGE_AT), width: x(end - CHANGE_AT), borderColor: tone }} />
      {done && (
        <span className={`absolute top-0 whitespace-nowrap rounded bg-white px-1 text-[10px] font-bold ${styles.pop}`} style={{ left: x(to), transform: "translateX(-100%)", color: tone }}>
          ✅ 反映まで{weeks}週
        </span>
      )}
    </div>
  );
}

function caption(t: number) {
  if (t < 2) return { wf: "📝 最初に作るものを全部決める", ag: "🔁 S1：一番大事な機能だけ作って見せる" };
  if (t < CHANGE_AT) return { wf: "📐🔨 計画どおり、設計→製造と順番に下る", ag: "🔁 2週ごとに「作る→見せる→直す」" };
  if (t < 6.5) return { wf: "⚡ 変更！ 要件定義まで戻る。設計と作りかけの製造はやり直し", ag: "⚡ 変更！ 次のスプリント（S4）の計画に入れるだけ" };
  if (t < AGILE_REFLECT) return { wf: "↩️ 要件・設計をもう一度…", ag: "🔨 S4で変更を作り、レビューで見せる" };
  if (t < WF_REFLECT) return { wf: "⏳ まだやり直し中。変更はお客様に届いていない", ag: "✅ S4のレビューで変更がもう届いている" };
  return { wf: "🏁 やっと反映。計画は立てやすいが、途中の変更に弱い", ag: "🏁 変更に強い。ただし全体像は見えにくいことも" };
}

const MOMENTS = [
  { t: 0, label: "開始" },
  { t: 6, label: "⚡変更" },
  { t: AGILE_REFLECT, label: "アジャイル反映" },
  { t: END, label: "WF反映" },
];

export function DevRace() {
  const reducedMotion = useReducedMotion();
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [touched, setTouched] = useState(false);
  const held = useRef(false);

  // reduced-motion では、触るまでは最終状態（全体の比較）を見せる
  const shownT = reducedMotion && !touched ? END : t;

  // 再生中の現在週（rAF から読むので ref。表示は state の t）
  const clock = useRef(0);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    let holdUntil = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (now >= holdUntil) {
        const cur = clock.current;
        let next = cur + dt / WEEK_MS;
        // 変更が入った瞬間は少し止めて、戻る弧・赤いやり直しを見せる
        if (!held.current && cur < CHANGE_AT && next >= CHANGE_AT) {
          held.current = true;
          holdUntil = now + HOLD_MS;
          next = CHANGE_AT + 0.01;
        }
        if (next >= END) {
          clock.current = END;
          setT(END);
          setPlaying(false);
          return;
        }
        clock.current = next;
        setT(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reducedMotion]);

  function play() {
    setTouched(true);
    if (playing) {
      setPlaying(false);
      return;
    }
    const from = t >= END ? 0 : t;
    clock.current = from;
    setT(from);
    held.current = from >= CHANGE_AT;
    setPlaying(true);
  }

  function jump(to: number) {
    setTouched(true);
    setPlaying(false);
    held.current = to >= CHANGE_AT;
    clock.current = to;
    setT(to);
  }

  const changed = shownT >= CHANGE_AT;
  const cap = caption(shownT);
  const finished = shownT >= WF_REFLECT;

  return (
    <div className="mt-3" data-testid="dev-race" data-t={shownT.toFixed(1)}>
      <div className="relative rounded-xl bg-gray-50 px-2.5 pb-2 pt-2 ring-1 ring-gray-200">
        {/* 現在の週を示す縦線 */}
        <div className="pointer-events-none absolute inset-y-2 left-2.5 right-2.5">
          <div className="absolute inset-y-0 w-0.5 bg-gray-800/70" style={{ left: x(shownT) }} />
          {changed && (
            <div className="absolute inset-y-0 w-0 border-l-2 border-dashed border-amber-400" style={{ left: x(CHANGE_AT) }}>
              <span className="absolute -bottom-0.5 -translate-x-1/2 whitespace-nowrap text-[11px] leading-none" aria-hidden>⚡</span>
            </div>
          )}
        </div>

        <div className="relative">
          <div className="flex items-center justify-between text-xs font-bold text-sky-700">
            <span>🪜 ウォーターフォール</span>
          </div>
          <Arc from={CHANGE_AT} to={1} height={24} on={changed} tone="#e11d48" label="↩ 要件定義まで戻る" testId="dev-arc-wf" />
          <Track blocks={WF} t={shownT} />
          <Span to={WF_REFLECT} t={shownT} tone="#e11d48" testId="dev-span-wf" />

          <div className="mt-1 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>🔁 アジャイル（2週ごとのスプリント＋◆レビュー）</span>
          </div>
          <Arc from={CHANGE_AT} to={6.3} height={10} on={changed} tone="#059669" label="次のS4へ" testId="dev-arc-agile" />
          <Track blocks={AGILE} t={shownT} reviews />
          <Span to={AGILE_REFLECT} t={shownT} tone="#059669" testId="dev-span-agile" />

          <div className="relative mt-0.5 h-3 text-[10px] font-bold text-gray-400">
            {[0, 5, 10, 15].map((w) => (
              <span key={w} className={`absolute whitespace-nowrap ${w === 0 ? "" : w === AXIS ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: x(w) }}>
                {w}週
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 操作：再生・場面ジャンプ・つまみ */}
      <div className="mt-2 flex items-center gap-2">
        {!reducedMotion && (
          <button type="button" onClick={play} className="flex-none rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95">
            {playing ? "⏸ 止める" : shownT >= END ? "↺ もう一度" : "▶ 開発スタート"}
          </button>
        )}
        <input
          type="range"
          min={0}
          max={END}
          step={0.5}
          value={shownT}
          aria-label="経過週"
          onChange={(e) => jump(Number(e.target.value))}
          className="min-w-0 flex-1 accent-brand-600"
        />
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1">
        {MOMENTS.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => jump(m.t)}
            className={`rounded-md px-0.5 py-1 text-[10px] font-bold ring-1 active:scale-95 ${Math.abs(shownT - m.t) < 0.3 ? "bg-gray-800 text-white ring-gray-800" : "text-gray-600 ring-gray-300"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* いまの場面 */}
      <div className="mt-2 space-y-1 text-xs leading-relaxed" aria-live="polite" data-testid="dev-caption">
        <p className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sky-900 ring-1 ring-sky-200">
          <b>WF：</b>
          {cap.wf}
        </p>
        <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-900 ring-1 ring-emerald-200">
          <b>アジャイル：</b>
          {cap.ag}
        </p>
      </div>

      {/* 3つのものさしで比べる（反映し終わってから） */}
      {finished && (
        <table className={`mt-3 w-full overflow-hidden rounded-xl text-xs ring-1 ring-gray-200 ${styles.pop}`} data-testid="dev-metrics">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="px-2 py-1.5 text-left">変更が来たとき</th>
              <th className="px-2 py-1.5 text-sky-700">🪜 WF</th>
              <th className="px-2 py-1.5 text-emerald-700">🔁 アジャイル</th>
            </tr>
          </thead>
          <tbody className="text-center">
            <tr className="border-t border-gray-100">
              <td className="px-2 py-1.5 text-left font-bold text-gray-700">戻る距離</td>
              <td className="font-bold text-rose-700">製造→要件定義</td>
              <td className="font-bold text-emerald-700">戻らない</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="px-2 py-1.5 text-left font-bold text-gray-700">作り直す量</td>
              <td className="font-bold text-rose-700">約3.5週分</td>
              <td className="font-bold text-emerald-700">ほぼなし</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="px-2 py-1.5 text-left font-bold text-gray-700">反映までの時間</td>
              <td className="font-bold text-rose-700">{WF_REFLECT - CHANGE_AT}週</td>
              <td className="font-bold text-emerald-700">{AGILE_REFLECT - CHANGE_AT}週</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
