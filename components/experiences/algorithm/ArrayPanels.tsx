"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import { CodeLines } from "./FlowDiagram";
import { binaryProbes, bubbleSteps, linearProbes, selectionSteps } from "./sortTrace";

// ============================================================================
// 「アルゴリズムとフローチャート」で、過去問の出題に合わせて足した6枚。
//   ⑥ 配列と要素番号：for で1つずつ取り出し、トレース表で追う（文字列の末尾に追加）
//   ⑦ 並べ替え：バブルソート（隣どうしを比べて入れ替え）と選択ソート（最小を選んで入れ替え）を1手ずつ
//   ⑧ 探索：線形探索と2分探索の比べる回数・前提
//   ⑨ 数の型：2進数→10進数、各桁の取り出し（÷10 の商と余り）、最大公約数（互除法）
//   ⑩ 回数と条件：カウンタの始まりと終わり、何ずつ増やす for、素数判定
//   ⑪ 確認：トレース問題
// 例題の数字は過去問と別にしている（解き方だけを持ち帰れるように）。
// ============================================================================

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
  );
}

type CellTone = "plain" | "focus" | "pick" | "fixed" | "dim";
const CELL_TONE: Record<CellTone, string> = {
  plain: "bg-white text-gray-900 ring-1 ring-gray-300",
  focus: "bg-amber-100 text-gray-900 ring-2 ring-amber-400",
  pick: "bg-sky-100 text-sky-900 ring-2 ring-sky-400",
  fixed: "bg-gray-100 text-gray-400 ring-1 ring-gray-200",
  dim: "bg-white text-gray-300 ring-1 ring-gray-200",
};

// 要素番号つきの箱の列
function ArrayRow({
  values,
  tone = () => "plain",
  mark,
  testId,
}: {
  values: readonly (number | string)[];
  tone?: (idx: number) => CellTone;
  mark?: (idx: number) => string | undefined;
  testId?: string;
}) {
  // 7個以上は小さい箱にして、スマホ幅（本文 約318px）に収める
  const small = values.length > 5;
  return (
    <div className={`flex justify-center ${small ? "gap-1" : "gap-1.5"}`} data-testid={testId} data-values={values.join(",")}>
      {values.map((v, i) => {
        const idx = i + 1;
        const m = mark?.(idx);
        return (
          <div key={idx} className={`flex flex-col items-center ${small ? "w-10" : "w-11"}`}>
            <span className="h-4 whitespace-nowrap text-[10px] font-bold leading-4 text-amber-700">{m}</span>
            <span
              className={`grid place-items-center rounded-lg font-mono font-bold transition ${small ? "h-9 w-9 text-[15px]" : "h-10 w-10 text-base"} ${CELL_TONE[tone(idx)]}`}
            >
              {v}
            </span>
            <span className="mt-0.5 font-mono text-[10px] text-gray-500">[{idx}]</span>
          </div>
        );
      })}
    </div>
  );
}

// ⑥ 配列と要素番号 -----------------------------------------------------------------------
const SCORES = [7, 3, 9, 4];
const MARK_ROWS = SCORES.map((s, i) => {
  const mark = s >= 5 ? "○" : "×";
  return { i: i + 1, s, mark, out: SCORES.slice(0, i + 1).map((x) => (x >= 5 ? "○" : "×")).join("") };
});

