"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「e-ビジネス（EC・EDI・フィンテック・シェアリング）」専用の体験。
//   ① 用語を「誰と誰の取引か」で対比（タップ）
//   ② 「これはどれ？」仕分けクイズ
// ============================================================================

type Term = {
  key: string;
  emo: string;
  name: string;
  who: string;
  d: string;
  ex: string;
  tone: string;
};

const TERMS: Term[] = [
  {
    key: "ec",
    emo: "🛒",
    name: "EC（電子商取引）",
    who: "企業 ⇄ 消費者が中心",
    d: "インターネット上での売買。ネット通販やアプリでの買い物など、主に消費者向けの取引。",
    ex: "例：ネットショップで服を買う",
    tone: "bg-sky-50 ring-sky-300 text-sky-900",
  },
  {
    key: "edi",
    emo: "🔁",
    name: "EDI（電子データ交換）",
    who: "企業 ⇄ 企業",
    d: "企業どうしが、注文・納品・請求などのデータを決まった形式で電子的にやり取りするしくみ。",
    ex: "例：取引先へ発注データを自動送信",
    tone: "bg-emerald-50 ring-emerald-300 text-emerald-900",
  },
  {
    key: "fintech",
    emo: "💳",
    name: "フィンテック",
    who: "金融 × IT",
    d: "金融（Finance）とIT（Technology）を組み合わせたサービス。スマホ決済・送金・家計管理など。",
    ex: "例：スマホのQRコード決済",
    tone: "bg-violet-50 ring-violet-300 text-violet-900",
  },
  {
    key: "sharing",
    emo: "🤝",
    name: "シェアリングエコノミー",
    who: "個人 ⇄ 個人",
    d: "使っていないモノ・場所・スキルを、個人どうしで貸し借り・共有するしくみ。",
    ex: "例：空き部屋を旅行者に貸す",
    tone: "bg-amber-50 ring-amber-300 text-amber-900",
  },
];

function Terms() {
  const [open, setOpen] = useState<string | null>("edi");
  return (
    <Panel>
      <SectionTitle step={1}>「誰と誰の取引か」で区別する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ネットを使った取引も、<b className="text-gray-800">相手が誰か</b>で呼び方が変わります。
        タップして見比べましょう。
      </p>
      <div className="mt-3 space-y-2">
        {TERMS.map((t) => {
          const picked = open === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setOpen(picked ? null : t.key)}
              className={`block w-full rounded-xl p-3 text-left ring-1 transition active:scale-[0.99] ${
                picked ? t.tone + " ring-2" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg">{t.emo}</span>
                <span className="text-sm font-extrabold text-gray-800">{t.name}</span>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-gray-500 ring-1 ring-gray-200">
                  {t.who}
                </span>
              </div>
              {picked && (
                <div className="mt-2">
                  <p className="text-[13px] leading-relaxed text-gray-600">{t.d}</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">{t.ex}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>EC＝消費者向けの売買</b>／<b>EDI＝企業どうしのデータ交換</b>。この2つの混同に注意。
      </p>
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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🌐 ネットを使った取引は<b>相手が誰か</b>で呼び名が変わります。
        <b>EC＝消費者向け売買／EDI＝企業間データ交換／フィンテック＝金融×IT／シェアリング＝個人間共有</b>。
      </div>

      <Terms />
      <Quiz />
    </div>
  );
}
