"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「BCP（事業継続計画）」専用の体験。
//   ① 災害が起きたとき、BCPあり/なしで何が変わるかをトグルで比較
//   ② BCPは「前もって備える」計画。事前準備の例
//   ③ BCPらしい備えはどれ？ 仕分けクイズ
// ============================================================================

function Compare() {
  const [hasBcp, setHasBcp] = useState(false);
  return (
    <Panel>
      <SectionTitle step={1}>もし災害が起きたら？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大地震でお店のシステムが止まった場面。<b className="text-gray-800">BCPの有無</b>で結果がどう変わるか切り替えてみよう。
      </p>

      {/* トグル */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setHasBcp(false)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            !hasBcp ? "bg-rose-500 text-white" : "text-gray-500"
          }`}
        >
          😱 BCPなし
        </button>
        <button
          onClick={() => setHasBcp(true)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            hasBcp ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          😌 BCPあり
        </button>
      </div>

      {/* 結果 */}
      <div
        className={`mt-3 rounded-xl px-4 py-4 ring-1 ${
          hasBcp ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
        }`}
      >
        {hasBcp ? (
          <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
            <li>✅ バックアップから<b>すぐにデータを復元</b></li>
            <li>✅ 代わりの拠点・クラウドで<b>営業を再開</b></li>
            <li>✅ 連絡手順が決まっていて<b>混乱が少ない</b></li>
            <li className="font-extrabold text-emerald-700">→ 短時間で復旧。お客や信用を失いにくい</li>
          </ul>
        ) : (
          <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
            <li>❌ データのバックアップがなく<b>復元できない</b></li>
            <li>❌ 何をすればいいか決まっておらず<b>現場が混乱</b></li>
            <li>❌ 営業再開まで<b>何日もかかる</b></li>
            <li className="font-extrabold text-rose-700">→ 長期停止。お客や信用を失う恐れ</li>
          </ul>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>BCP（事業継続計画）</b>は、こうした「もしも」に備えて
        <b>重要な仕事を止めない・早く戻す</b>ための計画です。
      </div>
    </Panel>
  );
}

function Prepare() {
  const steps = [
    { emoji: "💾", t: "バックアップ", d: "データを別の場所にも保存しておく" },
    { emoji: "🏢", t: "代替拠点", d: "本社が使えなくても動ける場所を決める" },
    { emoji: "📞", t: "連絡手順", d: "誰が・どう連絡し合うかを決めておく" },
    { emoji: "📋", t: "優先順位", d: "まず何の業務から戻すかを決めておく" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>BCPは「前もって」決めておく</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ポイントは<b className="text-gray-800">事前準備</b>。起きてから慌てるのではなく、平常時に決めておきます。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {steps.map((s) => (
          <div key={s.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="text-xl">{s.emoji}</div>
            <div className="mt-1 text-sm font-extrabold text-gray-800">{s.t}</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        🚃 たとえると、試験当日に電車が止まったときの<b>別ルートを前もって調べておく</b>のと同じ。
        BCPは災害<b>後</b>ではなく<b>前</b>に作ります。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "データを毎日、別拠点にもバックアップしておく", ok: true, why: "止めない備え＝BCPらしい行動。" },
  { t: "災害が起きてから初めて対応を考える", ok: false, why: "BCPは事前準備。起きてからでは遅い。" },
  { t: "本社が被災したときの代替オフィスを決めておく", ok: true, why: "代替拠点の準備＝BCPの基本。" },
  { t: "バックアップさえあれば連絡手順は不要", ok: false, why: "復旧には連絡・体制も必要。データだけでは足りない。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>BCPの備えとして正しい？</SectionTitle>
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
                  { v: false, label: "❌ ちがう" },
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

export default function BcpExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🆘 <b>BCP（事業継続計画）</b>は、災害や事故が起きても<b>重要な仕事を止めない・早く再開する</b>ための計画。
        カギは「起きる前の備え」です。
      </div>

      <Compare />
      <Prepare />
      <Quiz />
    </div>
  );
}
