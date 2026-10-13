"use client";

import { useEffect, useState } from "react";
import { useInView } from "../scene/useInView";
import { useReducedMotion } from "../scene/useReducedMotion";

// 教師あり・教師なし・強化学習のアニメで共通の「コマ送り」。
// コマ i を durations[i] ms 見せたら次へ。見えている間だけ進み（別スライドへ行くと止まる）、
// reduced-motion なら最後のコマ（完成図）を最初から出す。
// 認知負荷を抑えるため、1コマで変えるのは1つだけ・一言も1つだけにする。

export function useStoryboard(durations: readonly number[]) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const last = durations.length - 1;

  useEffect(() => {
    if (!inView || reduced || frame >= last) return;
    const timer = window.setTimeout(
      () => setFrame((f) => Math.min(f + 1, last)),
      durations[frame],
    );
    return () => window.clearTimeout(timer);
  }, [inView, reduced, frame, last, durations]);

  const shown = reduced ? last : frame;
  return { ref, frame: shown, done: shown >= last, replay: () => setFrame(0) };
}

/**
 * 図の上の一言。左に「いま何番目か」（1 2 3 の丸）、右は終わったときだけ「もう一度」。
 * steps は4つまで（total=0 なら丸を出さない）。一言は1行（20字前後）に収める。
 */
export function StoryCaption({
  step,
  total,
  text,
  done,
  replay,
  testId,
}: {
  step: number;
  total: number;
  text: string;
  done: boolean;
  replay: () => void;
  testId?: string;
}) {
  return (
    <div className="flex min-h-[2.25rem] items-center gap-2">
      {total > 0 && (
        <span
          className="flex flex-none gap-1"
          aria-label={`${total}つのうち${step + 1}つ目`}
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                i === step
                  ? "bg-brand-600 text-white"
                  : i < step
                    ? "bg-brand-100 text-brand-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </span>
      )}
      <p
        aria-live="polite"
        data-testid={testId}
        className="min-w-0 flex-1 text-[14px] font-bold leading-snug text-gray-900"
      >
        {text}
      </p>
      {done && (
        <button
          type="button"
          onClick={replay}
          className="flex-none rounded-full px-2 py-1 text-[12px] font-bold text-gray-500 hover:text-brand-700"
        >
          ↺ もう一度
        </button>
      )}
    </div>
  );
}
