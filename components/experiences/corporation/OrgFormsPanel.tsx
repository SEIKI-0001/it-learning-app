"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import Icon from "@/components/ui/Icon";

// ③「4つの組織形態」。同じ1社（ミナト電機：営業・製造 × 家電・車載）の同じ4人を、
// 2×2 のボタンで4通りに組み替えて見せる。「家電の営業」の佐藤さんの上司が誰になるかで違いを示す。

type Kind = "func" | "biz" | "pj";

const TONE: Record<Kind, string> = {
  func: "bg-brand-600 text-white",
  biz: "bg-accent-500 text-white",
  pj: "bg-emerald-600 text-white",
};

function Boss({ kind, children, hot = false }: { kind: Kind | "top"; children: ReactNode; hot?: boolean }) {
  const t = kind === "top" ? "bg-gray-800 text-white" : TONE[kind];
  return (
    <div className={`rounded-md px-1.5 py-1 text-center text-[13px] font-bold leading-tight ${t} ${hot ? "ring-[3px] ring-rose-400 ring-offset-1" : ""}`}>
      {children}
    </div>
  );
}

/** 1人の社員。me=佐藤さん（家電の営業）を強調する */
function Member({ biz, func, me = false }: { biz: string; func: string; me?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-1 rounded-md px-1 py-1 text-[12px] font-bold leading-tight ${
        me ? "bg-rose-50 text-rose-800 ring-2 ring-rose-400" : "bg-white text-gray-700 ring-1 ring-gray-300"
      }`}
    >
      <Icon name="user" className="h-3.5 w-3.5 flex-none" />
      <span>
        {biz}の{func}
        {me && <span className="block text-[11px] font-bold text-rose-600">佐藤さん</span>}
      </span>
    </div>
  );
}

/** 上の箱から下の n 列へ枝分かれする線（CSSだけで描く） */
function Branch({ cols, children }: { cols: number; children: ReactNode }) {
  const edge = `${100 / (cols * 2)}%`;
  return (
    <div>
      <div className="mx-auto h-3 w-px bg-gray-400" aria-hidden />
      <div className="relative">
        <div aria-hidden className="absolute top-0 h-px bg-gray-400" style={{ left: edge, right: edge }} />
        <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>{children}</div>
      </div>
    </div>
  );
}

function Leg({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mx-auto h-3 w-px bg-gray-400" aria-hidden />
      {children}
    </div>
  );
}

function Top() {
  return (
    <div className="mx-auto w-20">
      <Boss kind="top">社長</Boss>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4つの組織図（全案共通）
// ---------------------------------------------------------------------------

function FunctionalTree() {
  return (
    <div data-testid="org-tree-func">
      <Top />
      <Branch cols={2}>
        {(["営業", "製造"] as const).map((f) => (
          <Leg key={f}>
            <Boss kind="func" hot={f === "営業"}>
              {f}部長
            </Boss>
            <div className="mt-1.5 space-y-1">
              <Member biz="家電" func={f} me={f === "営業"} />
              <Member biz="車載" func={f} />
            </div>
          </Leg>
        ))}
      </Branch>
    </div>
  );
}

function DivisionalTree() {
  return (
    <div data-testid="org-tree-biz">
      <Top />
      <Branch cols={2}>
        {(["家電", "車載"] as const).map((b) => (
          <Leg key={b}>
            <Boss kind="biz" hot={b === "家電"}>
              {b}事業部長
            </Boss>
            <div className="mt-1.5 space-y-1">
              <Member biz={b} func="営業" me={b === "家電"} />
              <Member biz={b} func="製造" />
            </div>
          </Leg>
        ))}
      </Branch>
    </div>
  );
}

function MatrixTree() {
  return (
    <div data-testid="org-tree-matrix">
      <div className="grid grid-cols-[5.2rem_1fr_1fr] gap-x-2 gap-y-2">
        <div />
        <Boss kind="func" hot>
          営業部長
        </Boss>
        <Boss kind="func">製造部長</Boss>
        {(["家電", "車載"] as const).map((b) => (
          <div key={b} className="contents">
            <div className="grid items-center">
              <Boss kind="biz" hot={b === "家電"}>
                {b}
                <br />
                事業部長
              </Boss>
            </div>
            {(["営業", "製造"] as const).map((f) => (
              <div key={f} className="relative grid items-center">
                {/* 縦線＝職能の上司から／横線＝事業の上司から */}
                <span aria-hidden className="absolute -top-2 bottom-0 left-1/2 w-[3px] -translate-x-1/2 bg-brand-300" />
                <span aria-hidden className="absolute -left-2 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-accent-300" />
                <div className="relative">
                  <Member biz={b} func={f} me={b === "家電" && f === "営業"} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] font-bold text-gray-500">
        <span className="text-brand-600">縦の線</span>＝職能の上司、<span className="text-accent-600">横の線</span>＝事業の上司
      </p>
    </div>
  );
}

function ProjectTree() {
  return (
    <div data-testid="org-tree-pj">
      <div className="grid grid-cols-2 gap-2">
        <Boss kind="func">営業部</Boss>
        <Boss kind="func">製造部</Boss>
      </div>
      <div className="grid grid-cols-2 text-center text-[12px] font-bold leading-tight text-emerald-700" aria-hidden>
        <span>↓ 1人出す</span>
        <span>↓ 1人出す</span>
      </div>
      <div className="mt-1 rounded-lg border-2 border-dashed border-emerald-500 bg-emerald-50 p-2">
        <div className="mx-auto w-36">
          <Boss kind="pj" hot>
            プロジェクトリーダー
          </Boss>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Member biz="家電" func="営業" me />
          <Member biz="家電" func="製造" />
        </div>
        <p className="mt-2 text-center text-[12px] font-bold text-emerald-800">新製品の開発（来年3月まで）</p>
      </div>
      <p className="mt-1.5 text-center text-[12px] font-bold text-gray-500">終わったら解散して、元の部署に戻る</p>
    </div>
  );
}

const FORMS = [
  {
    id: "func",
    name: "職能別組織",
    kind: "func" as Kind,
    axis: "仕事の種類（営業・製造…）で分ける",
    boss: "営業部長",
    good: "同じ仕事の人が集まり、専門性が高まる",
    bad: "部門の壁ができ、製品全体の判断が遅れがち",
    tree: <FunctionalTree />,
  },
  {
    id: "biz",
    name: "事業部制組織",
    kind: "biz" as Kind,
    axis: "製品・地域・顧客で分ける",
    boss: "家電事業部長",
    good: "事業ごとに素早く判断でき、利益責任がはっきりする",
    bad: "営業や製造が事業部ごとに重複しがち",
    tree: <DivisionalTree />,
  },
  {
    id: "matrix",
    name: "マトリックス組織",
    kind: "func" as Kind,
    axis: "職能 × 事業 の2軸を組み合わせる",
    boss: "営業部長 と 家電事業部長",
    good: "専門性と事業の視点を両立できる",
    bad: "上司が2人で、指示がぶつかることがある",
    tree: <MatrixTree />,
  },
  {
    id: "pj",
    name: "プロジェクト組織",
    kind: "pj" as Kind,
    axis: "目的のために部門から人を集める",
    boss: "プロジェクトリーダー（期間中）",
    good: "部門をまたいだ人材で目的に集中できる",
    bad: "終わると解散するので、ノウハウが残りにくい",
    tree: <ProjectTree />,
  },
];

function Lineup() {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-[13px] leading-relaxed text-gray-700 ring-1 ring-gray-200">
      家電メーカー「ミナト電機」の4人を、4通りに並べ替えます。注目は<b className="text-rose-700">家電の営業・佐藤さん</b>の<b className="text-gray-900">上司は誰か</b>。
    </div>
  );
}

function BossLine({ form }: { form: (typeof FORMS)[number] }) {
  return (
    <div className="flex items-baseline gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[13px] ring-1 ring-rose-200">
      <span className="flex-none font-bold text-rose-700">佐藤さんの上司</span>
      <span className="font-bold text-gray-900">{form.boss}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// パネル本体
// ---------------------------------------------------------------------------

export default function OrgFormsPanel({ step }: { step: number }) {
  const [id, setId] = useState(FORMS[0].id);
  const f = FORMS.find((x) => x.id === id) ?? FORMS[0];
  return (
    <Panel>
      <SectionTitle step={step}>同じ4人を、4通りに組み替える</SectionTitle>
      <div className="mt-3">
        <Lineup />
      </div>
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1" data-testid="corp-forms-tabs" data-value={id}>
          {FORMS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setId(x.id)}
              aria-pressed={id === x.id}
              className={`rounded-lg px-1 py-2 text-[13px] font-bold leading-tight active:scale-95 ${id === x.id ? "bg-brand-600 text-white" : "text-gray-600"}`}
            >
              {x.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200" data-testid="corp-forms">
        <h4 className="text-base font-bold text-gray-900">{f.name}</h4>
        <p className="text-[13px] font-bold text-brand-700">{f.axis}</p>
        <div className="mx-auto mt-3 min-h-[11rem] max-w-sm">{f.tree}</div>
      </div>
      <div className="mt-3">
        <BossLine form={f} />
      </div>
      <dl className="mt-2 grid grid-cols-[2.5rem_1fr] gap-x-2 gap-y-1 text-[13px] leading-relaxed">
        <dt className="font-bold text-emerald-700">強み</dt>
        <dd className="text-gray-700">{f.good}</dd>
        <dt className="font-bold text-gray-500">弱み</dt>
        <dd className="text-gray-700">{f.bad}</dd>
      </dl>
    </Panel>
  );
}
