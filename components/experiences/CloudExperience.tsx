"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「クラウド・SaaS・PaaS・IaaS」専用の体験。
//   ① そもそもクラウドとは（自前で全部持つ ⇄ 借りる）
//   ② 提供範囲スタック：モデルを選ぶと「事業者が用意する層／自分でやる層」が変わる
//   ③ これはどれ？ 仕分けクイズ（SaaS/PaaS/IaaSを見分ける）
// ============================================================================

// スタックは上＝完成品に近い、下＝機械に近い。
// 各モデルは「下から何層を事業者が用意するか」で表す。
const LAYERS = [
  { name: "アプリ", emoji: "📱", note: "メール・会計ソフトなど完成した機能" },
  { name: "データ", emoji: "🗂️", note: "自分たちの入力・保存内容" },
  { name: "開発・実行環境", emoji: "🛠️", note: "OS・プログラムを動かす土台" },
  { name: "サーバ・設備", emoji: "🖥️", note: "機械・ネットワーク・置き場所" },
];

type Model = "オンプレ" | "IaaS" | "PaaS" | "SaaS";

// 下から数えて、事業者が用意する層数
const PROVIDER_COVERS: Record<Model, number> = {
  オンプレ: 0,
  IaaS: 1, // サーバ・設備
  PaaS: 2, // ＋開発・実行環境
  SaaS: 4, // 全部
};

const MODEL_FOOD: Record<Model, string> = {
  オンプレ: "🍚 食材も設備も全部自前で、台所から作る",
  IaaS: "🔪 食材と設備は借り、調理は自分でする",
  PaaS: "🍳 調理場つきキッチンを借り、料理だけ作る",
  SaaS: "🍱 完成したお弁当を買ってそのまま食べる",
};

const MODELS: Model[] = ["オンプレ", "IaaS", "PaaS", "SaaS"];

function WhatIsCloud() {
  return (
    <Panel>
      <SectionTitle step={1}>そもそもクラウドとは</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        クラウドは、自分で機械を買わずに<b className="text-gray-800">インターネット経由でIT資源を借りて使う</b>考え方です。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-gray-50 p-3 text-center ring-1 ring-gray-200">
          <div className="text-2xl">🏠</div>
          <div className="mt-1 text-sm font-bold text-gray-700">オンプレミス</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            機械を<b>自分で買って</b>社内に置く。自由だが手間とお金がかかる。
          </p>
        </div>
        <div className="rounded-xl bg-sky-50 p-3 text-center ring-1 ring-sky-200">
          <div className="text-2xl">☁️</div>
          <div className="mt-1 text-sm font-bold text-sky-700">クラウド</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            必要な分だけ<b>借りて使う</b>。すぐ始められ、使った分だけ払う。
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 借りる範囲の広さで <b>IaaS → PaaS → SaaS</b> と呼び名が変わります。次で見てみよう。
      </div>
    </Panel>
  );
}

function Stack() {
  const [model, setModel] = useState<Model>("SaaS");
  const covers = PROVIDER_COVERS[model];

  return (
    <Panel>
      <SectionTitle step={2}>事業者が用意する範囲</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        モデルを選ぶと、<b className="text-sky-700">事業者が用意する層</b>と
        <b className="text-brand-700">自分でやる層</b>が変わります。
      </p>

      {/* モデル選択 */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {MODELS.map((m) => (
          <button
            key={m}
            onClick={() => setModel(m)}
            className={`rounded-lg px-1 py-2 text-xs font-bold transition active:scale-95 ${
              model === m
                ? "bg-brand-600 text-white"
                : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* スタック（上から表示。下=機械に近い） */}
      <div className="mt-4 space-y-1.5">
        {LAYERS.map((layer, i) => {
          // i=0 が一番上(アプリ)、i=3 が一番下(サーバ)。下からcovers層が事業者。
          const fromBottom = LAYERS.length - 1 - i;
          const byProvider = fromBottom < covers;
          return (
            <div
              key={layer.name}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition ${
                byProvider
                  ? "bg-sky-50 ring-sky-300"
                  : "bg-brand-50 ring-brand-300"
              }`}
            >
              <span className="text-xl">{layer.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-800">{layer.name}</div>
                <div className="truncate text-[11px] text-gray-500">{layer.note}</div>
              </div>
              <span
                className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  byProvider ? "bg-sky-200 text-sky-800" : "bg-brand-200 text-brand-800"
                }`}
              >
                {byProvider ? "☁️ 事業者" : "🙋 あなた"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200">
        <b className="text-gray-900">{model}</b> は… {MODEL_FOOD[model]}
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">
        上に行くほど完成品に近く、下に行くほど機械に近い
      </p>
    </Panel>
  );
}

const ITEMS: { t: string; ans: Model; why: string }[] = [
  { t: "Gmail や Web会計ソフトを使う", ans: "SaaS", why: "完成アプリをそのまま使う＝SaaS。" },
  { t: "アプリを動かす土台だけ借り、自分のプログラムを載せる", ans: "PaaS", why: "開発・実行の土台を借りる＝PaaS。" },
  { t: "仮想サーバを借りてOSから自分で入れる", ans: "IaaS", why: "サーバ資源だけ借りる＝IaaS。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, Model>>({});
  const opts: Model[] = ["IaaS", "PaaS", "SaaS"];
  return (
    <Panel>
      <SectionTitle step={3}>これはどれ？（提供範囲で見分ける）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        次の使い方は SaaS・PaaS・IaaS のどれ？ ボタンで確かめよう。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {opts.map((opt) => {
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
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${it.ans}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ <b>PaaSとIaaSを逆に覚えがち</b>。<b>P</b>latform＝開発の土台、<b>I</b>nfrastructure＝サーバなどの基盤、と頭文字で覚えよう。
      </div>
    </Panel>
  );
}

export default function CloudExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ☁️ クラウドは「機械を持たず<b>借りて使う</b>」考え方。借りる範囲が広い順に <b>SaaS（完成アプリ）→ PaaS（開発土台）→ IaaS（サーバ資源）</b>。
        料理でいうと <b>完成弁当 → キッチン → 食材・設備</b> のイメージです。
      </div>

      <WhatIsCloud />
      <Stack />
      <Quiz />
    </div>
  );
}
