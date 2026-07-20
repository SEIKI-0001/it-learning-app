"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「無線LAN・モバイル通信」専用の体験。
//   ① 無線LAN：SSID＝ネットワークの名前。暗号化あり/なしトグルで盗聴を比較。
//   ② モバイル用語の早見（5G / テザリング / MVNO）。
//   ③ フリーWi-Fiの安全/危険 仕分けクイズ。
// ============================================================================

function WifiToggle() {
  const [secure, setSecure] = useState(false);
  return (
    <Panel>
      <SectionTitle step={1}>無線LANは「名前」と「暗号化」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Wi-Fiの電波は空中を飛ぶので、誰でも受信できてしまいます。つなぐ相手を選ぶ名前が
        <b className="text-gray-800">SSID</b>、中身を守るのが<b className="text-gray-800">暗号化（WPA2/WPA3）</b>です。
      </p>

      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600">📶 SSID（ネットワーク名）</span>
          <span className="rounded bg-white px-2 py-0.5 font-mono text-xs text-gray-700 ring-1 ring-gray-200">
            cafe-wifi-2F
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setSecure(false)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            !secure ? "bg-rose-500 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          🔓 暗号化なし
        </button>
        <button
          onClick={() => setSecure(true)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            secure ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          🔒 暗号化あり(WPA2/3)
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-200">
        <div className="text-[11px] font-bold text-gray-400">📡 電波を盗み見た人に見える内容</div>
        <div
          className={`mt-1.5 break-all rounded-lg px-3 py-2 font-mono text-sm ${
            secure ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {secure ? "8f#2a@…X9q&(暗号化されて読めない)" : "ID: tanaka / PASS: spring123"}
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          secure
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : "bg-rose-50 text-rose-900 ring-rose-200"
        }`}
      >
        {secure ? (
          <>✅ 暗号化されていれば、電波を傍受されても中身は読めません。</>
        ) : (
          <>⚠️ 暗号化なし（鍵マークなし）のWi-Fiは、入力した内容を盗み見られる危険があります。</>
        )}
      </div>
    </Panel>
  );
}

const TERMS = [
  {
    emo: "🚀",
    name: "5G",
    tag: "次世代モバイル回線",
    d: "高速・大容量／低遅延（遅れが少ない）／多数同時接続が特徴。4G(LTE)の次の世代。",
  },
  {
    emo: "📲",
    name: "テザリング",
    tag: "スマホを親機に",
    d: "スマホのモバイル回線を中継して、パソコンやタブレットをインターネットにつなぐ機能。",
  },
  {
    emo: "💴",
    name: "MVNO（格安SIM）",
    tag: "回線を借りて提供",
    d: "大手キャリアの通信網を借りて、自社ブランドで安く通信サービスを提供する事業者。",
  },
];

function MobileTerms() {
  return (
    <Panel>
      <SectionTitle step={2}>モバイル通信の用語</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {TERMS.map((t) => (
          <li key={t.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl">{t.emo}</span>
              <span className="text-sm font-bold text-gray-800">{t.name}</span>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                {t.tag}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{t.d}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 覚え方：<b>5G＝速い・遅延少・多数接続</b>／<b>テザリング＝スマホ経由でネット共有</b>／
        <b>MVNO＝回線を借りる格安SIM</b>。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "安全寄り" | "危険寄り"; why: string }[] = [
  {
    t: "鍵マークのない無料Wi-Fiで、ネット銀行にログインしてお金を振り込んだ。",
    ans: "危険寄り",
    why: "暗号化なしのWi-Fiでは入力内容を盗まれる恐れ。重要な操作は避けるべき。",
  },
  {
    t: "自宅のWi-Fiに、WPA3のパスワードを設定して使っている。",
    ans: "安全寄り",
    why: "暗号化（WPA3）＋パスワードで保護されており、安全度が高い。",
  },
  {
    t: "公共Wi-Fiでも、httpsのサイトやVPNを使って通信を暗号化している。",
    ans: "安全寄り",
    why: "通信そのものを暗号化していれば、Wi-Fiが心配でも中身は守られやすい。",
  },
  {
    t: "『Free_WiFi』という、誰が用意したか分からない電波に自動でつないだ。",
    ans: "危険寄り",
    why: "正体不明のSSIDは、わざと盗聴用に置かれた“偽アクセスポイント”の可能性がある。",
  },
];

function WifiQuiz() {
  const [answers, setAnswers] = useState<Record<number, "安全寄り" | "危険寄り">>({});
  return (
    <Panel>
      <SectionTitle step={3}>フリーWi-Fi、安全？危険？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["安全寄り", "危険寄り"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function WirelessMobileExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📶 無線LANは電波が飛ぶぶん<b>暗号化が大切</b>。モバイルは<b>5G・テザリング・MVNO</b>の
        意味をセットで覚えましょう。
      </div>

      <WifiToggle />
      <MobileTerms />
      <WifiQuiz />
    </div>
  );
}
