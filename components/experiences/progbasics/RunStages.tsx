"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./progbasics.module.css";

// プログラムの3つの部品を「実行」として見せる小さなステージ。
//   代入   … 値のチップがコードの行から箱へ飛び込む。2回目の代入で前の値は押し出されて消える
//   分岐   … 実行トークン（人）が「雨？」で はい／いいえ の道に分かれて進む
//   繰り返し … トークンがトラックを1周するたびにカウンターが 1→2→…→5 と進み、5回で抜ける
// ステージは固定幅（300px）。トークンの経路を px の offset-path で描くため。

// ---------------------------------------------------------------------------
// 代入
// ---------------------------------------------------------------------------

const ASSIGN_LINES = [
  { value: 10, y: 34 },
  { value: 20, y: 66 },
] as const;

export function AssignStage({ reducedMotion }: { reducedMotion: boolean }) {
  const [pc, setPc] = useState(0); // 実行済みの行数
  const value = pc === 0 ? null : ASSIGN_LINES[pc - 1].value;
  const ejected = pc === 2 ? ASSIGN_LINES[0].value : null;
  return (
    <div>
      <div className={styles.assignStage} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="assign-stage" data-pc={pc}>
        <div className={styles.codePanel} aria-label="プログラム">
          {ASSIGN_LINES.map((l, i) => (
            <div key={l.value} className={styles.codeLine} data-current={pc === i ? "true" : "false"} data-done={pc > i ? "true" : "false"} style={{ top: l.y - 12 }}>
              <span className={styles.pc} aria-hidden>
                {pc === i ? "▶" : ""}
              </span>
              <code>
                score = <b>{l.value}</b>
              </code>
            </div>
          ))}
        </div>

        {/* 名前つきの箱（上面＋前面で 2.5D） */}
        <div className={styles.varBox} aria-hidden>
          <span className={styles.varTop} />
          <span className={styles.varFront} />
          <span className={styles.varName}>score</span>
        </div>
        {value !== null && (
          <span
            key={`in-${pc}`}
            className={styles.valueChip}
            style={{ "--fy": `${ASSIGN_LINES[pc - 1].y}px` } as CSSProperties}
            data-testid="assign-value"
          >
            {value}
          </span>
        )}
        {ejected !== null && (
          <span key="out" className={`${styles.valueChip} ${styles.valueOut}`} data-testid="assign-ejected">
            {ejected}
          </span>
        )}
        {ejected !== null && <span className={styles.ejectNote}>10 は消えた（上書き）</span>}
        {value === null && <span className={styles.emptyNote}>まだ空っぽ</span>}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setPc((p) => Math.min(2, p + 1))}
          disabled={pc >= 2}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
        >
          ▶ 1行実行
        </button>
        <button type="button" onClick={() => setPc(0)} className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95" aria-label="代入を最初から">
          ↺
        </button>
      </div>
      <p className="mt-1.5 min-h-[1.2em] text-center text-xs font-bold text-gray-600" aria-live="polite" data-testid="assign-note">
        {pc === 0 && "「1行実行」で、プログラムを上から1行ずつ動かそう"}
        {pc === 1 && "10 が score の箱に入った"}
        {pc === 2 && "20 が入り、前の 10 は押し出された＝箱の中身は1つだけ。新しい代入で置き換わる"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 分岐
// ---------------------------------------------------------------------------

type Weather = "rain" | "sun";

const ROUTE: Record<Weather, string> = {
  rain: "M 34 92 L 96 92 L 150 40 L 206 40 L 262 92",
  sun: "M 34 92 L 96 92 L 150 138 L 206 138 L 262 92",
};

export function RainRouteStage({ reducedMotion }: { reducedMotion: boolean }) {
  const [weather, setWeather] = useState<Weather>("rain");
  const [run, setRun] = useState(0); // 実行した回数（トークンを作り直すキー）
  const [ranWith, setRanWith] = useState<Weather | null>(null);
  const done = ranWith === weather;
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 text-xs">
        <span className="font-bold text-gray-500">きょうの天気：</span>
        {(
          [
            { v: "rain", label: "🌧️ 雨" },
            { v: "sun", label: "☀️ 晴れ" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={weather === o.v}
            onClick={() => {
              setWeather(o.v);
              setRanWith(null);
            }}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition active:scale-95 ${
              weather === o.v ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div
        className={styles.routeStage}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-weather={weather}
        data-testid="rain-stage"
        data-route={done ? weather : "none"}
      >
        <svg className={styles.routeSvg} viewBox="0 0 300 176" aria-hidden>
          {(["rain", "sun"] as const).map((w) => (
            <path key={w} d={ROUTE[w]} className={styles.routePath} data-taken={done && ranWith === w ? "true" : done ? "false" : "idle"} />
          ))}
          {weather === "rain" &&
            [30, 70, 120, 180, 230, 272].map((x, i) => (
              <line key={x} x1={x} y1={8 + (i % 2) * 6} x2={x - 3} y2={18 + (i % 2) * 6} className={styles.drop} />
            ))}
        </svg>
        <span className={styles.spot} style={{ left: 34, top: 92 }}>
          🏠<small>家</small>
        </span>
        <span className={`${styles.spot} ${styles.diamond}`} style={{ left: 96, top: 92 }}>
          雨？
        </span>
        <span className={`${styles.branchLabel} ${styles.yes}`} style={{ left: 116, top: 54 }}>
          はい
        </span>
        <span className={`${styles.branchLabel} ${styles.no}`} style={{ left: 116, top: 132 }}>
          いいえ
        </span>
        <span className={styles.spot} style={{ left: 178, top: 40 }} data-dim={done && ranWith !== "rain" ? "true" : "false"}>
          ☂️<small>傘を持つ</small>
        </span>
        <span className={styles.spot} style={{ left: 178, top: 138 }} data-dim={done && ranWith !== "sun" ? "true" : "false"}>
          👟<small>そのまま</small>
        </span>
        <span className={styles.spot} style={{ left: 262, top: 92 }}>
          🚪<small>出発</small>
        </span>
        {run > 0 && ranWith && (
          <span
            key={run}
            className={styles.walker}
            data-animate={reducedMotion ? "false" : "true"}
            style={{ offsetPath: `path("${ROUTE[ranWith]}")` } as CSSProperties}
            data-testid="rain-token"
            aria-hidden
          >
            🧑{ranWith === "rain" && <span className={styles.umbrella}>☂️</span>}
          </span>
        )}
      </div>
      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={() => {
            setRanWith(weather);
            setRun((r) => r + 1);
          }}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-bold text-white active:scale-95"
        >
          ▶ 実行する
        </button>
      </div>
      <p className="mt-1.5 min-h-[1.2em] text-center text-xs font-bold text-gray-600" aria-live="polite" data-testid="rain-result">
        {done ? (ranWith === "rain" ? "「雨？」→ はい：傘の道を通って出発" : "「雨？」→ いいえ：傘は取らずにそのまま出発") : "天気を選んで「実行する」を押そう"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 繰り返し
// ---------------------------------------------------------------------------

const LOOP_PATH = "M 70 110 L 230 110 A 32 32 0 0 0 230 46 L 70 46 A 32 32 0 0 0 70 110";

export function LoopTrackStage({
  count,
  times,
  reducedMotion,
}: {
  count: number;
  times: number;
  reducedMotion: boolean;
}) {
  const done = count >= times;
  return (
    <div className={styles.loopStage} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="loop-stage" data-count={count}>
      <svg className={styles.routeSvg} viewBox="0 0 300 150" aria-hidden>
        <path d={LOOP_PATH} className={styles.track} />
        <path d="M 264 78 L 290 78" className={styles.exit} data-open={done ? "true" : "false"} />
      </svg>
      <span className={styles.station} style={{ left: 150, top: 46 }}>
        「こんにちは」と表示
      </span>
      <span className={styles.exitLabel} data-open={done ? "true" : "false"}>
        {done ? "5回で終了 →" : "まだ出られない"}
      </span>
      <div className={styles.counter} data-testid="loop-counter">
        <span className={styles.counterValue} key={count}>
          {Math.min(count, times)}
        </span>
        <span className={styles.counterMax}>/ {times} 回</span>
      </div>
      {count > 0 && (
        <span
          key={count}
          className={styles.lapToken}
          data-animate={reducedMotion ? "false" : "true"}
          style={{ offsetPath: `path("${LOOP_PATH}")` } as CSSProperties}
          aria-hidden
        />
      )}
    </div>
  );
}

/** 繰り返しの自動実行（reduced-motion では使わない）。0.9秒ごとに1周。 */
export function useAutoLoop(active: boolean, step: () => void, canStep: boolean) {
  useEffect(() => {
    if (!active || !canStep) return;
    const t = window.setTimeout(step, 1100);
    return () => window.clearTimeout(t);
  }, [active, canStep, step]);
}
