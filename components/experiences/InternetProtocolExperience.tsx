"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「インターネットとプロトコル」専用の体験。
//   ① プロトコル＝共通ルール … 言語のたとえで「同じルールなら通じる」を体験
//   ② 代表的なプロトコル … HTTP/DNS/TCP-IP/メール の早見
//   ③ データはパケットで運ぶ … 文字を小分け→番号順に組み立て直す
// ============================================================================

const LANGS = [
  { id: "ja", label: "日本語", emo: "🇯🇵" },
  { id: "en", label: "英語", emo: "🇬🇧" },
  { id: "zh", label: "中国語", emo: "🇨🇳" },
];

function ProtocolRule() {
  const [other, setOther] = useState("en");
  const ok = other === "ja";
  return (
    <Panel>
      <SectionTitle step={1}>プロトコル＝通信の「共通ルール」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        通信するには、相手と<b className="text-gray-800">同じルール</b>が必要です。まずは「言葉」でイメージ。
        <b className="text-gray-800">あなたは日本語</b>を話します。相手の言葉を選んでみよう。
      </p>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="w-24 rounded-xl border-2 border-indigo-300 bg-indigo-50 py-3 text-center">
          <div className="text-2xl">🧑</div>
          <div className="text-xs font-extrabold text-indigo-700">あなた</div>
          <div className="text-[11px] text-gray-500">🇯🇵 日本語</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl ${ok ? "" : "opacity-40"}`}>{ok ? "🔊" : "❓"}</div>
        </div>
        <div className="w-24 rounded-xl border-2 border-gray-300 bg-gray-50 py-3 text-center">
          <div className="text-2xl">🧑‍🦰</div>
          <div className="text-xs font-extrabold text-gray-700">相手</div>
          <div className="text-[11px] text-gray-500">
            {LANGS.find((l) => l.id === other)?.emo} {LANGS.find((l) => l.id === other)?.label}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setOther(l.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${
              other === l.id ? "bg-indigo-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
            }`}
          >
            {l.emo} {l.label}
          </button>
        ))}
      </div>

      <p
        className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-bold ring-1 ${
          ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        {ok ? "⭕ 同じ言葉どうし → 通じる！" : "❌ 言葉がちがう → 通じない…"}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ネットでも同じ。機器どうしが通信するための<b>共通の“言葉・約束ごと”がプロトコル</b>（HTTPなど）。
        インターネットは世界中のネットワークの集まりで、みんながこの共通ルールを使うから話が通じます。
      </p>
    </Panel>
  );
}

function ProtocolTable() {
  const rows = [
    { k: "HTTP / HTTPS", d: "Webページを見る通信（HTTPSは暗号化されて安全 🔒）" },
    { k: "DNS", d: "ドメイン名（example.com）を IPアドレスに変換する" },
    { k: "TCP / IP", d: "インターネットの土台。データを相手まで順番どおり届ける" },
    { k: "SMTP / POP / IMAP", d: "電子メールの送信(SMTP)・受信(POP/IMAP)" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>代表的なプロトコル</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        試験でよく出るものだけ覚えればOK。<b className="text-gray-800">名前と役割</b>をセットで。
      </p>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={`${i ? "border-t border-gray-200" : ""}`}>
                <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-sm font-bold text-indigo-700">
                  {r.k}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-700">{r.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ よくある勘違い：「インターネット＝Web」ではありません。Webはインターネットの<b>使い方の一つ</b>（HTTPを使う）。
      </p>
    </Panel>
  );
}

function PacketSplit() {
  const [text, setText] = useState("こんにちは");
  const chars = [...text];
  const size = 3;
  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += size) groups.push(chars.slice(i, i + size).join(""));
  return (
    <Panel>
      <SectionTitle step={3}>データは「パケット」で運ぶ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大きなデータも、そのまま送らず<b className="text-gray-800">小さな箱（パケット）に分けて</b>送ります。
        箱には<b className="text-gray-800">通し番号</b>が付き、届いた側が番号順に組み立て直します。
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-500">送るデータ：</span>
        <input
          value={text}
          maxLength={15}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {groups.length === 0 ? (
          <span className="text-sm text-gray-400">文字を入れてみよう。</span>
        ) : (
          groups.map((g, i) => (
            <div key={i} className="rounded-xl border-2 border-indigo-300 bg-white px-3 py-2 text-center">
              <div className="rounded bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700">
                No.{i + 1}/{groups.length}
              </div>
              <div className="mt-1 text-base font-bold">{g}</div>
            </div>
          ))
        )}
      </div>
      {groups.length > 0 && (
        <p className="mt-3 text-center text-xs text-gray-500">
          {groups.length}個のパケットに分割 → 受け取った側が <b className="text-emerald-700">No.順に組み立て</b>て「{text}」に復元。
        </p>
      )}
    </Panel>
  );
}

export default function InternetProtocolExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🤝 ちがう学校どうしでも、<b>同じルールブック</b>を使うから試合が成り立つ——通信も同じ。
        機器どうしが正しくやり取りするための<b>共通ルール＝プロトコル</b>です。
      </div>

      <ProtocolRule />
      <ProtocolTable />
      <PacketSplit />
    </div>
  );
}
