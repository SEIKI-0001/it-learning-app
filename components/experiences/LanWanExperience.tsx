"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「LANとWAN」専用の体験。
//   ① 宛先を選んでデータを送る → 通る経路（LAN内で完結 / WAN経由）が光る
//   ② 比較表（範囲・例・だれが用意・速度）
//   ③ これはどっち？ 仕分けクイズ（範囲で見分ける練習）
// ============================================================================

type Dest = "printer" | "office" | "video";

const DESTS: {
  key: Dest;
  label: string;
  usesWan: boolean;
  remote: { emoji: string; name: string; devices: string } | null;
  result: string;
}[] = [
  {
    key: "printer",
    label: "🖨️ 同じ家のプリンタ",
    usesWan: false,
    remote: null,
    result:
      "家の中のネットワーク（LAN）だけで届いた！ WANは通っていません。近い相手はLAN内で完結するので速い。",
  },
  {
    key: "office",
    label: "🏢 遠くの会社のサーバ",
    usesWan: true,
    remote: { emoji: "🏢", name: "会社（LAN）", devices: "🖥️🗄️" },
    result:
      "家のLANを出て、通信会社の回線（WAN）を通り、会社のLANへ届いた！ 離れたLANどうしを結ぶのがWANです。",
  },
  {
    key: "video",
    label: "🌍 海外の動画サイト",
    usesWan: true,
    remote: { emoji: "🌍", name: "動画サイト", devices: "🗄️🎬" },
    result:
      "インターネット（世界最大のWAN）を通って海外まで届いた！ どんなに遠くても、WANがLANとLANを結んでくれます。",
  },
];

function PacketJourney() {
  const [dest, setDest] = useState<Dest | null>(null);
  const [tried, setTried] = useState<Set<Dest>>(new Set());
  const d = DESTS.find((x) => x.key === dest) ?? null;
  const triedLan = [...tried].some((k) => !DESTS.find((x) => x.key === k)!.usesWan);
  const triedWan = [...tried].some((k) => DESTS.find((x) => x.key === k)!.usesWan);

  const send = (key: Dest) => {
    setDest(key);
    setTried((prev) => new Set(prev).add(key));
  };

  return (
    <Panel>
      <SectionTitle step={1}>宛先を選んで、データを送ってみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたのスマホ📱から送信します。<b className="text-gray-800">宛先をタップ</b>すると、
        データがどこを通るかが光ります。
      </p>

      {/* 宛先選択 */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {DESTS.map((x) => (
          <button
            key={x.key}
            onClick={() => send(x.key)}
            className={`rounded-lg px-1 py-2 text-[11px] font-bold leading-tight transition active:scale-95 ${
              dest === x.key ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* 経路の図 */}
      <div className="mt-3 flex items-stretch justify-center gap-1">
        {/* 家のLAN */}
        <div
          className={`flex-1 rounded-xl border-2 border-dashed px-1.5 py-2.5 text-center transition ${
            dest ? "border-brand-400 bg-brand-50" : "border-gray-300 bg-gray-50"
          }`}
        >
          <div className="text-[11px] font-bold text-brand-700">🏠 家（LAN）</div>
          <div className="mt-1.5 flex justify-center gap-1 text-base">
            <span className={dest ? "rounded bg-brand-200 px-0.5" : ""}>📱</span>
            <span className={dest === "printer" ? "animate-pulse rounded bg-emerald-200 px-0.5" : ""}>🖨️</span>
            <span>💻</span>
          </div>
          {dest === "printer" && (
            <div className="mt-1 text-[10px] font-bold text-emerald-600">📱→🖨️ 家の中で完結！</div>
          )}
        </div>

        {/* WAN */}
        <div className="flex items-center">
          <span className={`text-sm font-bold ${d?.usesWan ? "animate-pulse text-sky-500" : "text-gray-200"}`}>⇄</span>
        </div>
        <div
          className={`w-[72px] rounded-full border-2 px-1 py-2.5 text-center transition ${
            d?.usesWan ? "border-sky-400 bg-sky-50" : "border-gray-200 bg-gray-50 opacity-60"
          }`}
        >
          <div className="text-lg">🌐</div>
          <div className={`text-[10px] font-bold ${d?.usesWan ? "text-sky-700" : "text-gray-400"}`}>WAN</div>
          <div className="text-[9px] leading-tight text-gray-400">通信会社の回線</div>
        </div>
        <div className="flex items-center">
          <span className={`text-sm font-bold ${d?.usesWan ? "animate-pulse text-sky-500" : "text-gray-200"}`}>⇄</span>
        </div>

        {/* 相手側 */}
        <div
          className={`flex-1 rounded-xl border-2 border-dashed px-1.5 py-2.5 text-center transition ${
            d?.usesWan ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-gray-50 opacity-60"
          }`}
        >
          {d?.remote ? (
            <>
              <div className="text-[11px] font-bold text-brand-700">
                {d.remote.emoji} {d.remote.name}
              </div>
              <div className="mt-1.5 animate-pulse text-base">{d.remote.devices}</div>
              <div className="mt-1 text-[10px] font-bold text-emerald-600">届いた！</div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-bold text-gray-400">遠くの相手</div>
              <div className="mt-1.5 text-base opacity-30">🏢🌍</div>
            </>
          )}
        </div>
      </div>

      {/* 結果 */}
      {d && (
        <div className="mt-3 space-y-2">
          <div className="flex justify-center">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                d.usesWan ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {d.usesWan ? "🌐 WANを通った" : "🏠 LAN内で完結（WANは通らない）"}
            </span>
          </div>
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200">
            {d.result}
          </p>
        </div>
      )}

      {triedLan && triedWan && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
          🎉 気づいた？ <b>近い相手＝LANの中だけ</b>、<b>遠い相手＝WANを通る</b>。
          LAN＝「家の中」、WAN＝「家と家を結ぶ道路網」です。
        </div>
      )}

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>LAN</b>（Local Area Network）＝家・学校・会社など<b>狭い範囲</b>。自分たちで作る。
        <b>WAN</b>（Wide Area Network）＝離れたLANどうしを結ぶ<b>広い範囲</b>。通信会社の回線を借りる。
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
              <th className="px-3 py-2 text-center font-bold text-brand-700">🏠 LAN</th>
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🌐 ネットワークは「広さ」で呼び方が変わります。代表が <b>LAN（狭い）</b> と <b>WAN（広い）</b>。
        スマホ →（家のWi-Fi＝LAN）→ プロバイダ →（インターネット＝WAN）→ 相手、の順でつながっています。
      </div>

      <PacketJourney />
      <CompareTable />
      <SortQuiz />
    </div>
  );
}
