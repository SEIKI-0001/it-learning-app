import type { ReactNode } from "react";
import { PrinterIcon, ScannerIcon, SsdIcon, TouchPanelIcon } from "./HwIcons";
import { Panel, SectionTitle } from "../ui";

// 入出力装置の解説で、過去問の出題に合わせて足した2枚（静的な図。押すボタンは置かない）。
//   ③ 読み取る・触れる：スキャナ→OCR（dpi）、タッチパネルの方式
//   ④ 印刷する・しまう：プリンタの印字方式、DVDの種類、NAS
// 文言は公式過去問（令和4〜8年度）の言い回しにそろえている。

function Sub({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[13px] font-bold text-gray-800">{children}</p>;
}

function Rows({ items, testId, col }: { items: { t: ReactNode; d: ReactNode; key: string; hit?: boolean }[]; testId: string; col: string }) {
  return (
    <dl className="mt-1.5 space-y-1" data-testid={testId}>
      {items.map((x) => (
        <div
          key={x.key}
          data-term={x.key}
          className={`grid items-baseline gap-2 rounded-lg px-2 py-1 text-[12.5px] leading-snug ${x.hit ? "bg-brand-50 ring-1 ring-brand-200" : ""}`}
          style={{ gridTemplateColumns: `${col} 1fr` }}
        >
          <dt className={`font-bold ${x.hit ? "text-brand-900" : "text-gray-900"}`}>{x.t}</dt>
          <dd className="text-gray-700">{x.d}</dd>
        </div>
      ))}
    </dl>
  );
}

function Step({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`flex-1 rounded-lg px-1.5 py-1.5 text-center text-[11.5px] font-bold leading-tight ${dark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800 ring-1 ring-gray-200"}`}>
      {children}
    </div>
  );
}

const Arrow = () => (
  <span className="flex-none text-base font-bold text-amber-500" aria-hidden>
    →
  </span>
);

// ③ 読み取る・触れる ---------------------------------------------------------------------
const TOUCH = [
  { key: "静電容量方式", t: "静電容量方式", d: "指が表面に近づいたときの電気の変化で位置を検出。スマートフォンで広く採用", hit: true },
  { key: "感圧式", t: "感圧式", d: "押された圧力で位置を検出。手袋やペンでも反応" },
  { key: "光学式", t: "光学式", d: "画面のふちの赤外線を指がさえぎった位置を検出" },
  { key: "電磁誘導方式", t: "電磁誘導方式", d: "専用ペンが出す磁界で位置を検出" },
];

const LOOKALIKE = [
  { key: "CCD", t: "CCD", d: "光を電気信号に変える撮像素子（スキャナやカメラの部品）" },
  { key: "GPU", t: "GPU", d: "画像処理を専門に行うプロセッサ" },
  { key: "スクリーンリーダー", t: "スクリーンリーダー", d: "画面の文字を音声で読み上げるソフト" },
];

export function ReadTouchPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>紙を読み取る・画面に触れる</SectionTitle>
      <div className="mt-3 space-y-1" data-testid="ocr-flow">
        <div className="flex items-center gap-1">
          <Step>紙の書類</Step>
          <Arrow />
          <div className="flex flex-[1.4] items-center justify-center gap-1 rounded-lg bg-gray-50 px-1 py-1 ring-1 ring-gray-200">
            <ScannerIcon className="h-6 w-8 flex-none" />
            <span className="text-[11.5px] font-bold leading-tight text-gray-800">イメージスキャナー</span>
          </div>
          <Arrow />
          <Step>画像</Step>
        </div>
        <div className="flex items-center gap-1 pl-[30%]">
          <Arrow />
          <Step dark>OCR</Step>
          <Arrow />
          <Step>テキストデータ</Step>
        </div>
      </div>
      <dl className="mt-2.5 space-y-1.5 text-[12.5px] leading-snug" data-testid="ocr-terms">
        <div data-term="イメージスキャナー">
          <dt className="inline font-bold text-gray-900">イメージスキャナー：</dt>
          <dd className="inline text-gray-700">紙に光を当て、反射光を読み取って文字や図形をデジタルデータにする入力装置</dd>
        </div>
        <div data-term="dpi">
          <dt className="inline font-bold text-gray-900">dpi：</dt>
          <dd className="inline text-gray-700">
            どこまで細かく読み取れるかの単位（1インチあたりの点の数）。600dpiは1,200dpiより粗い。<b className="text-gray-900">bps</b>は通信速度の単位で別物
          </dd>
        </div>
        <div data-term="OCR">
          <dt className="inline font-bold text-gray-900">OCR：</dt>
          <dd className="inline text-gray-700">画像の中の<b className="text-gray-900">印刷文字や手書き文字を認識し、テキストデータに変換</b>する</dd>
        </div>
      </dl>

      <Sub>選択肢に並ぶ別物</Sub>
      <Rows testId="ocr-lookalike" col="7.25rem" items={LOOKALIKE} />

      <div className="mt-3 flex items-center gap-1.5">
        <TouchPanelIcon className="h-8 w-10 flex-none" />
        <p className="text-[13px] font-bold text-gray-800">タッチパネルの方式は「何で位置を知るか」</p>
      </div>
      <Rows testId="touch-methods" col="6.5rem" items={TOUCH} />
    </Panel>
  );
}

