"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserAnswer } from "@/types";
import { FIELD_LABELS } from "@/types/content";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { getAllTopics, getQuestionsByTopic, getTopic } from "@/lib/content";
import { generateTodayMenu } from "@/lib/aiPlanner";
import { completeTopicStudy } from "@/lib/study";
import {
  getUserId,
  saveAnswersToDb,
  saveProgressToDb,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import TopicContent, {
  TopicReviewSections,
} from "@/components/learn/TopicContent";
import BottomNav from "@/components/BottomNav";

// 今日の学習メニュー。固定Dayではなく generateTodayMenu の結果を表示する。
export default function TodayPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  const topics = getAllTopics();
  const menu = useMemo(
    () =>
      state?.profile
        ? generateTodayMenu(state.profile, state.progress, topics, state.answers)
        : null,
    [state, topics],
  );

  if (state === undefined || state === null || !menu) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  const learnItem = menu.items.find((i) => i.kind === "learn");
  const primary = learnItem ? getTopic(learnItem.topicId) : undefined;
  const questions = primary ? getQuestionsByTopic(primary.id) : [];

  function handleComplete(answers: UserAnswer[]) {
    if (!state || !primary) return;
    // タグをトピックのタグに上書き(苦手タグの集計に使う)
    const tagged: UserAnswer[] = answers.map((a) => ({
      ...a,
      tag: primary.tags[0] ?? primary.field,
    }));
    const next = completeTopicStudy(state, primary.id, tagged);
    saveAppState(next);
    setState(next);
    setCompleted(true);

    const userId = getUserId();
    if (userId) {
      saveProgressToDb(userId, next.progress);
      saveAnswersToDb(userId, 0, tagged);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-4 pt-4 text-white">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[11px] font-semibold text-white/80">今日の学習メニュー</p>
          <h1 className="mt-0.5 text-lg font-extrabold leading-tight">{menu.theme}</h1>
          <p className="mt-1 text-xs text-white/90">⏱️ 目安 {menu.totalMinutes}分</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-7 px-4 py-6">
        <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
          「完了」を押して、ストリークを伸ばそう
        </p>

        {/* 今日のテーマ学習。内容はトピック詳細とまったく同じものを表示する
            （確認問題だけは下の「今日の学習を完了する」クイズに任せる）。 */}
        {primary ? (
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-gray-800">
              📖 今日のテーマ
            </h2>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-semibold text-indigo-500">
                {FIELD_LABELS[primary.field]}・{primary.category}
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-gray-800">
                {primary.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {primary.summary}
              </p>
            </div>

            <div className="mt-6">
              <TopicContent topic={primary} showCheckQuestions={false} />
            </div>

            <h3 className="mb-3 mt-8 text-base font-extrabold text-gray-800">
              ✏️ 今日の確認問題
            </h3>
            {completed ? (
              <div className="rounded-2xl bg-green-50 p-5 text-center">
                <p className="text-3xl">🎉</p>
                <p className="mt-2 text-base font-extrabold text-green-700">
                  今日のぶん、おつかれさま！
                </p>
                <p className="mt-1 text-sm text-green-600">
                  XPとストリークが増えました。
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href="/progress"
                    className="rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
                  >
                    進捗を見る
                  </Link>
                  <Link
                    href="/topics"
                    className="rounded-2xl bg-white px-6 py-3 font-bold text-indigo-600 ring-1 ring-indigo-200"
                  >
                    別のトピックも学ぶ
                  </Link>
                </div>
              </div>
            ) : questions.length > 0 ? (
              <TopicQuiz
                topicId={primary.id}
                questions={questions}
                onComplete={handleComplete}
                completeLabel="今日の学習を完了する"
                dense
              />
            ) : (
              <p className="text-sm text-gray-500">このトピックの確認問題は準備中です。</p>
            )}

            {/* 完了ボタンより下：復習・参考書・過去問分野を最下部に表示 */}
            <div className="mt-10">
              <TopicReviewSections topic={primary} />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-3xl">🏅</p>
            <p className="mt-2 text-base font-extrabold text-gray-800">
              新しく学ぶトピックはひと段落！
            </p>
            <p className="mt-1 text-sm text-gray-500">
              復習で知識を定着させましょう。
            </p>
            <Link
              href="/review"
              className="mt-4 inline-block rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
            >
              復習へ
            </Link>
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
