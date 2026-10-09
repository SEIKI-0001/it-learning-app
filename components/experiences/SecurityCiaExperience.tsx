"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";
import Icon from "@/components/ui/Icon";
import { InlineIcon } from "@/components/ui/Pictogram";

// ============================================================================
// 「情報セキュリティの3要素（CIA）」専用の体験。
//   ⓪ 3要素ってなに？ … 機密性・完全性・可用性をそれぞれ短く説明（意味・例・守り方）
//   ① 柱を折ってみる … 3本の柱が「情報」を支える図解。タップで柱が折れ、
//                        何が起きるか（事件例）を体感する
//   ② どの要素が損なわれた？ … 事件を3要素に仕分け（試験で頻出）
//   ③ おさらい … 3要素をコンパクトに一望
// ============================================================================

const ELEMS = [
  {
    id: "c", icon: "lock", name: "機密性", en: "Confidentiality", short: "見せない",
    mean: "許可された人だけが見られる", bad: "情報漏えい・のぞき見", incident: "顧客名簿が外部に漏れた！",
    detail: "見てよい人だけが情報を見られる状態のこと。関係ない人に見られたら、機密性が損なわれています。",
    example: "自分の成績は本人と先生だけが見られる",
    guard: "パスワード・アクセス権の設定・暗号化",
  },
  {
    id: "i", icon: "circle-check", name: "完全性", en: "Integrity", short: "正しく保つ",
    mean: "内容が正しく保たれ、勝手に書きかえられない", bad: "改ざん・書きかえ", incident: "Webサイトが書きかえられた！",
    detail: "情報が正しいまま、勝手に書きかえられていない状態のこと。中身が変えられたら、完全性が損なわれています。",
    example: "銀行の残高が勝手に増えたり減ったりしない",
    guard: "変更履歴の記録・デジタル署名・ハッシュ値で照合",
  },
  {
    id: "a", icon: "zap", name: "可用性", en: "Availability", short: "止めない",
    mean: "使いたいときにきちんと使える（止まらない）", bad: "システム停止・サービス不能", incident: "サーバが落ちて使えない！",
    detail: "使いたいときに、きちんと使える状態のこと。システムが止まって使えなければ、可用性が損なわれています。",
    example: "ATMや予約サイトがいつでも使える",
    guard: "バックアップ・予備の機器（二重化）・停電対策",
  },
] as const;

type ElemId = (typeof ELEMS)[number]["id"];

