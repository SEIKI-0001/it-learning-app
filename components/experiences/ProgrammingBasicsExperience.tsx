"use client";

import type { ReactNode } from "react";
import { CodeLines, FlowDiagram } from "./algorithm/FlowDiagram";
import { DataFormatStage, TranslateStage } from "./progbasics/ExamStages";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// ============================================================================
// 「プログラミング基礎」専用の解説。
//   たとえ話は使わず、「アルゴリズムとフローチャート」と同じ記号のフロー図で処理の流れそのものを見せる。
//   ① 全体像 … 値を受け取る → 処理する → 条件を判断する → 結果を出す（送料の計算）
//   ② 順次   … ①の一部（A→B→C）。変数と「←（代入）」もここで
//   ③ 分岐   … ①の条件の部分。はい／いいえ で片方だけ実行（＋試験形式 a ≧ 5）
//   ④ 反復   … 条件へ戻る矢印。i と 合計 の表で1周ずつ追う（1＋2＋3＝6）
//   ⑤ 関数   … まとめて名前をつけ、呼び出す → 中で処理 → 返す。関数なし／ありの比較
//   ⑥ 翻訳   … コンパイラ／インタプリタ／アセンブラ（アニメは「何を見るか」を先に大きく書く）
//   ⑦ データの書き方 … JSON／XML／HTML／CSV
//   ①〜⑤は動かない図。フロー図が先、対応するコードはその横（スマホでは下）。
// ============================================================================

/** フロー図とコード／説明を横並び（スマホでは縦）にする */
function Pair({ figure, children }: { figure: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
      <div>{figure}</div>
      <div className="min-w-0 space-y-3">{children}</div>
    </div>
  );
}

