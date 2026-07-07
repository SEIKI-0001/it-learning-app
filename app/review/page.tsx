"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserAnswer } from "@/types";
import { FIELD_LABELS } from "@/types/content";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { getQuestionsByTopic, getReviewItemsForUser, getTopic } from "@/lib/content";
import { markTopicMastered } from "@/lib/study";
import { completeStudySession } from "@/lib/studySession";
import { emitUnlockNotice } from "@/lib/unlockNotice";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import {
  getUserId,
  saveAnswersToDb,
  saveProgressToDb,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

// 復習画面。間違えた問題・苦手Topic・復習期限が来たTopicをまとめ、
// 「もう一度解く」「理解済みにする」を提供する。
export default function ReviewPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  const reviewItems = useMemo(
    () =>
      state
        ? getReviewItemsForUser({
            progress: state.progress,
            weakFields: state.profile?.weakFields,
          })
        : [],
    [state],
  );

  // 間違えた問題の数(トピックごと)
  const wrongByTopic = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of state?.answers ?? []) {
      if (!a.isCorrect && a.topicId) {
        map.set(a.topicId, (map.get(a.topicId) ?? 0) + 1);
      }
    }
    return map;
  }, [state]);

  if (state === undefined || state === null) {
    return <LoadingScreen />;
  }

  function handleRetryComplete(topicId: string, answers: UserAnswer[]) {
    if (!state) return;
    const topic = getTopic(topicId);
    const tagged: UserAnswer[] = answers.map((a) => ({
      ...a,
      tag: topic?.tags[0] ?? topic?.field ?? a.tag,
    }));
    // 完了・バッジ確定付与・追加ドロップを /today と同一の共通経路で処理する。
    const { state: next } = completeStudySession(
      state,
      topicId,
      tagged,
      getClientBadgeSignals(),
    );
    saveAppState(next);
    setState(next);
    setOpenId(null);
    emitUnlockNotice(state, next);
    const userId = getUserId();
    if (userId) {
      saveProgressToDb(userId, next.progress);
      saveAnswersToDb(userId, 0, tagged);
    }
  }

  function handleMastered(topicId: string) {
    if (!state) return;
    const next = markTopicMastered(state, topicId);
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, next.progress);
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <h1 className="text-2xl font-extrabold">復習</h1>
          <p className="mt-1 text-sm text-white/90">
            間違えた問題・苦手分野・復習期限のきたトピックをまとめました。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md md:max-w-2xl space-y-4 px-4 py-6">
        {reviewItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-3xl">✨</p>
            <p className="mt-2 text-base font-extrabold text-gray-800">
              いまは復習対象がありません
            </p>
            <p className="mt-1 text-sm text-gray-500">
              新しいトピックを学ぶと、復習が自動で追加されます。
            </p>
            <Link
              href="/today"
              className="mt-4 inline-block rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
            >
              今日の学習へ
            </Link>
          </div>
        ) : (
          reviewItems.map((item) => {
            const topic = getTopic(item.topicId);
            if (!topic) return null;
            const questions = getQuestionsByTopic(topic.id);
            const wrong = wrongByTopic.get(topic.id) ?? 0;
            const open = openId === topic.id;
            return (
              <div
                key={topic.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-amber-600">
                      {item.reason}
                      {wrong > 0 && `・間違い${wrong}問`}
                    </p>
                    <p className="mt-0.5 text-base font-bold text-gray-800">
                      {topic.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {FIELD_LABELS[topic.field]}
                    </p>
                  </div>
                  <Link
                    href={`/topics/${topic.id}`}
                    className="shrink-0 text-xs font-bold text-indigo-600 underline underline-offset-2"
                  >
                    解説
                  </Link>
                </div>

                {open ? (
                  <div className="mt-4">
                    <TopicQuiz
                      topicId={topic.id}
                      questions={questions}
                      onComplete={(ans) => handleRetryComplete(topic.id, ans)}
                      completeLabel="復習を完了する"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(topic.id)}
                      disabled={questions.length === 0}
                      className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:bg-gray-300"
                    >
                      もう一度解く
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMastered(topic.id)}
                      className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-green-700 ring-1 ring-green-200"
                    >
                      理解済みにする
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </main>
  );
}
