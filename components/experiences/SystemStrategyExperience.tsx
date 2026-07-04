"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「システム戦略」専用の体験。
//   ① 社長シミュレータ … 「とりあえずIT導入」と「目的から決める」の
//      2つの進め方を選んで進めると、会社の結末が変わる
//   ② システム戦略の考え方として適切か クイズ
// ============================================================================

type Route = "hype" | "goal";

const ROUTES: Record<
  Route,
  { steps: { emo: string; label: string; text: string }[]; result: { good: boolean; text: string } }
> = {
  hype: {
    steps: [
      { emo: "✨", label: "導入を決定", text: "「最新のAIシステムが話題らしい。うちも入れよう！」——何のためかは、まだ決めていない。" },
      { emo: "💸", label: "お金を払う", text: "導入費用500万円。現場から「これ…何に使うんですか？」の声。目的がないので答えられない。" },
      { emo: "🤷", label: "使われない", text: "使い道があいまいなまま放置。効果を測る物差しも決めていないので、役立ったかも分からない。" },
    ],
    result: { good: false, text: "📉 結末：売上は変わらず、お金だけ減った。「入れること」がゴールになると、こうなりがち。" },
  },
  goal: {
    steps: [
      { emo: "🎯", label: "目的を決める", text: "まず経営の目的から。「常連のお客さんを増やして、売上を伸ばしたい」。" },
      { emo: "🛠️", label: "手段を選ぶ", text: "目的に合うITを手段として選ぶ。「常連を増やすなら、ポイントが貯まるアプリが合いそうだ」。" },
      { emo: "📈", label: "効果を測る", text: "導入前に「リピート率」で効果を測ると決めておく。導入後、リピート率+8%——目的に効いたと確認できた。" },
    ],
    result: { good: true, text: "🎉 結末：常連が増えて売上アップ！ 目的 → 手段 → 効果の順で考えたから、ITがちゃんと役立った。" },
  },
};

function CeoLab() {
  const [route, setRoute] = useState<Route | null>(null);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState<Set<Route>>(new Set());
  const bothTried = tried.has("hype") && tried.has("goal");

  const choose = (r: Route) => {
    setRoute(r);
    setStep(0);
    setTried((p) => new Set(p).add(r));
  };

  const cur = route ? ROUTES[route] : null;
  const atEnd = cur ? step >= cur.steps.length - 1 : false;

  return (
    <Panel>
      <SectionTitle step={1}>社長になって、IT導入を進めてみよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたはパン屋の社長。<b className="text-gray-800">「売上が伸び悩んでいる。ITで何とかしたい」</b>。
        2つの進め方を両方試して、結末を比べてみよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => choose("hype")}
          className={`rounded-xl px-2 py-2.5 text-xs font-bold transition active:scale-95 ${
            route === "hype" ? "bg-rose-500 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          ✨ 話題のAIシステムを
          <br />
          とりあえず導入！{tried.has("hype") && " ✓"}
        </button>
        <button
          onClick={() => choose("goal")}
          className={`rounded-xl px-2 py-2.5 text-xs font-bold transition active:scale-95 ${
            route === "goal" ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          🎯 まず「何のためか」
          <br />
          目的から決める{tried.has("goal") && " ✓"}
        </button>
      </div>

      {route && cur && (
        <div
          className={`mt-3 rounded-xl p-3 ring-1 ${
            route === "goal" ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
          }`}
        >
          {/* 進行チップ */}
          <div className="flex gap-1.5">
            {cur.steps.map((s, i) => (
              <div
                key={i}
                className={`flex-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold transition ${
                  i === step
                    ? route === "goal"
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-500 text-white"
                    : i < step
                      ? route === "goal"
                        ? "bg-emerald-200 text-emerald-800"
                        : "bg-rose-200 text-rose-800"
                      : "bg-white text-gray-400 ring-1 ring-gray-200"
                }`}
              >
                {s.emo} {s.label}
              </div>
            ))}
          </div>

          <p className="mt-2.5 min-h-[3.5em] rounded-lg bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-100">
            {cur.steps[step].emo} <b>{cur.steps[step].label}</b>：{cur.steps[step].text}
          </p>

          {!atEnd ? (
            <button
              onClick={() => setStep((v) => v + 1)}
              className={`mt-2.5 w-full rounded-lg py-2 text-sm font-bold text-white active:scale-95 ${
                route === "goal" ? "bg-emerald-600" : "bg-rose-500"
              }`}
            >
              次へ →
            </button>
          ) : (
            <div
              className={`mt-2.5 rounded-lg px-3 py-2.5 text-sm font-extrabold ring-1 ${
                cur.result.good
                  ? "bg-white text-emerald-700 ring-emerald-200"
                  : "bg-white text-rose-700 ring-rose-200"
              }`}
            >
              {cur.result.text}
            </div>
          )}
        </div>
      )}

      {bothTried && (
        <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900 ring-1 ring-indigo-200">
          💡 <b>気づいた？</b>　同じ「IT導入」でも、<b>目的 → 手段 → 効果</b>の順で考えるかどうかで結末が正反対。
          ITは<b>目的ではなく手段</b>——この考え方が<b>システム戦略</b>です。ITで会社を変える取り組みは <b>DX</b> とも呼ばれます。
        </div>
      )}

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 勉強アプリを入れること自体がゴールではなく、<b>成績を上げるためにどう使うか</b>を考えるのと同じ。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "経営目標の達成に向けてITの使い方を考える", ok: true, why: "システム戦略そのもの。目的に役立てる視点。" },
  { t: "流行っている技術を、目的なく入れる", ok: false, why: "手段が目的化している。効果を出しにくい。" },
  { t: "導入後に効果を測り、改善につなげる", ok: true, why: "効果測定は戦略の大事な一部。" },
  { t: "プログラムの細かい文法だけを先に決める", ok: false, why: "それは実装の話。戦略はもっと上の「目的と活用」。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>システム戦略の考え方として正しい？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "⭕ 正しい" },
                  { v: false, label: "🙅 ちがう" },
                ].map((opt) => {
                  const picked = chosen === opt.v;
                  const tone = !answered
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
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

export default function SystemStrategyExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧩 <b>システム戦略</b>は、会社の目標を達成するためにITを<b>どう活用するか</b>を考えること。
        ITを入れること自体が目的ではなく、あくまで<b>手段</b>です。
      </div>

      <CeoLab />
      <Quiz />
    </div>
  );
}
