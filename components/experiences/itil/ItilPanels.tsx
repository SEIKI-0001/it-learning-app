"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// ITILの解説で、過去問の出題に合わせて足したパネル群。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえ、計算の例題は過去問と別の数字にしている。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

// ③ サービスデスクとKPI ------------------------------------------------------------
const DESK_FLOW = [
  { t: "受付・記録", d: "問合せの内容・回答・かかった時間を記録する" },
  { t: "一次対応", d: "その場で回答。根本解決の前に、一時的な回避策を案内してもよい" },
  { t: "エスカレーション", d: "解決できなければ二次担当（専門チーム）へ引き継ぐ" },
  { t: "分析・改善", d: "記録を分析して、FAQや手順の改善につなげる" },
];
const KPI_UP = ["SLAの目標時間内に対応を終えた割合", "1回の問合せで解決できた割合（一次解決率）"];
const KPI_DOWN = ["二次担当へエスカレーションした割合", "担当者につながるまでの待ち時間"];

export function ServiceDesk({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>サービスデスク＝利用者の窓口</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        システムが<b className="text-gray-800">稼働したあと</b>、利用者からの問合せを受け付ける窓口です。
        窓口は種別ごとに細かく分けず、<b className="text-gray-800">一本化</b>するのが基本。回答は受付順ではなく重要度で優先します。
      </p>
      <ol className="mt-3 space-y-1" data-testid="desk-flow">
        {DESK_FLOW.map((f, i) => (
          <li key={f.t} className="grid grid-cols-[7.5rem_1fr] items-baseline gap-2 text-[13px] leading-snug">
            <span className="font-bold text-gray-900">
              {i + 1}. {f.t}
            </span>
            <span className="text-gray-700">{f.d}</span>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm font-bold text-gray-800">評価の指標（KPI）は向きに注意</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2" data-testid="desk-kpi">
        <div className="rounded-lg bg-emerald-50 px-2.5 py-2 ring-1 ring-emerald-200" data-dir="up">
          <p className="text-[13px] font-bold text-emerald-900">大きいほど良い</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] leading-snug text-gray-700">
            {KPI_UP.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-sky-50 px-2.5 py-2 ring-1 ring-sky-200" data-dir="down">
          <p className="text-[13px] font-bold text-sky-900">小さいほど良い</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] leading-snug text-gray-700">
            {KPI_DOWN.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

// ④ 自動化の効果 --------------------------------------------------------------------
const TOOLS = [
  { t: "FAQ", d: "過去のインシデントと回答をデータベース化して公開", ok: ["一次回答率が上がる"], ng: [] as string[] },
  { t: "チャットボット", d: "質問にソフトウェアがリアルタイムで自動応答する", ok: ["人がいない時間も受け付けられる（受付時間の拡大）"], ng: ["オペレーターのスキルは上がらない"] },
  {
    t: "オペレーター支援AI",
    d: "会話を認識し、回答の候補をオペレーターの画面に出す",
    ok: ["経験が浅くても対応でき、ばらつきが減る", "情報を探す手間が減り、対応時間が短くなる"],
    ng: ["答えるのは人なので、24時間対応にはならない"],
  },
];

export function DeskAutomation({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>窓口の自動化で、何が良くなる？</SectionTitle>
      <div className="mt-3 space-y-2" data-testid="desk-tools">
        {TOOLS.map((tool) => (
          <div key={tool.t} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-tool={tool.t}>
            <p className="text-[15px] font-bold text-gray-900">{tool.t}</p>
            <p className="text-[12px] leading-snug text-gray-500">{tool.d}</p>
            <ul className="mt-1 space-y-0.5 text-[12.5px] leading-snug">
              {tool.ok.map((o) => (
                <li key={o} className="flex gap-1.5">
                  <span className="flex-none rounded bg-emerald-100 px-1 text-[11px] font-bold text-emerald-800">効果</span>
                  <span className="text-gray-800">{o}</span>
                </li>
              ))}
              {tool.ng.map((o) => (
                <li key={o} className="flex gap-1.5">
                  <span className="flex-none rounded bg-gray-100 px-1 text-[11px] font-bold text-gray-600">違う</span>
                  <span className="text-gray-600">{o}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Takeaway>
        利用者の問合せに自動で答えるのは、サービスを早く使える状態に戻す<b>インシデント管理</b>の仕事を助けるもの。
        「定型的な操作を代わりに行う」はRPA、「機器どうしがつながる」はIoTで、チャットボットとは別物です。
      </Takeaway>
    </Panel>
  );
}

// ⑤ 削減率の計算 -----------------------------------------------------------------------
const ROWS = [
  { label: "導入前", calc: "1,000件 × 3分", min: 3000 },
  { label: "自動で割り当てできた 80%（800件）", calc: "800件 × 0分", min: 0 },
  { label: "└ そのうち割当てミス 10%（80件）", calc: "80件 × 5分（手直し）", min: 400 },
  { label: "自動でできなかった 20%（200件）", calc: "200件 × 3分（人手）", min: 600 },
];

export function ReductionRate({ step }: { step: number }) {
  const after = ROWS.slice(1).reduce((s, r) => s + r.min, 0);
  const before = ROWS[0].min;
  const rate = Math.round(((before - after) / before) * 100);
  return (
    <Panel>
      <SectionTitle step={step}>削減率の計算（例題）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        問合せを担当者に割り当てる作業に、自動割当てツールを入れた。割当ての時間は何%減った？
      </p>
      <table className="mt-3 w-full border-collapse text-[12.5px]" data-testid="reduction-table">
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={r.label} className={`border-b border-gray-100 align-top ${i === 0 ? "bg-gray-50" : ""}`}>
              <td className="px-1.5 py-1.5 text-gray-800">{r.label}</td>
              <td className="px-1.5 py-1.5 text-gray-500">{r.calc}</td>
              <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-bold tabular-nums text-gray-900">{r.min.toLocaleString()}分</td>
            </tr>
          ))}
          <tr className="align-top">
            <td className="px-1.5 py-1.5 font-bold text-gray-900">導入後の合計</td>
            <td className="px-1.5 py-1.5 text-gray-500">0 + 400 + 600</td>
            <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-bold tabular-nums text-gray-900">{after.toLocaleString()}分</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-center text-[14px] font-bold text-brand-800 ring-1 ring-brand-200" data-testid="reduction-result">
        削減率 ＝（{before.toLocaleString()} − {after.toLocaleString()}）÷ {before.toLocaleString()} ＝ 約{rate}%
      </p>
      <Takeaway>
        自動でできた分は<b>0分</b>、ミスの手直しは<b>上乗せ</b>して合計します。
        割合だけで出る問題も同じ考え方で、たとえば全体の時間の70%を占める業務が半分になれば、0.35 + 0.30 ＝ 0.65 で<b>35%短縮</b>です。
      </Takeaway>
    </Panel>
  );
}

// ⑥ 管理プロセスの一覧 --------------------------------------------------------------
const PROCESSES = [
  { t: "インシデント管理", d: "中断したサービスを可能な限り迅速に回復する" },
  { t: "問題管理", d: "インシデントの根本原因を突き止め、解決策を出して再発を防ぐ" },
  { t: "変更管理", d: "変更を一元管理し、変更によるリスクを下げる" },
  { t: "リリース及び展開管理", d: "承認された変更を本番環境に実装する" },
  { t: "構成管理", d: "機器・ソフト・文書などの構成情報（IT資産）を最新・正確に保つ" },
  { t: "サービス可用性管理", d: "サービスが使える時間（稼働時間）を守る" },
  { t: "容量・能力管理", d: "ディスク使用量などがしきい値に達する前に手を打つ" },
  { t: "情報セキュリティ管理", d: "不正アクセスの検知・通知などで情報を守る" },
];

export function ItilProcesses({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>管理プロセスの見分け方</SectionTitle>
      <dl className="mt-3 space-y-1" data-testid="itil-processes">
        {PROCESSES.map((p) => (
          <div key={p.t} className="grid grid-cols-[8.5rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-process={p.t}>
            <dt className="font-bold text-gray-900">{p.t}</dt>
            <dd className="text-gray-700">{p.d}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-950 ring-1 ring-amber-200" data-testid="itil-three-ways">
        <p className="font-bold">共有ディスクが満杯になって業務が止まったら</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>使わないファイルを一時的に移して業務を戻す → <b>インシデント管理</b></li>
          <li>満杯になった原因を特定し、再発防止策を考える → <b>問題管理</b></li>
          <li>使用量をすぐ把握し、兆候を早めに検知できる仕組みにする → <b>サービスマネジメントシステムの改善</b></li>
        </ul>
      </div>
    </Panel>
  );
}

// ⑦ どの管理？（過去問の論点） ------------------------------------------------------
const ITEMS: { t: string; ans: string; opts: string[]; why: string }[] = [
  { t: "止まったサービスを、原因調査より先にまず使えるよう戻す", ans: "インシデント管理", opts: ["インシデント管理", "問題管理", "変更管理"], why: "迅速な回復＝インシデント管理。" },
  { t: "障害の根本原因を調べ、解決策を提示する", ans: "問題管理", opts: ["インシデント管理", "問題管理", "構成管理"], why: "根本原因＝問題管理。" },
  { t: "サーバやソフト、ドキュメントの構成情報を最新に保つ", ans: "構成管理", opts: ["変更管理", "構成管理", "リリース及び展開管理"], why: "IT資産の把握＝構成管理。" },
  { t: "承認されたサービスの変更を本番環境に実装する", ans: "リリース及び展開管理", opts: ["変更管理", "構成管理", "リリース及び展開管理"], why: "変更の実装＝リリース及び展開管理。" },
  { t: "ディスク使用量がしきい値に達したら担当者に通知する", ans: "容量・能力管理", opts: ["サービス可用性管理", "容量・能力管理", "情報セキュリティ管理"], why: "使用量・容量＝容量・能力管理。" },
  { t: "利用者の問合せにチャットボットで自動応答する", ans: "インシデント管理", opts: ["インシデント管理", "問題管理", "構成管理"], why: "利用者の困りごとを早く解消＝インシデント管理。" },
];

export function ItilQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>これはどの管理？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="itil-quiz">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={it.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {it.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${tone}`}
                    >
                      {opt.replace(/管理$/, "")}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は ${it.ans}。 `}
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
