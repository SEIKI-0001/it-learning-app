"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TopicField } from "@/types/content";
import type { UserAnswer, UserProgress } from "@/types";
import { FIELD_LABELS } from "@/types/content";
import { getAllTopics } from "@/lib/content";
import { LEARN_FIELD_ORDER, LEARN_THEMES, getThemeLessons } from "@/lib/learnCurriculum";

const filters: { key: "all" | TopicField; label: string }[] = [
  { key: "all", label: "すべて" }, { key: "strategy", label: "ストラテジ" }, { key: "management", label: "マネジメント" }, { key: "technology", label: "テクノロジ" },
];

function themeProgress(ids: string[], progress?: UserProgress) {
  const completed = ids.filter((id) => progress?.completedTopics.includes(id)).length;
  const percent = ids.length ? Math.round((completed / ids.length) * 100) : 0;
  const next = ids.find((id) => !progress?.completedTopics.includes(id));
  const reviewCount = ids.filter((id) => progress?.reviewQueue.some((item) => item.topicId === id)).length;
  return { completed, percent, next, reviewCount };
}

export default function LearnThemeIndex({ progress, answers }: { progress?: UserProgress; answers?: UserAnswer[] }) {
  void answers;
  const [field, setField] = useState<"all" | TopicField>("all");
  const [query, setQuery] = useState("");
  const topics = useMemo(() => getAllTopics(), []);
  const q = query.trim().toLowerCase();
  const visible = LEARN_THEMES.filter((theme) => {
    if (field !== "all" && theme.field !== field) return false;
    const lessons = getThemeLessons(theme, topics);
    return !q || [theme.title, theme.description, ...lessons.flatMap((lesson) => [lesson.title, lesson.category, ...lesson.tags, ...(lesson.reviewKeywords ?? [])])].join(" ").toLowerCase().includes(q);
  });
  const completed = progress?.completedTopics.length ?? 0;
  const lastLesson = [...(progress?.completedTopics ?? [])].reverse().map((id) => topics.find((t) => t.id === id)).find(Boolean);

  return <>
    <header className="border-b border-gray-100 bg-white px-4 pb-5 pt-6">
      <div className="mx-auto max-w-6xl"><h1 className="text-2xl font-extrabold text-gray-900">学ぶ</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">ITパスポートの試験範囲を、参考書の章のようにテーマ別に整理しています。</p><p className="mt-4 text-sm font-bold text-gray-800">学習済み {completed} / {topics.length}レッスン <span className="ml-3 text-indigo-700">全体進捗 {topics.length ? Math.round(completed / topics.length * 100) : 0}%</span></p></div>
    </header>
    <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur"><div className="mx-auto max-w-6xl space-y-3"><div className="flex flex-wrap gap-2">{filters.map((filter) => <button key={filter.key} type="button" onClick={() => setField(filter.key)} aria-pressed={field === filter.key} className={`rounded-full px-3 py-1.5 text-xs font-bold ${field === filter.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}>{filter.label}</button>)}</div><label className="relative block"><span className="sr-only">テーマ・レッスンを検索</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="テーマ・レッスンを検索" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500" /></label></div></div>
    <div className="mx-auto max-w-6xl space-y-9 px-4 py-6">
      {lastLesson && <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-xs font-bold text-indigo-700">前回の続き</p><h2 className="mt-1 font-extrabold text-gray-900">{lastLesson.title}</h2><p className="mt-1 text-xs text-gray-600">{FIELD_LABELS[lastLesson.field]} ＞ {lastLesson.category}</p><Link href={`/topics/${lastLesson.id}`} className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">続きから学ぶ</Link></section>}
      {LEARN_FIELD_ORDER.map((currentField) => { const themes = visible.filter((theme) => theme.field === currentField); if (!themes.length) return null; const lessons = themes.flatMap((theme) => getThemeLessons(theme, topics)); const fieldDone = lessons.filter((lesson) => progress?.completedTopics.includes(lesson.id)).length; return <section key={currentField}><div className="mb-3"><h2 className="text-lg font-extrabold text-gray-900">{FIELD_LABELS[currentField]}</h2><p className="text-xs text-gray-500">{themes.length}テーマ・{lessons.length}レッスン　進捗 {lessons.length ? Math.round(fieldDone / lessons.length * 100) : 0}%</p></div><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{themes.map((theme) => { const themeLessons = getThemeLessons(theme, topics); const stats = themeProgress(themeLessons.map((lesson) => lesson.id), progress); const nextTitle = topics.find((lesson) => lesson.id === stats.next)?.title; const inProgress = stats.completed > 0 && stats.completed < themeLessons.length; return <li key={theme.id}><Link href={`/topics/theme/${theme.id}`} className="flex h-full min-h-64 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300"><p className="text-xs font-bold text-indigo-600">第{LEARN_THEMES.indexOf(theme) + 1}章</p><h3 className="mt-2 text-lg font-extrabold text-gray-900">{theme.title}</h3><p className="mt-1 text-xs font-semibold text-gray-500">{FIELD_LABELS[theme.field]}</p><p className="mt-3 text-sm leading-relaxed text-gray-600">{theme.description}</p><p className="mt-4 text-xs text-gray-500">{new Set(themeLessons.map((lesson) => lesson.category)).size}セクション・{themeLessons.length}レッスン</p><div className="mt-3"><p className="text-xs font-bold text-gray-700">進捗 {stats.percent}%</p><div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${stats.percent}%` }} /></div></div>{stats.reviewCount > 0 && <p className="mt-2 text-xs font-bold text-amber-700">復習 {stats.reviewCount}件</p>}<div className="mt-auto pt-4"><p className="text-xs text-gray-500">{nextTitle ? `次：${nextTitle}` : "このテーマは完了しました"}</p><span className="mt-2 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">{inProgress ? "続きから学ぶ" : "テーマを見る"}</span></div></Link></li>})}</ul></section>})}
    </div>
  </>;
}
