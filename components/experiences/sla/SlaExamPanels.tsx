"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// サービスマネジメントとSLAの解説で、過去問の出題に合わせて足した3枚。①〜③（稼働率の計算は#217）はそのまま。
//   ④ SLAとSLM：誰と誰の合意か、SLMの活動、紛らわしい文書（NDA・BCP・SCM）
//   ⑤ サービスの価値と可用性：価格・機能・保証、可用性と並ぶ品質特性、MTBSI
//   ⑥ どれ？ クイズ
// 文言は公式過去問（令和4〜8年度）の言い回しにそろえ、例は過去問と別のサービスにしている。

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function TermList({ items, testId, col }: { items: { t: string; d: ReactNode }[]; testId: string; col: string }) {
  return (
    <dl className="mt-2 space-y-1.5" data-testid={testId}>
      {items.map((x) => (
        <div key={x.t} className="grid items-baseline gap-2 text-[12.5px] leading-snug" style={{ gridTemplateColumns: `${col} 1fr` }} data-term={x.t}>
          <dt className="font-bold text-gray-900">{x.t}</dt>
          <dd className="text-gray-700">{x.d}</dd>
        </div>
      ))}
    </dl>
  );
}

// ④ SLAとSLM -----------------------------------------------------------------------------
const SLM_STEPS = ["計画立案", "交渉", "草案作成", "合意", "導入", "測定・改善"];

const OTHER_DOCS = [
  { t: "NDA", d: "秘密保持契約。知った秘密を外に漏らさない約束" },
  { t: "BCP", d: "事業継続計画。災害などでも重要な業務を続ける計画" },
  { t: "SCM", d: "サプライチェーン管理。調達から販売までのモノの流れを最適化" },
];

