"use client";

import { useState, type ReactNode } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { NetDevScene } from "./netdev/NetDevScene";
import { PHASES, type NetDevMode } from "./netdev/netdevTypes";
import { usePhasePlayer } from "./scene/usePhasePlayer";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// 「ネットワーク機器の役割」。
//   ① OSIの層のはしご：層 → 機器 → 扱う単位（信号／フレーム／パケット／変換）と、見ている宛先
//   ② 会社のフロアの模型（WebGL があれば Blender 製の動く3D、なければ 2.5D）：機器を選ぶと、
//      その機器を通るデータの流れが場面ごとに見える（ハブ⇔スイッチの差し替え・ルータで外へ・AP・リピータ・ゲートウェイ）
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
//   機器を選ぶと、2〜3の場面が自動で進み、最後の場面で止まる（CPU・サイバー攻撃の動く3D模型と同じ作り）。
//   場面ごとに模型の動きと短い吹き出し（35文字以内）が1つずつ変わる。層・試験の用語は「詳しく見る」に分け、
//   開いている間は場面の再生を止める。
// ---------------------------------------------------------------------------

function Terms({ items }: { items: string[] }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="font-bold text-gray-500">試験で問われる用語</span>
      {items.map((t) => (
        <span key={t} className="rounded-full bg-white px-2 py-0.5 font-bold text-gray-700 ring-1 ring-gray-200">
          {t}
        </span>
      ))}
    </p>
  );
}

const MODES: { key: NetDevMode; label: string; layer: string; result: string; detail: ReactNode; next?: NetDevMode }[] = [
  {
    key: "hub",
    label: "ハブ",
    layer: "第1層・信号",
    result: "PC-C宛てなのに、B と D にも届きました。ハブは宛先を見ずに、受けた信号を全部のポートへそのまま流します。",
    detail: (
      <>
        <p>ハブは<b>物理層</b>の機器。電気の信号を中継するだけで、宛先（MACアドレス）は読みません。関係ない PC にも届くので、通信が混みやすく、のぞき見もされやすくなります。</p>
        <Terms items={["ハブ", "物理層", "信号"]} />
      </>
    ),
    next: "switch",
  },
  {
    key: "switch",
    label: "スイッチ",
    layer: "第2層・フレーム",
    result: "同じ配線のまま真ん中をスイッチに替えると、C にだけ届きます。スイッチは MACアドレス表で宛先のポートを調べて、そこだけへ送ります。",
    detail: (
      <>
        <p>スイッチ（スイッチングハブ）は<b>データリンク層</b>の機器。フレームの宛先MACアドレスを見て、つながっているポートだけへ送ります。表は流れてきたフレームの送信元から自動で覚えます。</p>
        <Terms items={["スイッチ（L2スイッチ）", "データリンク層", "MACアドレス", "フレーム", "ブリッジ"]} />
      </>
    ),
  },
  {
    key: "router",
    label: "ルータ",
    layer: "第3層・パケット",
    result: "社内LANの外（インターネット）へ出るときは、出口のルータを通ります。ルータは宛先の IPアドレスを見て、別のネットワークへの道を選びます。",
    detail: (
      <>
        <p>ルータは<b>ネットワーク層</b>の機器。パケットの宛先IPアドレスを見て、どのネットワークへ送るか（経路）を選びます。社内LANとインターネットのように、<b>別々のネットワークをつなぐ</b>のが仕事です。</p>
        <Terms items={["ルータ", "ネットワーク層", "IPアドレス", "パケット", "ルーティング", "デフォルトゲートウェイ"]} />
      </>
    ),
  },
  {
    key: "ap",
    label: "AP",
    layer: "第2層・フレーム",
    result: "ノートPCは電波で AP（アクセスポイント）へ。AP からは有線でスイッチにつながるので、無線の端末も同じ社内LANの一員になります。",
    detail: (
      <>
        <p>AP（無線LANアクセスポイント）は、無線の端末を有線のLANにつなぐ入口。どの AP につなぐかは <b>SSID</b>（ネットワークの名前）で選びます。</p>
        <Terms items={["アクセスポイント", "無線LAN", "SSID", "Wi-Fi"]} />
      </>
    ),
  },
  {
    key: "repeater",
    label: "リピータ",
    layer: "第1層・信号",
    result: "別棟の倉庫までケーブルが長く、途中で信号が弱ります。リピータが元の強さに戻して、先へ延長します。中身や宛先は見ません。",
    detail: (
      <>
        <p>リピータは<b>物理層</b>の機器。弱った信号を増幅・整形して、ケーブルの届く距離を延ばします。ハブと同じく宛先は見ません。</p>
        <Terms items={["リピータ", "物理層", "増幅"]} />
      </>
    ),
  },
  {
    key: "gateway",
    label: "ゲートウェイ",
    layer: "第4〜7層・変換",
    result: "工場の機械は社内と違う通信方式です。ゲートウェイがデータの形式やプロトコルを変換して、方式の違う相手とつなぎます。",
    detail: (
      <>
        <p>ゲートウェイは、<b>プロトコル（通信の決まり）やデータ形式が違う</b>ネットワーク同士を、変換してつなぐ機器・ソフトウェア。トランスポート層より上の層で働きます。</p>
        <Terms items={["ゲートウェイ", "プロトコル変換", "トランスポート層〜アプリケーション層"]} />
      </>
    ),
  },
];

