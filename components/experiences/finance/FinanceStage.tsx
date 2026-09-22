import type { CSSProperties, ReactNode } from "react";
import stage from "../scene/stage.module.css";
import styles from "./finance.module.css";

// 「取引がBS/PLのどこに映るか」を1つのステージで見せる。
//   左＝BS（その日時点の写真：ブロックの高さ＝金額。左右の高さはいつもそろう）
//   右＝PL（期間中の流れ：期間バーが伸び、取引の行が積もる）
//   売った商品はBSからPLの費用へ移り、PLの利益はBSの純資産へ流れ込む。借入はPLを動かさない。

type Bs = { cash: number; goods: number; loan: number; capital: number; profit: number };
type PlRow = { label: string; amount: number; kind: "revenue" | "expense" };

export const FIN_EVENTS: {
  date: string;
  title: string;
  apply: (bs: Bs) => Bs;
  pl?: PlRow;
  changed: (keyof Bs)[];
}[] = [
  {
    date: "4/1",
    title: "元手100で開業",
    apply: () => ({ cash: 100, goods: 0, loan: 0, capital: 100, profit: 0 }),
    changed: [],
  },
  {
    date: "4/5",
    title: "現金で商品を仕入れる（40）",
    apply: (b) => ({ ...b, cash: b.cash - 40, goods: b.goods + 40 }),
    changed: ["cash", "goods"],
  },
  {
    date: "4/12",
    title: "商品を70で売る",
    apply: (b) => ({ ...b, cash: b.cash + 70, goods: b.goods - 40, profit: b.profit + 30 }),
    pl: { label: "売上", amount: 70, kind: "revenue" },
    changed: ["cash", "goods", "profit"],
  },
  {
    date: "4/20",
    title: "銀行から借りる（50）",
    apply: (b) => ({ ...b, cash: b.cash + 50, loan: b.loan + 50 }),
    changed: ["cash", "loan"],
  },
  {
    date: "4/25",
    title: "給料を払う（20）",
    apply: (b) => ({ ...b, cash: b.cash - 20, profit: b.profit - 20 }),
    pl: { label: "給料", amount: 20, kind: "expense" },
    changed: ["cash", "profit"],
  },
  {
    date: "4/30",
    title: "期末：2つの表を見比べる",
    apply: (b) => b,
    changed: [],
  },
];

/** phase までの取引を反映した BS と PL */
export function financeAt(phase: number) {
  let bs: Bs = { cash: 0, goods: 0, loan: 0, capital: 0, profit: 0 };
  const pl: PlRow[] = [];
  for (let i = 0; i <= phase; i++) {
    const e = FIN_EVENTS[i];
    bs = e.apply(bs);
    if (e.pl) pl.push(e.pl);
    // 売った商品は PL の費用（売上原価）へ
    if (i === 2) pl.push({ label: "売上原価", amount: 40, kind: "expense" });
  }
  const revenue = pl.filter((r) => r.kind === "revenue").reduce((a, r) => a + r.amount, 0);
  const expense = pl.filter((r) => r.kind === "expense").reduce((a, r) => a + r.amount, 0);
  const assets = bs.cash + bs.goods;
  const equity = bs.capital + bs.profit;
  return { bs, pl, revenue, expense, profit: revenue - expense, assets, equity };
}

const K = 0.62; // 1あたりの高さ(px)
const h = (v: number) => Math.round(v * K);

