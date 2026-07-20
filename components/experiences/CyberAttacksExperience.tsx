"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「サイバー攻撃の手口」専用の体験。
//   ① 攻撃ラボ … 攻撃を選んで実験用の会社に撃ち込むと、
//      サーバ/DB/利用者/社員のどこで何が起きるかが攻撃ごとに変わる
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

// 攻撃ごとの各所の状態
function nodeState(sel: AttackId | null) {
  const ok = { tone: "ring-gray-200 bg-white", body: "", hit: false };
  const s = {
    server: { ...ok, body: "正常に稼働中" },
    db: { ...ok, body: "データを保管中" },
    users: { ...ok, body: "サイトを閲覧中" },
    staff: { ...ok, body: "ふつうに仕事中" },
  };
  const hit = "ring-rose-400 bg-rose-50";
  switch (sel) {
    case "ddos":
      s.server = { tone: hit, body: "🌊🌊🌊 アクセス殺到→💥ダウン", hit: true };
      s.users = { tone: "ring-amber-300 bg-amber-50", body: "❌ つながらない…", hit: true };
      break;
    case "sqli":
      s.server = { tone: "ring-amber-300 bg-amber-50", body: "入力欄に「' OR 1=1 --」", hit: true };
      s.db = { tone: hit, body: "📄📄 会員データが流出！", hit: true };
      break;
    case "xss":
      s.server = { tone: "ring-amber-300 bg-amber-50", body: "掲示板に🪤が仕込まれた", hit: true };
      s.users = { tone: hit, body: "💥 罠が実行→🍪情報流出", hit: true };
      break;
    case "targeted":
      s.staff = { tone: hit, body: "✉️「請求書.zip」開封→🐴侵入", hit: true };
      break;
    case "social":
      s.staff = { tone: hit, body: "📞「システム部です」→🔑漏洩", hit: true };
      break;
  }
  return s;
}

function AttackLab() {
  const [sel, setSel] = useState<AttackId | null>(null);
  const [tried, setTried] = useState<Set<AttackId>>(new Set());
  const cur = ATTACKS.find((a) => a.id === sel) ?? null;
  const nodes = nodeState(sel);
  const allTried = tried.size >= ATTACKS.length;

  const fire = (id: AttackId) => {
    setSel(id);
    setTried((p) => new Set(p).add(id));
  };

  const nodeCard = (emo: string, name: string, st: { tone: string; body: string; hit: boolean }) => (
    <div className={`rounded-xl p-2 ring-2 transition ${st.tone}`}>
      <div className="text-[11px] font-bold text-gray-800">
        {emo} {name}
      </div>
      <div
        className={`mt-1 min-h-[2.4em] text-[10px] font-bold leading-snug ${
          st.hit ? "text-rose-700" : "text-gray-400"
        } ${st.hit ? "animate-pulse" : ""}`}
      >
        {st.body}
      </div>
    </div>
  );

  return (
    <Panel>
      <SectionTitle step={1}>攻撃ラボ ― 撃ってみると違いが分かる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        実験用の会社に、攻撃者😈として5つの手口を撃ち込んでみよう。
        <b className="text-gray-800">どこで・何が起きるか</b>が手口ごとに違います。
      </p>

      {/* 攻撃の選択 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ATTACKS.map((a) => {
          const on = sel === a.id;
          return (
            <button
              key={a.id}
              onClick={() => fire(a.id)}
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

      {/* 実験用の会社 */}
      <div className="mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400">🏢 実験用の会社</span>
          {cur && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                cur.target === "人をだます" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              狙い：{cur.target === "人をだます" ? "🧑 人" : "💻 機械"}
            </span>
          )}
        </div>

        {cur && (
          <div className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-center text-[11px] font-bold text-gray-700 ring-1 ring-gray-200">
            😈 {cur.scene}
            <span className="mx-1 text-rose-500">──▶</span>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {nodeCard("🌐", "Webサーバ", nodes.server)}
          {nodeCard("🗄️", "データベース", nodes.db)}
          {nodeCard("🧑🧑", "サイトの利用者", nodes.users)}
          {nodeCard("👩‍💼", "社員のPC", nodes.staff)}
        </div>

        {cur ? (
          <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800 ring-1 ring-rose-200">
            <b>
              {cur.emo} {cur.name}
            </b>
            ：{cur.result}
          </div>
        ) : (
          <p className="mt-2 text-center text-xs text-gray-400">↑ 攻撃を選んで撃ってみよう</p>
        )}
      </div>

      {allTried && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
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
