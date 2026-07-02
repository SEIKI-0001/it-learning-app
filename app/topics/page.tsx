"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Topic, TopicField } from "@/types/content";
import { FIELD_LABELS, IMPORTANCE_LABELS } from "@/types/content";
import type { UserProgress } from "@/types";
import { getTaxonomy, getTopicsByField } from "@/lib/content";
import { useAppState } from "@/lib/useAppState";
import BottomNav from "@/components/BottomNav";

// 学習トピック一覧。3分野ごとに分類し、各トピックの学習状態を表示する。
// 学習状態は localStorage の進捗から算出（未ログイン/未学習でも「未学習」で表示）。

const DIFFICULTY_LABEL: Record<Topic["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

type FieldFilter = "all" | TopicField;
type TopicStatus = "new" | "review" | "completed" | "mastered";
type StatusFilter = "all" | TopicStatus;

const TOPIC_GROUPS = getTaxonomy().map((group) => ({
  field: group.field,
  topics: getTopicsByField(group.field),
}));

const TOTAL_TOPICS = TOPIC_GROUPS.reduce(
  (sum, group) => sum + group.topics.length,
  0,
);

const FIELD_FILTERS: { key: FieldFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  ...TOPIC_GROUPS.map((group) => ({
    key: group.field,
    label: FIELD_LABELS[group.field],
  })),
];

const STATUS_META: Record<
  TopicStatus,
  { label: string; className: string }
> = {
  new: { label: "未学習", className: "bg-gray-100 text-gray-500" },
  review: { label: "復習待ち", className: "bg-amber-100 text-amber-700" },
  completed: { label: "学習済み", className: "bg-indigo-100 text-indigo-700" },
  mastered: { label: "理解済み", className: "bg-green-100 text-green-700" },
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "new", label: STATUS_META.new.label },
  { key: "review", label: STATUS_META.review.label },
  { key: "completed", label: STATUS_META.completed.label },
  { key: "mastered", label: STATUS_META.mastered.label },
];

function statusOf(topic: Topic, progress?: UserProgress) {
  let key: TopicStatus = "new";

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

export default function TopicsPage() {
  const [state] = useAppState();
  const [field, setField] = useState<FieldFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const progress = state?.progress;
  const visibleGroups = useMemo(() => {
    return TOPIC_GROUPS.map((group) => {
      if (field !== "all" && field !== group.field) {
        return { ...group, topics: [] };
      }

      return {
        ...group,
        topics: group.topics.filter((topic) => {
          if (status === "all") return true;
          return statusOf(topic, progress).key === status;
        }),
      };
    }).filter((group) => group.topics.length > 0);
  }, [field, status, progress]);

  const visibleCount = visibleGroups.reduce(
    (sum, group) => sum + group.topics.length,
    0,
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-5xl">
          <h1 className="text-2xl font-extrabold">学習トピック</h1>
          <p className="mt-1 text-sm text-white/90">
            ストラテジ・マネジメント・テクノロジの3分野を、図解つきで学べます。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-5 md:max-w-5xl">
        <section className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-bold text-gray-400">分野</p>
            <div className="flex flex-wrap gap-2">
              {FIELD_FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  active={field === f.key}
                  onClick={() => setField(f.key)}
                >
                  {f.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-gray-400">学習状況</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <FilterChip
                  key={s.key}
                  active={status === s.key}
                  tone="status"
                  onClick={() => setStatus(s.key)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <p className="text-xs font-bold text-gray-400">
            {visibleCount}件 / 全{TOTAL_TOPICS}件
          </p>
        </section>

        <div className="space-y-8">
          {visibleGroups.map((group) => (
            <section key={group.field}>
              <h2 className="mb-3 text-lg font-extrabold text-gray-800">
                {FIELD_LABELS[group.field]}
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {group.topics.map((t) => {
                  const status = statusOf(t, progress);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/topics/${t.id}`}
                        className="block h-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 transition active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-indigo-500">
                            {t.category}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-base font-bold text-gray-800">
                          {t.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">{t.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                          <span>⏱️ {t.estimatedMinutes}分</span>
                          <span>重要度 {IMPORTANCE_LABELS[t.importance]}</span>
                          <span>難易度 {DIFFICULTY_LABEL[t.difficulty]}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {visibleGroups.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              該当するトピックがありません。
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tone = "field",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "field" | "status";
}) {
  const activeCls =
    tone === "status" ? "bg-gray-800 text-white" : "bg-indigo-600 text-white";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition active:scale-[0.97] ${
        active ? activeCls : "bg-white text-gray-500 ring-1 ring-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
