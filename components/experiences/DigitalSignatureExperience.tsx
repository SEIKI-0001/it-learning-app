"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ディジタル署名・認証局(CA)」専用の体験。
//   ① 署名検証ラボ：文書の届き方（そのまま/途中で改ざん/なりすまし）を選んで
//      「検証」ボタン → 指紋（ハッシュ値）の一致/不一致で見破れることを体感。
//   ② 認証局(CA)＝公開鍵が本物だと保証する第三者。PKIのひとこと。
//   ③ 暗号化とのちがい（早見表）。
// ============================================================================

type Scenario = "ok" | "tamper" | "fake";

const SCENARIOS: {
  key: Scenario;
  label: string;
  sender: string;
  senderName: string;
  doc: string;
  docTone: string;
  // 署名を山田さんの公開鍵で開いて取り出した指紋 / 届いた文書から計算した指紋
  sigFp: string;
  docFp: string;
  verdict: string;
  why: string;
}[] = [
  {
    key: "ok",
    label: "📮 そのまま届く",
    sender: "✍️",
    senderName: "山田さん",
    doc: "「1万円 支払います」＋署名",
    docTone: "bg-white ring-gray-300 text-gray-800",
    sigFp: "A4-9F",
    docFp: "A4-9F",
    verdict: "✅ 検証OK！本人が送った・改ざんなし",
    why: "署名から取り出した指紋と、文書から計算した指紋がピッタリ一致。安心して受け取れます。",
  },
  {
    key: "tamper",
    label: "😈 途中で書き換え",
    sender: "✍️",
    senderName: "山田さん",
    doc: "「100万円 支払います」＋署名",
    docTone: "bg-rose-50 ring-rose-300 text-rose-800",
    sigFp: "A4-9F",
    docFp: "7C-21",
    verdict: "❌ 改ざんを検知！",
    why: "文書が1文字でも変わると指紋も変わります。署名の中の指紋（元の文書のもの）と合わないので、書き換えがバレました。",
  },
  {
    key: "fake",
    label: "🎭 別人がなりすまし",
    sender: "🎭",
    senderName: "偽の山田さん",
    doc: "「100万円 支払います」＋偽の署名",
    docTone: "bg-rose-50 ring-rose-300 text-rose-800",
    sigFp: "??-??",
    docFp: "5E-88",
    verdict: "❌ なりすましを検知！",
    why: "偽者は山田さんの秘密鍵を持っていません。別の鍵で作った署名は、山田さんの公開鍵では正しく開けず、でたらめな指紋になってバレました。",
  },
];

