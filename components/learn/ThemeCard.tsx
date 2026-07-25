// テーマ一覧の1行。カードの羅列ではなく、参考書の目次のような行として描画する。
// 行全体はテーマページへのリンク。次に学ぶレッスンへの直行リンクを重ねる
// (stretched-link + z-index)。
// 攻略図鑑として、未着手/学習中/復習待ち/習得済み/完全習得の5状態を
// 左端の状態線+章番号/アイコンの色+テキスト(LessonStateBadge)で瞬時に判別できるようにする。
// 強調(brand-50背景)は「学習中/次に学ぶ」の行だけ(highlighted)。全行に色は付けない。

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import LessonStateBadge from "@/components/quest/LessonStateBadge";
import type { LessonMasterState } from "@/lib/lessonState";
import { getThemeIcon } from "@/lib/themeIcons";
import type { LearningTheme, ThemeProgress } from "@/types/learningCatalog";

type ThemeCardProps = {
  theme: LearningTheme;
  progress: ThemeProgress;
  masterState: LessonMasterState;
  /** 学習中、または(学習中がないとき)次に学ぶテーマの行だけ true */
  highlighted?: boolean;
  nextLessonTitle?: string;
  nextLessonHref?: string;
};

// 状態ごとの色。線とアイコンは500系、テキストはコントラストの取れる700系を使う。
const STATE_CLASS: Record<
  LessonMasterState,
  { line: string; number: string; icon: string }
> = {
  not_started: { line: "bg-gray-300", number: "text-gray-500", icon: "text-gray-500" },
  in_progress: { line: "bg-brand-500", number: "text-brand-700", icon: "text-brand-500" },
  review_due: { line: "bg-accent-500", number: "text-accent-700", icon: "text-accent-500" },
  mastered: { line: "bg-emerald-500", number: "text-emerald-700", icon: "text-emerald-500" },
  fully_mastered: {
    line: "bg-emerald-700",
    number: "text-emerald-700",
    icon: "text-emerald-700",
  },
};

export default function ThemeCard({
  theme,
  progress,
  masterState,
  highlighted = false,
  nextLessonTitle,
  nextLessonHref,
}: ThemeCardProps) {
  const themeHref = `/learn/${theme.slug}`;
  const showNextLesson =
    masterState !== "fully_mastered" && nextLessonTitle && nextLessonHref;
  const stateClass = STATE_CLASS[masterState];

  return (
    <article
      className={`group relative flex gap-3 p-4 transition ${
        highlighted
          ? "bg-brand-50 hover:bg-brand-100 active:bg-brand-100"
          : "hover:bg-gray-50 active:bg-gray-100"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-2 left-0 w-1 rounded-full ${stateClass.line}`}
      />
      <div className="flex w-9 shrink-0 flex-col items-center gap-1 pt-0.5">
        <p className={`text-sm font-semibold tabular-nums ${stateClass.number}`}>
          {String(theme.chapterNumber).padStart(2, "0")}
        </p>
        <Icon name={getThemeIcon(theme)} className={`h-5 w-5 ${stateClass.icon}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={themeHref}
            className="font-semibold text-gray-900 after:absolute after:inset-0 hover:text-brand-700"
          >
            {theme.title}
          </Link>
          <LessonStateBadge state={masterState} className="mt-0.5" />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{theme.description}</p>
        <p className="mt-2 text-xs tabular-nums text-gray-500">
          {theme.sections.length}セクション・{progress.totalLessons}レッスン・進捗{" "}
          {progress.progressPercent}%
        </p>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"
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
        {(progress.reviewDueCount > 0 || showNextLesson) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {progress.reviewDueCount > 0 && (
              <span className="font-medium text-accent-700">
                復習対象 {progress.reviewDueCount}件
              </span>
            )}
            {showNextLesson && (
              <Link
                href={nextLessonHref}
                className="relative z-10 truncate text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                次に学ぶ：{nextLessonTitle}
              </Link>
            )}
          </p>
        )}
      </div>
      <Icon
        name="chevron-right"
        className="h-4 w-4 shrink-0 self-center text-gray-500 transition group-hover:text-brand-600"
      />
    </article>
  );
}
