"use client";

import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { VModel } from "./diagram/VModel";
import { Panel, SectionTitle } from "./ui";

// 「システム設計（外部設計・内部設計）」。混同を防ぐのが目的なので、静的な図で「境界線」を引く。
//   ① V字モデル上の位置：外部設計→システムテスト、内部設計→結合テスト（全体のどこにいるか）
//   ② 外部設計｜内部設計 の2カラム。大見出し＋一言定義、画面・帳票は小さなイラストで
//   ③ 決めることの仕分け表（家づくりのたとえ付き）
//   ④ 試験ポイント

export default function SystemDesignExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        設計は2段階。まず<b>利用者から見える部分</b>を決め（外部設計）、次にそれを<b>中でどう動かすか</b>を決めます（内部設計）。
      </Lead>
      <FlowPanel />
      <BoundaryPanel />
      <SortPanel />
      <PointsPanel
        step={4}
        points={[
          <>外部設計＝<b>利用者から見える</b>画面・帳票・他システムとのインタフェース・入出力データ</>,
          <>内部設計＝外部設計を実現する<b>モジュール分割</b>・モジュール間のデータの受け渡し・処理手順</>,
          <>順番は 要件定義 → 外部設計 → 内部設計 → 実装</>,
        ]}
        traps={[
          ["外部設計＝社外向けシステムの設計", "「外部」は利用者から見える部分のこと。社内システムにも外部設計はある"],
          ["内部設計は実装（プログラミング）の後にする", "内部設計を決めてから実装する"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① V字モデル上の位置：外部設計・内部設計が、後のどのテストで確かめられるか
// ---------------------------------------------------------------------------

function FlowPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>外部設計・内部設計は、開発全体のどこ？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        V字モデルは、左で<b className="text-gray-800">設計したこと</b>を、右の<b className="text-gray-800">同じ高さのテスト</b>で確かめる、という対応を表します。
        今回学ぶのは青い2つです。
      </p>
      <div className="mx-auto mt-3 max-w-md" data-testid="design-flow">
        <VModel
          highlight={[1, 2]}
          side="design"
          label="V字モデル。要件定義は受入テスト、外部設計はシステムテスト、内部設計は結合テスト、プログラミングは単体テストで確かめる。外部設計と内部設計を強調。"
        />
      </div>
      <dl className="mt-3 divide-y divide-gray-200 border-y border-gray-200 text-sm">
        <div className="grid grid-cols-[5.5rem_1fr] gap-2 py-2">
          <dt className="font-bold text-gray-900">外部設計</dt>
          <dd className="text-gray-700">要件定義の次。決めた内容は<b className="text-gray-900">システムテスト</b>で確かめる</dd>
        </div>
        <div className="grid grid-cols-[5.5rem_1fr] gap-2 py-2">
          <dt className="font-bold text-gray-900">内部設計</dt>
          <dd className="text-gray-700">外部設計の次・プログラミングの前。決めた内容は<b className="text-gray-900">結合テスト</b>で確かめる</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">外部設計は「基本設計」、内部設計は「詳細設計」と呼ばれることもあります。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 外部設計｜内部設計 を大きく2つに分ける
// ---------------------------------------------------------------------------

function ScreenIllust() {
  return (
    <svg viewBox="0 0 96 64" className="h-14 w-auto flex-none" aria-hidden>
      <rect x="2" y="2" width="92" height="60" rx="6" fill="#fff" stroke="#111827" strokeWidth="2" />
      <line x1="2" y1="14" x2="94" y2="14" stroke="#111827" strokeWidth="1.5" />
      <circle cx="9" cy="8" r="1.8" fill="#111827" />
      <circle cx="15" cy="8" r="1.8" fill="#111827" />
      <rect x="10" y="21" width="34" height="7" rx="2" fill="#e5e7eb" />
      <rect x="50" y="21" width="36" height="7" rx="2" fill="#fff" stroke="#9ca3af" />
      <rect x="10" y="33" width="34" height="7" rx="2" fill="#e5e7eb" />
      <rect x="50" y="33" width="20" height="7" rx="2" fill="#fff" stroke="#9ca3af" />
      <rect x="54" y="47" width="32" height="10" rx="3" fill="#0868c9" />
    </svg>
  );
}

function FormIllust() {
  return (
    <svg viewBox="0 0 64 72" className="h-14 w-auto flex-none" aria-hidden>
      <path d="M4 2 H48 L60 14 V70 H4 Z" fill="#fff" stroke="#111827" strokeWidth="2" strokeLinejoin="round" />
      <path d="M48 2 V14 H60" fill="none" stroke="#111827" strokeWidth="1.5" />
      <rect x="14" y="10" width="24" height="5" rx="1" fill="#111827" />
      {[26, 34, 42].map((yy) => (
        <g key={yy}>
          <line x1="11" y1={yy} x2="38" y2={yy} stroke="#9ca3af" strokeWidth="2" />
          <line x1="44" y1={yy} x2="53" y2={yy} stroke="#9ca3af" strokeWidth="2" />
        </g>
      ))}
      <line x1="11" y1="52" x2="53" y2="52" stroke="#111827" strokeWidth="1.5" />
      <line x1="36" y1="60" x2="53" y2="60" stroke="#0868c9" strokeWidth="3" />
    </svg>
  );
}

function ModuleIllust() {
  return (
    <svg viewBox="0 0 110 64" className="h-14 w-auto flex-none" aria-hidden>
      <rect x="37" y="2" width="36" height="18" rx="4" fill="#374151" />
      {[4, 40, 76].map((x) => (
        <g key={x}>
          <line x1="55" y1="20" x2={x + 15} y2="42" stroke="#6b7280" strokeWidth="1.5" />
          <rect x={x} y="42" width="30" height="18" rx="4" fill="#fff" stroke="#374151" strokeWidth="1.8" />
        </g>
      ))}
    </svg>
  );
}

function BoundaryPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>外部設計と内部設計のちがい</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="design-boundary">
        <section className="rounded-xl p-3.5 ring-2 ring-brand-600" data-testid="design-external">
          <h4 className="text-2xl font-bold text-gray-900">外部設計</h4>
          <p className="mt-1 text-[15px] font-bold leading-snug text-brand-800">ユーザーから見える部分を決める</p>
          <p className="mt-0.5 text-xs text-gray-600">利用者と相談しながら決める</p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center gap-3">
              <ScreenIllust />
              <div>
                <div className="text-sm font-bold text-gray-900">画面</div>
                <div className="text-xs text-gray-600">項目・ボタン・操作の流れ</div>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <FormIllust />
              <div>
                <div className="text-sm font-bold text-gray-900">帳票</div>
                <div className="text-xs text-gray-600">納品書・請求書などの印刷物</div>
              </div>
            </li>
            <li className="text-sm text-gray-800">
              <b className="text-gray-900">他システムとのインタフェース</b>・<b className="text-gray-900">入出力データ</b>
            </li>
          </ul>
        </section>
        <section className="rounded-xl bg-gray-50 p-3.5 ring-1 ring-gray-300" data-testid="design-internal">
          <h4 className="text-2xl font-bold text-gray-900">内部設計</h4>
          <p className="mt-1 text-[15px] font-bold leading-snug text-gray-800">システム内部の作り方を決める</p>
          <p className="mt-0.5 text-xs text-gray-600">開発者（作る側）が決める</p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center gap-3">
              <ModuleIllust />
              <div>
                <div className="text-sm font-bold text-gray-900">モジュール分割</div>
                <div className="text-xs text-gray-600">処理をどの部品に分けるか</div>
              </div>
            </li>
            <li className="text-sm text-gray-800">
              <b className="text-gray-900">モジュール間のデータの受け渡し</b>・<b className="text-gray-900">処理手順</b>
            </li>
          </ul>
        </section>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        迷ったら「<b className="text-gray-900">利用者が目にする？</b>」。目にするなら外部設計、利用者には見えない中身なら内部設計です。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 仕分け表
// ---------------------------------------------------------------------------

const ROWS: [string, string][] = [
  ["画面の項目・操作", "モジュールの分け方"],
  ["帳票（印刷物）のレイアウト", "モジュール間のデータの受け渡し"],
  ["他システムとのインタフェース", "内部の処理手順"],
  ["入力・出力するデータ", "（プログラムは次の実装で書く）"],
];

function SortPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>決めることを仕分ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">家づくりにたとえると、左は住む人と決める「間取り・窓」、右は工事のための「柱・配線」です。</p>
      <div className="mt-3 grid grid-cols-2 gap-x-1.5 gap-y-1 text-[12px]" data-testid="design-sort">
        <div className="rounded-lg bg-brand-600 py-1.5 text-center text-[13px] font-bold text-white">
          外部設計
          <div className="text-[11px] font-normal text-white/85">間取り・窓の位置</div>
        </div>
        <div className="rounded-lg bg-gray-700 py-1.5 text-center text-[13px] font-bold text-white">
          内部設計
          <div className="text-[11px] font-normal text-white/85">柱の組み方・配線</div>
        </div>
        {ROWS.map(([ext, int]) => (
          <div key={ext} className="contents">
            <div className="rounded-lg bg-brand-50 px-2 py-1.5 font-bold text-brand-900 ring-1 ring-brand-200">{ext}</div>
            <div className={`rounded-lg px-2 py-1.5 ring-1 ${int.startsWith("（") ? "text-gray-400 ring-gray-200" : "bg-gray-50 font-bold text-gray-800 ring-gray-300"}`}>{int}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
