"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「BCP（事業継続計画）」専用の体験。
//   ① 備えを選んでから地震を起こす復旧シミュレータ（備えの有無で結末が変わる）
//   ② BCPらしい備えはどれ？ 仕分けクイズ
// ============================================================================

const PREPS = [
  { id: "backup", emoji: "💾", name: "バックアップ", d: "データを別の場所にも保存" },
  { id: "site", emoji: "🏢", name: "代替拠点", d: "本社がダメでも動ける場所" },
  { id: "contact", emoji: "📞", name: "連絡手順", d: "誰が・どう連絡し合うか" },
] as const;

type PrepId = (typeof PREPS)[number]["id"];

const RESULTS: Record<PrepId, { ok: string; ng: string }> = {
  backup: { ok: "バックアップから即データ復元", ng: "顧客データが消えて復元できない" },
  site: { ok: "代替拠点とクラウドで営業を再開", ng: "働く場所がなく全業務ストップ" },
  contact: { ok: "決めた手順どおり全員と連絡・役割分担", ng: "誰に何を頼むか分からず大混乱" },
};

const VERDICTS = [
  { days: "…めどが立たない", note: "復旧できず、お客も信用も失う。倒産の危機。", tone: "rose" },
  { days: "1か月以上", note: "備えが1つだけでは他が足を引っぱる。", tone: "rose" },
  { days: "約1週間", note: "かなり戻せたが、欠けた備えのぶん遅れた。", tone: "amber" },
  { days: "たった2日！", note: "決めておいた優先順位どおり、大事な業務から順に再開できた。", tone: "emerald" },
] as const;

function Lab() {
  const [on, setOn] = useState<Record<PrepId, boolean>>({
    backup: false,
    site: false,
    contact: false,
  });
  const [struck, setStruck] = useState(false);
  const count = PREPS.filter((p) => on[p.id]).length;
  const verdict = VERDICTS[count];
  const verdictTone =
    verdict.tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : verdict.tone === "amber"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-rose-50 text-rose-800 ring-rose-200";

  return (
    <Panel>
      <SectionTitle step={1}>備えてから、地震を起こしてみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたはお店の店長。<b className="text-gray-800">平常時にどこまで備えるか</b>を選んでから、
        大地震を起こして結末を見てみよう。
      </p>

      {/* 備えトグル */}
      <div className="mt-4 space-y-2">
        {PREPS.map((p) => {
          const active = on[p.id];
          return (
            <button
              key={p.id}
              disabled={struck}
              onClick={() => setOn((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-2 transition active:scale-[0.98] disabled:active:scale-100 ${
                active
                  ? "bg-emerald-50 ring-emerald-400"
                  : "bg-gray-50 ring-gray-200"
              } ${struck ? "opacity-70" : ""}`}
            >
              <span className="text-2xl leading-none">{p.emoji}</span>
              <span className="flex-1">
                <span className="block text-sm font-extrabold text-gray-800">{p.name}</span>
                <span className="block text-[11px] leading-relaxed text-gray-500">{p.d}</span>
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                  active ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {active ? "備えた" : "なし"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 地震発生ボタン */}
      {!struck ? (
        <button
          onClick={() => setStruck(true)}
          className="mt-4 w-full rounded-xl bg-rose-600 py-3 text-base font-extrabold text-white transition active:scale-95"
        >
          🌋 大地震発生！
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl bg-gray-800 px-4 py-2.5 text-center text-sm font-extrabold text-white">
            🌋 大地震発生！ システム停止・本社ビル立入禁止…
          </div>
          {/* 備えごとの結末 */}
          <ul className="space-y-1.5">
            {PREPS.map((p) => {
              const ok = on[p.id];
              return (
                <li
                  key={p.id}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 ${
                    ok
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-rose-50 text-rose-800 ring-rose-200"
                  }`}
                >
                  <span className="flex-none">{ok ? "✅" : "❌"}</span>
                  <span>
                    {p.emoji} {ok ? RESULTS[p.id].ok : RESULTS[p.id].ng}
                  </span>
                </li>
              );
            })}
          </ul>
          {/* 総合結果 */}
          <div className={`rounded-xl px-4 py-3 text-center ring-1 ${verdictTone}`}>
            <div className="text-xs font-bold opacity-70">営業再開まで</div>
            <div className="mt-0.5 text-lg font-extrabold">{verdict.days}</div>
            <p className="mt-1 text-xs font-medium leading-relaxed">{verdict.note}</p>
          </div>
          <button
            onClick={() => setStruck(false)}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 transition active:scale-95"
          >
            ↺ 備えを選び直してもう一度
          </button>
        </div>
      )}

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 結末を分けたのは<b>起きる前の備え</b>。これを計画としてまとめたものが
        <b>BCP（事業継続計画）</b>です。災害の<b>あと</b>ではなく<b>前</b>に作ります。
      </div>
      <div className="mt-2 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        🚃 たとえると、試験当日に電車が止まったときの<b>別ルートを前もって調べておく</b>のと同じです。
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
      <SectionTitle step={2}>BCPの備えとして正しい？</SectionTitle>
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

      <Lab />
      <Quiz />
    </div>
  );
}
