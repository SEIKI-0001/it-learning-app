"use client";

import { useState, type ReactNode } from "react";
import { KindLegend, type NodeKey, type TermKey } from "./ebiz/TradeFlowMap";
import { TradeTownScene } from "./ebiz/TradeTownScene";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";
import Icon, { type IconName } from "@/components/ui/Icon";

// ============================================================================
// 「e-ビジネス（EC・EDI・フィンテック・シェアリング）」専用の体験。
//   ① 取引マップ … 用語をタップ→街の3D模型で「誰と誰の間で・何が流れるか」を①②③の順に運ぶ
//      （モノ・お金・情報を色分け。フィンテックはスマホ、シェアリングは仲介サービスを経由）
//   ② 「これはどれ？」仕分けクイズ
// ============================================================================

type Term = {
  key: TermKey;
  icon: IconName;
  name: string;
  chip: string; // 選択中チップの色
  /** 模型の中に出す一言 */
  caption: ReactNode;
  /** 一言が指す登場人物 */
  focus: NodeKey;
  note?: string;
};

const TERMS: Term[] = [
  {
    key: "ec",
    icon: "cart",
    name: "EC",
    caption: <><b>EC</b>＝ネット売買。顧客が注文・支払い、店が商品を届ける</>,
    focus: "compA",
    note: "※ 企業→消費者＝BtoC、企業どうし＝BtoB、フリマアプリのような個人どうしの売買＝CtoC。",
    chip: "bg-brand-600 text-white",
  },
  {
    key: "edi",
    icon: "rotate",
    name: "EDI",
    caption: <><b>EDI</b>＝企業間で発注・納品・請求を<b>データで交換</b></>,
    focus: "compB",
    chip: "bg-brand-600 text-white",
  },
  {
    key: "fintech",
    icon: "smartphone",
    name: "フィンテック",
    caption: <><b>フィンテック</b>＝金融×IT。スマホで支払い・送金</>,
    focus: "phone",
    chip: "bg-brand-600 text-white",
  },
  {
    key: "sharing",
    icon: "handshake",
    name: "シェアリング",
    caption: <><b>シェアリング</b>＝個人どうしで車などを貸し借り</>,
    focus: "platform",
    chip: "bg-amber-500 text-white",
  },
];

function TradeMap() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<TermKey | null>(null);
  const [runKey, setRunKey] = useState(0);
  const term = TERMS.find((t) => t.key === sel) ?? null;

  const pick = (key: TermKey) => {
    setSel(key === sel ? null : key);
    setRunKey((k) => k + 1);
  };

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
            <Icon name={t.icon} className="mx-auto mb-0.5 h-4 w-4" />
            {t.name}
          </button>
        ))}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <TradeTownScene
          sel={sel}
          runKey={runKey}
          reducedMotion={reducedMotion}
          caption={
            term
              ? { id: `${term.key}-${runKey}`, text: term.caption, tone: "info", focus: term.focus }
              : { id: "none", text: <>用語を選ぶと、モノ・お金・情報が動き出す</>, tone: "info" }
          }
        />
      </div>
      <div className="mt-1.5">
        <KindLegend />
      </div>

      {term?.note && <p className="mt-2 text-xs leading-relaxed text-gray-500">{term.note}</p>}
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
                  {correct ? "正解！ " : `正解は「${q.ans}」。 `}
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
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        ネットを使った取引は<b>相手が誰か</b>で呼び名が変わります。
        <b>EC＝消費者向け売買／EDI＝企業間データ交換／フィンテック＝金融×IT／シェアリング＝個人間共有</b>。
      </div>

      <TradeMap />
      <Quiz />
    </div>
  );
}
