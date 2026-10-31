import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 株式会社のしくみと組織形態の解説で、過去問の出題に合わせて足した2枚（静的な図。動きは付けない）。
//   ⑥ コーポレートガバナンス：意味、強化になる施策／ならない施策、似た言葉
//   ⑦ 事業部制の具体とカンパニー制、人材・学習を支えるIT
// 文言は公式過去問（令和4〜8年度）の言い回しにそろえ、例は過去問と別の会社にしている。

function Sub({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[13px] font-bold text-gray-800">{children}</p>;
}

function Rows({ items, testId, col }: { items: { t: string; d: ReactNode }[]; testId: string; col: string }) {
  return (
    <dl className="mt-1.5 space-y-1.5" data-testid={testId}>
      {items.map((x) => (
        <div key={x.t} data-term={x.t} className="grid items-baseline gap-2 text-[12.5px] leading-snug" style={{ gridTemplateColumns: `${col} 1fr` }}>
          <dt className="font-bold text-gray-900">{x.t}</dt>
          <dd className="text-gray-700">{x.d}</dd>
        </div>
      ))}
    </dl>
  );
}

// ⑥ コーポレートガバナンス ------------------------------------------------------------------
const STRONG = ["独立性の高い社外取締役を選任する・増やす", "執行役員制度で、経営（取締役）と業務の執行（執行役員）を分ける"];
const NOT_STRONG = ["株式公開買付け（TOB）で他社を買収する", "利益の出にくい事業から撤退する", "働きやすくするために労務制度を拡充する"];

const LOOKALIKE = [
  { t: "CI", d: "コーポレートアイデンティティ。理念や特性を統一したイメージ・デザインで発信する" },
  { t: "コア​コンピタンス", d: "競合他社には提供できない価値をもたらす、自社独自のスキルや技術" },
  { t: "資金調達", d: "事業に必要な資本を集めること" },
];

export function GovernancePanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>コーポレートガバナンス ― 経営者を見張るしくみ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">株主を始めとした利害関係者</b>が<b className="text-gray-800">経営者を監視・監督</b>し、企業活動を律する枠組み（企業統治）。①の「報告・監督」の線を強くすることです。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5" data-testid="governance-measures">
        <div className="rounded-xl bg-emerald-50 px-2.5 py-2 ring-1 ring-emerald-200" data-kind="strong">
          <p className="text-[12.5px] font-bold text-emerald-800">強化になる</p>
          <ul className="mt-1 space-y-1 text-[12px] leading-snug text-gray-800">
            {STRONG.map((x) => (
              <li key={x}>・{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-gray-50 px-2.5 py-2 ring-1 ring-gray-200" data-kind="not">
          <p className="text-[12.5px] font-bold text-gray-600">ガバナンスとは別の話</p>
          <ul className="mt-1 space-y-1 text-[12px] leading-snug text-gray-700">
            {NOT_STRONG.map((x) => (
              <li key={x}>・{x}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-gray-600">
        見分け方：<b className="text-gray-800">経営者を外から・別の立場からチェックできるようになるか</b>。買収・撤退・人事制度は経営判断そのもので、チェックの強さは変わりません。
      </p>

      <Sub>選択肢に並ぶ「コーポレート○○」以外の言葉</Sub>
      <Rows testId="governance-lookalike" col="6.5rem" items={LOOKALIKE} />
    </Panel>
  );
}

// ⑦ 事業部制とカンパニー制、人材・学習のIT ------------------------------------------------------
const FUNCS = ["開発", "製造", "販売", "購買"];

const PEOPLE_IT = [
  { t: "アダプティブラーニング", d: "学習履歴を蓄積・解析し、一人一人の進み具合や理解度に合わせて最適な教材を出す" },
  { t: "タレントマネジメント", d: "社員のスキルや経歴を一元管理し、配置や育成に生かす" },
  { t: "ナレッジマネジメント", d: "社員の知識やノウハウを共有し、組織全体で活用する" },
];

export function DivisionCompanyPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>事業部制とカンパニー制</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">事業部制</b>は、事業ごとの部門の中に、開発・製造・販売・購買などの機能が<b className="text-gray-800">ひとそろい</b>ある形。例：家具と照明を作る会社
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5" data-testid="division-example">
        {["家具事業部", "照明事業部"].map((d) => (
          <div key={d} className="rounded-xl bg-brand-50 p-1.5 ring-1 ring-brand-200">
            <p className="text-center text-[12.5px] font-bold text-brand-900">{d}</p>
            <div className="mt-1 grid grid-cols-4 gap-0.5">
              {FUNCS.map((f) => (
                <span key={f} className="rounded bg-white py-0.5 text-center text-[11px] font-bold text-gray-700 ring-1 ring-brand-100">
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-gray-600">
        照明の材料は照明事業部の購買担当が買う。会社全体の購買部が両方を買うなら、それは職能別組織です。
      </p>

      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200" data-testid="company-system">
        <p className="text-[13.5px] font-bold text-gray-900">カンパニー制組織</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          一つの企業の中に、事業領域ごとに<b className="text-gray-900">独立した会社のような組織</b>を置く。目的は<b className="text-gray-900">意思決定の迅速化</b>と<b className="text-gray-900">独立採算</b>。事業部制を一歩進め、お金や人の権限まで任せる形です。
        </p>
      </div>

      <Sub>人材と学習を支えるIT</Sub>
      <Rows testId="people-it" col="9rem" items={PEOPLE_IT} />
      <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">ディープラーニングはAIの学習手法の一つで、人の学習を支えるしくみではありません。</p>
    </Panel>
  );
}
