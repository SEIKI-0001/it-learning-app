"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "./ui";
import AdvancedBinaryReference from "./binary/AdvancedBinaryReference";

const WEIGHTS = [8, 4, 2, 1];
const buttonClass =
  "min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 aria-pressed:border-brand-600 aria-pressed:bg-brand-50 aria-pressed:text-brand-800";
const copyClass = "mt-3 text-sm leading-7 text-gray-700";

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm leading-7 text-brand-950">
      <span className="mb-1 block text-xs font-bold text-brand-700">
        ここがポイント
      </span>
      {children}
    </div>
  );
}

function BitRow({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {WEIGHTS.map((weight) => {
        const on = (value & weight) !== 0;
        const contents = (
          <>
            <span className="text-xs font-bold">{weight}の位</span>
            <span className="my-2 font-mono text-3xl font-bold">
              {on ? 1 : 0}
            </span>
            <span className="text-xs">
              {on ? `${weight}を足す` : "足さない"}
            </span>
          </>
        );
        const style = `flex min-h-28 flex-col items-center justify-center rounded-xl border-2 px-1 ${on ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 bg-gray-50 text-gray-600"}`;
        return onChange ? (
          <button
            key={weight}
            type="button"
            aria-label={`${weight}の位`}
            aria-pressed={on}
            onClick={() => onChange(value ^ weight)}
            className={`${style} transition hover:border-brand-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600`}
          >
            {contents}
          </button>
        ) : (
          <div key={weight} className={style}>
            {contents}
          </div>
        );
      })}
    </div>
  );
}

function SwitchPanel() {
  const [on, setOn] = useState(false);
  return (
    <Panel>
      <SectionTitle step={1}>0と1は、スイッチのOFFとON</SectionTitle>
      <p className={copyClass}>
        コンピュータは、電気の状態を<b>0と1の2つに区別</b>
        して情報を扱います。まずはスイッチ1個でイメージしてみましょう。
      </p>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-xs font-bold text-gray-600">押して切り替える</p>
          <button
            type="button"
            aria-label="1ビットのスイッチ"
            aria-pressed={on}
            onClick={() => setOn(!on)}
            className={`mt-3 min-h-24 w-full max-w-36 rounded-2xl border-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${on ? "border-amber-400 bg-amber-100 text-amber-950" : "border-gray-300 bg-white text-gray-700"}`}
          >
            <span className="block text-3xl" aria-hidden>
              {on ? "☀" : "○"}
            </span>
            {on ? "ON = 1" : "OFF = 0"}
          </button>
        </div>
        <span aria-hidden className="text-gray-400">
          →
        </span>
        <div className="text-center" aria-live="polite">
          <p className="text-xs font-bold text-gray-600">
            コンピュータの表し方
          </p>
          <p className="my-2 font-mono text-6xl font-bold text-gray-900">
            {on ? "1" : "0"}
          </p>
          <p className="text-xs text-gray-600">これが1ビット</p>
        </div>
      </div>
      <Takeaway>
        <b>1ビット（bit）は、0か1を入れる1つの場所。</b>
        <br />
        文字・写真・音も、たくさんの0と1の組み合わせで表します。
      </Takeaway>
      <p className="mt-3 text-xs leading-6 text-gray-500">
        ランプは仕組みを想像するためのたとえです。実際にコンピュータの中でランプが光るわけではありません。
      </p>
    </Panel>
  );
}

