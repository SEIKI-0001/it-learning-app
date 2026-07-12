"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FIELD_LABELS, type TopicField } from "@/types/content";
import { useAppState } from "@/lib/useAppState";
import {
  getAllThemes,
  getContinueLesson,
  getLessonHref,
  getLessonLocation,
  getLessonsForTheme,
  getNextLessonForTheme,
  getThemeProgress,
} from "@/lib/learningCatalog";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import ThemeCard from "@/components/learn/ThemeCard";

type FieldFilter = "all" | TopicField;

const FIELDS: { id: FieldFilter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "strategy", label: "ストラテジ" },
  { id: "management", label: "マネジメント" },
  { id: "technology", label: "テクノロジ" },
];

const FIELD_ORDER: TopicField[] = ["strategy", "management", "technology"];

export default function LearnHome() {
  const [state] = useAppState();
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>("all");
  const [query, setQuery] = useState("");
  const themes = useMemo(() => getAllThemes(), []);
  const progress = state?.progress;

  const visibleThemes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");
    return themes.filter((theme) => {
      if (fieldFilter !== "all" && theme.field !== fieldFilter) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        theme.title,
        theme.description,
        ...theme.sections.flatMap((section) => [section.title, section.description]),
        ...getLessonsForTheme(theme).flatMap((lesson) => [
          lesson.title,
          lesson.summary,
          ...lesson.tags,
          ...lesson.referenceHints.flatMap((hint) => hint.keywords),
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase("ja-JP");
      return searchable.includes(normalizedQuery);
    });
  }, [fieldFilter, query, themes]);

  const allProgress = useMemo(
    () => themes.map((theme) => getThemeProgress(theme, progress)),
    [progress, themes],
  );
  const totalLessons = allProgress.reduce((sum, item) => sum + item.totalLessons, 0);
  const completedLessons = allProgress.reduce(
    (sum, item) => sum + item.completedLessons,
    0,
  );
  const overallPercent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const continueLesson = getContinueLesson(progress);
  const continueLocation = continueLesson
    ? getLessonLocation(continueLesson.id)
    : undefined;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        eyebrow="ITパスポートのナレッジベース"
        title="学ぶ"
        description="ITパスポートの試験範囲を、参考書の章のようにテーマ別に整理しています。"
        widthClass="max-w-6xl"
      >
        <div className="mt-5 max-w-md rounded-2xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-indigo-950">学習済み {completedLessons} / {totalLessons}レッスン</span>
            <span className="font-extrabold text-indigo-700">{state === undefined ? "読み込み中" : `${overallPercent}%`}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden>
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${overallPercent}%` }} />
          </div>
        </div>
      </PageHeader>

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6">
        {continueLesson && continueLocation && (
          <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-extrabold text-indigo-600">前回の続き</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-extrabold text-gray-900">{continueLesson.title}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {continueLocation.theme.title} ＞ {continueLocation.section.title}
                </p>
                <p className="mt-1 text-xs text-gray-500">目安 {continueLesson.estimatedMinutes}分</p>
              </div>
              <Link
                href={getLessonHref(continueLesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white"
              >
                続きから学ぶ <span aria-hidden className="ml-1">→</span>
              </Link>
            </div>
          </section>
        )}

        <section aria-label="テーマの絞り込み" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                aria-pressed={fieldFilter === field.id}
                onClick={() => setFieldFilter(field.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  fieldFilter === field.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>
          <label className="relative block max-w-xl">
            <span className="sr-only">テーマ・セクションを検索</span>
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="テーマ・セクションを検索"
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </section>

        {FIELD_ORDER.map((field) => {
          const fieldThemes = visibleThemes.filter((theme) => theme.field === field);
          if (fieldThemes.length === 0) return null;
          const fieldProgress = fieldThemes.map((theme) => getThemeProgress(theme, progress));
          const fieldLessons = fieldProgress.reduce((sum, item) => sum + item.totalLessons, 0);
          const fieldCompleted = fieldProgress.reduce((sum, item) => sum + item.completedLessons, 0);
          const fieldPercent = fieldLessons === 0 ? 0 : Math.round((fieldCompleted / fieldLessons) * 100);

          return (
            <section key={field} aria-labelledby={`${field}-heading`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id={`${field}-heading`} className="text-xl font-extrabold text-gray-900">
                    {FIELD_LABELS[field]}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {fieldThemes.length}テーマ・進捗 {fieldPercent}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fieldThemes.map((theme) => {
                  const themeProgress = getThemeProgress(theme, progress);
                  const nextLesson = getNextLessonForTheme(theme, progress);
                  return (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      progress={themeProgress}
                      nextLessonTitle={nextLesson?.title}
                      nextLessonHref={
                        nextLesson
                          ? getLessonHref(nextLesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        {visibleThemes.length === 0 && (
          <section className="rounded-3xl bg-white py-14 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-3xl" aria-hidden>🔍</p>
            <h2 className="mt-3 text-lg font-extrabold text-gray-800">一致するテーマがありません</h2>
            <p className="mt-1 text-sm text-gray-500">検索語や分野を変えてみてください。</p>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
