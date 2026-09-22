import type { ReactNode } from "react";
import styles from "./sql.module.css";

// SQL文の句が光るのと同時に、1つの表が形を変える。
//   SELECT … 選ばなかった列がしぼんで消える（射影）
//   WHERE  … 条件に合わない行が灰色になり、次に抜けて残りが詰まる（選択）
//   ORDER BY … 行そのものが上下に移動して並び替わる
// 行は top、列は width の遷移で動かす（同じ要素が動くので「変形」として見える）。

export type SqlRow = { id: string; name: string; klass: string; score: number };
export const SQL_ROWS: SqlRow[] = [
  { id: "r1", name: "田中", klass: "1組", score: 80 },
  { id: "r2", name: "鈴木", klass: "2組", score: 65 },
  { id: "r3", name: "佐藤", klass: "1組", score: 92 },
  { id: "r4", name: "高橋", klass: "2組", score: 78 },
  { id: "r5", name: "伊藤", klass: "1組", score: 88 },
];

type ColKey = "name" | "klass" | "score";
const COLS: { key: ColKey; label: string }[] = [
  { key: "name", label: "名前" },
  { key: "klass", label: "クラス" },
  { key: "score", label: "点数" },
];

export type SqlFrame = {
  title: string;
  /** 光らせる句（SQL トークンの添字） */
  clause: number | null;
  /** 残す列 */
  cols: ColKey[];
  /** 選ぶ前の「消える列」印 */
  fadingCols?: ColKey[];
  /** 条件を判定中（合う/合わないの色付け） */
  judge?: boolean;
  /** 合わない行を抜いた */
  filtered?: boolean;
  /** 並べ替え済み */
  sorted?: boolean;
  /** 並べ替えのキー列を強調 */
  sortKey?: boolean;
  text: ReactNode;
};

export type SqlScenario = {
  id: string;
  tab: string;
  tokens: { kw: string; body: string; tone: "select" | "from" | "where" | "order" }[];
  pred?: (r: SqlRow) => boolean;
  frames: SqlFrame[];
};

const ALL: ColKey[] = ["name", "klass", "score"];
const ge80 = (r: SqlRow) => r.score >= 80;

export const SQL_SCENARIOS: SqlScenario[] = [
  {
    id: "select",
    tab: "SELECT",
    tokens: [
      { kw: "SELECT", body: "名前, 点数", tone: "select" },
      { kw: "FROM", body: "成績", tone: "from" },
    ],
    frames: [
      { title: "元の表", clause: 1, cols: ALL, text: <>FROM 成績 ＝ まず<b>成績の表</b>をまるごと用意。</> },
      { title: "列に印", clause: 0, cols: ALL, fadingCols: ["klass"], text: <>SELECT で書いたのは<b>名前と点数</b>だけ。書かれていない<b>クラスの列</b>が消える準備…</> },
      { title: "列が残る", clause: 0, cols: ["name", "score"], text: <>クラスの列がしぼんで消え、<b>必要な列だけ</b>が残った。列を取り出す操作＝<b>射影</b>。</> },
    ],
  },
  {
    id: "where",
    tab: "WHERE",
    tokens: [
      { kw: "SELECT", body: "*", tone: "select" },
      { kw: "FROM", body: "成績", tone: "from" },
      { kw: "WHERE", body: "点数 >= 80", tone: "where" },
    ],
    pred: ge80,
    frames: [
      { title: "元の表", clause: 1, cols: ALL, text: <>成績の表を用意。SELECT * は<b>全部の列</b>という意味。</> },
      { title: "1行ずつ判定", clause: 2, cols: ALL, judge: true, text: <>WHERE 点数 &gt;= 80 で<b>1行ずつ判定</b>。80未満の鈴木(65)・高橋(78)は<b>合わない</b>ので灰色に。</> },
      { title: "行がしぼられる", clause: 2, cols: ALL, judge: true, filtered: true, text: <>合わない行が抜けて、残りが詰まった。条件で<b>行を取り出す</b>操作＝<b>選択</b>（抽出）。</> },
    ],
  },
  {
    id: "order",
    tab: "ORDER BY",
    tokens: [
      { kw: "SELECT", body: "*", tone: "select" },
      { kw: "FROM", body: "成績", tone: "from" },
      { kw: "ORDER BY", body: "点数 DESC", tone: "order" },
    ],
    frames: [
      { title: "元の表", clause: 1, cols: ALL, text: <>成績の表は<b>登録した順</b>に並んでいる。</> },
      { title: "並べる列", clause: 2, cols: ALL, sortKey: true, text: <>ORDER BY 点数 DESC ＝ <b>点数の大きい順</b>（DESC＝降順、ASC＝昇順）に並べる。</> },
      { title: "並び替わる", clause: 2, cols: ALL, sortKey: true, sorted: true, text: <>行が<b>実際に移動して</b>、佐藤(92)が先頭に。中身は変えずに<b>順番だけ</b>が変わる。</> },
    ],
  },
  {
    id: "combo",
    tab: "組み合わせ",
    tokens: [
      { kw: "SELECT", body: "名前", tone: "select" },
      { kw: "FROM", body: "成績", tone: "from" },
      { kw: "WHERE", body: "点数 >= 80", tone: "where" },
    ],
    pred: ge80,
    frames: [
      { title: "元の表", clause: 1, cols: ALL, text: <>「成績の表から、80点以上の人の名前を」。まず<b>成績の表</b>を用意。</> },
      { title: "条件で判定", clause: 2, cols: ALL, judge: true, text: <>WHERE で1行ずつ判定。<b>80点未満</b>の行が灰色に。</> },
      { title: "行をしぼる", clause: 2, cols: ALL, judge: true, filtered: true, text: <>合わない行が抜けて<b>3行</b>に。点数を使って判定するので、<b>行をしぼるのが先</b>。</> },
      { title: "列を選ぶ", clause: 0, cols: ALL, fadingCols: ["klass", "score"], judge: true, filtered: true, text: <>次に SELECT 名前 で、名前以外の列に消える印。</> },
      { title: "結果", clause: 0, cols: ["name"], judge: true, filtered: true, text: <>残ったのは<b>田中・佐藤・伊藤の名前</b>だけ。<b>行をしぼり（選択）→ 列を選ぶ（射影）</b>で、欲しい答えができた。</> },
    ],
  },
];