function PlacesPanel() {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={2}>左へ1つ進むと、位の数は2倍</SectionTitle>
      <p className={copyClass}>
        ふだんの<b>10進数</b>
        は0〜9を使い、位は右から1・10・100と10倍になります。<b>2進数</b>
        で使う数字は0と1だけ。位は右から<b>1・2・4・8</b>と2倍になります。
      </p>
      <p className="mb-3 mt-4 text-center text-xs font-bold text-brand-700">
        ← 左へ行くたびに2倍　／　右端は1の位
      </p>
      <BitRow value={5} />
      <div className="mt-4 rounded-xl bg-gray-900 p-4 text-center text-white">
        <p className="text-xs text-gray-300">1が入っている位だけを足す</p>
        <p className="mt-1 font-mono text-2xl font-bold">0101 → 4 + 1 = 5</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-700">
        「0101」は「ゼロ・イチ・ゼロ・イチ」と読めばOK。
        <b>101個という意味ではありません。</b>
        先頭の0を省いて「101」と書いても同じ5です。
      </p>
      <fieldset className="mt-5 border-t border-gray-200 pt-4">
        <legend className="pr-2 text-sm font-bold text-gray-900">
          確認：1010は、ふだんの数でいくつ？
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {["2個だから2", "8 + 2で10", "そのまま1010"].map((label, i) => (
            <button
              type="button"
              key={label}
              aria-pressed={answer === i}
              onClick={() => setAnswer(i)}
              className={buttonClass}
            >
              {label}
            </button>
          ))}
        </div>
        <p
          role="status"
          aria-label="読み方の答え合わせ"
          className="mt-3 text-sm leading-6 text-brand-900"
        >
          {answer === null
            ? "答えを選ぶと、理由を確認できます。"
            : answer === 1
              ? "正解！8の位と2の位が1なので、8 + 2 = 10です。"
              : answer === 0
                ? "数えるのは1の個数ではありません。1がある場所の値、8と2を足してみましょう。もう一度選べます。"
                : "2進数は0と1で書いた別の表し方です。右から1・2・4・8を当てはめると、8と2を足します。もう一度選べます。"}
        </p>
      </fieldset>
    </Panel>
  );
}

function BuildPanel() {
  const [value, setValue] = useState(0);
  const [target, setTarget] = useState(5);
  const [hint, setHint] = useState(false);
  const selected = WEIGHTS.filter((weight) => (value & weight) !== 0);
  return (
    <Panel>
      <SectionTitle step={3}>今度は自分で、数を作ってみよう</SectionTitle>
      <p className={copyClass}>
        各カードを押すと0と1が切り替わります。<b>足したい位を1</b>
        にして、目標の数を作りましょう。
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-gray-700">目標</span>
        {[5, 9, 15].map((n) => (
          <button
            type="button"
            key={n}
            aria-pressed={target === n}
            onClick={() => {
              setTarget(n);
              setValue(0);
              setHint(false);
            }}
            className={buttonClass}
          >
            {n}を作る
          </button>
        ))}
      </div>
      <div role="group" aria-label="2進数を作る練習" className="mt-4">
        <BitRow value={value} onChange={setValue} />
        <div
          role="status"
          className="mt-4 rounded-xl bg-gray-900 p-4 text-center text-white"
        >
          <p className="text-xs text-gray-300">2進数 → ふだんの数</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest">
            {value.toString(2).padStart(4, "0")}
          </p>
          <p className="mt-2 font-mono text-xl">
            {selected.length ? selected.join(" + ") : "0"} = {value}
          </p>
          <p className="mt-2 text-sm text-brand-200">
            {value === target
              ? `できました！${target}を0と1で表せました。`
              : `目標は${target}。いまの合計は${value}です。`}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => setHint(!hint)}
          aria-expanded={hint}
        >
          ヒントを見る
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setValue(0)}
        >
          全部0に戻す
        </button>
      </div>
      {hint && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          {target === 5
            ? "5より小さい位のうち、一番大きい4を使います。残りは5 − 4 = 1なので、1も使いましょう。"
            : target === 9
              ? "9 = 8 + 1。8と1の位を1に、4と2の位を0にします。"
              : "15 = 8 + 4 + 2 + 1。4つの位を全部使います。"}
        </p>
      )}
      <Takeaway>
        2進数に直すのは、<b>「どの位を足せば、その数になるか」</b>
        を選ぶことです。
      </Takeaway>
    </Panel>
  );
}

