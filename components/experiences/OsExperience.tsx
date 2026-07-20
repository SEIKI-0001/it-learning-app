"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「OS・ソフトウェア・ハードウェア」専用の体験。
//   ① 3層の構造 … アプリ → OS → ハードウェア（タップで役割）
//   ② 取り次ぎ体験 … アプリは機械を直接さわれず、OSが間に立って取り次ぐ
//   ③ 分類のおさらい
// ============================================================================

const LAYERS = [
  {
    id: "app",
    emo: "📱",
    name: "アプリケーション",
    tag: "応用ソフト",
    color: "border-sky-300 bg-sky-50",
    on: "border-sky-500 bg-sky-100",
    d: "ユーザーが直接使うソフト。SNS・ブラウザ・表計算・ゲームなど「やりたいこと」専用。",
  },
  {
    id: "os",
    emo: "⚙️",
    name: "OS（オーエス）",
    tag: "基本ソフト",
    color: "border-brand-300 bg-brand-50",
    on: "border-brand-500 bg-brand-100",
    d: "アプリと機械の間に立つ土台。メモリ・ファイル・画面・入出力など全体を管理し、機械を使えるように取り次ぐ。例：Windows / macOS / iOS / Android。",
  },
  {
    id: "hw",
    emo: "🖥️",
    name: "ハードウェア",
    tag: "機械",
    color: "border-gray-300 bg-gray-50",
    on: "border-gray-500 bg-gray-100",
    d: "目に見える機械本体。CPU・メモリ・ストレージ・画面・キーボードなど。",
  },
];

function LayerStack() {
  const [sel, setSel] = useState(1); // 既定はOS（主役）
  const cur = LAYERS[sel];
  return (
    <Panel>
      <SectionTitle step={1}>3層の構造（タップして役割を見る）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        コンピュータは<b className="text-gray-800">上から アプリ → OS → ハードウェア</b>の3層。
        <b className="text-brand-700">OSが真ん中</b>で全体を管理しています。
      </p>

      <div className="mt-4 space-y-2">
        {LAYERS.map((l, i) => {
          const on = i === sel;
          return (
            <button
              key={l.id}
              onClick={() => setSel(i)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
                on ? l.on : l.color
              }`}
            >
              <span className="text-2xl">{l.emo}</span>
              <span className="flex-1">
                <span className="text-sm font-bold text-gray-800">{l.name}</span>
                <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                  {l.tag}
                </span>
              </span>
              {l.id === "os" && (
                <span className="text-[11px] font-bold text-brand-600">仲介役</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200">
        <b className="text-gray-900">{cur.name}</b>：{cur.d}
      </p>
    </Panel>
  );
}

// ② 取り次ぎ体験 ----------------------------------------------------------
const ACTORS = [
  { id: "app", emo: "📱", name: "アプリ" },
  { id: "os", emo: "⚙️", name: "OS" },
  { id: "hw", emo: "💾", name: "ハードウェア" },
] as const;

type Step = { active: string[]; holder: string | null; html: string };

const STEPS: Step[] = [
  {
    active: ["app"],
    holder: "app",
    html: "📱 SNSアプリで「写真を保存」を押しました。でもアプリは機械（ストレージ）を<b>直接さわれません</b>。",
  },
  {
    active: ["app", "os"],
    holder: "os",
    html: "➡️ アプリはOSに「この写真を保存して」と<b>お願い</b>します（どのアプリも同じ“共通の窓口”を使う）。",
  },
  {
    active: ["os", "hw"],
    holder: "hw",
    html: "⚙️ OSがストレージなどの機械を操作して、実際に<b>書き込み</b>ます。アプリは機械の細かい操作を知らなくてOK。",
  },
  {
    active: ["os", "app"],
    holder: "app",
    html: "✅ 保存できたら、OSが「完了」をアプリに返します。",
  },
  {
    active: ["os"],
    holder: null,
    html: "💡 OSが間に立つから、<b>どのアプリも同じやり方で機械を使える</b>＝アプリ作りが楽で安全。これがOSの役割です。",
  },
];

function Relay() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  return (
    <Panel>
      <SectionTitle step={2}>OSが間に立って「取り次ぐ」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        アプリは機械を直接さわらず、<b className="text-gray-800">OSにお願いして</b>動かします。
        「写真を保存」を例に、「次へ」で流れを追ってみよう。
      </p>

      <div className="mt-4 flex items-stretch justify-center gap-1.5">
        {ACTORS.map((a, i) => {
          const on = step.active.includes(a.id);
          const holds = step.holder === a.id;
          return (
            <div key={a.id} className="flex items-center">
              <div
                className={`relative w-[92px] rounded-xl border-2 px-1 py-2.5 text-center transition ${
                  on ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100" : "border-gray-200 bg-gray-50"
                }`}
              >
                {holds && <span className="absolute -top-3 right-1 text-lg">📨</span>}
                <div className="text-2xl leading-none">{a.emo}</div>
                <div className="mt-1 text-xs font-bold text-gray-800">{a.name}</div>
              </div>
              {i < ACTORS.length - 1 && <span className="px-0.5 text-lg text-gray-300">↔</span>}
            </div>
          );
        })}
      </div>

      <p
        className="mt-4 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: step.html }}
      />

      <StepNav
        index={idx}
        total={STEPS.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="OSの役割 💡"
      />
    </Panel>
  );
}

export default function OsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📱 スマホでたとえると——<b>本体＝ハードウェア</b>（機械）、<b>SNSアプリ＝アプリケーション</b>、
        画面・保存・通信などを<b>まとめて面倒みるのがOS</b>。OSはアプリと機械の<b>間に立つ土台</b>です。
      </div>

      <LayerStack />
      <Relay />

      <Panel>
        <SectionTitle step={3}>分類のおさらい</SectionTitle>
        <div className="mt-3 space-y-2 text-sm">
          <div className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b>ハードウェア</b>＝目に見える<b>機械</b>　／　<b>ソフトウェア</b>＝機械に仕事をさせる<b>命令</b>（見えない）
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            ソフトウェアは2種類：<b className="text-brand-700">基本ソフト（OS）</b>＝全体を管理／
            <b className="text-sky-700">応用ソフト（アプリ）</b>＝やりたいこと専用
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ よくある勘違い：「OSとアプリは同じ」ではありません。アプリはOSの上で動きます。
        </p>
      </Panel>
    </div>
  );
}
