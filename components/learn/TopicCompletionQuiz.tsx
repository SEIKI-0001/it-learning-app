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
  loadCachedProgressBootstrap,
  refreshIntegratedStatus,
  reportTopicQuizResult,
  saveAnswersToDb,
  saveProgressToDb,
  saveQuestionAttemptsForCurrentSession,
  todayLocalDate,
  type QuestionAttemptInput,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import { getMochitCompletionEvent } from "@/components/mochit/mochitEvents";
import { useCountUp } from "@/lib/useCountUp";
import { buildSessionOutcome } from "@/lib/sessionOutcome";
import { buildMochitContext } from "@/lib/mochitContext";
import { getPendingChoice, resolveDropChoice } from "@/lib/badgeDrops";
import RewardChoiceCard from "@/components/rewards/RewardChoiceCard";
import type { SessionOutcome } from "@/types/gameful";
import SessionOutcomeCard from "@/components/learn/SessionOutcomeCard";

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
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  // 合格準備度の再計算は完了後に非同期で返る。結果表示は先に出し、届いたら差し替える。
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);
  // 獲得XPは0から自然に増えて見せる(reduced-motion時は即時表示)
  const shownExp = useCountUp(result?.gainedExp ?? 0);

  useEffect(() => {
    if (completed) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [completed]);

  async function handleComplete(answers: UserAnswer[]) {
    if (!state) return;
    // 比較可能な「前」の合格準備度は、当日分のキャッシュがあるときだけ使う
    // （別日のスナップショットと突き合わせると比較基準が揃わないため）。
    const cachedStatus = loadCachedProgressBootstrap()?.examReadiness ?? null;
    const readinessBefore =
      cachedStatus && cachedStatus.snapshotDate === todayLocalDate()
        ? cachedStatus.score
        : null;
    const tagged: UserAnswer[] = answers.map((a) => ({
      ...a,
      tag: topic.tags[0] ?? topic.field,
    }));
    const attempts: QuestionAttemptInput[] = tagged.map((answer) => ({
      questionId: answer.questionId,
      questionType: "topic_quiz",
      topicId: answer.topicId ?? topic.id,
      selectedAnswer: answer.selectedChoice ?? null,
      isCorrect: answer.isCorrect,
      answeredAt: answer.answeredAt,
    }));
    const exposureResult = await saveQuestionAttemptsForCurrentSession(
      attempts,
      state.answers,
    );
    const { exposures, userId } = exposureResult;
    // 完了・バッジ確定付与・追加ドロップを /today と同一の共通経路で処理する。
    const session = completeStudySession(
      state,
      topic.id,
      tagged,
      exposures,
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
    if (userId) {
      // Mastery / Review Due を所有する completeStudySession の最新結果を先に確定する。
      // Readiness はこの保存済み P0 state だけを読み、画面側で再構成しない。
      const progressSaved = await saveProgressToDb(
        userId,
        next.progress,
        session.readinessTrigger,
      );
      saveAnswersToDb(userId, 0, tagged);
      if (progressSaved && total > 0 && session.readinessTrigger) {
        await reportTopicQuizResult(
          userId,
          topic.id,
          correct,
          total,
          todayLocalDate(),
          session.readinessTrigger.triggerId,
        );
      }
    }

    setResult({
      correct,
      total,
      gainedExp: next.progress.exp - state.progress.exp,
      streak: next.progress.streakCount,
    });
    // モチットには確定した事実だけを渡す（GF-P0-004）。事実が無ければ
    // 空のコンテキストになり、従来どおり汎用メッセージへフォールバックする。
    emitMochitEvent(
      completionEvent,
      buildMochitContext({
        before: state,
        after: next,
        topicId: topic.id,
        answers: tagged,
        newlyEarnedBadgeIds: session.newlyEarnedIds,
      }),
    );
    setCompleted(true);

    // 学習後の成果差分（GF-P0-005）。表示用の導出なので、ここで失敗しても
    // 完了・保存・演出は既に済んでおり、学習記録には一切影響しない。
    const outcomeInput = {
      before: state,
      after: next,
      topicId: topic.id,
      answers: tagged,
    };
    const safeOutcome = (readiness?: { before: number | null; after: number | null }) => {
      try {
        return buildSessionOutcome({ ...outcomeInput, readiness });
      } catch {
        return [];
      }
    };
    setOutcomes(safeOutcome());

    if (userId) {
      // 合格準備度のサーバー再計算。失敗しても null が返るだけで、
      // ここまでの完了処理・保存・表示には影響しない。
      void refreshIntegratedStatus(userId)
        .then((status) => {
          if (!status || !mountedRef.current) return;
          setOutcomes(safeOutcome({
            before: readinessBefore,
            after: status.examReadiness?.score ?? null,
          }));
        })
        .catch(() => {
          // 再計算に失敗しても学習完了・保存・表示はすでに済んでいる。
          // 準備度の X → Y を出さないだけで、成果差分は確定分のまま残す。
        });
    }
  }

  // 受け取り待ちの3択（保存済みの候補をそのまま描く。render 中に乱数を使わない）。
  const pendingChoice = state ? getPendingChoice(state) : undefined;

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
              {/* 学習成果を先に。XP・ストリークは補助報酬なのでこの下に置く。 */}
              <SessionOutcomeCard outcomes={outcomes} />
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

          {/* 3択報酬は補助。学習成果とXPの後に置き、選ぶまで消えない。 */}
          {pendingChoice && (
            <div className="mt-4 text-left">
              <RewardChoiceCard
                choice={pendingChoice}
                onSelect={(option) => {
                  const next = resolveDropChoice(state, option.id);
                  saveAppState(next);
                  setState(next);
                  const userId = getUserId();
                  if (userId) saveProgressToDb(userId, next.progress);
                }}
              />
            </div>
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