const navBtn = "inline-flex h-10 items-center justify-center gap-1 rounded-full px-4 text-xs font-bold transition active:scale-95";

function OfficePanel() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<NetDevMode | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  /** 「停止」を押して止めている（「再開」で続きから） */
  const [stopped, setStopped] = useState(false);
  const phases = mode ? PHASES[mode] : null;
  const player = usePhasePlayer([phases?.length ?? 1], !mode || stopped || showDetail);
  const phase = phases ? phases[player.phase] : null;
  const m = MODES.find((x) => x.key === mode) ?? null;

  const pick = (key: NetDevMode) => {
    setMode(key);
    setStopped(false);
    player.move(0);
  };
  const replay = () => {
    setStopped(false);
    player.replay();
  };
  // 再生ボタンは状況で役割が変わる：再生中＝停止 / 停止中＝再開 / 見終わった＝もう一度見る
  const playState: "playing" | "stopped" | "done" = player.done ? "done" : stopped ? "stopped" : "playing";

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

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-gray-700" data-testid="netdev-heading">
          {m ? (
            <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-accent-800">
              {m.label}：{m.layer}
            </span>
          ) : (
            "↑ 機器を選ぶと、データの流れが模型に出ます"
          )}
        </p>
        {phases && phases.length > 1 && (
          <div className="flex flex-none items-center gap-1" aria-label={`場面 ${player.phase + 1} / ${phases.length}`} role="img">
            {phases.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === player.phase ? "w-4 bg-brand-600" : i < player.phase ? "w-1.5 bg-brand-300" : "w-1.5 bg-gray-300"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="-mx-2 mt-2 sm:mx-0">
        <NetDevScene mode={mode} phase={phase} firstPhase={player.phase === 0} epoch={player.run} paused={stopped || showDetail} reducedMotion={reducedMotion} />
      </div>

      {m && (
        <>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={playState === "playing" ? () => setStopped(true) : playState === "stopped" ? () => setStopped(false) : replay}
              className={`${navBtn} min-w-[8.5rem] bg-white text-gray-700 ring-1 ring-gray-300`}
              data-testid="netdev-play"
              data-state={playState}
            >
              {playState === "playing" ? "⏸ 停止" : playState === "stopped" ? "▶ 再開" : "↻ もう一度見る"}
            </button>
            {player.done && m.next && (
              <button type="button" onClick={() => pick(m.next!)} className={`${navBtn} bg-gray-900 text-white`} data-testid="netdev-next">
                {MODES.find((x) => x.key === m.next)?.label}に替えて比べる →
              </button>
            )}
          </div>

          {player.done && (
            <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200" data-testid="netdev-result">
              {m.result}
            </p>
          )}

          <details
            className="group mt-3 rounded-xl bg-gray-50 ring-1 ring-gray-200 [&_b]:text-gray-900"
            open={showDetail}
            onToggle={(e) => setShowDetail((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-bold text-gray-700">
              詳しく見る（層・試験の用語）{showDetail && "　再生を一時停止中"}
              <span className="text-gray-400 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="space-y-2 px-4 pb-3 text-sm leading-relaxed text-gray-700" data-testid="netdev-detail">
              {m.detail}
            </div>
          </details>
        </>
      )}
    </Panel>
  );
}
