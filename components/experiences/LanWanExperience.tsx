"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「LANとWAN」専用の体験。
//   ① 広さのイメージ（LAN ⇄ WAN ⇄ LAN の図）＋役割カード
//   ② 比較表（範囲・例・だれが用意・速度）
//   ③ これはどっち？ 仕分けクイズ（範囲で見分ける練習）
// ============================================================================

function MapAndRoles() {
  return (
    <Panel>
      <SectionTitle step={1}>広さでイメージする</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ネットワークは<b className="text-gray-800">カバーする範囲の広さ</b>で呼び名が変わります。
      </p>

      {/* 図 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <div className="flex-1 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-2 py-3 text-center">
          <div className="text-xl">🏠</div>
          <div className="text-xs font-extrabold text-indigo-700">LAN（家）</div>
          <div className="text-base">🖥️📱🖨️</div>
        </div>
        <span className="text-lg font-bold text-sky-500">⇄</span>
        <div className="flex-1 rounded-full border-2 border-sky-400 bg-sky-50 px-2 py-3 text-center">
          <div className="text-xl">🌐</div>
          <div className="text-xs font-extrabold text-sky-700">WAN</div>
          <div className="text-[10px] text-gray-500">遠くを結ぶ</div>
        </div>
        <span className="text-lg font-bold text-sky-500">⇄</span>
        <div className="flex-1 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-2 py-3 text-center">
          <div className="text-xl">🏢</div>
          <div className="text-xs font-extrabold text-indigo-700">LAN（会社）</div>
          <div className="text-base">🖥️🖥️🗄️</div>
        </div>
      </div>

      {/* 役割カード */}
      <div className="mt-4 space-y-2.5">
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏠</span>
            <span className="text-sm font-extrabold text-gray-800">LAN（ラン）</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">狭い範囲</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            <b>Local Area Network</b>。家・学校・会社など<b>限られた範囲</b>。自分たちで作り、速くて安い。Wi-Fi（無線）やLANケーブル（有線）でつなぐ。
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌍</span>
            <span className="text-sm font-extrabold text-gray-800">WAN（ワン）</span>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">広い範囲</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            <b>Wide Area Network</b>。離れたLANどうしを<b>都市・国・世界規模</b>で結ぶ。通信会社（NTTなど）の回線を借りて使う。インターネットは世界最大のWAN。
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 ひとことで：<b>LAN＝「家の中」</b>、<b>WAN＝「家と家を結ぶ道路網」</b>。
      </div>
    </Panel>
  );
}

function CompareTable() {
  const rows = [
    { k: "範囲", l: "狭い（建物・部屋）", w: "広い（都市〜世界）" },
    { k: "身近な例", l: "家のWi-Fi、社内ネット", w: "インターネット、拠点間の通信" },
    { k: "だれが用意", l: "自分たち（自前）", w: "通信事業者の回線を借りる" },
    { k: "通信速度", l: "速い傾向", w: "LANより遅い傾向" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>くらべて整理</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 text-left font-bold"> </th>
              <th className="px-3 py-2 text-center font-bold text-indigo-700">🏠 LAN</th>
              <th className="px-3 py-2 text-center font-bold text-sky-700">🌍 WAN</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.l}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.w}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: "LAN" | "WAN"; why: string }[] = [
  { t: "家のWi-Fi", ans: "LAN", why: "家の中＝近い範囲なので LAN。" },
  { t: "会社のワンフロアのネット", ans: "LAN", why: "同じ建物の中＝LAN。" },
  { t: "本社と地方支店を回線でつなぐ", ans: "WAN", why: "離れた拠点を結ぶ＝WAN。" },
  { t: "インターネット", ans: "WAN", why: "世界規模で結ぶ、最大級の WAN。" },
];

function SortQuiz() {
  const [answers, setAnswers] = useState<Record<number, "LAN" | "WAN">>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはどっち？（範囲で見分ける）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        次のネットワークは LAN・WAN のどちら？ ボタンを押して確かめよう。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-gray-800">{it.t}</span>
                <div className="flex gap-1.5">
                  {(["LAN", "WAN"] as const).map((opt) => {
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
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
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
    </Panel>
  );
}

export default function LanWanExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🌐 ネットワークは「広さ」で呼び方が変わります。代表が <b>LAN（狭い）</b> と <b>WAN（広い）</b>。
        スマホ →（家のWi-Fi＝LAN）→ プロバイダ →（インターネット＝WAN）→ 相手、の順でつながっています。
      </div>

      <MapAndRoles />
      <CompareTable />
      <SortQuiz />
    </div>
  );
}
