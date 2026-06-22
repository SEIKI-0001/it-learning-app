"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「情報セキュリティ管理（ISMS・リスクアセスメント）」専用の体験。
//   ① リスクの大きさ＝発生可能性 × 影響度（2つを選ぶと優先度が変わる）
//   ② リスクへの対応4分類（回避/低減/移転/受容）
//   ③ ISMS＝PDCAで continuously 管理／情報セキュリティポリシー
// ============================================================================

const LEVELS = [
  { key: "低", n: 1, color: "emerald" },
  { key: "中", n: 2, color: "amber" },
  { key: "高", n: 3, color: "rose" },
] as const;

type LevelKey = (typeof LEVELS)[number]["key"];

function RiskMeter() {
  const [prob, setProb] = useState<LevelKey>("中");
  const [impact, setImpact] = useState<LevelKey>("中");
  const pn = LEVELS.find((l) => l.key === prob)!.n;
  const inum = LEVELS.find((l) => l.key === impact)!.n;
  const score = pn * inum; // 1..9
  const priority =
    score >= 6 ? "高（最優先で対策）" : score >= 3 ? "中（計画的に対策）" : "低（様子を見る）";
  const tone =
    score >= 6
      ? "bg-rose-50 text-rose-800 ring-rose-200"
      : score >= 3
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-emerald-50 text-emerald-800 ring-emerald-200";

  return (
    <Panel>
      <SectionTitle step={1}>リスクの大きさを見積もる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        リスクアセスメントでは、まず危険を洗い出し（特定）→ 大きさを見積もり（分析）→ 優先度を決めます（評価）。
        大きさは <b className="text-gray-800">発生可能性 × 影響度</b> で考えます。
      </p>

      <div className="mt-4 space-y-3">
        <Picker label="発生可能性（起こりやすさ）" value={prob} onChange={setProb} />
        <Picker label="影響度（起きたときの被害）" value={impact} onChange={setImpact} />
      </div>

      <div className={`mt-4 rounded-xl px-4 py-3 text-center ring-1 ${tone}`}>
        <div className="text-xs font-bold opacity-70">
          {prob}（{pn}） × {impact}（{inum}） ＝ {score}
        </div>
        <div className="mt-1 text-base font-extrabold">優先度：{priority}</div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 「めったに起きないが起きたら大被害」も「よく起きるが軽微」も無視できません。
        <b>両方をかけ合わせて</b>優先順位をつけるのがポイント。
      </p>
    </Panel>
  );
}

function Picker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LevelKey;
  onChange: (v: LevelKey) => void;
}) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-600">{label}</div>
      <div className="mt-1.5 flex gap-1.5">
        {LEVELS.map((l) => {
          const picked = value === l.key;
          return (
            <button
              key={l.key}
              onClick={() => onChange(l.key)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
                picked
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
              }`}
            >
              {l.key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TREATMENTS = [
  { emo: "🚫", name: "回避", d: "リスクのある活動そのものをやめる（例：危険なサービスを使わない）。" },
  { emo: "🛡️", name: "低減", d: "対策をして発生可能性や影響を小さくする（例：暗号化・バックアップ・教育）。" },
  { emo: "🤝", name: "移転", d: "他者に肩代わりしてもらう（例：保険に入る・外部に委託する）。" },
  { emo: "😌", name: "受容", d: "小さいリスクは対策せず受け入れる（コストに見合わないとき）。" },
];

function Treatments() {
  return (
    <Panel>
      <SectionTitle step={2}>見積もったあとの「対応」4つ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        優先度に応じて、リスクへの向き合い方を選びます。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {TREATMENTS.map((t) => (
          <div key={t.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{t.emo}</span>
              <span className="text-sm font-extrabold text-gray-800">{t.name}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{t.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 覚え方：<b>回避＝やめる</b>／<b>低減＝小さくする</b>／<b>移転＝肩代わり（保険・委託）</b>／
        <b>受容＝受け入れる</b>。
      </p>
    </Panel>
  );
}

function IsmsPdca() {
  const items = [
    { k: "P", t: "計画", d: "守る情報を決め、方針（ポリシー）と対策を立てる" },
    { k: "D", t: "実行", d: "対策を導入し、ルールどおりに運用する" },
    { k: "C", t: "点検", d: "うまくいっているか監査・チェックする" },
    { k: "A", t: "改善", d: "見つかった弱点を直し、次の計画へ反映する" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>ISMS＝続けて改善するしくみ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">ISMS（情報セキュリティマネジメントシステム）</b>は、組織として情報を守る仕組み。
        一度作って終わりではなく、<b className="text-gray-800">PDCAで回し続けて</b>改善します。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {items.map((it) => (
          <div key={it.k} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="grid h-6 w-6 place-items-center rounded bg-indigo-100 font-mono text-xs font-extrabold text-indigo-700">
                {it.k}
              </span>
              <span className="text-sm font-extrabold text-gray-800">{it.t}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{it.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 ISMSの国際規格は <b>ISO/IEC 27001</b>。組織の方針をまとめた文書が
        <b>情報セキュリティポリシー</b>です。
      </div>
    </Panel>
  );
}

export default function IsmsRiskExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔐 セキュリティは「技術」だけでなく<b>組織で管理するしくみ</b>が大事。
        リスクを<b>見積もって（アセスメント）→対応を選び→PDCAで回し続ける</b>のが ISMS です。
      </div>

      <RiskMeter />
      <Treatments />
      <IsmsPdca />
    </div>
  );
}
