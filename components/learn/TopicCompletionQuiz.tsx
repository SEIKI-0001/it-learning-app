"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UserAnswer } from "@/types";
import type { Topic } from "@/types/content";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { completeStudySession } from "@/lib/studySession";
import { studyXpReward, XP_PER_CORRECT } from "@/lib/study";
import { emitUnlockNotice } from "@/lib/unlockNotice";
import { emitCelebration } from "@/lib/celebration";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import {
  getUserId,
  reportTopicQuizResult,
  saveAnswersToDb,
  saveProgressToDb,
  todayLocalDate,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";

type CompletionTopic = Pick<
  Topic,
  "id" | "field" | "tags" | "checkQuestions"
>;

export default function TopicCompletionQuiz({ topic }: { topic: CompletionTopic }) {
  const [state, setState] = useAppState();
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    gainedExp: number;
    streak: number;
  } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (completed) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [completed]);

  function handleComplete(answers: UserAnswer[]) {
    if (!state) return;
    const tagged: UserAnswer[] = answers.map((a) => ({
      ...a,
      tag: topic.tags[0] ?? topic.field,
    }));
    // 完了・バッジ確定付与・追加ドロップを /today と同一の共通経路で処理する。
    const session = completeStudySession(
      state,
      topic.id,
      tagged,
      getClientBadgeSignals(),
    );
    const next = session.state;
    saveAppState(next);
    setState(next);
    emitUnlockNotice(state, next);
    emitCelebration(
      state,
      next,
      session.streakMilestone
        ? [{ kind: "streakMilestone", ...session.streakMilestone }]
        : [],
    );

    const correct = tagged.filter((a) => a.isCorrect).length;
    const total = tagged.length;
    setResult({
      correct,
      total,
      gainedExp: next.progress.exp - state.progress.exp,
      streak: next.progress.streakCount,
    });
    setCompleted(true);

    const userId = getUserId();
    if (userId) {
      saveProgressToDb(userId, next.progress);
      saveAnswersToDb(userId, 0, tagged);
      if (total > 0) {
        reportTopicQuizResult(userId, topic.id, correct, total, todayLocalDate());
      }
    }
  }

  if (topic.checkQuestions.length === 0) {
    return (
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-800">
          <span aria-hidden>✏️</span>
          確認問題
        </h2>
        <p className="rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          このトピックの確認問題は準備中です。
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-800">
        <span aria-hidden>✏️</span>
        確認問題
      </h2>

      {state === undefined ? (
        <div className="rounded-2xl bg-white p-4 text-sm font-semibold text-gray-500 shadow-sm ring-1 ring-gray-100">
          進捗を読み込んでいます...
        </div>
      ) : state === null ? (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-base font-extrabold text-gray-800">
            完了を記録するには初期設定が必要です
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            学習時間や試験予定を設定すると、トピック完了を進捗に保存できます。
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
          >
            初期設定へ
          </Link>
        </div>
      ) : completed ? (
        <div
          ref={resultRef}
          className="animate-pop-in rounded-2xl bg-green-50 p-5 text-center ring-1 ring-green-200"
        >
          <p className="text-3xl">
            {result && result.correct === result.total ? "🏆" : "🎉"}
          </p>
          <p className="mt-2 text-base font-extrabold text-green-700">
            {result && result.correct === result.total
              ? "全問正解！このトピック、おつかれさま！"
              : "このトピック、おつかれさま！"}
          </p>
          {result && (
            <>
              <p className="mt-1 text-sm font-semibold text-green-600">
                {result.total}問中 {result.correct}問正解
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100">
                  +{result.gainedExp} XP
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-orange-600 ring-1 ring-orange-100">
                  🔥 {result.streak}日連続
                </span>
              </div>
            </>
          )}
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
              トピック一覧へ
            </Link>
          </div>
        </div>
      ) : (
        <TopicQuiz
          topicId={topic.id}
          questions={topic.checkQuestions}
          onComplete={handleComplete}
          completeLabel="このトピックを完了する"
          xpPerCorrect={
            state ? Math.round(XP_PER_CORRECT * studyXpReward(state, topic.id).multiplier) : undefined
          }
        />
      )}
    </section>
  );
}
