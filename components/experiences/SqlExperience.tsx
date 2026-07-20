"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「データベースとSQL」専用の体験。
//   ① SQLの形   … SELECT 列 FROM 表 WHERE 条件
//   ② ミニSQL   … 列(SELECT)と条件(WHERE)を選ぶと、結果の表が変わる
//   ③ おさらい  … 代表的な命令
// 表計算より「欲しいデータを言葉で取り出す」感覚を、操作でつかむ。
// ============================================================================

const COLS = [
  { key: "name", label: "名前" },
  { key: "klass", label: "クラス" },
  { key: "score", label: "点数" },
] as const;

type Row = { name: string; klass: string; score: number };

const ROWS: Row[] = [
  { name: "田中", klass: "1組", score: 80 },
  { name: "鈴木", klass: "2組", score: 65 },
  { name: "佐藤", klass: "1組", score: 92 },
  { name: "高橋", klass: "2組", score: 78 },
];

const CONDS: { label: string; expr: string | null; pred: (r: Row) => boolean }[] = [
  { label: "条件なし（全部）", expr: null, pred: () => true },
  { label: "点数 >= 80", expr: "点数 >= 80", pred: (r) => r.score >= 80 },
  { label: "クラス = '1組'", expr: "クラス = '1組'", pred: (r) => r.klass === "1組" },
  {
    label: "点数 >= 80 AND クラス = '1組'",
    expr: "点数 >= 80 AND クラス = '1組'",
    pred: (r) => r.score >= 80 && r.klass === "1組",
  },
];

