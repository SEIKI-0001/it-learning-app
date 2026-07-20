"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「知的財産権と著作権」専用の体験。
//   ① ヒット商品の「仕組み／名前ロゴ／イラスト」をマネしてみる→どの権利の侵害かが出る
//   ② この成果物はどの権利？ 振り分けクイズ
// ============================================================================

type Right = "copyright" | "patent" | "trademark";

const RIGHTS: Record<Right, { name: string; emoji: string; protects: string; need: string }> = {
  copyright: {
    name: "著作権",
    emoji: "🎨",
    protects: "文章・音楽・画像・プログラムなどの作品",
    need: "創作した時点で自動的に発生（申請不要）",
  },
  patent: {
    name: "特許権",
    emoji: "💡",
    protects: "新しい技術・発明（仕組みやアイデア）",
    need: "特許庁に出願して認められる必要がある",
  },
  trademark: {
    name: "商標権",
    emoji: "®️",
    protects: "商品名・サービス名・ロゴマーク",
    need: "特許庁に出願して登録する",
  },
};

const ORDER: Right[] = ["copyright", "patent", "trademark"];

// ヒット商品のマネできる3か所
const PARTS: { right: Right; label: string; detail: string; verdict: string }[] = [
  {
    right: "patent",
    label: "焼きムラゼロの新機構",
    detail: "熱を均等に伝える独自の仕組み",
    verdict: "仕組み・発明のマネ＝特許権の侵害！ 発明は特許庁に出願して守られている。",
  },
  {
    right: "trademark",
    label: "商品名・ロゴ「フワクレ」",
    detail: "パッケージに輝くブランドロゴ",
    verdict: "名前・ロゴのマネ＝商標権の侵害！ お客が本物と間違えて買ってしまう。",
  },
  {
    right: "copyright",
    label: "箱のかわいいイラスト",
    detail: "描き下ろしのクレープキャラ",
    verdict: "イラスト・作品のマネ＝著作権の侵害！ 描かれた瞬間から自動で守られている。",
  },
];

function CopycatLab() {
  const [tried, setTried] = useState<Record<Right, boolean>>({
    copyright: false,
    patent: false,
    trademark: false,
  });
  const [current, setCurrent] = useState<Right | null>(null);
  const allTried = ORDER.every((r) => tried[r]);

  return (
    <Panel>
      <SectionTitle step={1}>マネして売ったらどうなる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大ヒット商品<b className="text-gray-800">「ふわふわクレープメーカー」</b>。
        あなたはライバル会社の社員です。どこかを<b className="text-gray-800">マネして</b>売ってみよう。
      </p>

      {/* 商品カード */}
      <div className="mt-4 rounded-xl bg-brand-50 p-3 ring-2 ring-brand-200">
        <div className="text-center text-sm font-bold text-brand-700">
          🥞 ふわふわクレープメーカー（大ヒット中！）
        </div>
        <div className="mt-2 space-y-2">
          {PARTS.map((p) => {
            const done = tried[p.right];
            const r = RIGHTS[p.right];
            return (
              <button
                key={p.right}
                onClick={() => {
                  setTried((prev) => ({ ...prev, [p.right]: true }));
                  setCurrent(p.right);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left ring-2 transition active:scale-[0.98] ${
                  done
                    ? "bg-rose-50 ring-rose-300"
                    : "bg-white ring-gray-200"
                }`}
              >
                <span className="text-xl leading-none">{r.emoji}</span>
                <span className="flex-1">
                  <span className="block text-xs font-bold text-gray-800">{p.label}</span>
                  <span className="block text-[10px] leading-relaxed text-gray-500">{p.detail}</span>
                </span>
                <span
                  className={`flex-none rounded-full px-2 py-1 text-[10px] font-bold ${
                    done ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {done ? "⚖️ 訴えられた" : "マネする"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 判定結果 */}
      <div className="mt-3 min-h-[5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {current ? (
          <>
            <div className="text-sm font-bold text-rose-600">
              ⚖️ {RIGHTS[current].emoji} {RIGHTS[current].name}の侵害で訴えられた！
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-700">
              {PARTS.find((p) => p.right === current)!.verdict}
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
              守るもの：{RIGHTS[current].protects}
              <br />📌 {RIGHTS[current].need}
            </p>
          </>
        ) : (
          <span className="text-sm text-gray-400">マネする場所をタップしてね。</span>
        )}
      </div>

      {allTried && (
        <div className="mt-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium leading-relaxed text-brand-900 ring-1 ring-brand-200">
          🎉 全部試したね。1つの商品でも<b>仕組み＝特許権、名前ロゴ＝商標権、イラスト＝著作権</b>と
          部分ごとに別の権利で守られている。これらをまとめた総称が<b>知的財産権</b>！
        </div>
      )}

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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ <b>知的財産権</b>は、人の創作やアイデアを守る権利の総称。
        <b>著作権＝作品</b>、<b>特許権＝発明</b>、<b>商標権＝名前・ロゴ</b>、と「何を守るか」で分かれます。
      </div>

      <CopycatLab />
      <Quiz />
    </div>
  );
}