function Block({
  label,
  value,
  tone,
  changed,
  delta,
  testId,
  children,
}: {
  label: string;
  value: number;
  tone: string;
  changed: boolean;
  delta?: number;
  testId: string;
  children?: ReactNode;
}) {
  const style: CSSProperties = { height: h(value), opacity: value > 0 ? 1 : 0 };
  return (
    <div className={`${styles.block} ${tone}`} style={style} data-changed={changed ? "true" : "false"} data-testid={testId} data-value={value}>
      {children}
      {value >= 22 && (
        <span className="relative">
          {label}
          <br />
          <span className="tabular-nums">{value}</span>
        </span>
      )}
      {changed && delta !== undefined && delta !== 0 && (
        <span
          className={`${styles.delta} absolute right-0.5 top-0.5 rounded bg-white px-1 text-[9px] font-bold tabular-nums ring-1 ${
            delta > 0 ? "text-brand-700 ring-brand-200" : "text-rose-700 ring-rose-200"
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
}

export function FinanceStage({ phase, reducedMotion }: { phase: number; reducedMotion: boolean }) {
  const now = financeAt(phase);
  const prev = phase > 0 ? financeAt(phase - 1) : now;
  const ev = FIN_EVENTS[phase];
  const ch = (k: keyof Bs) => ev.changed.includes(k);
  const d = (k: keyof Bs) => now.bs[k] - prev.bs[k];
  const plUnmoved = phase === 1 || phase === 3;
  const last = phase === FIN_EVENTS.length - 1;
  const periodDays = Number(ev.date.split("/")[1]);

  return (
    <div
      className={`${stage.stage} ${styles.stage} p-2.5`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="fin-stage"
      data-phase={phase}
    >
      {/* いまの取引 */}
      <div key={phase} className={`${styles.row} flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-200`} data-testid="fin-event">
        <span className="flex-none rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">{ev.date}</span>
        <span className="text-xs font-bold text-gray-800">{ev.title}</span>
      </div>

      <div className="relative mt-2 grid grid-cols-2 gap-2">
        {/* BS：その日時点の写真 */}
        <div className="relative rounded-xl bg-white p-2 ring-1 ring-gray-200" data-testid="fin-bs">
          {!reducedMotion && ev.changed.length > 0 && <span key={phase} className={styles.shutter} aria-hidden />}
          <div className="text-[11px] font-bold text-gray-800">📷 BS</div>
          <div className="text-[10px] text-gray-500">
            <b className="tabular-nums text-gray-700">{ev.date}</b> 時点の状態
          </div>
          <div className="mt-1.5 grid h-[122px] grid-cols-2 items-end gap-1">
            <div className="flex flex-col justify-end gap-0.5">
              <Block label="商品" value={now.bs.goods} tone="bg-sky-200 text-sky-900" changed={ch("goods")} delta={d("goods")} testId="fin-goods" />
              <Block label="現金" value={now.bs.cash} tone="bg-sky-400 text-white" changed={ch("cash")} delta={d("cash")} testId="fin-cash" />
            </div>
            <div className="flex flex-col justify-end gap-0.5">
              <Block label="借入金" value={now.bs.loan} tone="bg-amber-300 text-amber-950" changed={ch("loan")} delta={d("loan")} testId="fin-loan" />
              <Block
                label="純資産"
                value={now.equity}
                tone="bg-emerald-500 text-white"
                changed={ch("profit")}
                delta={d("profit")}
                testId="fin-equity"
              >
                <span className={styles.profitPart} style={{ height: h(Math.max(now.bs.profit, 0)) }} aria-hidden />
              </Block>
            </div>
          </div>
          <div className="mt-0.5 grid grid-cols-2 gap-1 border-t border-gray-300 pt-0.5 text-center text-[9px] font-bold text-gray-500">
            <span>資産</span>
            <span>負債＋純資産</span>
          </div>
          <div className="mt-1 rounded bg-gray-50 px-1 py-0.5 text-center text-[10px] font-bold tabular-nums text-gray-700" data-testid="fin-balance">
            {now.assets} ＝ {now.bs.loan} ＋ {now.equity} ⚖️
          </div>
        </div>

        {/* PL：期間中の流れ */}
        <div className="rounded-xl bg-white p-2 ring-1 ring-gray-200" data-testid="fin-pl">
          <div className="text-[11px] font-bold text-gray-800">🎞️ PL</div>
          <div className="text-[10px] text-gray-500">
            4/1〜<b className="tabular-nums text-gray-700">{ev.date}</b> の流れ
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden>
            <div className={`${styles.period} h-full rounded-full bg-brand-400`} style={{ width: `${(periodDays / 30) * 100}%` }} />
          </div>
          <ul className="mt-1.5 min-h-[82px] space-y-0.5" data-testid="fin-pl-rows">
            {now.pl.map((r) => (
              <li
                key={r.label}
                className={`${styles.row} flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight ${
                  r.kind === "revenue" ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"
                }`}
              >
                <span>{r.kind === "revenue" ? "収益" : "費用"}：{r.label}</span>
                <span className="flex-none tabular-nums">{r.kind === "revenue" ? `+${r.amount}` : `−${r.amount}`}</span>
              </li>
            ))}
            {now.pl.length === 0 && <li className="pt-4 text-center text-[10px] text-gray-400">まだ取引なし</li>}
            {plUnmoved && (
              <li key={`still-${phase}`} className={`${styles.delta} rounded bg-gray-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-gray-600`} data-testid="fin-pl-still">
                PLは変化なし
              </li>
            )}
          </ul>
          <div
            className={`mt-1 flex items-center justify-between rounded px-1.5 py-0.5 text-[11px] font-bold ${
              now.profit >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
            }`}
            data-testid="fin-profit"
          >
            <span>＝ 利益</span>
            <span className="tabular-nums">{now.profit}</span>
          </div>
        </div>

        {/* 渡るチップ：売った商品 → PLの費用、利益 → BSの純資産 */}
        {!reducedMotion && phase === 2 && (
          <>
            <span key="goods" className={`${styles.fly} ${styles.toPl} rounded bg-sky-200 px-1.5 py-0.5 text-[10px] font-bold text-sky-900 ring-1 ring-sky-300`}>
              商品40 → 費用へ
            </span>
            <span key="profit" className={`${styles.fly} ${styles.toBs} rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-300`}>
              利益+30 → 純資産へ
            </span>
          </>
        )}
        {!reducedMotion && phase === 4 && (
          <span key="salary" className={`${styles.fly} ${styles.toBs} rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200`}>
            利益−20 → 純資産も減る
          </span>
        )}
      </div>

      {last && (
        <div className={`${styles.row} mt-2 grid grid-cols-2 gap-2 text-center text-[10px] font-bold leading-snug`} data-testid="fin-summary">
          <div className="rounded-lg bg-sky-50 px-1.5 py-1 text-sky-900 ring-1 ring-sky-200">BS＝4/30の「写真」<br />ある時点の状態</div>
          <div className="rounded-lg bg-brand-50 px-1.5 py-1 text-brand-900 ring-1 ring-brand-200">PL＝4/1〜4/30の「動画」<br />期間中のもうけ</div>
        </div>
      )}
    </div>
  );
}