function SignatureLab() {
  const [scenario, setScenario] = useState<Scenario>("ok");
  const [verified, setVerified] = useState(false);
  const [tried, setTried] = useState<Set<Scenario>>(new Set());
  const s = SCENARIOS.find((x) => x.key === scenario)!;
  const match = s.sigFp === s.docFp;
  const allTried = tried.size === SCENARIOS.length;

  const pick = (key: Scenario) => {
    setScenario(key);
    setVerified(false);
  };
  const verify = () => {
    setVerified(true);
    setTried((prev) => new Set(prev).add(scenario));
  };

  return (
    <Panel>
      <SectionTitle step={1}>署名検証ラボ ― ニセモノを見破れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        山田さんが「支払います」という文書に<b className="text-gray-800">署名</b>して送ります。
        あなたは受信者。<b className="text-gray-800">届き方を選んで「検証」</b>してみましょう。
      </p>

      {/* 届き方の選択 */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {SCENARIOS.map((x) => (
          <button
            key={x.key}
            onClick={() => pick(x.key)}
            className={`rounded-lg px-1 py-2 text-[11px] font-bold leading-tight transition active:scale-95 ${
              scenario === x.key ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* 配送のようす */}
      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between text-center">
          <div className="w-16">
            <div className="text-2xl">{s.sender}</div>
            <div className="mt-0.5 text-[10px] font-bold text-gray-500">{s.senderName}</div>
            <div className="text-[10px] text-gray-400">🔑 秘密鍵で署名</div>
          </div>
          <span className="text-gray-300">──▶</span>
          <div className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ring-1 ${s.docTone}`}>
            📨 {s.doc}
            {scenario === "tamper" && (
              <div className="mt-0.5 text-[10px] font-medium text-rose-500">
                😈 途中で「1万円」を書き換えた
              </div>
            )}
          </div>
          <span className="text-gray-300">──▶</span>
          <div className="w-16">
            <div className="text-2xl">📬</div>
            <div className="mt-0.5 text-[10px] font-bold text-gray-500">あなた</div>
            <div className="text-[10px] text-gray-400">🔓 公開鍵で検証</div>
          </div>
        </div>
      </div>

      {/* 検証ボタン */}
      <button
        onClick={verify}
        disabled={verified}
        className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        🔍 届いた文書を検証する
      </button>

      {/* 検証結果 */}
      {verified && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-center gap-2 text-center">
            <div className="flex-1 rounded-xl bg-violet-50 px-2 py-2.5 ring-1 ring-violet-200">
              <div className="text-[10px] font-bold text-violet-600">署名を公開鍵で開いた指紋</div>
              <div className="mt-0.5 font-mono text-lg font-extrabold text-violet-700">{s.sigFp}</div>
            </div>
            <span className={`text-xl font-extrabold ${match ? "text-emerald-500" : "text-rose-500"}`}>
              {match ? "＝" : "≠"}
            </span>
            <div className="flex-1 rounded-xl bg-sky-50 px-2 py-2.5 ring-1 ring-sky-200">
              <div className="text-[10px] font-bold text-sky-600">届いた文書から計算した指紋</div>
              <div className="mt-0.5 font-mono text-lg font-extrabold text-sky-700">{s.docFp}</div>
            </div>
          </div>
          <div
            className={`rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
              match ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-rose-50 text-rose-900 ring-rose-200"
            }`}
          >
            <b>{s.verdict}</b>
            <p className="mt-1 text-[13px]">{s.why}</p>
          </div>
        </div>
      )}

      {allTried && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
          🎉 本物は通し、改ざんもなりすましも見破れた！これがディジタル署名の
          <b>「改ざん検知」＋「なりすまし防止」</b>です。
        </div>
      )}

      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 しくみ：送信者は文書の指紋（<b>ハッシュ値</b>）を<b>自分の秘密鍵</b>で暗号化して添付＝署名。
        受信者は<b>送信者の公開鍵</b>で署名を開き、自分で計算した指紋と照合します。
      </div>
      <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ <b>暗号化とは鍵の使い方が逆</b>。暗号化は「相手の公開鍵で施錠→相手の秘密鍵で開錠」。
        署名は<b>「自分の秘密鍵で署名→相手が公開鍵で検証」</b>です。
      </div>
    </Panel>
  );
}

function CaPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>その公開鍵、本物？＝認証局(CA)</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        署名の検証には「送信者の公開鍵」を使います。でも、その公開鍵が
        <b className="text-gray-800">本当に本人のもの</b>か、誰が保証する？
      </p>
      <div className="mt-3 flex items-center justify-center gap-2 text-center">
        <div className="flex-1 rounded-xl bg-gray-50 p-2.5 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
          🙋 本人の<br />公開鍵
        </div>
        <span className="text-gray-300">▶</span>
        <div className="flex-1 rounded-xl bg-indigo-50 p-2.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
          🏛️ 認証局(CA)<br />が保証
        </div>
        <span className="text-gray-300">▶</span>
        <div className="flex-1 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          📜 電子証明書<br />を発行
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        信頼できる第三者＝<b className="text-gray-800">認証局(CA)</b>が「この公開鍵は確かに本人のもの」と保証し、
        <b className="text-gray-800">電子証明書</b>を発行します。
      </p>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 公開鍵・認証局・証明書をまとめて支える仕組みを <b>PKI（公開鍵基盤）</b> と呼びます。
        身近な例：<b>https</b> のサイトもこの証明書で本物だと確認しています。
      </div>
    </Panel>
  );
}

function CompareTable() {
  const rows = [
    { k: "目的", enc: "中身を読まれないようにする", sig: "本人確認＋改ざん検知" },
    { k: "署名/暗号化する人", enc: "送る人（相手の公開鍵で）", sig: "送る人（自分の秘密鍵で）" },
    { k: "開く/検証する人", enc: "受け取る人（自分の秘密鍵で）", sig: "受け取る人（相手の公開鍵で）" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>暗号化との違い</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="p-2 font-bold"></th>
              <th className="p-2 font-bold">🔒 暗号化</th>
              <th className="p-2 font-bold">✍️ ディジタル署名</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t border-gray-200">
                <td className="bg-gray-50 p-2 font-bold text-gray-700">{r.k}</td>
                <td className="p-2 text-gray-600">{r.enc}</td>
                <td className="p-2 text-gray-600">{r.sig}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ どちらも公開鍵＋秘密鍵のペアを使いますが、<b>「どっちの鍵で・誰が」</b>処理するかが逆。ここが試験の狙い目です。
      </p>
    </Panel>
  );
}

export default function DigitalSignatureExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✍️ <b>ディジタル署名</b>は「確かに本人が送った（なりすまし防止）」＋「途中で書き換えられていない（改ざん検知）」を
        証明するしくみ。<b>秘密鍵で署名→公開鍵で検証</b>が要点です。
      </div>

      <SignatureLab />
      <CaPanel />
      <CompareTable />
    </div>
  );
}
