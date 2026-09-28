"use client";

import { useState } from "react";
import { DivideStage, EfficiencyStage, SolveStage, TimeStage, TransferPractice, UnitStage } from "./transfer/TransferStages";
import { LanWanDioramaScene, type LanWanDest } from "./lanwan/LanWanDioramaScene";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「LANとWAN」専用の体験。
//   ① 宛先を選んでデータを送る → 自宅・電柱・局舎・会社・海外データセンターの3D模型の中を小包がたどる（LAN内で完結 / WAN経由）
//   ② 比較表（範囲・例・だれが用意・速度）
//   ③ これはどっち？ 仕分けクイズ（範囲で見分ける練習）
//   ④〜⑨ 通信速度・転送時間（transfer/TransferStages）：割り算の意味 → Byte/bit → 利用効率 → 32秒 → 解き方 → 確認3問
// ============================================================================

type Dest = LanWanDest;

const DESTS: {
  key: Dest;
  label: string;
  usesWan: boolean;
  result: string;
}[] = [
  {
    key: "printer",
    label: "🖨️ 同じ家のプリンタ",
    usesWan: false,
    result:
      "家の中のネットワーク（LAN）だけで届いた！ WANは通っていません。近い相手はLAN内で完結するので速い。",
  },
  {
    key: "office",
    label: "🏢 遠くの会社のサーバ",
    usesWan: true,
    result:
      "家のLANを出て、通信会社の回線（WAN）を通り、会社のLANへ届いた！ 離れたLANどうしを結ぶのがWANです。",
  },
  {
    key: "video",
    label: "🌍 海外の動画サイト",
    usesWan: true,
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

  const reducedMotion = useReducedMotion();
  const [runKey, setRunKey] = useState(0);
  const send = (key: Dest) => {
    setDest(key);
    setRunKey((k) => k + 1);
    setTried((prev) => new Set(prev).add(key));
  };

  return (
    <Panel>
      <SectionTitle step={1}>宛先を選んで、データを送ってみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        自宅のソファにいるあなたのスマホから送信します。<b className="text-gray-800">宛先をタップ</b>すると、
        データが家の中・電柱・通信事業者の局舎…と、実際にどこを通るかが分かります。
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

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <LanWanDioramaScene dest={dest} runKey={runKey} reducedMotion={reducedMotion} />
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
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        ネットワークは「広さ」で呼び方が変わります。代表が <b>LAN（狭い）</b> と <b>WAN（広い）</b>。
        スマホ →（家のWi-Fi＝LAN）→ プロバイダ →（インターネット＝WAN）→ 相手、の順でつながっています。
        後半（④〜）では、回線でファイルを送るのに<b>何秒かかるか</b>を計算できるようにします。
      </div>

      <PacketJourney />
      <CompareTable />
      <SortQuiz />
      <DivideStage />
      <UnitStage />
      <EfficiencyStage />
      <TimeStage />
      <SolveStage />
      <TransferPractice />
    </div>
  );
}
