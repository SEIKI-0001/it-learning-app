"use client";

import type { ReactNode } from "react";

// 財務諸表の解説で最初から最後まで使う「1軒のカフェ」の決算。
//   単位は万円。PL の当期純利益70 が BS の純資産（期首330 → 期末400）に積もる。

export const CAFE = {
  name: "駅前のカフェ",
  bs: {
    ca: 300, // 流動資産：現金・預金220＋商品（コーヒー豆など）80
    fa: 700, // 固定資産：店の内装・設備
    cl: 150, // 流動負債：買掛金90＋短期借入金60
    fl: 450, // 固定負債：長期借入金（5年ローン）
    eq: 400, // 純資産：資本金330＋今期の利益70
  },
  openingEquity: 330,
  pl: {
    sales: 1000,
    cogs: 400,
    sga: 450,
    nonOpIncome: 10,
    nonOpExpense: 20,
    extraLoss: 40,
    tax: 30,
  },
} as const;

export const TOTAL_ASSETS = CAFE.bs.ca + CAFE.bs.fa; // 1,000

export type BsKey = keyof typeof CAFE.bs;

export const BS_META: Record<BsKey, { name: string; items: string }> = {
  ca: { name: "流動資産", items: "現金220・コーヒー豆など80" },
  fa: { name: "固定資産", items: "店の内装・エスプレッソマシン" },
  cl: { name: "流動負債", items: "仕入れのツケ90・短期借入60" },
  fl: { name: "固定負債", items: "銀行の5年ローン" },
  eq: { name: "純資産", items: "開業資金330＋今期の利益70" },
};

// ---------------------------------------------------------------------------
// PL の段階（上から順に引く・足す）
// ---------------------------------------------------------------------------

export type PlKey = "sales" | "gross" | "op" | "ordinary" | "pretax" | "net";

export type PlRow = {
  key: PlKey;
  /** その段階の前に引く／足すもの */
  minus?: { label: string; amount: string; plain: string };
  name: string;
  value: number;
  meaning: string;
};

const p = CAFE.pl;
const gross = p.sales - p.cogs;
const op = gross - p.sga;
const ordinary = op + p.nonOpIncome - p.nonOpExpense;
const pretax = ordinary - p.extraLoss;
const net = pretax - p.tax;

export const PL_ROWS: PlRow[] = [
  { key: "sales", name: "売上高", value: p.sales, meaning: "コーヒーやケーキを売った合計" },
  {
    key: "gross",
    minus: { label: "売上原価", amount: `−${p.cogs}`, plain: "売れた分の豆・牛乳・ケーキの仕入れ" },
    name: "売上総利益",
    value: gross,
    meaning: "商品そのもので稼いだ（粗利）",
  },
  {
    key: "op",
    minus: { label: "販売費及び一般管理費", amount: `−${p.sga}`, plain: "店員の給料・家賃・広告" },
    name: "営業利益",
    value: op,
    meaning: "本業で稼いだ",
  },
  {
    key: "ordinary",
    minus: { label: "営業外収益・費用", amount: `＋${p.nonOpIncome} −${p.nonOpExpense}`, plain: "預金の利息・ローンの利息" },
    name: "経常利益",
    value: ordinary,
    meaning: "本業＋本業以外の、ふだんの利益",
  },
  {
    key: "pretax",
    minus: { label: "特別損失", amount: `−${p.extraLoss}`, plain: "台風で看板が壊れた（その年だけ）" },
    name: "税引前当期純利益",
    value: pretax,
    meaning: "臨時の損益までふくめた、税金の前",
  },
  {
    key: "net",
    minus: { label: "法人税等", amount: `−${p.tax}`, plain: "税金" },
    name: "当期純利益",
    value: net,
    meaning: "最後に会社に残る",
  },
];

export const PL = { gross, op, ordinary, pretax, net };

// ---------------------------------------------------------------------------
// 指標（すべてカフェの数字で計算）
// ---------------------------------------------------------------------------

