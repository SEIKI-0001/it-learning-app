import { Panel, SectionTitle } from "../ui";

// システム戦略の解説で、過去問の出題に合わせて足した2枚。操作不要の静的な図。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。

// ② EA（エンタープライズアーキテクチャ） -------------------------------------------------------
const LAYERS = [
  { layer: "ビジネス", asis: "紙で注文を回す", tobe: "注文〜出荷を画面で完結" },
  { layer: "データ", asis: "顧客情報が部署ごとに別", tobe: "顧客情報を全社で1つに" },
  { layer: "アプリケーション", asis: "部署ごとに別のソフト", tobe: "共通の受注システム" },
  { layer: "技術", asis: "古い社内サーバ", tobe: "クラウド基盤" },
];

export function EaPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>EA ― 現状と理想を4つの階層で描く</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">EA（エンタープライズアーキテクチャ）</b>は、業務と情報システムを全体として最適にする手法。
        4つの階層ごとに<b className="text-gray-800">現状</b>と<b className="text-gray-800">理想像</b>を描き、その差を埋める改善を
        <b className="text-gray-800">移行計画</b>にします。
      </p>
      <table className="mt-3 w-full table-fixed border-collapse text-[11.5px]" data-testid="ea-layers">
        <colgroup>
          <col className="w-[6.75rem]" />
          <col />
          <col className="w-5" />
          <col />
        </colgroup>
        <thead>
          <tr className="text-left text-gray-600">
            <th className="px-1 py-1 font-bold">階層</th>
            <th className="px-1 py-1 font-bold">現状</th>
            <th aria-hidden />
            <th className="px-1 py-1 font-bold text-brand-800">理想像</th>
          </tr>
        </thead>
        <tbody>
          {LAYERS.map((l) => (
            <tr key={l.layer} className="border-t border-gray-100 align-top" data-layer={l.layer}>
              <td className="px-1 py-1.5 font-bold text-gray-900">{l.layer}</td>
              <td className="px-1 py-1.5 text-gray-600">{l.asis}</td>
              <td className="py-1.5 text-center text-gray-400" aria-hidden>
                →
              </td>
              <td className="px-1 py-1.5 text-gray-800">{l.tobe}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-center text-[13px] font-bold text-brand-800 ring-1 ring-brand-200">
        現状と理想の差 → 改善活動を「移行計画」として定義
      </p>

      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-gray-700 ring-1 ring-gray-200" data-testid="it-plan">
        <p className="font-bold text-gray-900">IT基本計画で明確にすること</p>
        <p className="mt-0.5">
          ITの利活用にかかわる<b>ステークホルダ</b>と、組織の<b>現在と将来のニーズ</b>への対応。
          業務要件の優先順位は要件定義、インシデントの手順は運用で決めることで、IT基本計画の段階ではありません。
        </p>
      </div>
    </Panel>
  );
}

// ③ 似た言葉の見分け方 ---------------------------------------------------------------------
const BYOD: { t: string; ok: boolean }[] = [
  { t: "会社が許可した私物のスマホを業務で使う", ok: true },
  { t: "会社から貸与されたスマホを業務で使う", ok: false },
  { t: "私物のスマホを業務中に私用で使う", ok: false },
];
const TERMS = [
  { t: "EA", d: "業務と情報システムの現状と理想像を描き、移行計画で全体を最適化する" },
  { t: "BI", d: "社内のデータを集計・分析して、経営の判断に使う" },
  { t: "SOA", d: "システムを「サービス」という部品の組合せで作る考え方" },
  { t: "MOT", d: "技術を経営に生かすための管理（技術経営）" },
  { t: "CIO", d: "経営戦略に基づく情報システム戦略の責任者（最高情報責任者）" },
];

export function LookAlikeTerms({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>BYODと、似た言葉の見分け方</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">BYOD</b>（Bring Your Own Device）は、従業員が<b className="text-gray-800">許可を得た私物の端末</b>を業務に使うこと。
      </p>
      <ul className="mt-2 space-y-1" data-testid="byod-cases">
        {BYOD.map((b) => (
          <li key={b.t} className="flex items-start gap-2 text-[13px] leading-snug text-gray-800" data-ok={b.ok}>
            <span
              className={`mt-0.5 w-[4.5rem] flex-none rounded px-1 text-center text-[11px] font-bold ${b.ok ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}
            >
              {b.ok ? "BYOD" : "BYODでない"}
            </span>
            {b.t}
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1" data-testid="sysstrat-terms">
        {TERMS.map((x) => (
          <div key={x.t} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-term={x.t}>
            <dt className="font-bold text-gray-900">{x.t}</dt>
            <dd className="text-gray-700">{x.d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
        「現状・理想像・<b className="text-gray-900">移行計画</b>」が出てきたら<b className="text-gray-900">EA</b>。
        定型作業のロボット化はRPA、業務の流れの抜本的な見直しはBPRです。
      </p>
    </Panel>
  );
}
