"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「HTTPとHTTPS」専用の体験。
//   ① 盗み見くらべ … 同じ送信内容を HTTP/HTTPS で切替、盗聴者に何が見えるか
//   ② 比較表
//   ③ おさらい（S=Secure / HTTPSでも詐欺はありうる）
// ============================================================================

// 見た目用の「暗号化っぽい」変換（本物の暗号ではなく、読めなくなる様子の可視化）
function scramble(text: string): string {
  const hex = [...text]
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return (hex.match(/.{1,4}/g) ?? []).join(" ");
}

function Eavesdrop() {
  const [text, setText] = useState("password: himitsu123");
  const [https, setHttps] = useState(false);
  const seen = https ? scramble(text) : text;

  return (
    <Panel>
      <SectionTitle step={1}>盗み見くらべ：HTTP と HTTPS</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じ内容を送っても、<b className="text-gray-800">途中で盗み見する人（😈）に見える内容</b>がまるで違います。
        ボタンで切り替えてみよう。
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-500">送る内容：</span>
        <input
          value={text}
          maxLength={28}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setHttps(false)}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            !https ? "bg-rose-500 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          HTTP（暗号化なし）
        </button>
        <button
          onClick={() => setHttps(true)}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            https ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          HTTPS 🔒（暗号化）
        </button>
      </div>

      {/* 通信路 */}
      <div className="mt-4 flex items-center justify-between gap-1 text-center">
        <div className="w-20">
          <div className="text-2xl">🧑</div>
          <div className="text-[11px] font-bold text-gray-600">あなた</div>
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-gray-400">通信路（途中に😈盗聴者）</div>
          <div className="text-lg text-gray-300">→→→</div>
        </div>
        <div className="w-20">
          <div className="text-2xl">🗄️</div>
          <div className="text-[11px] font-bold text-gray-600">サーバ</div>
        </div>
      </div>

      {/* 盗聴者が見る内容 */}
      <div
        className={`mt-2 rounded-xl px-4 py-3 ring-1 ${
          https ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
        }`}
      >
        <div className={`text-xs font-bold ${https ? "text-emerald-700" : "text-rose-700"}`}>
          😈 盗聴者に見える内容：
        </div>
        <div className="mt-1 break-all font-mono text-sm text-gray-800">{seen || "（空）"}</div>
        <div className={`mt-2 text-sm font-bold ${https ? "text-emerald-700" : "text-rose-700"}`}>
          {https
            ? "🔒 ぐちゃぐちゃで読めない！ → 盗まれても中身は分からない（安全）"
            : "⚠️ 丸見え！ → パスワードがそのまま盗まれる危険"}
        </div>
      </div>
    </Panel>
  );
}

function CompareTable() {
  const rows = [
    { k: "暗号化", http: "なし", https: "あり（SSL/TLS）" },
    { k: "盗み見", http: "中身が読める", https: "読めない" },
    { k: "URL", http: "http://", https: "https:// 🔒" },
    { k: "使う場面", http: "公開情報の閲覧など", https: "ログイン・買い物・個人情報" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>くらべて整理</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 text-left font-bold"> </th>
              <th className="px-3 py-2 text-center font-bold text-rose-700">HTTP</th>
              <th className="px-3 py-2 text-center font-bold text-emerald-700">HTTPS 🔒</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.http}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.https}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function HttpsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✉️ たとえると——<b>HTTP＝ハガキ</b>（運ぶ人に中身が見える）、
        <b>HTTPS＝封筒に入れた手紙</b>（中身が見えない＝暗号化）。鍵マーク🔒が付いていれば HTTPS です。
      </div>

      <Eavesdrop />
      <CompareTable />

      <Panel>
        <SectionTitle step={3}>おさらい・注意</SectionTitle>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b>HTTPS ＝ HTTP ＋ 暗号化（SSL/TLS）</b>。S は <b>Secure（安全）</b> の S（速度のSではない）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            ログイン・買い物・個人情報の入力では、URLが <b className="text-emerald-700">https:// 🔒</b> かを確認。
          </li>
          <li className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200 text-amber-900">
            ⚠️ ただし「HTTPSだから絶対に安全なサイト」とは限りません。HTTPSが守るのは<b>通信の中身</b>で、
            <b>サイト自体が詐欺でない保証ではない</b>点に注意。
          </li>
        </ul>
      </Panel>
    </div>
  );
}
