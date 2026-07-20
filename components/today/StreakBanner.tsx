"use client";

// /today「今日の状況」内のストリーク表示。
// - いまの炎（成長段階つき）とおまもり所持数を見せる
// - 「今日やらないと途切れる」状態のときだけ損失回避の一言を出す（脅しすぎない）
import type { UserProgress } from "@/types";
import { getStreakMeta, isStreakAtRisk, shieldsAvailable } from "@/lib/streak";
import StreakFlame from "@/components/StreakFlame";
import Icon from "@/components/ui/Icon";

export default function StreakBanner({ progress }: { progress: UserProgress }) {
  const meta = getStreakMeta(progress);
  const shields = shieldsAvailable(meta);
  const atRisk = isStreakAtRisk(progress);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <StreakFlame days={progress.streakCount} />
        {shields > 0 && (
          <span
            title="1日休んでも自動でストリークを守ります"
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700"
          >
            <Icon name="shield" className="h-3.5 w-3.5 text-brand-600" />
            おまもり ×{shields}
          </span>
        )}
        {meta.longestStreak > progress.streakCount && (
          <span className="text-xs text-gray-500">
            自己ベスト {meta.longestStreak}日
          </span>
        )}
      </div>
      <p
        className={`mt-1.5 text-sm ${
          atRisk ? "font-semibold text-accent-700" : "text-gray-600"
        }`}
      >
        {atRisk
          ? `${progress.streakCount}日続いた学習が今日で途切れます。1トピック完了で守れます`
          : "「完了」を押して、連続日数を伸ばそう"}
      </p>
    </div>
  );
}
