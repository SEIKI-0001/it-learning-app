"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import styles from "./life.module.css";

// プログラムの3つの部品を「朝、家を出るまで」の身近な場面で、自動で動かして見せる。
//   変数     … 天気予報の「雨」が〈天気〉の箱に飛び込む → 名前で呼ぶと中身が出る → 「晴れ」で上書き
//   条件分岐 … 人が「天気は雨？」の分かれ道で、傘の道／そのままの道へ自動で歩いていく
//   繰り返し … 「1段のぼる」を N 回くり返し、人が階段を1段ずつ上がって N 回で止まる
// ボタンで1歩ずつ進める方式はとらない。選ぶのは「条件」（天気・回数）だけで、選ぶとすぐ動き出す。
// 各ステージの下に同じプログラムを置き、いま実行している行が光る。

// ---------------------------------------------------------------------------
// 共通：自動で場面を進めるタイムライン
// ---------------------------------------------------------------------------

/** 画面に見えている間だけ、場面を 0 → count-1 へ自動で進める。runKey が変わると最初から。 */
export function useAutoTimeline(count: number, stepMs: number, runKey: string, reducedMotion: boolean, ref: RefObject<HTMLElement | null>) {
  const fullKey = `${runKey}|${reducedMotion ? "still" : "motion"}`;
  const [phase, setPhase] = useState(0);
  const [key, setKey] = useState(fullKey);
  const [visible, setVisible] = useState(false);

  // 条件が変わったら最初から（描画中の派生 state 更新）。
  // 動きを減らす設定では、最後の場面（結果）から見せる。途中はスライダーで見られる
  if (key !== fullKey) {
    setKey(fullKey);
    setPhase(reducedMotion ? count - 1 : 0);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    if (reducedMotion || !visible || phase >= count - 1) return;
    const t = window.setTimeout(() => setPhase((p) => Math.min(count - 1, p + 1)), stepMs);
    return () => window.clearTimeout(t);
  }, [phase, visible, reducedMotion, count, stepMs]);

  return {
    phase,
    setPhase,
    done: phase >= count - 1,
    replay: () => setPhase(0),
  };
}

export type Line = { text: ReactNode; indent?: boolean; /** 分岐で選ばれず実行されない行 */ skipped?: boolean };

/** ステージの下に置くプログラム。いま実行している行を光らせる */
export function Program({ lines, current, testId }: { lines: Line[]; current: number | null; testId: string }) {
  return (
    <ol className={styles.program} aria-label="プログラム" data-testid={testId}>
      {lines.map((l, i) => (
        <li key={i} className={styles.line} data-current={current === i ? "true" : "false"} data-indent={l.indent ? "true" : "false"} data-skipped={l.skipped ? "true" : "false"}>
          <span className={styles.pc} aria-hidden>
            {current === i ? "▶" : ""}
          </span>
          <code>{l.text}</code>
        </li>
      ))}
    </ol>
  );
}

export function Frame({
  children,
  caption,
  captionTestId,
  footer,
}: {
  children: ReactNode;
  caption: ReactNode;
  captionTestId: string;
  footer: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <p className={styles.caption} aria-live="polite" data-testid={captionTestId}>
        {caption}
      </p>
      {children}
      {footer}
    </div>
  );
}

