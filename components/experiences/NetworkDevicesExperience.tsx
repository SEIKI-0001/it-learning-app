"use client";

import type { ReactNode } from "react";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「ネットワーク機器の役割」。対応関係が本質なので静的な図解。
//   ① OSIの層のはしご：層 → 機器 → 扱う単位（信号／フレーム／パケット／変換）と、見ている宛先
//   ② ハブとスイッチ：PC-A から PC-C へ送ると、ハブは全ポートへ、スイッチは C のポートだけへ
//   ③ どこをつなぐか：小さな会社のネットワーク地図に、各機器を置く
//   ④ 試験ポイント

export default function NetworkDevicesExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        🔌 ネットワーク機器は、<b>何を見て、何を送るか</b>で見分けます。宛先を見ない（信号）→ MACアドレスを見る（フレーム）→ IPアドレスを見る（パケット）→ 仕組みごと変換する、の順に賢くなります。
      </Lead>
      <LadderPanel />
      <HubSwitchPanel />
      <MapPanel />
      <PointsPanel
        step={4}
        points={[
          <>リピータ・ハブ＝<b>物理層</b>で信号を中継（宛先は見ない）</>,
          <>ブリッジ・スイッチ＝<b>データリンク層</b>で MACアドレスを見てフレームを転送。AP は無線端末を LAN に参加させる</>,
          <>ルータ＝<b>ネットワーク層</b>で IPアドレスを見て別のネットワークへ。ゲートウェイ＝異なる仕組みを<b>変換</b></>,
        ]}
        traps={[
          ["ハブとスイッチは同じ", "ハブは全ポートへ送る、スイッチは宛先のポートだけへ送る"],
          ["ルータとゲートウェイは同じ役割", "ルータは同じIPの世界で経路を選ぶ。ゲートウェイはプロトコルやデータ形式を変換する"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 層のはしご
// ---------------------------------------------------------------------------

const LADDER: { layer: string; no: string; devices: string; unit: string; sees: string; tone: string }[] = [
  { layer: "上位の層", no: "4〜7", devices: "ゲートウェイ", unit: "変換", sees: "プロトコル・データ形式", tone: "bg-gray-800 text-white" },
  { layer: "ネットワーク層", no: "3", devices: "ルータ", unit: "パケット", sees: "IPアドレス", tone: "bg-brand-700 text-white" },
  { layer: "データリンク層", no: "2", devices: "スイッチ・ブリッジ・AP", unit: "フレーム", sees: "MACアドレス", tone: "bg-brand-500 text-white" },
  { layer: "物理層", no: "1", devices: "リピータ・ハブ", unit: "信号", sees: "（宛先は見ない）", tone: "bg-brand-200 text-brand-950" },
];

function LadderPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>層ごとに、見ているものが違う</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">下の層ほど単純、上の層ほど中身まで見ます。</p>
      <div className="mt-3 space-y-1" data-testid="netdev-ladder">
        {LADDER.map((l) => (
          <div key={l.layer} className="grid grid-cols-[5.4rem_1fr] gap-1.5">
            <div className={`grid place-items-center rounded-lg px-0.5 py-1.5 text-center ${l.tone}`}>
              <div className="text-[11px] font-bold leading-tight opacity-80">第{l.no}層</div>
              <div className="text-[11px] font-bold leading-tight">{l.layer}</div>
            </div>
            <div className="rounded-lg bg-white px-2 py-1.5 ring-1 ring-gray-200">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-gray-800">{l.devices}</span>
                <span className="ml-auto rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-800">{l.unit}</span>
              </div>
              <div className="mt-0.5 text-[12px] text-gray-500">
                見るもの：<b className="text-gray-700">{l.sees}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">※ 第4〜7層（トランスポート層〜アプリケーション層）をまとめて「上位の層」としています。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② ハブとスイッチ
// ---------------------------------------------------------------------------

const PCS = [
  { id: "A", x: 26, y: 20 },
  { id: "B", x: 114, y: 20 },
  { id: "C", x: 26, y: 100 },
  { id: "D", x: 114, y: 100 },
];

function StarDiagram({ kind }: { kind: "hub" | "switch" }) {
  const cx = 70;
  const cy = 60;
  return (
    <svg viewBox="0 0 140 122" className="w-full mx-auto max-w-[14rem]" role="img" aria-label={kind === "hub" ? "ハブはAからの信号をB・C・Dすべてへ送る" : "スイッチはAからのフレームをCだけへ送る"}>
      {PCS.map((p) => {
        const from = p.id === "A";
        const to = kind === "hub" ? !from : p.id === "C";
        return (
          <line
            key={p.id}
            x1={p.x}
            y1={p.y}
            x2={cx}
            y2={cy}
            className={from ? "stroke-brand-600" : to ? "stroke-accent-500" : "stroke-gray-200"}
            strokeWidth={from || to ? 3 : 2}
            strokeDasharray={!from && to ? "5 3" : undefined}
          />
        );
      })}
      <rect x={cx - 26} y={cy - 12} width="52" height="24" rx="5" className={kind === "hub" ? "fill-brand-200" : "fill-brand-500"} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" className={kind === "hub" ? "fill-brand-950 font-bold" : "fill-white font-bold"}>
        {kind === "hub" ? "ハブ" : "スイッチ"}
      </text>
      {PCS.map((p) => {
        const got = kind === "hub" ? p.id !== "A" : p.id === "C";
        const wrong = kind === "hub" && got && p.id !== "C";
        return (
          <g key={p.id}>
            <rect x={p.x - 20} y={p.y - 11} width="40" height="22" rx="4" className={p.id === "A" ? "fill-brand-600" : got ? (wrong ? "fill-amber-100 stroke-amber-400" : "fill-emerald-100 stroke-emerald-500") : "fill-white stroke-gray-300"} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" className={p.id === "A" ? "fill-white font-bold" : "fill-gray-800 font-bold"}>
              PC-{p.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HubSwitchPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>ハブとスイッチ ― 宛先を見るか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">PC-A から PC-C へ</b>送ります。オレンジの点線が、データが届く先です。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="netdev-hubswitch">
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-[13px] font-bold text-gray-800">ハブ（第1層）</div>
          <StarDiagram kind="hub" />
          <p className="text-[12px] leading-snug text-gray-600">宛先を見ずに<b>全部のポート</b>へ。B・Dにも届いてしまう</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-[13px] font-bold text-gray-800">スイッチ（第2層）</div>
          <StarDiagram kind="switch" />
          <p className="text-[12px] leading-snug text-gray-600">MACアドレス表を見て<b>Cのポートだけ</b>へ</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-white px-2 py-1.5 text-[12px] ring-1 ring-gray-200">
        <Caption>スイッチの MACアドレス表（覚えている対応）</Caption>
        <div className="mt-1 grid grid-cols-2 gap-1 text-center text-[11px]">
          {["A", "B", "C", "D"].map((p, i) => (
            <div key={p} className={`rounded px-0.5 py-0.5 ${p === "C" ? "bg-emerald-100 font-bold text-emerald-900" : "bg-gray-50 text-gray-600"}`}>
              PC-{p}→ポート{i + 1}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ どこをつなぐか（ネットワーク地図）
// ---------------------------------------------------------------------------

const DEV_TONE = {
  dark: ["fill-gray-800", "fill-white"],
  l3: ["fill-brand-700", "fill-white"],
  l2: ["fill-brand-500", "fill-white"],
  l1: ["fill-brand-200", "fill-brand-950"],
} as const;

function Dev({ x, y, w = 62, name, unit, tone }: { x: number; y: number; w?: number; name: string; unit: string; tone: keyof typeof DEV_TONE }) {
  const [bg, ink] = DEV_TONE[tone];
  return (
    <g>
      <rect x={x - w / 2} y={y - 16} width={w} height="32" rx="6" className={bg} />
      <text x={x} y={y - 2} textAnchor="middle" fontSize="12" className={`${ink} font-bold`}>
        {name}
      </text>
      <text x={x} y={y + 11} textAnchor="middle" fontSize="11" className={`${ink} opacity-80`}>
        {unit}
      </text>
    </g>
  );
}

function Pc({ x, y, label }: { x: number; y: number; label: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="12" className="fill-gray-700 font-bold">
      {label}
    </text>
  );
}

function MapPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>どこをつなぐ？ ― 会社のネットワーク地図</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">同じ機器でも、<b className="text-gray-800">つなぐ範囲</b>で役割がわかります。</p>
      <svg viewBox="0 0 300 250" className="mt-3 w-full mx-auto max-w-md" role="img" aria-label="PCとAPがスイッチにつながり、スイッチはルータ経由でインターネットへ。遠いPCはリピータで延長し、ゲートウェイが別方式のシステムと変換する" data-testid="netdev-map">
        {/* 社内LANの枠 */}
        <rect x="4" y="112" width="292" height="134" rx="10" className="fill-brand-50 stroke-brand-200" strokeDasharray="5 4" />
        <text x="12" y="241" fontSize="11" className="fill-brand-800 font-bold">社内LAN（1つのネットワーク）</text>

        {/* 配線 */}
        <line x1="150" y1="160" x2="150" y2="64" className="stroke-gray-400" strokeWidth="2" />
        <line x1="150" y1="64" x2="150" y2="28" className="stroke-gray-400" strokeWidth="2" />
        <line x1="150" y1="160" x2="56" y2="160" className="stroke-gray-400" strokeWidth="2" />
        <line x1="150" y1="160" x2="244" y2="160" className="stroke-gray-400" strokeWidth="2" />
        <line x1="150" y1="160" x2="150" y2="214" className="stroke-gray-400" strokeWidth="2" />
        <line x1="150" y1="214" x2="244" y2="214" className="stroke-gray-400" strokeWidth="2" />
        <line x1="150" y1="64" x2="244" y2="64" className="stroke-gray-400" strokeWidth="2" />
        <path d="M 30 130 q 8 -8 16 0 M 26 124 q 12 -12 24 0" className="fill-none stroke-sky-500" strokeWidth="1.5" />

        {/* 外 */}
        <text x="150" y="20" textAnchor="middle" fontSize="18">🌐</text>
        <text x="176" y="20" fontSize="11" className="fill-gray-600 font-bold">インターネット</text>

        <Dev x={150} y={64} name="ルータ" unit="パケット" tone="l3" />
        <Dev x={244} y={64} w={76} name="ゲートウェイ" unit="変換" tone="dark" />
        <text x="244" y="98" textAnchor="middle" fontSize="11" className="fill-gray-600 font-bold">↕ 別方式のシステム</text>

        <Dev x={150} y={160} name="スイッチ" unit="フレーム" tone="l2" />
        <Dev x={56} y={160} w={56} name="AP" unit="フレーム" tone="l2" />
        <Pc x={38} y={140} label="💻" />

        <Pc x={244} y={165} label="🖥️ PC" />
        <Dev x={150} y={214} name="リピータ" unit="信号" tone="l1" />
        <Pc x={244} y={219} label="🖥️ 遠くのPC" />
      </svg>
      <div className="mt-2 space-y-1 text-[12px] leading-snug text-gray-700">
        <p>
          <b>ルータ</b>：社内LANと<b>別のネットワーク（インターネット）</b>の境目。IPアドレスで行き先を選ぶ
        </p>
        <p>
          <b>スイッチ</b>：<b>同じLANの中</b>で、宛先のPCへ届ける。<b>AP</b>：無線の💻をLANに参加させる入口
        </p>
        <p>
          <b>リピータ</b>：長いケーブルで弱った信号を元の強さに戻して延長。<b>ゲートウェイ</b>：通信方式が違う相手と変換してつなぐ
        </p>
      </div>
    </Panel>
  );
}
