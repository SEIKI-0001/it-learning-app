"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「経営管理システム（CRM・SCM・ERP）」専用の体験。
//   ① 会社の地図（仕入先→自社4部門→顧客）でシステムをタップ
//      → 管理する「範囲」が光り、対象の違いが絵で分かる
//   ② 「このシステムはどれ？」仕分けクイズ
// ============================================================================

type SysKey = "crm" | "scm" | "erp";

const SYS: {
  key: SysKey;
  abbr: string;
  full: string;
  jp: string;
  emo: string;
  target: string;
  d: string;
  ex: string;
  tone: string;
}[] = [
  {
    key: "crm",
    abbr: "CRM",
    full: "Customer Relationship Management",
    jp: "顧客関係管理",
    emo: "🙋",
    target: "お客さんとの関係",
    d: "購入履歴・問い合わせ・好みなど顧客の情報をまとめ、ひとりひとりに合った対応や提案につなげて、長く付き合えるようにする。",
    ex: "例：誕生日にクーポン、過去の購入に合わせたおすすめ",
    tone: "bg-rose-50 ring-rose-300 text-rose-900",
  },
  {
    key: "scm",
    abbr: "SCM",
    full: "Supply Chain Management",
    jp: "供給連鎖管理",
    emo: "🚚",
    target: "仕入れ〜販売の流れ全体",
    d: "原材料の調達から製造・在庫・配送・販売までの“モノの流れ”全体を管理し、ムダな在庫や品切れを減らす。",
    ex: "例：売れ行きに合わせて仕入れと配送を最適化",
    tone: "bg-sky-50 ring-sky-300 text-sky-900",
  },
  {
    key: "erp",
    abbr: "ERP",
    full: "Enterprise Resource Planning",
    jp: "企業資源計画",
    emo: "🏢",
    target: "社内の経営資源（ヒト・モノ・カネ・情報）",
    d: "会計・人事・在庫・販売など、バラバラだった社内の情報を1つに統合し、全社の経営資源をまとめて最適に管理する。",
    ex: "例：販売データが会計や在庫に自動で反映",
    tone: "bg-emerald-50 ring-emerald-300 text-emerald-900",
  },
];

const DEPTS = [
  { key: "acct", emo: "🧾", name: "会計" },
  { key: "hr", emo: "👥", name: "人事" },
  { key: "stock", emo: "📦", name: "在庫" },
  { key: "sales", emo: "🛒", name: "販売" },
];

// 各システムが「光らせる」場所
const COVER: Record<SysKey, { supplier: boolean; arrow1: boolean; depts: string[]; box: boolean; arrow2: boolean; customer: boolean }> = {
  crm: { supplier: false, arrow1: false, depts: ["sales"], box: false, arrow2: true, customer: true },
  scm: { supplier: true, arrow1: true, depts: ["stock", "sales"], box: false, arrow2: true, customer: true },
  erp: { supplier: false, arrow1: false, depts: ["acct", "hr", "stock", "sales"], box: true, arrow2: false, customer: false },
};

