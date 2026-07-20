// テーマ一覧の1行。カードの羅列ではなく、参考書の目次のような行として描画する。
// 行全体はテーマページへのリンク。学習中のテーマだけ「続きから学ぶ」の
// レッスン直行リンクを重ねる(stretched-link + z-index)。

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { LearningTheme, ThemeProgress } from "@/types/learningCatalog";

type ThemeCardProps = {
  theme: LearningTheme;
  progress: ThemeProgress;
  nextLessonTitle?: string;
  nextLessonHref?: string;
};

export default function ThemeCard({
  theme,
  progress,
  nextLessonTitle,
  nextLessonHref,
}: ThemeCardProps) {
  const themeHref = `/learn/${theme.slug}`;
  const inProgress = progress.status === "in_progress";

  return (
    <article className="relative flex gap-3 p-4 transition hover:bg-gray-50">
      <p className="w-9 shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums text-gray-400">
        {String(theme.chapterNumber).padStart(2, "0")}
      </p>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={themeHref}
            className="font-semibold text-gray-900 after:absolute after:inset-0 hover:text-brand-700"
          >
            {theme.title}
          </Link>
          {progress.status !== "not_started" && (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                progress.status === "completed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-brand-200 bg-brand-50 text-brand-700"
              }`}
            >
              {progress.status === "completed" ? "学習完了" : "学習中"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{theme.description}</p>
        <p className="mt-2 text-xs tabular-nums text-gray-500">
          {theme.sections.length}セクション・{progress.totalLessons}レッスン・進捗{" "}
          {progress.progressPercent}%
        </p>
        <div
          className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label={`${theme.title}の進捗`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.progressPercent}
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        {(progress.reviewDueCount > 0 || (inProgress && nextLessonTitle && nextLessonHref)) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {progress.reviewDueCount > 0 && (
              <span className="font-medium text-accent-700">
                復習対象 {progress.reviewDueCount}件
              </span>
            )}
            {inProgress && nextLessonTitle && nextLessonHref && (
              <Link
                href={nextLessonHref}
                className="relative z-10 truncate text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                続きから学ぶ：{nextLessonTitle}
              </Link>
            )}
          </p>
        )}
      </div>
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 self-center text-gray-300" />
    </article>
  );
}
