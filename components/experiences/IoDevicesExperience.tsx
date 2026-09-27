"use client";

import type { ComponentType } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import {
  CameraIcon,
  DisplayIcon,
  KeyboardIcon,
  MicIcon,
  MouseIcon,
  PersonIcon,
  PrinterIcon,
  ScannerIcon,
  SpeakerIcon,
  SsdIcon,
  TouchPanelIcon,
} from "./hardware/HwIcons";
import { Panel, SectionTitle } from "./ui";

// 「入出力装置と各種デバイス」。
//   ① 人・現実世界 → 入力装置 → コンピュータ → 出力装置 → 人 の一方向の流れ（スマホは縦、PCは横）
//      両方を担うタッチパネルと、入出力ではない補助記憶（SSD・USBメモリ）は流れの下に分けて置く
//   ② 接続インタフェース：有線（USB・HDMI）／無線（Bluetooth・NFC）を「何を運ぶか・届く距離」で
//   ③ 試験ポイント

type Dev = { name: string; Icon: ComponentType<{ className?: string }>; what: string };

const INPUTS: Dev[] = [
  { name: "キーボード", Icon: KeyboardIcon, what: "文字" },
  { name: "マウス", Icon: MouseIcon, what: "位置・クリック" },
  { name: "マイク", Icon: MicIcon, what: "音" },
  { name: "スキャナ", Icon: ScannerIcon, what: "紙の文字・絵" },
  { name: "カメラ", Icon: CameraIcon, what: "映像" },
];

const OUTPUTS: Dev[] = [
  { name: "ディスプレイ", Icon: DisplayIcon, what: "画面に表示" },
  { name: "プリンタ", Icon: PrinterIcon, what: "紙に印刷" },
  { name: "スピーカー", Icon: SpeakerIcon, what: "音を出す" },
];