// ④ 印刷する・しまう ---------------------------------------------------------------------
const PRINTERS = [
  { key: "インクジェット", t: "インクジェット", d: "インクの微細な粒子を用紙に直接吹き付ける", hit: true },
  { key: "レーザ", t: "レーザ", d: "レーザ光で感光体にトナーを付着させ、用紙に写す" },
  { key: "熱転写", t: "熱転写", d: "熱で溶けるインクを印字ヘッドで加熱して用紙に写す" },
  { key: "ドットインパクト", t: "ドット​インパクト", d: "インクリボンをワイヤで用紙に打ち付ける（複写式の伝票に使える）" },
];

const DVDS: { key: string; can: string; tone: string }[] = [
  { key: "DVD-ROM", can: "読出し専用", tone: "bg-gray-900 text-white" },
  { key: "DVD-R", can: "1回だけ書込み", tone: "bg-gray-50 text-gray-800 ring-1 ring-gray-200" },
  { key: "DVD-RW", can: "書換え可", tone: "bg-gray-50 text-gray-800 ring-1 ring-gray-200" },
  { key: "DVD-RAM", can: "書換え可", tone: "bg-gray-50 text-gray-800 ring-1 ring-gray-200" },
];

export function PrintStorePanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>印刷する・データをしまう</SectionTitle>
      <div className="mt-3 flex items-center gap-1.5">
        <PrinterIcon className="h-8 w-10 flex-none" />
        <p className="text-[13px] font-bold text-gray-800">プリンタの印字方式</p>
      </div>
      <Rows testId="printer-methods" col="6.5rem" items={PRINTERS} />

      <Sub>DVDは末尾の記号で、書けるかどうかが分かる</Sub>
      <ul className="mt-1.5 grid grid-cols-4 gap-1 text-center" data-testid="dvd-types">
        {DVDS.map((d) => (
          <li key={d.key} data-term={d.key} className={`rounded-lg px-0.5 py-1.5 ${d.tone}`}>
            <p className="text-[12px] font-bold leading-tight">{d.key}</p>
            <p className="mt-0.5 text-[10.5px] leading-tight opacity-80">{d.can}</p>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11.5px] text-gray-500">ROM＝Read Only Memory（読むだけ）、R＝Recordable、RW＝ReWritable</p>

      <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 ring-1 ring-gray-200" data-testid="nas">
        <SsdIcon className="h-9 w-11 flex-none" />
        <div className="text-[12.5px] leading-snug text-gray-700">
          <p className="text-[13.5px] font-bold text-gray-900">NAS（Network Attached Storage）</p>
          <p className="mt-0.5">
            <b className="text-gray-900">ネットワークに直接接続</b>し、PCやスマートフォンから<b className="text-gray-900">ネットワーク経由で使う外部記憶装置</b>。
          </p>
          <p className="mt-1 text-[11.5px] text-gray-500">別物：RAID＝複数の記憶装置を1台として分散格納する技術、SSID＝無線LANを識別する文字列</p>
        </div>
      </div>
    </Panel>
  );
}
