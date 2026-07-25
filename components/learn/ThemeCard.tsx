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
import {
  getLessonHref,
  getLessonStatus,
  getLessonsForSection,
} from "@/lib/learningCatalog";
import { getThemeIcon } from "@/lib/themeIcons";
import type { UserProgress } from "@/types";
import type { LearningTheme, ThemeProgress } from "@/types/learningCatalog";

type ThemeCardProps = {
  theme: LearningTheme;
  progress: ThemeProgress;
  masterState: LessonMasterState;
  /** 学習中、または(学習中がないとき)次に学ぶテーマの行だけ true */
  highlighted?: boolean;
  nextLessonTitle?: string;
  nextLessonHref?: string;
  userProgress?: UserProgress;
  isOpen: boolean;
  onToggle: () => void;
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

const LESSON_STATUS = {
  not_started: { symbol: "○", label: "未着手", className: "text-gray-400" },
  in_progress: { symbol: "▶", label: "学習中", className: "text-brand-600" },
  completed: { symbol: "✓", label: "学習済み", className: "text-emerald-600" },
  review_due: { symbol: "↻", label: "復習対象", className: "text-accent-700" },
} as const;

export default function ThemeCard({
  theme,
  progress,
  masterState,
  highlighted = false,
  nextLessonTitle,
  nextLessonHref,
  userProgress,
  isOpen,
  onToggle,
}: ThemeCardProps) {
  const showNextLesson =
    masterState !== "fully_mastered" && nextLessonTitle && nextLessonHref;
  const stateClass = STATE_CLASS[masterState];
  const panelId = `${theme.id}-lessons`;

  return (
    <article
      className={`group relative transition ${
        highlighted
          ? "bg-brand-50 hover:bg-brand-100 active:bg-brand-100"
          : "hover:bg-gray-50 active:bg-gray-100"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-2 left-0 w-1 rounded-full ${stateClass.line}`}
      />
      <div className="flex gap-3 p-4">
        <div className="flex w-9 shrink-0 flex-col items-center gap-1 pt-0.5">
          <p className={`text-sm font-semibold tabular-nums ${stateClass.number}`}>
            {String(theme.chapterNumber).padStart(2, "0")}
          </p>
          <Icon name={getThemeIcon(theme)} className={`h-5 w-5 ${stateClass.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={`${theme.title}を${isOpen ? "閉じる" : "開く"}`}
            onClick={onToggle}
            className="w-full text-left"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold text-gray-900 group-hover:text-brand-700">
                {theme.title}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <LessonStateBadge state={masterState} />
                <Icon
                  name="chevron-down"
                  className={`h-4 w-4 text-gray-500 transition group-hover:text-brand-600 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-gray-600">
              {theme.description}
            </span>
            <span className="mt-2 block text-xs tabular-nums text-gray-500">
              {theme.sections.length}セクション・{progress.totalLessons}レッスン・進捗{" "}
              {progress.progressPercent}%
            </span>
            <span
              className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label={`${theme.title}の進捗`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.progressPercent}
            >
              <span
                className="block h-full rounded-full bg-brand-600 transition-[width]"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </span>
          </button>
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
                  className="truncate text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                >
                  次に学ぶ：{nextLessonTitle}
                </Link>
              )}
            </p>
          )}
        </div>
      </div>
      {isOpen && (
        <div id={panelId} className="border-t border-gray-100 px-4 py-3 sm:pl-16">
          <div className="space-y-3">
            {theme.sections.map((section) => {
              const lessons = getLessonsForSection(section);
              return (
                <section key={section.id} aria-labelledby={`${section.id}-heading`}>
                  <h3 id={`${section.id}-heading`} className="text-sm font-semibold text-gray-900">
                    {section.order}. {section.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">{section.description}</p>
                  <ul className="mt-1.5 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60 px-2">
                    {lessons.map((lesson) => {
                      const status = LESSON_STATUS[getLessonStatus(lesson.id, userProgress)];
                      return (
                        <li key={lesson.id}>
                          <Link
                            href={getLessonHref(lesson.id, {
                              from: "learn",
                              activity: "learn",
                              anchor: "lesson-content",
                            })}
                            className="flex items-center gap-3 rounded-md px-2 py-2.5 transition hover:bg-white"
                          >
                            <span
                              className={`w-4 text-center text-xs font-semibold ${status.className}`}
                              aria-label={status.label}
                            >
                              {status.symbol}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-gray-800">
                                {lesson.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-gray-500">
                                目安 {lesson.estimatedMinutes}分・{status.label}
                              </span>
                            </span>
                            <Icon name="chevron-right" className="h-4 w-4 text-gray-300" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
