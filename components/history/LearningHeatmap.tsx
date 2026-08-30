"use client";

// 学習ヒートマップ（GF-P1-004）。
//
// 中立的な可視化に徹する。未学習日は「失敗」ではないので警告色を使わず、
// 面の濃淡だけで学習量を示す。濃淡は色だけに依存させず、各日に解答数を
// aria-label で持たせて読み上げでも分かるようにする。

import type { LearningHeatmap as Heatmap } from "@/lib/learningHistory";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 強度ごとの面。0 は「学習していない日」で、警告ではなく単なる余白色。 */
const INTENSITY_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-gray-100",
  1: "bg-brand-100",
  2: "bg-brand-300",
  3: "bg-brand-500",
  4: "bg-brand-700",
};

export default function LearningHeatmap({ heatmap }: { heatmap: Heatmap }) {
  const leadingBlanks = heatmap.days[0]?.weekday ?? 0;

  return (
    <section aria-labelledby="heatmap-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="heatmap-heading" className="text-sm font-semibold text-gray-900">
          {heatmap.year}年{heatmap.month}月の学習
        </h2>
        <p className="text-xs tabular-nums text-gray-500">{heatmap.studiedDayCount}日</p>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-7 gap-1" aria-hidden>
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="text-center text-[10px] text-gray-400">
              {label}
            </span>
          ))}
        </div>
        <ul className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <li key={`blank-${index}`} aria-hidden />
          ))}
          {heatmap.days.map((day) => (
            <li key={day.date}>
              <span
                className={`flex aspect-square items-center justify-center rounded text-[10px] tabular-nums ${
                  INTENSITY_CLASS[day.intensity]
                } ${day.intensity >= 3 ? "text-white" : "text-gray-500"}`}
                title={`${day.dayOfMonth}日：${day.answerCount}問`}
                aria-label={
                  day.answerCount > 0
                    ? `${day.dayOfMonth}日 ${day.answerCount}問`
                    : `${day.dayOfMonth}日 学習なし`
                }
              >
                {day.dayOfMonth}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        色が濃い日ほど多く解いた日です。空いている日に印はつけません。
      </p>
    </section>
  );
}
