"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Topic, TopicField } from "@/types/content";
import { FIELD_LABELS, IMPORTANCE_LABELS } from "@/types/content";
import type { UserProgress } from "@/types";
import { getAllTopics } from "@/lib/content";
import { useAppState } from "@/lib/useAppState";
import { fieldMastery } from "@/lib/study";
import { computeProgressSummary } from "@/lib/progressSummary";
import BottomNav from "@/components/BottomNav";
import FieldMasteryBars from "@/components/FieldMasteryBars";

const DIFFICULTY_LABEL: Record<Topic["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

type TopicStatus = "not_started" | "review" | "completed" | "mastered";
type StatusKey = "all" | TopicStatus;

const STATUS_META: Record<
  TopicStatus,
  { label: string; className: string }
> = {
  not_started: { label: "未学習", className: "bg-gray-100 text-gray-500" },
  review: { label: "復習待ち", className: "bg-amber-100 text-amber-700" },
  completed: { label: "学習済み", className: "bg-indigo-100 text-indigo-700" },
  mastered: { label: "理解済み", className: "bg-green-100 text-green-700" },
};

const STATUS_FILTERS: { key: StatusKey; label: string }[] = [
  { key: "all", label: "全て" },
  { key: "not_started", label: STATUS_META.not_started.label },
  { key: "review", label: STATUS_META.review.label },
  { key: "completed", label: STATUS_META.completed.label },
  { key: "mastered", label: STATUS_META.mastered.label },
];

const FIELD_ORDER: TopicField[] = ["strategy", "management", "technology"];

const FIELD_FILTERS: { key: "all" | TopicField; label: string }[] = [
  { key: "all", label: "全分野" },
  { key: "strategy", label: "ストラテジ" },
  { key: "management", label: "マネジメント" },
  { key: "technology", label: "テクノロジ" },
];

function statusOf(topic: Topic, progress?: UserProgress) {
  let key: TopicStatus = "not_started";

  if (progress) {
    const mastery = progress.topicMastery[topic.id];
    if (progress.reviewQueue.some((r) => r.topicId === topic.id)) {
      key = "review";
    } else if (mastery !== undefined && mastery >= 100) {
      key = "mastered";
    } else if (progress.completedTopics.includes(topic.id)) {
      key = "completed";
    }
  }

  return { key, ...STATUS_META[key] };
}

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").toLowerCase();
}

function matchesSearch(topic: Topic, queryWords: string[]) {
  if (queryWords.length === 0) return true;

  const target = normalizeSearchText(
    [
      topic.id,
      topic.title,
      topic.summary,
      topic.category,
      FIELD_LABELS[topic.field],
    ].join(" "),
  );

  return queryWords.every((word) => target.includes(word));
}

export default function TopicsPage() {
  const [state] = useAppState();
  const progress = state?.progress;

  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [fieldFilter, setFieldFilter] = useState<"all" | TopicField>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const allTopics = useMemo(() => getAllTopics(), []);

  const filteredByField = useMemo(() => {
    return fieldFilter === "all"
      ? allTopics
      : allTopics.filter((topic) => topic.field === fieldFilter);
  }, [allTopics, fieldFilter]);

  const queryWords = useMemo(() => {
    return normalizeSearchText(searchQuery).trim().split(/\s+/).filter(Boolean);
  }, [searchQuery]);

  const filteredTopics = useMemo(() => {
    return filteredByField.filter((topic) => {
      if (
        statusFilter !== "all" &&
        statusOf(topic, progress).key !== statusFilter
      ) {
        return false;
      }

      return matchesSearch(topic, queryWords);
    });
  }, [filteredByField, statusFilter, queryWords, progress]);

  const groupedTopics = useMemo(() => {
    return FIELD_ORDER.map((field) => ({
      field,
      topics: filteredTopics.filter((topic) => topic.field === field),
    })).filter((group) => group.topics.length > 0);
  }, [filteredTopics]);

  const totalCount = filteredTopics.length;

  // 全体像サマリ（フィルターに関わらず全トピック基準の集計）。
  const summary = useMemo(
    () => (progress ? computeProgressSummary(allTopics, progress) : null),
    [allTopics, progress],
  );
  const mastery = useMemo(
    () => (progress ? fieldMastery(progress, allTopics) : null),
    [allTopics, progress],
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-5xl">
          <h1 className="text-2xl font-extrabold">学習トピック</h1>
          <p className="mt-1 text-sm text-white/90">
            ストラテジ・マネジメント・テクノロジの3分野を、図解つきで学べます。
          </p>
          <div className="mt-3">
            <Link
              href="/syllabus"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/50 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
            >
              📋 シラバス対応表
            </Link>
          </div>
        </div>
      </header>

      {/* フィルター */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-md space-y-2.5 md:max-w-5xl">
          {/* 検索窓 */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="トピックを検索..."
              aria-label="トピックを検索"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="検索をクリア"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* 分野フィルター */}
          <div className="flex flex-wrap gap-1.5">
            {FIELD_FILTERS.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setFieldFilter(field.key)}
                aria-pressed={fieldFilter === field.key}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  fieldFilter === field.key
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {field.label}
              </button>
            ))}
            <div className="mx-0.5 w-px bg-gray-200" />
            {STATUS_FILTERS.map((status) => (
              <button
                key={status.key}
                type="button"
                onClick={() => setStatusFilter(status.key)}
                aria-pressed={statusFilter === status.key}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === status.key
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-7 md:max-w-5xl">
        {/* 全体の学習進捗サマリ（フィルターとは独立した全トピック基準） */}
        {summary && mastery && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-gray-800">
                学習の進捗
              </h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                学習済み {summary.completedCount}/{summary.totalCount}
              </span>
            </div>
            <div className="mt-3">
              <FieldMasteryBars mastery={mastery} />
            </div>
          </section>
        )}

        {groupedTopics.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl">🔍</p>
            <p className="mt-3 text-sm">該当するトピックが見つかりません</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">{totalCount}件のトピック</p>
            {groupedTopics.map((group) => (
              <section key={group.field}>
                <h2 className="mb-3 text-lg font-extrabold text-gray-800">
                  {FIELD_LABELS[group.field]}
                </h2>
                <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.topics.map((topic) => {
                    const status = statusOf(topic, progress);
                    return (
                      <li key={topic.id}>
                        <Link
                          href={`/topics/${topic.id}`}
                          className="block h-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 transition active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-indigo-500">
                              {topic.category}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-base font-bold text-gray-800">
                            {topic.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {topic.summary}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                            <span>⏱️ {topic.estimatedMinutes}分</span>
                            <span>重要度 {IMPORTANCE_LABELS[topic.importance]}</span>
                            <span>難易度 {DIFFICULTY_LABEL[topic.difficulty]}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