export function SlmPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>SLAとSLM</SectionTitle>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-center" data-testid="sla-parties">
        <div className="rounded-xl bg-gray-50 px-2 py-2 ring-1 ring-gray-200">
          <p className="text-[13px] font-bold text-gray-900">顧客</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-gray-600">期待する目標値を数値で示す</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">SLA</span>
        <div className="rounded-xl bg-brand-50 px-2 py-2 ring-1 ring-brand-200">
          <p className="text-[13px] font-bold text-brand-900">サービスの供給者</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-gray-600">測定・評価して品質を改善</p>
        </div>
      </div>
      <Lead>
        <b>SLA</b>（サービスレベル合意書・サービスレベル契約）は、<b>顧客とサービスの供給者</b>の間で、サービスの品質の目標値を合意した文書。
        サービスの中身や時間帯を変えるときも、合意し直すのはSLAです。
      </Lead>

      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200" data-testid="slm">
        <p className="text-[13.5px] font-bold text-gray-900">SLM（サービスレベル管理）</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          SLAの<b className="text-gray-900">遵守状況を確認</b>し、ITサービスの品質を維持・改善する<b className="text-gray-900">活動</b>。
        </p>
        <ol className="mt-2 flex flex-wrap items-center gap-1 text-[11.5px] font-bold text-amber-900">
          {SLM_STEPS.map((x, i) => (
            <li key={x} className="flex items-center gap-1">
              {i > 0 && <span className="text-amber-400" aria-hidden>→</span>}
              <span className="rounded-md bg-white px-1.5 py-0.5 ring-1 ring-amber-200">{x}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-gray-600">SLA＝合意した<b className="text-gray-800">文書</b>、SLM＝それを回す<b className="text-gray-800">管理活動</b>。</p>

      <p className="mt-3 text-[13px] font-bold text-gray-800">選択肢に並ぶ別の文書・活動</p>
      <TermList testId="other-docs" col="3rem" items={OTHER_DOCS} />
    </Panel>
  );
}

// ⑤ サービスの価値と可用性 -----------------------------------------------------------------
const VALUE = [
  { t: "価格", ex: "月額300円で使える" },
  { t: "機能", ex: "写真を自動で整理できる" },
  { t: "保証", ex: "24時間365日使える" },
];

const QUALITY = [
  { t: "可用性", d: "合意したサービス提供時間帯のうち、実際に利用できた時間の割合" },
  { t: "機能性", d: "必要な機能がそろっているか" },
  { t: "効率性", d: "少ない資源や時間で処理できるか" },
  { t: "使用性", d: "利用者にとって分かりやすく使いやすいか" },
];

export function ServiceValuePanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>サービスの保証と可用性</SectionTitle>
      <Lead>
        ITサービスの価値は、<b>価格・機能・保証</b>の3つのバランスで決まります。例：写真の保存サービス
      </Lead>
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center" data-testid="service-value">
        {VALUE.map((v) => (
          <div
            key={v.t}
            data-term={v.t}
            className={`rounded-xl px-1.5 py-2 ring-1 ${v.t === "保証" ? "bg-brand-50 ring-brand-300" : "bg-gray-50 ring-gray-200"}`}
          >
            <p className={`text-[13px] font-bold ${v.t === "保証" ? "text-brand-900" : "text-gray-900"}`}>{v.t}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-gray-700">{v.ex}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-gray-600">
        <b className="text-gray-800">保証</b>は、可用性などを維持して<b className="text-gray-800">いつでも期待どおりに使える</b>こと。何ができるか（機能）や料金（価格）とは別です。
      </p>

      <p className="mt-3 text-[13px] font-bold text-gray-800">「割合」で問われるのは可用性</p>
      <TermList testId="quality-terms" col="3.5rem" items={QUALITY} />

      <div className="mt-3 rounded-xl px-3 py-2.5 ring-1 ring-gray-200" data-testid="mtbsi">
        <p className="text-[13.5px] font-bold text-gray-900">MTBSI（サービスインシデント間の平均時間）</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          サービスが利用できなくなるインシデントの<b className="text-gray-900">発生間隔の平均</b>。長いほど<b className="text-gray-900">中断が起きにくい</b>。
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11.5px] leading-snug">
          <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-900 ring-1 ring-emerald-200">
            <b>改善になる</b>：サーバを二重化し、止まる障害そのものを減らす
          </p>
          <p className="rounded-lg bg-gray-50 px-2 py-1.5 text-gray-700 ring-1 ring-gray-200">
            <b>ならない</b>：止まった後の原因究明や復旧を速くする、問合せの待ち時間を減らす
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ⑥ どれ？ ------------------------------------------------------------------------------
const QUIZ = [
  {
    t: "動画配信サービスの記述。「サービスの保証」に当たるのは？",
    ans: "障害時も1時間で再開",
    opts: ["月額500円", "4Kで視聴できる", "障害時も1時間で再開"],
    why: "いつでも期待どおりに使えること＝保証。料金は価格、4Kは機能。",
  },
  {
    t: "SLAの遵守状況を確認し、サービスの品質を維持・改善する活動は？",
    ans: "SLM",
    opts: ["SLA", "SLM", "SCM"],
    why: "合意書がSLA、それを回す管理活動がSLM。",
  },
  {
    t: "受託先と、夜間の問合せをチャットボットで受け付けることに合意した。使う文書は？",
    ans: "SLA",
    opts: ["NDA", "BCP", "SLA"],
    why: "サービスの内容・時間帯の合意＝SLA。",
  },
  {
    t: "MTBSIの改善になる取組は？",
    ans: "回線を二重化",
    opts: ["回線を二重化", "原因究明を速く", "窓口の人を増やす"],
    why: "中断そのものを起きにくくする＝MTBSIが伸びる。",
  },
];

export function SlaQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どれ？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="sla-exam-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
              <div className="text-[13px] font-bold leading-snug text-gray-800">{q.t}</div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition [word-break:auto-phrase] active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-1.5 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は「${q.ans}」。 `}
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
