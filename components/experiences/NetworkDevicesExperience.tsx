"use client";

import { useState } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { NetworkDevicesDioramaScene, type NetDevMode } from "./netdev/NetworkDevicesDioramaScene";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// 「ネットワーク機器の役割」。
//   ① OSIの層のはしご：層 → 機器 → 扱う単位（信号／フレーム／パケット／変換）と、見ている宛先
//   ② 会社のフロアの3D模型：機器を選ぶと、その機器を通るデータの流れが見える
//      （ハブ⇔スイッチの差し替え・ルータで外へ・AP・リピータ・ゲートウェイ）
//   ③ 試験ポイント

export default function NetworkDevicesExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        ネットワーク機器は、<b>何を見て、何を送るか</b>で見分けます。宛先を見ない（信号）→ MACアドレスを見る（フレーム）→ IPアドレスを見る（パケット）→ 仕組みごと変換する、の順に賢くなります。
      </Lead>
      <LadderPanel />
      <OfficePanel />
      <PointsPanel
        step={3}
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
// ② 会社のフロアの模型
// ---------------------------------------------------------------------------

const MODES: { key: NetDevMode; label: string; layer: string; result: string }[] = [
  {
    key: "hub",
    label: "ハブ",
    layer: "第1層・信号",
    result: "PC-A から PC-C へ送ったのに、B と D にも届きました。ハブは宛先を見ずに、受けた信号を全部のポートへそのまま流します。",
  },
  {
    key: "switch",
    label: "スイッチ",
    layer: "第2層・フレーム",
    result: "同じ配線のまま真ん中をスイッチに替えると、C にだけ届きます。スイッチは MACアドレス表で「C はポート3」と覚えていて、そのポートだけへ送ります。",
  },
  {
    key: "router",
    label: "ルータ",
    layer: "第3層・パケット",
    result: "社内LANの外（インターネット）へ出るときは、出口のルータを通ります。ルータは宛先の IPアドレスを見て、別のネットワークへの道を選びます。",
  },
  {
    key: "ap",
    label: "AP",
    layer: "第2層・フレーム",
    result: "ノートPCは電波で AP（アクセスポイント）へ。AP からは有線でスイッチにつながるので、無線の端末も同じ社内LANの一員になります。",
  },
  {
    key: "repeater",
    label: "リピータ",
    layer: "第1層・信号",
    result: "別棟の倉庫までケーブルが長く、途中で信号が弱ります。リピータが元の強さに戻して、先へ延長します。中身や宛先は見ません。",
  },
  {
    key: "gateway",
    label: "ゲートウェイ",
    layer: "第4〜7層・変換",
    result: "工場の機械は社内と違う通信方式です。ゲートウェイがデータの形式やプロトコルを変換して、方式の違う相手とつなぎます。",
  },
];

function OfficePanel() {
  const [mode, setMode] = useState<NetDevMode | null>(null);
  const [runKey, setRunKey] = useState(0);
  const reducedMotion = useReducedMotion();
  const m = MODES.find((x) => x.key === mode) ?? null;
  const pick = (key: NetDevMode) => {
    setMode(key);
    setRunKey((k) => k + 1);
  };

  return (
    <Panel>
      <SectionTitle step={2}>会社のフロアで、機器の仕事を見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        小さな会社の1フロアです。<b className="text-gray-800">機器を選ぶ</b>と、その機器を通るデータの流れが見えます。まずはハブとスイッチを比べてみましょう。
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5" data-testid="netdev-modes">
        {MODES.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => pick(x.key)}
            aria-pressed={mode === x.key}
            className={`rounded-lg px-1 py-2 text-[12px] font-bold leading-tight transition active:scale-95 ${
              mode === x.key ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <NetworkDevicesDioramaScene mode={mode} runKey={runKey} reducedMotion={reducedMotion} />
      </div>

      {m && (
        <div className="mt-3 space-y-2" data-testid="netdev-result">
          <div className="flex justify-center">
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-800">
              {m.label}：{m.layer}
            </span>
          </div>
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200">{m.result}</p>
        </div>
      )}
    </Panel>
  );
}
