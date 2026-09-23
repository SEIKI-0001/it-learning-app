"use client";

import { useState } from "react";
import styles from "../calc/calc.module.css";
import { LeveledPractice, Note, Replay, Term, type LeveledQuestion } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";
import { DiskArray, Legend, SLOTS, survives, usableDisks, type RaidMode } from "./DiskArray";

// RAID と実効容量。「なぜ RAID5 は1台分、RAID6 は2台分を引くのか」をマスの色で見せる。
//   ① RAID0・1 ：全部データ（速い・故障に弱い） / 同じものを2つ（容量は半分）
//   ② パリティ ：3＋5＋2＝10 を持っておけば、1台消えても 10−3−2 で戻せる
//   ③ RAID5    ：パリティは各ディスクに散らばるが、集めると1台分 → 4TB − 1TB ＝ 3TB
//   ④ RAID6    ：パリティ2種類で2台分 → 4TB − 2TB ＝ 2TB、2台壊れても戻せる
//   ⑤ 一般化   ：容量 ×（台数 − 引く台数）
//   ⑥ 確認4問  ：誤答は「引く台数を間違えた」などつまずいた手順を返す

export const RAID_STEPS = ["① 方式を見る", "② 引く台数", "③ ×1台の容量"];

function useBroken() {
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const toggle = (d: number) =>
    setBroken((cur) => {
      const next = new Set(cur);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  return { broken, toggle, clear: () => setBroken(new Set()) };
}

function Verdict({ mode, broken }: { mode: RaidMode; broken: ReadonlySet<number> }) {
  if (broken.size === 0) {
    return <p className="mt-2 text-center text-[11px] font-bold text-gray-500">💽 をタップすると、そのディスクを故障させられます</p>;
  }
  const ok = survives(mode, broken);
  const text: Record<RaidMode, [string, string]> = {
    raid0: ["", "1台でも壊れると、そのディスクにあった分がどこにも無い。ファイルは全ディスクにまたがっているので全部読めなくなる"],
    raid1: ["相棒のディスクに同じデータ（コピー）があるので読める", "同じ組の2台が両方壊れると、コピーごと失われる"],
    raid5: ["残りのデータとパリティから計算して戻せる（1台まで）", "2台同時に壊れると計算で戻せない（RAID5は1台まで）"],
    raid6: ["パリティが2種類あるので、2台まで計算で戻せる", "3台同時に壊れると戻せない（RAID6は2台まで）"],
  };
  return (
    <p
      className={`mt-2 rounded-lg px-3 py-2 text-xs font-bold leading-relaxed ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"} ${styles.reveal}`}
      data-testid={`raid-verdict-${mode}`}
      data-ok={ok ? "true" : "false"}
      key={`${broken.size}-${ok}`}
    >
      {ok ? "✅ データは無事：" : "❌ データが失われる："}
      {ok ? text[mode][0] : text[mode][1]}
    </p>
  );
}

// ---------------------------------------------------------------------------
// ① RAID0 と RAID1
// ---------------------------------------------------------------------------

const FILL_DELAYS = [700, 700, 700, 700, 900];

export function RaidBasicStage() {
  const [mode, setMode] = useState<"raid0" | "raid1">("raid0");
  const { ref, beat, done, reducedMotion, replay } = useBeats(6, FILL_DELAYS);
  const { broken, toggle, clear } = useBroken();
  const pick = (m: "raid0" | "raid1") => {
    setMode(m);
    clear();
    replay();
  };
  const usable = usableDisks(mode);
  return (
    <Panel>
      <SectionTitle step={1}>RAID0 と RAID1 ― 分けるか、写すか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">1TB のディスク4台</b>にデータを書き込みます。まずは両極端の2つの方式から。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        {(["raid0", "raid1"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            aria-pressed={mode === m}
            className={`rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${mode === m ? "bg-brand-600 text-white" : "text-gray-500"}`}
          >
            {m === "raid0" ? "RAID0（分けて書く）" : "RAID1（写して書く）"}
          </button>
        ))}
      </div>

      <div ref={ref} className="mt-3" data-testid="raid-basic" data-mode={mode} data-beat={beat}>
        <DiskArray mode={mode} placed={Math.min(beat, SLOTS)} broken={broken} onToggleDisk={done ? toggle : undefined} testId="raid-basic-array" />
        <Legend kinds={mode === "raid0" ? ["data"] : ["data", "copy"]} />

        {done && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center ring-1 ring-gray-200 ${styles.reveal}`} data-testid="raid-basic-cap">
            <div className="text-[11px] font-bold text-gray-500">データに使える容量</div>
            <div className="text-lg font-bold text-gray-800">
              4TB 中 <span className="text-brand-600">{usable}TB</span>
              <span className="ml-1 text-xs text-gray-500">{mode === "raid0" ? "（全部データ）" : "（半分はコピー）"}</span>
            </div>
          </div>
        )}
        {done && <Verdict mode={mode} broken={broken} />}
        {done && (
          <Note>
            {mode === "raid0" ? (
              <>
                💡 <b>RAID0（ストライピング）</b>は4台に分けて同時に書くので<b>速い</b>。容量も全部使えるが、<b>予備が無いので1台壊れると全滅</b>。
              </>
            ) : (
              <>
                💡 <b>RAID1（ミラーリング）</b>は同じデータを2台に書く。<b>1台壊れても相棒が残る</b>が、容量は<b>半分</b>。2台なら 500GB×2 → 500GB 分。
              </>
            )}
          </Note>
        )}
        <Replay onClick={() => pick(mode)} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② パリティ ― 消えても計算で戻せる
// ---------------------------------------------------------------------------

const PARITY_DELAYS = [1200, 1300, 1400, 1400, 1500];
const PARITY_DATA = [3, 5, 2];

export function ParityStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(6, PARITY_DELAYS);
  const lostShown = b >= 2;
  const restored = b >= 4;
  return (
    <Panel>
      <SectionTitle step={2}>パリティ ― 消えても計算で戻せる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        RAID5・6 は、コピーの代わりに<b className="text-gray-800">「検算用の数」＝パリティ</b>を持ちます。数字で考えてみます。
      </p>

      <div ref={ref} className="mt-3" data-testid="raid-parity" data-beat={b}>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {PARITY_DATA.map((v, i) => {
            const lost = i === 1 && lostShown;
            return (
              <div key={i} className={`rounded-lg p-1.5 ring-1 ${lost && !restored ? "bg-rose-50 ring-2 ring-rose-400" : "bg-gray-50 ring-gray-200"}`}>
                <div className="text-[11px] font-bold text-gray-500">{lost && !restored ? "💥" : "💽"} {i + 1}</div>
                <div
                  key={lost ? (restored ? "back" : "lost") : "v"}
                  className={`mt-1 grid h-9 place-items-center rounded text-lg font-bold ${
                    lost && !restored ? "bg-rose-100 text-rose-500" : restored && i === 1 ? `bg-emerald-500 text-white ${styles.pop}` : "bg-brand-500 text-white"
                  }`}
                  data-testid={i === 1 ? "raid-parity-lost" : undefined}
                >
                  {lost && !restored ? "?" : v}
                </div>
              </div>
            );
          })}
          <div className="rounded-lg bg-gray-50 p-1.5 ring-1 ring-gray-200">
            <div className="text-[11px] font-bold text-gray-500">💽 4</div>
            {b >= 1 ? (
              <div className={`mt-1 grid h-9 place-items-center rounded bg-amber-400 text-lg font-bold text-amber-950 ${styles.pop}`}>10</div>
            ) : (
              <div className="mt-1 h-9 rounded border border-dashed border-gray-300" />
            )}
          </div>
        </div>
        <div className="mt-1 grid grid-cols-4 text-center text-[10px] font-bold">
          <span className="col-span-3 text-brand-700">データ</span>
          <span className="text-amber-700">パリティ</span>
        </div>

        {b >= 1 && (
          <p className={`mt-2 text-center text-sm font-bold text-gray-700 ${styles.reveal}`}>
            パリティ ＝ 3 ＋ 5 ＋ 2 ＝ <span className="text-amber-700">10</span>
          </p>
        )}
        {b >= 2 && !restored && (
          <p className={`mt-1 text-center text-sm font-bold text-rose-600 ${styles.shake}`}>💥 ディスク2が故障！ 「5」が消えた</p>
        )}
        {b >= 3 && (
          <div className={`mt-2 rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="raid-parity-eq">
            10 − 3 − 2 ＝ <span className="text-emerald-600">5</span>
          </div>
        )}
        {b >= 5 && (
          <Note>
            💡 パリティがあれば、<b>残りの数から消えた1つを計算で戻せます</b>。ただし2台同時に消えると「? ＋ ? ＝ 7」となり、1つに決まりません。
            <span className="mt-1 block text-[11px] text-amber-800/80">※ 実際はXORという計算を使いますが、「残りから逆算する」考え方は同じです。</span>
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ RAID5 ／ ④ RAID6 ― パリティを集めると何台分？
// ---------------------------------------------------------------------------

const SPREAD_DELAYS = [800, 800, 800, 1200, 1500, 1700, 1500];

export function ParityRaidStage({ mode }: { mode: "raid5" | "raid6" }) {
  const six = mode === "raid6";
  const k = six ? 2 : 1; // 引く台数
  const { ref, beat: b, done, reducedMotion, replay } = useBeats(8, SPREAD_DELAYS);
  const { broken, toggle, clear } = useBroken();
  const placed = Math.min(b, SLOTS);
  const focus = b >= 5; // パリティだけ光らせる
  const gathered = b >= 6;
  const answer = b >= 7;
  const parityKinds = six ? (["p", "q"] as const) : (["p"] as const);
  return (
    <Panel>
      <SectionTitle step={six ? 4 : 3}>
        {six ? "RAID6 ― パリティ2種類で2台分" : "RAID5 ― パリティは散らばって1台分"}
      </SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {six ? (
          <>
            RAID6 は横1列ごとに<b className="text-gray-800">パリティを2つ（P・Q）</b>持ちます。だから2台壊れても戻せます。
          </>
        ) : (
          <>
            RAID5 は横1列（3マスのデータ）ごとに<b className="text-gray-800">パリティ P を1つ</b>作り、置き場所を1台ずつずらします。
          </>
        )}
      </p>

      <div ref={ref} className="mt-3" data-testid={`raid-${mode}`} data-beat={b}>
        <DiskArray
          mode={mode}
          placed={placed}
          broken={broken}
          onToggleDisk={done ? toggle : undefined}
          highlight={focus && !done ? [...parityKinds] : undefined}
          testId={`raid-${mode}-array`}
        />
        <Legend kinds={["data", ...parityKinds]} />

        {b >= 4 && b < 5 && (
          <p className={`mt-2 text-center text-xs font-bold text-gray-500 ${styles.reveal}`}>どのディスクにも P{six ? "・Q" : ""} が混ざっている…</p>
        )}
        {focus && (
          <p className={`mt-2 text-center text-xs font-bold text-amber-800 ${styles.reveal}`}>
            {six ? "P と Q は各ディスクに1つずつ" : "P は各ディスクに1つずつ散らばっている"}
          </p>
        )}

        {gathered && (
          <div className={`mt-2 flex items-center justify-center gap-2 ${styles.reveal}`} data-testid={`raid-${mode}-gather`}>
            <span className="text-xs font-bold text-gray-600">集めると →</span>
            {Array.from({ length: k }, (_, disk) => (
              <div key={disk} className="w-14 rounded-lg bg-amber-50 p-1 ring-1 ring-amber-300">
                <div className="text-center text-[10px] font-bold text-amber-800">1台分</div>
                <div className="mt-0.5 space-y-0.5">
                  {Array.from({ length: SLOTS }, (_, s) => (
                    <div
                      key={s}
                      className={`grid h-3.5 place-items-center rounded-sm text-[9px] font-bold ${disk === 0 ? "bg-amber-400 text-amber-950" : "bg-amber-600 text-white"} ${styles.pop}`}
                      style={{ animationDelay: `${(disk * SLOTS + s) * 110}ms` }}
                    >
                      {disk === 0 ? "P" : "Q"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {answer && (
          <div className={`mt-3 space-y-1 rounded-xl bg-white px-3 py-2.5 text-center ring-1 ring-gray-200 ${styles.reveal}`} data-testid={`raid-${mode}-eq`}>
            <div className="text-sm font-bold text-gray-700">4台 × 1TB ＝ 4TB</div>
            <div className="text-sm font-bold text-amber-700">− パリティ {k}台分（{k}TB）</div>
            <div className="text-lg font-bold">
              ＝{" "}
              <Term tone="brand" flipKey="ans">
                {4 - k}TB
              </Term>
            </div>
          </div>
        )}
        {done && <Verdict mode={mode} broken={broken} />}
        {done && (
          <Note>
            💡 パリティは1台にまとめて置かず<b>散らばっている</b>けれど、<b>量は合計{k}台分</b>。だから実効容量は{" "}
            <b>
              1台の容量 ×（台数 − {k}）
            </b>
            。{six ? "2台まで" : "1台まで"}の故障なら計算で戻せます。
          </Note>
        )}
        <Replay
          onClick={() => {
            clear();
            replay();
          }}
          hidden={reducedMotion}
        />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 一般化 ― 何台でも同じ式
// ---------------------------------------------------------------------------

type Row = { mode: RaidMode; name: string; formula: (n: number) => string; cap: (n: number, c: number) => number; minus: (n: number) => number; tolerate: string };

const ROWS: Row[] = [
  { mode: "raid0", name: "RAID0", formula: (n) => `× ${n}`, cap: (n, c) => c * n, minus: () => 0, tolerate: "0台（予備なし）" },
  { mode: "raid1", name: "RAID1", formula: (n) => `× ${n} ÷ 2`, cap: (n, c) => (c * n) / 2, minus: (n) => n / 2, tolerate: "組の片方まで" },
  { mode: "raid5", name: "RAID5", formula: (n) => `×（${n} − 1）`, cap: (n, c) => c * (n - 1), minus: () => 1, tolerate: "1台まで" },
  { mode: "raid6", name: "RAID6", formula: (n) => `×（${n} − 2）`, cap: (n, c) => c * (n - 2), minus: () => 2, tolerate: "2台まで" },
];
const COUNTS = [4, 5, 6];
const SIZES = [1, 4];

export function RaidFormulaStage() {
  const [n, setN] = useState(4);
  const [c, setC] = useState(1);
  const [sel, setSel] = useState<RaidMode>("raid5");
  const row = ROWS.find((r) => r.mode === sel)!;
  const minus = row.minus(n);
  return (
    <Panel>
      <SectionTitle step={5}>何台でも同じ式 ― 引く台数だけ覚える</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">台数と1台の容量を変えてみよう。方式の行をタップすると、どれだけ引かれるかが下のディスクに出ます。</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-gray-500">
        <div>
          台数
          <div className="mt-1 grid grid-cols-3 gap-1">
            {COUNTS.map((v) => (
              <button key={v} type="button" onClick={() => setN(v)} aria-pressed={n === v} className={`rounded-lg py-1.5 text-xs font-bold active:scale-95 ${n === v ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}>
                {v}台
              </button>
            ))}
          </div>
        </div>
        <div>
          1台の容量
          <div className="mt-1 grid grid-cols-2 gap-1">
            {SIZES.map((v) => (
              <button key={v} type="button" onClick={() => setC(v)} aria-pressed={c === v} className={`rounded-lg py-1.5 text-xs font-bold active:scale-95 ${c === v ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}>
                {v}TB
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1" aria-label={`${n}台のうち${minus}台分が冗長用`} data-testid="raid-formula-disks" data-minus={minus}>
        {Array.from({ length: n }, (_, i) => {
          const spare = i >= n - minus;
          return (
            <div
              key={i}
              className={`grid h-9 w-9 place-items-center rounded-md text-[10px] font-bold transition-colors duration-300 ${
                spare ? (sel === "raid1" ? "bg-sky-400 text-white" : "bg-amber-400 text-amber-950") : "bg-brand-500 text-white"
              }`}
            >
              {spare ? (sel === "raid1" ? "写し" : "P") : `${c}TB`}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-center text-[11px] font-bold text-gray-500">
        {minus === 0 ? "全部データ" : `${minus}台分は${sel === "raid1" ? "コピー" : "パリティ"}（実際は各ディスクに散らばる）`}
      </p>

      <table className="mt-3 w-full text-left text-xs">
        <thead>
          <tr className="text-[10px] text-gray-500">
            <th className="py-1 pl-2">方式</th>
            <th className="py-1">実効容量</th>
            <th className="py-1 text-right pr-2">壊れてOK</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const on = r.mode === sel;
            return (
              <tr
                key={r.mode}
                className={`border-t border-gray-100 ${on ? "bg-brand-50" : ""}`}
                data-testid={`raid-formula-${r.mode}`}
              >
                <td className="py-2 pl-2">
                  <button type="button" onClick={() => setSel(r.mode)} aria-pressed={on} className={`w-full text-left font-bold ${on ? "text-brand-700" : "text-gray-700"}`}>
                    {r.name}
                  </button>
                </td>
                <td className="py-2 font-bold tabular-nums text-gray-800">
                  {c}TB {r.formula(n)} ＝ <span className="text-brand-600">{r.cap(n, c)}TB</span>
                </td>
                <td className="py-2 pr-2 text-right text-[11px] font-bold text-gray-500">{r.tolerate}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2.5 text-center ring-2 ring-brand-300">
        <div className="text-[11px] font-bold text-brand-700">覚える式</div>
        <div className="mt-0.5 text-sm font-bold text-gray-800">RAID5：容量 ×（台数 − 1）</div>
        <div className="text-sm font-bold text-gray-800">RAID6：容量 ×（台数 − 2）</div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
        ※ RAIDは「故障しても止まらない」ための仕組み。<b>誤って消したデータは全ディスクから消える</b>ので、バックアップの代わりにはなりません。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 確認4問
// ---------------------------------------------------------------------------

export const RAID_QUESTIONS: LeveledQuestion[] = [
  {
    level: "Lv.1 RAID5",
    prompt: "1TBのHDD4台でRAID5を構成する。実効容量は？",
    choices: [
      { label: "3TB", ok: true },
      { label: "4TB", why: "パリティ分を引き忘れています。RAID5は1台分をパリティに使います。", step: 1 },
      { label: "2TB", why: "2台分を引くのはRAID6です。RAID5のパリティは1台分。", step: 1 },
    ],
    solution: "① RAID5 → ② 引くのは1台 → ③ 1TB ×（4 − 1）＝ 3TB",
  },
  {
    level: "Lv.2 RAID6",
    prompt: "2TBのHDD6台でRAID6を構成する。実効容量は？",
    choices: [
      { label: "8TB", ok: true },
      { label: "10TB", why: "1台分しか引いていません。それはRAID5の容量です。RAID6はパリティ2台分。", step: 1 },
      { label: "12TB", why: "パリティ分を引き忘れています（2TB × 6）。", step: 1 },
      { label: "4TB", why: "引いた後の台数（4台）で止まっています。最後に1台の容量 2TB を掛けます。", step: 2 },
    ],
    solution: "① RAID6 → ② 引くのは2台 → ③ 2TB ×（6 − 2）＝ 8TB",
    cols: 2,
  },
  {
    level: "Lv.3 本試験レベル",
    prompt: "容量500GバイトのHDD2台で、RAID0とRAID1をそれぞれ構成したときの利用可能な容量の組合せは？",
    choices: [
      { label: "RAID0：1TB／RAID1：500GB", ok: true },
      { label: "RAID0：1TB／RAID1：1TB", why: "RAID1は同じデータを2台に書くので、使えるのは半分（1台分）です。", step: 0 },
      { label: "RAID0：500GB／RAID1：1TB", why: "逆です。全部をデータに使うのがRAID0、コピーするのがRAID1。", step: 0 },
      { label: "RAID0：500GB／RAID1：500GB", why: "RAID0は予備を持たないので、2台分すべて使えます。", step: 0 },
    ],
    solution: "① RAID0＝全部データ → 500GB × 2 ＝ 1TB。RAID1＝コピー → 半分の 500GB",
    cols: 2,
  },
  {
    level: "Lv.4 特徴で選ぶ",
    prompt: "HDDが2台同時に故障しても、データを失わずに使い続けたい。最も適切な方式は？",
    choices: [
      { label: "RAID6", ok: true },
      { label: "RAID5", why: "RAID5のパリティは1種類なので、戻せるのは1台までです。", step: 0 },
      { label: "RAID0", why: "RAID0は予備を持たないので、1台の故障でもデータを失います。", step: 0 },
      { label: "RAID1", why: "RAID1（4台＝2組）は、同じ組の2台が壊れるとコピーごと失われます。どの2台でも大丈夫なのはRAID6。", step: 0 },
    ],
    solution: "① 2台まで計算で戻せるのは、パリティを2種類持つRAID6",
    cols: 2,
  },
];

export function RaidPractice() {
  return (
    <LeveledPractice
      step={6}
      title="確認問題：4段階で本試験レベルへ"
      steps={RAID_STEPS}
      questions={RAID_QUESTIONS}
      testId="raid-practice"
      done={
        <>
          🎉 ここまで解ければ、本試験のRAIDの問題に対応できます。迷ったら<b>方式を見る → 引く台数 → ×1台の容量</b>。
        </>
      }
    />
  );
}
