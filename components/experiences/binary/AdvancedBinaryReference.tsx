import type { ReactNode } from "react";
import { BitGroups, HexLetters, Pow, WeightBoxes } from "./BitBoxes";

const DEC = 44;
const BIN = "101100";

/** 数と、その右下に基数 */
function Num({ v, base }: { v: string | number; base: 2 | 8 | 10 | 16 }) {
  return (
    <span className="whitespace-nowrap font-mono font-bold">
      {v}
      <sub className="ml-0.5 font-sans text-[0.6em] font-bold text-gray-500">
        ({base})
      </sub>
    </span>
  );
}

/** 答えの1行（黒帯） */
function Answer({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-xl bg-gray-900 px-4 py-3 text-center text-lg font-bold leading-snug text-white">
      {children}
    </p>
  );
}

/** 補足の1行（小さく） */
function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-center text-xs leading-relaxed text-gray-600">
      {children}
    </p>
  );
}

/** n を2で割り続けた記録（割られる数・商・余り） */
function divisionSteps(n: number) {
  const rows: { n: number; q: number; r: number }[] = [];
  let x = n;
  while (x > 0) {
    rows.push({ n: x, q: Math.floor(x / 2), r: x % 2 });
    x = Math.floor(x / 2);
  }
  return rows;
}

/** ÷2 を1行ずつ。余りがどの箱（重み）に入るかを横に書く */
function DivisionLadder() {
  const rows = divisionSteps(DEC);
  return (
    <ol
      className="mx-auto mt-4 w-fit space-y-1.5"
      aria-label="44 を 2 で割り続け、余りを右の箱から入れる"
      data-testid="binary-division"
    >
      {rows.map((r, i) => (
        <li
          key={r.n}
          className="grid grid-cols-[auto_auto_auto] items-center gap-1"
        >
          <span className="whitespace-nowrap text-right font-mono text-base font-bold tabular-nums text-gray-900">
            {r.n} ÷ 2
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-xs font-bold text-gray-500">
            余り
            <span
              className={`grid h-8 w-8 place-items-center rounded-md font-mono text-lg font-bold ${
                r.r
                  ? "bg-brand-600 text-white"
                  : "bg-white text-gray-400 ring-1 ring-inset ring-gray-300"
              }`}
              data-testid="binary-remainder"
            >
              {r.r}
            </span>
          </span>
          <span
            className="whitespace-nowrap text-sm font-bold text-gray-700"
            data-testid="binary-remainder-box"
          >
            → <span className="font-mono text-lg text-gray-900">{2 ** i}</span>
            <span className="text-[11px] text-gray-400">
              (<Pow n={i} />)
            </span>
            の箱
          </span>
        </li>
      ))}
    </ol>
  );
}

function DecToBinPanel() {
  return (
    <section className="mt-4">
      <h4 className="text-base font-bold text-gray-900">
        10進数 → 2進数：2で割った余りを、右の箱から入れる
      </h4>
      <DivisionLadder />
      <p className="mt-4 text-center text-xs font-bold text-gray-500">
        商（割った答え）が 0 になるまで割る（44→22→11→5→2→1→0）
      </p>
      <div className="mt-3">
        <WeightBoxes bits={BIN} />
      </div>
      <Answer>
        <Num v={DEC} base={10} /> ＝ <Num v={BIN} base={2} />
      </Answer>
      <Hint>
        最初の余りが一番右（1の箱）。筆算で「余りを下から読む」のと同じこと。
      </Hint>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ④ 8進数・16進数
// ---------------------------------------------------------------------------

function OctHexPanel() {
  return (
    <section className="mt-4">
      <h4 className="text-base font-bold text-gray-900">
        8進数・16進数：右から区切るだけ
      </h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div
          className="rounded-xl bg-gray-50 px-1 py-3 ring-1 ring-gray-200"
          data-testid="binary-oct"
        >
          <p className="mb-2 text-center text-sm font-bold text-gray-900">
            8進数＝3桁ずつ
          </p>
          <BitGroups bits={BIN} size={3} values={["5", "4"]} />
          <p className="mt-2 text-center">
            <Num v="54" base={8} />
          </p>
        </div>
        <div
          className="rounded-xl bg-gray-50 px-1 py-3 ring-1 ring-gray-200"
          data-testid="binary-hex"
        >
          <p className="mb-2 text-center text-sm font-bold text-gray-900">
            16進数＝4桁ずつ
          </p>
          <BitGroups bits={BIN} size={4} values={["2", "C"]} />
          <p className="mt-2 text-center">
            <Num v="2C" base={16} />
          </p>
        </div>
      </div>
      <HexLetters mark="C" />
      <Hint>
        足りない左は 0
        で埋める（点線）。逆向きは1桁を3桁・4桁に戻して並べるだけ。
      </Hint>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 本試験：2進数の足し算
// ---------------------------------------------------------------------------

function ExamPanel() {
  return (
    <section className="mt-4">
      <h4 className="text-base font-bold text-gray-900">
        本試験：2進数どうしの足し算
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「倉庫Aに2進数で <b className="font-mono text-gray-800">1101</b>{" "}
        個、倉庫Bに <b className="font-mono text-gray-800">1011</b>{" "}
        個。合わせて何個？」のように出ます。
        <b className="text-gray-800">まず10進数に直す</b>のがコツ。
      </p>
      <ol
        className="mt-3 space-y-1 font-mono text-sm tabular-nums text-gray-800"
        data-testid="binary-exam"
      >
        <li>1101 → 8 ＋ 4 ＋ 1 ＝ 13</li>
        <li>1011 → 8 ＋ 2 ＋ 1 ＝ 11</li>
        <li className="font-bold text-gray-900">13 ＋ 11 ＝ 24</li>
        <li>2進数で答えるなら：24 ＝ 16 ＋ 8 → 11000</li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-gray-600">
        2進数のまま足すときは、1の桁で <b className="font-mono">1 ＋ 1 ＝ 10</b>
        （2 になったら上の桁へ繰り上がる）。
      </p>
    </section>
  );
}

export default function AdvancedBinaryReference() {
  return (
    <div className="space-y-6">
      <details className="rounded-xl border border-gray-200 p-4">
        <summary className="cursor-pointer font-bold text-gray-900">
          大きい数を2進数にする方法（44の例）
        </summary>
        <DecToBinPanel />
      </details>
      <details className="rounded-xl border border-gray-200 p-4">
        <summary className="cursor-pointer font-bold text-gray-900">
          8進数・16進数への変換
        </summary>
        <OctHexPanel />
      </details>
      <details className="rounded-xl border border-gray-200 p-4">
        <summary className="cursor-pointer font-bold text-gray-900">
          2進数どうしの足し算
        </summary>
        <ExamPanel />
      </details>
    </div>
  );
}
