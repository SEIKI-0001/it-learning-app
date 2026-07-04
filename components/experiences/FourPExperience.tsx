"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「マーケティングと4P分析」専用の体験。
//   ① クレープ屋開店シミュレータ：4つのPを2択で決める→客足が変わる
//   ② 具体的な決めごとを4Pに振り分けるクイズ
// ============================================================================

type P = "product" | "price" | "place" | "promotion";

const CARDS: Record<P, { name: string; emoji: string; mean: string; ex: string }> = {
  product: { name: "Product（製品）", emoji: "🍦", mean: "何を売るか", ex: "" },
  price: { name: "Price（価格）", emoji: "💴", mean: "いくらで売るか", ex: "" },
  place: { name: "Place（流通）", emoji: "📍", mean: "どこで届けるか", ex: "" },
  promotion: { name: "Promotion（販売促進）", emoji: "📣", mean: "どう知らせるか", ex: "" },
};

const ORDER: P[] = ["product", "price", "place", "promotion"];

// 各Pの2択。good=客足が増える選択。順番はバラして「左＝正解」にならないように。
const DECISIONS: {
  p: P;
  q: string;
  options: { t: string; good: boolean; ng: string }[];
}[] = [
  {
    p: "product",
    q: "何を売る？",
    options: [
      { t: "話題の新作チョコバナナ", good: true, ng: "" },
      { t: "去年と同じプレーンだけ", good: false, ng: "代わり映えせず素通りされた…" },
    ],
  },
  {
    p: "price",
    q: "いくらで売る？",
    options: [
      { t: "強気の600円", good: false, ng: "高校生には高くて手が出ない…" },
      { t: "手に取りやすい400円", good: true, ng: "" },
    ],
  },
  {
    p: "place",
    q: "どこで売る？",
    options: [
      { t: "人通りの多い昇降口前", good: true, ng: "" },
      { t: "校舎裏の空き教室", good: false, ng: "そもそも気づいてもらえない…" },
    ],
  },
  {
    p: "promotion",
    q: "どう知らせる？",
    options: [
      { t: "宣伝はしない", good: false, ng: "存在を知られないまま当日に…" },
      { t: "SNSとポスターで宣伝", good: true, ng: "" },
    ],
  },
];

function Simulator() {
  const [picks, setPicks] = useState<Partial<Record<P, number>>>({});
  const decided = DECISIONS.filter((d) => picks[d.p] !== undefined);
  const goodCount = decided.filter((d) => d.options[picks[d.p]!].good).length;
  const allDecided = decided.length === DECISIONS.length;
  const customers = 1 + goodCount * 2; // 1〜9人

  const verdict = !allDecided
    ? { text: `あと${DECISIONS.length - decided.length}つ決めると開店できるよ。`, tone: "bg-gray-50 text-gray-500 ring-gray-200" }
    : goodCount === 4
      ? { text: "🎉 行列ができた！ 4つのPが全部かみ合うと効果は最大。この組み合わせがマーケティングミックス。", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" }
      : goodCount >= 2
        ? { text: "そこそこ売れたけど…❌のPがブレーキに。どれか1つでも欠けると、他のPの努力まで薄れちゃう。", tone: "bg-amber-50 text-amber-800 ring-amber-200" }
        : { text: "ガラガラ…。いい商品でも、価格・場所・宣伝がダメなら売れない。4つはセットで考えよう。", tone: "bg-rose-50 text-rose-800 ring-rose-200" };

  return (
    <Panel>
      <SectionTitle step={1}>クレープ屋を開店してみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        文化祭で<b className="text-gray-800">クレープ屋</b>を出店。売り方の決めごとは
        <b className="text-gray-800">4つのP</b>に整理できます。選ぶたびに客足が変わるよ。
      </p>

      <div className="mt-4 space-y-3">
        {DECISIONS.map((d) => {
          const card = CARDS[d.p];
          const picked = picks[d.p];
          const badPicked = picked !== undefined && !d.options[picked].good;
          return (
            <div key={d.p}>
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="font-extrabold text-indigo-700">
                  {card.emoji} {card.name}
                </span>
                <span className="text-gray-400">＝ {card.mean}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {d.options.map((opt, oi) => {
                  const on = picked === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => setPicks((p) => ({ ...p, [d.p]: oi }))}
                      className={`rounded-lg px-2 py-2 text-[11px] font-bold leading-tight transition active:scale-95 ${
                        on
                          ? opt.good
                            ? "bg-emerald-500 text-white"
                            : "bg-rose-500 text-white"
                          : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
                      }`}
                    >
                      {opt.t}
                    </button>
                  );
                })}
              </div>
              {badPicked && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{d.options[picked!].ng}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 客足メーター */}
      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between text-xs font-bold text-gray-600">
          <span>お店の前のお客さん</span>
          <span>{allDecided ? `${customers}人` : "開店準備中…"}</span>
        </div>
        <div className="mt-1.5 min-h-[1.75em] text-xl leading-none tracking-tight">
          {allDecided ? "🙋".repeat(customers) : "🚧"}
        </div>
      </div>

      <div className={`mt-2 rounded-xl px-4 py-3 text-sm font-medium leading-relaxed ring-1 ${verdict.tone}`}>
        {verdict.text}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>「何を・いくらで・どこで・どう知らせて」</b>売るか——頭文字がぜんぶ <b>P</b>。
        4つを組み合わせて売り方を決めることを<b>マーケティングミックス</b>と呼びます。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: P; why: string }[] = [
  { t: "新作の抹茶味を増やす", ans: "product", why: "売る物・中身の話＝Product（製品）。" },
  { t: "値下げして350円にする", ans: "price", why: "いくらで売るか＝Price（価格）。" },
  { t: "ネット注文できるようにする", ans: "place", why: "どこで・どう届けるか＝Place（流通）。" },
  { t: "インフルエンサーに紹介してもらう", ans: "promotion", why: "知らせて買ってもらう＝Promotion（販売促進）。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, P>>({});
  return (
    <Panel>
      <SectionTitle step={2}>どのPの決めごと？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {ORDER.map((opt) => {
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold transition active:scale-95 ${tone}`}
                    >
                      {CARDS[opt].emoji}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${CARDS[it.ans].name}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-[11px] text-gray-400">
        ボタンの絵文字：🍦製品 / 💴価格 / 📍流通 / 📣販売促進
      </p>
    </Panel>
  );
}

export default function FourPExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛍️ <b>4P分析</b>は <b>Product（製品）・Price（価格）・Place（流通）・Promotion（販売促進）</b>
        の4つで売り方を整理する方法。「何を・いくらで・どこで・どう知らせて」売るかです。
      </div>

      <Simulator />
      <Quiz />
    </div>
  );
}
