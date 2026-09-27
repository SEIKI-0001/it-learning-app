"use client";

import type { ComponentType } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { EmbeddedIcon, LaptopIcon, MainframeIcon, ServerIcon, SupercomputerIcon } from "./hardware/HwIcons";
import { Panel, SectionTitle } from "./ui";

// 「コンピュータの種類と用途」。名称 → 見た目 → 主な用途 を1枚のカードにまとめ、5種類を縦に並べて比べる。
//   イラストは「その種類の見分け方」だけを描く：
//   PC＝1台を1人で／サーバ＝1台から多数の利用者へ線が出る／汎用機＝大きな筐体が並び予備へ切り替わる矢印／
//   スーパーコンピュータ＝同じ計算ノードが多数並ぶ／マイコン＝家電の中にチップが入っている
//   ① 5種類を見た目と用途で比べる（静的）
//   ② 場面から種類を選ぶ＋取り違え

type Kind = {
  name: string;
  alias?: string;
  Icon: ComponentType<{ className?: string }>;
  look: string;
  use: string;
  ex: string;
};

const KINDS: Kind[] = [
  { name: "PC", alias: "パーソナルコンピュータ", Icon: LaptopIcon, look: "1人が1台を使う", use: "個人の作業", ex: "文書作成・表計算・Web閲覧" },
  { name: "サーバ", Icon: ServerIcon, look: "1台から、ネットワーク越しに多数の利用者へ", use: "多数の利用者へ機能を提供", ex: "Webサイト・ファイル共有・メール" },
  { name: "汎用機", alias: "メインフレーム", Icon: MainframeIcon, look: "大きな筐体。故障しても予備に切り替わる", use: "大量の取引を止めずに正確に処理", ex: "銀行の勘定系・航空券の予約" },
  { name: "スーパーコンピュータ", Icon: SupercomputerIcon, look: "同じ計算ノードを何千台もつなぐ", use: "膨大な科学技術計算を高速に", ex: "気象予測・創薬・シミュレーション" },
  { name: "マイコン", alias: "組込みシステム", Icon: EmbeddedIcon, look: "機器の中に小さなチップとして入っている", use: "決まった機器の制御", ex: "炊飯器・エアコン・自動車" },
];

export default function ComputerTypesExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        コンピュータの種類は、大きさや値段より<b>「誰が・何のために使うか」</b>で分かれます。
        まず<b>見た目</b>と<b>用途</b>をセットで押さえましょう。
      </Lead>

      <Panel>
        <SectionTitle step={1}>5つの種類を、見た目と用途で比べる</SectionTitle>
        <ul className="mt-4 divide-y divide-gray-100" data-testid="computer-kinds">
          {KINDS.map((k) => (
            <li key={k.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" data-kind={k.name}>
              <div className="flex w-[4.5rem] flex-none flex-col items-center sm:w-24">
                <k.Icon className="h-12 w-16 sm:h-14 sm:w-20" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-snug text-gray-900">
                  {k.name}
                  {k.alias && <span className="ml-1.5 text-xs font-bold text-gray-500">（{k.alias}）</span>}
                </p>
                <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-800">{k.use}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-gray-600">{k.look}</p>
                <p className="text-[13px] leading-snug text-gray-600">例：{k.ex}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <PointsPanel
        step={2}
        points={[
          <>銀行の口座取引のような<b>大量の基幹処理</b> → <b>汎用機</b></>,
          <>気象予測のような<b>膨大な科学技術計算</b> → <b>スーパーコンピュータ</b></>,
          <>炊飯器の温度制御のような<b>機器の制御</b> → <b>マイコン</b></>,
          <>社内の多数の人へ<b>ファイルやWebを提供</b> → <b>サーバ</b></>,
        ]}
        traps={[
          ["サーバは「大きなPC」", "違いは大きさではなく役割。サーバは多数の利用者へ機能を提供する"],
          ["汎用機もスーパーコンピュータも「とにかく速い大型機」", "汎用機＝大量の取引を止めずに正確に、スパコン＝科学技術計算を速く"],
        ]}
      />
    </div>
  );
}
