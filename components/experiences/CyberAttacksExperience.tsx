"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「サイバー攻撃の手口」専用の体験。
//   ① 代表的な攻撃をタップして特徴をつかむ（標的＝機械か人か で2グループ）
//   ② 「これはどの攻撃？」仕分けクイズ
// ============================================================================

type Attack = {
  emo: string;
  name: string;
  tag: string;
  target: "システムを攻める" | "人をだます";
  d: string;
};

const ATTACKS: Attack[] = [
  {
    emo: "🌊",
    name: "DoS / DDoS 攻撃",
    tag: "大量アクセスで麻痺",
    target: "システムを攻める",
    d: "大量のアクセスやデータを一気に送りつけ、サーバをパンクさせてサービスを止める。多数の機器から一斉に行うのがDDoS。",
  },
  {
    emo: "💉",
    name: "SQLインジェクション",
    tag: "入力欄から不正命令",
    target: "システムを攻める",
    d: "入力欄にデータベースへの命令文（SQL）を混ぜて送り込み、本来見えない情報を抜き取ったり書き換えたりする。",
  },
  {
    emo: "🪤",
    name: "クロスサイトスクリプティング(XSS)",
    tag: "罠スクリプトを仕込む",
    target: "システムを攻める",
    d: "掲示板などにこっそり悪意のあるスクリプトを書き込み、見に来た他の利用者のブラウザで動かして情報を盗む。",
  },
  {
    emo: "🎯",
    name: "標的型攻撃",
    tag: "特定の組織を狙い撃ち",
    target: "人をだます",
    d: "特定の会社や役所を狙い、業務に関係ありそうなメールを装って添付ファイルやリンクを開かせ、侵入する。",
  },
  {
    emo: "🎭",
    name: "ソーシャルエンジニアリング",
    tag: "人の隙をつく",
    target: "人をだます",
    d: "技術ではなく“人”を狙う。電話で関係者になりすます／背後からパスワード入力をのぞき見る／ゴミ箱の書類をあさる、など。",
  },
];

function AttackCards() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Panel>
      <SectionTitle step={1}>代表的な手口をタップ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        攻撃は大きく<b className="text-gray-800">「システムを直接攻める」</b>ものと、
        <b className="text-gray-800">「人をだまして突破口にする」</b>ものに分かれます。
      </p>
      <div className="mt-3 space-y-2.5">
        {ATTACKS.map((a) => {
          const isOpen = open === a.name;
          const isHuman = a.target === "人をだます";
          return (
            <button
              key={a.name}
              onClick={() => setOpen(isOpen ? null : a.name)}
              className={`block w-full rounded-xl p-3 text-left ring-1 transition active:scale-[0.99] ${
                isOpen ? "bg-indigo-50 ring-indigo-300" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl">{a.emo}</span>
                <span className="text-sm font-extrabold text-gray-800">{a.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isHuman ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {a.tag}
                </span>
                <span className="ml-auto text-[11px] font-bold text-gray-400">
                  {a.target}
                </span>
              </div>
              {isOpen && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{a.d}</p>
              )}
            </button>
          );
        })}
      </div>
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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ 攻撃は<b>「機械（システム）を攻める」</b>ものと<b>「人をだます」</b>ものがあります。
        名前と<b>特徴のキーワード</b>をセットで覚えるのがコツ。
      </div>

      <AttackCards />
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
