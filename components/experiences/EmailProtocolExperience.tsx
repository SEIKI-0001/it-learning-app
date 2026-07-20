"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「電子メールのしくみ」専用の体験。
//   ① 配達体験 … ✉️がノード（あなた→送信サーバ→受信サーバ→相手）を移動し、
//      区間ごとに使うプロトコル（SMTP / POP・IMAP）が光る
//   ② POPとIMAP … スマホで受信したあと、PCでも見えるかが方式で変わる
//   ③ To / CC / BCC の違い 仕分けクイズ
// ============================================================================

const NODES = [
  { id: 0, emo: "🧑", name: "あなた" },
  { id: 1, emo: "📮", name: "送信サーバ" },
  { id: 2, emo: "📬", name: "受信サーバ" },
  { id: 3, emo: "🧑", name: "相手" },
];

// 区間: 0-1=SMTP, 1-2=SMTP, 2-3=POP/IMAP
type Step = { at: number; hop: number | null; proto: "SMTP" | "POP / IMAP" | null; html: string };

const STEPS: Step[] = [
  {
    at: 0,
    hop: null,
    proto: null,
    html: "🧑 あなたがメールを書いて「送信」を押しました。ここから✉️の旅が始まります。",
  },
  {
    at: 1,
    hop: 0,
    proto: "SMTP",
    html: "📤 あなたの端末 → 送信サーバ。<b>送るときはSMTP</b>。ポストに投函するイメージ。",
  },
  {
    at: 2,
    hop: 1,
    proto: "SMTP",
    html: "🚚 送信サーバ → 相手の受信サーバ。<b>サーバ同士もSMTP</b>でバケツリレーして、相手のメールボックスへ。",
  },
  {
    at: 3,
    hop: 2,
    proto: "POP / IMAP",
    html: "📥 相手がメールを読むとき、受信サーバから<b>POP または IMAP</b>で取り出します。ここだけプロトコルが変わる！",
  },
  {
    at: 3,
    hop: null,
    proto: null,
    html: "💡 まとめ：<b>送る＝SMTP（あなた→サーバ→サーバ）、受け取る＝POP / IMAP</b>。「S」MTPのSを<b>Send（送信）</b>と結びつけて覚えよう。",
  },
];

