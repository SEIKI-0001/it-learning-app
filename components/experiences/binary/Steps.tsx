"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "../calc/calc.module.css";
import { Choices, Replay, Term, type Choice } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { EIGHT_WEIGHTS, FOUR_WEIGHTS, LampButton, LampRow, bitsOf, valueOf } from "./Lamps";

// 2進数レッスンの中身（枠とステップ移動は BinaryExperience）。
//   1 0と1       ：ランプ1個は ON/OFF の2状態だけ
//   2 なぜ8・4・2・1：ランプで 0→8 と数える。新しいランプが初めて点く瞬間が 2・4・8（桁が2倍）
//   3 2進数→10進数：1101 の「1の桁」の重みが下へ集まって 8＋4＋1＝13。1011 で確認
//   4 10進数→2進数：9 を超えない一番大きい数字から選ぶ。9−8＝1 → 1 → 1001
//   5 本試験へ     ：1101＋1011 は 13＋11＝24（＝11000）。＋α で 1＋1＝10 の繰り上がり
//   6 8bit＝1Byte  ：通信速度の Byte→bit 変換へつなぐ

// ---------------------------------------------------------------------------
// 1 0と1
// ---------------------------------------------------------------------------

export function ZeroOneStep({ onReady }: { onReady: () => void }) {
  const [on, setOn] = useState(false);
  const [seenOn, setSeenOn] = useState(false);
  return (
    <>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        コンピュータの中にある1つのスイッチは、<b className="text-slate-900">ON か OFF の2つの状態</b>しか持てません。ランプをタップしてみよう。
      </p>
      <div className="mt-4 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => {
            setOn(!on);
            if (!on) {
              setSeenOn(true);
              onReady();
            }
          }}
          aria-label={on ? "ランプを消す" : "ランプをつける"}
          aria-pressed={on}
          className={`grid h-24 w-24 place-items-center rounded-2xl border-2 text-5xl transition active:scale-95 ${
            on ? "border-amber-400 bg-amber-100 shadow" : "border-slate-200 bg-slate-50"
          }`}
        >
          <span aria-hidden>{on ? "💡" : "⚫"}</span>
        </button>
        <div className="text-center" aria-live="polite">
          <div className="text-xs font-bold text-slate-500">{on ? "ON" : "OFF"}</div>
          <div key={on ? "1" : "0"} className={`font-mono text-5xl font-bold text-brand-700 ${styles.flip}`} data-testid="binary-zero-one">
            {on ? 1 : 0}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm font-bold">
        <div className="rounded-lg bg-slate-50 py-2 text-slate-600 ring-1 ring-slate-200">OFF ＝ 0</div>
        <div className="rounded-lg bg-amber-50 py-2 text-amber-900 ring-1 ring-amber-200">ON ＝ 1</div>
      </div>
      {seenOn && (
        <p className={`mt-3 rounded-xl bg-brand-50 px-3 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-100 ${styles.reveal}`}>
          1つのランプで表せるのは <b>0 と 1 の2通りだけ</b>。もっと大きな数は、<b>ランプを並べて</b>表します。
        </p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 2 なぜ 8・4・2・1 なのか
// ---------------------------------------------------------------------------

// beat n（0〜8）＝ いま n を表している。beat 9 ＝ まとめ。新しいランプが点く 2・4・8 の直後は長めに止まる
const COUNT_DELAYS = [800, 800, 2000, 800, 2000, 800, 800, 800, 2000];
const COUNT_LAST = 9;

const DISCOVERY: Record<number, string> = {
  1: "右端のランプ1個では 1 まで。",
  2: "右端だけでは 2 が作れない → 左のランプへ繰り上がる。このランプは 2。",
  4: "2個では 3（2＋1）まで → 次のランプへ。このランプは 4。",
  8: "3個では 7（4＋2＋1）まで → 次のランプへ。このランプは 8。",
};

export function WeightsStep() {
  const { ref, beat, reducedMotion, replay } = useBeats(COUNT_LAST + 1, COUNT_DELAYS);
  const n = Math.min(beat, 8);
  const bits = bitsOf(n, FOUR_WEIGHTS);
  const known = FOUR_WEIGHTS.map((w) => (n >= w ? w : null));
  const key = n >= 8 ? 8 : n >= 4 ? 4 : n >= 2 ? 2 : n >= 1 ? 1 : 0;
  const summary = beat >= COUNT_LAST;

  return (
    <div ref={ref} data-testid="binary-weights" data-beat={beat}>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        ランプを4個並べて、<b className="text-slate-900">0から順に数えて</b>みます。ランプが初めて点いたとき、そのランプがいくつを表すかに注目。
      </p>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-xs font-bold text-slate-500">いま数えている数</span>
        <span key={n} className={`font-mono text-3xl font-bold text-brand-700 ${styles.pop}`}>
          {n}
        </span>
      </div>
      <div className="mt-2">
        <LampRow bits={bits} weights={known} highlight={(i) => FOUR_WEIGHTS[i] === n && n > 0} />
      </div>
      <p className="mt-2 min-h-10 text-center text-xs font-bold leading-relaxed text-amber-800">{!summary && key > 0 ? DISCOVERY[key] : " "}</p>

      {summary && (
        <div className={`space-y-2 ${styles.reveal}`}>
          <div className="flex items-center justify-center gap-1 font-mono text-lg font-bold" data-testid="binary-weight-cards">
            {FOUR_WEIGHTS.map((w, i) => (
              <span key={w} className="flex items-center gap-1">
                {i > 0 && <span className="text-[10px] text-slate-400">←×2</span>}
                <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-brand-700 ring-1 ring-brand-200">{w}</span>
              </span>
            ))}
          </div>
          <p className="text-center text-xs leading-relaxed text-slate-600" data-testid="binary-why-double">
            右端1個で <b>1</b> まで → 2個で <b>3</b> まで → 3個で <b>7</b> まで。
            <br />
            その次の数（2・4・8）で、新しいランプが点く。
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed">
            <div className="rounded-lg bg-slate-50 px-2 py-2 text-slate-600 ring-1 ring-slate-200">
              <b className="text-slate-800">10進数</b>は 0〜9 の10種類
              <br />
              桁は <b className="font-mono">1 → 10 → 100</b>（×10）
            </div>
            <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-900 ring-1 ring-amber-200">
              <b>2進数</b>は 0と1 の2種類
              <br />
              桁は <b className="font-mono">1 → 2 → 4 → 8 → 16</b>（×2）
            </div>
          </div>
          <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-center text-sm font-bold text-brand-900 ring-1 ring-brand-100">
            右端が1、次は2倍、さらに2倍。だから <span className="font-mono">8・4・2・1</span>。
          </p>
        </div>
      )}
      <Replay onClick={replay} hidden={reducedMotion} label="↺ もう一度数える" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3 2進数 → 10進数
// ---------------------------------------------------------------------------

const READ_DELAYS = [1100, 1300, 1500];
const READ_BITS = [true, true, false, true]; // 1101
const READ_CHECK: Choice[] = [
  { label: "11", ok: true },
  { label: "13", why: "1101 と同じにしていませんか？ 1011 で1になっているのは 8・2・1 の桁です。" },
  { label: "3", why: "1の個数を数えただけです。1の桁の重み（8・4・2・1）を足します。" },
];

export function ReadStep({ onReady }: { onReady: () => void }) {
  const { ref, beat, reducedMotion, replay } = useBeats(4, READ_DELAYS);
  const [checked, setChecked] = useState(false);
  const lit = beat >= 1;
  const parts = FOUR_WEIGHTS.filter((_, i) => READ_BITS[i]);

  return (
    <div ref={ref} data-testid="binary-read" data-beat={beat}>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        <b className="font-mono text-slate-900">1101</b> はいくつ？ 各桁の下に、さっきの <b className="font-mono">8・4・2・1</b> を置きます。
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {READ_BITS.map((on, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`grid h-11 w-full place-items-center rounded-xl font-mono text-2xl font-bold transition-colors ${
                lit && on ? "bg-amber-100 text-amber-950 ring-2 ring-amber-400" : lit ? "bg-slate-50 text-slate-300 ring-1 ring-slate-200" : "bg-white text-slate-800 ring-1 ring-slate-300"
              }`}
            >
              {on ? 1 : 0}
            </span>
            <span className={`font-mono text-sm font-bold ${lit && !on ? "text-slate-300 line-through" : "text-brand-700"}`}>{FOUR_WEIGHTS[i]}</span>
            {beat >= 2 && on && <span className={`text-xs text-brand-500 ${styles.reveal}`}>↓</span>}
          </div>
        ))}
      </div>
      {beat >= 2 && (
        <div className={`mt-1 rounded-xl bg-white px-3 py-2 text-center font-mono text-xl font-bold ring-1 ring-slate-200 ${styles.reveal}`}>
          {parts.map((p, i) => (
            <span key={p} className={styles.pop} style={{ animationDelay: `${i * 180}ms` }}>
              {i > 0 && " + "}
              {p}
            </span>
          ))}
          {beat >= 3 && (
            <span className={`text-brand-600 ${styles.pop}`} data-testid="binary-read-answer">
              {" "}
              ＝ 13
            </span>
          )}
        </div>
      )}
      {beat >= 3 && (
        <p className={`mt-2 text-center text-sm font-bold text-slate-700 ${styles.reveal}`}>1になっている桁の数字を足すだけ。</p>
      )}
      <Replay onClick={replay} hidden={reducedMotion} />

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
        <p className="text-sm font-bold text-slate-800">
          では <span className="font-mono">1011</span> は？
        </p>
        <div className="mt-2">
          <Choices
            choices={READ_CHECK}
            onAnswer={() => {
              setChecked(true);
              onReady();
            }}
            testId="binary-read-check"
          />
        </div>
        {checked && <p className={`mt-2 text-center font-mono text-sm font-bold text-slate-700 ${styles.reveal}`}>1011 → 8 + 2 + 1 ＝ 11</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4 10進数 → 2進数
// ---------------------------------------------------------------------------

const TARGET = 9;

export function WriteStep({ onReady }: { onReady: () => void }) {
  const [used, setUsed] = useState([false, false, false, false]);
  const [msg, setMsg] = useState<{ tone: "ok" | "ng"; text: string; key: number } | null>(null);
  const remaining = TARGET - valueOf(used, FOUR_WEIGHTS);
  const lastUsed = used.lastIndexOf(true);
  const done = remaining === 0;

  const tap = (i: number) => {
    if (used[i] || done) return;
    const w = FOUR_WEIGHTS[i];
    const expected = FOUR_WEIGHTS.findIndex((x, j) => !used[j] && x <= remaining);
    const k = (msg?.key ?? 0) + 1;
    if (w > remaining) {
      setMsg({ tone: "ng", text: `${w} は残りの ${remaining} より大きいので使えない → この桁は 0`, key: k });
    } else if (i !== expected) {
      setMsg({ tone: "ng", text: `もっと大きい数字から。${remaining} を超えない一番大きい数字は？`, key: k });
    } else {
      const next = used.map((u, j) => (j === i ? true : u));
      setUsed(next);
      setMsg({ tone: "ok", text: `${remaining} − ${w} ＝ ${remaining - w}`, key: k });
      if (remaining - w === 0) onReady();
    }
  };

  const digit = (i: number) => (used[i] ? "1" : done || i < lastUsed ? "0" : "?");

  return (
    <>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        今度は逆向き。<b className="text-slate-900">9</b> を2進数にします。やり方は1つだけ：
        <b className="text-slate-900">「残りを超えない一番大きい数字」から選ぶ</b>。
      </p>
      <div className="mt-3 flex items-baseline justify-between rounded-xl bg-sky-50 px-3 py-2 ring-1 ring-sky-200">
        <span className="text-xs font-bold text-sky-800">{done ? "完成！" : `${remaining} を超えない一番大きい数字は？`}</span>
        <span key={remaining} className={`font-mono text-2xl font-bold text-sky-900 ${styles.pop}`} data-testid="binary-remaining">
          残り {remaining}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {FOUR_WEIGHTS.map((w, i) => (
          <LampButton
            key={w}
            weight={w}
            isOn={used[i]}
            onToggle={() => tap(i)}
            className={msg?.tone === "ng" && !used[i] && msg.text.startsWith(`${w} `) ? styles.shake : ""}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center font-mono text-xl font-bold" data-testid="binary-write-digits">
        {FOUR_WEIGHTS.map((w, i) => (
          <span key={w} className={digit(i) === "?" ? "text-slate-300" : digit(i) === "1" ? "text-amber-600" : "text-slate-500"}>
            {digit(i)}
          </span>
        ))}
      </div>
      <div aria-live="polite" className="mt-3 min-h-12">
        {msg && !done && (
          <p key={msg.key} className={`rounded-xl px-3 py-2.5 text-center text-sm font-bold ring-1 ${styles.reveal} ${msg.tone === "ok" ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"}`}>
            {msg.text}
          </p>
        )}
        {done && (
          <p className={`rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-sm font-bold text-emerald-900 ring-1 ring-emerald-200 ${styles.reveal}`}>
            9 − 8 ＝ 1 → 1 − 1 ＝ 0。使った桁が1、使わない桁が0 → <b className="font-mono text-lg">9 ＝ 1001</b>
          </p>
        )}
      </div>
      {done && (
        <button
          type="button"
          onClick={() => {
            setUsed([false, false, false, false]);
            setMsg(null);
          }}
          className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-300 active:scale-95"
        >
          ↺ もう一度
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 5 本試験の問題へ
// ---------------------------------------------------------------------------

const EXAM_DELAYS = [1400, 1500, 1500, 1700];
const FIVE_WEIGHTS = [16, 8, 4, 2, 1] as const;
const CARRY_DELAYS = [1200, 1400];

export function ExamStep() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, EXAM_DELAYS);
  const carry = useBeats(3, CARRY_DELAYS, false);
  const [showCarry, setShowCarry] = useState(false);
  return (
    <div ref={ref} data-testid="binary-exam" data-beat={b}>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        本試験では「倉庫Aに2進数で <b className="font-mono">1101</b> 個、倉庫Bに <b className="font-mono">1011</b> 個。合わせて何個？」のように出ます。
        <b className="text-slate-900">まず読める数字に直す</b>のがコツ。
      </p>
      <div className="mt-4 flex flex-wrap items-start justify-center gap-x-2 gap-y-2 font-mono text-lg">
        <Term tone="amber" flipKey={b >= 1 ? "d" : "b"} was={b >= 1 ? "1101" : undefined}>
          {b >= 1 ? "13" : "1101"}
        </Term>
        <span className="pt-1 font-bold">+</span>
        <Term tone="amber" flipKey={b >= 2 ? "d" : "b"} was={b >= 2 ? "1011" : undefined}>
          {b >= 2 ? "11" : "1011"}
        </Term>
        <span className="pt-1 font-bold">＝</span>
        <Term tone="brand" flipKey={b >= 3 ? "d" : "q"}>
          {b >= 3 ? "24" : "？"}
        </Term>
      </div>
      <div className="mt-2 space-y-0.5 text-center font-mono text-xs text-slate-500">
        {b >= 1 && <p className={styles.reveal}>1101 → 8 + 4 + 1 ＝ 13</p>}
        {b >= 2 && <p className={styles.reveal}>1011 → 8 + 2 + 1 ＝ 11</p>}
      </div>
      {b >= 4 && (
        <div className={`mt-3 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 ${styles.reveal}`} data-testid="binary-exam-back">
          <p className="text-center text-xs font-bold text-slate-600">答えを2進数で聞かれたら：24 ＝ 16 + 8</p>
          <div className="mt-2">
            <LampRow bits={bitsOf(24, FIVE_WEIGHTS)} weights={FIVE_WEIGHTS} />
          </div>
          <p className="mt-2 text-center font-mono text-lg font-bold text-brand-700">24 ＝ 11000</p>
        </div>
      )}
      {b >= 3 && (
        <p className={`mt-3 rounded-xl bg-brand-50 px-3 py-2.5 text-center text-sm font-bold text-brand-900 ring-1 ring-brand-100 ${styles.reveal}`}>
          読める → ふつうの数字として計算できる。
        </p>
      )}
      <Replay onClick={replay} hidden={reducedMotion} />

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => {
            setShowCarry(true);
            carry.start();
          }}
          className="text-sm font-bold text-slate-800"
          aria-expanded={showCarry}
        >
          ＋α 2進数のまま足すと？（1 ＋ 1 ＝ 10）
        </button>
        {showCarry && (
          <div className="mt-2" data-testid="binary-carry" data-beat={carry.beat}>
            <div className="grid grid-cols-2 gap-2 text-center">
              {["2の桁", "1の桁"].map((label, i) => {
                const isOnes = i === 1;
                const lamps = isOnes ? (carry.beat >= 2 ? 0 : 2) : carry.beat >= 2 ? 1 : 0;
                return (
                  <div key={label} className="rounded-lg bg-white px-2 py-2 ring-1 ring-slate-200">
                    <div className="text-[11px] font-bold text-slate-500">{label}</div>
                    <div className="mt-1 flex h-8 items-center justify-center gap-1 text-2xl">
                      {lamps === 0 ? (
                        <span aria-hidden>⚫</span>
                      ) : (
                        Array.from({ length: lamps }, (_, k) => (
                          <span
                            key={`${carry.beat}-${k}`}
                            aria-hidden
                            className={`${styles.move} ${!isOnes ? styles.pop : ""}`}
                            style={{ transform: isOnes && carry.beat === 1 ? `translateX(${k === 0 ? 8 : -8}px)` : "none" }}
                          >
                            💡
                          </span>
                        ))
                      )}
                    </div>
                    <div className="font-mono text-lg font-bold text-slate-800">{isOnes ? (carry.beat >= 2 ? 0 : "1+1") : carry.beat >= 2 ? 1 : 0}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-center text-xs font-bold leading-relaxed text-slate-700">
              {carry.beat === 0 && "1の桁に 1 と 1。足すと 2 …"}
              {carry.beat === 1 && "でも1つの桁には 0 か 1 しか書けない"}
              {carry.beat >= 2 && (
                <>
                  2 は「2の桁が1つ」に繰り上がる → <span className="font-mono text-base text-brand-700">1 ＋ 1 ＝ 10</span>
                </>
              )}
            </p>
            {!carry.reducedMotion && carry.done && (
              <button type="button" onClick={carry.replay} className="mt-1 text-xs font-bold text-slate-500 underline">
                ↺ もう一度
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6 8bit ＝ 1Byte
// ---------------------------------------------------------------------------

export function ByteStep() {
  const [bits, setBits] = useState<boolean[]>(Array(8).fill(false));
  const value = valueOf(bits, EIGHT_WEIGHTS);
  return (
    <>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        ランプを8個に増やします。重みは同じルールで <b className="font-mono">128・64・32・16・8・4・2・1</b>。
        <b className="text-slate-900">ランプ8個ぶんを8bit（ビット）</b>と呼びます。
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {EIGHT_WEIGHTS.map((weight, index) => (
          <LampButton key={weight} weight={weight} isOn={bits[index]} onToggle={() => setBits((b) => b.map((x, j) => (j === index ? !x : x)))} />
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-sm font-bold text-slate-600">
        {bits.map((b) => (b ? 1 : 0)).join("")} ＝ {value}
      </p>
      <p className="mt-3 rounded-xl bg-brand-50 px-3 py-3 text-center text-sm font-bold text-brand-950 ring-1 ring-brand-200">
        <b>8bit ＝ 1Byte（バイト）</b>。コンピュータは、この0と1の並びで情報を扱います。
      </p>
      <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2.5 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        🌐 この <b>1Byte ＝ 8bit</b> は、通信速度の計算でも使います。
        <div className="mt-1 text-center font-mono text-xs font-bold">200MByte × 8 ＝ 1,600Mbit</div>
        <Link href="/topics/tech-lan-wan" className="mt-1 block text-right text-xs font-bold text-brand-600 underline">
          転送時間の計算（LANとWAN）へ →
        </Link>
      </div>
      <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200">
        <summary className="cursor-pointer font-bold text-slate-800">もう少し知りたい</summary>
        <p className="mt-2 leading-relaxed">byteが集まるとKB、MB、GBになります（約1,000倍ずつ）。スマホで見るGBも、もとはランプの0と1の集まりです。</p>
      </details>
    </>
  );
}