/** 最後まで動いたら「もう一度見る」。動きを減らす設定では場面スライダー */
export function Replay({
  done,
  onReplay,
  reducedMotion,
  phase,
  count,
  onPhase,
  label,
}: {
  done: boolean;
  onReplay: () => void;
  reducedMotion: boolean;
  phase: number;
  count: number;
  onPhase: (p: number) => void;
  label: string;
}) {
  if (reducedMotion) {
    return (
      <label className={styles.scrub}>
        <span>場面 {phase + 1}/{count}</span>
        <input type="range" min={0} max={count - 1} value={phase} onChange={(e) => onPhase(Number(e.target.value))} aria-label={`${label}の場面`} />
      </label>
    );
  }
  return (
    <div className={styles.replayRow}>
      <button type="button" onClick={onReplay} disabled={!done} className={styles.replay}>
        {done ? "↺ もう一度見る" : "▶ 実行中…"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 変数：天気の箱
// ---------------------------------------------------------------------------

const VAR_SCENES = [
  { line: null, caption: <>〈天気〉という<b>名前の箱</b>を用意。まだ空っぽ。</> },
  { line: 0, caption: <>天気予報の「🌧️雨」を、〈天気〉の箱に<b>入れる</b>（＝代入）。</> },
  { line: 1, caption: <>箱の<b>名前で呼ぶ</b>と、中身の「雨」が出てくる。</> },
  { line: 2, caption: <>予報が変わった！「☀️晴れ」を入れると、前の「雨」は<b>押し出されて消える</b>（上書き）。</> },
  { line: 3, caption: <>同じ名前で呼んでも、出てくるのは<b>いまの中身</b>「晴れ」。</> },
] as const;

const VAR_LINES: Line[] = [
  { text: <>天気 <b>←</b> &quot;雨&quot;</> },
  { text: <>天気 を表示する</> },
  { text: <>天気 <b>←</b> &quot;晴れ&quot;</> },
  { text: <>天気 を表示する</> },
];

export function VariableStage({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const t = useAutoTimeline(VAR_SCENES.length, 1900, String(run), reducedMotion, ref);
  const phase = t.phase;
  const scene = VAR_SCENES[phase];
  const value = phase >= 3 ? "sun" : phase >= 1 ? "rain" : null;
  const reading = phase === 2 || phase === 4;

  return (
    <Frame
      caption={scene.caption}
      captionTestId="var-caption"
      footer={
        <>
          <Program lines={VAR_LINES} current={scene.line} testId="var-program" />
          <Replay
            done={t.done}
            onReplay={() => setRun((r) => r + 1)}
            reducedMotion={reducedMotion}
            phase={phase}
            count={VAR_SCENES.length}
            onPhase={t.setPhase}
            label="変数"
          />
        </>
      }
    >
      <div ref={ref} className={styles.stage} style={{ height: 150 }} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="var-stage" data-phase={phase}>
        <span className={styles.tv} style={{ left: 46, top: 70 }}>
          <span className={styles.tvScreen}>{phase >= 3 ? "☀️" : "🌧️"}</span>
          <small>天気予報</small>
        </span>

        {/* 名前つきの箱 */}
        <span className={styles.box} style={{ left: 150, top: 88 }} aria-hidden>
          <span className={styles.boxLabel}>天気</span>
        </span>
        {value && (
          <span
            key={`${value}-${run}`}
            className={styles.chip}
            style={{ left: 150, top: 86, "--from-x": "-104px", "--from-y": "-22px" } as CSSProperties}
            data-testid="var-value"
            data-value={value}
          >
            {value === "sun" ? "☀️晴れ" : "🌧️雨"}
          </span>
        )}
        {phase >= 3 && (
          <span key={`out-${run}`} className={`${styles.chip} ${styles.chipOut}`} style={{ left: 150, top: 86 }} data-testid="var-ejected">
            🌧️雨
          </span>
        )}
        {phase === 0 && <span className={styles.empty} style={{ left: 150, top: 88 }}>空</span>}

        <span className={styles.person} style={{ left: 252, top: 100 }} aria-hidden>
          🧑
        </span>
        {reading && (
          <span key={phase} className={styles.bubble} style={{ left: 252, top: 44 }} data-testid="var-bubble">
            天気は「{value === "sun" ? "晴れ" : "雨"}」
          </span>
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 条件分岐：雨なら傘
// ---------------------------------------------------------------------------

type Weather = "rain" | "sun";

const P = {
  home: [34, 96],
  fork: [100, 96],
  umbrella: [180, 42],
  plain: [180, 150],
  door: [266, 96],
} as const;

const ROUTE: Record<Weather, string> = {
  rain: `M ${P.home} L ${P.fork} L ${P.umbrella} L ${P.door}`,
  sun: `M ${P.home} L ${P.fork} L ${P.plain} L ${P.door}`,
};

const BRANCH_LINES: Line[] = [
  { text: <>もし 天気 が <b>雨</b> なら</> },
  { text: <>傘を持つ ☂️</>, indent: true },
  { text: <>そうでなければ</> },
  { text: <>そのまま 👟</>, indent: true },
  { text: <>出発する 🚪</> },
];

export function BranchStage({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [weather, setWeather] = useState<Weather>("rain");
  const [run, setRun] = useState(0);
  const t = useAutoTimeline(4, 1300, `${weather}-${run}`, reducedMotion, ref);
  const phase = t.phase;
  const rain = weather === "rain";
  const walkerAt = phase === 0 ? P.home : phase === 1 ? P.fork : phase === 2 ? (rain ? P.umbrella : P.plain) : P.door;
  const line = phase === 0 ? null : phase === 1 ? (rain ? 0 : 2) : phase === 2 ? (rain ? 1 : 3) : 4;
  const decided = phase >= 1;
  const caption =
    phase === 0 ? (
      <>家を出る前に、〈天気〉の箱をチェック。</>
    ) : phase === 1 ? (
      <>
        「天気は雨？」の分かれ道。答えは <b>{rain ? "はい" : "いいえ"}</b>！
      </>
    ) : phase === 2 ? (
      rain ? (
        <>
          <b>はい</b>の道へ。☂️ 傘を持った。
        </>
      ) : (
        <>
          <b>いいえ</b>の道へ。傘は持たずにそのまま。
        </>
      )
    ) : (
      <>
        出発！ <b>条件によって、通る道（実行される処理）が変わった</b>。
      </>
    );

  return (
    <Frame
      caption={caption}
      captionTestId="rain-result"
      footer={
        <>
          <Program lines={BRANCH_LINES} current={line} testId="branch-program" />
          <Replay done={t.done} onReplay={() => setRun((r) => r + 1)} reducedMotion={reducedMotion} phase={phase} count={4} onPhase={t.setPhase} label="条件分岐" />
        </>
      }
    >
      <div className={styles.toggleRow}>
        <span>きょうの天気：</span>
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
              setRun((r) => r + 1);
            }}
            className={styles.toggle}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className={styles.stage}
        style={{ height: 192 }}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-weather={weather}
        data-testid="rain-stage"
        data-route={phase >= 2 ? weather : "none"}
        data-phase={phase}
      >
        <svg className={styles.svg} viewBox="0 0 300 192" aria-hidden>
          {(["rain", "sun"] as const).map((w) => (
            <path key={w} d={ROUTE[w]} className={styles.routePath} data-taken={phase >= 2 ? (w === weather ? "true" : "false") : "idle"} />
          ))}
          {rain &&
            [24, 62, 128, 214, 250, 286].map((x, i) => (
              <line key={x} x1={x} y1={6 + (i % 2) * 7} x2={x - 3} y2={16 + (i % 2) * 7} className={styles.drop} />
            ))}
        </svg>
        <span className={styles.spot} style={{ left: P.home[0], top: P.home[1] }}>
          🏠<small>家</small>
        </span>
        <span className={styles.diamond} style={{ left: P.fork[0], top: P.fork[1] }} data-active={phase === 1 ? "true" : "false"}>
          雨？
        </span>
        <span className={`${styles.branchLabel} ${styles.yes}`} style={{ left: 132, top: 58 }}>
          はい
        </span>
        <span className={`${styles.branchLabel} ${styles.no}`} style={{ left: 132, top: 134 }}>
          いいえ
        </span>
        <span className={styles.spot} style={{ left: P.umbrella[0], top: P.umbrella[1] - 4 }} data-dim={decided && !rain ? "true" : "false"}>
          ☂️<small>傘を持つ</small>
        </span>
        <span className={styles.spot} style={{ left: P.plain[0], top: P.plain[1] + 4 }} data-dim={decided && rain ? "true" : "false"}>
          👟<small>そのまま</small>
        </span>
        <span className={styles.spot} style={{ left: P.door[0], top: P.door[1] }}>
          🚪<small>出発</small>
        </span>
        <span className={styles.walker} style={{ left: walkerAt[0], top: walkerAt[1] - 14 }} data-testid="rain-token" data-at={phase}>
          🧑{rain && phase >= 2 && <span className={styles.umbrella}>☂️</span>}
        </span>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 繰り返し：階段を1段ずつ
// ---------------------------------------------------------------------------

const TIMES_OPTIONS = [3, 5] as const;

export function StairsStage({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [times, setTimes] = useState<(typeof TIMES_OPTIONS)[number]>(5);
  const [run, setRun] = useState(0);
  const count = times + 2; // 0=下 / 1..times=のぼる / times+1=ゴール
  const t = useAutoTimeline(count, 850, `${times}-${run}`, reducedMotion, ref);
  const phase = t.phase;
  const climbed = Math.min(phase, times);
  const goal = phase === count - 1;
  const line = phase === 0 ? null : goal ? 2 : 1;

  // 階段：左下から右上へ。1段の幅と高さは段数に合わせる
  const x0 = 40;
  const y0 = 158;
  const w = 210 / times;
  const h = 110 / times;
  const top = (k: number) => y0 - h * k + 14; // k 段目の踏み面の高さ（0＝地面）
  // k 段目の上に立つ位置（足もと）。0 段目は階段の手前の地面
  const stepAt = (k: number) => (k === 0 ? { x: x0 - 14, y: top(0) + 10 } : { x: x0 + w * (k - 1) + w / 2, y: top(k) });
  const me = stepAt(climbed);

  const lines: Line[] = [
    { text: <><b>{times}回</b> くり返す</> },
    { text: <>1段のぼる</>, indent: true },
    { text: <>「着いた！」と言う</> },
  ];

  return (
    <Frame
      caption={
        phase === 0 ? (
          <>「1段のぼる」を <b>{times}回くり返す</b> プログラムを実行。</>
        ) : goal ? (
          <>
            {times}回で<b>くり返しが終わり</b>、次の行「着いた！」へ進んだ。
          </>
        ) : (
          <>
            同じ命令「1段のぼる」をもう一度…<b>{climbed}回目</b>
          </>
        )
      }
      captionTestId="loop-caption"
      footer={
        <>
          <Program lines={lines} current={line} testId="loop-program" />
          <Replay done={t.done} onReplay={() => setRun((r) => r + 1)} reducedMotion={reducedMotion} phase={phase} count={count} onPhase={t.setPhase} label="繰り返し" />
        </>
      }
    >
      <div className={styles.toggleRow}>
        <span>くり返す回数：</span>
        {TIMES_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={times === n}
            onClick={() => {
              setTimes(n);
              setRun((r) => r + 1);
            }}
            className={styles.toggle}
          >
            {n}回
          </button>
        ))}
      </div>
      <div ref={ref} className={styles.stage} style={{ height: 182 }} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="loop-stage" data-count={climbed}>
        {Array.from({ length: times }, (_, k) => (
          <span
            key={k}
            className={styles.stair}
            data-done={k < climbed ? "true" : "false"}
            style={{ left: x0 + w * k, top: top(k + 1), width: w + 1, height: h * (k + 1) + 10 }}
          >
            <small>{k + 1}</small>
          </span>
        ))}
        <span className={styles.flag} style={{ left: x0 + 210 - 6, top: top(times) - 14 }} data-on={goal ? "true" : "false"}>
          🚩
        </span>
        <span className={styles.walker} style={{ left: me.x, top: me.y }} aria-hidden>
          🧑
        </span>
        <div className={styles.counter} data-testid="loop-counter">
          <b key={climbed}>{climbed}</b>
          <span>/ {times} 回</span>
        </div>
        {goal && <span className={styles.goalBubble} style={{ left: me.x - 18, top: me.y - 40 }}>着いた！</span>}
      </div>
    </Frame>
  );
}