const ROW_H = 32;
const HEAD_H = 30;
const TONE = {
  select: "text-sky-300",
  from: "text-gray-300",
  where: "text-amber-300",
  order: "text-emerald-300",
} as const;

export function SqlStatement({ scenario, clause }: { scenario: SqlScenario; clause: number | null }) {
  return (
    <div className="rounded-xl bg-gray-900 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-gray-400" data-testid="sql-statement">
      {scenario.tokens.map((t, i) => {
        const on = i === clause;
        return (
          <span key={t.kw} className={`${styles.token} ${on ? styles.tokenOn : ""}`} data-on={on ? "true" : "false"} data-testid={`sql-token-${t.kw}`}>
            <b className={on ? TONE[t.tone] : "text-gray-500"}>{t.kw}</b> <span className={on ? "text-white" : ""}>{t.body}</span>{" "}
          </span>
        );
      })}
    </div>
  );
}

export function SqlTable({ scenario, frame, reducedMotion }: { scenario: SqlScenario; frame: SqlFrame; reducedMotion: boolean }) {
  const pred = scenario.pred ?? (() => true);
  const kept = SQL_ROWS.filter((r) => !frame.filtered || pred(r));
  const order = frame.sorted ? [...kept].sort((a, b) => b.score - a.score) : kept;
  const pos = new Map(order.map((r, i) => [r.id, i]));
  const visibleCols = COLS.filter((c) => frame.cols.includes(c.key));
  const width = (k: ColKey) => (frame.cols.includes(k) ? `${100 / visibleCols.length}%` : "0%");

  return (
    <div
      className={`${styles.table} ${reducedMotion ? styles.reduced : ""} relative overflow-hidden rounded-xl bg-white ring-1 ring-gray-300`}
      style={{ height: HEAD_H + order.length * ROW_H }}
      data-testid="sql-table"
      data-rows={order.length}
      data-cols={visibleCols.map((c) => c.key).join(",")}
    >
      <div className="absolute inset-x-0 top-0 flex bg-gray-100" style={{ height: HEAD_H }}>
        {COLS.map((c) => {
          const fading = frame.fadingCols?.includes(c.key);
          const key = frame.sortKey && c.key === "score";
          return (
            <div
              key={c.key}
              className={`${styles.cell} grid place-items-center text-xs font-bold ${
                fading ? "text-gray-300 line-through" : key ? "bg-emerald-100 text-emerald-800" : "text-gray-700"
              }`}
              style={{ width: width(c.key) }}
            >
              {c.label}
              {key && (frame.sorted ? " ↓" : " ⇅")}
            </div>
          );
        })}
      </div>
      {SQL_ROWS.map((r) => {
        const p = pos.get(r.id);
        const gone = p === undefined;
        const miss = frame.judge && !pred(r);
        return (
          <div
            key={r.id}
            className={`${styles.row} absolute inset-x-0 flex border-t border-gray-200 ${miss ? "bg-gray-50" : "bg-white"}`}
            style={{ top: HEAD_H + (gone ? SQL_ROWS.indexOf(r) : p) * ROW_H, height: ROW_H, opacity: gone ? 0 : 1 }}
            data-testid={`sql-row-${r.name}`}
            data-state={gone ? "gone" : miss ? "miss" : frame.judge ? "hit" : "normal"}
            data-pos={gone ? undefined : p}
          >
            {COLS.map((c) => {
              const fading = frame.fadingCols?.includes(c.key);
              const judged = frame.judge && c.key === "score";
              return (
                <div
                  key={c.key}
                  className={`${styles.cell} flex items-center justify-center text-sm ${
                    fading || miss ? "text-gray-300" : "text-gray-800"
                  } ${judged ? (miss ? "bg-rose-50 text-rose-400" : "bg-emerald-50 font-bold text-emerald-700") : ""} ${
                    frame.sortKey && c.key === "score" ? "font-bold" : ""
                  } ${c.key === "score" ? "tabular-nums" : ""}`}
                  style={{ width: width(c.key) }}
                >
                  {r[c.key]}
                  {judged && <span className="ml-1 text-[10px]">{miss ? "✕" : "✓"}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
