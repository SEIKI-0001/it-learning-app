"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BitGroups, HexLetters, Pow, WeightBoxes } from "./binary/BitBoxes";
import { Lead } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「2進数とデータ量の単位」専用の解説。進数変換が中心。
//   すべての変換を「同じ数 44（101100）」で行い、表し方が違うだけで同じ数だと分かるようにする。
//   1枚＝見出し＋大きな図＋答え1行（黒帯）＋小さな補足1行。手順リストや長文は置かない。
//   桁の重みは「32(2⁵)」のように、数字の右に小さく 2ⁿ を添える。
//   ① 1・2・4・8…の箱に 0か1を入れる
//   ② 2進数 → 10進数：1 の箱の数字だけ足す
//   ③ 10進数 → 2進数：÷2 を1行ずつ、余りが入る箱（1の箱から順）を横に書く
//   ④ 8進数・16進数：右から3桁・4桁ずつ区切る（足りない左は0）
//   ⑤ 本試験：2進数どうしの足し算は、10進数に直して計算
//   ⑥ ビットとバイト
// 変換の教え方は、複数の資格学習サイト・教科書の説明原理（重みの和／÷2の余りを逆順／
// 3bit・4bit単位のグループ化）を参考に、このアプリの部品で独自に組み立てている。
// ============================================================================

const DEC = 44;
const BIN = "101100";

/** 数と、その右下に基数 */
function Num({ v, base }: { v: string | number; base: 2 | 8 | 10 | 16 }) {
  return (
    <span className="whitespace-nowrap font-mono font-bold">
      {v}
      <sub className="ml-0.5 font-sans text-[0.6em] font-bold text-gray-500">({base})</sub>
    </span>
  );
}

/** 答えの1行（黒帯） */
function Answer({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-xl bg-gray-900 px-4 py-3 text-center text-lg font-bold leading-snug text-white">{children}</p>;
}

/** 補足の1行（小さく） */
function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-center text-xs leading-relaxed text-gray-600">{children}</p>;
}

// ---------------------------------------------------------------------------
// ① 桁の重み
// ---------------------------------------------------------------------------

function WeightsPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>2進数は「1・2・4・8…の箱」に 0か1を入れる</SectionTitle>
      <div className="mt-5" data-testid="binary-weights">
        <WeightBoxes bits={BIN} />
      </div>
      <p className="mt-2 text-center text-sm font-bold text-gray-700">← 左へ行くほど 2倍</p>
      <Answer>
        1 の箱を足すと 32＋8＋4＝<span className="text-brand-300">44</span>
      </Answer>
      <Hint>（ ）は「2を何回かけたか」。1＝2⁰、2＝2¹、4＝2²…</Hint>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 2進数 → 10進数
// ---------------------------------------------------------------------------

function BinToDecPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>2進数 → 10進数：1 の箱の数字だけ足す</SectionTitle>
      <div className="mt-5" data-testid="binary-read">
        <WeightBoxes bits={BIN} sum />
      </div>
      <Answer>
        <Num v={BIN} base={2} /> ＝ 32＋8＋4 ＝ <Num v={DEC} base={10} />
      </Answer>
      <Hint>1 の「個数」（3個）ではなく、箱の数字を足す。</Hint>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 10進数 → 2進数
