"use client";

import { useEffect, useState } from "react";
import { BreakEvenChart, breakEvenOf, MAX_QTY, useTweenedEcon, type Econ } from "./breakeven/BreakEvenChart";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「損益分岐点」専用の体験。
//   ① 固定費 ⇄ 変動費 の違い
//   ② 売上線と総費用線のグラフ。販売数を動かすと2本の差（利益/損失）が変わり、交点＝損益分岐点で
//      黒字↔赤字が切り替わる。固定費・売価・変動費を1つ変えると線が動き、交点が左右にすべる
//   ③ 固定費・変動費の見分けクイズ
//
//   例：フリマの出店（出店料＝固定費10000円 / 仕入れ＝変動費1個300円 / 売価500円）
//   損益分岐点 ＝ 固定費 ÷（売価 − 変動費）＝ 10000 ÷ 200 ＝ 50個
// ============================================================================

const PRICE = 500; // 売価（1個）
const VC = 300; // 変動費（1個あたり仕入れ）
const FIXED = 10000; // 固定費（出店料）

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

// 条件を1つだけ変えるシナリオ（交点が左右にすべる）
const SCENARIOS: { id: string; label: string; econ: Econ; note: string }[] = [
  { id: "base", label: "基本", econ: { fixed: FIXED, price: PRICE, vc: VC }, note: "" },
  { id: "fixed", label: "出店料UP", econ: { fixed: 15000, price: PRICE, vc: VC }, note: "固定費が増えると費用線が上へ平行移動 → 交点は右へ（たくさん売らないと黒字にならない）" },
  { id: "price", label: "値上げ", econ: { fixed: FIXED, price: 700, vc: VC }, note: "売価を上げると売上線が急になる → 交点は左へ（少ない数で黒字）" },
  { id: "vc", label: "仕入れ値DOWN", econ: { fixed: FIXED, price: PRICE, vc: 250 }, note: "変動費を下げると費用線がゆるやかに → 交点は左へ" },
];

function Simulator() {
  const reducedMotion = useReducedMotion();
  const [qty, setQty] = useState(20);
  const [sid, setSid] = useState("base");
  const [sweeping, setSweeping] = useState(false);
  const sc = SCENARIOS.find((x) => x.id === sid)!;
  const econ = sc.econ;
  const shown = useTweenedEcon(econ, reducedMotion);
  const bep = breakEvenOf(econ);
  const margin = econ.price - econ.vc; // 限界利益（1個あたり）
  const done = qty >= MAX_QTY;

  // 0個→100個へ、販売数を増やしながら線の差を見せる（損益分岐点では少し止まる）
  useEffect(() => {
    if (!sweeping || reducedMotion || done) return;
    const timer = window.setTimeout(() => setQty((q) => Math.min(MAX_QTY, q + 1)), qty === bep ? 1000 : 55);
    return () => window.clearTimeout(timer);
  }, [sweeping, qty, reducedMotion, bep, done]);

  const sales = econ.price * qty; // 売上
  const variable = econ.vc * qty; // 変動費合計
  const cost = econ.fixed + variable; // 総費用
  const profit = sales - cost; // 利益（マイナスなら損失）
  const atBreak = qty === bep;
  const running = sweeping && !done;

  return (
    <Panel>
      <SectionTitle step={2}>販売数を動かしてみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        スライダーで<b className="text-gray-800">売れた数</b>を変えると、売上線と総費用線の<b className="text-gray-800">差</b>が動きます。
        2本が<b className="text-gray-800">交わる点</b>に注目。
      </p>

      {/* 状態バッジ */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        <div>
          <div className="text-xs text-gray-500">売れた数</div>
          <div className="text-2xl font-bold text-gray-800" data-testid="be-qty">
            {qty}個
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">{profit >= 0 ? "利益" : "損失"}</div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              profit > 0 ? "text-emerald-600" : profit < 0 ? "text-rose-600" : "text-gray-700"
            }`}
            data-testid="be-profit"
          >
            {profit >= 0 ? "+" : "−"}
            {yen(Math.abs(profit))}
          </div>
        </div>
      </div>

      <div className="-mx-1 mt-3">
        <BreakEvenChart econ={shown} qty={qty} />
      </div>

      {/* スライダー */}
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (running) return setSweeping(false);
            setQty(0);
            setSweeping(true);
          }}
          disabled={reducedMotion}
          className="flex-none rounded-full bg-gray-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          aria-label={running ? "一時停止" : "0個から100個まで売ってみる"}
        >
          {running ? "一時停止" : "▶ 0→100個"}
        </button>
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
      </div>

      {/* 条件を変える */}
      <div className="mt-3 text-xs font-bold text-gray-700">条件を1つ変えると、交点はどっちへ動く？</div>
      <div className="mt-1.5 grid grid-cols-4 gap-1">
        {SCENARIOS.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === sid}
            onClick={() => setSid(x.id)}
            className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${
              x.id === sid ? "bg-gray-900 text-white" : "text-gray-700 ring-1 ring-gray-300"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center text-[11px]">
        {[
          { k: "固定費", v: yen(econ.fixed), on: sid === "fixed" },
          { k: "売価", v: `${yen(econ.price)}/個`, on: sid === "price" },
          { k: "変動費", v: `${yen(econ.vc)}/個`, on: sid === "vc" },
        ].map((x) => (
          <div
            key={x.k}
            className={`rounded-md px-1 py-1 ring-1 ${x.on ? "bg-amber-50 font-bold text-amber-900 ring-amber-300" : "bg-white text-gray-600 ring-gray-200"}`}
          >
            {x.k} <span className="tabular-nums">{x.v}</span>
          </div>
        ))}
      </div>
      {sc.note && (
        <p className="mt-1.5 text-xs font-bold leading-relaxed text-amber-800" data-testid="be-note">
          → {sc.note}
        </p>
      )}

      <div
        className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          profit > 0
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : profit < 0
              ? "bg-rose-50 text-rose-900 ring-rose-200"
              : "bg-brand-50 text-brand-900 ring-brand-200"
        }`}
        aria-live="polite"
        data-testid="be-status"
      >
        {profit > 0 && (
          <>
            ⭕ <b>黒字</b>：売上線が総費用線より上。損益分岐点（{bep}個）を
            <b>超えた</b>ので、もうけが出ています。
          </>
        )}
        {profit < 0 && (
          <>
            ❌ <b>赤字</b>：総費用線が売上線より上。あと
            <b>{Math.ceil((cost - sales) / margin)}個</b>
            売れば損益分岐点（{bep}個）に届きます。
          </>
        )}
        {profit === 0 && (
          <>
            🎯 ちょうど<b>損益分岐点</b>！2本の線が交わり、売上と費用が同じ（{yen(sales)}）で、もうけは0。
            ここが<b>黒字と赤字の境目</b>です。
          </>
        )}
      </div>

      {atBreak || (
        <button
          onClick={() => {
            setSweeping(false);
            setQty(bep);
          }}
          className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          🎯 損益分岐点（{bep}個）に合わせる
        </button>
      )}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
        1個売るごとに残る <b>売価−変動費＝{yen(margin)}</b>（<b>限界利益</b>）で固定費を回収していく。
        <br />
        損益分岐点 ＝ 固定費 ÷ 限界利益 ＝ {yen(econ.fixed)} ÷ {yen(margin)} ＝ {bep}個
      </p>
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
