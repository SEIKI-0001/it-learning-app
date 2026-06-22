"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「電子メールのしくみ」専用の体験。
//   ① 送る→届くの流れを1歩ずつ（送信=SMTP / 受信=POP・IMAP）
//   ② POP と IMAP の違い（端末にDL ⇄ サーバに残す）
//   ③ To / CC / BCC の違い 仕分けクイズ
// ============================================================================

const FLOW: { who: string; emoji: string; proto: string; title: string; d: string }[] = [
  {
    who: "送信",
    emoji: "📤",
    proto: "SMTP",
    title: "あなた → 送信サーバ",
    d: "メールを書いて送信。あなたの端末から送信用サーバへ渡すのに SMTP を使います。",
  },
  {
    who: "配送",
    emoji: "🚚",
    proto: "SMTP",
    title: "送信サーバ → 相手の受信サーバ",
    d: "サーバ同士もSMTPでバケツリレー。宛先のメールアドレスを頼りに相手のメールボックスへ届けます。",
  },
  {
    who: "受信",
    emoji: "📥",
    proto: "POP / IMAP",
    title: "相手 ← 受信サーバ",
    d: "相手がメールを読むとき、受信サーバから取り出すのに POP または IMAP を使います。",
  },
];

function MailFlow() {
  const [i, setI] = useState(0);
  const s = FLOW[i];
  return (
    <Panel>
      <SectionTitle step={1}>メールが届くまで</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        メールは<b className="text-gray-800">「送る」と「受け取る」で使う約束（プロトコル）が違います</b>。
        流れを追ってみましょう。
      </p>

      {/* 全体図 */}
      <div className="mt-4 flex items-center justify-between text-center text-[11px] font-bold text-gray-400">
        <span>🧑 あなた</span>
        <span>▶</span>
        <span>📮 送信サーバ</span>
        <span>▶</span>
        <span>📬 受信サーバ</span>
        <span>▶</span>
        <span>🧑 相手</span>
      </div>

      <div className="mt-3 rounded-2xl bg-indigo-50 p-4 ring-2 ring-indigo-300">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{s.emoji}</span>
          <span className="rounded-full bg-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
            {s.who}
          </span>
          <span className="ml-auto rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
            {s.proto}
          </span>
        </div>
        <div className="mt-2 text-sm font-extrabold text-gray-800">{s.title}</div>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.d}</p>
      </div>

      <StepNav
        index={i}
        total={FLOW.length}
        onPrev={() => setI((v) => Math.max(0, v - 1))}
        onNext={() => setI((v) => Math.min(FLOW.length - 1, v + 1))}
        onReset={() => setI(0)}
        doneLabel="到着 📬"
      />

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 ひとことで：<b>送るとき＝SMTP</b>、<b>受け取るとき＝POP / IMAP</b>。
        「S」MTP の S を <b>Send（送信）</b>と結びつけると覚えやすい。
      </div>
    </Panel>
  );
}

function PopImap() {
  const rows = [
    { k: "メールの置き場所", pop: "端末にダウンロードして保存", imap: "サーバに残したまま読む" },
    { k: "複数端末で見ると", pop: "他の端末から見えないことがある", imap: "どの端末でも同じ状態で見られる" },
    { k: "向いている使い方", pop: "1台の決まった端末で使う", imap: "スマホ・PCなど複数で使う" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>POP と IMAP のちがい</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        どちらも「受信」のプロトコルですが、<b className="text-gray-800">メールをどこに置くか</b>が違います。
      </p>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="p-2 font-bold"></th>
              <th className="p-2 font-bold">📥 POP</th>
              <th className="p-2 font-bold">☁️ IMAP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t border-gray-200">
                <td className="bg-gray-50 p-2 font-bold text-gray-700">{r.k}</td>
                <td className="p-2 text-gray-600">{r.pop}</td>
                <td className="p-2 text-gray-600">{r.imap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>POP＝手元に持ってくる</b>／<b>IMAP＝サーバに置いたまま</b>。スマホとPCで同じメールを見たいなら IMAP。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "全員に宛先が見える形で、関係者みんなに送りたい。",
    ans: "To または CC",
    opts: ["To または CC", "BCC", "SMTP"],
    why: "To・CCは受け取った人どうしにアドレスが見えます。主たる宛先がTo、参考で共有がCC。",
  },
  {
    t: "受け取った人どうしにアドレスを知られたくない（一斉送信で個人情報を守る）。",
    ans: "BCC",
    opts: ["BCC", "CC", "To"],
    why: "BCCに入れた宛先は、他の受信者からは見えません。一斉メールの情報漏えい防止に使います。",
  },
  {
    t: "「念のため上司にも共有」。主たる宛先は別にいる。",
    ans: "CC",
    opts: ["CC", "BCC", "To"],
    why: "CC（カーボンコピー）は『参考までに共有』。主たる宛先はToに入れます。",
  },
];

function CcBccQuiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>To / CC / BCC を使い分け</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">To＝主たる宛先</b>／<b className="text-gray-800">CC＝参考に共有（見える）</b>／
        <b className="text-gray-800">BCC＝こっそり共有（他の人に見えない）</b>。場面に合うのは？
      </p>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.opts.map((opt) => {
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
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
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
      <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200">
        🚩 一斉送信でうっかり<b>To/CCに全員のアドレス</b>を入れると、メールアドレスの漏えいに。
        個人情報を守るなら<b>BCC</b>。
      </div>
    </Panel>
  );
}

export default function EmailProtocolExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✉️ メールは<b>送る＝SMTP</b>、<b>受け取る＝POP / IMAP</b>。宛先は
        <b>To / CC / BCC</b> の使い分けがよく問われます。
      </div>

      <MailFlow />
      <PopImap />
      <CcBccQuiz />
    </div>
  );
}
