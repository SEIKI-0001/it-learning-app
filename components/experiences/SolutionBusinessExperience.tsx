"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ソリューションビジネス」専用の体験。
//   ① 営業シミュレータ … お客の悩みに「モノを売る」「課題を聞く」の
//      2通りで応対してみると、結末が変わる
//   ② ソリューションビジネスらしいのはどれ？ クイズ
// ============================================================================

type Route = "product" | "solution";

// 課題解決ルートの段階
const SOLUTION_STEPS = [
  {
    emo: "👂",
    label: "課題を聞く",
    customer: "「通学が長くて机に向かう時間がなくて…紙の手帳も続かなかったんです」",
    note: "悩みの正体が見えてきた：①スキマ時間しかない ②紙だと続かない",
  },
  {
    emo: "🧩",
    label: "組み合わせる",
    customer: null,
    note: "スマホの学習アプリ＋通知リマインド＋週1の使い方サポート——ITとサービスを組み合わせて解決策を設計。",
  },
  {
    emo: "📝",
    label: "提案する",
    customer: "「電車の中でできて、続く仕組みまで付いてるんですね。それなら解決しそう！😊」",
    note: "商品ではなく「課題が解けた状態」を届けられた。これがソリューションビジネス。",
  },
];

function SalesLab() {
  const [route, setRoute] = useState<Route | null>(null);
  const [step, setStep] = useState(0); // solutionルートの進行
  const [tried, setTried] = useState<Set<Route>>(new Set());
  const bothTried = tried.has("product") && tried.has("solution");

  const choose = (r: Route) => {
    setRoute(r);
    setStep(0);
    setTried((p) => new Set(p).add(r));
  };

  const reset = () => {
    setRoute(null);
    setStep(0);
  };

  return (
    <Panel>
      <SectionTitle step={1}>営業になって応対してみよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたはお店の営業担当。お客さんが来ました。
        <b className="text-gray-800">2通りの応対</b>を両方試して、結末を比べてみよう。
      </p>

      {/* お客の悩み */}
      <div className="mt-3 flex items-start gap-2">
        <span className="text-2xl">🙍</span>
        <div className="flex-1 rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2.5 text-sm leading-relaxed text-gray-700">
          「うーん…勉強の時間がうまく作れなくて困ってるんです…」
        </div>
      </div>

      {/* 応対の選択 */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => choose("product")}
          className={`rounded-xl px-2 py-2.5 text-xs font-bold transition active:scale-95 ${
            route === "product" ? "bg-gray-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          📦 「この人気の手帳、
          <br />
          いかがですか！」{tried.has("product") && " ✓"}
        </button>
        <button
          onClick={() => choose("solution")}
          className={`rounded-xl px-2 py-2.5 text-xs font-bold transition active:scale-95 ${
            route === "solution" ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          👂 「くわしく
          <br />
          聞かせてください」{tried.has("solution") && " ✓"}
        </button>
      </div>

      {/* モノ売りルートの結末 */}
      {route === "product" && (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🙍</span>
            <div className="flex-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm leading-relaxed text-gray-700 ring-1 ring-rose-100">
              「…手帳はもう持ってるんです。紙だと続かなくて。これじゃないんだよなあ…😕」
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-rose-800">
            ❌ <b>モノ売り（製品販売）</b>：悩みを聞かずに商品単体をすすめたので、外れてしまった。
            製品は渡せても、<b>課題が解けるとは限らない</b>。
          </p>
        </div>
      )}

      {/* 課題解決ルート（段階で進む） */}
      {route === "solution" && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          {/* 進行チップ */}
          <div className="flex gap-1.5">
            {SOLUTION_STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold transition ${
                  i === step
                    ? "bg-emerald-600 text-white"
                    : i < step
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-white text-gray-400 ring-1 ring-gray-200"
                }`}
              >
                {s.emo} {s.label}
              </div>
            ))}
          </div>

          {SOLUTION_STEPS[step].customer && (
            <div className="mt-2.5 flex items-start gap-2">
              <span className="text-2xl">{step === SOLUTION_STEPS.length - 1 ? "🙆" : "🙍"}</span>
              <div className="flex-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm leading-relaxed text-gray-700 ring-1 ring-emerald-100">
                {SOLUTION_STEPS[step].customer}
              </div>
            </div>
          )}
          <p className="mt-2 text-xs leading-relaxed text-emerald-900">
            {SOLUTION_STEPS[step].emo} <b>{SOLUTION_STEPS[step].label}</b>：{SOLUTION_STEPS[step].note}
          </p>

          {step < SOLUTION_STEPS.length - 1 ? (
            <button
              onClick={() => setStep((v) => v + 1)}
              className="mt-2.5 w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white active:scale-95"
            >
              次へ →
            </button>
          ) : (
            <div className="mt-2.5 rounded-lg bg-white px-3 py-2 text-center text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              🎉 課題解決！ 聞く → 組み合わせる → 提案する
            </div>
          )}
        </div>
      )}

      {bothTried && (
        <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900 ring-1 ring-indigo-200">
          💡 <b>気づいた？</b>　同じお客でも、<b>商品から始めると外れ、課題から始めると解決</b>した。
          顧客の課題をITやサービスを<b>組み合わせて</b>解決するのが<b>ソリューションビジネス</b>です。
        </div>
      )}

      {route && (
        <button
          onClick={reset}
          className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold text-gray-500 ring-1 ring-gray-300 active:scale-95"
        >
          ↺ もう一度応対する
        </button>
      )}

      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 システム構築を請け負う <b>SI（システムインテグレーション）</b> や、業務を外部に任せる
        <b>アウトソーシング</b> も、課題解決を支える形態です。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "顧客の悩みを聞き、最適な仕組みを組んで提案する", ok: true, why: "課題解決＝ソリューションビジネスそのもの。" },
  { t: "とにかく一番高い製品をすすめて売る", ok: false, why: "課題を聞かず製品を押し付けるのはモノ売り。" },
  { t: "顧客の課題を聞かずに、自社製品だけを案内する", ok: false, why: "ヒアリングと課題解決が抜けている。" },
  { t: "複数のITやサービスを組み合わせて課題を解決する", ok: true, why: "組み合わせて解くのがソリューションの特徴。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>ソリューションビジネスらしいのは？</SectionTitle>
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
                  { v: true, label: "🧩 らしい" },
                  { v: false, label: "📦 ちがう" },
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

export default function SolutionBusinessExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧩 <b>ソリューションビジネス</b>は、製品を売るのではなく<b>顧客の課題を解決</b>するビジネス。
        悩みを聞き、ITやサービスを組み合わせて提案します。
      </div>

      <SalesLab />
      <Quiz />
    </div>
  );
}
