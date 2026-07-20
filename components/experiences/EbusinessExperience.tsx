"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「e-ビジネス（EC・EDI・フィンテック・シェアリング）」専用の体験。
//   ① 取引マップ … 用語をタップ→「誰と誰の間で・何が流れるか」の線が光る
//   ② 「これはどれ？」仕分けクイズ
// ============================================================================

type TermKey = "ec" | "edi" | "fintech" | "sharing";

type Term = {
  key: TermKey;
  emo: string;
  name: string;
  who: string;
  flow: string;
  d: string;
  ex: string;
  chip: string; // 選択中チップの色
  stroke: string; // SVG線の色
  badge: string; // 説明バッジの色
};

const TERMS: Term[] = [
  {
    key: "ec",
    emo: "🛒",
    name: "EC",
    who: "企業 → 個人",
    flow: "商品を販売",
    d: "インターネット上での売買（電子商取引）。ネット通販など、主に企業が消費者へ売る取引。",
    ex: "例：ネットショップで服を買う",
    chip: "bg-sky-600 text-white",
    stroke: "#0284c7",
    badge: "bg-sky-50 text-sky-900 ring-sky-200",
  },
  {
    key: "edi",
    emo: "🔁",
    name: "EDI",
    who: "企業 ⇄ 企業",
    flow: "取引データを交換",
    d: "企業どうしが、注文・納品・請求などのデータを決まった形式で電子的にやり取りするしくみ（電子データ交換）。",
    ex: "例：取引先へ発注データを自動送信",
    chip: "bg-emerald-600 text-white",
    stroke: "#059669",
    badge: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  },
  {
    key: "fintech",
    emo: "📱",
    name: "フィンテック",
    who: "個人 → 企業（お金）",
    flow: "支払い・送金をITで",
    d: "金融（Finance）×IT（Technology）。銀行に行かなくても、スマホで支払い・送金・家計管理ができる。",
    ex: "例：スマホのQRコード決済で支払う",
    chip: "bg-brand-600 text-white",
    stroke: "#7c3aed",
    badge: "bg-brand-50 text-brand-900 ring-brand-200",
  },
  {
    key: "sharing",
    emo: "🤝",
    name: "シェアリング",
    who: "個人 ⇄ 個人",
    flow: "モノ・場所を貸し借り",
    d: "使っていないモノ・場所・スキルを、個人どうしで貸し借り・共有するしくみ（シェアリングエコノミー）。",
    ex: "例：空き部屋を旅行者に貸す",
    chip: "bg-amber-500 text-white",
    stroke: "#d97706",
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
  },
];

// マップ上の線。座標は viewBox 0-100 のパーセント。
const LINES: Record<TermKey, { x1: number; y1: number; x2: number; y2: number }> = {
  edi: { x1: 22, y1: 20, x2: 78, y2: 20 },
  ec: { x1: 16, y1: 20, x2: 16, y2: 80 },
  fintech: { x1: 26, y1: 80, x2: 26, y2: 20 },
  sharing: { x1: 22, y1: 80, x2: 78, y2: 80 },
};

// 用語ごとに光るノード。
const NODES = [
  { id: "compA", emo: "🏢", label: "企業", x: 20, y: 20 },
  { id: "compB", emo: "🏭", label: "取引先企業", x: 80, y: 20 },
  { id: "persA", emo: "🙋", label: "個人", x: 20, y: 80 },
  { id: "persB", emo: "🙆", label: "個人", x: 80, y: 80 },
];
const LIT: Record<TermKey, string[]> = {
  ec: ["compA", "persA"],
  edi: ["compA", "compB"],
  fintech: ["compA", "persA"],
  sharing: ["persA", "persB"],
};

// 線の中間に置く「流れているもの」絵文字。
const MID: Record<TermKey, { x: number; y: number; emo: string }> = {
  ec: { x: 16, y: 50, emo: "📦" },
  edi: { x: 50, y: 20, emo: "🔁" },
  fintech: { x: 26, y: 50, emo: "📱" },
  sharing: { x: 50, y: 80, emo: "🤝" },
};