const HI: Record<SysKey, { node: string; arrow: string; badge: string }> = {
  crm: { node: "bg-rose-100 ring-rose-400", arrow: "text-rose-400", badge: "bg-rose-100 text-rose-700" },
  scm: { node: "bg-sky-100 ring-sky-400", arrow: "text-sky-400", badge: "bg-sky-100 text-sky-700" },
  erp: { node: "bg-emerald-100 ring-emerald-400", arrow: "text-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
};

function CompanyMap() {
  const [sys, setSys] = useState<SysKey | null>(null);
  const [tried, setTried] = useState<Set<SysKey>>(new Set());
  const active = SYS.find((s) => s.key === sys) ?? null;
  const cover = sys ? COVER[sys] : null;
  const hi = sys ? HI[sys] : null;
  const allTried = tried.size === SYS.length;

  const pick = (key: SysKey) => {
    setSys(key);
    setTried((prev) => new Set(prev).add(key));
  };

  return (
    <Panel>
      <SectionTitle step={1}>どこを管理する？ 会社の地図で見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        名前が似た3つのシステム。<b className="text-gray-800">タップすると、管理する範囲が光ります</b>。
        違いは「どこを管理するか」だけ！
      </p>

      {/* システム選択 */}
      <div className="mt-3 flex gap-1.5">
        {SYS.map((s) => {
          const picked = sys === s.key;
          return (
            <button
              key={s.key}
              onClick={() => pick(s.key)}
              className={`flex-1 rounded-xl py-2.5 text-center transition active:scale-95 ${
                picked ? "bg-brand-600 text-white" : "bg-gray-50 text-gray-700 ring-1 ring-gray-300"
              }`}
            >
              <div className="text-lg">{s.emo}</div>
              <div className="text-sm font-bold">
                {s.abbr}
                {tried.has(s.key) && !picked && <span className="ml-0.5 text-[10px]">✓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* 会社の地図 */}
      <div className="mt-3 rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
        <div className="flex items-center gap-1">
          {/* 仕入先 */}
          <div
            className={`w-14 flex-none rounded-lg py-2 text-center ring-1 transition ${
              cover?.supplier ? `${hi!.node} animate-pulse` : "bg-white ring-gray-200"
            }`}
          >
            <div className="text-lg">🏭</div>
            <div className="text-[9px] font-bold text-gray-600">仕入先</div>
          </div>
          <span className={`flex-none text-sm font-bold transition ${cover?.arrow1 ? `${hi!.arrow} animate-pulse` : "text-gray-200"}`}>
            →
          </span>
          {/* 自社 */}
          <div
            className={`flex-1 rounded-lg p-1.5 ring-2 transition ${
              cover?.box ? `${hi!.node}` : "bg-white ring-gray-200"
            }`}
          >
            <div className="text-center text-[9px] font-bold text-gray-500">🏢 自社</div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {DEPTS.map((d) => {
                const on = cover?.depts.includes(d.key);
                return (
                  <div
                    key={d.key}
                    className={`rounded-md py-1 text-center ring-1 transition ${
                      on ? `${hi!.node} animate-pulse` : "bg-gray-50 ring-gray-200"
                    }`}
                  >
                    <span className="text-xs">{d.emo}</span>
                    <span className="ml-0.5 text-[10px] font-bold text-gray-700">{d.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <span className={`flex-none text-sm font-bold transition ${cover?.arrow2 ? `${hi!.arrow} animate-pulse` : "text-gray-200"}`}>
            →
          </span>
          {/* 顧客 */}
          <div
            className={`w-14 flex-none rounded-lg py-2 text-center ring-1 transition ${
              cover?.customer ? `${hi!.node} animate-pulse` : "bg-white ring-gray-200"
            }`}
          >
            <div className="text-lg">🙋</div>
            <div className="text-[9px] font-bold text-gray-600">顧客</div>
          </div>
        </div>
        {!sys && <p className="mt-2 text-center text-[11px] text-gray-400">↑ ボタンをタップすると範囲が光ります</p>}
      </div>

      {/* 説明 */}
      {active && (
        <div className={`mt-3 rounded-xl px-4 py-3 ring-1 ${active.tone}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              {active.emo} {active.abbr}（{active.jp}）
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${HI[active.key].badge}`}>
              光った範囲＝{active.target}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] font-mono opacity-70">{active.full}</div>
          <p className="mt-2 text-[13px] leading-relaxed">{active.d}</p>
          <p className="mt-1.5 text-xs font-medium opacity-80">{active.ex}</p>
        </div>
      )}

      {allTried && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
          🎉 3つとも光らせた！ <b>CRM＝顧客との関係</b>、<b>SCM＝モノの流れ全体</b>、
          <b>ERP＝社内をまるごと統合</b>。管理する「範囲」が違うだけです。
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 覚え方：<b>CRM＝顧客（Customer）</b>／<b>SCM＝供給の流れ（Supply Chain）</b>／
        <b>ERP＝社内資源（Enterprise）</b>。頭文字とセットで。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "原材料の仕入れから製造・在庫・配送までの流れをまとめて管理し、品切れやムダな在庫を減らしたい。",
    ans: "SCM",
    opts: ["SCM", "CRM", "ERP"],
    why: "仕入れ〜販売の“流れ全体”を管理＝SCM（供給連鎖管理）。",
  },
  {
    t: "お客様の購入履歴や問い合わせを記録し、一人ひとりに合った提案をして長く付き合いたい。",
    ans: "CRM",
    opts: ["CRM", "SCM", "ERP"],
    why: "顧客との関係を管理＝CRM（顧客関係管理）。",
  },
  {
    t: "会計・人事・在庫・販売の情報がバラバラなので、社内全体を1つに統合して管理したい。",
    ans: "ERP",
    opts: ["ERP", "CRM", "SCM"],
    why: "社内の経営資源を統合管理＝ERP（企業資源計画）。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>このシステムはどれ？</SectionTitle>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
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
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
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

export default function ManagementSystemsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🏢 CRM・SCM・ERPは名前が似ていますが、<b>「どこを管理するか」</b>が違います。
        <b>顧客／供給の流れ／社内資源</b>のどれかで覚えましょう。
      </div>

      <CompanyMap />
      <Quiz />
    </div>
  );
}