export const INDICATORS: {
  key: "current" | "equity" | "opMargin" | "roe";
  name: string;
  ask: string;
  top: { label: string; value: number; src: "BS" | "PL" };
  bottom: { label: string; value: number; src: "BS" | "PL" };
  result: string;
  read: string;
}[] = [
  {
    key: "current",
    name: "流動比率",
    ask: "1年以内の支払い、手元で足りる？",
    top: { label: "流動資産", value: CAFE.bs.ca, src: "BS" },
    bottom: { label: "流動負債", value: CAFE.bs.cl, src: "BS" },
    result: "200%",
    read: "1円の支払いに2円の備え。100%を下回ると危ない",
  },
  {
    key: "equity",
    name: "自己資本比率",
    ask: "借金に頼りすぎていない？",
    top: { label: "純資産", value: CAFE.bs.eq, src: "BS" },
    bottom: { label: "総資産", value: TOTAL_ASSETS, src: "BS" },
    result: "40%",
    read: "資産の4割は返さなくてよいお金で買った",
  },
  {
    key: "opMargin",
    name: "売上高営業利益率",
    ask: "本業は、売上のうち何割もうかる？",
    top: { label: "営業利益", value: op, src: "PL" },
    bottom: { label: "売上高", value: p.sales, src: "PL" },
    result: "15%",
    read: "1,000円売ると本業で150円残る",
  },
  {
    key: "roe",
    name: "自己資本利益率（ROE）",
    ask: "自分のお金で、どれだけ稼いだ？",
    top: { label: "当期純利益", value: net, src: "PL" },
    bottom: { label: "純資産", value: CAFE.bs.eq, src: "BS" },
    result: "17.5%",
    read: "株主のお金400で、1年に70稼いだ",
  },
];

// ---------------------------------------------------------------------------
// 描画部品
// ---------------------------------------------------------------------------

export function SrcTag({ s }: { s: "BS" | "PL" }) {
  return (
    <span
      className={`ml-1 inline-block rounded px-1 py-px align-middle text-[10px] font-bold leading-none ${
        s === "BS" ? "bg-gray-900 text-white" : "bg-brand-600 text-white"
      }`}
    >
      {s}
    </span>
  );
}

// 色は「部」ごとに分ける（資産＝青／負債＝赤／純資産＝緑）。流動と固定は同じ色の濃淡で分ける。
const BS_TONE: Record<BsKey, string> = {
  ca: "bg-sky-100 text-sky-950 ring-sky-300",
  fa: "bg-sky-200 text-sky-950 ring-sky-400",
  cl: "bg-rose-100 text-rose-950 ring-rose-300",
  fl: "bg-rose-200 text-rose-950 ring-rose-400",
  eq: "bg-lime-100 text-lime-950 ring-lime-400",
};

/** PL の当期純利益の色。BS の「今期の利益」とつなぎの数字にも同じ色を使う */
export const NET_TONE = "bg-yellow-300 text-yellow-950";

/**
 * カフェの BS。ブロックの高さ＝金額。左右の合計は必ず同じ高さになる。
 * highlight を渡すと、それ以外のブロックを薄くする。
 */
export function BsChart({
  height = 220,
  highlight,
  detail = true,
  equitySplit = false,
  testId = "cafe-bs",
}: {
  height?: number;
  highlight?: BsKey[];
  /** ブロック内に中身（現金・内装…）を書くか */
  detail?: boolean;
  /** 純資産を「開業資金330＋今期の利益70」に割って見せる */
  equitySplit?: boolean;
  testId?: string;
}) {
  const px = height / TOTAL_ASSETS;
  const block = (k: BsKey) => {
    const dim = highlight && !highlight.includes(k);
    const on = highlight?.includes(k);
    const hpx = CAFE.bs[k] * px;
    const roomy = hpx >= 44;
    const split = equitySplit && k === "eq";
    return (
      <div
        key={k}
        className={`relative flex flex-col items-center justify-center overflow-hidden px-1 text-center ring-1 ring-inset transition-opacity duration-300 ${BS_TONE[k]} ${
          dim ? "opacity-25" : ""
        } ${on ? "outline outline-2 outline-offset-1 outline-lime-700" : ""}`}
        style={{ height: hpx }}
        data-testid={`${testId}-${k}`}
        data-on={on ? "true" : undefined}
      >
        {k === "eq" && (
          <span className="absolute inset-x-0 top-0 h-4 bg-lime-700 text-center text-[10.5px] font-bold leading-4 text-white">
            純資産の部（返さなくてよい）
          </span>
        )}
        {split && (
          <span
            className={`absolute inset-x-0 top-4 grid place-items-center border-b border-dashed border-yellow-700/50 text-[10px] font-bold ${NET_TONE}`}
            style={{ height: PL.net * px }}
          >
            今期の利益 +{PL.net}
          </span>
        )}
        <span className={`text-[12px] font-bold leading-tight ${split ? "mt-8" : k === "eq" ? "mt-3" : ""}`}>
          {BS_META[k].name} <span className="tabular-nums">{CAFE.bs[k]}</span>
        </span>
        {detail && roomy && <span className="mt-0.5 text-[10.5px] leading-tight opacity-75">{BS_META[k].items}</span>}
      </div>
    );
  };
  // 部の見出し帯（参考：資産の部＝青、負債の部＝赤、純資産の部＝緑）
  const band = (label: string, sub: string, tone: string) => (
    <div className={`px-1 py-1 text-center text-[11.5px] font-bold leading-tight text-white ${tone}`}>
      {label}
      <span className="block text-[10px] font-medium text-white/85">{sub}</span>
    </div>
  );
  return (
    <div data-testid={testId}>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col overflow-hidden rounded-md">
          {band("資産の部", "左：お金の使い道", "bg-sky-700")}
          {(["ca", "fa"] as const).map(block)}
        </div>
        <div className="flex flex-col overflow-hidden rounded-md">
          {band("負債の部", "右：お金の集め方（いつか返す）", "bg-rose-700")}
          {(["cl", "fl"] as const).map(block)}
          {block("eq")}
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1.5 border-t-2 border-gray-800 pt-1 text-center text-[12px] font-bold tabular-nums text-gray-800">
        <span>資産合計 {TOTAL_ASSETS.toLocaleString()}</span>
        <span>負債・純資産合計 {(CAFE.bs.cl + CAFE.bs.fl + CAFE.bs.eq).toLocaleString()}</span>
      </div>
    </div>
  );
}