function DeviceGroup({ title, devices, testId }: { title: string; devices: Dev[]; testId: string }) {
  return (
    <div className="flex-1 rounded-xl p-2.5 ring-1 ring-gray-300" data-testid={testId}>
      <p className="text-center text-base font-bold text-gray-900">{title}</p>
      <ul className="mt-1.5 grid grid-cols-3 gap-x-1 gap-y-2 sm:grid-cols-2">
        {devices.map((d) => (
          <li key={d.name} className="flex flex-col items-center text-center">
            <d.Icon className="h-9 w-12" />
            <span className="text-[12px] font-bold leading-tight text-gray-900">{d.name}</span>
            <span className="text-[10.5px] leading-tight text-gray-500">{d.what}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 流れの矢印。スマホ（縦並び）では下向き、PC（横並び）では右向き */
function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-none items-center justify-center gap-1 py-1 sm:flex-col sm:px-0.5 sm:py-0" aria-hidden>
      <span className="text-xl font-bold leading-none text-amber-500 sm:hidden">↓</span>
      <span className="hidden text-xl font-bold leading-none text-amber-500 sm:inline">→</span>
      <span className="text-[10.5px] font-bold text-gray-600 sm:[writing-mode:horizontal-tb]">{label}</span>
    </div>
  );
}

function EndPoint({ label }: { label: string }) {
  return (
    <div className="flex flex-none flex-row items-center justify-center gap-1 sm:w-14 sm:flex-col">
      <PersonIcon className="h-8 w-10" />
      <span className="text-center text-[11px] font-bold leading-tight text-gray-700">{label}</span>
    </div>
  );
}

function FlowPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>情報は「入力 → コンピュータ → 出力」の一方向に流れる</SectionTitle>
      <div className="mt-4 flex flex-col items-stretch sm:flex-row sm:items-center" data-testid="io-flow">
        <EndPoint label="人・現実世界" />
        <FlowArrow label="情報を渡す" />
        <DeviceGroup title="入力装置" devices={INPUTS} testId="io-inputs" />
        <FlowArrow label="データ" />
        <div className="flex flex-none flex-col items-center justify-center rounded-xl bg-gray-900 px-3 py-3 text-white">
          <span className="whitespace-nowrap text-sm font-bold">コンピュータ</span>
          <span className="text-[10.5px] text-gray-300">処理する</span>
        </div>
        <FlowArrow label="結果" />
        <DeviceGroup title="出力装置" devices={OUTPUTS} testId="io-outputs" />
        <FlowArrow label="人へ返す" />
        <EndPoint label="人・現実世界" />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2" data-testid="io-special">
        <div className="flex items-center gap-2 rounded-xl p-2.5 ring-1 ring-gray-200">
          <TouchPanelIcon className="h-10 w-12 flex-none" />
          <div>
            <p className="text-sm font-bold text-gray-900">タッチパネル ＝ 入力と出力の両方</p>
            <p className="text-[12.5px] leading-snug text-gray-600">画面に表示（出力）し、指で触れた位置を受け取る（入力）</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl p-2.5 ring-1 ring-gray-200">
          <SsdIcon className="h-10 w-12 flex-none" />
          <div>
            <p className="text-sm font-bold text-gray-900">SSD・USBメモリ ＝ 補助記憶装置</p>
            <p className="text-[12.5px] leading-snug text-gray-600">入力でも出力でもなく、電源を切ってもデータを残しておく場所</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

const INTERFACES = [
  { name: "USB", wire: "有線", carry: "周辺機器のデータ・給電", ex: "マウス・USBメモリ・充電" },
  { name: "HDMI", wire: "有線", carry: "映像と音声", ex: "PC → ディスプレイ・テレビ" },
  { name: "Bluetooth", wire: "無線", carry: "近距離（数m〜10m程度）", ex: "ワイヤレスイヤホン・キーボード" },
  { name: "NFC", wire: "無線", carry: "ごく近距離（数cm）＝かざす", ex: "交通系ICカード・タッチ決済" },
];

function InterfacePanel() {
  return (
    <Panel>
      <SectionTitle step={2}>機器をつなぐ規格は「有線か無線か」と「何を運ぶか」で見分ける</SectionTitle>
      <ul className="mt-4 space-y-2" data-testid="io-interfaces">
        {INTERFACES.map((it) => (
          <li key={it.name} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-2 border-b border-gray-100 pb-2 last:border-0">
            <p className="text-base font-bold text-gray-900">
              {it.name}
              <span className="ml-1 block text-[11px] font-bold text-gray-500">{it.wire}</span>
            </p>
            <div>
              <p className="text-[15px] font-bold leading-snug text-gray-800">{it.carry}</p>
              <p className="text-[12.5px] text-gray-600">例：{it.ex}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
        「USBメモリ」の<b className="text-gray-900">USBはつなぎ方（インタフェース）の名前</b>。記憶装置としての分類は補助記憶装置です。
      </p>
    </Panel>
  );
}

export default function IoDevicesExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        <b>入力装置</b>は人や現実世界からコンピュータへ情報を渡す装置、<b>出力装置</b>は処理した結果を人へ返す装置。
        暗記より先に、<b>情報がどちら向きに流れるか</b>で見分けます。
      </Lead>
      <FlowPanel />
      <InterfacePanel />
      <PointsPanel
        step={3}
        points={[
          <>コンピュータ<b>へ</b>渡す＝入力装置、コンピュータ<b>から</b>返す＝出力装置</>,
          <>USB・HDMIは<b>有線</b>、Bluetooth・NFCは<b>近距離無線</b>（NFCはかざす距離）</>,
          <>SSD・USBメモリは<b>補助記憶装置</b></>,
        ]}
        traps={[
          ["スキャナは紙を扱うから出力装置", "紙の内容をコンピュータへ取り込むので入力装置"],
          ["BluetoothとNFCは同じくらいの距離", "Bluetoothは数m〜10m程度、NFCは数cmでかざして使う"],
        ]}
      />
    </div>
  );
}
