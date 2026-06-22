"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「CPU・メモリ・ストレージ」専用の体験。
//   ① 3つの部品の役割（頭脳・作業机・引き出し）
//   ② データの流れ体験 … 文書を開く→編集→保存 の流れで、どこを通るかを1歩ずつ
//   ③ メモリ vs ストレージ … 速さ・容量・電源OFFで消えるか（揮発性）の比較
// ============================================================================

const ACTORS = [
  { id: "storage", emo: "🗄️", name: "ストレージ", role: "引き出し（保管）" },
  { id: "memory", emo: "🗒️", name: "メモリ", role: "作業机（一時）" },
  { id: "cpu", emo: "🧠", name: "CPU", role: "頭脳（処理）" },
] as const;

type FlowStep = {
  active: string[];
  holder: string | null;
  danger?: boolean;
  html: string;
};

const STEPS: FlowStep[] = [
  {
    active: ["storage"],
    holder: "storage",
    html: "💾 文書はふだん<b>ストレージ（引き出し）</b>に保管されています。アプリで「開く」を押しました。",
  },
  {
    active: ["storage", "memory"],
    holder: "memory",
    html: "📤 文書を<b>メモリ（作業机）</b>に読み込みます。ストレージは遅いので、使うものだけ机に広げます。",
  },
  {
    active: ["memory", "cpu"],
    holder: "memory",
    html: "🧠 <b>CPU（頭脳）</b>がメモリ上の文書を読んで処理（表示・計算）。CPUとメモリの間は超高速でやりとりします。",
  },
  {
    active: ["memory", "cpu"],
    holder: "memory",
    html: "✏️ あなたが書き直すと、変更はまず<b>メモリの上</b>にあります（だから速い）。まだストレージには保存されていません。",
  },
  {
    active: ["memory", "storage"],
    holder: "storage",
    html: "💾 「保存」を押すと、メモリの内容が<b>ストレージに書き込まれ</b>ます。これで電源を切っても残ります。",
  },
  {
    active: ["memory"],
    holder: null,
    danger: true,
    html: "⚡ もし保存前に電源を切ると…<b>メモリの内容は消える</b>ので編集は失われます。だから「保存」が大切！",
  },
];

function FlowDiagram({ step }: { step: FlowStep }) {
  return (
    <div className="flex items-stretch justify-center gap-1.5">
      {ACTORS.map((a, i) => {
        const isActive = step.active.includes(a.id);
        const isDanger = step.danger && a.id === "memory";
        const holds = step.holder === a.id;
        const tone = isDanger
          ? "border-rose-400 bg-rose-50"
          : isActive
            ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
            : "border-gray-200 bg-gray-50";
        return (
          <div key={a.id} className="flex items-center">
            <div className={`relative w-[88px] rounded-xl border-2 px-1 py-2.5 text-center transition ${tone}`}>
              {holds && <span className="absolute -top-3 right-1 text-lg">📄</span>}
              <div className="text-2xl leading-none">{a.emo}</div>
              <div className="mt-1 text-xs font-extrabold text-gray-800">{a.name}</div>
              <div className="text-[10px] leading-tight text-gray-500">{a.role}</div>
            </div>
            {i < ACTORS.length - 1 && (
              <span className="px-0.5 text-lg text-gray-300">↔</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DataFlow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  return (
    <Panel>
      <SectionTitle step={2}>データの流れを追う（文書を開く→編集→保存）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ファイルを開いて書き直して保存するまで、データが<b className="text-gray-800">どこを通るか</b>を「次へ」で1歩ずつ。
        📄 が今データのある場所です。
      </p>

      <div className="mt-4">
        <FlowDiagram step={step} />
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
        doneLabel="ここがキモ ⚡"
      />
    </Panel>
  );
}

export default function ComputerCoreExperience() {
  const parts = [
    { emo: "🧠", name: "CPU", tag: "頭脳", d: "計算や判断をする処理の中心。速さは「クロック周波数（GHz）」で表す。", ex: "人（宿題をする自分）" },
    { emo: "🗒️", name: "メモリ（主記憶）", tag: "作業机", d: "今すぐ使うデータを一時的に広げる場所。速いが、電源を切ると消える。", ex: "机の広さ（RAM）" },
    { emo: "🗄️", name: "ストレージ（補助記憶）", tag: "引き出し", d: "写真・アプリ・文書を長く保存する場所。大容量だが遅い。電源を切っても残る。", ex: "本棚・引き出し（SSD/HDD）" },
  ];

  const rows = [
    { k: "役割", m: "作業机（一時置き）", s: "引き出し（長期保存）" },
    { k: "速さ", m: "速い 🚀", s: "遅い 🐢" },
    { k: "容量", m: "小さめ", s: "大きい" },
    { k: "電源を切ると", m: "消える（揮発性）", s: "残る（不揮発性）" },
    { k: "例", m: "RAM", s: "SSD・HDD" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🖥️ パソコンの中身は<b>「机で勉強する」</b>イメージ。<b>あなた＝CPU（頭脳）</b>、
        <b>机の広さ＝メモリ</b>、<b>引き出し＝ストレージ</b>。この3つの役割を分けると一気に読みやすくなります。
      </div>

      <Panel>
        <SectionTitle step={1}>3つの部品の役割</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {parts.map((p) => (
            <li key={p.name} className="flex gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-white text-2xl ring-1 ring-gray-200">
                {p.emo}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-gray-800">{p.name}</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                    {p.tag}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{p.d}</p>
                <p className="mt-1 text-xs text-gray-400">たとえ：{p.ex}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <DataFlow />

      <Panel>
        <SectionTitle step={3}>まちがえやすい：メモリ と ストレージ</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          どちらも「データを置く場所」なので混同しがち。<b className="text-gray-800">電源を切ると消えるのがメモリ</b>、
          というのが最大の見分けポイント（試験で頻出）。
        </p>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold">🗒️ メモリ</th>
                <th className="px-3 py-2 text-center font-bold">🗄️ ストレージ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.m}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
