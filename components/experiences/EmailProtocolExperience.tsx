"use client";

import { useState, type ReactNode } from "react";
import { MailRouteScene, MailSyncScene, type RouteSceneProps, type SyncSceneProps } from "./email/MailScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「電子メールのしくみ」専用の体験。
//   ① 配達体験 … 2.5D の配送模型（あなた→送信サーバ→相手のメールサーバ→相手）を
//      ✉️が移動し、路面の区間標識（SMTP / POP・IMAP）が光る＝経路だけで送受の違いが分かる
//   ② POPとIMAP … スマホで受信→PCでも確認。POP=端末へ取り出す／IMAP=サーバ上で同期
//   ③ To / CC / BCC の違い 仕分けクイズ
// ============================================================================

type FlowStep = {
  title: string;
  nodes: RouteSceneProps["nodes"];
  segments: RouteSceneProps["segments"];
  mail: RouteSceneProps["mail"];
  proto: "SMTP" | "POP / IMAP" | null;
  detail: ReactNode;
};

const STEPS: FlowStep[] = [
  {
    title: "メールを書いて送信",
    nodes: { you: "active", smtp: "idle", mailbox: "idle", friend: "idle" },
    segments: { send: "idle", relay: "idle", fetch: "idle" },
    mail: { stop: "you", tone: "draft", label: "会議の件" },
    proto: null,
    detail: <>🧑 あなたがメールを書いて「送信」を押しました。ここから✉️の旅が始まります。</>,
  },
  {
    title: "あなた → 送信サーバ",
    nodes: { you: "sending", smtp: "active", mailbox: "idle", friend: "idle" },
    segments: { send: "active", relay: "idle", fetch: "idle" },
    mail: { stop: "smtp", tone: "smtp", label: "会議の件" },
    proto: "SMTP",
    detail: <>📤 あなたの端末 → 送信サーバ。<b>送るときはSMTP</b>。ポストに投函するイメージ。</>,
  },
  {
    title: "送信サーバ → 相手のメールサーバ",
    nodes: { you: "idle", smtp: "sending", mailbox: "active", friend: "idle" },
    segments: { send: "done", relay: "active", fetch: "idle" },
    mail: { stop: "mailbox", tone: "smtp", label: "会議の件" },
    proto: "SMTP",
    detail: <>🚚 送信サーバ → 相手の受信サーバ。<b>サーバ同士もSMTP</b>でバケツリレーして、相手のメールボックス（受信箱）へ。</>,
  },
  {
    title: "相手が受け取る",
    nodes: { you: "idle", smtp: "idle", mailbox: "sending", friend: "active" },
    segments: { send: "done", relay: "done", fetch: "active" },
    mail: { stop: "friend", tone: "recv", label: "会議の件" },
    proto: "POP / IMAP",
    detail: <>📥 相手がメールを読むとき、受信サーバから<b>POP または IMAP</b>で取り出します。ここだけプロトコルが変わる！</>,
  },
  {
    title: "まとめ：経路で覚える",
    nodes: { you: "idle", smtp: "idle", mailbox: "idle", friend: "idle" },
    segments: { send: "done", relay: "done", fetch: "done" },
    mail: { stop: "friend", tone: "read", label: "会議の件" },
    proto: null,
    detail: (
      <>
        💡 まとめ：<b>送る＝SMTP（あなた→サーバ→サーバ）、受け取る＝POP / IMAP</b>。「S」MTPのSを<b>Send（送信）</b>と結びつけて覚えよう。
      </>
    ),
  },
];

function MailFlow() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(STEPS.length, reducedMotion);
  const s = STEPS[player.index];
  return (
    <Panel>
      <SectionTitle step={1}>✉️ を配達してみよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        メールは<b className="text-gray-800">「送る」と「受け取る」で使う約束（プロトコル）が違います</b>。
        ✉️を運びながら、どの区間で何を使うか見てみよう。
      </p>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-brand-700">
            STEP {player.index + 1} / {STEPS.length}
          </p>
          <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="mail-step-title">
            {s.title}
          </p>
        </div>
        {s.proto && (
          <span
            className={`flex-none rounded-full px-3 py-1 font-mono text-xs font-bold text-white ${s.proto === "SMTP" ? "bg-brand-600" : "bg-sky-600"}`}
            data-testid="mail-proto"
          >
            いま {s.proto}
          </span>
        )}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <MailRouteScene nodes={s.nodes} segments={s.segments} mail={s.mail} reducedMotion={reducedMotion} />
      </div>

      <p className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900" aria-live="polite">
        {s.detail}
      </p>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="メール配送を再生"
          timelineLabel="メール配送のタイムライン"
          startCaption="送信"
          endCaption="配達完了"
          stepTone={(i) => (STEPS[i].proto === "POP / IMAP" ? "bg-sky-600" : "bg-brand-600")}
        />
      </div>
    </Panel>
  );
}

type SyncPhase = "idle" | "phone" | "pc";

