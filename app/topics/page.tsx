"use client";

import Link from "next/link";
import type { Topic } from "@/types/content";
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

function statusOf(topic: Topic, progress?: UserProgress) {
  if (!progress) return { label: "未学習", className: "bg-gray-100 text-gray-500" };
  const mastery = progress.topicMastery[topic.id];
  if (progress.reviewQueue.some((r) => r.topicId === topic.id)) {
    return { label: "復習待ち", className: "bg-amber-100 text-amber-700" };
  }
  if (mastery !== undefined && mastery >= 100) {
    return { label: "理解済み", className: "bg-green-100 text-green-700" };
  }
  if (progress.completedTopics.includes(topic.id)) {
    return { label: "学習済み", className: "bg-indigo-100 text-indigo-700" };
  }
  return { label: "未学習", className: "bg-gray-100 text-gray-500" };
}

export default function TopicsPage() {
  const [state] = useAppState();
  const taxonomy = getTaxonomy();
  const progress = state?.progress;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-extrabold">学習トピック</h1>
          <p className="mt-1 text-sm text-white/90">
            ストラテジ・マネジメント・テクノロジの3分野を、図解つきで学べます。
          </p>
          <Link
            href="/diagrams"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            <span aria-hidden>📊</span> 図解いちらんを見る
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-7">
        {taxonomy.map((group) => {
          const topics = getTopicsByField(group.field);
          if (topics.length === 0) return null;
          return (
            <section key={group.field}>
              <h2 className="mb-3 text-lg font-extrabold text-gray-800">
                {FIELD_LABELS[group.field]}
              </h2>
              <ul className="space-y-2.5">
                {topics.map((t) => {
                  const status = statusOf(t, progress);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/topics/${t.id}`}
                        className="block rounded-2xl border border-gray-200 bg-white px-4 py-3.5 transition active:scale-[0.99]"
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
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
