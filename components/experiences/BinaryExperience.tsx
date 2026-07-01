"use client";

import { useMemo, useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「2進数とデータ量の単位」専用の体験コンポーネント。
//
// 固定のカード図解ではなく、手を動かして気づける流れにする:
//   ① 数えてみる   … 10進と2進を並べ「2が出てこない」誤解を最初に解く
//   ② 位と重み     … 10進253の分解 → 2進は重みが2倍ずつ
//   ③ ランプ足し算 … 光ったランプ(1)の重みを足すと10進になる（2進→10進）
//   ④ 2で割る      … 10進→2進を1ステップずつ実演（余りを下から読む）
//   ⑤ データ量の単位 … ビット→バイト→KB→MB→GB
// ============================================================================

const WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];

// ---------------------------------------------------------------------------
// ① 数えてみる
// ---------------------------------------------------------------------------
function CountingDemo() {
  const MAX = 5; // 掴みなので 5 まで（3桁ぶん）
  const PLACES = [4, 2, 1];
  const [n, setN] = useState(0);
  const [prev, setPrev] = useState(0);

  const toBits = (v: number) => [(v >> 2) & 1, (v >> 1) & 1, v & 1];
  const cur = toBits(n);
  const before = toBits(prev);
  const changed = cur.map((b, i) => b !== before[i]);

  const go = (next: number) => {
    setPrev(n);
    setN(next);
  };

  const note = (() => {
    if (n === 0) return "「＋1」で 1ずつ増やしてみよう（5まで）。各桁の動きに注目！";
    const flips = changed.filter(Boolean).length;
    if (n > prev && flips > 1)
      return "🔁 くり上がり発生！ 下の桁が 1→0 にもどり、上の桁へ 1 すすみました（10進で 9→10 と同じ）。";
    if (n > prev) return "1の位が 0→1 に変わっただけ。";
    return `10進の ${n} は、2進だと ${n.toString(2)}。`;
  })();

  return (
    <Panel>
      <SectionTitle step={1}>まず数えてみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「＋1」で1ずつ増やすと、各桁（けた）がどう動くか見えます。
        <b className="text-gray-800">「2」になると上の桁へくり上がる</b>のがポイント。だから2進数には 2 が出てきません。
      </p>

      <div className="mt-4 flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-xs text-sky-700">10進数</div>
          <div className="font-mono text-4xl font-extrabold text-sky-800">{n}</div>
        </div>
        <div className="pb-1 text-2xl text-gray-300">=</div>
        <div>
          <div className="mb-1 flex justify-center gap-1.5">
            {PLACES.map((w) => (
              <span key={w} className="w-11 text-center text-[10px] text-gray-400">
                {w}の位
              </span>
            ))}
          </div>
          <div className="flex justify-center gap-1.5">
            {cur.map((b, i) => (
              <span
                key={i}
                className={`grid h-11 w-11 place-items-center rounded-lg border-2 font-mono text-2xl font-extrabold transition ${
                  changed[i]
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {b}
              </span>
            ))}
          </div>
          <div className="mt-1 text-center text-[10px] text-indigo-500">
            2進数（光った桁が今動いた所）
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={() => go(Math.max(0, n - 1))}
          disabled={n === 0}
          className="rounded-lg px-3 py-2 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95 disabled:opacity-40"
        >
          − 1
        </button>
        <button
          onClick={() => go(Math.min(MAX, n + 1))}
          disabled={n === MAX}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
        >
          ＋ 1 ふやす
        </button>
        <button
          onClick={() => {
            setPrev(0);
            setN(0);
          }}
          className="rounded-lg px-3 py-2 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
        >
          0にもどす
        </button>
      </div>

      <p className="mt-3 min-h-[3em] text-center text-sm font-medium text-gray-700">{note}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: MAX + 1 }, (_, i) => (
          <span
            key={i}
            className={`rounded-md px-2 py-0.5 font-mono text-xs ${
              i === n ? "bg-indigo-600 font-bold text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {i}={i.toString(2)}
          </span>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 位と重み
// ---------------------------------------------------------------------------
function PlaceValue() {
  return (
    <Panel>
      <SectionTitle step={2}>すべての基本：位（くらい）と「重み」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        じつは10進数も「<b className="text-gray-800">位の重み × その桁の数字</b>」の足し算です。たとえば
        <b className="text-gray-800"> 253</b> は…
      </p>

      <div className="mt-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="flex items-end justify-center gap-2 font-mono">
          {[
            { d: "2", w: "×100" },
            { d: "5", w: "×10" },
            { d: "3", w: "×1" },
          ].map((c, i) => (
            <div key={i} className="text-center">
              <div className="grid h-12 w-12 place-items-center rounded-lg border-2 border-gray-300 bg-white text-2xl font-extrabold">
                {c.d}
              </div>
              <div className="mt-1 text-xs text-indigo-600">{c.w}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center font-mono text-sm text-indigo-700">
          = 200 + 50 + 3 = <b>253</b>
        </p>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        2進数も<b className="text-gray-800">まったく同じ</b>。ちがいは、位の重みが
        <b className="text-gray-800"> 2倍ずつ</b>増えること。
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1 font-mono">
        {WEIGHTS.slice().reverse().map((w, i) => (
          <span key={w} className="flex items-center gap-1">
            <span className="rounded-md bg-indigo-50 px-2 py-1 text-sm font-extrabold text-indigo-700 ring-1 ring-indigo-200">
              {w}
            </span>
            {i < WEIGHTS.length - 1 && <span className="text-xs text-gray-400">×2→</span>}
          </span>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ ランプ足し算（2進 → 10進）
// ---------------------------------------------------------------------------
type AddStep = { hl: number; running: number; html: string; done?: boolean };

function buildAddSteps(bits: number[]): AddStep[] {
  const steps: AddStep[] = [];
  let running = 0;
  steps.push({
    hl: -1,
    running: 0,
    html: "光っているランプ（1）の重みを、<b>左から順に</b>足していきます。「次へ」で1つずつ。",
  });
  WEIGHTS.forEach((w, i) => {
    const on = bits[i] === 1;
    if (on) running += w;
    steps.push({
      hl: i,
      running,
      html: on
        ? `${w} の位は <b>1</b> → 合計に ${w} を足す → 合計 <b>${running}</b>`
        : `${w} の位は 0 → 足さない（合計 ${running} のまま）`,
    });
  });
  const parts = WEIGHTS.filter((_, i) => bits[i]);
  steps.push({
    hl: -1,
    running,
    done: true,
    html: parts.length
      ? `ぜんぶ足すと ${parts.join(" + ")} = <b>${running}</b>。これが10進数！`
      : "ランプがぜんぶ消えているので 0。",
  });
  return steps;
}

function LampAdder() {
  const [bits, setBits] = useState<number[]>(Array(8).fill(0));
  const [idx, setIdx] = useState(0);
  const steps = useMemo(() => buildAddSteps(bits), [bits]);
  const st = steps[Math.min(idx, steps.length - 1)];
  const dec = bits.reduce((s, v, i) => s + v * WEIGHTS[i], 0);

  const updateBits = (next: number[]) => {
    setBits(next);
    setIdx(0);
  };
  const toggle = (i: number) =>
    updateBits(bits.map((b, j) => (j === i ? (b ? 0 : 1) : b)));
  const setPreset = (value: number) =>
    updateBits(WEIGHTS.map((_, i) => (value >> (7 - i)) & 1));

  return (
    <Panel>
      <SectionTitle step={3}>ランプを光らせて 2進 → 10進</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        考え方はカンタン。<b className="text-gray-800">「光っているランプの数字を、左から順に足すだけ」</b>。
        ランプを押して数を作り、「次へ」で<b className="text-gray-800">足し算の過程</b>を見よう。
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500">おてほん：</span>
        {[
          { label: "ぜんぶ消す", v: 0 },
          { label: "5", v: 5 },
          { label: "13", v: 13 },
          { label: "ぜんぶ光らす", v: 255 },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p.v)}
            className="rounded-lg px-2.5 py-1 font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ランプは1行に収める（各桁の対応が見やすい） */}
      <div className="mt-3 flex justify-center gap-1">
        {WEIGHTS.map((w, i) => {
          const on = bits[i] === 1;
          const hot = st.hl === i;
          return (
            <button
              key={w}
              onClick={() => toggle(i)}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-lg py-1.5 ring-2 transition active:scale-95 ${
                on ? "bg-indigo-600 ring-indigo-600" : "bg-gray-50 ring-gray-300"
              } ${hot ? "scale-110 !ring-amber-400" : ""}`}
            >
              <span className={`font-mono text-[9px] ${on ? "text-indigo-100" : "text-gray-400"}`}>
                {w}
              </span>
              <span className="text-base leading-none">{on ? "💡" : "⚫️"}</span>
              <span className={`font-mono text-xs font-bold ${on ? "text-white" : "text-gray-400"}`}>
                {bits[i]}
              </span>
            </button>
          );
        })}
      </div>

      {/* 計算の過程 */}
      <p
        className="mt-3 min-h-[3em] rounded-xl bg-emerald-50 px-4 py-3 text-center font-mono text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200 [&_b]:text-base [&_b]:text-emerald-700"
        dangerouslySetInnerHTML={{ __html: st.html }}
      />

      <StepNav
        index={idx}
        total={steps.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="合計が10進数 🎉"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-indigo-50 p-3 text-center ring-1 ring-indigo-200">
          <div className="text-xs text-indigo-700">2進数</div>
          <div className="break-all font-mono text-xl font-extrabold text-indigo-800">
            {bits.join("")}
          </div>
        </div>
        <div className="rounded-xl bg-sky-50 p-3 text-center ring-1 ring-sky-200">
          <div className="text-xs text-sky-700">10進数</div>
          <div className="font-mono text-xl font-extrabold text-sky-800">{dec}</div>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 2で割って2進数にする（1ステップずつ）
// ---------------------------------------------------------------------------
type DivStep = {
  rows: { calc: string; q: number; r: number }[];
  fresh: number;
  html: string;
  done?: boolean;
  bin?: string;
};

function buildDivSteps(n: number): DivStep[] {
  const steps: DivStep[] = [];
  steps.push({
    rows: [],
    fresh: -1,
    html: `<b>${n}</b> を2進数にしてみよう。やり方は「2で割って、余りをメモ」のくり返しだけ。`,
  });
  const rows: { calc: string; q: number; r: number }[] = [];
  const rems: number[] = [];
  let x = n;
  if (n === 0) {
    rows.push({ calc: "0 ÷ 2", q: 0, r: 0 });
    rems.push(0);
    steps.push({ rows: rows.slice(), fresh: 0, html: "0 ÷ 2 = 商0、<em>余り 0</em>。" });
  }
  while (x > 0) {
    const q = Math.floor(x / 2);
    const r = x % 2;
    rows.push({ calc: `${x} ÷ 2`, q, r });
    rems.push(r);
    steps.push({
      rows: rows.slice(),
      fresh: rows.length - 1,
      html: `${x} ÷ 2 = 商 ${q}、<em>余り ${r}</em>。${
        q === 0 ? " 商が0になったので割り算おわり！" : " この余りをメモして、商をまた2で割ります。"
      }`,
    });
    x = q;
  }
  const bin = rems.slice().reverse().join("");
  steps.push({
    rows: rows.slice(),
    fresh: -1,
    html: "メモした余りを <em>↑ 下から上へ</em> 読むと… 完成！",
    done: true,
    bin,
  });
  return steps;
}

function DivideToBinary() {
  const [decN, setDecN] = useState(13);
  const [idx, setIdx] = useState(0);
  const steps = useMemo(() => buildDivSteps(decN), [decN]);
  const st = steps[Math.min(idx, steps.length - 1)];

  const reset = (n: number) => {
    setDecN(n);
    setIdx(0);
  };

  return (
    <Panel>
      <SectionTitle step={4}>逆向き：10進 → 2進（2で割って余り）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        やり方は1つだけ：<b className="text-gray-800">2で割って、余り（0か1）をメモ</b>。これをくり返すだけ。「次へ」で1ステップずつ進みます。
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">変える数：</span>
        <input
          type="number"
          min={0}
          max={255}
          value={decN}
          onChange={(e) => {
            let v = parseInt(e.target.value, 10);
            if (Number.isNaN(v) || v < 0) v = 0;
            if (v > 255) v = 255;
            reset(v);
          }}
          className="w-20 rounded-lg border-2 border-gray-300 px-2 py-1.5 text-center font-mono text-lg font-bold focus:border-indigo-500 focus:outline-none"
        />
        {[13, 10, 25, 100].map((v) => (
          <button
            key={v}
            onClick={() => reset(v)}
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
          >
            {v}
          </button>
        ))}
      </div>

      <p
        className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_em]:font-bold [&_em]:not-italic [&_em]:text-indigo-700"
        dangerouslySetInnerHTML={{ __html: st.html }}
      />

      {st.rows.length > 0 && (
        <table className="mx-auto mt-3 w-full max-w-xs overflow-hidden rounded-lg font-mono text-sm ring-1 ring-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-2 py-1.5 font-bold">計算</th>
              <th className="px-2 py-1.5 font-bold">商</th>
              <th className="px-2 py-1.5 font-bold">余り</th>
            </tr>
          </thead>
          <tbody>
            {st.rows.map((r, i) => (
              <tr
                key={i}
                className={`border-t border-gray-200 text-center ${
                  st.fresh === i ? "bg-emerald-50" : ""
                }`}
              >
                <td className="px-2 py-1.5">{r.calc}</td>
                <td className="px-2 py-1.5">{r.q}</td>
                <td className="px-2 py-1.5 font-extrabold text-indigo-700">{r.r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {st.done && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-center font-mono ring-1 ring-emerald-200">
          {decN}（10進）＝ <b className="text-xl text-emerald-700">{st.bin}</b>（2進）
        </p>
      )}

      <StepNav
        index={idx}
        total={steps.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
        onReset={() => setIdx(0)}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ データ量の単位
// ---------------------------------------------------------------------------
function DataUnits() {
  const units = [
    { u: "ビット (bit)", v: "0か1ひとつ", img: "情報の最小単位", accent: "text-gray-700" },
    { u: "バイト (byte)", v: "8ビット", img: "半角文字 約1文字", accent: "text-indigo-700" },
    { u: "キロバイト (KB)", v: "約1,000バイト", img: "短い文章", accent: "text-indigo-700" },
    { u: "メガバイト (MB)", v: "約1,000KB", img: "写真1枚", accent: "text-indigo-700" },
    { u: "ギガバイト (GB)", v: "約1,000MB", img: "動画・たくさんの写真", accent: "text-indigo-700" },
  ];
  return (
    <Panel>
      <SectionTitle step={5}>データ量の単位：ビットとバイト</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        さっきのランプ<b className="text-gray-800">8個ぶん（8ビット）が「1バイト」</b>。ここから
        KB → MB → GB と、1段あがるごとに<b className="text-gray-800">約1,000倍</b>ずつ大きくなります。
      </p>

      <div className="mt-3 flex items-center justify-center gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="text-lg">
            💡
          </span>
        ))}
        <span className="ml-2 font-mono text-sm font-bold text-indigo-700">= 1バイト</span>
      </div>

      <ul className="mt-4 space-y-2">
        {units.map((u, i) => (
          <li
            key={u.u}
            className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200"
          >
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-indigo-100 font-mono text-xs font-bold text-indigo-700">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className={`text-sm font-extrabold ${u.accent}`}>{u.u}</div>
              <div className="font-mono text-xs text-gray-500">{u.v}</div>
            </div>
            <div className="text-right text-xs text-gray-500">{u.img}</div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 小さい順に <b>ビット &lt; バイト &lt; KB &lt; MB &lt; GB</b>。スマホの「◯GB」も、もとをたどればすべて
        0と1（ビット）の集まりです。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 全体
// ---------------------------------------------------------------------------
export default function BinaryExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 答え：<b>0と1を何桁も並べる</b>と、数・文字・命令をすべて表現できるから。8桁（8ビット）だけで 256通り、16桁なら 65,536通りも表せます。コンピュータはこの組み合わせを毎秒何十億回も処理することで、複雑な計算を実現しています。
      </div>
      <CountingDemo />
      <PlaceValue />
      <LampAdder />
      <DivideToBinary />
      <DataUnits />
    </div>
  );
}