export function ArrayTracePanel() {
  return (
    <Panel>
      <SectionTitle icon="grid">配列と要素番号：1つずつ取り出して表で追う</SectionTitle>
      <Lead>
        <b>配列</b>は、同じ種類の値を<b>要素番号</b>（添字）付きで並べた箱。試験では「配列の要素番号は1から始まる」と書かれます。
        <b>点数[3]</b> は3番目の箱の値 <b>9</b>、<b>要素数</b>は箱の数 <b>4</b> です。
      </Lead>
      <div className="mt-3">
        <ArrayRow values={SCORES} tone={(i) => (i === 3 ? "focus" : "plain")} mark={(i) => (i === 3 ? "点数[3]" : undefined)} testId="array-scores" />
      </div>

      <div className="mt-4">
        <CodeLines
          testId="array-loop"
          lines={[
            { code: "文字列型: 結果 ← \"\"", note: "空の文字列" },
            { code: "for (i を 1 から 要素数 まで 1 ずつ増やす)" },
            { indent: 1, code: "if (点数[i] が 5 以上)" },
            { indent: 2, code: "結果 の末尾 に \"○\" を追加する" },
            { indent: 1, code: "else" },
            { indent: 2, code: "結果 の末尾 に \"×\" を追加する" },
            { indent: 1, code: "endif" },
            { code: "endfor" },
          ]}
        />
      </div>

      <table className="mt-3 w-full table-fixed border-collapse text-center text-[12.5px]" data-testid="array-trace">
        <thead>
          <tr className="text-gray-600">
            <th className="py-1 font-bold">i</th>
            <th className="py-1 font-bold">点数[i]</th>
            <th className="py-1 font-bold">追加</th>
            <th className="py-1 font-bold">結果</th>
          </tr>
        </thead>
        <tbody>
          {MARK_ROWS.map((r) => (
            <tr key={r.i} className="border-t border-gray-100" data-row={r.i}>
              <td className="py-1 font-mono font-bold">{r.i}</td>
              <td className="py-1 font-mono">{r.s}</td>
              <td className="py-1 font-bold">{r.mark}</td>
              <td className="py-1 text-left font-mono font-bold tracking-wider">&quot;{r.out}&quot;</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Takeaway>
        「末尾に追加」は<b>右端に1文字つなげる</b>こと。結果の i 文字目は 点数[i] で決まるので、結果から配列を選ぶ問題も<b>1文字ずつ突き合わせ</b>れば解けます。
      </Takeaway>
    </Panel>
  );
}

// ⑦ 並べ替え（整列） ---------------------------------------------------------------------
const BUBBLE_INPUT = [40, 10, 30, 20];
const SELECTION_INPUT = [30, 50, 20, 40, 10];
const BUBBLE = bubbleSteps(BUBBLE_INPUT);
const SELECTION = selectionSteps(SELECTION_INPUT);

type SortKind = "bubble" | "selection";

function BubbleView({ step }: { step: number }) {
  const s = step === 0 ? null : BUBBLE[step - 1];
  const values = s ? s.after : BUBBLE_INPUT;
  const fixed = s ? s.fixed : 0;
  const len = values.length;
  return (
    <>
      <CodeLines
        lines={[
          { code: "for (n を 1 から N − 1 まで 1 ずつ増やす)" },
          { indent: 1, code: "for (m を 1 から N − n まで 1 ずつ増やす)" },
          { indent: 2, code: "if (a[m] ＞ a[m ＋ 1])", focus: !!s },
          { indent: 3, code: "a[m] と a[m ＋ 1] の値を入れ替える" },
          { indent: 2, code: "endif" },
          { indent: 1, code: "endfor" },
          { code: "endfor" },
        ]}
      />
      <div className="mt-3">
        <ArrayRow
          testId="sort-array"
          values={values}
          tone={(i) => (i > len - fixed ? "fixed" : s && (i === s.m || i === s.m + 1) ? "focus" : "plain")}
          mark={(i) => (s && i === s.m ? "m" : s && i === s.m + 1 ? "m+1" : i > len - fixed ? "確定" : undefined)}
        />
      </div>
      <p className="mt-2 min-h-[2.5rem] text-center text-[13px] leading-snug text-gray-800" data-testid="sort-log">
        {s ? (
          <>
            n＝{s.n}, m＝{s.m}：{s.before[s.m - 1]} ＞ {s.before[s.m]} ？ →{" "}
            <b className={s.swapped ? "text-amber-700" : "text-gray-600"}>{s.swapped ? "はい。入れ替えた" : "いいえ。そのまま"}</b>
            {s.m === len - s.n && <span className="block text-[12px] text-gray-500">n＝{s.n} の周が終わり、右端から{s.n}個が確定</span>}
          </>
        ) : (
          <>はじめの並び。隣どうし（m と m＋1）を左から比べます</>
        )}
      </p>
    </>
  );
}

function SelectionView({ step }: { step: number }) {
  const s = step === 0 ? null : SELECTION[step - 1];
  const values = s ? s.after : SELECTION_INPUT;
  return (
    <>
      <CodeLines
        lines={[
          { code: "for (j を 1 から N − 1 まで 1 ずつ増やす)" },
          { indent: 1, code: "minIndex ← j" },
          { indent: 1, code: "for (k を j＋1 から N まで 1 ずつ増やす)" },
          { indent: 2, code: "if (a[k] が a[minIndex] より小さい)" },
          { indent: 3, code: "minIndex ← k" },
          { indent: 2, code: "endif" },
          { indent: 1, code: "endfor" },
          { indent: 1, code: "a[j] と a[minIndex] の値を入れ替える", focus: !!s },
          { code: "endfor" },
        ]}
      />
      <div className="mt-3">
        <ArrayRow
          testId="sort-array"
          values={values}
          tone={(i) => (s && i < s.j ? "fixed" : s && (i === s.j || i === s.minIndex) ? "pick" : "plain")}
          mark={(i) => (s && i === s.j ? (i === s.minIndex ? "j=min" : "j") : s && i === s.minIndex ? "min" : s && i < s.j ? "確定" : undefined)}
        />
      </div>
      <p className="mt-2 min-h-[2.5rem] text-center text-[13px] leading-snug text-gray-800" data-testid="sort-log">
        {s ? (
          <>
            j＝{s.j}：{s.j}番目〜末尾で最小は <b>{s.before[s.minIndex - 1]}</b>（要素番号{s.minIndex}）→{" "}
            <b className="text-sky-700">{s.minIndex === s.j ? "すでに j 番目なので変わらない" : `${s.j}番目の ${s.before[s.j - 1]} と入れ替えた`}</b>
          </>
        ) : (
          <>はじめの並び。j 番目から末尾までの最小を探し、j 番目へ持ってきます</>
        )}
      </p>
    </>
  );
}

export function SortPanel() {
  const [kind, setKind] = useState<SortKind>("bubble");
  const [step, setStep] = useState(0);
  const total = kind === "bubble" ? BUBBLE.length : SELECTION.length;
  const choose = (k: SortKind) => {
    setKind(k);
    setStep(0);
  };
  return (
    <Panel>
      <SectionTitle icon="layers">並べ替え（整列）を1手ずつ</SectionTitle>
      <Lead>
        二重の for で<b>要素を比べて入れ替える</b>のが並べ替えの定番。小さい順（<b>昇順</b>）に並べます。N は配列 a の要素数。
      </Lead>

      <div className="mt-3 grid grid-cols-2 gap-1.5" role="tablist">
        {(
          [
            ["bubble", "バブルソート", "隣どうしを比べる"],
            ["selection", "選択ソート", "最小を選んで入れ替え"],
          ] as const
        ).map(([k, name, sub]) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => choose(k)}
            className={`rounded-lg px-2 py-1.5 text-center leading-tight transition ${kind === k ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"}`}
          >
            <span className="block text-[13px] font-bold">{name}</span>
            <span className={`block text-[10.5px] ${kind === k ? "text-gray-300" : "text-gray-500"}`}>{sub}</span>
          </button>
        ))}
      </div>

      <div className="mt-3" data-testid="sort-stage" data-kind={kind} data-step={step}>
        {kind === "bubble" ? <BubbleView step={step} /> : <SelectionView step={step} />}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => setStep(0)}
          disabled={step === 0}
          className="rounded-lg py-2 text-[13px] font-bold text-gray-700 ring-1 ring-gray-300 disabled:opacity-40"
        >
          最初の並びに戻す
        </button>
        <button
          onClick={() => setStep((n) => Math.min(total, n + 1))}
          disabled={step === total}
          className="rounded-lg bg-gray-900 py-2 text-[13px] font-bold text-white disabled:opacity-40"
        >
          {kind === "bubble" ? "次の比較へ" : "次の j へ"}（{step}/{total}）
        </button>
      </div>

      <Takeaway>
        {kind === "bubble" ? (
          <>
            バブルソートは1周（n）ごとに<b>一番大きい値が右端へ</b>運ばれ、確定します。だから次の周は比べる範囲が1つ短くなる（m は 要素数−n まで）。
          </>
        ) : (
          <>
            j ごとに<b>残りの最小値を j 番目へ</b>。j＝3 の直後なら左から3つが確定。「最大を選んで最後と入れ替え、最後を外す」型も同じで、
            <b>要素が1個でも残ればもう1回</b>実行します。
          </>
        )}
      </Takeaway>
    </Panel>
  );
}

