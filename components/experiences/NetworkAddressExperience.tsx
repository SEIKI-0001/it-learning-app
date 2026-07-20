"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「IPアドレスとDNS」専用の体験。
//   ① IPアドレス … ネット上の住所（番号）
//   ② 名前解決の旅 … example.com と入力 → DNSで住所を引く → サーバへ接続
//   ③ おさらい
// ============================================================================

function IpAddress() {
  return (
    <Panel>
      <SectionTitle step={1}>IPアドレス＝ネット上の「住所」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        手紙に住所が要るように、ネットにつながる機器1台ずつに<b className="text-gray-800">番号の住所</b>がついています。これがIPアドレス。
      </p>
      <div className="mt-3 rounded-xl bg-gray-50 p-4 text-center ring-1 ring-gray-200">
        <div className="flex items-center justify-center gap-1 font-mono">
          {["192", "168", "0", "5"].map((o, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="rounded-lg border-2 border-brand-400 bg-white px-2.5 py-1 text-xl font-bold text-brand-700">
                {o}
              </span>
              {i < 3 && <span className="text-gray-400">.</span>}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          4つの数字を「.」で区切る形（IPv4）。各部分は <b>0〜255</b>（＝2進数8ケタ＝1バイト）。
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        でも人は数字の住所を覚えられない…。そこで<b className="text-gray-800">「名前 → 住所」変換</b>のDNSが登場します。
      </p>
    </Panel>
  );
}

// ② 名前解決の旅 ----------------------------------------------------------
const ACTORS = [
  { id: "me", emo: "🧑‍💻", name: "あなた", sub: "ブラウザ" },
  { id: "dns", emo: "📇", name: "DNS", sub: "電話帳" },
  { id: "server", emo: "🗄️", name: "Webサーバ", sub: "93.184.216.34" },
] as const;

type Step = { active: string[]; holder: string | null; danger?: boolean; html: string };

const STEPS: Step[] = [
  {
    active: ["me"],
    holder: "me",
    html: "🧑‍💻 ブラウザに <b>example.com</b> と入力。でも相手の<b>番号（IPアドレス）</b>が分かりません。",
  },
  {
    active: ["me", "dns"],
    holder: "dns",
    html: "📨 DNSに「<b>example.com</b> の住所（IP）を教えて」と問い合わせます。",
  },
  {
    active: ["dns", "me"],
    holder: "me",
    html: "📇 DNSが <b>「93.184.216.34」</b> と回答（名前→番号に変換。電話帳と同じ役割）。これで住所が分かりました。",
  },
  {
    active: ["me", "server"],
    holder: "server",
    html: "🔗 その番号のサーバへ接続！ ページが表示されます。順番は <b>名前 → DNS → IP → 接続</b>。",
  },
  {
    active: ["dns"],
    holder: null,
    danger: true,
    html: "⚠️ もしDNSが止まると…<b>名前から住所を引けず</b>、ドメイン名でサイトを開けません。だからDNSは大切です。",
  },
];

function Journey() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  return (
    <Panel>
      <SectionTitle step={2}>名前解決の旅（入力 → DNS → 接続）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">example.com</b> を開くとき、裏で何が起きているか。「次へ」で1歩ずつ。
        📨 が今やりとりしている相手です。
      </p>

      <div className="mt-4 flex items-stretch justify-center gap-1.5">
        {ACTORS.map((a, i) => {
          const on = step.active.includes(a.id);
          const danger = step.danger && a.id === "dns";
          const holds = step.holder === a.id;
          const tone = danger
            ? "border-rose-400 bg-rose-50"
            : on
              ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100"
              : "border-gray-200 bg-gray-50";
          return (
            <div key={a.id} className="flex items-center">
              <div className={`relative w-[96px] rounded-xl border-2 px-1 py-2.5 text-center transition ${tone}`}>
                {holds && <span className="absolute -top-3 right-1 text-lg">📨</span>}
                <div className="text-2xl leading-none">{a.emo}</div>
                <div className="mt-1 text-xs font-bold text-gray-800">{a.name}</div>
                <div className="text-[10px] leading-tight text-gray-500">{a.sub}</div>
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
        doneLabel="DNSの役割 ⚠️"
      />
    </Panel>
  );
}

export default function NetworkAddressExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📮 イメージは郵便。<b>住所＝IPアドレス</b>（番号）でデータを届けます。でも番号は覚えにくいので、
        ふだんは <b>example.com</b> のような名前を使い、<b>名前→住所に変換する電話帳＝DNS</b> が橋渡しします。
      </div>

      <IpAddress />
      <Journey />

      <Panel>
        <SectionTitle step={3}>おさらい</SectionTitle>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b className="text-brand-700">IPアドレス</b>：ネット上の住所（番号）。データを正しい相手へ届ける。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b className="text-brand-700">DNS</b>：文字の名前（ドメイン名）を IPアドレスに変換する電話帳役。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            接続の前に<b>必ず名前解決（DNS）</b>が行われる。順番は「名前 → DNS → IP → 接続」。
          </li>
        </ul>
      </Panel>
    </div>
  );
}