// PL は色を絞る：途中の利益はすべて同じ青、最後の当期純利益だけ黄（BS の「今期の利益」と同じ色）。
// 引いた分はグレーの点線で、棒のすぐ右に残す。
const PL_MID = { bar: "bg-sky-500", dash: "border-gray-400", chip: "bg-white text-gray-900 ring-1 ring-gray-200" };
const PL_TONE: Record<PlKey, { bar: string; dash: string; chip: string }> = {
  sales: { bar: "bg-gray-400", dash: "border-gray-400", chip: "bg-gray-100 text-gray-900" },
  gross: PL_MID,
  op: PL_MID,
  ordinary: PL_MID,
  pretax: PL_MID,
  net: { bar: "bg-yellow-500", dash: "border-gray-400", chip: NET_TONE },
};

/**
 * カフェの PL。上から順に引いて、段階ごとの利益を出す。
 * 棒の長さ＝売上を1としたときの残り。引いた分は点線の箱で見せる。
 */
export function PlLadder({ testId = "cafe-pl" }: { testId?: string }) {
  return (
    <ol data-testid={testId} className="space-y-1.5">
      {PL_ROWS.map((r, i) => {
        const tone = PL_TONE[r.key];
        const prev = i === 0 ? r.value : PL_ROWS[i - 1].value;
        const cut = Math.max(prev - r.value, 0);
        const last = r.key === "net";
        return (
          <li key={r.key} data-testid={`${testId}-${r.key}`}>
            {r.minus && (
              <div className="flex items-baseline justify-between gap-2 pl-1 text-[11.5px] leading-snug text-gray-500">
                <span>
                  <span className={`mr-1 inline-block h-2.5 w-3.5 rounded-sm border-2 border-dashed align-[-1px] ${tone.dash}`} aria-hidden />
                  {r.minus.label}
                  <span className="text-gray-400">（{r.minus.plain}）</span>
                </span>
                <span className="flex-none tabular-nums">{r.minus.amount}</span>
              </div>
            )}
            <div className={`rounded-md px-2 py-1.5 ${tone.chip} ${last ? "ring-2 ring-yellow-500" : ""}`}>
              <div className="flex items-baseline justify-between gap-2 text-[13px] font-bold">
                <span>{r.name}</span>
                <span className="tabular-nums">{r.value.toLocaleString()}</span>
              </div>
              {r.key !== "sales" && <div className="text-[11.5px] leading-snug opacity-80">＝ {r.meaning}</div>}
              <div className="mt-1 flex h-2.5 rounded-sm bg-gray-100" aria-hidden>
                <div className={`h-full rounded-l-sm ${tone.bar}`} style={{ width: `${(r.value / CAFE.pl.sales) * 100}%` }} />
                {cut > 0 && (
                  <div
                    className={`h-full rounded-r-sm border-2 border-dashed ${tone.dash}`}
                    style={{ width: `${(cut / CAFE.pl.sales) * 100}%` }}
                  />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** 式の1行（分子 ÷ 分母 × 100 ＝ 結果）。出どころのタグつき */
export function RatioLine({ ind }: { ind: (typeof INDICATORS)[number] }) {
  return (
    <div className="text-[13px] leading-relaxed text-gray-800">
      <span className="font-bold">{ind.top.label}</span>
      <SrcTag s={ind.top.src} /> ÷ <span className="font-bold">{ind.bottom.label}</span>
      <SrcTag s={ind.bottom.src} />
      <div className="mt-0.5 tabular-nums">
        {ind.top.value.toLocaleString()} ÷ {ind.bottom.value.toLocaleString()} × 100 ＝{" "}
        <b className="text-base text-brand-700">{ind.result}</b>
      </div>
    </div>
  );
}

export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-bold leading-relaxed text-brand-900 ring-1 ring-brand-200">
      {children}
    </div>
  );
}
