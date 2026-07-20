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
import Icon from "@/components/ui/Icon";
import ThemeCard from "@/components/learn/ThemeCard";
import { getThemeMasterState } from "@/lib/lessonState";

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
        title="学ぶ"
        description="試験範囲を参考書の章立てで整理しています。気になる章から開けます。"
        widthClass="max-w-3xl"
      >
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-gray-600">
              学習済み <span className="font-semibold tabular-nums text-gray-900">{completedLessons} / {totalLessons}</span>レッスン
            </span>
            <span className="font-semibold tabular-nums text-gray-900">
              {state === undefined ? "—" : `${overallPercent}%`}
            </span>
          </div>
          <div
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-label="全体の学習進捗"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallPercent}
          >
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${overallPercent}%` }} />
          </div>
        </div>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {continueLesson && continueLocation && (
          <Link
            href={getLessonHref(continueLesson.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-brand-700">前回の続き</p>
              <p className="mt-0.5 truncate font-semibold text-gray-900">{continueLesson.title}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {continueLocation.theme.title} ＞ {continueLocation.section.title}・目安{" "}
                {continueLesson.estimatedMinutes}分
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700">
              続きから
              <Icon name="chevron-right" className="h-4 w-4" />
            </span>
          </Link>
        )}

        <section aria-label="テーマの絞り込み" className="space-y-3">
          <div className="flex w-full max-w-xl rounded-lg border border-gray-300 bg-white p-0.5">
            {FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                aria-pressed={fieldFilter === field.id}
                onClick={() => setFieldFilter(field.id)}
                className={`flex-1 whitespace-nowrap rounded-md px-1 py-1.5 text-[13px] transition ${
                  fieldFilter === field.id
                    ? "bg-brand-600 font-semibold text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>
          <label className="relative block max-w-xl">
            <span className="sr-only">テーマ・セクションを検索</span>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="テーマ・セクションを検索"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 id={`${field}-heading`} className="text-base font-semibold text-gray-900">
                  {FIELD_LABELS[field]}
                </h2>
                <p className="text-xs tabular-nums text-gray-500">
                  {fieldThemes.length}テーマ・進捗 {fieldPercent}%
                </p>
              </div>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                {fieldThemes.map((theme) => {
                  const themeProgress = getThemeProgress(theme, progress);
                  const nextLesson = getNextLessonForTheme(theme, progress);
                  return (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      progress={themeProgress}
                      masterState={getThemeMasterState(theme, progress)}
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
          <section className="rounded-xl border border-gray-200 bg-white py-12 text-center">
            <Icon name="search" className="mx-auto h-6 w-6 text-gray-300" />
            <h2 className="mt-3 text-base font-semibold text-gray-900">一致するテーマがありません</h2>
            <p className="mt-1 text-sm text-gray-500">検索語や分野を変えてみてください。</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFieldFilter("all");
              }}
              className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              絞り込みを解除する
            </button>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