function MailFlow() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <Panel>
      <SectionTitle step={1}>✉️ を配達してみよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        メールは<b className="text-gray-800">「送る」と「受け取る」で使う約束（プロトコル）が違います</b>。
        「次へ」で✉️を運びながら、どこで何を使うか見てみよう。
      </p>

      {/* ノードと区間 */}
      <div className="mt-4 flex items-center">
        {NODES.map((n, ni) => (
          <div key={n.id} className="flex flex-1 items-center">
            <div
              className={`relative w-full rounded-xl border-2 px-0.5 py-2 text-center transition ${
                s.at === ni
                  ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {s.at === ni && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-lg">✉️</span>}
              <div className="text-xl leading-none">{n.emo}</div>
              <div className="mt-0.5 text-[9px] font-bold leading-tight text-gray-700">{n.name}</div>
            </div>
            {ni < NODES.length - 1 && (
              <div className="w-6 flex-none px-0.5 text-center">
                <div
                  className={`h-0.5 w-full rounded transition ${
                    s.hop === ni ? "animate-pulse bg-brand-500" : "bg-gray-200"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 区間のプロトコル表示 */}
      <div className="mt-2 flex text-center text-[10px] font-bold">
        <div className={`flex-[2] ${s.hop === 0 || s.hop === 1 ? "text-brand-600" : "text-gray-300"}`}>
          ── SMTP（送る）──
        </div>
        <div className={`flex-1 ${s.hop === 2 ? "text-sky-600" : "text-gray-300"}`}>─ POP/IMAP（受取）─</div>
      </div>

      {s.proto && (
        <div className="mt-2 text-center">
          <span
            className={`inline-block rounded-full px-3 py-1 font-mono text-xs font-bold text-white ${
              s.proto === "SMTP" ? "bg-brand-600" : "bg-sky-600"
            }`}
          >
            いま使っているのは {s.proto}
          </span>
        </div>
      )}

      <p
        className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: s.html }}
      />

      <StepNav
        index={i}
        total={STEPS.length}
        onPrev={() => setI((v) => Math.max(0, v - 1))}
        onNext={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
        onReset={() => setI(0)}
        doneLabel="配達完了 📬"
      />
    </Panel>
  );
}

function PopImap() {
  const [proto, setProto] = useState<"POP" | "IMAP">("POP");
  const [received, setReceived] = useState(false);
  const [tried, setTried] = useState<Set<string>>(new Set());
  const pop = proto === "POP";
  const bothTried = tried.has("POP") && tried.has("IMAP");

  const switchProto = (p: "POP" | "IMAP") => {
    setProto(p);
    setReceived(false);
  };
  const receive = () => {
    setReceived(true);
    setTried((prev) => new Set(prev).add(proto));
  };

  const device = (emo: string, name: string, body: string, tone: "ok" | "ng" | "idle") => (
    <div
      className={`flex-1 rounded-xl p-2.5 text-center ring-2 transition ${
        tone === "ok"
          ? "bg-emerald-50 ring-emerald-300"
          : tone === "ng"
            ? "bg-rose-50 ring-rose-300"
            : "bg-gray-50 ring-gray-200"
      }`}
    >
      <div className="text-2xl">{emo}</div>
      <div className="mt-0.5 text-[11px] font-bold text-gray-800">{name}</div>
      <div
        className={`mt-1 min-h-[2.6em] text-[10px] font-bold leading-snug ${
          tone === "ok" ? "text-emerald-700" : tone === "ng" ? "text-rose-700" : "text-gray-400"
        }`}
      >
        {body}
      </div>
    </div>
  );

  return (
    <Panel>
      <SectionTitle step={2}>POP と IMAP ― スマホで読んだら、PCでは？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        どちらも「受信」のプロトコルですが、<b className="text-gray-800">メールをどこに置くか</b>が違います。
        方式を選んで「📱スマホで受信」してから、💻PCをのぞいてみよう。
      </p>

      <div className="mt-3 flex gap-1.5">
        {(["POP", "IMAP"] as const).map((p) => (
          <button
            key={p}
            onClick={() => switchProto(p)}
            className={`flex-1 rounded-lg py-2 font-mono text-sm font-bold transition active:scale-95 ${
              proto === p ? "bg-brand-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {p === "POP" ? "📥 POP" : "☁️ IMAP"} {tried.has(p) && "✓"}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-stretch gap-1.5">
          {device(
            "📬",
            "受信サーバ",
            !received ? "✉️ 新着メール1通" : pop ? "（スマホに渡して空っぽ）" : "✉️ メールを保管中",
            !received ? "idle" : pop ? "ng" : "ok"
          )}
          {device(
            "📱",
            "スマホ",
            !received ? "まだ受信していない" : "✉️ 読めた！",
            !received ? "idle" : "ok"
          )}
          {device(
            "💻",
            "PC",
            !received ? "まだ受信していない" : pop ? "メールがない…😢" : "✉️ 同じメールが見える😊",
            !received ? "idle" : pop ? "ng" : "ok"
          )}
        </div>

        <button
          onClick={receive}
          disabled={received}
          className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95 ${
            received ? "bg-gray-300" : "bg-brand-600"
          }`}
        >
          📱 スマホで受信する
        </button>

        {received && (
          <div
            className={`mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed ring-1 ${
              pop
                ? "bg-rose-50 text-rose-800 ring-rose-200"
                : "bg-emerald-50 text-emerald-800 ring-emerald-200"
            }`}
          >
            {pop ? (
              <>
                <b>POP</b>＝メールを<b>スマホにダウンロードして手元に保存</b>。サーバから取り出すので、
                あとからPCで見ても届いていません。1台の決まった端末向き。
              </>
            ) : (
              <>
                <b>IMAP</b>＝メールは<b>サーバに置いたまま</b>読みます。だからスマホでもPCでも
                <b>同じ状態</b>で見られる。複数端末で使うならこちら。
              </>
            )}
          </div>
        )}
      </div>

      {bothTried && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
          💡 <b>気づいた？</b>　違いは<b>「メールの置き場所」</b>。
          <b>POP＝手元に持ってくる（サーバから取り出す）／IMAP＝サーバに置いたまま</b>。
          スマホとPCで同じメールを見たいなら IMAP です。
        </div>
      )}
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✉️ メールは<b>送る＝SMTP</b>、<b>受け取る＝POP / IMAP</b>。宛先は
        <b>To / CC / BCC</b> の使い分けがよく問われます。
      </div>

      <MailFlow />
      <PopImap />
      <CcBccQuiz />
    </div>
  );
}
