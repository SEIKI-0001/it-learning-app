"use client";

import { useState, type ReactNode } from "react";
import styles from "../calc/calc.module.css";
import { Choices, Note, Replay, StepChips, type Choice } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";

// 確率・統計。データ活用（①〜③：BI・活用の流れ）とは別の学習ブロックとして、本試験の計算・判断を解けるようにする。
//   ④ 確率         ：8枚のカードから赤2枚 → 当たり2 ÷ 全部8 ＝ 1/4
//   ⑤ 3つの代表値  ：40,50,50,60,70 を「ならす（平均54）」「並べて真ん中（中央値50）」「積み上げて最多（最頻値50）」
//   ⑥ 外れ値       ：70 が 335 になると平均は 54→107、中央値は 50 のまま
//   ⑦ ばらつき     ：平均50の2組。平均までの線の長さ＝離れ具合 → 標準偏差が大きいほどばらつきが大きい
//   ⑧ まとめ
//   ⑨ 確認4問      ：確率 → 中央値 → 外れ値 → 標準偏差。誤答は「どの考え方」を間違えたかを返す

export const STATS_STEPS = ["確率", "代表値", "外れ値", "ばらつき"];

// ---------------------------------------------------------------------------
// ④ 確率
// ---------------------------------------------------------------------------

const CARDS = [false, true, false, false, false, true, false, false]; // true ＝ 赤
const PROB_DELAYS = [900, 1400, 1500, 1500, 1500];

