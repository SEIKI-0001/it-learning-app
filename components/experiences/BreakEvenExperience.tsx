"use client";

import { useEffect, useRef, useState } from "react";
import { BreakEvenChart, MAX_QTY } from "./breakeven/BreakEvenChart";
import { BEP, CountStage, FIXED, FormulaStage, MARGIN, MarginStage, PRICE, PracticeStage, RecoverStage, SalesStage, VC } from "./breakeven/Stages";
import { useInView } from "./scene/useInView";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「損益分岐点」専用の体験。公式を先に出さず、1個売ったときのお金の動きから組み立てる。
//   ① 固定費 ⇄ 変動費 の違い
//   ② 1個売ると？ 500 − 300 ＝ 200円 が残る（まだ利益ではない）
//   ③ 残った200円で固定費を回収：10,000 → 9,800 → 9,600 …
//   ④ 何個で0円？ 10,000 ÷ 200 ＝ 50個。51個目から利益
//   ⑤ 数字を言葉に置き換えて公式へ：固定費 ÷（販売単価 − 変動費）
//   ⑥ グラフで確認：線を描き、交点＝50個で赤字 → 黒字が切り替わる
//   ⑦ 売上高で聞かれたら：50 × 500、または 固定費 ÷ 限界利益率
//   ⑧ 練習：個数 → 売上高（本試験の形）
//   ⑨ 固定費・変動費の見分けクイズ
//
//   例：フリマの出店（出店料＝固定費10000円 / 仕入れ＝変動費1個300円 / 売価500円）
// ============================================================================

const ECON = { fixed: FIXED, price: PRICE, vc: VC };
const yen = (n: number) => `${n.toLocaleString()}円`;
const DRAW_MS = 1800;
const SWEEP_END = 65;

function FixedVsVariable() {
  return (
    <Panel>
      <SectionTitle step={1}>2種類の費用を知ろう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        フリマに出店して<b className="text-gray-800">手作りグッズ</b>を売る場面で考えます。かかるお金は2種類です。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-200">
          <div className="text-sm font-bold text-brand-700">🏠 固定費</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            売れても売れなくても<b>必ずかかる</b>お金。
          </p>
          <p className="mt-2 text-[11px] text-gray-500">例：出店料 {yen(FIXED)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="text-sm font-bold text-emerald-700">📦 変動費</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            売れた数に応じて<b>増えていく</b>お金。
          </p>
          <p className="mt-2 text-[11px] text-gray-500">例：仕入れ 1個 {yen(VC)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        固定費は総額が変わらないので、たくさん売る（作る）ほど<b className="text-gray-700">1個あたりの固定費の負担は小さく</b>なります。
      </p>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 売価は1個 <b>{yen(PRICE)}</b>。まずは<b>1個売ると手元にいくら残るか</b>から見ていこう。
      </div>
    </Panel>
  );
}

function GraphStage() {
  const reducedMotion = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [runId, setRunId] = useState(0);
  const [qty, setQty] = useState(BEP);
  const [sweeping, setSweeping] = useState(false);
  const started = useRef(false);

  // 初めて見えたら：線を描く → 0個から売っていく（損益分岐点で少し止まる）
  useEffect(() => {
    if (!inView || started.current || reducedMotion) return;
    started.current = true;
    setQty(0);
    setRunId(1);
  }, [inView, reducedMotion]);

  useEffect(() => {
    if (runId === 0) return;
    const timer = window.setTimeout(() => setSweeping(true), DRAW_MS);
    return () => window.clearTimeout(timer);
  }, [runId]);

  useEffect(() => {
    if (!sweeping || reducedMotion || qty >= SWEEP_END) return;
    const timer = window.setTimeout(() => setQty((q) => q + 1), qty === BEP ? 1300 : 50);
    return () => window.clearTimeout(timer);
  }, [sweeping, qty, reducedMotion]);

  const sales = PRICE * qty;
  const cost = FIXED + VC * qty;
  const profit = sales - cost;

  return (
    <Panel>
      <SectionTitle step={6}>グラフで確かめる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ここまでの話を、<b className="text-blue-600">売上</b>と<b className="text-rose-600">総費用（固定費＋変動費）</b>の2本の線で見ると…
      </p>

      <div ref={ref} className="-mx-1 mt-3" data-testid="be-graph">
        <BreakEvenChart key={runId} econ={ECON} qty={qty} draw={runId > 0 && !reducedMotion} />
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="w-14 flex-none text-xs font-bold tabular-nums text-gray-700" data-testid="be-qty">
          {qty}個
        </span>
        <input
          type="range"
          min={0}
          max={MAX_QTY}
          value={qty}
          onChange={(e) => {
            setSweeping(false);
            setQty(Number(e.target.value));
          }}
          className="min-w-0 flex-1 accent-brand-600"
          aria-label="販売数"
        />
        <span
          className={`w-24 flex-none text-right text-sm font-bold tabular-nums ${profit > 0 ? "text-emerald-600" : profit < 0 ? "text-rose-600" : "text-gray-700"}`}
          data-testid="be-profit"
        >
          {profit >= 0 ? "+" : "−"}
          {yen(Math.abs(profit))}
        </span>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          profit > 0 ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : profit < 0 ? "bg-rose-50 text-rose-900 ring-rose-200" : "bg-brand-50 text-brand-900 ring-brand-200"
        }`}
        aria-live="polite"
        data-testid="be-status"
      >
        {profit > 0 && (
          <>
            ⭕ <b>黒字</b>：50個より右。売上線が総費用線より上で、1個ごとに200円ずつ利益が増えます。
          </>
        )}
        {profit < 0 && (
          <>
            ❌ <b>赤字</b>：50個より左。固定費をまだ回収しきれていません（あと<b>{Math.ceil((cost - sales) / MARGIN)}個</b>）。
          </>
        )}
        {profit === 0 && (
          <>
            🎯 <b>交点＝損益分岐点</b>（50個・売上 {yen(sales)}）。売上と総費用が同じで、利益は0円。
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {qty !== BEP && (
          <button
            type="button"
            onClick={() => {
              setSweeping(false);
              setQty(BEP);
            }}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95"
          >
            🎯 交点（50個）に合わせる
          </button>
        )}
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => {
              setSweeping(false);
              setQty(0);
              setRunId((r) => r + 1);
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
          >
            ↺ 線を描き直す
          </button>
        )}
      </div>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "固定費" | "変動費"; why: string }[] = [
  { t: "店の家賃（毎月決まった額）", ans: "固定費", why: "売上に関係なく毎月かかるので固定費。" },
  { t: "商品の材料費・仕入れ代", ans: "変動費", why: "作る・売る数が増えるほど増えるので変動費。" },
  { t: "正社員の基本給", ans: "固定費", why: "売れても売れなくても払うので固定費。" },
  { t: "売れた分だけ払う配送料", ans: "変動費", why: "売れた数に比例して増えるので変動費。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={9}>固定費？ 変動費？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        次の費用は<b className="text-gray-800">固定費</b>と<b className="text-gray-800">変動費</b>のどっち？
      </p>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {(["固定費", "変動費"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${it.ans}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function BreakEvenExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚖️ <b>損益分岐点</b>は、売上と費用がちょうど同じで<b>もうけが0</b>になる販売数（売上高）。
        公式は最後に出てきます。まずは1個売ったときのお金の動きから。
      </div>

      <FixedVsVariable />
      <MarginStage />
      <RecoverStage />
      <CountStage />
      <FormulaStage />
      <GraphStage />
      <SalesStage />
      <PracticeStage />
      <Quiz />
    </div>
  );
}