// ---------------------------------------------------------------------------
// ⓪ 3要素ってなに？: 体験の前に、それぞれの意味を短く押さえる。
// ---------------------------------------------------------------------------
function ElementBasics() {
  return (
    <Panel>
      <SectionTitle step={1}>3要素ってなに？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        情報を「安全に扱えている」と言えるのは、次の<b className="text-gray-800">3つがそろっているとき</b>です。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ELEMS.map((e) => (
          <li key={e.id} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <Icon name={e.icon} className="h-4 w-4 text-brand-700" />
              <span className="text-sm font-bold text-gray-900">{e.name}</span>
              <span className="text-xs text-gray-500">{e.en}</span>
              <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
                {e.short}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{e.detail}</p>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs leading-relaxed text-gray-600">
              <dt className="font-bold text-gray-500">例</dt>
              <dd>{e.example}</dd>
              <dt className="font-bold text-gray-500">守り方</dt>
              <dd>{e.guard}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ① 柱を折ってみる: 3本の柱が「情報」の屋根を支える。タップで折る⇄直す。
// ---------------------------------------------------------------------------
function PillarDemo() {
  const [broken, setBroken] = useState<Record<ElemId, boolean>>({ c: false, i: false, a: false });
  const brokenList = ELEMS.filter((e) => broken[e.id]);
  const count = brokenList.length;

  return (
    <Panel>
      <SectionTitle step={2}>3本の柱が「情報」を支えている</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大切な情報は<b className="text-gray-800">3本の柱</b>で支えられています。
        柱をタップして<b className="text-gray-800">折ってみる</b>と、何が起きるか分かります。
      </p>

      {/* 屋根（情報）＋3本柱の図解 */}
      <div className="mt-4 select-none">
        <div
          className={`mx-auto grid h-14 max-w-[280px] place-items-center rounded-xl text-sm font-bold transition-all duration-300 ${
            count === 0
              ? "bg-brand-600 text-white"
              : count < 3
                ? "translate-y-1 -rotate-2 bg-amber-500 text-white"
                : "translate-y-3 rotate-3 bg-rose-500 text-white"
          }`}
        >
          {count === 0 ? "大切な情報（安全）" : count < 3 ? "大切な情報（危険！）" : "情報が守れない！"}
        </div>
        <div className="mx-auto mt-1 flex max-w-[280px] justify-between gap-2">
          {ELEMS.map((e) => {
            const isBroken = broken[e.id];
            return (
              <button
                key={e.id}
                onClick={() => setBroken((p) => ({ ...p, [e.id]: !p[e.id] }))}
                aria-pressed={isBroken}
                className={`flex h-24 flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
                  isBroken
                    ? "translate-y-2 rotate-6 border-dashed border-rose-400 bg-rose-50 text-rose-600 opacity-80"
                    : "border-brand-300 bg-brand-50 text-brand-700"
                }`}
              >
                <Icon name={isBroken ? "alert" : e.icon} className="h-5 w-5" />
                {e.name}
                <span className="font-mono text-[10px] font-bold opacity-60">{e.en[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 起きたことの表示 */}
      <div className="mt-4 min-h-[4em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {count === 0 ? (
          <p className="text-sm leading-relaxed text-emerald-700">
            3本すべて立っている＝情報は安全。<b>どれか1本欠けただけで危険</b>になります。柱をタップして確かめてみよう。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {brokenList.map((e) => (
              <li key={e.id} className="text-sm leading-relaxed text-rose-700">
                <InlineIcon name="alert" /><b>{e.name}</b>が折れた → {e.incident}（{e.bad}）
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <InlineIcon name="lightbulb" />セキュリティ＝「秘密を守る」だけではありません。<b>書きかえられない</b>（完全性）、
        <b>止まらない</b>（可用性）も同じくらい大切。<b>3つセット</b>で考えます。
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 仕分けクイズ
// ---------------------------------------------------------------------------
const ITEMS: { t: string; ans: ElemId; why: string }[] = [
  { t: "顧客名簿が外部に漏えいした", ans: "c", why: "見てはいけない人に見られた＝機密性。" },
  { t: "Webサイトを勝手に書きかえられた", ans: "i", why: "内容が正しく保たれていない＝完全性。" },
  { t: "アクセス集中でサーバが落ち、使えない", ans: "a", why: "使いたいのに使えない＝可用性。" },
  { t: "パスワードをのぞき見された", ans: "c", why: "秘密が漏れた＝機密性。" },
  { t: "振込金額のデータが改ざんされた", ans: "i", why: "勝手に書きかえられた＝完全性。" },
];

function Classifier() {
  const [answers, setAnswers] = useState<Record<number, ElemId>>({});
  const label = (id: ElemId) => ELEMS.find((e) => e.id === id)!.name;

  return (
    <Panel>
      <SectionTitle step={3}>どの柱が折れた？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        起きた出来事は、3要素の<b className="text-gray-800">どれが損なわれた</b>ケース？
        試験ではこの仕分けがよく問われます。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{it.t}</div>
              <div className="mt-2 flex gap-1.5">
                {ELEMS.map((e) => {
                  const picked = chosen === e.id;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? e.id === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : e.id === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={e.id}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: e.id }))}
                      className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {e.name}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は「${label(it.ans)}」。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function SecurityCiaExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        情報セキュリティは<b>3つの柱（CIA）</b>で守ります——
        <b>機密性</b>（見せない）・<b>完全性</b>（正しく保つ）・<b>可用性</b>（止めない）。
      </div>

      <ElementBasics />
      <PillarDemo />
      <Classifier />

      <Panel>
        <SectionTitle step={4}>おさらい</SectionTitle>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ELEMS.map((e) => (
            <div key={e.id} className="rounded-xl bg-brand-50 p-2.5 text-center ring-1 ring-brand-100">
              <Icon name={e.icon} className="h-5 w-5 text-gray-700" />
              <div className="mt-0.5 text-xs font-bold text-brand-800">{e.name}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-gray-600">{e.mean}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          ※ 3つの頭文字 C（Confidentiality）・I（Integrity）・A（Availability）をとって「情報セキュリティのCIA」と呼びます。
        </p>
      </Panel>
    </div>
  );
}
