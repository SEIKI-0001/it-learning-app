"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「暗号化とハッシュ化」専用の体験。
//   ① 暗号化 … 鍵で読めなくする → 鍵で元に戻せる（可逆）
//   ② ハッシュ化 … データから固定長の「指紋」を作る → 元に戻せない（一方向）
//   ③ くらべて整理
// 学習用の簡易変換（本物の暗号ではない）で、可逆／不可逆の感覚をつかむ。
// ============================================================================

function encryptHex(text: string, key: number): string {
  return [...text]
    .map((c) => ((c.charCodeAt(0) + key) & 0xffff).toString(16).padStart(4, "0"))
    .join(" ");
}

function hashHex(s: string): string {
  const mk = (seed: number) => {
    let h = seed >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  return (mk(0x811c9dc5) + mk(0x12345678)).toUpperCase();
}

function Encryption() {
  const [text, setText] = useState("ひみつのメモ");
  const [key, setKey] = useState(3);
  const [mode, setMode] = useState<"plain" | "cipher">("plain");
  const shown = mode === "cipher" ? encryptHex(text, key) : text;

  return (
    <Panel>
      <SectionTitle step={1}>暗号化（鍵で戻せる＝可逆）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        暗号化は<b className="text-gray-800">鍵</b>を使って読めなくする処理。
        <b className="text-gray-800">同じ鍵で元に戻せます（復号）</b>。鍵付きの箱のイメージ。
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-500">文章：</span>
        <input
          value={text}
          maxLength={16}
          onChange={(e) => {
            setText(e.target.value);
            setMode("plain");
          }}
          className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-gray-500">🔑 鍵：</span>
        {[1, 3, 5].map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`h-8 w-8 rounded-lg font-mono font-bold active:scale-95 ${
              key === k ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("cipher")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "cipher" ? "bg-indigo-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🔒 鍵で暗号化
        </button>
        <button
          onClick={() => setMode("plain")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "plain" ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🔑 鍵で復号
        </button>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 ring-1 ${
          mode === "cipher" ? "bg-indigo-50 ring-indigo-200" : "bg-emerald-50 ring-emerald-200"
        }`}
      >
        <div className="text-xs font-bold text-gray-500">{mode === "cipher" ? "暗号文（読めない）" : "平文（元に戻った）"}</div>
        <div className="mt-1 break-all font-mono text-sm text-gray-800">{shown || "（空）"}</div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        🔒↔🔑 を押すと行き来できます。<b>鍵があれば必ず元に戻せる</b>のが暗号化（＝可逆）。通信(HTTPS)やデータ保存の秘匿に使います。
      </p>
    </Panel>
  );
}

function Hashing() {
  const [text, setText] = useState("password");
  const hash = hashHex(text);
  return (
    <Panel>
      <SectionTitle step={2}>ハッシュ化（戻せない＝一方向）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ハッシュ化は、データから<b className="text-gray-800">固定の長さの「指紋」</b>を作る処理。
        <b className="text-gray-800">元には戻せません</b>。文字を変えると指紋がガラッと変わります。
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-500">文章：</span>
        <input
          value={text}
          maxLength={20}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="mt-3 rounded-xl bg-gray-900 px-4 py-3">
        <div className="text-xs font-bold text-gray-400">ハッシュ値（指紋）</div>
        <div className="mt-1 break-all font-mono text-sm text-emerald-300">{hash}</div>
      </div>

      <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
        <li>・<b>固定長</b>：入力が長くても短くても、指紋の長さは同じ（試しに長文を入れてみて）。</li>
        <li>・<b>同じ入力なら同じ指紋</b>：1文字変えると全く別の値に（試しに最後に1字足してみて）。</li>
        <li>・<b>戻せない</b>：指紋から元の文章は復元できない（パスワード保存・改ざん検知に最適）。</li>
      </ul>
    </Panel>
  );
}

export default function EncryptionHashExperience() {
  const rows = [
    { k: "元に戻せる？", e: "戻せる（鍵で復号）", h: "戻せない（一方向）" },
    { k: "鍵", e: "使う", h: "使わない" },
    { k: "出力の長さ", e: "元の長さしだい", h: "いつも固定長" },
    { k: "主な用途", e: "通信・保存の秘匿", h: "パスワード保存・改ざん検知" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔐 ふたつは似て非なるもの。<b>暗号化＝鍵付きの箱</b>（鍵で開けて中身を読める＝戻せる）、
        <b>ハッシュ化＝指紋を取る</b>（指紋から本人は復元できない＝戻せない）。
      </div>

      <Encryption />
      <Hashing />

      <Panel>
        <SectionTitle step={3}>くらべて整理</SectionTitle>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold text-indigo-700">🔒 暗号化</th>
                <th className="px-3 py-2 text-center font-bold text-emerald-700">🔑 ハッシュ化</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.e}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ よくある勘違い：「ハッシュ化も復号できる」は誤り。戻せないのがハッシュ化です。また暗号化と圧縮（容量を小さくする）も別物。
        </p>
      </Panel>
    </div>
  );
}
