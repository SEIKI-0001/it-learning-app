"use client";

import { useEffect, useState } from "react";
import styles from "../calc/calc.module.css";
import { Choices, Note, Replay, StepChips, Term, type Choice } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { useReducedMotion } from "../scene/useReducedMotion";
import { Panel, SectionTitle } from "../ui";

// 損益分岐点の「具体例 → なぜ → 計算 → 一般化」4枚＋売上高への橋渡し＋練習。
// 例はずっと同じ：売価 500円 / 変動費 300円 / 固定費 10,000円 → 50個（売上 25,000円）
//   ② 1個売ると？   ：500円の帯から 300円（仕入れ）が引きはがされ、200円が残る
//   ③ 固定費を回収  ：売れるたびに +200円 が「未回収の固定費」へ飛び込み、10,000 → 9,800 → 9,600 …
//   ④ 何個で0円？   ：問いに答えてから 50マスが埋まる。50個で0円、51個目から利益
//   ⑤ 公式へ        ：10,000 ÷ 200 ＝ 50 の数字が 固定費 ÷（販売単価 − 変動費）へ置き換わる
//   ⑦ 売上高なら    ：50個 × 500円、または 固定費 ÷ 限界利益率（0.4）
//   ⑧ 練習          ：個数 → 売上高（本試験の形）。誤答はつまずいた手順を返す

export const PRICE = 500;
export const VC = 300;
export const FIXED = 10000;
export const MARGIN = PRICE - VC; // 200
export const BEP = FIXED / MARGIN; // 50

const yen = (n: number) => `${n.toLocaleString()}円`;

// ---------------------------------------------------------------------------
// ② 1個売ると、いくら残る？
// ---------------------------------------------------------------------------

const MARGIN_DELAYS = [1000, 1500, 1500];

