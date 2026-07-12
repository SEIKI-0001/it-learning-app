import Link from "next/link";
import { FIELD_LABELS } from "@/types/content";
import type { LearningTheme, ThemeProgress } from "@/types/learningCatalog";

const FIELD_STYLE = {
  strategy: "bg-amber-50 text-amber-800 ring-amber-200",
  management: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  technology: "bg-indigo-50 text-indigo-800 ring-indigo-200",
} as const;

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
  const ctaLabel =
    progress.status === "in_progress" && nextLessonHref
      ? "続きから学ぶ"
      : "テーマを見る";
  const ctaHref =
    progress.status === "in_progress" && nextLessonHref ? nextLessonHref : themeHref;
  const statusLabel =
    progress.status === "not_started"
      ? "未着手"
      : progress.status === "completed"
        ? "学習完了"
        : "学習中";

  return (
    <article className="flex min-h-[290px] h-full flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="text-3xl" aria-hidden>
          {theme.icon}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${FIELD_STYLE[theme.field]}`}
        >
          {FIELD_LABELS[theme.field]}
        </span>
      </div>

      <p className="mt-4 text-xs font-bold text-gray-400">第{theme.chapterNumber}章</p>
      <Link href={themeHref} className="mt-1 rounded-sm text-lg font-extrabold text-gray-900 hover:text-indigo-700 focus-visible:outline-offset-4">
        {theme.title}
      </Link>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{theme.description}</p>

      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-500">
        <span>{theme.sections.length}セクション・{progress.totalLessons}レッスン</span>
        <span>{statusLabel}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label={`${theme.title}の進捗`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.progressPercent}
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width]"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs font-bold text-gray-700">進捗 {progress.progressPercent}%</p>

      <div className="mt-auto pt-4">
        {progress.status === "in_progress" && nextLessonTitle && (
          <p className="mb-3 text-sm text-gray-600">
            <span className="font-bold text-gray-800">次：</span>{nextLessonTitle}
          </p>
        )}
        {progress.reviewDueCount > 0 && (
          <p className="mb-3 text-xs font-bold text-amber-700">
            復習対象 {progress.reviewDueCount}件
          </p>
        )}
        <Link
          href={ctaHref}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          {ctaLabel}
          <span aria-hidden className="ml-1">→</span>
        </Link>
      </div>
    </article>
  );
}
