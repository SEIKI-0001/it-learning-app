"use client";

import { useState } from "react";
import { Panel } from "./ui";

// ============================================================================
// 「正規化」専用の体験。
// 1枚の注文伝票が、第1〜第3正規形へと分割されていく様子を段階で追う。
// 主キー（ピンク）・重複データ（黄）・繰り返し項目（紫）を色分けして気づかせる。
// ============================================================================

type Cell = string | { dup: true; v: string } | { repeat: true; text: string };

type Table = {
  name: string;
  cols: string[];
  keys: number[];
  rows: Cell[][];
};

type Panel2 = { kind: "" | "fix" | "problem"; lbl: string; html: string };

type Stage = {
  chip: string;
  sub: string;
  title: string;
  explain: Panel2[];
  tables: Table[];
  fd?: string[];
};

const dup = (v: string): Cell => ({ dup: true, v });
const rep = (text: string): Cell => ({ repeat: true, text });

const STAGES: Stage[] = [
  {
    chip: "非正規形",
    sub: "元データ",
    title: "ぐちゃぐちゃの元データ",
    explain: [
      { kind: "", lbl: "これは何？", html: "1枚の注文伝票をそのまま表にしたもの。1つの注文の中に商品が複数行ぶら下がり、マスがきれいな格子になっていない状態。" },
      { kind: "problem", lbl: "何が困る？", html: "行の数が注文ごとにバラバラで、コンピュータで扱いにくい。" },
    ],
    tables: [
      {
        name: "注文伝票（非正規形）",
        cols: ["注文番号", "注文日", "顧客番号", "顧客名", "明細（商品番号 / 商品名 / 単価 / 数量）"],
        keys: [0],
        rows: [
          ["1001", "6/21", "C01", "田中商店", rep("P10 りんご 100 ×5\nP20 みかん 80 ×10")],
          ["1002", "6/22", "C02", "鈴木屋", rep("P10 りんご 100 ×3")],
        ],
      },
    ],
  },
  {
    chip: "1NF",
    sub: "繰り返し排除",
    title: "第1正規形：繰り返しをバラす",
    explain: [
      { kind: "fix", lbl: "やったこと", html: "繰り返す明細を1行ずつに展開。<b>1マス1値・1行1明細</b>のフラットな表に。主キーは〔注文番号＋商品番号〕。" },
      { kind: "problem", lbl: "でもまだ困る（更新異常）", html: "黄色のセルに注目。<b>同じ注文情報・商品情報が何度も重複</b>。「りんご」値上げで2か所直す必要があり、直し忘れると値段が食い違う＝更新異常。" },
    ],
    tables: [
      {
        name: "注文表（第1正規形）",
        cols: ["注文番号", "商品番号", "注文日", "顧客番号", "顧客名", "商品名", "単価", "数量"],
        keys: [0, 1],
        rows: [
          ["1001", "P10", dup("6/21"), dup("C01"), dup("田中商店"), dup("りんご"), dup("100"), "5"],
          ["1001", "P20", "6/21", "C01", "田中商店", "みかん", "80", "10"],
          ["1002", "P10", "6/22", "C02", "鈴木屋", dup("りんご"), dup("100"), "3"],
        ],
      },
    ],
    fd: ["注文番号 → 注文日, 顧客番号, 顧客名", "商品番号 → 商品名, 単価", "注文番号＋商品番号 → 数量"],
  },
  {
    chip: "2NF",
    sub: "部分従属排除",
    title: "第2正規形：主キーの一部で決まる項目を分離",
    explain: [
      { kind: "fix", lbl: "やったこと（部分関数従属の排除）", html: "複合主キーの<b>一部だけで決まる</b>項目を独立した表へ。注文番号だけ→<b>注文表</b>、商品番号だけ→<b>商品表</b>、両方そろう数量→<b>注文明細</b>。" },
      { kind: "problem", lbl: "まだ少し残る", html: "注文表の中に「顧客番号→顧客名」が残る。顧客名が顧客番号ごとに重複しうる。" },
    ],
    tables: [
      { name: "注文表", cols: ["注文番号", "注文日", "顧客番号", "顧客名"], keys: [0], rows: [["1001", "6/21", "C01", "田中商店"], ["1002", "6/22", "C02", "鈴木屋"]] },
      { name: "商品表", cols: ["商品番号", "商品名", "単価"], keys: [0], rows: [["P10", "りんご", "100"], ["P20", "みかん", "80"]] },
      { name: "注文明細", cols: ["注文番号", "商品番号", "数量"], keys: [0, 1], rows: [["1001", "P10", "5"], ["1001", "P20", "10"], ["1002", "P10", "3"]] },
    ],
    fd: ["注文表: 注文番号 → 注文日, 顧客番号, 顧客名", "（うち 顧客番号 → 顧客名 が残る＝推移的従属）"],
  },
  {
    chip: "3NF",
    sub: "推移従属排除",
    title: "第3正規形：キー以外で決まる項目を分離（完成）",
    explain: [
      { kind: "fix", lbl: "やったこと（推移的関数従属の排除）", html: "「注文番号 → 顧客番号 → 顧客名」のように<b>主キー以外（顧客番号）を経由して決まる</b>顧客名を<b>顧客表</b>へ独立。各表が『主キーだけで全項目が決まる』状態になり完了。" },
      { kind: "", lbl: "結果", html: "重複が消え、値段変更も顧客名の修正も<b>1か所直すだけ</b>でOK。更新異常が起きない。" },
    ],
    tables: [
      { name: "注文表", cols: ["注文番号", "注文日", "顧客番号"], keys: [0], rows: [["1001", "6/21", "C01"], ["1002", "6/22", "C02"]] },
      { name: "顧客表", cols: ["顧客番号", "顧客名"], keys: [0], rows: [["C01", "田中商店"], ["C02", "鈴木屋"]] },
      { name: "商品表", cols: ["商品番号", "商品名", "単価"], keys: [0], rows: [["P10", "りんご", "100"], ["P20", "みかん", "80"]] },
      { name: "注文明細", cols: ["注文番号", "商品番号", "数量"], keys: [0, 1], rows: [["1001", "P10", "5"], ["1001", "P20", "10"], ["1002", "P10", "3"]] },
    ],
    fd: ["注文表: 注文番号 → 注文日, 顧客番号", "顧客表: 顧客番号 → 顧客名", "商品表: 商品番号 → 商品名, 単価", "注文明細: 注文番号＋商品番号 → 数量"],
  },
];

