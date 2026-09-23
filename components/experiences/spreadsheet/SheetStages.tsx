"use client";

import { useState, type ReactNode } from "react";
import styles from "../calc/calc.module.css";
import { LeveledPractice, Note, Replay, type LeveledQuestion } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";

// 表計算：式・関数を「読む」力。相対/絶対参照（①②）の後ろに足す。
//   ③ 式を左から読む：B4*(1+B$1) を部品に分け、指しているセルを表で光らせる → 下へ複写
//   ④ IF：条件 → TRUE ならこちら / FALSE ならこちら、を分岐図で流す
//   ⑤ 論理積・論理和：条件を3つ並べ、全部○か／どれか○かで結果が変わる
//   ⑥ 範囲関数：合計(B2:B4) で3つのセルが1つの箱に集まる → IF と組み合わせる（内側から計算）
//   ⑦ 確認5問（試験の書き方：合計・論理積・論理和・≧）

export const SHEET_STEPS = ["① 参照を読む", "② 内側から計算", "③ 条件で分ける"];

type Tone = "brand" | "amber" | "emerald" | "rose" | "sky";
const CELL_TONE: Record<Tone, string> = {
  brand: "bg-brand-100 ring-2 ring-brand-500 text-brand-900",
  amber: "bg-amber-100 ring-2 ring-amber-500 text-amber-900",
  emerald: "bg-emerald-100 ring-2 ring-emerald-500 text-emerald-900",
  rose: "bg-rose-100 ring-2 ring-rose-500 text-rose-900",
  sky: "bg-sky-100 ring-2 ring-sky-500 text-sky-900",
};

