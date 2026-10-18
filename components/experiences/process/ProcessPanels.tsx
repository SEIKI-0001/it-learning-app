import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 業務プロセスの解説で、過去問の出題に合わせて足したパネル群。操作不要の静的な図。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

const Tag = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => (
  <span className={`mt-0.5 w-[4.5rem] flex-none rounded px-1 text-center text-[11px] font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{ok ? yes : no}</span>
);

// ④ RPA -------------------------------------------------------------------------------
const FIT: { t: string; ok: boolean; why: string }[] = [
  { t: "交通費の区間情報と領収書データから、精算伝票を作る", ok: true, why: "ルールが決まった事務作業" },
  { t: "伝票の内容を、別のシステムに入力し直す", ok: true, why: "①の模型の「手書き転記」がこれ" },
  { t: "工場で産業用ロボットが冷凍食品を作る", ok: false, why: "機械のロボットはFA（工場の自動化）" },
  { t: "大量の購買データから、新しい法則を見つける", ok: false, why: "これはデータマイニング" },
  { t: "M&Aのような経営の重要な判断", ok: false, why: "定型ではない判断はRPAに向かない" },
];
const PHASES = [
  { t: "計画策定", d: "概念検証（PoC）で、使えそうかを見極める" },
  { t: "先行導入", d: "部門・業務を絞って入れ、効果を実際に測る" },
  { t: "本格導入", d: "導入と運用の手順書を作り、全社に広げる" },
];

export function RpaPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>RPA ― 定型の事務作業をソフトのロボットに</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">RPA</b>は、ホワイトカラーの<b className="text-gray-800">定型的な事務作業</b>を、
        <b className="text-gray-800">ソフトウェアのロボット</b>に代わりにやらせて、自動化・効率化すること。
      </p>
      <ul className="mt-3 space-y-1" data-testid="rpa-fit">
        {FIT.map((f) => (
          <li key={f.t} className="flex items-start gap-2 text-[13px] leading-snug" data-ok={f.ok}>
            <Tag ok={f.ok} yes="RPA向き" no="RPAでない" />
            <span>
              <span className="font-bold text-gray-800">{f.t}</span>
              <span className="block text-[12px] text-gray-500">{f.why}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-bold text-gray-800">はじめて入れるときの3段階</p>
      <ol className="mt-1 space-y-0.5" data-testid="rpa-phases">
        {PHASES.map((p, i) => (
          <li key={p.t} className="grid grid-cols-[6rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug">
            <span className="font-bold text-gray-900">
              {i + 1}. {p.t}
            </span>
            <span className="text-gray-700">{p.d}</span>
          </li>
        ))}
      </ol>
      <Takeaway>
        似た言葉に注意：<b>BPO</b>は業務を外部の会社に委託すること、<b>EUC</b>は利用者が自分でシステムを使いこなし管理すること、<b>FA</b>は工場の自動化です。
      </Takeaway>
    </Panel>
  );
}

// ⑤ 業務の流れを描く図 ---------------------------------------------------------------------
const NOTATIONS: { t: string; d: string }[] = [
  { t: "DFD", d: "データの流れと処理を描く" },
  { t: "アクティビティ図", d: "UMLの図。レーンで分けると、だれが行うか（人の役割）も描ける" },
  { t: "BPMN", d: "OMGが維持する業務プロセスの表記法。ISO/IEC 19510" },
  { t: "WFA", d: "業務の流れ図を書くための記述様式" },
];
const NOT_PROCESS = "パレート図・レーダチャート（集計結果のグラフ）、E-R図（データの構造）、CRUD図（データの操作）";

// アクティビティ図のレーンの見本（申請者／上司／経理）
const LANES = [
  { who: "申請者", cells: ["申請する", "", ""] },
  { who: "上司", cells: ["", "承認する", ""] },
  { who: "経理", cells: ["", "", "支払う"] },
];

export function ProcessNotations({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>業務の流れを描く図</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        業務を図にする（モデリング）目的は、流れを<b className="text-gray-800">見える化</b>して
        <b className="text-gray-800">関係者で解釈を共有</b>し、システム設計のもとにすることです。
      </p>
      <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-gray-200" data-testid="activity-lanes" aria-label="アクティビティ図のレーンの例">
        {LANES.map((l, r) => (
          <div key={l.who} className={`grid grid-cols-[3.5rem_1fr_1fr_1fr] ${r > 0 ? "border-t border-dashed border-gray-300" : ""}`}>
            <span className="flex items-center justify-center bg-gray-50 text-[11px] font-bold text-gray-700">{l.who}</span>
            {l.cells.map((c, i) => (
              <span key={i} className="flex min-h-[2.25rem] items-center justify-center px-1 py-1">
                {c && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-900 ring-1 ring-sky-300">{c}</span>}
                {c && i < 2 && <span className="ml-0.5 text-gray-400" aria-hidden>↘</span>}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[11.5px] text-gray-500">アクティビティ図：横に区切ったレーンで「だれの仕事か」が分かる</p>

      <dl className="mt-3 space-y-1" data-testid="process-notations">
        {NOTATIONS.map((n) => (
          <div key={n.t} className="grid grid-cols-[7rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-notation={n.t}>
            <dt className="font-bold text-gray-900">{n.t}</dt>
            <dd className="text-gray-700">{n.d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">業務の流れを描く図ではないもの：{NOT_PROCESS}</p>
      <Takeaway>
        <b>プロセスマイニング</b>は、実際のシステムの操作ログから今の業務の流れを自動で描き出し、課題を見つけて改善する手法・ツールです。
      </Takeaway>
    </Panel>
  );
}
