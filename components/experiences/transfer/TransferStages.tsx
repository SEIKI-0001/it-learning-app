"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "../calc/calc.module.css";
import { Choices, Note, Replay, StepChips, Term, type Choice } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";

// 通信速度・転送時間。「bps＝1秒に送れるbit数」から本試験の計算（100Mbit/秒・200MByte・効率50% → 32秒）まで。
//   ④ なぜ割り算？ ：12MB を 1秒に 4MB ずつ運ぶ → 3秒（bit はまだ出さない）
//   ⑤ Byte と bit  ：単位が違う → 1Byte が 8bit に分かれる → 200MByte × 8 ＝ 1,600Mbit
//   ⑥ 利用効率     ：100Mbps のレーンの半分が使えない → 実効速度 50Mbps
//   ⑦ 時間を求める ：1,600Mbit ÷ 50Mbit/秒。Mbit が消えて 秒 が残る → 32秒
//   ⑧ 解き方を固定 ：そろえる → 実効速度 → 割る
//   ⑨ 確認3問      ：割るだけ → ×8 あり → ×8 と利用効率あり。誤答はつまずいた手順を返す

export const TRANSFER_STEPS = ["① そろえる", "② 実効速度", "③ 割る"];

// ---------------------------------------------------------------------------
// ④ なぜ割り算？
// ---------------------------------------------------------------------------

const DIVIDE_DELAYS = [900, 1100, 1100, 1300, 1500];
const BLOCKS = 3;