function Point({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// ① 全体像
// ---------------------------------------------------------------------------

const OVERALL_STEPS = [
  { n: "①", name: "値を受け取る", ex: "価格 ← 800" },
  { n: "②", name: "処理する", ex: "税込 ← 800 × 1.1 ＝ 880" },
  { n: "③", name: "条件を判断する", ex: "880 ≧ 1000？ → いいえ" },
  { n: "④", name: "結果を出す", ex: "880 ＋ 500 ＝ 1380 を表示" },
];

function OverallPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>プログラム ＝ 上から順に実行する命令の並び</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        例：「買い物の<b className="text-gray-900">送料</b>を決めて支払額を表示する」プログラム。コンピュータは矢印に沿って、<b className="text-gray-900">上から1つずつ</b>実行します。
      </p>
      <Pair
        figure={
          <FlowDiagram
            testId="prog-overall"
            title="開始、価格を受け取る、税込を計算、税込が1000以上かを判断、はいなら送料0・いいえなら送料500、税込と送料を表示、終了"
            width={270}
            height={326}
            maxWidth="max-w-[18rem]"
            nodes={[
              { id: "start", x: 105, y: 14, w: 64, kind: "terminal", label: "開始" },
              { id: "in", x: 105, y: 56, w: 132, kind: "io", label: "価格 ← 入力", badge: "①" },
              { id: "calc", x: 105, y: 102, w: 132, kind: "process", label: "税込 ← 価格 × 1.1", badge: "②" },
              { id: "if", x: 105, y: 156, w: 124, h: 44, kind: "decision", label: "税込 ≧ 1000 ?", badge: "③" },
              { id: "yes", x: 105, y: 214, w: 92, kind: "process", label: "送料 ← 0" },
              { id: "no", x: 222, y: 214, w: 84, kind: "process", label: "送料 ← 500" },
              { id: "out", x: 105, y: 270, w: 150, kind: "io", label: "税込 ＋ 送料 を表示", badge: "④" },
              { id: "end", x: 105, y: 310, w: 64, kind: "terminal", label: "終了" },
            ]}
            edges={[
              { pts: [[105, 25], [105, 42]] },
              { pts: [[105, 70], [105, 88]] },
              { pts: [[105, 116], [105, 134]] },
              { pts: [[105, 178], [105, 200]], kind: "yes", label: "はい", labelAt: [124, 189] },
              { pts: [[167, 156], [222, 156], [222, 200]], kind: "no", label: "いいえ", labelAt: [196, 156] },
              { pts: [[105, 228], [105, 256]] },
              { pts: [[222, 228], [222, 242], [150, 242], [150, 256]] },
              { pts: [[105, 284], [105, 299]] },
            ]}
          />
        }
      >
        <ol className="space-y-2" data-testid="prog-overall-steps">
          {OVERALL_STEPS.map((s) => (
            <li key={s.n} className="flex gap-2.5">
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-gray-900 text-[10px] font-bold text-white">{s.n}</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold leading-snug text-gray-900">{s.name}</span>
                <code className="block font-mono text-[12px] text-gray-600">{s.ex}</code>
              </span>
            </li>
          ))}
        </ol>
      </Pair>
      <Point>
        この図には<b>上から順に進む形（順次）</b>と<b>条件で道が分かれる形（分岐）</b>が入っています。
        これに<b>同じ所へ戻ってくり返す形（反復）</b>を加えた3つの組み合わせで、どんなプログラムも書けます。
      </Point>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 順次
// ---------------------------------------------------------------------------

function VarBox({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-bold text-gray-600">{name}</span>
      <span className="mt-0.5 grid h-9 min-w-[3.5rem] place-items-center rounded-md border-2 border-gray-800 bg-white px-2 font-mono text-base font-bold text-gray-900">
        {value}
      </span>
    </div>
  );
}

function SequencePanel() {
  return (
    <Panel>
      <SectionTitle step={2}>順次 ＝ 上から1つずつ実行する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        いちばん単純な形。<b className="text-gray-900">処理A → 処理B → 処理C</b> と、書いた順に1回ずつ実行します。
      </p>
      <Pair
        figure={
          <FlowDiagram
            testId="prog-sequence"
            title="開始、処理A 価格に800を入れる、処理B 税込を計算、処理C 税込を表示、終了"
            width={200}
            height={198}
            maxWidth="max-w-[13rem]"
            nodes={[
              { id: "start", x: 108, y: 12, w: 60, kind: "terminal", label: "開始" },
              { id: "a", x: 108, y: 52, w: 132, kind: "process", label: "価格 ← 800", badge: "A" },
              { id: "b", x: 108, y: 96, w: 132, kind: "process", label: "税込 ← 価格 × 1.1", badge: "B" },
              { id: "c", x: 108, y: 140, w: 132, kind: "io", label: "税込を表示", badge: "C" },
              { id: "end", x: 108, y: 184, w: 60, kind: "terminal", label: "終了" },
            ]}
            edges={[
              { pts: [[108, 23], [108, 38]] },
              { pts: [[108, 66], [108, 82]] },
              { pts: [[108, 110], [108, 126]] },
              { pts: [[108, 154], [108, 173]] },
            ]}
          />
        }
      >
        <CodeLines
          testId="prog-sequence-code"
          lines={[
            { code: "価格 ← 800" },
            { code: "税込 ← 価格 × 1.1" },
            { code: "税込を表示", note: "→ 880" },
          ]}
        />
        <div>
          <p className="text-[13px] font-bold text-gray-900">
            <b>変数</b> ＝ 値を入れて、名前で取り出す箱
          </p>
          <div className="mt-1.5 flex gap-3" data-testid="prog-vars">
            <VarBox name="価格" value="800" />
            <VarBox name="税込" value="880" />
          </div>
        </div>
      </Pair>
      <Point>
        「<b>←</b>」は算数の「等しい」ではなく、<b>右の値を左の箱に入れる（代入）</b>という意味。
        順番も大事で、B を A より先に実行すると<b>価格の箱がまだ空</b>なので計算できません。
      </Point>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 分岐
// ---------------------------------------------------------------------------

const BRANCH_EXAMPLES = [
  { a: 7, judge: "7 ≧ 5 → はい", out: "B" },
  { a: 5, judge: "5 ≧ 5 → はい（5も含む）", out: "B" },
  { a: 3, judge: "3 ≧ 5 → いいえ", out: "C" },
];

function BranchPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>分岐 ＝ 条件で道が分かれる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        ひし形で条件を判断し、<b className="text-emerald-700">はい</b>／<b className="text-rose-700">いいえ</b> のどちらか<b className="text-gray-900">片方の道だけ</b>を進みます（①の図の下半分）。
      </p>
      <Pair
        figure={
          <FlowDiagram
            testId="prog-branch"
            title="税込が1000以上か判断し、はいなら送料に0、いいえなら送料に500を入れ、送料を表示する"
            width={240}
            height={196}
            maxWidth="max-w-[15rem]"
            nodes={[
              { id: "if", x: 120, y: 30, w: 112, h: 44, kind: "decision", label: "税込 ≧ 1000 ?", focus: true },
              { id: "yes", x: 55, y: 100, w: 94, kind: "process", label: "送料 ← 0" },
              { id: "no", x: 185, y: 100, w: 94, kind: "process", label: "送料 ← 500" },
              { id: "out", x: 120, y: 160, w: 110, kind: "io", label: "送料を表示" },
            ]}
            edges={[
              { pts: [[64, 30], [55, 30], [55, 86]], kind: "yes", label: "はい", labelAt: [55, 56] },
              { pts: [[176, 30], [185, 30], [185, 86]], kind: "no", label: "いいえ", labelAt: [185, 56] },
              { pts: [[55, 114], [55, 132], [120, 132], [120, 146]] },
              { pts: [[185, 114], [185, 132], [122, 132]] },
              { pts: [[120, 174], [120, 192]] },
            ]}
          />
        }
      >
        <CodeLines
          testId="prog-branch-code"
          lines={[
            { code: "もし 税込 ≧ 1000 なら", focus: true },
            { code: "送料 ← 0", indent: true, note: "はい の道" },
            { code: "そうでなければ" },
            { code: "送料 ← 500", indent: true, note: "いいえ の道" },
            { code: "送料を表示" },
          ]}
        />
      </Pair>

      <div className="mt-4">
        <p className="text-[13px] font-bold text-gray-900">試験の形：「a ≧ 5 なら B を表示、そうでなければ C を表示」</p>
        <table className="mt-1.5 w-full text-left text-[13px]" data-testid="prog-branch-table">
          <thead>
            <tr className="border-b border-gray-200 text-[11px] text-gray-500">
              <th className="py-1 pr-2 font-bold">a</th>
              <th className="py-1 pr-2 font-bold">条件の判断</th>
              <th className="py-1 font-bold">表示</th>
            </tr>
          </thead>
          <tbody>
            {BRANCH_EXAMPLES.map((r) => (
              <tr key={r.a} className="border-b border-gray-100">
                <td className="py-1.5 pr-2 font-mono font-bold text-gray-900">{r.a}</td>
                <td className="py-1.5 pr-2 font-mono text-gray-700">{r.judge}</td>
                <td className="py-1.5 font-mono text-base font-bold text-gray-900">{r.out}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Point>
        実行されるのは<b>どちらか一方だけ</b>（両方・どちらも無し にはならない）。
        「<b>≧（以上）</b>」は境目の数を<b>含み</b>、「<b>＞（より大きい）</b>」は含みません。
      </Point>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 反復
// ---------------------------------------------------------------------------

const LOOP_TRACE = [
  { lap: "はじめ", judge: "—", total: "0", i: "1" },
  { lap: "1周目", judge: "1 ≦ 3 はい", total: "0＋1＝1", i: "2" },
  { lap: "2周目", judge: "2 ≦ 3 はい", total: "1＋2＝3", i: "3" },
  { lap: "3周目", judge: "3 ≦ 3 はい", total: "3＋3＝6", i: "4" },
  { lap: "抜ける", judge: "4 ≦ 3 いいえ", total: "6（表示）", i: "4", exit: true },
];

function LoopPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>反復 ＝ 条件を満たす間くり返す</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        処理のあと<b className="text-gray-900">矢印が条件へ戻る</b>のが反復（くり返し）。条件が「いいえ」になった時点で輪から抜けます。
      </p>
      <Pair
        figure={
          <FlowDiagram
            testId="prog-loop"
            title="合計に0、iに1を入れる。iが3以下なら合計にiを足し、iを1増やして条件へ戻る。3以下でなくなったら合計を表示する"
            width={290}
            height={258}
            maxWidth="max-w-[18rem]"
            nodes={[
              { id: "start", x: 120, y: 12, w: 60, kind: "terminal", label: "開始" },
              { id: "t0", x: 120, y: 48, w: 110, kind: "process", label: "合計 ← 0" },
              { id: "i1", x: 120, y: 88, w: 110, kind: "process", label: "i ← 1" },
              { id: "if", x: 120, y: 142, w: 104, h: 44, kind: "decision", label: "i ≦ 3 ?" },
              { id: "add", x: 120, y: 196, w: 130, kind: "process", label: "合計 ← 合計 ＋ i" },
              { id: "inc", x: 120, y: 236, w: 130, kind: "process", label: "i ← i ＋ 1" },
              { id: "out", x: 242, y: 196, w: 84, kind: "io", label: "合計を表示" },
              { id: "end", x: 242, y: 236, w: 56, kind: "terminal", label: "終了" },
            ]}
            edges={[
              { pts: [[120, 23], [120, 34]] },
              { pts: [[120, 62], [120, 74]] },
              { pts: [[120, 102], [120, 120]] },
              { pts: [[120, 164], [120, 182]], kind: "yes", label: "はい", labelAt: [138, 173] },
              { pts: [[120, 210], [120, 222]] },
              { pts: [[55, 236], [22, 236], [22, 142], [68, 142]], kind: "loop", focus: true, label: "戻る", labelAt: [22, 190] },
              { pts: [[172, 142], [242, 142], [242, 182]], kind: "no", label: "いいえ", labelAt: [206, 142] },
              { pts: [[242, 210], [242, 225]] },
            ]}
          />
        }
      >
        <CodeLines
          testId="prog-loop-code"
          lines={[
            { code: "合計 ← 0" },
            { code: "i ← 1" },
            { code: "i ≦ 3 の間 くり返す", focus: true },
            { code: "合計 ← 合計 ＋ i", indent: true },
            { code: "i ← i ＋ 1", indent: true },
            { code: "合計を表示", note: "→ 6" },
          ]}
        />
      </Pair>

      <div className="mt-4">
        <p className="text-[13px] font-bold text-gray-900">1周ずつ箱の中身を追う（試験の解き方）</p>
        <table className="mt-1.5 w-full text-left text-[13px]" data-testid="prog-loop-trace">
          <thead>
            <tr className="border-b border-gray-200 text-[11px] text-gray-500">
              <th className="py-1 pr-2 font-bold"></th>
              <th className="py-1 pr-2 font-bold">i ≦ 3 ?</th>
              <th className="py-1 pr-2 font-bold">合計</th>
              <th className="py-1 font-bold">i</th>
            </tr>
          </thead>
          <tbody>
            {LOOP_TRACE.map((r) => (
              <tr key={r.lap} className={`border-b border-gray-100 ${r.exit ? "bg-amber-50" : ""}`} data-exit={r.exit ? "true" : undefined}>
                <td className="py-1.5 pl-1 pr-2 text-[12px] font-bold text-gray-600">{r.lap}</td>
                <td className="py-1.5 pr-2 font-mono text-gray-700">{r.judge}</td>
                <td className="py-1.5 pr-2 font-mono font-bold text-gray-900">{r.total}</td>
                <td className="py-1.5 font-mono font-bold text-gray-900">{r.i}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Point>
        条件を確かめるのは<b>足す前</b>。i が4になった時点で抜けるので、4は足しません（1＋2＋3＝<b>6</b>）。
        抜ける条件（<b>終了条件</b>）がないと、いつまでも止まらない<b>無限ループ</b>になります。
      </Point>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 関数
// ---------------------------------------------------------------------------

const TERMS = [
  { name: "変数", ex: "価格 ← 800", note: "値を1つ入れる箱" },
  { name: "配列", ex: "価格[1], 価格[2]…", note: "同じ種類の値を番号で並べた箱" },
  { name: "関数（サブルーチン）", ex: "税込(800)", note: "処理のまとまりに名前→何度も呼べる", hit: true },
  { name: "コメント", ex: "// 送料の計算", note: "人向けのメモ。実行されない" },
];

function FunctionPanel() {
  return (
    <Panel>
      <SectionTitle step={5}>関数 ＝ 処理のまとまりに名前をつけて呼び出す</SectionTitle>
      <p className="mt-3 text-[15px] font-bold leading-relaxed text-gray-900" data-testid="fn-meaning">
        同じ処理をひとまとまりにして名前をつけておけば、必要なときに<span className="underline decoration-amber-400 decoration-2 underline-offset-4">名前を書くだけで呼び出せる</span>。
      </p>

      <Pair
        figure={
          <FlowDiagram
            testId="fn-flow"
            title="メイン処理が関数 税込 を呼び出す。関数の中で結果に価格かける1.1を入れ、結果を返す。メイン処理は返ってきた値で続きを実行し、もう一度同じ関数を呼ぶ"
            width={292}
            height={250}
            maxWidth="max-w-[19rem]"
            groups={[{ x: 168, y: 20, w: 118, h: 104, label: "関数 税込(価格)" }]}
            nodes={[
              { id: "start", x: 80, y: 12, w: 60, kind: "terminal", label: "開始" },
              { id: "call1", x: 80, y: 56, w: 130, kind: "process", label: "a ← 税込(800)", focus: true },
              { id: "f1", x: 227, y: 56, w: 100, kind: "process", label: "結果 ← 価格×1.1" },
              { id: "f2", x: 227, y: 100, w: 100, kind: "process", label: "結果を返す" },
              { id: "call2", x: 80, y: 150, w: 130, kind: "process", label: "b ← 税込(1200)" },
              { id: "show", x: 80, y: 194, w: 130, kind: "io", label: "a と b を表示" },
              { id: "end", x: 80, y: 236, w: 60, kind: "terminal", label: "終了" },
            ]}
            edges={[
              { pts: [[80, 23], [80, 42]] },
              { pts: [[145, 50], [177, 50]], kind: "call", label: "呼ぶ", labelAt: [160, 40] },
              { pts: [[227, 70], [227, 86]] },
              { pts: [[177, 100], [158, 100], [158, 64], [145, 64]], kind: "call", label: "返す", labelAt: [158, 84] },
              { pts: [[80, 70], [80, 136]] },
              { pts: [[145, 150], [227, 150], [227, 124]], kind: "call", label: "もう一度呼ぶ", labelAt: [190, 150] },
              { pts: [[80, 164], [80, 180]] },
              { pts: [[80, 208], [80, 225]] },
            ]}
          />
        }
      >
        <ol className="space-y-2 text-sm leading-relaxed text-gray-700" data-testid="fn-steps">
          <li>
            <b className="text-gray-900">① 呼び出す</b>：<code className="font-mono">税込(800)</code> で関数へジャンプ
          </li>
          <li>
            <b className="text-gray-900">② 関数の中で処理</b>：<code className="font-mono">結果 ← 800×1.1</code>
          </li>
          <li>
            <b className="text-gray-900">③ 結果を返す</b>：880 がメインの a に入り、<b className="text-gray-900">続きから</b>実行
          </li>
          <li>
            同じ関数を <code className="font-mono">税込(1200)</code> でも使える（→ 1320）
          </li>
        </ol>
      </Pair>

      <div className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="fn-before-after">
        <div className="rounded-xl p-3 ring-1 ring-gray-200">
          <p className="text-[13px] font-bold text-gray-900">関数を使わない</p>
          <pre className="mt-1 font-mono text-[12px] leading-[1.8] text-gray-800">
            {"a ← 800 × 1.1\nb ← 1200 × 1.1\nc ← 500 × 1.1"}
          </pre>
          <p className="mt-1 text-[12px] leading-snug text-gray-600">同じ計算を3回書く。税率が変わると<b className="text-gray-900">3か所</b>直す</p>
        </div>
        <div className="rounded-xl p-3 ring-2 ring-gray-900">
          <p className="text-[13px] font-bold text-gray-900">関数を使う</p>
          <pre className="mt-1 font-mono text-[12px] leading-[1.8] text-gray-800">
            {"関数 税込(価格)：価格 × 1.1 を返す\na ← 税込(800)\nb ← 税込(1200)\nc ← 税込(500)"}
          </pre>
          <p className="mt-1 text-[12px] leading-snug text-gray-600">計算は<b className="text-gray-900">1回だけ定義</b>して3回呼ぶ。直すのは<b className="text-gray-900">1か所</b></p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs" data-testid="fn-compare">
        {TERMS.map((c) => (
          <div key={c.name} className={`rounded-lg px-2.5 py-2 ${c.hit ? "ring-2 ring-gray-900" : "ring-1 ring-gray-200"}`}>
            <p className="text-[13px] font-bold text-gray-900">{c.name}</p>
            <p className="mt-0.5 leading-snug text-gray-700">{c.note}</p>
            <code className="mt-0.5 block font-mono text-[11px] text-gray-500">{c.ex}</code>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function ProgrammingBasicsExperience() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        プログラムは、コンピュータへの命令を<b>上から順に並べたもの</b>。
        どんなプログラムも<b>順次・分岐・反復</b>の3つの形の組み合わせでできています。
        同じフロー図の描き方で、1つずつ見ていきます。
      </div>

      <OverallPanel />
      <SequencePanel />
      <BranchPanel />
      <LoopPanel />
      <FunctionPanel />

      <Panel>
        <SectionTitle step={6}>書いたプログラムを機械語に翻訳する</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          CPUが直接わかるのは<b className="text-gray-900">機械語（0と1）</b>だけ。人が書いたプログラムは、翻訳役のソフトが機械語にします。
        </p>
        <p className="my-4 text-base font-bold leading-relaxed text-gray-900" data-testid="trans-lead">
          見るポイント：翻訳役によって<span className="underline decoration-amber-400 decoration-2 underline-offset-4">「翻訳」と「実行」の順番</span>が違う。
          まとめて翻訳してから実行するか、1行ずつ翻訳しながら実行するか。
        </p>
        <TranslateStage reducedMotion={reducedMotion} />
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200" data-testid="trans-summary">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-2.5 py-1.5 text-left font-bold">翻訳役</th>
                <th className="px-2 py-1.5 text-left font-bold">何を・どう翻訳する？</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["アセンブラ", "アセンブリ言語（記号）→ 機械語。1対1で置き換え"],
                ["コンパイラ", "高水準言語 → 機械語。全体をまとめて翻訳してから実行"],
                ["インタプリタ", "高水準言語を1行ずつ翻訳しながら実行"],
                ["リンカ", "翻訳ではなく、翻訳済みの部品をつなげて実行ファイルにする"],
              ].map(([name, what]) => (
                <tr key={name} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-bold text-gray-800">{name}</td>
                  <td className="px-2 py-1.5 text-gray-600">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <SectionTitle step={7}>データの書き方 ＝ JSON・XML・HTML・CSV</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          プログラム同士やWebでデータをやりとりするときの<b className="text-gray-800">書き方（データ記述言語）</b>です。形式を切り替えて見比べよう。
        </p>
        <div className="mt-3">
          <DataFormatStage />
        </div>
        <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
          <InlineIcon name="flag" />見分け方：<b>キーと値の組</b>→JSON ／ <b>自由に決めたタグ</b>→XML ／ <b>Webページの構造</b>→HTML ／ <b>カンマ区切りの表</b>→CSV
        </div>
      </Panel>
    </div>
  );
}
