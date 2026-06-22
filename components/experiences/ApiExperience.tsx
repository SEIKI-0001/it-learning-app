"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「API」専用の体験。
//   ① レストランのたとえ（客＝アプリ / 注文口＝API / 厨房＝サービス内部）
//   ② API連携の流れ（リクエスト→処理→レスポンス→表示）をStepで実演
//   ③ これはAPI？ 仕分けクイズ
// ============================================================================

function Restaurant() {
  return (
    <Panel>
      <SectionTitle step={1}>レストランでたとえる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        APIは<b className="text-gray-800">レストランの注文口</b>のようなもの。客は厨房に入らず、決まった方法で頼みます。
      </p>

      <div className="mt-4 flex items-stretch justify-center gap-1.5">
        <div className="flex-1 rounded-xl border-2 border-indigo-300 bg-indigo-50 px-1 py-3 text-center">
          <div className="text-2xl">🙋</div>
          <div className="mt-1 text-xs font-extrabold text-indigo-700">客</div>
          <div className="text-[10px] text-gray-500">あなたのアプリ</div>
        </div>
        <span className="self-center text-lg text-gray-300">→</span>
        <div className="flex-1 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-1 py-3 text-center">
          <div className="text-2xl">🧑‍🍳</div>
          <div className="mt-1 text-xs font-extrabold text-emerald-700">注文口＝API</div>
          <div className="text-[10px] text-gray-500">決まった頼み方</div>
        </div>
        <span className="self-center text-lg text-gray-300">→</span>
        <div className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-100 px-1 py-3 text-center">
          <div className="text-2xl">🍳</div>
          <div className="mt-1 text-xs font-extrabold text-gray-700">厨房</div>
          <div className="text-[10px] text-gray-500">サービス内部</div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm leading-relaxed text-gray-600">
        <p>🙋 客（アプリ）は<b className="text-gray-800">厨房の中を知らなくてもいい</b>。注文口に頼むだけ。</p>
        <p>🧑‍🍳 注文口（API）が<b className="text-gray-800">決まった形式</b>で受け付け、厨房に伝える。</p>
        <p>🍳 厨房（サービス内部）は<b className="text-gray-800">外から見えない</b>。中身を変えても注文口が同じなら客は困らない。</p>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 だからAPIは「<b>機能を使うための決まった入口</b>」。内部を全部公開するわけではありません。
      </div>
    </Panel>
  );
}

const NODES = [
  { id: "app", emoji: "📱", name: "地図アプリ", sub: "あなた側" },
  { id: "api", emoji: "🔌", name: "地図API", sub: "入口" },
  { id: "svc", emoji: "🗺️", name: "地図サービス", sub: "内部" },
];

const STEPS = [
  { active: ["app", "api"], holder: "api", dir: "→", html: "アプリが地図APIに<b>リクエスト</b>：「東京駅の地図がほしい」と決まった形式で頼む。" },
  { active: ["api", "svc"], holder: "svc", dir: "→", html: "API経由でサービスが処理。<b>内部のしくみはアプリから見えない</b>。" },
  { active: ["svc", "api"], holder: "api", dir: "←", html: "結果（地図データ）を<b>レスポンス</b>として返す。形式は決まっているので扱いやすい。" },
  { active: ["api", "app"], holder: "app", dir: "←", html: "アプリが受け取った地図を<b>画面に表示</b>。地図機能を自分で作らずに使えた！" },
];

function Flow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  return (
    <Panel>
      <SectionTitle step={2}>API連携の流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「地図を表示したいアプリ」が<b className="text-gray-800">地図API</b>を使う様子を1歩ずつ。
      </p>

      <div className="mt-4 flex items-stretch justify-center gap-1.5">
        {NODES.map((n, i) => {
          const on = step.active.includes(n.id);
          const holds = step.holder === n.id;
          return (
            <div key={n.id} className="flex items-center">
              <div
                className={`relative w-[92px] rounded-xl border-2 px-1 py-2.5 text-center transition ${
                  on ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100" : "border-gray-200 bg-gray-50"
                }`}
              >
                {holds && <span className="absolute -top-3 right-1 text-base">📨</span>}
                <div className="text-2xl leading-none">{n.emoji}</div>
                <div className="mt-1 text-[11px] font-extrabold text-gray-800">{n.name}</div>
                <div className="text-[10px] leading-tight text-gray-500">{n.sub}</div>
              </div>
              {i < NODES.length - 1 && <span className="px-0.5 text-lg text-gray-300">{step.dir}</span>}
            </div>
          );
        })}
      </div>

      <p
        className="mt-4 min-h-[3.5em] rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-emerald-200 [&_b]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: step.html }}
      />

      <StepNav
        index={idx}
        total={STEPS.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="連携で完成 🎉"
      />
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-2.5 text-xs leading-relaxed text-gray-500 ring-1 ring-gray-200">
        頼む側＝<b>リクエスト</b>、返す側＝<b>レスポンス</b>。Webで使うAPIは <b>Web API</b> と呼ばれ、データは <b>JSON</b> などの形式でやり取りされます。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "天気サービスの天気データを、自分のアプリから呼び出して表示する", ok: true, why: "外部サービスの機能を決まった入口で使う＝APIの典型。" },
  { t: "決済サービスと連携して、自分のサイトで支払いを処理する", ok: true, why: "サービス連携の代表例。決済APIを使う。" },
  { t: "アプリのボタンの色を変える", ok: false, why: "これは画面デザインの話。APIとは別物。" },
  { t: "サービスの内部処理をすべて外に公開すること", ok: false, why: "APIは決まった入口を出すだけ。内部を全公開はしない。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはAPIの考え方に合う？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const has = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { v: true, label: "⭕ 合う" },
                  { v: false, label: "❌ ちがう" },
                ].map((o) => {
                  const picked = chosen === o.v;
                  const tone = !has
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? o.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : o.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(o.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: o.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {has && (
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

export default function ApiExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔌 <b>API</b> は、あるソフトの機能やデータを別のソフトから使うための<b>決まった入口</b>。
        レストランの注文口のように、客（アプリ）は厨房に入らず、決まった頼み方で料理（機能）を受け取ります。
      </div>

      <Restaurant />
      <Flow />
      <Quiz />
    </div>
  );
}
