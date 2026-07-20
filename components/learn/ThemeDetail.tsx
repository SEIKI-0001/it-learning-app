"use client";

import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import {
  getLessonHref,
  getLessonStatus,
  getLessonsForSection,
  getNextLessonForTheme,
  getThemeBySlug,
  getThemeProgress,
} from "@/lib/learningCatalog";
import BottomNav from "@/components/BottomNav";

const STATUS = {
  not_started: { symbol: "○", label: "未着手", className: "text-gray-400" },
  in_progress: { symbol: "▶", label: "学習中", className: "text-brand-600" },
  completed: { symbol: "✓", label: "学習済み", className: "text-emerald-600" },
  review_due: { symbol: "↻", label: "復習対象", className: "text-accent-700" },
} as const;

export default function ThemeDetail({ themeSlug }: { themeSlug: string }) {
  const [state] = useAppState();
  const theme = getThemeBySlug(themeSlug);
  if (!theme) return null;

  const progress = getThemeProgress(theme, state?.progress);
  const nextLesson = getNextLessonForTheme(theme, state?.progress);
  const openSectionId = nextLesson
    ? theme.sections.find((section) => section.lessonIds.includes(nextLesson.id))?.id
    : theme.sections[0]?.id;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="border-b border-gray-200 bg-white px-4 py-5">
        <div className="mx-auto w-full max-w-3xl">
          <nav aria-label="パンくず" className="text-xs text-gray-500">
            <Link href="/learn" className="text-brand-700 hover:underline">学ぶ</Link>
            <span aria-hidden> ＞ </span>
            <span>{theme.title}</span>
          </nav>
          <p className="mt-4 text-xs font-medium text-gray-500">第{theme.chapterNumber}章</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">{theme.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{theme.description}</p>
          <div className="mt-4 max-w-xl">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                進捗 <span className="font-semibold tabular-nums text-gray-900">{progress.completedLessons} / {progress.totalLessons}</span>レッスン
              </span>
              <span className="font-semibold tabular-nums text-gray-900">{progress.progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label={`${theme.title}の進捗`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.progressPercent}>
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress.progressPercent}%` }} />
            </div>
          </div>
          {nextLesson && (
            <Link
              href={getLessonHref(nextLesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              続きから学ぶ：{nextLesson.title}
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <h2 className="text-base font-semibold text-gray-900">セクション</h2>
        <div className="mt-3 space-y-3">
          {theme.sections.map((section) => {
            const lessons = getLessonsForSection(section);
            const completed = lessons.filter((lesson) => getLessonStatus(lesson.id, state?.progress) === "completed").length;
            return (
              <details
                key={section.id}
                open={section.id === openSectionId}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-gray-900">{section.order}. {section.title}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{section.description}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-gray-500">{completed} / {lessons.length}完了</span>
                  </div>
                </summary>
                <ul className="border-t border-gray-100 px-2 py-1.5">
                  {lessons.map((lesson) => {
                    const status = STATUS[getLessonStatus(lesson.id, state?.progress)];
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={getLessonHref(lesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
                          className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-gray-50"
                        >
                          <span className={`w-5 text-center font-semibold ${status.className}`} aria-label={status.label}>{status.symbol}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-gray-800">{lesson.title}</span>
                            <span className="mt-0.5 block text-xs text-gray-500">目安 {lesson.estimatedMinutes}分・{status.label}</span>
                          </span>
                          <span aria-hidden className="text-gray-300">›</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
