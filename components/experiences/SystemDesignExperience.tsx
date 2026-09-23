"use client";

import type { ReactNode } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「システム設計（外部設計・内部設計）」。混同を防ぐのが目的なので、静的な図で「境界線」を引く。
//   ① 工程の流れ：要件定義 → 外部設計 → 内部設計 → 実装。右へ行くほど「作る側」に近い
//   ② 1つの注文システムを「利用者から見える線」で上下に切る：上＝外部設計（画面・帳票・IF・データ）、下＝内部設計（モジュール）
//   ③ 決めることの仕分け表（家づくりのたとえ付き）
//   ④ 試験ポイント

export default function SystemDesignExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        📐 設計は2段階。まず<b>利用者から見える部分</b>を決め（外部設計）、次にそれを<b>中でどう動かすか</b>を決めます（内部設計）。
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
// ① 工程の流れ
// ---------------------------------------------------------------------------

const PHASES = [
  { name: "要件定義", q: "何が必要？", who: "利用者と" },
  { name: "外部設計", q: "どう見える？", who: "利用者と" },
  { name: "内部設計", q: "中でどう動く？", who: "開発者が" },
  { name: "実装", q: "コードを書く", who: "開発者が" },
];

function FlowPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>要件から実装へ、だんだん細かく</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">右へ進むほど、利用者の言葉から<b className="text-gray-800">作る人の言葉</b>に変わります。</p>
      <div className="mt-3 grid grid-cols-4 gap-1" data-testid="design-flow">
        {PHASES.map((p, i) => (
          <div key={p.name} className="relative">
            <div
              className={`rounded-lg px-0.5 py-2 text-center ${
                i === 1 ? "bg-brand-600 text-white" : i === 2 ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              <div className="text-[13px] font-bold leading-tight">{p.name}</div>
              <div className={`mt-1 text-[11px] leading-tight ${i === 1 || i === 2 ? "text-white/85" : "text-gray-500"}`}>{p.q}</div>
            </div>
            <div className={`mt-1 text-center text-[11px] font-bold ${p.who === "利用者と" ? "text-brand-700" : "text-gray-600"}`}>{p.who}</div>
            {i < PHASES.length - 1 && (
              <span className="absolute -right-1.5 top-4 z-10 text-sm font-bold text-gray-400" aria-hidden>
                ▸
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-gray-500" aria-hidden>
        <span className="text-brand-700">利用者に近い</span>
        <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-brand-400 to-gray-600" />
        <span className="text-gray-700">作る側に近い</span>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 見える線で切る
// ---------------------------------------------------------------------------

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded bg-brand-600 px-1 text-[11px] font-bold text-white">{children}</span>;
}

function BoundaryPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>「見える線」で上下に切る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">ネットショップの注文システムを1枚の図にしました。点線より上が外部設計、下が内部設計です。</p>

      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300" data-testid="design-boundary">
        {/* 外部設計 */}
        <div className="bg-brand-50 p-2" data-testid="design-external">
          <div className="mb-1.5 text-[12px] font-bold text-brand-800">外部設計 ― 利用者・接続先から見える</div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg bg-white p-1.5 ring-1 ring-brand-200">
              <Tag>画面</Tag>
              <div className="mt-1 space-y-0.5 rounded-md border border-gray-300 p-1 text-[11px] text-gray-700">
                <div>商品：<span className="text-gray-500">ノート ▾</span></div>
                <div>数量：<span className="rounded border border-gray-300 px-1">2</span></div>
                <div className="rounded bg-accent-500 py-0.5 text-center font-bold text-white">注文する</div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-1.5 ring-1 ring-brand-200">
              <Tag>帳票</Tag>
              <div className="mt-1 rounded-md border border-gray-300 p-1 text-[11px] leading-snug text-gray-700">
                <div className="text-center font-bold">納品書</div>
                <div>ノート ×2 … 400円</div>
                <div className="border-t border-gray-200 text-right">合計 400円</div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-1.5 ring-1 ring-brand-200">
              <Tag>インタフェース</Tag>
              <div className="mt-1 text-[11px] leading-snug text-gray-700">配送会社のシステムへ、出荷データを送る形式</div>
            </div>
            <div className="rounded-lg bg-white p-1.5 ring-1 ring-brand-200">
              <Tag>入出力データ</Tag>
              <div className="mt-1 text-[11px] leading-snug text-gray-700">注文番号・商品・数量・届け先</div>
            </div>
          </div>
        </div>

        <div className="relative border-t-2 border-dashed border-gray-400 bg-white">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 text-[11px] font-bold text-gray-600 ring-1 ring-gray-300">
            ここから下は利用者には見えない
          </span>
        </div>

        {/* 内部設計 */}
        <div className="bg-gray-50 p-2 pt-3" data-testid="design-internal">
          <div className="mb-1.5 text-[12px] font-bold text-gray-800">内部設計 ― 中でどう動かすか</div>
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-0.5 text-center">
            {["在庫確認", "決済", "発送指示"].map((m, i) => (
              <div key={m} className="contents">
                {i > 0 && (
                  <div className="flex flex-col items-center text-gray-400" aria-hidden>
                    <span className="text-[11px] font-bold leading-none text-gray-500">{i === 1 ? "OK" : "済"}</span>
                    <span className="text-sm font-bold leading-none">→</span>
                  </div>
                )}
                <div className="rounded-lg bg-gray-700 px-0.5 py-2 text-[12px] font-bold text-white">
                  {m}
                  <div className="text-[11px] font-normal text-white/80">モジュール</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-gray-600">処理をどの<b>モジュール</b>に分けるか、どの順に呼び、何のデータを渡すか。</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        💡 迷ったら「<b className="text-gray-800">利用者と相談して決める？</b>」と考える。相談するなら外部設計、開発者だけで決めるなら内部設計。
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
          <div className="text-[11px] font-normal text-white/85">🏠 間取り・窓の位置</div>
        </div>
        <div className="rounded-lg bg-gray-700 py-1.5 text-center text-[13px] font-bold text-white">
          内部設計
          <div className="text-[11px] font-normal text-white/85">🔩 柱の組み方・配線</div>
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
