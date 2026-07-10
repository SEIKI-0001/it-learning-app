"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserAnswer } from "@/types";
import { getTopic } from "@/lib/content";
import {
  buildCheckpointExam,
  recordCheckpointExamResult,
} from "@/lib/checkpointExam";
import { saveAppState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import { getUserId, saveAnswersToDb, saveProgressToDb } from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import LoadingScreen from "@/components/LoadingScreen";

function newAttemptId(): string {
  return crypto.randomUUID();
}

export default function CheckpointExamRunner({ checkpointId }: { checkpointId: string }) {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [attemptId, setAttemptId] = useState(newAttemptId);
  const [result, setResult] = useState<{ correct: number; total: number; passed: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  const recentQuestionIds = useMemo(
    () =>
      [...(state?.answers ?? [])]
        .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
        .map((answer) => answer.questionId),
    [state?.answers],
  );
  const exam = useMemo(
    () =>
      buildCheckpointExam({
        checkpointId,
        attemptId,
        recentQuestionIds,
      }),
    [attemptId, checkpointId, recentQuestionIds],
  );

  if (state === undefined || state === null) return <LoadingScreen />;

  function handleComplete(answers: UserAnswer[]) {
    if (!state) return;
    const tagged = answers.map((answer) => {
      const topic = getTopic(answer.topicId ?? "");
      return { ...answer, tag: topic?.tags[0] ?? topic?.field ?? answer.tag };
    });
    const next = recordCheckpointExamResult(state, tagged);
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) {
      void saveProgressToDb(userId, next.progress);
      void saveAnswersToDb(userId, 0, tagged);
    }
    const correct = tagged.filter((answer) => answer.isCorrect).length;
    setResult({
      correct,
      total: tagged.length,
      passed: Math.round((correct / tagged.length) * 100) >= exam.definition.passingScore,
    });
  }

  if (result) {
    const score = Math.round((result.correct / result.total) * 100);
    return (
      <div className="space-y-5">
        <section
          className={`rounded-2xl p-5 text-center ring-1 ${
            result.passed
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-amber-200"
          }`}
        >
          <p className="text-sm font-bold">{exam.definition.title} の結果</p>
          <p className="mt-1 text-3xl font-extrabold">
            {score}%（{result.correct}/{result.total}問）
          </p>
          <p className="mt-2 text-sm font-semibold">
            {result.passed
              ? "合格です。今回の範囲は根拠を持って選べています。"
              : `合格ラインは${exam.definition.passingScore}%です。間違えたトピックを復習に追加しました。`}
          </p>
        </section>
        <button
          type="button"
          onClick={() => {
            setAttemptId(newAttemptId());
            setResult(null);
          }}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
        >
          別の問題で再挑戦する
        </button>
        <Link
          href="/review"
          className="block w-full rounded-2xl bg-white px-6 py-3 text-center font-bold text-indigo-600 ring-1 ring-indigo-200"
        >
          復習へ進む
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-bold text-gray-800">
          {exam.questions.length}問・{exam.definition.passingScore}%で合格
        </p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          範囲はこのチェックポイントに定義されたトピックだけです。直近に答えた問題は優先して外します。
        </p>
        {exam.reusedRecentQuestion && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            この範囲の問題数が足りないため、一部の既出問題を含みます。
          </p>
        )}
      </section>
      <TopicQuiz
        topicId={checkpointId}
        questions={exam.questions}
        topicIdForQuestion={(question) =>
          (question as (typeof exam.questions)[number]).topicId
        }
        onComplete={handleComplete}
        completeLabel="採点して結果を見る"
      />
    </div>
  );
}
