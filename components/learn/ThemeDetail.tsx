"use client";

import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import {
  getLessonHref,
  getLessonStatus,
  getLessonsForSection,
  getLessonsForTheme,
  getNextLessonForTheme,
  getThemeBySlug,
  getThemeProgress,
} from "@/lib/learningCatalog";
import BottomNav from "@/components/BottomNav";
import { hasThemeExam } from "@/lib/themeExam";
import { getThemeExamRecord, getUnderstandingFollowUps } from "@/lib/chapterReview";

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
  const examRecord = getThemeExamRecord(state?.progress, theme.slug);
  const lessons = getLessonsForTheme(theme);
  const lessonTitles = new Map(lessons.map((lesson) => [lesson.id, lesson.title]));
  const followUps = getUnderstandingFollowUps(state?.progress, {
    topicIds: lessons.map((lesson) => lesson.id),
  });

  return (
    <main className="min-h-screen pb-24">
      <header className="pt-3 md:pt-6 lg:pt-8">
        <div className="mx-auto w-full max-w-3xl px-3 md:px-4">
          <div className="rounded-[14px] bg-brand-50 px-[18px] py-5 md:rounded-2xl md:px-7 md:py-6">
          <nav aria-label="パンくず" className="text-xs text-gray-500">
            <Link href="/learn" className="text-brand-700 hover:underline">学ぶ</Link>
            <span aria-hidden> ＞ </span>
            <span>{theme.title}</span>
          </nav>
          <p className="mt-4 text-xs font-medium text-gray-500">第{theme.chapterNumber}章</p>
          <h1 className="mt-2 text-2xl font-medium leading-snug tracking-[-0.015em] text-gray-900 md:text-[30px]">{theme.title}</h1>
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
            >
              続きから学ぶ：{nextLesson.title}
            </Link>
          )}
        </div>
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

        {/* 章を通した仕上げ。各レッスンの確認パックとは役割が違うので、セクションの後に置く。 */}
        {hasThemeExam(theme.slug) && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              総まとめ試験
              {examRecord?.passed && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  ✓ 合格済み
                </span>
              )}
            </h2>
            {examRecord && (
              <p className="mt-1 text-sm tabular-nums text-gray-700">
                最新 {examRecord.latestRate}%（{examRecord.latestCorrect}/{examRecord.latestTotal}問）・最高 {examRecord.bestRate}%
              </p>
            )}
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              この章の内容を横断した、本試験に近い形式の試験です。
              組合せ型・計算・資料の読み取りを含みます。
              {examRecord && "何度でも再受験できます。"}
            </p>
            <Link
              href={`/theme-exam/${theme.slug}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              {examRecord ? "もう一度受ける" : "章の総まとめ試験へ"}
            </Link>

            {/* AI理解チェックで説明しきれなかったトピック。補助シグナルなので「要確認」にとどめる。 */}
            {followUps.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <h3 className="text-sm font-semibold text-gray-900">説明を確かめたいところ</h3>
                <p className="mt-0.5 text-xs text-gray-500">AI理解チェックで抜けが見つかったトピックです。</p>
                <ul className="mt-2 space-y-2">
                  {followUps.map((item) => {
                    const topic = lessonTitles.get(item.topicId);
                    if (!topic) return null;
                    return (
                      <li key={item.topicId}>
                        <Link
                          href={getLessonHref(item.topicId, { from: "review", activity: "learn", anchor: "lesson-content" })}
                          className="block rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
                        >
                          <span className="flex items-center justify-between gap-2 text-sm font-medium text-gray-800">
                            {topic}
                            <span className="shrink-0 text-xs font-semibold text-accent-700">
                              {item.corroborated ? "四択でも誤答・要復習" : "要確認"}
                            </span>
                          </span>
                          {item.missingPoints[0] && (
                            <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                              {item.missingPoints[0]}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