/** 小さなワークシート。cells は "B4" → 表示内容。mark で光らせる。 */
function Sheet({
  cols,
  rows,
  cells,
  mark = {},
  testId,
}: {
  cols: string[];
  rows: number[];
  cells: Record<string, ReactNode>;
  mark?: Record<string, Tone>;
  testId?: string;
}) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-0.5 text-center text-xs" data-testid={testId}>
      <thead>
        <tr>
          <th className="w-6" />
          {cols.map((c) => (
            <th key={c} className="rounded bg-gray-100 py-0.5 font-mono text-[10px] font-bold text-gray-500">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r}>
            <th className="rounded bg-gray-100 font-mono text-[10px] font-bold text-gray-500">{r}</th>
            {cols.map((c) => {
              const id = `${c}${r}`;
              const tone = mark[id];
              return (
                <td
                  key={id}
                  className={`h-7 truncate rounded px-0.5 font-bold transition-colors duration-300 ${tone ? CELL_TONE[tone] : "bg-white text-gray-700 ring-1 ring-gray-200"}`}
                  data-testid={testId ? `${testId}-${id}` : undefined}
                  data-mark={tone}
                >
                  {cells[id] ?? ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Token({ children, tone, on }: { children: ReactNode; tone: Tone; on: boolean }) {
  const color = {
    brand: "bg-brand-100 text-brand-800 ring-brand-400",
    amber: "bg-amber-100 text-amber-900 ring-amber-400",
    emerald: "bg-emerald-100 text-emerald-800 ring-emerald-400",
    rose: "bg-rose-100 text-rose-800 ring-rose-400",
    sky: "bg-sky-100 text-sky-800 ring-sky-400",
  }[tone];
  return <span className={`rounded px-0.5 transition-colors duration-300 ${on ? `ring-2 ${color}` : ""}`}>{children}</span>;
}

// ---------------------------------------------------------------------------
// ③ 式を左から読む ― B4*(1+B$1)
// ---------------------------------------------------------------------------

const READ_DELAYS = [1100, 1700, 1700, 1700, 1500];
const PRICES: Record<number, number> = { 4: 200, 5: 500, 6: 100 };
const READ_LINES: ReactNode[] = [
  <>式を左から読んでいきます。</>,
  <>
    <b>B4</b>：商品Xの税抜価格 <b>200</b>（$なし＝複写するとずれる）
  </>,
  <>
    <b>B$1</b>：消費税率 <b>10%</b>。<b>1の前に$</b>＝行を固定（下へ複写しても1行目のまま）
  </>,
  <>
    <b>(1＋B$1)</b>：1 ＋ 0.1 ＝ <b>1.1</b>。税込にするための倍率
  </>,
  <>
    <b>B4 × 1.1</b>：200 × 1.1 ＝ <b>220</b>（税込価格）
  </>,
];

export function FormulaReadStage() {
  const { ref, beat: b, done, reducedMotion, replay } = useBeats(6, READ_DELAYS);
  const [copied, setCopied] = useState(false);
  const step = Math.min(b, 4);
  const mark: Record<string, Tone> = {};
  if (!copied) {
    if (step === 1 || step === 4) mark.B4 = "brand";
    if (step === 2 || step === 3) mark.B1 = "amber";
    if (step === 4) mark.C4 = "emerald";
  } else {
    Object.assign(mark, { B1: "amber", B4: "brand", B5: "brand", B6: "brand", C4: "emerald", C5: "emerald", C6: "emerald" });
  }
  const cells: Record<string, ReactNode> = {
    A1: "消費税率",
    B1: "10%",
    A3: "商品",
    B3: "税抜",
    C3: "税込",
    A4: "X",
    A5: "Y",
    A6: "Z",
    B4: 200,
    B5: 500,
    B6: 100,
    C4: step >= 4 ? 220 : "",
    ...(copied ? { C5: 550, C6: 110 } : {}),
  };
  return (
    <Panel>
      <SectionTitle step={3}>式を左から読む</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        税込価格を出すため、C4 に次の式を入れました。<b className="text-gray-800">部品ごとに、どのセルを指しているか</b>を見ていきます。
      </p>

      <div ref={ref} className="mt-3" data-testid="sheet-read" data-beat={b} data-copied={copied ? "true" : "false"}>
        <div className="rounded-lg bg-gray-800 px-3 py-2 font-mono text-sm font-bold text-white">
          <span className="text-gray-400">C4 ＝ </span>
          <Token tone="brand" on={!copied && (step === 1 || step === 4)}>
            B4
          </Token>
          ＊
          <Token tone="amber" on={!copied && step === 3}>
            (1＋
            <Token tone="amber" on={!copied && step === 2}>
              B$1
            </Token>
            )
          </Token>
        </div>
        <p key={copied ? "c" : step} className={`mt-2 min-h-[2.8em] rounded-lg bg-gray-50 px-3 py-1.5 text-xs leading-relaxed text-gray-700 ring-1 ring-gray-200 ${styles.reveal}`} data-testid="sheet-read-line">
          {copied ? (
            <>
              複写すると <b>B4 → B5 → B6</b> とずれ、<b>B$1 は動かない</b>。どの行も「自分の行の価格 × 1.1」になりました。
            </>
          ) : (
            READ_LINES[step]
          )}
        </p>

        <div className="mt-2">
          <Sheet cols={["A", "B", "C"]} rows={[1, 2, 3, 4, 5, 6]} cells={cells} mark={mark} testId="sheet-read-grid" />
        </div>

        {copied && (
          <div className={`mt-2 space-y-0.5 rounded-lg bg-white px-3 py-2 font-mono text-[11px] font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="sheet-read-copies">
            {[4, 5, 6].map((r) => (
              <div key={r} className="flex justify-between">
                <span className="text-gray-500">C{r}</span>
                <span>
                  <span className="text-brand-700">B{r}</span>＊(1＋<span className="text-amber-700">B$1</span>)
                </span>
                <span className="text-emerald-700">＝ {Math.round(PRICES[r] * 1.1)}</span>
              </div>
            ))}
          </div>
        )}

        {done && !copied && (
          <button
            type="button"
            onClick={() => setCopied(true)}
            className={`mt-3 w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white active:scale-95 ${styles.reveal}`}
          >
            ⬇ C5・C6 へ複写する
          </button>
        )}
        {copied && (
          <Note>
            💡 もし <b>B1</b>（$なし）だと、C5 では <b>B2</b>、C6 では <b>B3</b> を見てしまう（空欄と見出し）。逆に <b>B$4</b> にすると全行が商品Xの価格になる。<b>動かしたい方に$を付けない</b>のがコツです。
          </Note>
        )}
        <Replay
          onClick={() => {
            setCopied(false);
            replay();
          }}
          hidden={reducedMotion}
        />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ IF ― 条件で2つに分かれる
// ---------------------------------------------------------------------------

const IF_DELAYS = [1200, 1400, 1500, 1500, 1400];
const TRY_SCORES = [40, 60, 90];

function IfFlow({ score, phase }: { score: number | null; phase: number }) {
  // phase 0: 待ち / 1: 条件に入る / 2: 判定 / 3: 結果へ
  const pass = score !== null && score >= 60;
  const lit = phase >= 2 && score !== null;
  return (
    <div className="relative mt-2 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid="sheet-if-flow" data-result={lit ? (pass ? "true" : "false") : "none"}>
      <div className="flex items-center justify-center gap-2">
        <span className={`rounded-full px-2 py-1 text-sm font-bold tabular-nums ${score === null ? "bg-gray-200 text-gray-400" : "bg-brand-600 text-white"} ${phase === 1 ? styles.pop : ""}`} key={`${score}-${phase >= 1}`}>
          A2 ＝ {score ?? "?"}
        </span>
        <span className="text-gray-400">→</span>
        <span className={`rounded-lg px-2.5 py-1.5 text-sm font-bold ring-2 transition-colors duration-300 ${phase >= 1 ? "bg-amber-100 text-amber-900 ring-amber-400" : "bg-white text-gray-500 ring-gray-300"}`}>
          ① A2 ≧ 60 ？
        </span>
      </div>
      {phase >= 2 && score !== null && (
        <p className={`mt-1.5 text-center text-xs font-bold ${pass ? "text-emerald-700" : "text-rose-600"} ${styles.reveal}`} key={`j-${score}`}>
          {score} ≧ 60 は {pass ? "成り立つ（TRUE）" : "成り立たない（FALSE）"}
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <div className={`rounded-lg px-2 py-2 ring-2 transition-all duration-300 ${lit && pass ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-emerald-700 ring-emerald-200"} ${lit && !pass ? "opacity-40" : ""}`}>
          <div className="text-[10px] font-bold opacity-80">② TRUE なら</div>
          <div className="text-sm font-bold">{"'合格'"}</div>
        </div>
        <div className={`rounded-lg px-2 py-2 ring-2 transition-all duration-300 ${lit && !pass ? "bg-rose-500 text-white ring-rose-500" : "bg-white text-rose-700 ring-rose-200"} ${lit && pass ? "opacity-40" : ""}`}>
          <div className="text-[10px] font-bold opacity-80">③ FALSE なら</div>
          <div className="text-sm font-bold">{"'不合格'"}</div>
        </div>
      </div>
    </div>
  );
}

export function IfStage() {
  const { ref, beat: b, done, reducedMotion, replay } = useBeats(6, IF_DELAYS);
  const [tried, setTried] = useState<number | null>(null);
  // 自動再生：75 で TRUE → 48 で FALSE
  const auto = b <= 2 ? 75 : 48;
  const phase = b === 0 ? 0 : b <= 2 ? b : Math.min(b - 2, 2);
  const score = tried ?? (b === 0 ? null : auto);
  return (
    <Panel>
      <SectionTitle step={4}>IF ― 条件で2つに分かれる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        IF は<b className="text-gray-800">「条件, 成り立つとき, 成り立たないとき」</b>の3つの部品でできています。
      </p>
      <div className="mt-3 rounded-lg bg-gray-800 px-3 py-2 text-center font-mono text-sm font-bold text-white">
        IF(<span className="text-amber-300">A2 ≧ 60</span>, <span className="text-emerald-300">{"'合格'"}</span>, <span className="text-rose-300">{"'不合格'"}</span>)
      </div>

      <div ref={ref} data-testid="sheet-if" data-beat={b}>
        <IfFlow score={score} phase={tried !== null ? 2 : phase} />
        {done && (
          <div className={`mt-3 ${styles.reveal}`}>
            <div className="text-[11px] font-bold text-gray-500">A2 の点数を変えてみる</div>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {TRY_SCORES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTried(v)}
                  aria-pressed={tried === v}
                  className={`rounded-lg py-1.5 text-xs font-bold active:scale-95 ${tried === v ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}
                >
                  {v}点
                </button>
              ))}
            </div>
          </div>
        )}
        {done && (
          <Note>
            💡 読む順番は<b>① 条件を見る → 成り立てば ② 2番目 → 成り立たなければ ③ 3番目</b>。「≧」は<b>等しいときも含む</b>ので、60点ちょうどは合格です。
          </Note>
        )}
        <Replay
          onClick={() => {
            setTried(null);
            replay();
          }}
          hidden={reducedMotion}
        />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 論理積・論理和 ― 条件を組み合わせる
// ---------------------------------------------------------------------------

const STUDENTS = [
  { name: "さくら", x: 70, y: 60 },
  { name: "たいち", x: 100, y: 10 },
  { name: "みお", x: 50, y: 40 },
];

export function LogicStage() {
  const [who, setWho] = useState(0);
  const [op, setOp] = useState<"and" | "or">("or");
  const s = STUDENTS[who];
  const conds = [
    { label: "A2＋B2 ≧ 120", detail: `${s.x}＋${s.y}＝${s.x + s.y}`, ok: s.x + s.y >= 120 },
    { label: "A2 ＝ 100", detail: `A2＝${s.x}`, ok: s.x === 100 },
    { label: "B2 ＝ 100", detail: `B2＝${s.y}`, ok: s.y === 100 },
  ];
  const result = op === "and" ? conds.every((c) => c.ok) : conds.some((c) => c.ok);
  const fn = op === "and" ? "論理積" : "論理和";
  return (
    <Panel>
      <SectionTitle step={5}>論理積・論理和 ― 条件を組み合わせる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        合格の条件が<b className="text-gray-800">「2科目の合計が120点以上、又は、どちらかが100点」</b>のように複数あるときは、条件をまとめる関数を使います。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        {(["and", "or"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOp(o)}
            aria-pressed={op === o}
            className={`rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${op === o ? "bg-brand-600 text-white" : "text-gray-500"}`}
          >
            {o === "and" ? "論理積（全部○）" : "論理和（どれか○）"}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {STUDENTS.map((st, i) => (
          <button
            key={st.name}
            type="button"
            onClick={() => setWho(i)}
            aria-pressed={who === i}
            className={`rounded-lg px-1 py-1.5 text-[11px] font-bold active:scale-95 ${who === i ? "bg-gray-800 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}
          >
            {st.name}
            <span className="block text-[10px] opacity-80">
              X{st.x}・Y{st.y}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-1.5" data-testid="sheet-logic" data-op={op} data-result={result ? "true" : "false"}>
        {conds.map((c) => (
          <div key={`${who}-${c.label}`} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${c.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-300" : "bg-gray-50 text-gray-500 ring-gray-200"} ${styles.reveal}`}>
            <span className="font-mono">{c.label}</span>
            <span className="tabular-nums">
              {c.detail} → {c.ok ? "○" : "×"}
            </span>
          </div>
        ))}
        <div className="grid place-items-center text-xs font-bold text-gray-500">
          ↓ {op === "and" ? "3つとも○なら○" : "1つでも○なら○"}
        </div>
        <div
          key={`${who}-${op}`}
          className={`rounded-xl px-3 py-2 text-center font-bold ring-2 ${result ? "bg-emerald-500 text-white ring-emerald-500" : "bg-rose-50 text-rose-700 ring-rose-300"} ${styles.pop}`}
          data-testid="sheet-logic-result"
        >
          <div className="font-mono text-[10px] opacity-80">IF({fn}(…), {"'合格'"}, {"'不合格'"})</div>
          <div className="text-base">{result ? "'合格'" : "'不合格'"}</div>
        </div>
      </div>
      <Note>
        💡 <b>論理積＝全部</b>成り立つとき TRUE（「かつ」）、<b>論理和＝どれか1つ</b>でも成り立てば TRUE（「又は」）。問題文の<b>「又は」「少なくとも一つ」なら論理和</b>です。
      </Note>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 範囲関数 ― 合計(B2:B4)
// ---------------------------------------------------------------------------

const RANGE_DELAYS = [1200, 1500, 1500, 1600, 1600];
const RANGE_VALUES: Record<string, number> = { B2: 30, B3: 50, B4: 20 };

export function RangeStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(6, RANGE_DELAYS);
  const ranged = b >= 1;
  const gathered = b >= 2;
  const mark: Record<string, Tone> = ranged ? { B2: "sky", B3: "sky", B4: "sky" } : {};
  if (b >= 2) mark.B5 = "emerald";
  const cells: Record<string, ReactNode> = {
    A2: "4月",
    A3: "5月",
    A4: "6月",
    A5: "計",
    B1: "売上",
    ...RANGE_VALUES,
    B5: gathered ? 100 : "",
  };
  return (
    <Panel>
      <SectionTitle step={6}>範囲をまとめる ― 合計(B2:B4)</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        B5 に <b className="font-mono text-gray-800">合計(B2:B4)</b> を入れます。<b className="text-gray-800">「:」は「〜から〜まで」</b>の意味です。
      </p>
      <div ref={ref} className="mt-3" data-testid="sheet-range" data-beat={b}>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <Sheet cols={["A", "B"]} rows={[1, 2, 3, 4, 5]} cells={cells} mark={mark} testId="sheet-range-grid" />
          <div className="w-24 text-center">
            {ranged && (
              <div className={`rounded-xl bg-sky-50 p-2 ring-1 ring-sky-300 ${styles.reveal}`}>
                <div className="text-[10px] font-bold text-sky-700">B2 から B4 まで</div>
                <div className="mt-1 flex justify-center gap-1">
                  {Object.values(RANGE_VALUES).map((v, i) => (
                    <span
                      key={i}
                      className={`${styles.move} grid h-6 w-7 place-items-center rounded bg-sky-500 text-[11px] font-bold text-white`}
                      style={{ transform: gathered ? `translate(${(1 - i) * 30}px, 28px) scale(0.5)` : "none", opacity: gathered ? 0 : 1, transitionDelay: `${i * 120}ms` }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
                <div className={`mx-auto mt-1 grid h-8 w-16 place-items-center rounded-lg text-sm font-bold ring-2 transition-colors duration-500 ${gathered ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-gray-300 ring-gray-200"}`} data-testid="sheet-range-box">
                  {gathered ? 100 : "合計"}
                </div>
              </div>
            )}
          </div>
        </div>

        {b >= 3 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-sm font-bold ring-1 ring-gray-200 ${styles.reveal}`}>
            合計(B2:B4) ＝ 30 ＋ 50 ＋ 20 ＝ <span className="text-emerald-600">100</span>
            <span className="mt-0.5 block text-[11px] text-gray-500">平均(B2:B4) なら 100 ÷ 3（個数）で約33.3</span>
          </div>
        )}
        {b >= 4 && (
          <div className={`mt-3 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200 ${styles.reveal}`} data-testid="sheet-range-nested">
            <div className="text-[11px] font-bold text-gray-500">IF と組み合わせると（内側から計算）</div>
            <div className="mt-1 text-center font-mono text-xs font-bold text-gray-800">
              IF(<span className="rounded bg-sky-100 px-0.5 text-sky-800">合計(B2:B4)</span> ≧ 90, {"'達成'"}, {"'未達'"})
            </div>
            <div className="mt-1 text-center text-lg text-gray-400">↓</div>
            <div className="text-center font-mono text-xs font-bold text-gray-800">
              IF(<span className="rounded bg-emerald-100 px-0.5 text-emerald-800">100</span> ≧ 90, {"'達成'"}, {"'未達'"}) → <span className="text-emerald-700">{"'達成'"}</span>
            </div>
          </div>
        )}
        {b >= 5 && (
          <Note>
            💡 関数の中に関数があるときは<b>内側を先に1つの数にしてから</b>外側を読む。試験の<b>合計・平均・論理積・論理和</b>は、Excel の SUM・AVERAGE・AND・OR と同じ働きです。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑦ 確認5問
// ---------------------------------------------------------------------------

const mono = (s: string) => <span className="font-mono">{s}</span>;

export const SHEET_QUESTIONS: LeveledQuestion[] = [
  {
    level: "Lv.1 絶対参照",
    prompt: <>C4 に {mono("B4＊(1＋B$1)")} を入れ、C5 に複写した。C5 の式は？</>,
    choices: [
      { label: "B5＊(1＋B$1)", ok: true },
      { label: "B5＊(1＋B$2)", why: "B$1 は1の前に$があるので、行は動きません。", step: 0 },
      { label: "B4＊(1＋B$1)", why: "B4 には$が無いので、下へ複写すると B5 にずれます。", step: 0 },
    ],
    solution: "① $のない B4 は B5 へ、$の付いた B$1 はそのまま",
    cols: 3,
  },
  {
    level: "Lv.2 IF",
    prompt: <>A2 に 60 が入っている。{mono("IF(A2 ≧ 60, '合格', '不合格')")} の表示は？</>,
    choices: [
      { label: "合格", ok: true },
      { label: "不合格", why: "「≧」は等しいときも含みます。60 ≧ 60 は成り立つ（TRUE）ので2番目の '合格'。", step: 2 },
    ],
    solution: "③ 60 ≧ 60 は TRUE → 2番目の '合格'",
    cols: 2,
  },
  {
    level: "Lv.3 範囲の合計",
    prompt: <>B2〜B4 に 40, 25, 35 が入っている。{mono("合計(B2:B4)")} は？</>,
    choices: [
      { label: "100", ok: true },
      { label: "75", why: "B2 と B4 だけを足しています。「:」は B2 から B4 までの全部（B3 も入る）。", step: 0 },
      { label: "3", why: "セルの個数です。合計は中の値を足します。", step: 1 },
    ],
    solution: "① B2・B3・B4 の3つ → ② 40＋25＋35＝100",
  },
  {
    level: "Lv.4 IF＋範囲関数",
    prompt: <>B2〜B4 に 40, 25, 35。{mono("IF(合計(B2:B4) ≧ 110, '達成', '未達')")} の表示は？</>,
    choices: [
      { label: "未達", ok: true },
      { label: "達成", why: "内側の合計は 100。100 ≧ 110 は成り立たない（FALSE）ので3番目の '未達'。", step: 1 },
    ],
    solution: "② 合計(B2:B4)＝100 → ③ 100 ≧ 110 は FALSE → 3番目の '未達'",
    cols: 2,
  },
  {
    level: "Lv.5 本試験レベル",
    prompt: (
      <>
        科目XをA2、科目YをB2に入力する。「XとYの合計が120点以上」<b>又は</b>「XかYの少なくとも一つが100点」のとき C2 に {"'合格'"}、それ以外は {"'不合格'"} と表示する。C2 の式は？
      </>
    ),
    choices: [
      { label: "IF(論理和((A2＋B2)≧120, A2＝100, B2＝100), '合格', '不合格')", ok: true },
      { label: "IF(論理積((A2＋B2)≧120, A2＝100, B2＝100), '合格', '不合格')", why: "論理積は3つ全部が成り立つときだけ TRUE。「又は」「少なくとも一つ」は論理和です。", step: 2 },
      { label: "IF(論理和((A2＋B2)≧120, A2＝100, B2＝100), '不合格', '合格')", why: "条件が成り立つ（TRUE）ときに表示するのは2番目。ここが '不合格' だと逆になります。", step: 2 },
    ],
    solution: "③ 「又は」→ 論理和。TRUE のとき '合格'（2番目）、FALSE のとき '不合格'（3番目）",
    cols: 1,
  },
];

export function SheetPractice() {
  return (
    <LeveledPractice
      step={7}
      title="確認問題：5段階で本試験レベルへ"
      steps={SHEET_STEPS}
      questions={SHEET_QUESTIONS}
      testId="sheet-practice"
      done={
        <>
          🎉 ここまで読めれば、本試験の表計算の問題に対応できます。<b>参照を読む → 内側から計算 → 条件で分ける</b>。
        </>
      }
    />
  );
}
