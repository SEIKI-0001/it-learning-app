"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import styles from "./life.module.css";

// 自動で進むステージ（翻訳・データ形式）の共通部品：場面タイマー／プログラム表示／枠／もう一度見るボタン。

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