// ---------------------------------------------------------------------------

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
    <ol className="mx-auto mt-4 w-fit space-y-1.5" aria-label="44 を 2 で割り続け、余りを右の箱から入れる" data-testid="binary-division">
      {rows.map((r, i) => (
        <li key={r.n} className="grid grid-cols-[5.5rem_auto_auto] items-center gap-2">
          <span className="whitespace-nowrap text-right font-mono text-base font-bold tabular-nums text-gray-900">{r.n} ÷ 2</span>
          <span className="flex items-center gap-1 whitespace-nowrap text-xs font-bold text-gray-500">
            余り
            <span
              className={`grid h-8 w-8 place-items-center rounded-md font-mono text-lg font-bold ${
                r.r ? "bg-brand-600 text-white" : "bg-white text-gray-400 ring-1 ring-inset ring-gray-300"
              }`}
              data-testid="binary-remainder"
            >
              {r.r}
            </span>
          </span>
          <span className="whitespace-nowrap text-sm font-bold text-gray-700" data-testid="binary-remainder-box">
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
    <Panel>
      <SectionTitle step={3}>10進数 → 2進数：2で割った余りを、右の箱から入れる</SectionTitle>
      <DivisionLadder />
      <p className="mt-4 text-center text-xs font-bold text-gray-500">商（割った答え）が 0 になるまで割る（44→22→11→5→2→1→0）</p>
      <div className="mt-3">
        <WeightBoxes bits={BIN} />
      </div>
      <Answer>
        <Num v={DEC} base={10} /> ＝ <Num v={BIN} base={2} />
      </Answer>
      <Hint>最初の余りが一番右（1の箱）。筆算で「余りを下から読む」のと同じこと。</Hint>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 8進数・16進数
// ---------------------------------------------------------------------------

function OctHexPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>8進数・16進数：右から区切るだけ</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 px-1 py-3 ring-1 ring-gray-200" data-testid="binary-oct">
          <p className="mb-2 text-center text-sm font-bold text-gray-900">8進数＝3桁ずつ</p>
          <BitGroups bits={BIN} size={3} values={["5", "4"]} />
          <p className="mt-2 text-center">
            <Num v="54" base={8} />
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 px-1 py-3 ring-1 ring-gray-200" data-testid="binary-hex">
          <p className="mb-2 text-center text-sm font-bold text-gray-900">16進数＝4桁ずつ</p>
          <BitGroups bits={BIN} size={4} values={["2", "C"]} />
          <p className="mt-2 text-center">
            <Num v="2C" base={16} />
          </p>
        </div>
      </div>
      <HexLetters mark="C" />
      <Hint>足りない左は 0 で埋める（点線）。逆向きは1桁を3桁・4桁に戻して並べるだけ。</Hint>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 本試験：2進数の足し算
// ---------------------------------------------------------------------------

function ExamPanel() {
  return (
    <Panel>
      <SectionTitle step={5}>本試験：2進数どうしの足し算</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「倉庫Aに2進数で <b className="font-mono text-gray-800">1101</b> 個、倉庫Bに <b className="font-mono text-gray-800">1011</b> 個。合わせて何個？」のように出ます。
        <b className="text-gray-800">まず10進数に直す</b>のがコツ。
      </p>
      <ol className="mt-3 space-y-1 font-mono text-sm tabular-nums text-gray-800" data-testid="binary-exam">
        <li>1101 → 8 ＋ 4 ＋ 1 ＝ 13</li>
        <li>1011 → 8 ＋ 2 ＋ 1 ＝ 11</li>
        <li className="font-bold text-gray-900">13 ＋ 11 ＝ 24</li>
        <li>2進数で答えるなら：24 ＝ 16 ＋ 8 → 11000</li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-gray-600">
        2進数のまま足すときは、1の桁で <b className="font-mono">1 ＋ 1 ＝ 10</b>（2 になったら上の桁へ繰り上がる）。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ ビットとバイト
// ---------------------------------------------------------------------------

function BytePanel() {
  return (
    <Panel>
      <SectionTitle step={6}>ビットとバイト</SectionTitle>
      <dl className="mt-3 divide-y divide-gray-200 border-y border-gray-200 text-sm" data-testid="binary-units">
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-2">
          <dt className="font-bold text-gray-900">1ビット（bit）</dt>
          <dd className="text-gray-700">0 か 1 の1桁。情報の最小単位</dd>
        </div>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-2">
          <dt className="font-bold text-gray-900">1バイト（Byte）</dt>
          <dd className="text-gray-700">
            <b className="text-gray-900">8ビット</b>。0/1 の箱8個ひとまとまり。<Pow n={8} />＝<b className="text-gray-900">256通り</b>を表せる
          </dd>
        </div>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-2">
          <dt className="font-bold text-gray-900">KB・MB・GB・TB</dt>
          <dd className="text-gray-700">バイトが約1,000倍ずつ大きくなる単位</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-800 ring-1 ring-gray-200">
        通信速度の計算では、Byte を bit に直すために <b className="font-mono">×8</b> します（200MByte × 8 ＝ 1,600Mbit）。
        <Link href="/topics/tech-lan-wan" className="mt-1 block text-right text-xs font-bold text-brand-700 underline">
          転送時間の計算（LANとWAN）へ →
        </Link>
      </div>
    </Panel>
  );
}

export default function BinaryExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        2進数は<b>1・2・4・8…の箱</b>で読みます。例はずっと<b>同じ数 44</b>。
      </Lead>
      <WeightsPanel />
      <BinToDecPanel />
      <DecToBinPanel />
      <OctHexPanel />
      <ExamPanel />
      <BytePanel />
    </div>
  );
}