// ⑧ 探索 ------------------------------------------------------------------------------
const SORTED = [3, 8, 12, 17, 21, 26, 30];
const TARGETS = [3, 21, 30];

export function SearchPanel() {
  const [target, setTarget] = useState(30);
  const linear = linearProbes(SORTED, target);
  const binary = binaryProbes(SORTED, target);
  const rows = [
    { name: "線形探索", probes: linear, testId: "search-linear" },
    { name: "2分探索", probes: binary, testId: "search-binary" },
  ];
  return (
    <Panel>
      <SectionTitle icon="search">探索：線形探索と2分探索</SectionTitle>
      <Lead>
        配列から目的の値を探す方法は2つ。探す値を選ぶと、<b>調べた順番</b>が箱に出ます。
      </Lead>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {TARGETS.map((t) => (
          <button
            key={t}
            onClick={() => setTarget(t)}
            aria-pressed={target === t}
            className={`rounded-lg py-1.5 text-[13px] font-bold transition ${target === t ? "bg-gray-900 text-white" : "text-gray-700 ring-1 ring-gray-300"}`}
          >
            {t} を探す
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.name} data-testid={r.testId} data-count={r.probes.length}>
            <p className="mb-0.5 flex items-baseline justify-between text-[13px] font-bold text-gray-800">
              {r.name}
              <span className="text-[12px] text-gray-600">
                比べた回数 <b className="font-mono text-base text-gray-900">{r.probes.length}</b> 回
              </span>
            </p>
            <ArrayRow
              values={SORTED}
              tone={(i) => (SORTED[i - 1] === target ? "pick" : r.probes.includes(i) ? "focus" : "dim")}
              mark={(i) => {
                const k = r.probes.indexOf(i);
                return k >= 0 ? `${k + 1}回目` : undefined;
              }}
            />
          </div>
        ))}
      </div>

      <table className="mt-3 w-full table-fixed border-collapse text-[12px] leading-snug" data-testid="search-compare">
        <colgroup>
          <col className="w-[4.5rem]" />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr className="text-left text-gray-600">
            <th />
            <th className="px-1 py-1 font-bold">線形探索</th>
            <th className="px-1 py-1 font-bold">2分探索</th>
          </tr>
        </thead>
        <tbody className="text-gray-800">
          <tr className="border-t border-gray-100 align-top">
            <th className="px-1 py-1 text-left font-bold text-gray-600">探し方</th>
            <td className="px-1 py-1">先頭の要素から順に</td>
            <td className="px-1 py-1">中央と比べ、範囲を半分に絞る</td>
          </tr>
          <tr className="border-t border-gray-100 align-top">
            <th className="px-1 py-1 text-left font-bold text-gray-600">前提</th>
            <td className="px-1 py-1">並びは何でもよい</td>
            <td className="px-1 py-1">
              <b>昇順か降順に整列済み</b>
            </td>
          </tr>
          <tr className="border-t border-gray-100 align-top">
            <th className="px-1 py-1 text-left font-bold text-gray-600">計算量</th>
            <td className="px-1 py-1">
              <b>要素数に比例</b>（2倍なら約2倍）
            </td>
            <td className="px-1 py-1">要素数が2倍でも1回増えるだけ</td>
          </tr>
        </tbody>
      </table>
      <Takeaway>
        ふつうは2分探索のほうが少なく済みますが、<b>いつもではありません</b>。3 を探すと、線形探索は1回、2分探索は3回です。
      </Takeaway>
    </Panel>
  );
}