export function MarginStage() {
  const { ref, beat, reducedMotion, replay } = useBeats(4, MARGIN_DELAYS);
  const peeled = beat >= 1;
  const kept = beat >= 2;
  const sent = beat >= 3;

  return (
    <Panel>
      <SectionTitle step={2}>1個売ると、いくら残る？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        グッズが<b className="text-gray-800">1個 500円</b>で売れました。でも、その1個の仕入れに<b className="text-gray-800">300円</b>払っています。
      </p>

      <div ref={ref} className="mt-4" data-testid="be-margin" data-beat={beat}>
        <div className="text-xs font-bold text-brand-700">🛍️ 1個売れた</div>
        <div className="relative mt-1 h-24">
          <div className="absolute inset-x-0 top-0 flex h-10">
            <div
              className={`${styles.move} grid place-items-center rounded-l-md text-[11px] font-bold text-white ${peeled ? "rounded-md bg-rose-400" : "bg-brand-500"}`}
              style={{ width: "60%", transform: peeled ? "translate(-4px, 48px) scale(0.94)" : "none", opacity: peeled ? 0.8 : 1 }}
              data-testid="be-margin-cost"
            >
              {peeled && "🏭 仕入れ −300円（変動費）"}
            </div>
            <div
              className={`${styles.move} grid place-items-center rounded-r-md text-[11px] font-bold text-white ${kept ? "rounded-md bg-emerald-500" : "bg-brand-500"}`}
              style={{ width: "40%", transform: sent ? "translateX(6px)" : "none" }}
              data-testid="be-margin-kept"
            >
              {kept && "残る 200円"}
            </div>
          </div>
          {!peeled && (
            <div className="pointer-events-none absolute inset-x-0 top-0 grid h-10 place-items-center text-sm font-bold text-white">売上 500円</div>
          )}
        </div>

        {kept && (
          <div className={`rounded-xl bg-gray-50 px-4 py-2.5 text-center text-lg font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="be-margin-eq">
            <span className="text-brand-700">500</span> − <span className="text-rose-600">300</span> ＝ <span className="text-emerald-600">200円</span>
          </div>
        )}
        {sent && (
          <Note>
            💡 この<b>200円</b>は、すぐに利益になるわけではありません。まず<b>出店料（固定費）の回収</b>に使われます。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 固定費を回収する
// ---------------------------------------------------------------------------

const RECOVER_AUTO = 3;
const RECOVER_DELAYS = [1000, 1400, 1400, 1400];
const RECOVER_MAX = 10;

export function RecoverStage() {
  const { ref, beat, reducedMotion, replay } = useBeats(RECOVER_AUTO + 2, RECOVER_DELAYS);
  const [extra, setExtra] = useState(0);
  const sold = Math.min(beat, RECOVER_AUTO) + extra;
  const remaining = FIXED - MARGIN * sold;
  const chain = Array.from({ length: sold + 1 }, (_, i) => FIXED - MARGIN * i);
  const showNote = beat > RECOVER_AUTO;

  return (
    <Panel>
      <SectionTitle step={3}>残った200円で、固定費を回収する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        出店料<b className="text-gray-800">10,000円</b>は、売る前にもう払っています。これを売れた分の200円で取り戻していきます。
      </p>

      <div ref={ref} className="mt-4" data-testid="be-recover" data-sold={sold}>
        <div className="rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-gray-600">まだ回収していない固定費</span>
            <b className="text-2xl tabular-nums text-rose-600" data-testid="be-remaining">
              {yen(remaining)}
            </b>
          </div>
          <div className="relative mt-2 h-4">
            <div className="h-full overflow-hidden rounded-full bg-gray-200">
              <div className={`${styles.width} h-full rounded-full bg-rose-400`} style={{ width: `${(remaining / FIXED) * 100}%` }} />
            </div>
            {sold > 0 && (
              <span
                key={sold}
                className={`${styles.fly} absolute -top-1 whitespace-nowrap rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white`}
                style={{ left: `calc(${(remaining / FIXED) * 100}% - 18px)` }}
                aria-hidden
              >
                +200
              </span>
            )}
          </div>
          <div className="mt-6 flex min-h-7 flex-wrap items-center gap-1 text-lg" aria-label={`売れた数 ${sold}個`}>
            {Array.from({ length: sold }, (_, i) => (
              <span key={i} className={styles.pop} aria-hidden>
                🛍️
              </span>
            ))}
            {sold === 0 && <span className="text-xs text-gray-400">まだ売れていない</span>}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs font-bold tabular-nums text-gray-700" data-testid="be-chain">
          {chain.map((v, i) => (
            <span key={i} className={`flex items-center gap-1 ${i > 0 ? styles.reveal : ""}`}>
              {i > 0 && <span className="text-emerald-600">−200 →</span>}
              <span className={`rounded px-1 ${i === chain.length - 1 ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : ""}`}>{v.toLocaleString()}</span>
            </span>
          ))}
          <span className="text-gray-400">…</span>
        </div>

        {showNote && (
          <Note>
            💡 <b>1個売るたびに、固定費を200円ずつ回収</b>しています。まだ回収しきっていない間は、売れても赤字です。
          </Note>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExtra((n) => n + 1)}
            disabled={!showNote || sold >= RECOVER_MAX}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95 disabled:opacity-40"
          >
            🛍️ もう1個売る
          </button>
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => {
                setExtra(0);
                replay();
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
            >
              ↺ もう一度見る
            </button>
          )}
        </div>
        {sold >= RECOVER_MAX && <p className="mt-2 text-xs font-bold text-gray-500">1個ずつだと大変…。0円になるまで何個かかるかは、次で計算しよう。</p>}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 何個売れば0円？
// ---------------------------------------------------------------------------

const COUNT_CHOICES: Choice[] = [
  { label: "20個", why: "売価500円で割った値です。固定費の回収に使えるのは、1個あたり残る200円だけ。" },
  { label: "33個", why: "変動費300円で割った値です。300円は仕入れで出ていくお金。回収に使えるのは残る200円。" },
  { label: "50個", ok: true },
];
const LAST_CELL = BEP + 1;

export function CountStage() {
  const reducedMotion = useReducedMotion();
  const [answered, setAnswered] = useState(false);
  const [filled, setFilled] = useState(0);
  const [runId, setRunId] = useState(0);
  const n = reducedMotion && answered ? LAST_CELL : filled;

  useEffect(() => {
    if (runId === 0 || reducedMotion || filled >= LAST_CELL) return;
    const t = window.setTimeout(() => setFilled((f) => f + 1), filled === BEP ? 1100 : 45);
    return () => window.clearTimeout(t);
  }, [runId, filled, reducedMotion]);

  const reveal = () => {
    setAnswered(true);
    setFilled(0);
    setRunId((r) => r + 1);
  };
  const recovered = Math.min(n, BEP);
  const remaining = FIXED - MARGIN * recovered;
  const profit = Math.max(0, n - BEP) * MARGIN;

  return (
    <Panel>
      <SectionTitle step={4}>何個売れば、0円になる？</SectionTitle>
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold leading-relaxed text-gray-800 ring-1 ring-gray-200">
        固定費 <span className="text-rose-600">10,000円</span> を、1個 <span className="text-emerald-600">200円</span> ずつ回収する。
        <br />
        何個売れば回収しきれる？
      </div>
      <div className="mt-2">
        <Choices choices={COUNT_CHOICES} onAnswer={reveal} testId="be-count-choices" />
      </div>
      {!answered && (
        <button type="button" onClick={reveal} className="mt-2 text-xs font-bold text-gray-500 underline">
          答えを見る
        </button>
      )}

      {answered && (
        <div className={`mt-3 ${styles.reveal}`} data-testid="be-count" data-filled={n}>
          <div className="rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-1 ring-gray-200">
            <span className="text-rose-600">10,000</span> ÷ <span className="text-emerald-600">200</span> ＝ <span className="text-brand-600">50個</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between text-xs font-bold">
            <span className="text-gray-600">売れた数 {n}個</span>
            {profit > 0 ? (
              <span className="text-emerald-600">利益 +{yen(profit)}</span>
            ) : (
              <span className="tabular-nums text-rose-600">未回収 {yen(remaining)}</span>
            )}
          </div>
          <div className="mt-1 grid grid-cols-10 gap-1" aria-hidden>
            {Array.from({ length: LAST_CELL }, (_, i) => (
              <span
                key={i}
                className={`h-4 rounded-sm transition-colors ${
                  i < n ? (i < BEP ? "bg-brand-400" : "bg-emerald-500") : i < BEP ? "bg-gray-100" : "bg-emerald-50 ring-1 ring-emerald-200"
                } ${i === BEP - 1 && n >= BEP ? "ring-2 ring-gray-900" : ""}`}
              />
            ))}
          </div>
          {n >= BEP && (
            <div className={`mt-2 space-y-1 text-sm font-bold ${styles.reveal}`}>
              <p className="rounded-lg bg-brand-50 px-3 py-1.5 text-brand-900 ring-1 ring-brand-200">🎯 50個で固定費を回収しきった → 利益0円＝<b>損益分岐点</b></p>
              {n > BEP && <p className={`rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-900 ring-1 ring-emerald-200 ${styles.reveal}`}>51個目からは、1個ごとに200円が<b>利益</b>として残る</p>}
            </div>
          )}
          <Replay onClick={reveal} hidden={reducedMotion} />
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 公式へ
// ---------------------------------------------------------------------------

const FORMULA_DELAYS = [1300, 1600, 1600, 1600];

export function FormulaStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, FORMULA_DELAYS);
  return (
    <Panel>
      <SectionTitle step={5}>数字を言葉に置き換えると、公式になる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">さっきの計算の数字が、それぞれ何だったかを言葉にしてみます。</p>

      <div ref={ref} className="mt-4" data-testid="be-formula" data-beat={b}>
        <div className="flex flex-wrap items-start justify-center gap-x-1.5 gap-y-2 text-[13px]">
          <Term tone="rose" flipKey={b >= 1 ? "w" : "n"} was={b >= 1 ? "10,000" : undefined}>
            {b >= 1 ? "固定費" : "10,000"}
          </Term>
          <span className="pt-1 font-bold">÷</span>
          <Term
            tone="emerald"
            flipKey={b >= 3 ? "w" : b >= 2 ? "s" : "n"}
            was={b >= 3 ? "500 − 300 ＝ 200" : b >= 2 ? "200" : undefined}
          >
            {b >= 3 ? "（販売単価 − 変動費）" : b >= 2 ? "（500 − 300）" : "200"}
          </Term>
          <span className="pt-1 font-bold">＝</span>
          <Term tone="brand" flipKey={b >= 4 ? "w" : "n"} was={b >= 4 ? "50個" : undefined}>
            {b >= 4 ? "損益分岐点販売数量" : "50"}
          </Term>
        </div>

        {b >= 3 && (
          <p className={`mt-3 text-center text-xs font-bold text-emerald-700 ${styles.reveal}`}>
            1個あたり残る額（販売単価 − 変動費）を<b className="text-sm">限界利益</b>と呼ぶ
          </p>
        )}
        {b >= 4 && (
          <div className={`mt-3 rounded-xl bg-brand-50 px-3 py-3 text-center ring-2 ring-brand-400 ${styles.reveal}`} data-testid="be-formula-final">
            <div className="text-xs font-bold text-brand-700">損益分岐点販売数量</div>
            <div className="mt-1 text-sm font-bold text-gray-800">
              ＝ <span className="text-rose-600">固定費</span> ÷（<span className="text-emerald-600">販売単価 − 変動費</span>）
            </div>
          </div>
        )}
        {b >= 4 && (
          <Note>
            💡 公式を忘れても「<b>1個でいくら残る？</b> → <b>固定費を何個で回収できる？</b>」と考えれば作り直せます。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} label="↺ もう一度置き換える" />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑦ 売上高で聞かれたら
// ---------------------------------------------------------------------------

const SALES_DELAYS = [1600, 1800, 1800];

export function SalesStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(4, SALES_DELAYS);
  return (
    <Panel>
      <SectionTitle step={7}>「売上高」で聞かれたら</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        試験では個数ではなく<b className="text-gray-800">損益分岐点売上高</b>（いくら売り上げれば0円か）もよく聞かれます。
      </p>

      <div ref={ref} className="mt-3 space-y-3" data-testid="be-sales" data-beat={b}>
        <div className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
          <div className="text-xs font-bold text-gray-600">求め方A：個数 × 売価</div>
          <div className="mt-1 text-center text-base font-bold">
            <span className="text-brand-600">50個</span> × 500円 ＝ <span className="text-brand-700">25,000円</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">グラフの交点の高さ（25,000円）がこれです。</p>
        </div>

        {b >= 1 && (
          <div className={`rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200 ${styles.reveal}`}>
            <div className="text-xs font-bold text-gray-600">求め方B：売上のうち何割が残る？</div>
            <div className="mt-2 flex h-7 overflow-hidden rounded-md text-[11px] font-bold text-white">
              <div className="grid place-items-center bg-rose-400" style={{ width: "60%" }}>
                変動費 300（6割）
              </div>
              <div className="grid place-items-center bg-emerald-500" style={{ width: "40%" }}>
                残る 200（4割）
              </div>
            </div>
            <div className="mt-1.5 text-center text-sm font-bold">
              <span className="text-emerald-600">200</span> ÷ 500 ＝ <span className="text-emerald-700">0.4</span>
              <span className="ml-1 text-xs text-gray-500">← 限界利益率</span>
            </div>
          </div>
        )}

        {b >= 2 && (
          <div className={`rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200 ${styles.reveal}`}>
            <p className="text-xs leading-relaxed text-gray-600">売上が1円増えるごとに0.4円ずつ固定費を回収 → 10,000円回収するのに必要な売上は</p>
            <div className="mt-1 text-center text-base font-bold">
              <span className="text-rose-600">10,000</span> ÷ <span className="text-emerald-700">0.4</span> ＝ <span className="text-brand-700">25,000円</span>
              <span className={`ml-1 text-sm text-emerald-600 ${styles.pop}`}>✓ Aと同じ</span>
            </div>
          </div>
        )}

        {b >= 3 && (
          <div className={`rounded-xl bg-brand-50 px-3 py-3 text-center ring-2 ring-brand-400 ${styles.reveal}`} data-testid="be-sales-final">
            <div className="text-sm font-bold text-gray-800">
              損益分岐点売上高 ＝ <span className="text-rose-600">固定費</span> ÷ <span className="text-emerald-700">限界利益率</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">限界利益率 ＝（売上高 − 変動費）÷ 売上高</div>
            <p className="mt-1.5 text-[11px] text-gray-500">表で「売上高・変動費の合計」だけが出る問題は、こちらの形で解きます。</p>
          </div>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑧ 練習：個数 → 売上高（本試験の形）
// ---------------------------------------------------------------------------

export const BE_STEPS = ["① 1個（売上）あたり残る額", "② 固定費 ÷ それ", "③ 売上高なら ÷ 限界利益率"];

const PRACTICE_QTY: Choice[] = [
  { label: "300個", ok: true },
  { label: "100個", why: "売価600円で割っています。割るのは1個あたり残る額（600 − 400 ＝ 200円）。", step: 0 },
  { label: "150個", why: "変動費400円で割っています。割るのは1個あたり残る額（200円）。", step: 0 },
  { label: "60個", why: "600 ＋ 400 で割っています。売価から変動費を「引いた」額で割ります。", step: 0 },
];

const PRACTICE_SALES: Choice[] = [
  { label: "3,600万円", ok: true },
  { label: "5,400万円", why: "変動費と固定費を足しただけ（今期の総費用）です。損益分岐点の計算をしていません。", step: 1 },
  { label: "1,200万円", why: "変動費の割合（0.75）で割っています。割るのは「残る割合」＝限界利益率 0.25。", step: 2 },
  { label: "6,000万円", why: "今期の売上高そのものです。固定費を回収しきる売上高を計算しましょう。", step: 1 },
];

export function PracticeStage() {
  const [q1, setQ1] = useState<boolean | null>(null);
  const [q2, setQ2] = useState<boolean | null>(null);
  return (
    <Panel>
      <SectionTitle step={8}>解き方を固定して、本試験の形へ</SectionTitle>
      <div className="mt-3">
        <StepChips steps={BE_STEPS} active={q2 !== null ? 2 : q1 !== null ? 1 : undefined} />
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200">
        <p className="text-sm font-bold leading-relaxed text-gray-800">
          Q1. 販売単価600円、1個あたりの変動費400円、固定費60,000円。損益分岐点の販売数量は？
        </p>
        <div className="mt-2">
          <Choices choices={PRACTICE_QTY} steps={BE_STEPS} cols={4} onAnswer={setQ1} testId="be-practice-1" />
        </div>
        {q1 !== null && (
          <p className={`mt-2 text-xs leading-relaxed text-gray-600 ${styles.reveal}`}>
            ① 600 − 400 ＝ 200円 → ② 60,000 ÷ 200 ＝ <b className="text-gray-800">300個</b>
          </p>
        )}
      </div>

      {q1 !== null && (
        <div className={`mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200 ${styles.reveal}`}>
          <p className="text-[11px] font-bold text-brand-700">本試験レベル</p>
          <p className="mt-0.5 text-sm font-bold leading-relaxed text-gray-800">
            Q2. 売上高6,000万円、変動費4,500万円、固定費900万円の事業。損益分岐点売上高は？
          </p>
          <div className="mt-2">
            <Choices choices={PRACTICE_SALES} steps={BE_STEPS} cols={2} onAnswer={setQ2} testId="be-practice-2" />
          </div>
          {q2 !== null && (
            <p className={`mt-2 text-xs leading-relaxed text-gray-600 ${styles.reveal}`}>
              ① 6,000 − 4,500 ＝ 1,500万円 → 限界利益率 1,500 ÷ 6,000 ＝ 0.25 → ③ 900 ÷ 0.25 ＝ <b className="text-gray-800">3,600万円</b>
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
