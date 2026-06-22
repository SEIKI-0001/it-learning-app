"use client";

import { useMemo, useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「アルゴリズムとフローチャート」専用の体験。
//
//   ① アルゴリズムとは … 手順（レシピ）のたとえ
//   ② 3つの基本構造   … 順次・分岐・繰り返し
//   ③ トレース体験     … 「1からNまでの合計」をフローチャートで1歩ずつ実行し、
//                        変数（箱）の中身が変わる様子を見る（本体）
// ============================================================================

// ---------------------------------------------------------------------------
// トレースの生成（1〜Nの合計）
// ---------------------------------------------------------------------------
type TraceStep = {
  node: string;
  msg: string;
  goukei: number | null;
  i: number | null;
  changed: "goukei" | "i" | null;
};

function genTrace(N: number): TraceStep[] {
  const steps: TraceStep[] = [];
  let goukei: number | null = null;
  let i: number | null = null;
  const push = (node: string, msg: string, changed: "goukei" | "i" | null = null) =>
    steps.push({ node, msg, goukei, i, changed });

  push("start", "プログラムを始めます。スタート！");
  goukei = 0;
  push("a", "「合計」という箱を用意して 0 を入れます。まだ何も足していないので 0。", "goukei");
  i = 1;
  push("b", "「i」の箱に 1 を入れます。i は“今いくつ目を足すか”を数える係。", "i");

  // 無限ループ防止のガード（N は 1..9 なので十分）
  for (let guard = 0; guard < 100; guard++) {
    const cond = (i as number) <= N;
    push(
      "c",
      cond
        ? `判断：i (${i}) は N (${N}) 以下？ → はい。足し算へ進みます。`
        : `判断：i (${i}) は N (${N}) 以下？ → いいえ。くりかえし終了！`,
    );
    if (!cond) break;
    const before = goukei as number;
    goukei = before + (i as number);
    push("d", `合計に i を足す： ${before} ＋ ${i} ＝ ${goukei}`, "goukei");
    i = (i as number) + 1;
    push("e", `i を 1 ふやして ${i} に。次の数の準備。`, "i");
  }
  push("f", `くりかえしが終わったので合計を表示： ${goukei}！（1+2+…+${N} ＝ ${goukei}）`);
  push("end", "おわり。おつかれさまでした！");
  return steps;
}

// ---------------------------------------------------------------------------
// フローチャートの1ノード
// ---------------------------------------------------------------------------
// フローチャートの記号は形で意味を表す:
//   端子(だ円) / 処理(長方形) / 判断(ひし形) / 入出力(平行四辺形)
const DIAMOND = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
const PARALLELOGRAM = "polygon(14% 0, 100% 0, 86% 100%, 0 100%)";

function Node({
  active,
  kind,
  children,
}: {
  active: boolean;
  kind: "term" | "proc" | "cond" | "io";
  children: React.ReactNode;
}) {
  // 判断：ひし形（2枚重ねで枠線を表現）
  if (kind === "cond") {
    return (
      <div className="relative mx-auto h-[88px] w-60">
        <div
          className="absolute inset-0"
          style={{ clipPath: DIAMOND, background: active ? "#4f46e5" : "#f59e0b" }}
        />
        <div
          className="absolute inset-[3px]"
          style={{ clipPath: DIAMOND, background: active ? "#4f46e5" : "#fffbeb" }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <span className={`text-sm font-bold ${active ? "text-white" : "text-gray-700"}`}>
            {children}
          </span>
        </div>
      </div>
    );
  }
  // 入出力：平行四辺形
  if (kind === "io") {
    return (
      <div className="relative mx-auto h-12 w-56">
        <div
          className="absolute inset-0"
          style={{ clipPath: PARALLELOGRAM, background: active ? "#4f46e5" : "#cbd5e1" }}
        />
        <div
          className="absolute inset-[2px]"
          style={{ clipPath: PARALLELOGRAM, background: active ? "#4f46e5" : "#f8fafc" }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <span className={`text-sm font-bold ${active ? "text-white" : "text-gray-700"}`}>
            {children}
          </span>
        </div>
      </div>
    );
  }
  // 端子（だ円）／処理（長方形）
  const shape = kind === "term" ? "rounded-full" : "rounded-md";
  const color = active
    ? "bg-indigo-600 text-white ring-2 ring-indigo-600 shadow-lg shadow-indigo-200"
    : "bg-gray-50 text-gray-700 ring-2 ring-gray-300";
  return (
    <div
      className={`mx-auto w-full max-w-[230px] px-3 py-2 text-center text-sm font-bold transition ${shape} ${color}`}
    >
      {children}
    </div>
  );
}

// チートシート用の小さな記号アイコン（実際の形で見せる）
function ShapeIcon({ kind }: { kind: "term" | "proc" | "cond" | "io" }) {
  if (kind === "cond") {
    return (
      <span
        className="inline-block h-9 w-12 flex-none"
        style={{ clipPath: DIAMOND, background: "#fffbeb", boxShadow: "inset 0 0 0 2px #f59e0b" }}
      />
    );
  }
  if (kind === "io") {
    return (
      <span
        className="inline-block h-7 w-12 flex-none"
        style={{ clipPath: PARALLELOGRAM, background: "#f1f5f9", boxShadow: "inset 0 0 0 2px #94a3b8" }}
      />
    );
  }
  const shape = kind === "term" ? "rounded-full" : "rounded-sm";
  return <span className={`inline-block h-7 w-12 flex-none border-2 border-gray-400 bg-gray-50 ${shape}`} />;
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center text-gray-400">
      {label && <span className="text-[11px] font-bold text-gray-500">{label}</span>}
      <span className="leading-none">▼</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ③ トレース体験
// ---------------------------------------------------------------------------
function AlgorithmTrace() {
  const [N, setN] = useState(5);
  const [idx, setIdx] = useState(0);
  const steps = useMemo(() => genTrace(N), [N]);
  const st = steps[Math.min(idx, steps.length - 1)];
  const cur = st.node;

  return (
    <Panel>
      <SectionTitle step={3}>動かして理解：1からNまでの合計</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        «1から N までの数をぜんぶ足す» 手順です。
        <b className="text-gray-800">「次へ」で1ステップずつ進み</b>、フローチャートの今いる場所が光り、
        <b className="text-gray-800">箱（変数）の中身</b>が変わります。
      </p>

      {/* N セレクタ */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-gray-500">N＝</span>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => {
              setN(n);
              setIdx(0);
            }}
            className={`h-8 w-8 rounded-lg font-mono text-sm font-bold active:scale-95 ${
              n === N ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* 変数の箱 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <VarBox name="合計" note="足し算をためる箱" value={st.goukei} changed={st.changed === "goukei"} />
        <VarBox name="i（アイ）" note="今いくつ目かを数える" value={st.i} changed={st.changed === "i"} />
      </div>

      {/* 実況メッセージ */}
      <p className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200">
        {st.msg}
      </p>

      <StepNav
        index={idx}
        total={steps.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="完了 🎉"
      />

      {/* フローチャート */}
      <div className="mt-5 space-y-1.5 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <Node active={cur === "start"} kind="term">
          スタート
        </Node>
        <Arrow />
        <Node active={cur === "a"} kind="proc">
          合計 ← 0
        </Node>
        <Arrow />
        <Node active={cur === "b"} kind="proc">
          i ← 1
        </Node>
        <Arrow />
        {/* 繰り返しブロック */}
        <div className="rounded-xl border-l-4 border-indigo-200 bg-white/60 py-2 pl-2">
          <Node active={cur === "c"} kind="cond">
            i ≦ N ？
          </Node>
          <Arrow label="はい" />
          <Node active={cur === "d"} kind="proc">
            合計 ← 合計 ＋ i
          </Node>
          <Arrow />
          <Node active={cur === "e"} kind="proc">
            i ← i ＋ 1
          </Node>
          <p className="mt-1 text-center text-[11px] font-bold text-indigo-500">
            ↑ i ≦ N の間くりかえす
          </p>
        </div>
        <Arrow label="いいえ" />
        <Node active={cur === "f"} kind="io">
          「合計」を表示
        </Node>
        <Arrow />
        <Node active={cur === "end"} kind="term">
          おわり
        </Node>
      </div>
    </Panel>
  );
}

function VarBox({
  name,
  note,
  value,
  changed,
}: {
  name: string;
  note: string;
  value: number | null;
  changed: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center ring-1 transition ${
        changed ? "bg-indigo-50 ring-indigo-300" : "bg-gray-50 ring-gray-200"
      }`}
    >
      <div className="font-mono text-xs text-gray-500">{name}</div>
      <div
        className={`mx-auto mt-1 w-16 rounded-lg border-2 border-dashed py-1 font-mono text-2xl font-extrabold ${
          changed ? "border-indigo-400 bg-white text-indigo-700" : "border-gray-300 bg-white text-gray-700"
        }`}
      >
        {value === null ? "—" : value}
      </div>
      <div className="mt-1 text-[11px] text-gray-400">{note}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 全体
// ---------------------------------------------------------------------------
export default function AlgorithmExperience() {
  const structures = [
    { t: "① 順次（じゅんじ）", d: "上から順番に1つずつ実行。いちばん基本。", ex: "A → B → C" },
    { t: "② 選択（分岐）", d: "条件で道が分かれる。「もし〜なら」。", ex: "もし雨なら傘を持つ" },
    { t: "③ 繰り返し（反復）", d: "条件のあいだ同じ処理をくり返す。", ex: "10回になるまでジャンプ" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🍛 アルゴリズムとは <b>「目的をやりとげる手順」</b>。料理のレシピと同じです。フローチャートは、その手順を
        箱と矢印で<b>見える化した図</b>。ITパスポートでは「流れを正しく読む」ことが問われます。
      </div>

      <Panel>
        <SectionTitle emoji="🧱">たった3つの組み合わせでできている</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          どんなに複雑なプログラムも、この<b className="text-gray-800">3パターン</b>の組み合わせだけ。
        </p>
        <ul className="mt-3 space-y-2">
          {structures.map((s) => (
            <li key={s.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-extrabold text-gray-800">{s.t}</div>
              <div className="mt-0.5 text-sm text-gray-600">{s.d}</div>
              <div className="mt-1 inline-block rounded-md bg-white px-2 py-0.5 font-mono text-xs text-indigo-700 ring-1 ring-gray-200">
                {s.ex}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <AlgorithmTrace />

      <Panel>
        <SectionTitle emoji="🔷">フローチャートの記号</SectionTitle>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {(
            [
              { kind: "term", s: "端子", d: "開始・終了" },
              { kind: "proc", s: "処理", d: "計算や代入" },
              { kind: "cond", s: "判断", d: "条件で分岐" },
              { kind: "io", s: "入出力", d: "入力・表示" },
            ] as const
          ).map((x) => (
            <li
              key={x.s}
              className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200"
            >
              <ShapeIcon kind={x.kind} />
              <div>
                <div className="font-bold text-gray-800">{x.s}</div>
                <div className="text-xs text-gray-500">{x.d}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          ※ 「← (矢印)」は<b>代入</b>。<span className="font-mono">合計 ← 合計 ＋ i</span> は「今の合計に i を足した値を、あらためて合計に入れ直す」という意味です（＝ではありません）。
        </p>
      </Panel>
    </div>
  );
}
