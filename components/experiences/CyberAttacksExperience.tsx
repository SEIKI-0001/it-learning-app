"use client";

import { useState } from "react";
import { CyberScene, type CyberSceneProps } from "./cyber/CyberScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「サイバー攻撃の手口」専用の体験。
//   ① 攻撃ラボ … 攻撃を選んで 2.5D の実験用の会社に撃ち込むと、攻撃物が
//      インターネット→Webサーバ→DB／利用者／社員PC と手口ごとの経路を移動し、被害の出る場所が変わる
//   ② 「これはどの攻撃？」仕分けクイズ
//   ③ まとめ
// ============================================================================

type AttackId = "ddos" | "sqli" | "xss" | "targeted" | "social";

type Attack = {
  id: AttackId;
  emo: string;
  name: string;
  target: "機械を攻める" | "人をだます";
  scene: string; // 攻撃者がやること
  result: string; // 何が起きたか
};

const ATTACKS: Attack[] = [
  {
    id: "ddos",
    emo: "🌊",
    name: "DoS / DDoS 攻撃",
    target: "機械を攻める",
    scene: "世界中の機器から一斉に大量アクセスを送りつける",
    result: "サーバがパンクしてサービス停止。利用者は誰もつながらない。",
  },
  {
    id: "sqli",
    emo: "💉",
    name: "SQLインジェクション",
    target: "機械を攻める",
    scene: "入力欄に「' OR 1=1 --」などDBへの命令文を混ぜて送る",
    result: "データベースが命令をうのみにして、会員データが流出。",
  },
  {
    id: "xss",
    emo: "🪤",
    name: "クロスサイトスクリプティング(XSS)",
    target: "機械を攻める",
    scene: "掲示板に罠のスクリプトをこっそり書き込んでおく",
    result: "見に来た利用者のブラウザで罠が動き、その人の情報が盗まれる。",
  },
  {
    id: "targeted",
    emo: "🎯",
    name: "標的型攻撃",
    target: "人をだます",
    scene: "この会社だけを狙い、取引先を装ったメールで添付を開かせる",
    result: "社員が添付を開いてしまい、ウイルスが社内に侵入。",
  },
  {
    id: "social",
    emo: "🎭",
    name: "ソーシャルエンジニアリング",
    target: "人をだます",
    scene: "「システム部です」と電話し、パスワードを聞き出す",
    result: "技術を使わず、人の思い込みだけでパスワードが漏れた。",
  },
];

type AttackStep = { title: string; view: Omit<CyberSceneProps, "reducedMotion"> };

const CALM: CyberSceneProps["nodes"] = { attacker: "idle", internet: "idle", web: "idle", db: "idle", user: "idle", staff: "idle" };
const n = (over: Partial<CyberSceneProps["nodes"]>) => ({ ...CALM, ...over });

