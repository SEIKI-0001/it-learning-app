"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BitBoxes, BitGroup, Pow } from "./binary/BitBoxes";
import { Lead } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「2進数とデータ量の単位」専用の解説。進数変換が中心。
//   すべての変換を「同じ数 44」で行い、表し方が違うだけで同じ数だと分かるようにする。
//   （44 は、割り算の余りを上から読むと 001101 になり「下から読む」の大切さが見える／
//    16進数では左を0で埋める必要がある、という2つの落とし穴を1つで見せられる数）
//   ① 桁の重み：各桁の箱に 2ⁿ と値（128〜1）。左へ行くほど2倍
//   ② 2進数 → 10進数：1 の桁の重みだけを足す
//   ③ 10進数 → 2進数：2で割り続け、余りを下から上へ読む（筆算の形）
//   ④ 2進数 ⇄ 8進数：8＝2³ → 右から3桁ずつ
//   ⑤ 2進数 ⇄ 16進数：16＝2⁴ → 右から4桁ずつ（足りない左は0で埋める）
//   ⑥ 同じ数の4つの表し方
//   ⑦ 本試験：2進数どうしの足し算は、10進数に直して計算
//   ⑧ ビットとバイト
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

function Rule({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-xl bg-gray-900 px-4 py-3 text-center text-[15px] font-bold leading-snug text-white">{children}</p>;
}

function StepList({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-800">
          <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-gray-900 text-[11px] font-bold text-white">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// ① 桁の重み
// ---------------------------------------------------------------------------

function WeightsPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>2進数の「桁の重み」は 2ⁿ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        2進数は<b className="text-gray-800">0と1だけ</b>で数を表します。各桁には<b className="text-gray-800">重み</b>があり、右端が
        <b className="text-gray-800"> 2⁰＝1</b>、左へ1つ進むごとに<b className="text-gray-800">2倍</b>になります。
      </p>
      <div className="mt-4" data-testid="binary-weights">
        <BitBoxes bits="00101100" label="8桁の2進数 00101100。各桁の重みは左から 2の7乗=128、64、32、16、8、4、2、2の0乗=1" />
      </div>
      <p className="mt-2 text-center text-sm text-gray-700">
        1 が入っている桁（青）の重みを足すと、この数は <b className="whitespace-nowrap text-gray-900">32 ＋ 8 ＋ 4 ＝ 44</b>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
          <b className="text-gray-900">10進数</b>
          <div className="text-gray-700">0〜9 の10種類。桁は ×10</div>
          <div className="mt-0.5 font-mono text-xs font-bold text-gray-900">… 100・10・1</div>
        </div>
        <div className="rounded-lg bg-brand-50 px-3 py-2 ring-1 ring-brand-200">
          <b className="text-gray-900">2進数</b>
          <div className="text-gray-700">0と1 の2種類。桁は ×2</div>
          <div className="mt-0.5 font-mono text-xs font-bold text-gray-900">… 8・4・2・1</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-600">
        この解説では、ずっと<b className="text-gray-900">同じ数 44</b> を使って、10進数・2進数・8進数・16進数を行き来します。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 2進数 → 10進数
// ---------------------------------------------------------------------------

function BinToDecPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>2進数 → 10進数：1 の桁の重みを足す</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <Num v={BIN} base={2} /> を10進数にします。
      </p>
      <StepList
        steps={[
          <>各桁の下に、重み（右から 1・2・4・8・16・32）を書く</>,
          <>
            <b className="text-gray-900">1 になっている桁の重みだけ</b>を拾う（0 の桁は 0）
          </>,
          <>拾った重みを全部足す</>,
        ]}
      />
      <div className="mt-4" data-testid="binary-read">
        <BitBoxes bits={BIN} sumRow label={`2進数 ${BIN}。1の桁は 32、8、4`} />
      </div>
      <Rule>
        <Num v={BIN} base={2} /> ＝ <Num v={DEC} base={10} />
      </Rule>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        よくある間違い：1 の<b>個数</b>（3個）を答えてしまう。数えるのではなく、重みを<b>足します</b>。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 10進数 → 2進数
// ---------------------------------------------------------------------------

/** 44 を2で割り続けた記録（割られる数・余り） */
function divisionSteps(n: number) {
  const rows: { n: number; q: number; r: number }[] = [];
  let x = n;
  while (x > 0) {
    rows.push({ n: x, q: Math.floor(x / 2), r: x % 2 });
    x = Math.floor(x / 2);
  }
  return rows;
}

function DecToBinPanel() {
  const rows = divisionSteps(DEC);
  const upward = rows.map((r) => r.r).reverse().join("");
  const downward = rows.map((r) => r.r).join("");
  return (
    <Panel>
      <SectionTitle step={3}>10進数 → 2進数：2で割って、余りを下から読む</SectionTitle>
      <StepList
        steps={[
          <>2 で割り、余り（0 か 1）を右に書く</>,
          <>商をまた 2 で割る。商が 0 になるまで繰り返す</>,
          <>
            余りを<b className="text-rose-700">下から上へ</b>読む
          </>,
        ]}
      />

      <div className="mt-4 flex items-stretch justify-center gap-3" data-testid="binary-division">
        <table className="font-mono text-lg tabular-nums">
          <caption className="sr-only">44 を 2 で割り続ける筆算</caption>
          <thead>
            <tr className="text-xs font-bold text-gray-500">
              <th className="px-1 pb-1 text-right font-sans" />
              <th className="px-2 pb-1 text-right font-sans">割られる数</th>
              <th className="px-2 pb-1 text-left font-sans">余り</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n}>
                <td className="px-1 text-right font-bold text-gray-500">2 )</td>
                <td className="border-b border-l border-gray-900 px-2 py-1 text-right font-bold text-gray-900">{r.n}</td>
                <td className="px-2 py-1 text-left">
                  <span className="font-sans text-xs text-gray-500">… </span>
                  <span className="inline-grid h-7 w-7 place-items-center rounded bg-brand-600 font-bold text-white" data-testid="binary-remainder">
                    {r.r}
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <td />
              <td className="px-2 py-1 text-right font-bold text-gray-400">0</td>
              <td className="px-2 py-1 text-left font-sans text-xs text-gray-500">← 0 になったら終わり</td>
            </tr>
          </tbody>
        </table>
        {/* 余りを下から上へ読む矢印 */}
        <div className="flex flex-col items-center pb-9 pt-7" aria-hidden>
          <span className="h-0 w-0 border-x-[9px] border-b-[12px] border-x-transparent border-b-rose-600" />
          <span className="w-[3px] flex-1 bg-rose-600" />
          <span className="mt-1 text-xs font-bold text-rose-700 [writing-mode:vertical-rl]">下から上へ読む</span>
        </div>
      </div>

      <Rule>
        <Num v={DEC} base={10} /> ＝ <Num v={upward} base={2} />
      </Rule>
      <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200">
        <b>✕ 上から読むと {downward}</b>（＝13）になってしまう。最初に出た余りが、いちばん右（1の桁）です。
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        確かめ算：{upward} は ② の方法で 32 ＋ 8 ＋ 4 ＝ 44。ちゃんと戻ります。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 2進数 ⇄ 8進数
// ---------------------------------------------------------------------------

function MiniTable({ rows, cols, testId }: { rows: [string, string][]; cols: number; testId: string }) {
  return (
    <ul className="mt-2 grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} data-testid={testId}>
      {rows.map(([b, v]) => (
        <li key={b} className={`rounded-md px-1 py-1 ring-1 ${/[A-F]/.test(v) ? "bg-brand-50 ring-brand-200" : "bg-white ring-gray-200"}`}>
          <div className="font-mono text-xs font-bold text-gray-600">{b}</div>
          <div className="font-mono text-base font-bold text-gray-900">{v}</div>
        </li>
      ))}
    </ul>
  );
}

const pad = (s: string, n: number) => s.padStart(n, "0");

function OctPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>2進数 ⇄ 8進数：3桁ずつ</SectionTitle>
      <Rule>
        8 ＝ <Pow n={3} /> なので、<span className="whitespace-nowrap">2進数 3桁 ＝ 8進数 1桁</span>
      </Rule>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        <b className="text-gray-900">2進数 → 8進数</b>：<b className="text-gray-900">右から3桁ずつ</b>区切り、それぞれを 4・2・1 の重みで読む。
      </p>
      <div className="mt-3 flex items-start justify-center gap-2" data-testid="binary-oct">
        <BitGroup bits="101" value="5" caption="4＋1" />
        <BitGroup bits="100" value="4" caption="4" />
      </div>
      <Rule>
        <Num v={BIN} base={2} /> ＝ <Num v="54" base={8} />
      </Rule>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        <b className="text-gray-900">8進数 → 2進数</b>：逆に、8進数の<b className="text-gray-900">1桁を3桁の2進数に戻して</b>並べるだけ。5 → 101、4 → 100 で 101100。
      </p>
      <p className="mt-3 text-xs font-bold text-gray-600">3桁の対応表（0〜7）</p>
      <MiniTable cols={4} testId="binary-oct-table" rows={Array.from({ length: 8 }, (_, i) => [pad(i.toString(2), 3), String(i)])} />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 2進数 ⇄ 16進数
// ---------------------------------------------------------------------------

function HexPanel() {
  return (
    <Panel>
      <SectionTitle step={5}>2進数 ⇄ 16進数：4桁ずつ</SectionTitle>
      <Rule>
        16 ＝ <Pow n={4} /> なので、<span className="whitespace-nowrap">2進数 4桁 ＝ 16進数 1桁</span>
      </Rule>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        <b className="text-gray-900">2進数 → 16進数</b>：<b className="text-gray-900">右から4桁ずつ</b>区切り、8・4・2・1 の重みで読む。
        左端が4桁に足りなければ、<b className="text-gray-900">左に 0 を足して</b>4桁にそろえる（点線）。
      </p>
      <div className="mt-3 flex items-start justify-center gap-2" data-testid="binary-hex">
        <BitGroup bits="0010" padded={2} value="2" caption="2" />
        <BitGroup bits="1100" value="C" caption="8＋4＝12 → C" />
      </div>
      <Rule>
        <Num v={BIN} base={2} /> ＝ <Num v="2C" base={16} />
      </Rule>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        16進数は1桁で 0〜15 を表すため、<b className="text-gray-900">10〜15 を A〜F</b> と書きます。
        <b className="text-gray-900">16進数 → 2進数</b>は、1桁を4桁の2進数に戻すだけ（2 → 0010、C → 1100）。
      </p>
      <p className="mt-3 text-xs font-bold text-gray-600">4桁の対応表（0〜F）</p>
      <MiniTable
        cols={4}
        testId="binary-hex-table"
        rows={Array.from({ length: 16 }, (_, i) => [pad(i.toString(2), 4), i.toString(16).toUpperCase()])}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 同じ数の4つの表し方
// ---------------------------------------------------------------------------

function SummaryPanel() {
  return (
    <Panel>
      <SectionTitle step={6}>表し方が違うだけで、同じ数</SectionTitle>
      <div className="mx-auto mt-4 max-w-sm" data-testid="binary-summary">
        <div className="rounded-xl bg-white px-3 py-2.5 text-center ring-1 ring-gray-300">
          <div className="text-xs font-bold text-gray-500">10進数</div>
          <div className="text-2xl">
            <Num v={DEC} base={10} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 py-1.5 text-[11px] font-bold leading-tight text-gray-600">
          <div className="text-right">↑ 1の桁の重みを足す</div>
          <div>↓ 2で割って余りを下から</div>
        </div>
        <div className="rounded-xl bg-gray-900 px-3 py-2.5 text-center text-white">
          <div className="text-xs font-bold text-gray-300">2進数（変換の中心）</div>
          <div className="font-mono text-2xl font-bold">
            {BIN}
            <sub className="ml-0.5 font-sans text-[0.6em] text-gray-300">(2)</sub>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1.5">
          <div className="text-center">
            <div className="text-[11px] font-bold text-gray-600">↕ 3桁ずつ</div>
            <div className="mt-1 rounded-xl bg-white px-2 py-2 ring-1 ring-gray-300">
              <div className="text-xs font-bold text-gray-500">8進数</div>
              <div className="text-2xl">
                <Num v="54" base={8} />
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-bold text-gray-600">↕ 4桁ずつ</div>
            <div className="mt-1 rounded-xl bg-white px-2 py-2 ring-1 ring-gray-300">
              <div className="text-xs font-bold text-gray-500">16進数</div>
              <div className="text-2xl">
                <Num v="2C" base={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        8進数や16進数と10進数を行き来するときも、<b className="text-gray-900">いったん2進数を経由</b>すれば、ここまでの方法だけで変換できます。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑦ 本試験：2進数の足し算
// ---------------------------------------------------------------------------

function ExamPanel() {
  return (
    <Panel>
      <SectionTitle step={7}>本試験：2進数どうしの足し算</SectionTitle>
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
// ⑧ ビットとバイト
// ---------------------------------------------------------------------------

function BytePanel() {
  return (
    <Panel>
      <SectionTitle step={8}>ビットとバイト</SectionTitle>
      <dl className="mt-3 divide-y divide-gray-200 border-y border-gray-200 text-sm" data-testid="binary-units">
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-2">
          <dt className="font-bold text-gray-900">1ビット（bit）</dt>
          <dd className="text-gray-700">0 か 1 の1桁。情報の最小単位</dd>
        </div>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-2">
          <dt className="font-bold text-gray-900">1バイト（Byte）</dt>
          <dd className="text-gray-700">
            <b className="text-gray-900">8ビット</b>。① の8個の箱ひとまとまり。<Pow n={8} />＝<b className="text-gray-900">256通り</b>を表せる
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
        2進数は、各桁の<b>重み（1・2・4・8…）</b>で読みます。この解説では<b>同じ数 44</b> を使い、
        <b>2進数 ⇄ 10進数・8進数・16進数</b>の変換方法を順に確かめます。
      </Lead>
      <WeightsPanel />
      <BinToDecPanel />
      <DecToBinPanel />
      <OctPanel />
      <HexPanel />
      <SummaryPanel />
      <ExamPanel />
      <BytePanel />
    </div>
  );
}
