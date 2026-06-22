"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「IoT」専用の体験。
//   ① IoTの一周（センサーで測る→ネットで送る→クラウドで判断→機器を制御）をStep実演
//   ② 活用例カード
//   ③ 便利さの裏のセキュリティ（安全／あやしい 仕分けクイズ）
// ============================================================================

const NODES = [
  { id: "sensor", emoji: "🌡️", name: "センサー付き機器", sub: "エアコン" },
  { id: "net", emoji: "📡", name: "ネット", sub: "送信" },
  { id: "cloud", emoji: "☁️", name: "クラウド", sub: "判断" },
];

const STEPS = [
  { active: ["sensor"], holder: "sensor", html: "エアコンの<b>センサー</b>が室温を測る。「いま32℃」とデータを取得。" },
  { active: ["sensor", "net"], holder: "net", html: "測ったデータを<b>インターネット経由</b>でクラウドへ送る。" },
  { active: ["net", "cloud"], holder: "cloud", html: "<b>クラウド</b>が判断：「32℃は暑い → 28℃まで冷やそう」。" },
  { active: ["cloud", "net", "sensor"], holder: "sensor", html: "指示が機器に戻り、エアコンが<b>自動で動く</b>。人が触らなくても完結！" },
];

function Loop() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  return (
    <Panel>
      <SectionTitle step={1}>IoTの一周を見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">モノがネットにつながる</b>と、測る→送る→判断→動く、が自動で回ります。
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
                {holds && <span className="absolute -top-3 right-1 text-base">📦</span>}
                <div className="text-2xl leading-none">{n.emoji}</div>
                <div className="mt-1 text-[11px] font-extrabold text-gray-800">{n.name}</div>
                <div className="text-[10px] leading-tight text-gray-500">{n.sub}</div>
              </div>
              {i < NODES.length - 1 && <span className="px-0.5 text-lg text-gray-300">↔</span>}
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
        doneLabel="自動で完結 🎉"
      />
    </Panel>
  );
}

const USES = [
  { emoji: "🏭", t: "工場", d: "機械にセンサーを付け、稼働状況や故障の予兆を遠隔で把握。" },
  { emoji: "🏠", t: "家", d: "スマート家電を外出先からスマホで操作・確認。" },
  { emoji: "🚜", t: "農業", d: "畑の温度・湿度を測り、自動で水やり。" },
  { emoji: "🩺", t: "健康", d: "腕時計が心拍を測り、データを記録・通知。" },
];

function Uses() {
  return (
    <Panel>
      <SectionTitle step={2}>身近な活用例</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {USES.map((u) => (
          <div key={u.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{u.emoji}</span>
              <span className="text-sm font-extrabold text-gray-800">{u.t}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{u.d}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; safe: boolean; why: string }[] = [
  { t: "買ったIoTカメラの初期パスワードを変えずに使う", safe: false, why: "初期パスワードは狙われやすく、乗っ取りの原因に。必ず変更を。" },
  { t: "機器のソフトを最新に更新しておく", safe: true, why: "更新で弱点（脆弱性）がふさがれ、安全になる。" },
  { t: "使っていない通信機能や接続を切っておく", safe: true, why: "入口を減らすほど狙われにくい。" },
  { t: "ネットにつなげばセキュリティ対策は不要と考える", safe: false, why: "つながる機器ほど対策が必要。便利さと対策はセット。" },
];

function SecurityQuiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>便利さの裏のセキュリティ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        IoTは便利だけど、ネットにつながる＝<b className="text-gray-800">狙われる入口が増える</b>こと。安全な行動はどっち？
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const has = chosen !== undefined;
          const correct = chosen === it.safe;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { v: true, label: "✅ 安全" },
                  { v: false, label: "⚠️ あやしい" },
                ].map((o) => {
                  const picked = chosen === o.v;
                  const tone = !has
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? o.v === it.safe
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : o.v === it.safe
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
                  {correct ? "⭕ 正解！ " : "❌ 逆だよ。 "}
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

export default function IotExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔌 <b>IoT</b>（Internet of Things）は、家電・車・工場の機械などの<b>モノがインターネットにつながる</b>仕組み。
        温度計が自分で室温を知らせ、必要ならエアコンを調整してもらう——そんなイメージです。
      </div>

      <Loop />
      <Uses />
      <SecurityQuiz />
    </div>
  );
}