function BytesPanel() {
  const [allOn, setAllOn] = useState(false);
  return (
    <Panel>
      <SectionTitle step={4}>ビット8個をまとめると、1バイト</SectionTitle>
      <p className={copyClass}>
        ここからは、<b>データの量を数える単位</b>
        の話です。0か1を入れる場所が1ビット。その場所を8個まとめて、
        <b>1バイト（Byte）</b>と呼びます。
      </p>
      <div className="mt-5 rounded-2xl border-2 border-brand-200 bg-brand-50 p-3 sm:p-5">
        <p className="mb-3 text-center text-sm font-bold text-brand-900">
          この枠ぜんぶで 1バイト
        </p>
        <div
          className="grid grid-cols-8 gap-1"
          aria-label={`8ビットの例：${allOn ? "11111111" : "00000000"}`}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className={`flex h-12 items-center justify-center rounded-md border font-mono text-xl font-bold ${allOn ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 bg-white text-brand-900"}`}
            >
              {allOn ? 1 : 0}
            </span>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-brand-800">
          ↑ 1つのマスが1ビット。8個で8ビット。
        </p>
      </div>
      <button
        type="button"
        onClick={() => setAllOn(!allOn)}
        aria-pressed={allOn}
        className={`${buttonClass} mt-3`}
      >
        全部{allOn ? "0" : "1"}に切り替える
      </button>
      <p role="status" className="mt-3 text-sm leading-6 text-gray-700">
        {allOn ? "11111111でも" : "00000000でも"}、場所は8個。
        <b>中の数字が変わっても、量は1バイトのまま</b>です。
      </p>
      <Takeaway>
        <b>1 Byte = 8 bit</b>
        <br />
        バイト → ビットは ×8。ビット → バイトは ÷8。
        <br />
        <span className="text-xs">
          略すときは、小文字のbがbit、大文字のBがByteです。
        </span>
      </Takeaway>
      <details className="mt-4 rounded-xl border border-gray-200 p-3 text-sm leading-7 text-gray-700">
        <summary className="cursor-pointer font-bold text-gray-900">
          8ビットは「256通り」。最大値はなぜ255？
        </summary>
        <p className="mt-2">
          1ビットは0・1の2通り。2ビットは00・01・10・11の4通り。場所が1個増えるたびに組み合わせが2倍になるので、8ビットは2を8回掛けて256通りです。
        </p>
        <p className="mt-2">
          符号なしの整数なら、00000000の<b>0から</b>11111111の<b>255まで</b>
          。0も1通りに数えるため、全部で256通りになります。
        </p>
      </details>
    </Panel>
  );
}

