"use client";

import { useState } from "react";
import { FLOWS, KindLegend, STEP_MS, TradeFlowMap, kindColor, kindName, type TermKey } from "./ebiz/TradeFlowMap";
import styles from "./ebiz/ebiz.module.css";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「e-ビジネス（EC・EDI・フィンテック・シェアリング）」専用の体験。
//   ① 取引マップ … 用語をタップ→「誰と誰の間で・何が流れるか」を①②③の順に流す
//      （モノ📦・お金💴・情報📄を色分け。フィンテックはスマホ、シェアリングは仲介サービスを経由）
//   ② 「これはどれ？」仕分けクイズ
// ============================================================================

type Term = {
  key: TermKey;
  emo: string;
  name: string;
  who: string;
  flow: string;
  d: string;
  ex: string;
  chip: string; // 選択中チップの色
  badge: string; // 説明バッジの色
  note?: string;
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
    note: "※ 企業→消費者＝BtoC、企業どうし＝BtoB、フリマアプリのような個人どうしの売買＝CtoC。",
    chip: "bg-sky-600 text-white",
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
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
  },
];

function TradeMap() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<TermKey | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [tried, setTried] = useState<Set<TermKey>>(new Set());
  const term = TERMS.find((t) => t.key === sel) ?? null;
  const steps = sel ? FLOWS[sel] : [];

  const pick = (key: TermKey) => {
    setSel(key === sel ? null : key);
    setRunKey((k) => k + 1);
    setTried((p) => new Set(p).add(key));
  };

  // 定義文は流れを見終わってから出す（先に図から違いをつかむ）
  const defDelay = reducedMotion ? 0 : steps.length * STEP_MS;
  const fade = (delay: number) => (reducedMotion ? undefined : { animationDelay: `${delay}ms` });
  const fadeClass = reducedMotion ? "" : styles.row;

  return (
    <Panel>
      <SectionTitle step={1}>取引マップ（誰と誰の間の取引？）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ネットの取引は<b className="text-gray-800">相手が誰か＋何が流れるか</b>で呼び名が決まります。
        用語をタップすると、<b className="text-gray-800">モノ・お金・情報</b>が①②③の順に流れます。
      </p>

      {/* 用語チップ */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {TERMS.map((t) => (
          <button
            key={t.key}
            onClick={() => pick(t.key)}
            aria-pressed={sel === t.key}
            className={`rounded-lg px-1 py-2 text-[11px] font-bold transition active:scale-95 ${
              sel === t.key ? t.chip : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            <span className="block text-base">{t.emo}</span>
            {t.name}
          </button>
        ))}
      </div>

      <TradeFlowMap sel={sel} runKey={runKey} reducedMotion={reducedMotion} />
      <div className="mt-1.5">
        <KindLegend />
      </div>

      {/* 流れの順番（トークンが出発するタイミングで1行ずつ増える） */}
      {sel && (
        <ol key={`steps-${runKey}`} className="mt-2 space-y-1" data-testid="ebiz-steps">
          {steps.map((s, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-xs ring-1 ring-gray-200 ${fadeClass}`}
              style={fade(i * STEP_MS)}
            >
              <span className="grid h-4 w-4 flex-none place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: kindColor(s.kind) }}>
                {i + 1}
              </span>
              <span className="flex-none font-bold" style={{ color: kindColor(s.kind) }}>
                {kindName(s.kind)}
              </span>
              <span className="text-gray-700">{s.text}</span>
            </li>
          ))}
        </ol>
      )}

      {/* 説明 */}
      {term ? (
        <div key={`def-${runKey}`} className={`mt-3 rounded-xl px-4 py-3 ring-1 ${term.badge} ${fadeClass}`} style={fade(defDelay)}>
          <div className="text-sm font-bold">
            {term.emo} {term.name} ＝ <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs">{term.who}</span>{" "}
            {term.flow}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed">{term.d}</p>
          <p className="mt-1 text-xs opacity-80">{term.ex}</p>
          {term.note && <p className="mt-1 text-xs opacity-80">{term.note}</p>}
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400 ring-1 ring-gray-200">
          上の用語をタップすると、その取引で流れるものが動きます。
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