export function DivideStage() {
  const { ref, beat, reducedMotion, replay } = useBeats(6, DIVIDE_DELAYS);
  const sec = Math.min(beat, BLOCKS);
  return (
    <Panel>
      <SectionTitle step={4}>転送時間は、なぜ割り算？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        まずは bit を使わずに考えます。<b className="text-gray-800">12MB</b>のデータを、<b className="text-gray-800">1秒に4MBずつ</b>送ると…
      </p>

      <div ref={ref} className="mt-3" data-testid="tr-divide" data-beat={beat}>
        <div className="flex items-baseline justify-between text-xs font-bold">
          <span className="text-gray-600">⏱ {sec}秒</span>
          <span className="tabular-nums text-brand-700" data-testid="tr-arrived">
            届いた {sec * 4}MB / 12MB
          </span>
        </div>
        <div className="relative mt-1 h-[92px] overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-200">
          <div className="absolute inset-y-0 left-0 w-[27%] border-r border-dashed border-gray-300" />
          <div className="absolute inset-y-0 right-0 w-[27%] border-l border-dashed border-gray-300 bg-emerald-50/60" />
          <div className="absolute inset-x-[27%] top-1/2 h-5 -translate-y-1/2 rounded bg-gray-200" />
          <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-gray-500">1秒に 4MB</span>
          <span className="absolute bottom-1 left-1 text-[10px] font-bold text-gray-500">📁 送る側</span>
          <span className="absolute bottom-1 right-1 text-[10px] font-bold text-emerald-700">📥 受け取る側</span>
          {Array.from({ length: BLOCKS }, (_, i) => {
            const sent = beat >= i + 1;
            return (
              <div
                key={i}
                className={`${styles.move} absolute grid h-5 w-[21%] place-items-center rounded text-[11px] font-bold text-white ${sent ? "bg-emerald-500" : "bg-brand-500"}`}
                style={{ top: 6 + i * 22, left: sent ? "76%" : "3%" }}
              >
                4MB
              </div>
            );
          })}
        </div>

        {beat >= 4 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-1 ring-gray-200 ${styles.reveal}`}>
            12MB ÷ 4MB/秒 ＝ <span className="text-brand-600">3秒</span>
          </div>
        )}
        {beat >= 5 && (
          <Note>
            💡 <b>全部の量 ÷ 1秒に運べる量 ＝ かかる時間</b>。割り算は「4MBの束がいくつあるか」を数えているのと同じです。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ Byte と bit
// ---------------------------------------------------------------------------

const UNIT_DELAYS = [1300, 1600, 1600, 1600];

export function UnitStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, UNIT_DELAYS);
  const warn = b >= 1;
  const converted = b >= 3;
  return (
    <Panel>
      <SectionTitle step={5}>Byte と bit ― 単位をそろえる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">本試験の問題は、こんな数字で出てきます。</p>

      <div ref={ref} className="mt-3" data-testid="tr-unit" data-beat={b}>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className={`rounded-xl bg-gray-50 px-2 py-2.5 ring-1 ${warn && !converted ? "ring-2 ring-amber-400" : "ring-gray-200"}`}>
            <div className="text-[11px] font-bold text-gray-500">📁 ファイル</div>
            <div className="mt-1 text-base font-bold text-gray-800">
              {converted ? (
                <Term tone="brand" flipKey="bit" was="200 MByte">
                  1,600 M<span className="text-sky-600">bit</span>
                </Term>
              ) : (
                <>
                  200 M<span className={warn ? "rounded bg-amber-200 px-0.5 text-amber-900" : ""}>Byte</span>
                </>
              )}
            </div>
          </div>
          <div className={`rounded-xl bg-gray-50 px-2 py-2.5 ring-1 ${warn && !converted ? "ring-2 ring-sky-400" : "ring-gray-200"}`}>
            <div className="text-[11px] font-bold text-gray-500">🌐 通信速度</div>
            <div className="mt-1 text-base font-bold text-gray-800">
              100 M<span className={warn ? "rounded bg-sky-200 px-0.5 text-sky-900" : ""}>bit</span>/秒
            </div>
          </div>
        </div>

        {warn && !converted && (
          <p className={`mt-2 text-center text-sm font-bold text-rose-600 ${styles.shake}`} data-testid="tr-unit-warn">
            ⚠ このままでは単位が違う（Byte と bit）
          </p>
        )}

        {b >= 2 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-3 ring-1 ring-gray-200 ${styles.reveal}`} data-testid="tr-split">
            <div className="mx-auto w-fit rounded-md bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">1 Byte</div>
            <div className="mt-1 text-center text-xs text-gray-400">↓ 分けると</div>
            <div className="mt-1 grid grid-cols-8 gap-1">
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className={`grid h-6 place-items-center rounded bg-sky-500 text-[10px] font-bold text-white ${styles.pop}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  bit
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-center text-sm font-bold text-gray-800">1 Byte ＝ 8 bit</p>
          </div>
        )}

        {converted && (
          <div className={`mt-3 rounded-xl bg-gray-50 px-3 py-2 text-center text-base font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="tr-unit-eq">
            200 MByte × 8 ＝ <span className="text-sky-700">1,600 Mbit</span>
          </div>
        )}

        {b >= 4 && (
          <>
            <Note>
              💡 <b>計算する前に単位をそろえる</b>。通信速度が bit なので、ファイルも bit に直してから割ります。
            </Note>
            <p className={`mt-2 text-[11px] leading-relaxed text-gray-500 ${styles.reveal}`}>
              見分け方：<b>B（大文字）＝バイト</b>、<b>b（小文字）＝ビット</b>。bps は bit per second（ビット/秒）。
              1Byte＝8bit は{" "}
              <Link href="/topics/tech-binary-data" className="font-bold text-brand-600 underline">
                2進数
              </Link>{" "}
              で出てきた「ランプ8個」です。
            </p>
          </>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 利用効率
// ---------------------------------------------------------------------------

const EFF_DELAYS = [1300, 1500, 1500];
const LANES = 10;
const EFF_OPTIONS = [100, 80, 50];

export function EfficiencyStage() {
  const { ref, beat: b, done, reducedMotion, replay } = useBeats(4, EFF_DELAYS);
  const [picked, setPicked] = useState<number | null>(null);
  const eff = picked ?? (b >= 1 ? 50 : 100);
  const usable = Math.round((eff / 100) * LANES);
  const speed = eff;

  return (
    <Panel>
      <SectionTitle step={6}>利用効率 ― 回線を全部は使えない</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        100Mbps の回線を、10本のレーンだと考えます。実際には制御用の情報や混雑があり、<b className="text-gray-800">全部をデータに使えるわけではありません</b>。
      </p>

      <div ref={ref} className="mt-3" data-testid="tr-eff" data-eff={eff}>
        <div className="flex items-baseline justify-between text-xs font-bold">
          <span className="text-gray-600">回線 100Mbps</span>
          <span className="text-emerald-700">利用効率 {eff}%</span>
        </div>
        <div className="mt-1 space-y-1 rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200" aria-hidden>
          {Array.from({ length: LANES }, (_, i) => {
            const on = i < usable;
            return (
              <div key={i} className={`${styles.move} relative h-2.5 overflow-hidden rounded-full ${on ? "bg-emerald-200" : "bg-gray-300/70"}`}>
                {on &&
                  [0, 1].map((k) => (
                    <span
                      key={k}
                      className={`${styles.flow} absolute top-0 h-full w-[6%] rounded-full bg-emerald-600`}
                      style={{ animationDelay: `${-(i * 0.17 + k * 0.7)}s`, left: `${(i * 23 + k * 50) % 100}%` }}
                    />
                  ))}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-bold">
          <span className="text-emerald-700">緑＝データに使える {usable}本</span>
          {usable < LANES && <span className="text-gray-500">灰＝使えない {LANES - usable}本</span>}
        </div>

        {b >= 2 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="tr-eff-eq">
            100Mbps × {eff / 100} ＝ <span className="text-emerald-600">{speed}Mbps</span>
          </div>
        )}
        {b >= 3 && (
          <Note>
            💡 <b>実効速度 ＝ 通信速度 × 利用効率</b>。効率50%なら、実際に使える速さは半分の 50Mbps です。
          </Note>
        )}

        {done && (
          <div className="mt-3">
            <div className="text-[11px] font-bold text-gray-500">利用効率を変えると？</div>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {EFF_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPicked(v)}
                  aria-pressed={eff === v}
                  className={`rounded-lg py-1.5 text-xs font-bold transition active:scale-95 ${eff === v ? "bg-emerald-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        )}
        <Replay
          onClick={() => {
            setPicked(null);
            replay();
          }}
          hidden={reducedMotion}
        />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑦ 時間を求める
// ---------------------------------------------------------------------------

const TIME_DELAYS = [1200, 1600, 1600, 1500];

export function TimeStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, TIME_DELAYS);
  const cancel = b >= 2;
  return (
    <Panel>
      <SectionTitle step={7}>そろえた数字で、時間を求める</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">⑤と⑥で作ったカードを、④の「量 ÷ 1秒に運べる量」にあてはめます。</p>

      <div ref={ref} className="mt-3" data-testid="tr-time" data-beat={b}>
        <div className="flex items-stretch justify-center gap-2 text-center">
          <div className={`${styles.move} flex-1 rounded-xl bg-sky-50 px-2 py-2 ring-1 ring-sky-200`} style={{ transform: b >= 1 ? "translateX(6px)" : "none" }}>
            <div className="text-[10px] font-bold text-sky-700">⑤ そろえた量</div>
            <div className="mt-0.5 text-base font-bold text-gray-800">
              1,600 <span className={cancel ? `${styles.strike} text-gray-400` : ""}>Mbit</span>
            </div>
          </div>
          <div className="grid place-items-center text-xl font-bold text-gray-700">÷</div>
          <div className={`${styles.move} flex-1 rounded-xl bg-emerald-50 px-2 py-2 ring-1 ring-emerald-200`} style={{ transform: b >= 1 ? "translateX(-6px)" : "none" }}>
            <div className="text-[10px] font-bold text-emerald-700">⑥ 実効速度</div>
            <div className="mt-0.5 text-base font-bold text-gray-800">
              50 <span className={cancel ? `${styles.strike} text-gray-400` : ""}>Mbit</span>
              <span className={cancel ? "rounded bg-amber-200 px-0.5 text-amber-900" : ""}>/秒</span>
            </div>
          </div>
        </div>

        {b >= 1 && (
          <p className={`mt-2 text-center text-xs font-bold text-gray-500 ${styles.reveal}`}>量 ÷ 1秒に運べる量（④と同じ形）</p>
        )}
        {cancel && (
          <p className={`mt-1 text-center text-xs font-bold text-amber-800 ${styles.reveal}`} data-testid="tr-cancel">
            Mbit どうしが消えて、<b>秒</b>だけが残る
          </p>
        )}
        {b >= 3 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-2 ring-brand-400 ${styles.pop}`} data-testid="tr-time-answer">
            1,600 ÷ 50 ＝ <span className="text-brand-600">32秒</span>
          </div>
        )}
        {b >= 4 && (
          <Note>
            💡 答えの単位が<b>秒</b>になれば、割る向きは合っています。逆に 50 ÷ 1,600 にすると 0.03… になり、秒にもなりません。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑧ 解き方を固定
// ---------------------------------------------------------------------------

const SOLVE_DELAYS = [1100, 1100, 1300];
const SOLVE_ROWS = [
  { step: "① そろえる", calc: "200MB × 8 ＝ 1,600Mbit", tone: "text-sky-700" },
  { step: "② 実効速度", calc: "100Mbps × 50% ＝ 50Mbps", tone: "text-emerald-700" },
  { step: "③ 割る", calc: "1,600 ÷ 50 ＝ 32秒", tone: "text-brand-700" },
];

export function SolveStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(4, SOLVE_DELAYS);
  return (
    <Panel>
      <SectionTitle step={8}>解き方は3ステップ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">どんな数字でも、この順番で解けます。</p>
      <div ref={ref} className="mt-3 space-y-2" data-testid="tr-solve" data-beat={b}>
        {SOLVE_ROWS.map(
          (r, i) =>
            b >= i && (
              <div key={r.step} className={`flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200 ${styles.reveal}`}>
                <b className={`text-sm ${r.tone}`}>{r.step}</b>
                <span className="text-sm font-bold tabular-nums text-gray-800">{r.calc}</span>
              </div>
            ),
        )}
        {b >= 3 && (
          <div className={`rounded-xl bg-brand-50 px-3 py-3 text-center ring-2 ring-brand-400 ${styles.reveal}`}>
            <div className="text-[11px] font-bold text-brand-700">覚える言葉</div>
            <div className="mt-0.5 text-base font-bold text-gray-800">そろえる → 実効速度 → 割る</div>
          </div>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑨ 確認3問
// ---------------------------------------------------------------------------

type Q = { level: string; prompt: string; choices: Choice[]; solution: string };

export const TRANSFER_QUESTIONS: Q[] = [
  {
    level: "Lv.1 割るだけ",
    prompt: "12MBのデータを、1秒に4MB送れる回線で送る。何秒かかる？",
    choices: [
      { label: "3秒", ok: true },
      { label: "48秒", why: "掛けています。かかる時間は「全部の量 ÷ 1秒に運べる量」。", step: 2 },
      { label: "0.33秒", why: "割る向きが逆です。量（12MB）を、1秒に運べる量（4MB）で割ります。", step: 2 },
    ],
    solution: "③ 12 ÷ 4 ＝ 3秒",
  },
  {
    level: "Lv.2 Byte→bit あり",
    prompt: "40Mバイトのファイルを、通信速度80Mビット/秒の回線で送る（利用効率は考えない）。何秒かかる？",
    choices: [
      { label: "4秒", ok: true },
      { label: "0.5秒", why: "Byte→bit（×8）を忘れています。40MB のまま 80Mbit/秒 で割った値です。", step: 0 },
      { label: "0.25秒", why: "割る向きが逆です（80 ÷ 320）。量を速さで割ります。", step: 2 },
    ],
    solution: "① 40 × 8 ＝ 320Mbit → ③ 320 ÷ 80 ＝ 4秒",
  },
  {
    level: "Lv.3 本試験レベル",
    prompt: "通信速度が80Mビット/秒の回線で、150Mバイトのファイルを転送する。回線の利用効率を75%とすると、転送時間は何秒か。1バイトは8ビットとする。",
    choices: [
      { label: "20秒", ok: true },
      { label: "15秒", why: "利用効率を忘れています（1,200 ÷ 80）。実際の速さは 80 × 0.75 ＝ 60Mbit/秒。", step: 1 },
      { label: "2.5秒", why: "Byte→bit（×8）を忘れています（150 ÷ 60）。", step: 0 },
      { label: "11.25秒", why: "利用効率で割っています（80 ÷ 0.75 で速くなってしまう）。実効速度は掛け算：80 × 0.75。", step: 1 },
    ],
    solution: "① 150 × 8 ＝ 1,200Mbit → ② 80 × 0.75 ＝ 60Mbit/秒 → ③ 1,200 ÷ 60 ＝ 20秒",
  },
];

export function TransferPractice() {
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const q = TRANSFER_QUESTIONS[index];
  const last = index === TRANSFER_QUESTIONS.length - 1;
  return (
    <Panel>
      <SectionTitle step={9}>確認問題：3段階で本試験レベルへ</SectionTitle>
      <div className="mt-3">
        <StepChips steps={TRANSFER_STEPS} />
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid="tr-practice" data-index={index}>
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-brand-700">{q.level}</span>
          <span className="text-gray-400">
            {index + 1} / {TRANSFER_QUESTIONS.length}
          </span>
        </div>
        <p className="mt-1 text-sm font-bold leading-relaxed text-gray-800">{q.prompt}</p>
        <div className="mt-2">
          <Choices key={index} choices={q.choices} steps={TRANSFER_STEPS} cols={q.choices.length === 4 ? 2 : 3} onAnswer={() => setAnswered(true)} />
        </div>
        {answered && <p className={`mt-2 text-xs leading-relaxed text-gray-600 ${styles.reveal}`}>{q.solution}</p>}
      </div>
      {answered && !last && (
        <button
          type="button"
          onClick={() => {
            setIndex(index + 1);
            setAnswered(false);
          }}
          className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          次の問題へ →
        </button>
      )}
      {answered && last && (
        <Note tone="emerald">
          🎉 ここまで解ければ、本試験の転送時間の問題に対応できます。迷ったら<b>そろえる → 実効速度 → 割る</b>。
        </Note>
      )}
    </Panel>
  );
}