function TradeMap() {
  const [sel, setSel] = useState<TermKey | null>(null);
  const [tried, setTried] = useState<Set<TermKey>>(new Set());
  const term = TERMS.find((t) => t.key === sel) ?? null;

  const pick = (key: TermKey) => {
    setSel(key === sel ? null : key);
    setTried((p) => new Set(p).add(key));
  };

  return (
    <Panel>
      <SectionTitle step={1}>取引マップ（誰と誰の間の取引？）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ネットの取引は<b className="text-gray-800">相手が誰か＋何が流れるか</b>で呼び名が決まります。
        用語をタップして、マップのどこが光るか見てみましょう。
      </p>

      {/* 用語チップ */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {TERMS.map((t) => (
          <button
            key={t.key}
            onClick={() => pick(t.key)}
            className={`rounded-lg px-1 py-2 text-[11px] font-bold transition active:scale-95 ${
              sel === t.key ? t.chip : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            <span className="block text-base">{t.emo}</span>
            {t.name}
          </button>
        ))}
      </div>

      {/* マップ */}
      <div className="relative mt-3 h-44 rounded-xl bg-gray-50 ring-1 ring-gray-200">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {(Object.keys(LINES) as TermKey[]).map((key) => {
            const l = LINES[key];
            const active = sel === key;
            const t = TERMS.find((x) => x.key === key)!;
            return (
              <line
                key={key}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke={active ? t.stroke : "#e5e7eb"}
                strokeWidth={active ? 2.5 : 1.2}
                strokeDasharray={active ? "" : "3 2"}
                className={active ? "animate-pulse" : ""}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* 流れているもの */}
        {sel && (
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 animate-bounce text-xl"
            style={{ left: `${MID[sel].x}%`, top: `${MID[sel].y}%` }}
          >
            {MID[sel].emo}
          </span>
        )}

        {/* ノード */}
        {NODES.map((n) => {
          const lit = sel !== null && LIT[sel].includes(n.id);
          return (
            <div
              key={n.id}
              className={`absolute w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 px-1 py-1.5 text-center transition ${
                lit ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100" : "border-gray-200 bg-white"
              }`}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <div className="text-xl leading-none">{n.emo}</div>
              <div className="mt-0.5 text-[10px] font-bold text-gray-700">{n.label}</div>
            </div>
          );
        })}
      </div>

      {/* 説明 */}
      {term ? (
        <div className={`mt-3 rounded-xl px-4 py-3 ring-1 ${term.badge}`}>
          <div className="text-sm font-bold">
            {term.emo} {term.name} ＝ <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs">{term.who}</span>{" "}
            {term.flow}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed">{term.d}</p>
          <p className="mt-1 text-xs opacity-80">{term.ex}</p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400 ring-1 ring-gray-200">
          上の用語をタップすると、取引の線が光ります。
        </div>
      )}

      {tried.size === TERMS.length && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
          💡 4つとも「ネットを使った取引」。違いは<b>相手が誰か＋何が流れるか</b>だけ。特に
          <b>EC＝企業→個人の売買／EDI＝企業どうしのデータ交換</b>の混同に注意！
        </div>
      )}
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "メーカーと卸売業者が、発注・納品・請求のデータを決まった形式で自動的にやり取りしている。",
    ans: "EDI",
    opts: ["EDI", "EC", "シェアリングエコノミー"],
    why: "企業間の取引データ交換＝EDI。",
  },
  {
    t: "スマホアプリで通販サイトにアクセスし、消費者が直接商品を購入した。",
    ans: "EC",
    opts: ["EC", "EDI", "フィンテック"],
    why: "ネット上の消費者向け売買＝EC（電子商取引）。",
  },
  {
    t: "銀行に行かず、スマホのアプリで送金や残高管理ができるサービスを使った。",
    ans: "フィンテック",
    opts: ["フィンテック", "EDI", "EC"],
    why: "金融×IT＝フィンテック。",
  },
  {
    t: "使っていない自家用車を、アプリを通じて他の個人に貸し出した。",
    ans: "シェアリングエコノミー",
    opts: ["シェアリングエコノミー", "EDI", "EC"],
    why: "個人どうしでモノを共有・貸し借り＝シェアリングエコノミー。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>これはどれ？</SectionTitle>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function EbusinessExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🌐 ネットを使った取引は<b>相手が誰か</b>で呼び名が変わります。
        <b>EC＝消費者向け売買／EDI＝企業間データ交換／フィンテック＝金融×IT／シェアリング＝個人間共有</b>。
      </div>

      <TradeMap />
      <Quiz />
    </div>
  );
}