// 攻撃ごとの「通り道」と「被害の出る場所」。STEP を進めると攻撃物が経路を移動する。
const ROUTES: Record<AttackId, AttackStep[]> = {
  ddos: [
    {
      title: "大量の機器から一斉アクセス",
      view: { nodes: n({ attacker: "active", internet: "sending" }), lanes: { ai: "attack" }, flood: ["ai"], payload: { stop: "internet", tone: "attack", text: "×10000 アクセス" }, damage: [] },
    },
    {
      title: "Webサーバに集中",
      view: { nodes: n({ internet: "sending", web: "active" }), lanes: { ai: "attack", iw: "attack" }, flood: ["ai", "iw"], payload: { stop: "web", tone: "attack", text: "×10000 アクセス" }, damage: [] },
    },
    {
      title: "サーバが停止 → 利用者もつながらない",
      view: {
        nodes: n({ web: "error", user: "error" }),
        lanes: { ai: "attack", iw: "attack", ui: "blocked" },
        flood: ["ai", "iw"],
        payload: null,
        damage: [
          { at: "web", text: "ダウン" },
          { at: "user", text: "つながらない" },
        ],
      },
    },
  ],
  sqli: [
    {
      title: "入力欄に命令文を混ぜて送る",
      view: { nodes: n({ attacker: "active", internet: "sending" }), lanes: { ai: "attack" }, flood: [], payload: { stop: "internet", tone: "attack", text: "' OR 1=1 --" }, damage: [] },
    },
    {
      title: "Webサーバがそのまま DB へ渡す",
      view: { nodes: n({ web: "active" }), lanes: { ai: "attack", iw: "attack" }, flood: [], payload: { stop: "web", tone: "attack", text: "' OR 1=1 --" }, damage: [] },
    },
    {
      title: "DBが命令をうのみにする",
      view: { nodes: n({ web: "sending", db: "error" }), lanes: { iw: "attack", wd: "attack" }, flood: [], payload: { stop: "db", tone: "attack", text: "' OR 1=1 --" }, damage: [] },
    },
    {
      title: "会員データが流出",
      view: {
        nodes: n({ db: "error", attacker: "active" }),
        lanes: { wd: "leak", iw: "leak", ai: "leak" },
        flood: [],
        payload: { stop: "attacker", tone: "leak", text: "📄 会員データ" },
        damage: [{ at: "db", text: "データ流出" }],
      },
    },
  ],
  xss: [
    {
      title: "掲示板（Webサーバ）に罠を書き込む",
      view: { nodes: n({ attacker: "active", web: "sending" }), lanes: { ai: "attack", iw: "attack" }, flood: [], payload: { stop: "web", tone: "attack", text: "🪤 <script>" }, damage: [] },
    },
    {
      title: "利用者がそのページを見に来る",
      view: { nodes: n({ user: "active", web: "sending" }), lanes: { ui: "normal", iw: "normal" }, flood: [], payload: { stop: "web", tone: "attack", text: "🪤 <script>" }, damage: [] },
    },
    {
      title: "利用者のブラウザ上で罠が実行",
      view: { nodes: n({ user: "error" }), lanes: { iw: "attack", ui: "attack" }, flood: [], payload: { stop: "user", tone: "attack", text: "🪤 実行！" }, damage: [] },
    },
    {
      title: "利用者の情報が攻撃者へ",
      view: {
        nodes: n({ user: "error", attacker: "active" }),
        lanes: { ui: "leak", ai: "leak" },
        flood: [],
        payload: { stop: "attacker", tone: "leak", text: "🍪 利用者の情報" },
        damage: [{ at: "user", text: "情報を盗まれた" }],
      },
    },
  ],
  targeted: [
    {
      title: "取引先を装ったメールを送る",
      view: { nodes: n({ attacker: "active", staff: "sending" }), lanes: { ai: "attack", is: "attack" }, flood: [], payload: { stop: "staff", tone: "attack", text: "✉ 請求書.zip" }, damage: [] },
    },
    {
      title: "社員が添付を開封",
      view: { nodes: n({ staff: "error" }), lanes: { is: "attack" }, flood: [], payload: { stop: "staff", tone: "attack", text: "🐴 ウイルス" }, damage: [{ at: "staff", text: "感染" }] },
    },
    {
      title: "社内のサーバ・DBへ侵入",
      view: {
        nodes: n({ staff: "error", web: "error", db: "error" }),
        lanes: { sw: "attack", wd: "attack" },
        flood: [],
        payload: { stop: "web", tone: "attack", text: "🐴 侵入" },
        damage: [
          { at: "staff", text: "感染" },
          { at: "db", text: "侵入" },
        ],
      },
    },
  ],
  social: [
    {
      title: "「システム部です」と電話",
      view: { nodes: n({ attacker: "active", staff: "active" }), lanes: { as: "phone" }, flood: [], payload: { stop: "staff", tone: "phone", text: "📞 システム部です" }, damage: [] },
    },
    {
      title: "社員が信じてしまう",
      view: { nodes: n({ staff: "error" }), lanes: { as: "phone" }, flood: [], payload: { stop: "staff", tone: "phone", text: "🔑 パスワードは…" }, damage: [] },
    },
    {
      title: "パスワードが攻撃者へ",
      view: {
        nodes: n({ staff: "error", attacker: "active" }),
        lanes: { as: "leak" },
        flood: [],
        payload: { stop: "attacker", tone: "leak", text: "🔑 パスワード" },
        damage: [{ at: "staff", text: "パスワード流出" }],
      },
    },
  ],
};

const IDLE_VIEW: Omit<CyberSceneProps, "reducedMotion"> = { nodes: CALM, lanes: {}, flood: [], payload: null, damage: [] };