function CellTd({ cell, isKey }: { cell: Cell; isKey: boolean }) {
  if (typeof cell === "string") {
    return (
      <td className={`whitespace-nowrap px-2.5 py-1.5 text-center ${isKey ? "bg-rose-50" : ""}`}>
        {cell}
      </td>
    );
  }
  if ("repeat" in cell) {
    return (
      <td className="whitespace-pre-line px-2.5 py-1.5 text-center text-violet-700">{cell.text}</td>
    );
  }
  return (
    <td className="whitespace-nowrap bg-amber-100 px-2.5 py-1.5 text-center font-bold text-amber-700">
      {cell.v}
    </td>
  );
}

function TableView({ t }: { t: Table }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-sm font-bold text-gray-800">📋 {t.name}</div>
      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden rounded-lg text-xs ring-1 ring-gray-300">
          <thead>
            <tr>
              {t.cols.map((c, i) => {
                const isKey = t.keys.includes(i);
                return (
                  <th
                    key={i}
                    className={`whitespace-nowrap px-2.5 py-1.5 font-bold ${
                      isKey ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {c}
                    {isKey && (
                      <span className="ml-1 rounded bg-rose-500 px-1 text-[9px] text-white">主キー</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-gray-200">
                {row.map((cell, ci) => (
                  <CellTd key={ci} cell={cell} isKey={t.keys.includes(ci)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NormalizationExperience() {
  const [stage, setStage] = useState(0);
  const s = STAGES[stage];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🗂️ 正規化とは、<b>1つの表に詰め込んだデータを、重複やムダのない複数の表に分けていく</b>整理作業。
        目的は<b>データの重複をなくし、更新時の矛盾（更新異常）を防ぐ</b>こと。下のボタンで段階を進めてみよう。
      </div>

      <Panel>
        {/* 段階チップ */}
        <div className="flex gap-1.5">
          {STAGES.map((st, i) => (
            <button
              key={st.chip}
              onClick={() => setStage(i)}
              className={`flex-1 rounded-lg px-1 py-2 text-center transition active:scale-95 ${
                i === stage
                  ? "bg-indigo-600 text-white"
                  : i < stage
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                    : "bg-gray-50 text-gray-500 ring-1 ring-gray-200"
              }`}
            >
              <div className="text-sm font-extrabold">{st.chip}</div>
              <div className="text-[10px] leading-tight opacity-80">{st.sub}</div>
            </button>
          ))}
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-gray-800">{s.title}</h3>

        {/* 解説パネル */}
        <div className="mt-2 space-y-2">
          {s.explain.map((p, i) => {
            const tone =
              p.kind === "fix"
                ? "bg-emerald-50 ring-emerald-200 [&_.lbl]:text-emerald-700"
                : p.kind === "problem"
                  ? "bg-amber-50 ring-amber-200 [&_.lbl]:text-amber-700"
                  : "bg-gray-50 ring-gray-200 [&_.lbl]:text-indigo-700";
            return (
              <div key={i} className={`rounded-xl px-3.5 py-2.5 text-sm ring-1 ${tone}`}>
                <div className="lbl mb-0.5 font-extrabold">{p.lbl}</div>
                <p
                  className="leading-relaxed text-gray-700 [&_b]:text-gray-900"
                  dangerouslySetInnerHTML={{ __html: p.html }}
                />
              </div>
            );
          })}
        </div>

        {/* テーブル */}
        {s.tables.map((t, i) => (
          <TableView key={i} t={t} />
        ))}

        {/* 関数従属 */}
        {s.fd && (
          <div className="mt-4">
            <div className="mb-1 text-xs text-gray-500">▼ この段階の関数従属（何が何を決めるか）</div>
            <div className="space-y-1.5">
              {s.fd.map((f, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-700 ring-1 ring-gray-200"
                >
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 凡例 */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded bg-rose-300" /> 主キー
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded bg-amber-300" /> 重複データ
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded bg-violet-300" /> 繰り返し項目
          </span>
        </div>

        {/* ナビ */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setStage((v) => Math.max(0, v - 1))}
            disabled={stage === 0}
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95 disabled:opacity-40"
          >
            ← 戻る
          </button>
          <button
            onClick={() => setStage((v) => Math.min(STAGES.length - 1, v + 1))}
            disabled={stage === STAGES.length - 1}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {stage === STAGES.length - 1 ? "完成 🎉" : "次へ進む →"}
          </button>
        </div>
      </Panel>

      <Panel>
        <h3 className="text-base font-extrabold text-gray-800">📌 3行で覚える正規形</h3>
        <ul className="mt-2 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b>第1正規形</b>：繰り返し項目をなくし、1マス1値にする。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b>第2正規形</b>：複合主キーの「一部」で決まる項目を別表に分ける（部分関数従属の排除）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b>第3正規形</b>：主キー以外で決まる項目を別表に分ける（推移的関数従属の排除）。
          </li>
        </ul>
      </Panel>
    </div>
  );
}