function syncView(proto: "POP" | "IMAP", phase: SyncPhase): Omit<SyncSceneProps, "proto" | "reducedMotion"> {
  const pop = proto === "POP";
  if (phase === "idle") {
    return {
      nodes: { server: "active", phone: "idle", pc: "idle" },
      lanes: {},
      boxes: { server: { mail: true, read: false }, phone: { mail: false, note: "まだ受信していない" }, pc: { mail: false, note: "まだ受信していない" } },
      mail: { at: "server", tone: "recv", label: "新着 1通" },
    };
  }
  if (phase === "phone") {
    return pop
      ? {
          nodes: { server: "idle", phone: "active", pc: "idle" },
          lanes: { phone: "active" },
          boxes: { server: { mail: false, note: "空（取り出し済み）" }, phone: { mail: true, read: true }, pc: { mail: false, note: "まだ見ていない" } },
          mail: { at: "phone", tone: "recv", label: "スマホへ移動" },
        }
      : {
          nodes: { server: "active", phone: "active", pc: "idle" },
          lanes: { phone: "active" },
          boxes: { server: { mail: true, read: true }, phone: { mail: true, read: true }, pc: { mail: false, note: "まだ見ていない" } },
          mail: { at: "server", tone: "read", label: "サーバに保管" },
        };
  }
  return pop
    ? {
        nodes: { server: "idle", phone: "idle", pc: "error" },
        lanes: { pc: "active" },
        boxes: { server: { mail: false, note: "空（取り出し済み）" }, phone: { mail: true, read: true }, pc: { mail: false, note: "メールがない…😢" } },
        mail: { at: "phone", tone: "recv", label: "スマホの中だけ" },
      }
    : {
        nodes: { server: "active", phone: "active", pc: "active" },
        lanes: { phone: "active", pc: "active" },
        boxes: { server: { mail: true, read: true }, phone: { mail: true, read: true }, pc: { mail: true, read: true } },
        mail: { at: "server", tone: "read", label: "既読も同期" },
      };
}

function PopImap() {
  const reducedMotion = useReducedMotion();
  const [proto, setProto] = useState<"POP" | "IMAP">("POP");
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [tried, setTried] = useState<Set<string>>(new Set());
  const pop = proto === "POP";
  const bothTried = tried.has("POP") && tried.has("IMAP");
  const view = syncView(proto, phase);

  const switchProto = (p: "POP" | "IMAP") => {
    setProto(p);
    setPhase("idle");
  };
  const checkPc = () => {
    setPhase("pc");
    setTried((prev) => new Set(prev).add(proto));
  };

  return (
    <Panel>
      <SectionTitle step={2}>POP と IMAP ― スマホで読んだら、PCでは？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        どちらも「受信」のプロトコルですが、<b className="text-gray-800">メールをどこに置くか</b>が違います。
        方式を選んで「📱スマホで受信」してから、「💻PCでも確認」してみよう。
      </p>

      <div className="mt-3 flex gap-1.5">
        {(["POP", "IMAP"] as const).map((p) => (
          <button
            key={p}
            onClick={() => switchProto(p)}
            aria-pressed={proto === p}
            className={`flex-1 rounded-lg py-2 font-mono text-sm font-bold transition active:scale-95 ${
              proto === p ? "bg-brand-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {p === "POP" ? "📥 POP" : "☁️ IMAP"} {tried.has(p) && "✓"}
          </button>
        ))}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <MailSyncScene proto={proto} {...view} reducedMotion={reducedMotion} />
      </div>

      <div className="mt-3 flex gap-2">
        {phase === "idle" && (
          <button type="button" onClick={() => setPhase("phone")} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition active:scale-95">
            📱 スマホで受信する
          </button>
        )}
        {phase === "phone" && (
          <button type="button" onClick={checkPc} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition active:scale-95">
            💻 PCでも確認する
          </button>
        )}
        {phase !== "idle" && (
          <button type="button" onClick={() => setPhase("idle")} className="flex-none rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95" aria-label="最初から">
            ↺
          </button>
        )}
      </div>

      {phase !== "idle" && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ring-1 ${
            pop && phase === "pc" ? "bg-rose-50 text-rose-800 ring-rose-200" : pop ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"
          }`}
          aria-live="polite"
          data-testid="popimap-result"
        >
          {pop ? (
            phase === "phone" ? (
              <>
                <b>POP</b>＝メールを<b>スマホにダウンロードして手元に保存</b>。サーバの受信箱は<b>空</b>になりました。では PC では…？
              </>
            ) : (
              <>
                <b>POP</b>＝メールを<b>スマホにダウンロードして手元に保存</b>。サーバから取り出すので、
                あとからPCで見ても届いていません。1台の決まった端末向き。
              </>
            )
          ) : phase === "phone" ? (
            <>
              <b>IMAP</b>＝メールは<b>サーバに置いたまま</b>読みます。スマホで読んだので、サーバ上でも<b>既読</b>に。では PC では…？
            </>
          ) : (
            <>
              <b>IMAP</b>＝メールは<b>サーバに置いたまま</b>読みます。だからスマホでもPCでも
              <b>同じ状態（既読も）</b>で見られる。複数端末で使うならこちら。
            </>
          )}
        </div>
      )}

      {bothTried && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200" data-testid="popimap-insight">
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
