"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「損益分岐点」専用の体験。
//   ① 固定費 ⇄ 変動費 の違い
//   ② 販売数スライダーで「売上」と「総費用」が動き、損益分岐点で黒字↔赤字が切り替わる
//   ③ 固定費・変動費の見分けクイズ
//
//   例：フリマの出店（出店料＝固定費10000円 / 仕入れ＝変動費1個300円 / 売価500円）
//   損益分岐点 ＝ 固定費 ÷（売価 − 変動費）＝ 10000 ÷ 200 ＝ 50個
// ============================================================================

const PRICE = 500; // 売価（1個）
const VC = 300; // 変動費（1個あたり仕入れ）
const FIXED = 10000; // 固定費（出店料）
const MAX_QTY = 100;
const BREAK_EVEN = FIXED / (PRICE - VC); // 50個

const yen = (n: number) => `${n.toLocaleString()}円`;

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
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 売価は1個 <b>{yen(PRICE)}</b>。何個売れば<b>もうけが0（トントン）</b>になるか、次で動かしてみよう。
      </div>
    </Panel>
  );
}

function Simulator() {
  const [qty, setQty] = useState(20);

  const sales = PRICE * qty; // 売上
  const variable = VC * qty; // 変動費合計
  const cost = FIXED + variable; // 総費用
  const profit = sales - cost; // 利益（マイナスなら損失）
  const max = PRICE * MAX_QTY; // バーのスケール用
  const atBreak = qty === BREAK_EVEN;

  return (
    <Panel>
      <SectionTitle step={2}>販売数を動かしてみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        スライダーで<b className="text-gray-800">売れた数</b>を変えると、売上と費用が動きます。
      </p>

      {/* 状態バッジ */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        <div>
          <div className="text-xs text-gray-500">売れた数</div>
          <div className="text-2xl font-bold text-gray-800">{qty}個</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">{profit >= 0 ? "利益" : "損失"}</div>
          <div
            className={`text-2xl font-bold ${
              profit > 0 ? "text-emerald-600" : profit < 0 ? "text-rose-600" : "text-gray-700"
            }`}
          >
            {profit >= 0 ? "+" : "−"}
            {yen(Math.abs(profit))}
          </div>
        </div>
      </div>

      {/* スライダー */}
      <input
        type="range"
        min={0}
        max={MAX_QTY}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="mt-4 w-full accent-brand-600"
        aria-label="販売数"
      />
      <div className="-mt-1 flex justify-between text-[10px] text-gray-400">
        <span>0個</span>
        <span className="font-bold text-brand-500">↑損益分岐点 {BREAK_EVEN}個</span>
        <span>{MAX_QTY}個</span>
      </div>

      {/* 売上 vs 総費用 バー */}
      <div className="mt-4 space-y-2.5">
        <Bar label="売上" value={sales} max={max} color="bg-sky-400" note={`${yen(PRICE)}×${qty}個`} />
        <Bar
          label="総費用"
          value={cost}
          max={max}
          color="bg-rose-300"
          note={`固定${yen(FIXED)}＋変動${yen(variable)}`}
        />
      </div>

      <div
        className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          profit > 0
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : profit < 0
              ? "bg-rose-50 text-rose-900 ring-rose-200"
              : "bg-brand-50 text-brand-900 ring-brand-200"
        }`}
      >
        {profit > 0 && (
          <>
            ⭕ <b>黒字</b>：売上が費用を上回っています。損益分岐点（{BREAK_EVEN}個）を
            <b>超えた</b>ので、もうけが出ています。
          </>
        )}
        {profit < 0 && (
          <>
            ❌ <b>赤字</b>：費用が売上を上回っています。あと
            <b>{Math.ceil((cost - sales) / (PRICE - VC))}個</b>
            売れば損益分岐点（{BREAK_EVEN}個）に届きます。
          </>
        )}
        {profit === 0 && (
          <>
            🎯 ちょうど<b>損益分岐点</b>！売上と費用が同じ（{yen(sales)}）で、もうけは0。
            ここが<b>黒字と赤字の境目</b>です。
          </>
        )}
      </div>

      {atBreak || (
        <button
          onClick={() => setQty(BREAK_EVEN)}
          className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          🎯 損益分岐点（{BREAK_EVEN}個）に合わせる
        </button>
      )}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
        損益分岐点 ＝ 固定費 ÷（売価 − 変動費）＝ {yen(FIXED)} ÷ {yen(PRICE - VC)} ＝ {BREAK_EVEN}個
      </p>
    </Panel>
  );
}

function Bar({
  label,
  value,
  max,
  color,
  note,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  note: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-bold text-gray-700">{label}</span>
        <span className="text-gray-500">
          {yen(value)} <span className="text-gray-400">（{note}）</span>
        </span>
      </div>
      <div className="mt-1 h-5 overflow-hidden rounded-md bg-gray-100">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
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
      <SectionTitle step={3}>固定費？ 変動費？</SectionTitle>
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
        ⚖️ <b>損益分岐点</b>は、売上と費用がちょうど同じで<b>もうけが0</b>になる売上（販売数）。
        ここを超えると黒字、下回ると赤字です。スライダーで体感しよう。
      </div>

      <FixedVsVariable />
      <Simulator />
      <Quiz />
    </div>
  );
}