export function ProbabilityStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(6, PROB_DELAYS);
  const open = b >= 1;
  const pickRed = b >= 2;
  const pickAll = b >= 3;
  return (
    <Panel>
      <div className="mb-2 w-fit rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">ここから：確率・統計</div>
      <SectionTitle step={4}>確率 ＝ 当たりの数 ÷ 全部の数</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        裏返した8枚のカードから1枚引きます。<b className="text-gray-800">赤を引く確率</b>は？
      </p>

      <div ref={ref} className="mt-3" data-testid="st-prob" data-beat={b}>
        <div className="grid grid-cols-4 gap-2" aria-label={open ? "赤2枚・白6枚" : "裏返したカード8枚"}>
          {CARDS.map((red, i) => {
            const lift = red && pickRed;
            return (
              <div
                key={i}
                className={`${styles.move} grid h-14 place-items-center rounded-lg text-2xl ring-1 ${
                  !open
                    ? "bg-brand-600 text-white ring-brand-700"
                    : lift
                      ? "bg-rose-50 ring-2 ring-rose-400"
                      : pickAll
                        ? "bg-white ring-2 ring-gray-400"
                        : "bg-white ring-gray-200"
                }`}
                style={{ transform: lift ? "translateY(-6px)" : "none" }}
                data-red={red ? "true" : undefined}
              >
                {!open ? (
                  <span className="text-base font-bold">?</span>
                ) : (
                  <span key="face" className={styles.flip} style={{ animationDelay: `${i * 60}ms` }}>
                    {red ? "🔴" : "⚪"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {pickRed && (
          <div className="mt-3 flex items-center justify-center gap-3" data-testid="st-prob-fraction">
            <div className="flex flex-col items-center text-center">
              <div className={`rounded-lg bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700 ring-1 ring-rose-200 ${styles.pop}`}>
                当たり（赤） <span className="text-lg">2</span>枚
              </div>
              <div className={`my-1 h-0.5 w-full rounded bg-gray-700 ${pickAll ? "" : "opacity-0"}`} />
              {pickAll ? (
                <div className={`rounded-lg bg-gray-50 px-3 py-1 text-sm font-bold text-gray-700 ring-1 ring-gray-300 ${styles.pop}`}>
                  全部 <span className="text-lg">8</span>枚
                </div>
              ) : (
                <div className="h-8" />
              )}
            </div>
            {b >= 4 && (
              <div className={`text-xl font-bold text-gray-800 ${styles.reveal}`} data-testid="st-prob-answer">
                ＝ <sup>2</sup>⁄<sub>8</sub> ＝ <span className="text-brand-600">1/4</span>
              </div>
            )}
          </div>
        )}
        {b >= 5 && (
          <Note>
            💡 <b>確率 ＝ 欲しい結果の数 ÷ 起こり得る全部の数</b>。分母は「はずれの6枚」ではなく<b>全部の8枚</b>です。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 平均・中央値・最頻値
// ---------------------------------------------------------------------------

// 並べる前の順番（中央値で「並べ替える」動きを見せるため、わざとバラバラ）
const RAW = [60, 40, 70, 50, 50];
const SORTED_INDEX = [3, 0, 4, 1, 2]; // RAW[i] が小さい順で何番目か（同じ50は出てきた順）
const MODE_COLS = [40, 50, 60, 70];
const MEAN = 54;

type View = "raw" | "mean" | "median" | "mode" | "summary";
const VIEW_BY_BEAT: View[] = ["raw", "mean", "median", "mode", "summary"];
const CENTER_DELAYS = [1300, 2800, 2800, 2800];
const VIEW_LABEL: Record<"mean" | "median" | "mode", string> = { mean: "平均", median: "中央値", mode: "最頻値" };

const BASE = 18; // 目盛りの下端（px）
const BAR_H = (v: number) => (v / 80) * 104;

function itemBox(view: View, i: number) {
  const v = RAW[i];
  if (view === "mode" || view === "summary") {
    const col = MODE_COLS.indexOf(v);
    const stack = RAW.slice(0, i).filter((x) => x === v).length;
    return { left: `${7 + col * 23.5}%`, width: "16%", bottom: BASE + stack * 30, height: 26, radius: 8 };
  }
  const slot = view === "median" ? SORTED_INDEX[i] : i;
  return { left: `${4 + slot * 19.4}%`, width: "15%", bottom: BASE, height: BAR_H(view === "mean" ? MEAN : v), radius: 4 };
}

export function CenterStage() {
  const { ref, beat, done, reducedMotion, replay } = useBeats(5, CENTER_DELAYS);
  const [picked, setPicked] = useState<View | null>(null);
  const view = picked ?? VIEW_BY_BEAT[beat];
  const focus = view === "summary" ? "mode" : view;

  const tone = (i: number) => {
    const v = RAW[i];
    if (focus === "median") return SORTED_INDEX[i] === 2 ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-700";
    if (focus === "mode") return v === 50 ? "bg-amber-500 text-white" : "bg-gray-300 text-gray-700";
    if (focus === "mean") return "bg-brand-400 text-white";
    return "bg-brand-500 text-white";
  };

  const message: Record<View, ReactNode> = {
    raw: <>5人の点数：60, 40, 70, 50, 50。この「真ん中あたり」を1つの数で表したい。</>,
    mean: (
      <>
        <b className="text-brand-700">平均</b>：でこぼこを平らにならす。合計270 ÷ 5人 <span className="whitespace-nowrap">＝ <b>54点</b></span>
      </>
    ),
    median: (
      <>
        <b className="text-emerald-700">中央値</b>：小さい順に並べて、ちょうど真ん中 <span className="whitespace-nowrap">＝ <b>50点</b></span>
      </>
    ),
    mode: (
      <>
        <b className="text-amber-700">最頻値</b>：同じ値を積み上げて、一番多い <span className="whitespace-nowrap">＝ <b>50点</b>（2人）</span>
      </>
    ),
    summary: <>同じデータでも、見方が3つあります。</>,
  };

  return (
    <Panel>
      <SectionTitle step={5}>平均・中央値・最頻値 ― 同じデータを3つの見方で</SectionTitle>

      <div ref={ref} className="mt-3" data-testid="st-center" data-view={view}>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="見方を選ぶ">
          {(["mean", "median", "mode"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPicked(k)}
              aria-pressed={focus === k && view !== "summary"}
              className={`rounded-lg py-1.5 text-xs font-bold transition active:scale-95 ${
                focus === k && view !== "summary" ? "bg-gray-800 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"
              }`}
            >
              {VIEW_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="relative mt-2 h-[150px] overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-200" aria-hidden>
          <div className="absolute inset-x-2 border-t border-gray-300" style={{ bottom: BASE }} />
          {view === "mean" && (
            <div className={`absolute inset-x-2 border-t-2 border-dashed border-brand-600 ${styles.reveal}`} style={{ bottom: BASE + BAR_H(MEAN) }}>
              <span className="absolute -top-4 right-0 rounded bg-brand-600 px-1 text-[10px] font-bold text-white">平均 54</span>
            </div>
          )}
          {RAW.map((v, i) => {
            const box = itemBox(view, i);
            return (
              <div
                key={i}
                className={`${styles.morph} absolute grid place-items-start justify-center overflow-hidden pt-0.5 text-[11px] font-bold tabular-nums ${tone(i)}`}
                style={{ left: box.left, width: box.width, bottom: box.bottom, height: box.height, borderRadius: box.radius }}
              >
                {v}
              </div>
            );
          })}
          {view === "median" && (
            <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 ${styles.reveal}`}>▲ 真ん中（3番目）</span>
          )}
          {(view === "mode" || view === "summary") && (
            <span className={`absolute bottom-0.5 left-0 right-0 text-center text-[10px] font-bold text-amber-700 ${styles.reveal}`}>50 が2個で一番多い</span>
          )}
        </div>

        <p className="mt-2 min-h-[2.5rem] text-center text-sm leading-relaxed text-gray-700" data-testid="st-center-msg" aria-live="polite">
          {message[view]}
        </p>

        {(done || view === "summary") && (
          <div className={`mt-1 grid grid-cols-3 gap-1.5 text-center ${styles.reveal}`} data-testid="st-center-summary">
            {[
              { k: "平均", v: "54点", how: "ならす", c: "text-brand-700" },
              { k: "中央値", v: "50点", how: "並べて真ん中", c: "text-emerald-700" },
              { k: "最頻値", v: "50点", how: "一番多い", c: "text-amber-700" },
            ].map((r) => (
              <div key={r.k} className="rounded-lg bg-white px-1 py-1.5 ring-1 ring-gray-200">
                <div className={`text-[11px] font-bold ${r.c}`}>{r.k}</div>
                <div className="text-base font-bold text-gray-800">{r.v}</div>
                <div className="text-[10px] text-gray-500">{r.how}</div>
              </div>
            ))}
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
// ⑥ 外れ値
// ---------------------------------------------------------------------------

const OUT_BASE = [40, 50, 50, 60];
const OUT_MAX = 340;
const OUT_H = 150;
const OUT_DELAYS = [1200, 1400, 1400, 1500];
const outY = (v: number) => (v / OUT_MAX) * OUT_H;

export function OutlierStage() {
  const { ref, beat: b, done, reducedMotion, replay } = useBeats(5, OUT_DELAYS);
  const [manual, setManual] = useState<boolean | null>(null);
  const big = manual ?? b >= 1;
  const last = big ? 335 : 70;
  const values = [...OUT_BASE, last];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  // 平均線は棒が伸びてから遅れて動く（何が平均を引っ張ったかを見せる）
  const meanShown = manual !== null || b >= 2 ? mean : 54;
  return (
    <Panel>
      <SectionTitle step={6}>外れ値 ― 平均は引っ張られる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ⑤の5人のうち、70点の1人が<b className="text-gray-800">335</b>だったら？（入力ミスや、極端に大きい値＝<b className="text-gray-800">外れ値</b>）
      </p>

      <div ref={ref} className="mt-3" data-testid="st-outlier" data-last={last} data-mean={meanShown}>
        <div className="relative h-[176px] overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-200" aria-hidden>
          <div className="absolute inset-x-2 border-t border-gray-300" style={{ bottom: 14 }} />
          {values.map((v, i) => (
            <div
              key={i}
              className={`${styles.morph} absolute w-[11%] rounded-t ${i === 4 && big ? "bg-rose-400" : "bg-gray-400"}`}
              style={{ left: `${25 + i * 15}%`, bottom: 14, height: outY(v) }}
            >
              <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[10px] font-bold leading-none tabular-nums text-gray-700">{v}</span>
            </div>
          ))}
          {/* 中央値の線（50）… 動かない */}
          <div className="absolute inset-x-2 border-t-2 border-emerald-600" style={{ bottom: 14 + outY(50) }}>
            <span className="absolute -top-4 left-0 rounded bg-emerald-600 px-1 text-[10px] font-bold text-white">中央値 50</span>
          </div>
          {/* 平均の線 … 外れ値に引っ張られて上がる */}
          <div className={`${styles.morph} absolute inset-x-2 border-t-2 border-dashed border-rose-600`} style={{ bottom: 14 + outY(meanShown) }}>
            <span className="absolute -top-4 right-0 rounded bg-rose-600 px-1 text-[10px] font-bold text-white">平均 {meanShown}</span>
          </div>
        </div>

        {(b >= 3 || manual !== null) && (
          <div className={`mt-3 grid grid-cols-2 gap-2 text-center ${styles.reveal}`} data-testid="st-outlier-compare">
            <div className="rounded-xl bg-rose-50 px-2 py-2 ring-1 ring-rose-200">
              <div className="text-[11px] font-bold text-rose-700">平均</div>
              <div className="text-base font-bold tabular-nums text-gray-800">
                54 → <span className="text-rose-600">{mean}</span>
              </div>
              <div className="text-[10px] text-gray-500">{big ? "大きく引っ張られた" : "元のまま"}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 px-2 py-2 ring-1 ring-emerald-200">
              <div className="text-[11px] font-bold text-emerald-700">中央値</div>
              <div className="text-base font-bold tabular-nums text-gray-800">
                50 → <span className="text-emerald-600">50</span>
              </div>
              <div className="text-[10px] text-gray-500">真ん中の人は変わらない</div>
            </div>
          </div>
        )}
        {b >= 4 && (
          <Note>
            💡 <b>平均は外れ値の影響を受けやすく、中央値は受けにくい</b>。1人の335が合計を押し上げても、並べた真ん中（3番目）は50のままです。
          </Note>
        )}
        {done && (
          <button
            type="button"
            onClick={() => setManual(!big)}
            className="mt-3 w-full rounded-lg py-1.5 text-xs font-bold text-gray-700 ring-1 ring-gray-300 active:scale-95"
          >
            {big ? "335 を 70 に戻す" : "70 を 335 にする"}
          </button>
        )}
        <Replay
          onClick={() => {
            setManual(null);
            replay();
          }}
          hidden={reducedMotion}
        />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑦ ばらつき（分散・標準偏差）
// ---------------------------------------------------------------------------

const GROUPS = [
  { id: "A", values: [48, 49, 50, 51, 52], sd: "約1.4", tone: "#2463d1", top: 22 },
  { id: "B", values: [20, 35, 50, 65, 80], sd: "約21", tone: "#e08a34", top: 112 },
];
const SPREAD_DELAYS = [1100, 1300, 1800, 1500];
const sx = (v: number) => 20 + v * 2.8;

export function SpreadStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, SPREAD_DELAYS);
  return (
    <Panel>
      <SectionTitle step={7}>ばらつき ― 平均からどれだけ離れているか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        2つの組の点数。<b className="text-gray-800">平均はどちらも50点</b>です。でも、同じ「50点の組」でしょうか？
      </p>

      <div ref={ref} className="mt-2" data-testid="st-spread" data-beat={b}>
        <svg viewBox="0 0 320 196" className="w-full" role="img" aria-label="A組 48,49,50,51,52 と B組 20,35,50,65,80。平均はどちらも50">
          {GROUPS.map((g) => (
            <g key={g.id}>
              <text x={4} y={g.top - 8} fontSize="11" fontWeight="700" fill="#374151">
                {g.id}組 {g.values.join(", ")}
              </text>
              {/* 目盛り */}
              <line x1={sx(0)} x2={sx(100)} y1={g.top + 52} y2={g.top + 52} stroke="#d1d5db" />
              {[0, 20, 50, 80, 100].map((t) => (
                <text key={t} x={sx(t)} y={g.top + 64} fontSize="9" textAnchor="middle" fill="#9ca3af">
                  {t}
                </text>
              ))}
              {/* 平均50の線 */}
              {b >= 1 && (
                <line x1={sx(50)} x2={sx(50)} y1={g.top - 2} y2={g.top + 52} stroke="#111827" strokeWidth="1.5" strokeDasharray="3 3" className={styles.fadeLate} style={{ animationDelay: "0ms" }} />
              )}
              {g.values.map((v, i) => {
                const y = g.top + 4 + i * 10;
                return (
                  <g key={i}>
                    {b >= 2 && v !== 50 && (
                      <line
                        x1={sx(v)}
                        x2={sx(50)}
                        y1={y}
                        y2={y}
                        stroke={g.tone}
                        strokeWidth="2"
                        pathLength={1}
                        className={styles.draw}
                        data-testid={`st-gap-${g.id}`}
                      />
                    )}
                    <circle cx={sx(v)} cy={y} r="4" fill={g.tone} />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>

        {b >= 1 && b < 3 && (
          <p className={`text-center text-sm font-bold text-gray-700 ${styles.reveal}`}>
            {b === 1 ? "点線が平均50。A は線のすぐ近く、B は遠くまで散らばっている" : "各点から平均までの線の長さ ＝ 平均からの離れ具合"}
          </p>
        )}
        {b >= 3 && (
          <div className={`grid grid-cols-2 gap-2 text-center ${styles.reveal}`} data-testid="st-spread-sd">
            {GROUPS.map((g) => (
              <div key={g.id} className="rounded-xl bg-gray-50 px-2 py-2 ring-1 ring-gray-200">
                <div className="text-[11px] font-bold text-gray-600">{g.id}組の標準偏差</div>
                <div className="text-lg font-bold tabular-nums" style={{ color: g.tone }}>
                  {g.sd}
                </div>
                <div className="text-[10px] text-gray-500">{g.id === "A" ? "小さい＝まとまっている" : "大きい＝散らばっている"}</div>
              </div>
            ))}
          </div>
        )}
        {b >= 4 && (
          <>
            <Note>
              💡 <b>分散・標準偏差 ＝ ばらつき（平均からの離れ具合）を数値にしたもの</b>。<b>標準偏差が大きいほど、ばらつきが大きい</b>。平均が同じでも、中身の散らばり方は違います。
            </Note>
            <p className={`mt-2 text-[11px] leading-relaxed text-gray-500 ${styles.reveal}`}>
              参考：分散は「離れ具合を2乗して平均したもの」、標準偏差はその平方根。試験ではまず「大きい＝ばらつきが大きい」の読み取りが問われます。
            </p>
          </>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑧ まとめ
// ---------------------------------------------------------------------------

const SUMMARY_ROWS = [
  { k: "確率", v: "欲しい結果の数 ÷ 全部の数", c: "text-rose-700" },
  { k: "代表値", v: "平均＝ならす／中央値＝並べて真ん中／最頻値＝一番多い", c: "text-brand-700" },
  { k: "外れ値", v: "平均は引っ張られる。中央値は動きにくい", c: "text-emerald-700" },
  { k: "ばらつき", v: "標準偏差が大きい ＝ 散らばっている", c: "text-amber-700" },
];
const SUMMARY_DELAYS = [900, 900, 900];

export function StatsSummaryStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(4, SUMMARY_DELAYS);
  return (
    <Panel>
      <SectionTitle step={8}>まとめ：4つの考え方</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">確認問題は、この4つのどれを使うかを選べば解けます。</p>
      <div ref={ref} className="mt-3 space-y-2" data-testid="st-summary" data-beat={b}>
        {SUMMARY_ROWS.map(
          (r, i) =>
            b >= i && (
              <div key={r.k} className={`rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200 ${styles.reveal}`}>
                <b className={`text-sm ${r.c}`}>{r.k}</b>
                <div className="mt-0.5 text-sm font-bold text-gray-800">{r.v}</div>
              </div>
            ),
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑨ 確認4問
// ---------------------------------------------------------------------------

type Q = { level: string; prompt: string; choices: Choice[]; solution: string; cols?: 2 | 3 };

export const STATS_QUESTIONS: Q[] = [
  {
    level: "Lv.1 確率",
    prompt: "10本のくじのうち、当たりは3本。1本引いて当たる確率は？",
    choices: [
      { label: "3/10", ok: true },
      { label: "3/7", why: "分母をはずれの7本にしています。分母は起こり得る全部＝10本です。", step: 0 },
      { label: "7/10", why: "はずれを引く確率です。欲しい結果（当たり3本）を分子にします。", step: 0 },
    ],
    solution: "当たり3本 ÷ 全部10本 ＝ 3/10",
  },
  {
    level: "Lv.2 中央値",
    prompt: "5人の点数が 90, 30, 60, 40, 30 点でした。中央値は？",
    choices: [
      { label: "40点", ok: true },
      { label: "60点", why: "並べ替えずに、書かれた順の真ん中を取っています。中央値は小さい順に並べてから真ん中です。", step: 1 },
      { label: "50点", why: "それは平均（合計250 ÷ 5）です。中央値は並べた真ん中の値です。", step: 1 },
      { label: "30点", why: "それは最頻値（一番多い値）です。中央値は並べた真ん中の値です。", step: 1 },
    ],
    solution: "小さい順に 30, 30, 40, 60, 90 → 真ん中（3番目）＝ 40点",
    cols: 2,
  },
  {
    level: "Lv.3 外れ値",
    prompt: "5人の年収が 300, 350, 400, 450, 3,000 万円。「典型的な人の年収」を表すのに最も適切なものは？",
    choices: [
      { label: "中央値の400万円", ok: true },
      { label: "平均の900万円", why: "平均は外れ値の3,000万円に引っ張られ、5人中4人より高くなっています。外れ値があるときは中央値。", step: 2 },
      { label: "最大値の3,000万円", why: "最大値は1人だけの極端な値（外れ値）で、典型的な人を表しません。", step: 2 },
    ],
    solution: "3,000万円が外れ値。平均（900万円）は引っ張られるので、影響を受けにくい中央値（400万円）を使う",
    cols: 2,
  },
  {
    level: "Lv.4 本試験レベル",
    prompt: "平均点がどちらも60点のP組とQ組。標準偏差はP組が5点、Q組が15点だった。正しい説明はどれか。",
    choices: [
      { label: "Q組の方が、点数が平均から広く散らばっている", ok: true },
      { label: "P組の方が、点数が平均から広く散らばっている", why: "逆です。標準偏差が小さいP組の方が、平均の近くにまとまっています。", step: 3 },
      { label: "Q組の方が、平均点が高い", why: "平均はどちらも60点。標準偏差は平均の高さではなく、ばらつきの大きさを表します。", step: 3 },
    ],
    solution: "標準偏差が大きいほど、ばらつきが大きい → Q組（15点）の方が散らばっている",
    cols: 2,
  },
];

export function StatsPractice() {
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const q = STATS_QUESTIONS[index];
  const last = index === STATS_QUESTIONS.length - 1;
  return (
    <Panel>
      <SectionTitle step={9}>確認問題：4段階で本試験レベルへ</SectionTitle>
      <div className="mt-3">
        <StepChips steps={STATS_STEPS} />
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid="st-practice" data-index={index}>
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-brand-700">{q.level}</span>
          <span className="text-gray-400">
            {index + 1} / {STATS_QUESTIONS.length}
          </span>
        </div>
        <p className="mt-1 text-sm font-bold leading-relaxed text-gray-800">{q.prompt}</p>
        <div className="mt-2">
          <Choices key={index} choices={q.choices} steps={STATS_STEPS} cols={q.cols ?? 3} onAnswer={() => setAnswered(true)} />
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
          🎉 ここまで解ければ、本試験の確率・代表値・ばらつきの問題に対応できます。
        </Note>
      )}
    </Panel>
  );
}