// ⑨ 数の型 -----------------------------------------------------------------------------
function PatternCard({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200" data-testid={testId}>
      <p className="text-[13.5px] font-bold text-gray-900">{title}</p>
      <div className="mt-1 text-[12.5px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</div>
    </div>
  );
}

const BIN = "1101";
const BIN_TERMS = BIN.split("")
  .reverse()
  .map((d, k) => ({ i: k + 1, d: Number(d), w: 2 ** k }));

export function NumberPatternsPanel() {
  return (
    <Panel>
      <SectionTitle icon="binary">よく出る型①：数の扱い</SectionTitle>
      <div className="mt-3 space-y-2.5">
        <PatternCard title="2進数の文字列 → 10進数" testId="pattern-binary">
          <p>
            <b>末尾から i 番目</b>の桁に、<b>2 の（i − 1）乗</b>を掛けて足していく。末尾（i＝1）の重みは 2⁰＝1。
          </p>
          <table className="mt-1.5 w-full table-fixed border-collapse text-center font-mono text-[12px]">
            <tbody>
              <tr className="text-gray-500">
                <th className="w-[5.5rem] text-left font-sans font-bold">末尾から i</th>
                {BIN_TERMS.map((t) => (
                  <td key={t.i}>{t.i}</td>
                ))}
              </tr>
              <tr>
                <th className="text-left font-sans font-bold text-gray-500">桁の数字</th>
                {BIN_TERMS.map((t) => (
                  <td key={t.i} className="font-bold text-gray-900">
                    {t.d}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-left font-sans font-bold text-gray-500">2の(i−1)乗</th>
                {BIN_TERMS.map((t) => (
                  <td key={t.i}>{t.w}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-1 font-mono text-[12px]">
            &quot;{BIN}&quot; → 1×1 ＋ 0×2 ＋ 1×4 ＋ 1×8 ＝ <b>13</b>
            <span className="ml-1 font-sans text-gray-500">（合計 ← 合計 ＋ 数字 × 重み）</span>
          </p>
        </PatternCard>

        <PatternCard title="10進数の各桁を取り出す（÷ 10 の商と余り）" testId="pattern-digits">
          <p>
            47 なら、<b>47 ÷ 10 の商＝4</b>（十の位）、<b>47 − 10 × 4 ＝ 7</b>（一の位。47 ÷ 10 の余りと同じ）。
            各桁の合計 4 ＋ 7 ＝ 11 はまだ2桁なので、もう一度 1 ＋ 1 ＝ <b>2</b>。9以下になるまで while でくり返します。
          </p>
        </PatternCard>

        <PatternCard title="最大公約数（ユークリッドの互除法）" testId="pattern-gcd">
          <p>
            2つの数が<b>等しくなるまで、大きいほうから小さいほうを引く</b>。残った値が最大公約数。
          </p>
          <p className="mt-1 font-mono text-[12px]">(36, 24) → (12, 24) → (12, 12) → <b>12</b></p>
          <p className="mt-0.5 text-[11.5px] text-gray-500">「割った余りで割る」を余りが0になるまでくり返す書き方もある。36÷24 の余り12、24÷12 の余り0 → 12</p>
        </PatternCard>
      </div>
      <Takeaway>
        どれも<b>変数の値を表に書きながら</b>1周ずつ追えば解けます。式の穴埋めは、小さい例（&quot;10&quot; や 13）を入れて確かめるのが近道です。
      </Takeaway>
    </Panel>
  );
}

// ⑩ 回数と条件 --------------------------------------------------------------------------
const COUNTS = [
  { code: "カウンタ ← 0 で始め、6 未満の間", seq: "0,1,2,3,4,5", n: 6 },
  { code: "カウンタ ← 1 で始め、6 以下の間", seq: "1,2,3,4,5,6", n: 6 },
  { code: "for (i を 2 から 10 まで 4 ずつ増やす)", seq: "2,6,10", n: 3 },
];

export function CountConditionPanel() {
  return (
    <Panel>
      <SectionTitle icon="rotate">よく出る型②：回数と止まる条件</SectionTitle>
      <Lead>
        回数は<b>始まりの値・終わりの条件・増やし方</b>で決まる。「未満」と「以下」で1回ずれるのが落とし穴。
      </Lead>
      <ul className="mt-2 divide-y divide-gray-100" data-testid="count-patterns">
        {COUNTS.map((c) => (
          <li key={c.code} className="flex items-baseline gap-2 py-1.5 text-[12.5px]" data-count={c.n}>
            <span className="min-w-0 flex-1">
              <code className="block font-mono text-[12px] font-bold text-gray-900">{c.code}</code>
              <span className="font-mono text-gray-600">{c.seq}</span>
            </span>
            <b className="flex-none text-gray-900">{c.n} 回</b>
          </li>
        ))}
      </ul>

      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] leading-relaxed text-gray-700 ring-1 ring-slate-200" data-testid="pattern-polygon">
        <b className="text-gray-900">正多角形を描く</b>：「直進して右へ曲がる」を辺の数だけくり返すと1周（360度）。正五角形なら1回に
        <b className="text-gray-900"> 360 ÷ 5 ＝ 72 度</b>。
      </p>

      <div className="mt-3" data-testid="pattern-prime">
        <p className="text-[13.5px] font-bold text-gray-900">素数の判定：2から順に割ってみる</p>
        <div className="mt-1.5">
          <CodeLines
            lines={[
              { code: "div ← 2" },
              { code: "if (num が 2 より小さい)" },
              { indent: 1, code: "return false" },
              { code: "endif" },
              { code: "while (num が div より大きい)" },
              { indent: 1, code: "if (num ÷ div の余り が 0 と等しい)" },
              { indent: 2, code: "return false" },
              { indent: 1, code: "endif" },
              { indent: 1, code: "div ← div ＋ 1" },
              { code: "endwhile" },
              { code: "return true" },
            ]}
          />
        </div>
        <p className="mt-1.5 text-[12.5px] text-gray-700">
          1 は素数でない（2より小さい）。割る数 div は2から<b className="text-gray-900">自分自身の手前まで</b>。
          num＝9 なら div＝2 は余り1、div＝3 で余り0 → <b className="text-gray-900">false</b>。最後まで割り切れなければ true。
        </p>
      </div>
    </Panel>
  );
}

// ⑪ 確認 ------------------------------------------------------------------------------
const QUIZ = [
  {
    t: "{2, 3, 1} をバブルソート（解説7の書き方）で並べる。n＝1 の周が終わった直後の並びは？",
    ans: "2, 1, 3",
    opts: ["1, 2, 3", "2, 1, 3", "1, 3, 2"],
    why: "m＝1：2＞3 はいいえ。m＝2：3＞1 で入れ替え → 2, 1, 3。最大の 3 が右端へ来た段階で、まだ並べ終わっていない。",
  },
  {
    t: "2分探索を使うための前提はどれ？",
    ans: "整列されている",
    opts: ["要素数が偶数", "整列されている", "先頭から調べる"],
    why: "中央と比べて「右か左か」を決めるので、昇順か降順に整列済みであることが前提。先頭から順に調べるのは線形探索。",
  },
  {
    t: "2進数の文字列 \"1010\" を10進数にすると？",
    ans: "10",
    opts: ["5", "10", "20"],
    why: "末尾から 0×1 ＋ 1×2 ＋ 0×4 ＋ 1×8 ＝ 10。",
  },
  {
    t: "for (i を 1 から 9 まで 2 ずつ増やす) の中は何回実行される？",
    ans: "5回",
    opts: ["4回", "5回", "9回"],
    why: "i は 1, 3, 5, 7, 9 の5つ。9 も「まで」に含まれる。",
  },
];

export function AlgorithmQuiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle icon="check">表を書いて追ってみよう</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="algorithm-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-[13px] font-bold leading-snug text-gray-800">{q.t}</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
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
