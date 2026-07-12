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
  in_progress: { symbol: "▶", label: "学習中", className: "text-indigo-600" },
  completed: { symbol: "✓", label: "学習済み", className: "text-emerald-600" },
  review_due: { symbol: "↻", label: "復習対象", className: "text-amber-600" },
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
      <header className="border-b border-gray-200 bg-white px-4 py-6">
        <div className="mx-auto w-full max-w-4xl">
          <nav aria-label="パンくず" className="text-sm font-semibold text-gray-500">
            <Link href="/learn" className="hover:text-indigo-600">学ぶ</Link>
            <span aria-hidden> ＞ </span>
            <span>{theme.title}</span>
          </nav>
          <div className="mt-5 flex items-start gap-4">
            <span className="text-4xl" aria-hidden>{theme.icon}</span>
            <div>
              <p className="text-xs font-extrabold text-indigo-600">第{theme.chapterNumber}章</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">{theme.title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{theme.description}</p>
            </div>
          </div>
          <div className="mt-5 max-w-xl">
            <div className="flex items-center justify-between text-sm font-bold text-gray-700">
              <span>進捗 {progress.completedLessons} / {progress.totalLessons}レッスン</span>
              <span>{progress.progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label={`${theme.title}の進捗`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.progressPercent}>
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress.progressPercent}%` }} />
            </div>
          </div>
          {nextLesson && (
            <Link
              href={getLessonHref(nextLesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
              className="mt-5 inline-flex items-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white"
            >
              続きから学ぶ：{nextLesson.title} <span aria-hidden className="ml-1">→</span>
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <h2 className="text-xl font-extrabold text-gray-900">セクション</h2>
        <div className="mt-4 space-y-3">
          {theme.sections.map((section) => {
            const lessons = getLessonsForSection(section);
            const completed = lessons.filter((lesson) => getLessonStatus(lesson.id, state?.progress) === "completed").length;
            return (
              <details
                key={section.id}
                open={section.id === openSectionId}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none px-5 py-4 marker:content-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-extrabold text-gray-900">{section.order}. {section.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-gray-500">{completed} / {lessons.length}完了</span>
                  </div>
                </summary>
                <ul className="border-t border-gray-100 px-3 py-2">
                  {lessons.map((lesson) => {
                    const status = STATUS[getLessonStatus(lesson.id, state?.progress)];
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={getLessonHref(lesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-gray-50"
                        >
                          <span className={`w-5 text-center font-extrabold ${status.className}`} aria-label={status.label}>{status.symbol}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-gray-800">{lesson.title}</span>
                            <span className="mt-0.5 block text-xs text-gray-500">目安 {lesson.estimatedMinutes}分・{status.label}</span>
                          </span>
                          <span aria-hidden className="text-gray-400">›</span>
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