function MiniSql() {
  const [selKeys, setSelKeys] = useState<string[]>(COLS.map((c) => c.key));
  const [condIdx, setCondIdx] = useState(1);

  const cond = CONDS[condIdx];
  const orderedSel = COLS.filter((c) => selKeys.includes(c.key));
  const allSelected = orderedSel.length === COLS.length;
  const selectLabel = allSelected ? "*" : orderedSel.map((c) => c.label).join(", ");
  const result = ROWS.filter(cond.pred);

  const toggleCol = (key: string) =>
    setSelKeys((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev // 最低1列は残す
        : [...prev, key],
    );

  return (
    <Panel>
      <SectionTitle step={2}>ミニSQL：選ぶと結果が変わる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">取り出す列</b>と<b className="text-gray-800">条件</b>を選ぶと、
        SQL文と<b className="text-gray-800">結果の表</b>が変わります。いろいろ試してみよう。
      </p>

      {/* SQL文 */}
      <div className="mt-3 rounded-xl bg-gray-900 px-4 py-3 font-mono text-sm leading-relaxed text-gray-100">
        <span className="font-bold text-sky-300">SELECT</span> {selectLabel}{" "}
        <span className="font-bold text-sky-300">FROM</span> 生徒
        {cond.expr && (
          <>
            {" "}
            <span className="font-bold text-amber-300">WHERE</span> {cond.expr}
          </>
        )}
        <span className="text-gray-500"> ;</span>
      </div>

      {/* 列を選ぶ */}
      <div className="mt-3">
        <div className="mb-1 text-xs font-bold text-gray-500">取り出す列（SELECT）</div>
        <div className="flex flex-wrap gap-2">
          {COLS.map((c) => {
            const on = selKeys.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggleCol(c.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${
                  on ? "bg-sky-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 条件を選ぶ */}
      <div className="mt-3">
        <div className="mb-1 text-xs font-bold text-gray-500">条件（WHERE）</div>
        <div className="flex flex-wrap gap-2">
          {CONDS.map((c, i) => {
            const on = i === condIdx;
            return (
              <button
                key={c.label}
                onClick={() => setCondIdx(i)}
                className={`rounded-lg px-3 py-1.5 text-left text-sm font-bold transition active:scale-95 ${
                  on ? "bg-amber-500 text-white" : "text-gray-500 ring-1 ring-gray-300"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 元の表（条件に合う行がハイライト） */}
      <div className="mt-4">
        <div className="mb-1.5 text-sm font-bold text-gray-800">📋 生徒テーブル（条件に合う行が光る）</div>
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-2 font-bold ${selKeys.includes(c.key) ? "text-sky-700" : "text-gray-400"}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => {
                const hit = cond.pred(r);
                return (
                  <tr
                    key={i}
                    className={`border-t border-gray-200 text-center transition ${
                      hit ? "bg-brand-50" : "bg-white opacity-40"
                    }`}
                  >
                    {COLS.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {r[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 結果（抽出＋射影） */}
      <div className="mt-3">
        <div className="mb-1.5 text-sm font-bold text-emerald-700">▼ 取り出される結果</div>
        <div className="overflow-hidden rounded-xl ring-2 ring-emerald-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 text-emerald-800">
                {orderedSel.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-bold">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.length === 0 ? (
                <tr>
                  <td colSpan={orderedSel.length} className="px-3 py-3 text-center text-gray-400">
                    条件に合う行はありません
                  </td>
                </tr>
              ) : (
                result.map((r, i) => (
                  <tr key={i} className={`border-t border-emerald-100 text-center ${i % 2 ? "bg-emerald-50/40" : "bg-white"}`}>
                    {orderedSel.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          <b>WHERE</b> で<b>行</b>をしぼり（抽出）、<b>SELECT</b> で<b>列</b>を選ぶ（射影）。
          この2つが取り出しの基本です。
        </p>
      </div>
    </Panel>
  );
}

export default function SqlExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📚 データベースは<b>整理された保管場所</b>、その中の<b>表＝テーブル</b>。
        その表から欲しいデータを取り出す<b>「お願いの言葉」がSQL</b>です（図書館で司書さんに頼む注文文のイメージ）。
      </div>

      <Panel>
        <SectionTitle step={1}>SQLの形（取り出す命令）</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          データを取り出す代表が <b className="text-sky-700">SELECT</b> 文。形はいつも同じです。
        </p>
        <div className="mt-3 space-y-2">
          {[
            { kw: "SELECT", color: "bg-sky-100 text-sky-700", d: "どの『列』を取り出すか（* は全部）" },
            { kw: "FROM", color: "bg-gray-200 text-gray-700", d: "どの『表』から取り出すか" },
            { kw: "WHERE", color: "bg-amber-100 text-amber-700", d: "どんな『条件』の行だけにしぼるか" },
          ].map((x) => (
            <div key={x.kw} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
              <span className={`rounded-md px-2 py-1 font-mono text-sm font-bold ${x.color}`}>{x.kw}</span>
              <span className="text-sm text-gray-700">{x.d}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-xl bg-gray-900 px-4 py-2.5 font-mono text-sm text-gray-100">
          <span className="font-bold text-sky-300">SELECT</span> 名前{" "}
          <span className="font-bold text-sky-300">FROM</span> 生徒{" "}
          <span className="font-bold text-amber-300">WHERE</span> 点数 &gt;= 80
        </p>
        <p className="mt-1.5 text-xs text-gray-500">
          → 「生徒の表から、点数80以上の人の名前を取り出して」という意味。
        </p>
      </Panel>

      <MiniSql />

      <Panel>
        <SectionTitle step={3}>代表的な命令をおさらい</SectionTitle>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            { k: "SELECT", d: "取り出す（検索）" },
            { k: "INSERT", d: "追加する" },
            { k: "UPDATE", d: "書きかえる" },
            { k: "DELETE", d: "消す" },
          ].map((x) => (
            <li key={x.k} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
              <span className="w-20 font-mono text-sm font-bold text-brand-700">{x.k}</span>
              <span className="text-sm text-gray-700">{x.d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ 行＝レコード（1件分）、列＝フィールド（項目）。試験では SELECT がいちばんよく出ます。
        </p>
      </Panel>
    </div>
  );
}
