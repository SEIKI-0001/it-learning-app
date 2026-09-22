"use client";

import { useRef, useState, type ReactNode } from "react";
import { Frame, Program, Replay, useAutoTimeline, type Line } from "./LifeStages";
import life from "./life.module.css";
import styles from "./exam.module.css";

// 確認問題（下のテスト）を解ける所まで持っていくための追加ステージ。
//   NumberBranchStage … 数の条件（a ≧ 5）で、表示されるのはどちらか一方だけ
//   SumLoopStage      … カウンタ i と 合計 を書き換えながらくり返し、i が上限を超えたら抜ける
//   FunctionStage     … 手順のまとまりに名前をつけ、呼び出す → 中身を実行 → 戻る
//   TranslateStage    … コンパイラ／インタプリタ／アセンブラ（＋リンカ）が機械語にする様子
//   DataFormatStage   … 同じデータを JSON／XML／HTML／CSV で書き比べる
// どれも LifeStages と同じく、選ぶのは条件だけで自動で進む（ボタンで1歩ずつは進めない）。

function Toggles<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => ReactNode;
}) {
  return (
    <div className={life.toggleRow}>
      <span>{label}</span>
      {options.map((o) => (
        <button key={String(o)} type="button" aria-pressed={value === o} onClick={() => onChange(o)} className={life.toggle}>
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function VarCell({ name, value, testId }: { name: string; value: ReactNode; testId: string }) {
  return (
    <div className={styles.varCell}>
      <span className={styles.varName}>{name}</span>
      <span className={styles.varValue} data-testid={testId} key={String(value)}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 条件分岐（数）：a ≧ 5 なら B、そうでなければ C
// ---------------------------------------------------------------------------

const A_OPTIONS = [3, 5, 7] as const;
const THRESHOLD = 5;

export function NumberBranchStage({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [a, setA] = useState<(typeof A_OPTIONS)[number]>(7);
  const [run, setRun] = useState(0);
  const t = useAutoTimeline(4, 1700, `${a}-${run}`, reducedMotion, ref);
  const phase = t.phase;
  const yes = a >= THRESHOLD;
  const out = yes ? "B" : "C";
  const decided = phase >= 2;

  const lines: Line[] = [
    { text: <>a ← <b>{a}</b></> },
    { text: <>もし a ≧ {THRESHOLD} なら</> },
    { text: <>「B」を表示</>, indent: true, skipped: decided && !yes },
    { text: <>そうでなければ</> },
    { text: <>「C」を表示</>, indent: true, skipped: decided && yes },
  ];
  const current = phase === 0 ? 0 : phase === 1 ? 1 : yes ? 2 : 4;

  const judge = (
    <>
      {a} ≧ {THRESHOLD} ？ → <b>{yes ? "はい" : "いいえ"}</b>
    </>
  );

  return (
    <Frame
      caption={
        phase === 0 ? (
          <>変数 a に <b>{a}</b> を入れる。</>
        ) : phase === 1 ? (
          <>
            a の中身は {a}。{judge}
            {a === THRESHOLD && <>（「≧＝以上」は <b>{THRESHOLD}も含む</b>）</>}
          </>
        ) : phase === 2 ? (
          <>
            {yes ? "はい" : "いいえ"}なので「{out}」を表示の行<b>だけ</b>実行。もう片方の行は<b>飛ばす</b>。
          </>
        ) : (
          <>
            画面に出るのは「<b>{out}</b>」だけ。条件分岐では<b>どちらか一方</b>しか実行されない。
          </>
        )
      }
      captionTestId="numbranch-caption"
      footer={
        <>
          <Program lines={lines} current={current} testId="numbranch-program" />
          <Replay done={t.done} onReplay={() => setRun((r) => r + 1)} reducedMotion={reducedMotion} phase={phase} count={4} onPhase={t.setPhase} label="数の条件分岐" />
        </>
      }
    >
      <Toggles label="a に入れる数：" options={A_OPTIONS} value={a} onChange={(v) => { setA(v); setRun((r) => r + 1); }} format={(v) => v} />
      <div ref={ref} className={styles.row} data-testid="numbranch-stage" data-phase={phase}>
        <VarCell name="a" value={a} testId="numbranch-a" />
        <span className={styles.arrow} aria-hidden>→</span>
        <div className={styles.judge} data-active={phase === 1 ? "true" : "false"} data-result={phase >= 1 ? (yes ? "yes" : "no") : "none"}>
          <span>a ≧ {THRESHOLD} ？</span>
          <b>{phase >= 1 ? (yes ? "はい" : "いいえ") : "…"}</b>
        </div>
        <span className={styles.arrow} aria-hidden>→</span>
        <div className={styles.screen} data-on={phase >= 3 ? "true" : "false"} data-testid="numbranch-output">
          <small>画面</small>
          <b>{phase >= 3 ? out : ""}</b>
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 繰り返し（合計）：i が上限以下の間、合計に i を足す
// ---------------------------------------------------------------------------

type SumStep = { line: number; i: number | null; total: number | null; added: number[]; caption: ReactNode; judge?: boolean };

function buildSumTrace(limit: number): SumStep[] {
  const steps: SumStep[] = [
    { line: 0, i: null, total: 0, added: [], caption: <>〈合計〉の箱に <b>0</b> を入れる（最初の値＝初期値）。</> },
    { line: 1, i: 1, total: 0, added: [], caption: <>〈i〉に <b>1</b>。i は「いま何番目か」を数える係（カウンタ）。</> },
  ];
  let i = 1;
  let total = 0;
  const added: number[] = [];
  while (i <= limit) {
    steps.push({ line: 2, i, total, added: [...added], judge: true, caption: <>i は {i}。{i} ≦ {limit} ？ → <b>はい</b>。中の2行を実行する。</> });
    const old = total;
    total += i;
    added.push(i);
    steps.push({ line: 3, i, total, added: [...added], caption: <>合計 ← {old} ＋ {i} ＝ <b>{total}</b></> });
    steps.push({ line: 4, i: i + 1, total, added: [...added], caption: <>i ← {i} ＋ 1 ＝ <b>{i + 1}</b>。条件の行へ戻る。</> });
    i += 1;
  }
  steps.push({ line: 2, i, total, added: [...added], judge: false, caption: <>i は {i}。{i} ≦ {limit} ？ → <b>いいえ</b>。くり返しを抜ける（{i}は足さない）。</> });
  steps.push({ line: 5, i, total, added: [...added], caption: <>合計 <b>{total}</b> を表示。最後の i は {i} だけど、答えは<b>合計の箱</b>の中身。</> });
  return steps;
}

const SUM_LIMITS = [3, 4] as const;

export function SumLoopStage({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState<(typeof SUM_LIMITS)[number]>(3);
  const [run, setRun] = useState(0);
  const trace = buildSumTrace(limit);
  const t = useAutoTimeline(trace.length, 1700, `${limit}-${run}`, reducedMotion, ref);
  const cur = trace[t.phase];

  const lines: Line[] = [
    { text: <>合計 ← 0</> },
    { text: <>i ← 1</> },
    { text: <>i ≦ <b>{limit}</b> の間、くり返す</> },
    { text: <>合計 ← 合計 ＋ i</>, indent: true },
    { text: <>i ← i ＋ 1</>, indent: true },
    { text: <>合計を表示</> },
  ];

  return (
    <Frame
      caption={cur.caption}
      captionTestId="sum-caption"
      footer={
        <>
          <Program lines={lines} current={cur.line} testId="sum-program" />
          <Replay done={t.done} onReplay={() => setRun((r) => r + 1)} reducedMotion={reducedMotion} phase={t.phase} count={trace.length} onPhase={t.setPhase} label="合計のくり返し" />
        </>
      }
    >
      <Toggles label="くり返す条件：" options={SUM_LIMITS} value={limit} onChange={(v) => { setLimit(v); setRun((r) => r + 1); }} format={(v) => `i ≦ ${v}`} />
      <div ref={ref} className={styles.sumStage} data-testid="sum-stage" data-line={cur.line}>
        <div className={styles.row}>
          <VarCell name="i" value={cur.i ?? "？"} testId="sum-i" />
          <div className={styles.judge} data-active={cur.judge !== undefined ? "true" : "false"} data-result={cur.judge === undefined ? "none" : cur.judge ? "yes" : "no"}>
            <span>i ≦ {limit} ？</span>
            <b>{cur.judge === undefined ? "―" : cur.judge ? "はい" : "いいえ"}</b>
          </div>
          <VarCell name="合計" value={cur.total ?? "？"} testId="sum-total" />
        </div>
        <p className={styles.sumLine} data-testid="sum-added">
          {cur.added.length === 0 ? "足した数：まだなし" : <>足した数：{cur.added.join(" ＋ ")} ＝ <b>{cur.total}</b></>}
        </p>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 関数：手順のまとまりに名前をつけて呼び出す
// ---------------------------------------------------------------------------

type FnScene = { main: number | null; def: number | null; caption: ReactNode };

const FN_SCENES: FnScene[] = [
  { main: null, def: null, caption: <>「顔を洗う・歯をみがく・着替える」に<b>「身支度」という名前</b>をつけてまとめた。これが<b>関数</b>。</> },
  { main: 0, def: null, caption: <>月曜：<b>身支度()</b> の1行で関数を<b>呼び出す</b>。</> },
  { main: 0, def: 0, caption: <>関数の中へジャンプして、中身を上から順に実行…</> },
  { main: 0, def: 1, caption: <>関数の中へジャンプして、中身を上から順に実行…</> },
  { main: 0, def: 2, caption: <>関数の中へジャンプして、中身を上から順に実行…</> },
  { main: 1, def: null, caption: <>終わったら呼んだ所へ<b>戻って</b>次の行へ。火曜も <b>身支度()</b> の1行だけ。</> },
  { main: 1, def: 0, caption: <>同じ中身をもう一度実行。3行を書き直す必要はない。</> },
  { main: 1, def: 1, caption: <>同じ中身をもう一度実行。3行を書き直す必要はない。</> },
  { main: 1, def: 2, caption: <>同じ中身をもう一度実行。3行を書き直す必要はない。</> },
  { main: 2, def: null, caption: <>まとめた処理を<b>名前で何度でも呼び出せる</b>。これが<b>関数（サブルーチン）</b>。</> },
];

export function FunctionStage({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const t = useAutoTimeline(FN_SCENES.length, 1300, String(run), reducedMotion, ref);
  const s = FN_SCENES[t.phase];
  const inside = s.def !== null;

  const main: Line[] = [{ text: <>月曜：<b>身支度()</b></> }, { text: <>火曜：<b>身支度()</b></> }, { text: <>出発！</> }];
  const def: Line[] = [{ text: <>顔を洗う</>, indent: true }, { text: <>歯をみがく</>, indent: true }, { text: <>着替える</>, indent: true }];

  return (
    <Frame
      caption={s.caption}
      captionTestId="fn-caption"
      footer={<Replay done={t.done} onReplay={() => setRun((r) => r + 1)} reducedMotion={reducedMotion} phase={t.phase} count={FN_SCENES.length} onPhase={t.setPhase} label="関数" />}
    >
      <div ref={ref} className={styles.fnStage} data-testid="fn-stage" data-inside={inside ? "true" : "false"}>
        <div className={styles.fnBox} data-active={!inside && s.main !== null ? "true" : "false"}>
          <p className={styles.fnHead}>いつもの流れ（呼び出す側）</p>
          <Program lines={main} current={inside ? null : s.main} testId="fn-main" />
        </div>
        <p className={styles.fnJump} data-on={inside ? "true" : "false"} aria-hidden>
          {inside ? "↓ 呼び出し中（終わったら ↑ 戻る）" : "↕"}
        </p>
        <div className={styles.fnBox} data-active={inside ? "true" : "false"}>
          <p className={styles.fnHead}>
            関数 <b>身支度()</b> の中身
          </p>
          <Program lines={def} current={s.def} testId="fn-def" />
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 翻訳：書いたプログラム → 機械語
// ---------------------------------------------------------------------------

type TransMode = "compiler" | "interpreter" | "assembler";
const TRANS_MODES: TransMode[] = ["compiler", "interpreter", "assembler"];
const TRANS_LABEL: Record<TransMode, string> = { compiler: "コンパイラ", interpreter: "インタプリタ", assembler: "アセンブラ" };

const HIGH_SRC = ["合計 ← 0", "合計 ← 合計 + 5", "合計を表示"];
const ASM_SRC = ["MOV A, 0", "ADD A, 5", "OUT A"];
const MACHINE = ["0011 1110 0000", "1100 0110 0101", "1101 0011 0001"];

/** 各場面での、行ごとの状態（0=まだ / 1=翻訳済み / 2=実行済み）と、翻訳役が動いているか */
type TransScene = { rows: [number, number, number]; working: boolean; linked?: boolean; caption: ReactNode };

function transScenes(mode: TransMode): TransScene[] {
  if (mode === "compiler") {
    return [
      { rows: [0, 0, 0], working: false, caption: <>人が読める<b>高水準言語</b>で書いた。でもCPUがわかるのは<b>機械語（0と1）</b>だけ。</> },
      { rows: [1, 0, 0], working: true, caption: <>コンパイラが<b>全部まとめて</b>翻訳する…（まだ実行しない）</> },
      { rows: [1, 1, 0], working: true, caption: <>コンパイラが<b>全部まとめて</b>翻訳する…（まだ実行しない）</> },
      { rows: [1, 1, 1], working: true, caption: <>全行を翻訳し終えた。本を1冊まるごと翻訳してから出版するイメージ。</> },
      { rows: [1, 1, 1], working: false, linked: true, caption: <><b>リンカ</b>が、翻訳済みの部品（ライブラリ）とつなげて<b>実行ファイル</b>にする。</> },
      { rows: [2, 2, 2], working: false, linked: true, caption: <>実行ファイルを動かす。翻訳は済んでいるので<b>実行が速い</b>。</> },
    ];
  }
  if (mode === "interpreter") {
    return [
      { rows: [0, 0, 0], working: false, caption: <>同じ<b>高水準言語</b>のプログラム。インタプリタは翻訳のしかたが違う。</> },
      { rows: [1, 0, 0], working: true, caption: <>1行目を翻訳して…</> },
      { rows: [2, 0, 0], working: false, caption: <>すぐ<b>実行</b>。次の行へ。</> },
      { rows: [2, 1, 0], working: true, caption: <>2行目を翻訳して…</> },
      { rows: [2, 2, 0], working: false, caption: <>すぐ実行。<b>1行ずつ翻訳しながら実行</b>する（同時通訳のイメージ）。</> },
      { rows: [2, 2, 1], working: true, caption: <>3行目を翻訳して…</> },
      { rows: [2, 2, 2], working: false, caption: <>すぐ試せるが、動かすたびに翻訳するぶん<b>実行は遅め</b>。</> },
    ];
  }
  return [
    { rows: [0, 0, 0], working: false, caption: <><b>アセンブリ言語</b>は、機械語の命令を <b>MOV・ADD</b> のような短い記号にしたもの。</> },
    { rows: [1, 0, 0], working: true, caption: <>アセンブラが記号を機械語に<b>1対1</b>で置き換える…</> },
    { rows: [1, 1, 0], working: true, caption: <>アセンブラが記号を機械語に<b>1対1</b>で置き換える…</> },
    { rows: [1, 1, 1], working: true, caption: <>アセンブラが記号を機械語に<b>1対1</b>で置き換える…</> },
    { rows: [2, 2, 2], working: false, caption: <>機械語になったのでCPUが実行。<b>アセンブリ言語 → アセンブラ</b> と覚える。</> },
  ];
}

export function TranslateStage({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<TransMode>("compiler");
  const [run, setRun] = useState(0);
  const scenes = transScenes(mode);
  const t = useAutoTimeline(scenes.length, 1700, `${mode}-${run}`, reducedMotion, ref);
  const s = scenes[t.phase];
  const src = mode === "assembler" ? ASM_SRC : HIGH_SRC;

  return (
    <Frame
      caption={s.caption}
      captionTestId="trans-caption"
      footer={<Replay done={t.done} onReplay={() => setRun((r) => r + 1)} reducedMotion={reducedMotion} phase={t.phase} count={scenes.length} onPhase={t.setPhase} label="翻訳" />}
    >
      <Toggles label="翻訳役：" options={TRANS_MODES} value={mode} onChange={(v) => { setMode(v); setRun((r) => r + 1); }} format={(v) => TRANS_LABEL[v]} />
      <div ref={ref} className={styles.transStage} data-testid="trans-stage" data-mode={mode}>
        <div className={styles.transHead}>
          <span>{mode === "assembler" ? "アセンブリ言語" : "高水準言語"}</span>
          <span className={styles.translator} data-working={s.working ? "true" : "false"} data-testid="trans-translator">
            {TRANS_LABEL[mode]}
          </span>
          <span>機械語</span>
        </div>
        {src.map((line, i) => {
          const st = s.rows[i];
          return (
            <div key={line} className={styles.transRow} data-state={st} data-testid={`trans-row-${i}`}>
              <code className={styles.src}>{line}</code>
              <span className={styles.transArrow} aria-hidden>
                ▶
              </span>
              <code className={styles.bin}>{st >= 1 ? MACHINE[i] : "・・・"}</code>
              <span className={styles.ran} aria-label={st === 2 ? "実行済み" : undefined}>
                {st === 2 ? "✓" : ""}
              </span>
            </div>
          );
        })}
        {mode === "compiler" && (
          <div className={styles.link} data-on={s.linked ? "true" : "false"} data-testid="trans-linker">
            <span>翻訳済み＋📦部品</span>
            <b>🔗 リンカ</b>
            <span>→ 実行ファイル</span>
          </div>
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// データの書き方：同じ商品データを4つの形式で
// ---------------------------------------------------------------------------

type Fmt = "JSON" | "XML" | "HTML" | "CSV";
const FORMATS: Fmt[] = ["JSON", "XML", "HTML", "CSV"];

const K = ({ children }: { children: ReactNode }) => <span className={styles.tKey}>{children}</span>;
const V = ({ children }: { children: ReactNode }) => <span className={styles.tVal}>{children}</span>;
const T = ({ children }: { children: ReactNode }) => <span className={styles.tTag}>{children}</span>;

const FORMAT_VIEW: Record<Fmt, { code: ReactNode; legend: ReactNode; point: ReactNode }> = {
  JSON: {
    code: (
      <>
        {"{"}
        {"\n  "}
        <K>&quot;商品名&quot;</K>: <V>&quot;ノートPC&quot;</V>,{"\n  "}
        <K>&quot;価格&quot;</K>: <V>98000</V>
        {"\n}"}
      </>
    ),
    legend: (
      <>
        <K>キー</K>：<V>値</V> の組
      </>
    ),
    point: (
      <>
        波括弧 <b>{"{ }"}</b> の中に <b>「キー: 値」の組</b>を並べる。軽くて読みやすく、<b>Web API のデータ交換</b>の定番。
      </>
    ),
  },
  XML: {
    code: (
      <>
        <T>&lt;商品&gt;</T>
        {"\n  "}
        <T>&lt;商品名&gt;</T>
        <V>ノートPC</V>
        <T>&lt;/商品名&gt;</T>
        {"\n  "}
        <T>&lt;価格&gt;</T>
        <V>98000</V>
        <T>&lt;/価格&gt;</T>
        {"\n"}
        <T>&lt;/商品&gt;</T>
      </>
    ),
    legend: (
      <>
        <T>自由に決めたタグ</T> で <V>値</V> をはさむ
      </>
    ),
    point: (
      <>
        タグの名前を<b>自分で決められる</b>。開始タグと終了タグで項目と<b>階層（入れ子）</b>を表す。
      </>
    ),
  },
  HTML: {
    code: (
      <>
        <T>&lt;h1&gt;</T>
        <V>ノートPC</V>
        <T>&lt;/h1&gt;</T>
        {"\n"}
        <T>&lt;p&gt;</T>
        <V>価格：98,000円</V>
        <T>&lt;/p&gt;</T>
      </>
    ),
    legend: (
      <>
        <T>決まったタグ</T>（h1＝見出し、p＝段落）
      </>
    ),
    point: (
      <>
        <b>Webページの文書構造</b>（見出し・段落など）を表す。タグは決められたものを使い、データ交換が目的ではない。
      </>
    ),
  },
  CSV: {
    code: (
      <>
        <K>商品名</K>,<K>価格</K>
        {"\n"}
        <V>ノートPC</V>,<V>98000</V>
      </>
    ),
    legend: (
      <>
        <K>見出し行</K> と <V>データ行</V> をカンマで区切る
      </>
    ),
    point: (
      <>
        <b>カンマ区切りの表（行と列）</b>。表計算ソフトとのやりとりに向くが、キーと値の組や入れ子は表しにくい。
      </>
    ),
  },
};

export function DataFormatStage() {
  const [fmt, setFmt] = useState<Fmt>("JSON");
  const v = FORMAT_VIEW[fmt];
  return (
    <div className={life.frame}>
      <p className={life.caption}>
        同じデータ「商品名＝ノートPC、価格＝98000」を、<b>4つの書き方</b>で比べよう。
      </p>
      <Toggles label="形式：" options={FORMATS} value={fmt} onChange={setFmt} format={(f) => f} />
      <div className={styles.fmtStage} data-testid="fmt-stage" data-format={fmt}>
        <pre className={styles.fmtCode} key={fmt}>
          <code>{v.code}</code>
        </pre>
        <p className={styles.fmtLegend}>{v.legend}</p>
        <p className={styles.fmtPoint} data-testid="fmt-point">
          {v.point}
        </p>
      </div>
    </div>
  );
}