function UnitsPanel() {
  const [photos, setPhotos] = useState(250);
  return (
    <Panel>
      <SectionTitle step={5}>KB・MB・GBは、大きな量を短く書く単位</SectionTitle>
      <p className={copyClass}>
        1,000mを1kmと書くように、データ量も単位をまとめます。ここでは
        <b>1段ごとに1,000倍</b>で考えます。
      </p>
      <ol className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200 px-4 text-sm">
        {[
          ["B", "バイト", "基本の単位（8ビット）"],
          ["KB", "キロバイト", "1 KB = 1,000 B"],
          ["MB", "メガバイト", "1 MB = 1,000 KB"],
          ["GB", "ギガバイト", "1 GB = 1,000 MB"],
          ["TB", "テラバイト", "1 TB = 1,000 GB"],
        ].map(([symbol, label, amount]) => (
          <li
            key={symbol}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5"
          >
            <span>
              <b className="mr-2 inline-block w-7 font-mono text-brand-800">
                {symbol}
              </b>
              <span className="text-xs text-gray-600">{label}</span>
            </span>
            <span className="font-mono text-xs font-bold text-gray-800">
              {amount}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-2xl bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-950">
          写真をまとめると、どれくらい？
        </p>
        <p className="mt-1 text-xs leading-6 text-amber-900">
          写真1枚を4 MBとした例です。実際のサイズは画質などで変わります。
        </p>
        <label
          htmlFor="binary-photos"
          className="mt-3 flex justify-between text-sm font-bold text-amber-950"
        >
          <span>写真の枚数</span>
          <span>{photos}枚</span>
        </label>
        <input
          aria-label="写真の枚数"
          id="binary-photos"
          type="range"
          onTouchStart={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
          min="1"
          max="500"
          value={photos}
          onChange={(event) => setPhotos(Number(event.target.value))}
          className="mt-2 h-11 w-full accent-amber-700"
        />
        <div
          role="status"
          aria-label="写真のデータ量"
          className="rounded-xl bg-white p-3 text-center text-amber-950"
        >
          <p className="text-xs">4 MB × {photos}枚</p>
          <p className="mt-1 font-mono text-lg font-bold">
            {(photos * 4).toLocaleString("en-US")} MB = {(photos * 4) / 1000} GB
          </p>
        </div>
      </div>
      <Takeaway>
        <b>小さい単位に直すときは ×1,000</b>：2 GB = 2,000 MB
        <br />
        <b>大きい単位に直すときは ÷1,000</b>：2,000 MB = 2 GB
        <br />
        単位が変わっても、データの量そのものは変わりません。
      </Takeaway>
      <details className="mt-4 rounded-xl border border-gray-200 p-3 text-sm leading-7 text-gray-700">
        <summary className="cursor-pointer font-bold text-gray-900">
          1,024倍と書かれている場合は？
        </summary>
        <p className="mt-2">
          コンピュータでは1,024倍でまとめる場合もあります。厳密には1 KiB = 1,024
          B、1 MiB = 1,024
          KiBです。KB・MBと表記して1,024倍を使う資料もあるので、
          <b>試験では「1 KB = 1,024 Bとする」などの問題文の指定を優先</b>
          しましょう。
        </p>
      </details>
    </Panel>
  );
}

function SummaryPanel() {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={6}>覚えるのは、この3つ</SectionTitle>
      <dl className="mt-4 space-y-3">
        {[
          [
            "2進数を読む",
            "右から1・2・4・8…。1が入った位の値だけ足す。",
            "0101 → 4 + 1 = 5",
          ],
          [
            "ビットとバイト",
            "0か1の1桁が1ビット。8桁まとめて1バイト。",
            "1 B = 8 bit",
          ],
          [
            "KB・MB・GB",
            "単位を1段まとめるごとに、基本は1,000倍。",
            "1 GB = 1,000 MB",
          ],
        ].map(([title, body, example]) => (
          <div key={title} className="rounded-xl bg-gray-50 p-4">
            <dt className="font-bold text-gray-900">{title}</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700">
              {body}
              <span className="mt-1 block font-mono font-bold text-brand-800">
                {example}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-gray-900">
          最後に確認：2バイトは何ビット？
        </legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[2, 16, 2000].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setAnswer(n)}
              aria-pressed={answer === n}
              className={buttonClass}
            >
              {n}ビット
            </button>
          ))}
        </div>
        <p
          role="status"
          aria-label="単位の答え合わせ"
          className="mt-3 text-sm leading-6 text-brand-900"
        >
          {answer === null
            ? "×8と×1,000、どちらを使うか考えてみましょう。"
            : answer === 16
              ? "正解！1バイトは8ビットなので、2 × 8 = 16ビットです。"
              : answer === 2000
                ? "1,000倍にするのはB・KB・MBなどの間です。バイトからビットへは、1バイト = 8ビットを使います。"
                : "バイトとビットは大きさが違います。8個入りのまとまりが2つなら、8 × 2です。"}
        </p>
      </fieldset>
      <p className="mt-5 text-sm leading-7 text-gray-700">
        基礎はここまで。このページの<b>問題演習</b>
        で確かめましょう。次の解説には、試験に備える発展資料があります。
      </p>
      <Link
        href="/topics/tech-lan-wan"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline"
      >
        関連：転送時間の計算（LANとWAN） →
      </Link>
    </Panel>
  );
}

export default function BinaryExperience() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-7 text-gray-600">
        まずは小さな数から。
        <b className="text-gray-900">触って確かめる6つのステップ</b>
        で、0と1からスマホのGBまでつなげましょう。
      </p>
      <SwitchPanel />
      <PlacesPanel />
      <BuildPanel />
      <BytesPanel />
      <UnitsPanel />
      <SummaryPanel />
      <Panel>
        <SectionTitle step={7}>もっと学ぶ：試験に向けた発展</SectionTitle>
        <p className={`${copyClass} mb-4`}>
          必要なところを開いて確認できます。ここでは少し大きい数「44」を使います。
        </p>
        <AdvancedBinaryReference />
      </Panel>
    </div>
  );
}