function AttackLab() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<AttackId | null>(null);
  const [tried, setTried] = useState<Set<AttackId>>(new Set());
  const cur = ATTACKS.find((a) => a.id === sel) ?? null;
  const steps = sel ? ROUTES[sel] : [{ title: "攻撃を選んでね", view: IDLE_VIEW }];
  const player = useStepPlayer(steps.length, reducedMotion);
  const idx = Math.min(player.index, steps.length - 1);
  const step = steps[idx];
  const atEnd = sel !== null && idx === steps.length - 1;
  const allTried = tried.size >= ATTACKS.length;

  // 被害まで見届けた手口を記録（描画中の派生 state 更新）
  if (atEnd && sel && !tried.has(sel)) setTried(new Set(tried).add(sel));

  const fire = (id: AttackId) => {
    setSel(id);
    // 動きを減らす設定では自動再生せず、STEP 1 から手で進める
    if (reducedMotion) player.reset();
    else player.play();
  };

  return (
    <Panel>
      <SectionTitle step={1}>攻撃ラボ ― 撃ってみると違いが分かる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        実験用の会社に、攻撃者😈として5つの手口を撃ち込んでみよう。
        <b className="text-gray-800">どこを通って・どこに被害が出るか</b>が手口ごとに違います。
      </p>

      {/* 攻撃の選択 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ATTACKS.map((a) => {
          const on = sel === a.id;
          return (
            <button
              key={a.id}
              onClick={() => fire(a.id)}
              aria-pressed={on}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                on
                  ? "bg-brand-600 text-white"
                  : tried.has(a.id)
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                    : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
              }`}
            >
              {a.emo} {a.name.replace("クロスサイトスクリプティング", "")}
              {tried.has(a.id) && !on && " ✓"}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-rose-700">{cur ? `STEP ${idx + 1} / ${steps.length}` : "実験用の会社"}</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="cyber-step-title">
            {cur ? step.title : "↓ 攻撃を選ぶと、経路と被害が見えます"}
          </p>
        </div>
        {cur && (
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${
              cur.target === "人をだます" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
            }`}
            data-testid="cyber-target"
          >
            狙い：{cur.target === "人をだます" ? "🧑 人" : "💻 機械"}
          </span>
        )}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <CyberScene {...step.view} reducedMotion={reducedMotion} />
      </div>

      {cur ? (
        <>
          <div className="mt-3 rounded-lg bg-white px-2.5 py-1.5 text-center text-[11px] font-bold text-gray-700 ring-1 ring-gray-200">😈 {cur.scene}</div>
          <div className="mt-3">
            <SceneTimeline
              index={idx}
              steps={steps}
              playing={player.playing}
              reducedMotion={reducedMotion}
              onMove={player.move}
              onTogglePlay={player.togglePlay}
              playLabel="攻撃の流れを再生"
              timelineLabel="攻撃の流れのタイムライン"
              startCaption="侵入口"
              endCaption="被害"
              stepTone={(i) => (i === steps.length - 1 ? "bg-rose-500" : "bg-brand-600")}
            />
          </div>
          {atEnd && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800 ring-1 ring-rose-200" data-testid="cyber-result">
              <b>
                {cur.emo} {cur.name}
              </b>
              ：{cur.result}
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-center text-xs text-gray-400">↑ 攻撃を選んで撃ってみよう</p>
      )}

      {allTried && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200" data-testid="cyber-insight">
          💡 <b>気づいた？</b>　<b>DoS・SQLインジェクション・XSSは「機械」を攻める</b>ので仕組み（設定や修正）で防ぎ、
          <b>標的型・ソーシャルエンジニアリングは「人」をだます</b>のでルールと教育で防ぎます。
          狙いがどちらかを見分けるのが第一歩。
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>DoS＝止める</b>／<b>SQLインジェクション＝DBへの不正命令</b>／<b>XSS＝罠スクリプト</b>／
        <b>標的型＝狙い撃ちメール</b>／<b>ソーシャルエンジニアリング＝人をだます</b>。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "問い合わせフォームに『' OR 1=1 --』と入力され、会員データが丸見えになった。",
    ans: "SQLインジェクション",
    opts: ["SQLインジェクション", "DoS攻撃", "ソーシャルエンジニアリング"],
    why: "入力欄からデータベースへの命令を送り込む手口＝SQLインジェクション。",
  },
  {
    t: "深夜に世界中の機器から一斉にアクセスが殺到し、サイトがつながらなくなった。",
    ans: "DDoS攻撃",
    opts: ["DDoS攻撃", "XSS", "標的型攻撃"],
    why: "多数の機器から大量アクセスでサービスを停止させる＝DDoS攻撃。",
  },
  {
    t: "「システム部です。確認のためパスワードを教えてください」と電話がかかってきた。",
    ans: "ソーシャルエンジニアリング",
    opts: ["ソーシャルエンジニアリング", "SQLインジェクション", "ランサムウェア"],
    why: "技術でなく“人”をだまして聞き出す手口＝ソーシャルエンジニアリング。",
  },
  {
    t: "取引先を装い、業務に関係ありそうな件名のメールで添付を開かせ、自社だけを狙ってきた。",
    ans: "標的型攻撃",
    opts: ["標的型攻撃", "DoS攻撃", "XSS"],
    why: "特定の組織を狙い撃ちする巧妙なメール攻撃＝標的型攻撃。",
  },
];

function AttackQuiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>これはどの攻撃？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        場面を読んで、当てはまる攻撃を選んでみましょう。
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
    </Panel>
  );
}

export default function CyberAttacksExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ 攻撃は<b>「機械（システム）を攻める」</b>ものと<b>「人をだます」</b>ものがあります。
        名前と<b>特徴のキーワード</b>をセットで覚えるのがコツ。
      </div>

      <AttackLab />
      <AttackQuiz />

      <Panel>
        <SectionTitle emoji="🔑">まとめ</SectionTitle>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
          <li>・<b>DoS / DDoS</b>：大量アクセスでサービスを停止させる。</li>
          <li>・<b>SQLインジェクション</b>：入力欄からDBへ不正な命令を送り込む。</li>
          <li>・<b>XSS</b>：罠のスクリプトを仕込み、見に来た人のブラウザで実行。</li>
          <li>・<b>標的型攻撃</b>：特定組織を狙う巧妙ななりすましメール。</li>
          <li>・<b>ソーシャルエンジニアリング</b>：技術でなく人の隙を突いて情報を得る。</li>
        </ul>
      </Panel>
    </div>
  );
}
