"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「知的財産権と著作権」専用の体験。
//   ① 知的財産権は「総称」。その中に著作権/特許権/商標権がある（包含イメージ）
//   ② 何を守る権利かをタップで確認（作品/発明/名前ロゴ）
//   ③ この成果物はどの権利？ 振り分けクイズ
// ============================================================================

type Right = "copyright" | "patent" | "trademark";

const RIGHTS: Record<Right, { name: string; emoji: string; protects: string; ex: string; need: string; color: string }> = {
  copyright: {
    name: "著作権",
    emoji: "🎨",
    protects: "文章・音楽・画像・プログラムなどの作品",
    ex: "例：イラスト、小説、楽曲、写真、アプリのコード",
    need: "創作した時点で自動的に発生（申請不要）",
    color: "rose",
  },
  patent: {
    name: "特許権",
    emoji: "💡",
    protects: "新しい技術・発明（仕組みやアイデア）",
    ex: "例：新しい充電方式、便利な機械の仕組み",
    need: "特許庁に出願して認められる必要がある",
    color: "amber",
  },
  trademark: {
    name: "商標権",
    emoji: "®️",
    protects: "商品名・サービス名・ロゴマーク",
    ex: "例：ブランド名、企業ロゴ、商品の名前",
    need: "特許庁に出願して登録する",
    color: "sky",
  },
};

const TONE: Record<string, { on: string; off: string }> = {
  rose: { on: "bg-rose-500 text-white ring-rose-500", off: "bg-rose-50 text-rose-700 ring-rose-200" },
  amber: { on: "bg-amber-500 text-white ring-amber-500", off: "bg-amber-50 text-amber-700 ring-amber-200" },
  sky: { on: "bg-sky-500 text-white ring-sky-500", off: "bg-sky-50 text-sky-700 ring-sky-200" },
};

const ORDER: Right[] = ["copyright", "patent", "trademark"];

function Nested() {
  const [sel, setSel] = useState<Right | null>(null);
  return (
    <Panel>
      <SectionTitle step={1}>知的財産権は「まとめ役」の名前</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">知的財産権</b>は、人が考えて生み出した成果を守る権利の<b>総称</b>。
        その中に、守る対象ごとの権利があります。
      </p>

      {/* 包含イメージ */}
      <div className="mt-4 rounded-2xl bg-indigo-50 p-3 ring-2 ring-indigo-200">
        <div className="text-center text-xs font-extrabold text-indigo-700">📚 知的財産権（総称）</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {ORDER.map((r) => {
            const card = RIGHTS[r];
            const on = sel === r;
            const tone = TONE[card.color];
            return (
              <button
                key={r}
                onClick={() => setSel(r)}
                className={`flex flex-col items-center rounded-xl p-2.5 ring-2 transition active:scale-95 ${
                  on ? tone.on : tone.off
                } ${on ? "" : "bg-white"}`}
              >
                <span className="text-2xl leading-none">{card.emoji}</span>
                <span className="mt-1 text-xs font-extrabold">{card.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 min-h-[5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {sel ? (
          <>
            <div className="text-sm font-extrabold text-gray-800">
              {RIGHTS[sel].emoji} {RIGHTS[sel].name}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">守るもの：{RIGHTS[sel].protects}</p>
            <p className="mt-1 text-xs text-gray-500">{RIGHTS[sel].ex}</p>
            <p className="mt-1.5 text-xs font-bold text-indigo-600">📌 {RIGHTS[sel].need}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">3つのうちどれかをタップしてね。</span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>著作権は作った瞬間に自動で発生</b>（申請不要）。一方、<b>特許権・商標権は出願・登録が必要</b>。
        ここが大きな違い。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: Right; why: string }[] = [
  { t: "自分で描いたイラスト", ans: "copyright", why: "作品＝著作権。描いた瞬間に発生。" },
  { t: "新しい掃除ロボットの仕組み", ans: "patent", why: "技術・発明＝特許権。出願が必要。" },
  { t: "お店のロゴマークと商品名", ans: "trademark", why: "名前・ロゴ＝商標権。登録して守る。" },
  { t: "作曲したオリジナル曲", ans: "copyright", why: "音楽の作品＝著作権。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, Right>>({});
  return (
    <Panel>
      <SectionTitle step={2}>どの権利で守る？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
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
                      {RIGHTS[opt].emoji} {RIGHTS[opt].name}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${RIGHTS[it.ans].name}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        ⚠️ ネットで見つけた画像や音楽も<b>誰かの著作物</b>。勝手に使うのは著作権の侵害になりえます。
      </div>
    </Panel>
  );
}

export default function IntellectualPropertyExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ <b>知的財産権</b>は、人の創作やアイデアを守る権利の総称。
        <b>著作権＝作品</b>、<b>特許権＝発明</b>、<b>商標権＝名前・ロゴ</b>、と「何を守るか」で分かれます。
      </div>

      <Nested />
      <Quiz />
    </div>
  );
}
