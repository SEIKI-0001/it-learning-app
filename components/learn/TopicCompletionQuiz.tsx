"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UserAnswer } from "@/types";
import type { Topic } from "@/types/content";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { completeStudySession } from "@/lib/studySession";
import { studyXpReward, XP_PER_CORRECT } from "@/lib/study";
import { badgeEarnedCelebrations, emitCelebration } from "@/lib/celebration";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import {
  getUserId,
  reportTopicQuizResult,
  saveAnswersToDb,
  saveProgressToDb,
  todayLocalDate,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import { getMochitCompletionEvent } from "@/components/mochit/mochitEvents";
import { useCountUp } from "@/lib/useCountUp";

type CompletionTopic = Pick<
  Topic,
  "id" | "field" | "tags" | "checkQuestions"
>;

type TopicCompletionQuizProps = {
  topic: CompletionTopic;
  completionLabel?: string;
  returnHref?: string;
  returnLabel?: string;
  nextLessonHref?: string;
  nextLessonLabel?: string;
};

export default function TopicCompletionQuiz({
  topic,
  completionLabel = "このレッスンを完了する",
  returnHref = "/learn",
  returnLabel = "学ぶに戻る",
  nextLessonHref,
  nextLessonLabel,
}: TopicCompletionQuizProps) {
  const [state, setState] = useAppState();
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    gainedExp: number;
    streak: number;
  } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  // 獲得XPは0から自然に増えて見せる(reduced-motion時は即時表示)
  const shownExp = useCountUp(result?.gainedExp ?? 0);

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
    emitCelebration(
      state,
      next,
      [...badgeEarnedCelebrations(session.newlyEarnedIds), ...(session.streakMilestone ? [{ kind: "streakMilestone" as const, ...session.streakMilestone }] : [])],
    );

    const correct = tagged.filter((a) => a.isCorrect).length;
    const total = tagged.length;
    const checkpointCleared = next.progress.checkpointProgress?.clearedCheckpointIds.some(
      (id) => !state.progress.checkpointProgress?.clearedCheckpointIds.includes(id),
    );
    const completionEvent = getMochitCompletionEvent({
      checkpointCleared: !!checkpointCleared,
      correct,
      total,
    });
    setResult({
      correct,
      total,
      gainedExp: next.progress.exp - state.progress.exp,
      streak: next.progress.streakCount,
    });
    emitMochitEvent(completionEvent);
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
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Icon name="pen" className="h-5 w-5 text-gray-500" />
          確認問題
        </h2>
        <p className="rounded-xl bg-white p-4 text-sm text-gray-500 border border-gray-200">
          このトピックの確認問題は準備中です。
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
        <Icon name="pen" className="h-5 w-5 text-gray-500" />
        確認問題
      </h2>

      <RecordingLockNotice variant="compact" className="mb-3" />

      {state === undefined ? (
        <div className="rounded-xl bg-white p-4 text-sm font-semibold text-gray-500 border border-gray-200">
          進捗を読み込んでいます...
        </div>
      ) : state === null ? (
        <div className="rounded-xl bg-white p-5 text-center border border-gray-200">
          <p className="text-base font-bold text-gray-800">
            完了を記録するには初期設定が必要です
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            学習時間や試験予定を設定すると、トピック完了を進捗に保存できます。
          </p>
          <Link href="/onboarding" className={buttonClass("primary", "lg", "mt-4")}>
            初期設定へ
          </Link>
        </div>
      ) : completed ? (
        <div
          ref={resultRef}
          className="animate-pop-in rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"
        >
          <Icon
            name={result && result.correct === result.total ? "award" : "circle-check"}
            className="mx-auto h-6 w-6 text-emerald-600"
          />
          <p className="mt-2 text-base font-semibold text-emerald-800">
            {result && result.correct === result.total
              ? "全問正解！このレッスン、おつかれさま！"
              : "このレッスン、おつかれさま！"}
          </p>
          {result && (
            <>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {result.total}問中 {result.correct}問正解
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-sm font-semibold tabular-nums text-brand-700">
                  +{shownExp} XP
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-accent-200 bg-white px-3 py-1 text-sm font-semibold tabular-nums text-accent-700">
                  <Icon name="flame" className="h-3.5 w-3.5" />
                  {result.streak}日連続
                </span>
              </div>
            </>
          )}
          {/* 次の行動は1つを主役にする: 次のレッスンがあればそれ、無ければ戻り先 */}
          <div className="mt-4 flex flex-col gap-2">
            {nextLessonHref && nextLessonLabel ? (
              <>
                <Link href={nextLessonHref} className={buttonClass("primary", "lg")}>
                  {nextLessonLabel}
                </Link>
                <Link href={returnHref} className={buttonClass("secondary", "lg")}>
                  {returnLabel}
                </Link>
              </>
            ) : (
              <Link href={returnHref} className={buttonClass("primary", "lg")}>
                {returnLabel}
              </Link>
            )}
            <Link
              href="/progress"
              className="mt-1 text-sm font-bold text-brand-600 underline underline-offset-4"
            >
              合格準備度への反映を見る
            </Link>
          </div>
        </div>
      ) : (
        <TopicQuiz
          topicId={topic.id}
          questions={topic.checkQuestions}
          onComplete={handleComplete}
          completeLabel={completionLabel}
          xpPerCorrect={
            state ? Math.round(XP_PER_CORRECT * studyXpReward(state, topic.id).multiplier) : undefined
          }
        />
      )}
    </section>
  );
}
