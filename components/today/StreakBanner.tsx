"use client";

// /today 上部のストリークバナー。
// - いまの炎（成長段階つき）とおまもり所持数を見せる
// - 「今日やらないと途切れる」状態のときだけ損失回避の一言を出す（脅しすぎない）
import type { UserProgress } from "@/types";
import { getStreakMeta, isStreakAtRisk, shieldsAvailable } from "@/lib/streak";
import StreakFlame from "@/components/StreakFlame";

export default function StreakBanner({ progress }: { progress: UserProgress }) {
  const meta = getStreakMeta(progress);
  const shields = shieldsAvailable(meta);
  const atRisk = isStreakAtRisk(progress);

  return (
    <div
      className={`rounded-2xl px-4 py-3 ring-1 ${
        atRisk ? "bg-rose-50 ring-rose-200" : "bg-indigo-50 ring-indigo-100"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StreakFlame days={progress.streakCount} />
        {shields > 0 && (
          <span
            title="1日休んでも自動でストリークを守ります"
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200"
          >
            🛡️ おまもり ×{shields}
          </span>
        )}
        {meta.longestStreak > progress.streakCount && (
          <span className="text-xs font-semibold text-gray-500">
            自己ベスト {meta.longestStreak}日
          </span>
        )}
      </div>
      <p
        className={`mt-1.5 text-sm font-semibold ${
          atRisk ? "text-rose-700" : "text-indigo-700"
        }`}
      >
        {atRisk
          ? `🔥 ${progress.streakCount}日ストリークが今日で途切れます — 1トピック完了で守れます`
          : "「完了」を押して、ストリークを伸ばそう"}
      </p>
    </div>
  );
}
