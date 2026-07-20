"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppState, UserAnswer } from "@/types";
import { FIELD_LABELS, type TopicField } from "@/types/content";
import { getTopic } from "@/lib/content";
import { addTopicsToReview } from "@/lib/study";
import { generateMockExam, MOCK_EXAM_RULE, scoreMockExam, type MockExam, type MockExamResult } from "@/lib/mockExam";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import {
  getUserId,
  saveAnswersToDb,
  saveProgressToDb,
  saveQuestionAttempts,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";

const FIELDS: TopicField[] = ["strategy", "management", "technology"];

function recordMockExam(
  state: AppState,
  answers: UserAnswer[],
  result: MockExamResult,
  now: Date,
): AppState {
  const weakTags = new Set(state.progress.weakTags);
  for (const answer of answers) {
    if (!answer.isCorrect) weakTags.add(answer.tag);
  }
  const withAnswers: AppState = {
    ...state,
    answers: [...state.answers, ...answers],
    progress: {
      ...state.progress,
      weakTags: [...weakTags],
      lastPlayedAt: now.toISOString(),
    },
  };
  return addTopicsToReview(withAnswers, result.wrongTopicIds, "模試で見直し", now);
}

export default function MockExamPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [exam, setExam] = useState<MockExam | null>(null);
  const [result, setResult] = useState<MockExamResult | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  if (state === undefined || state === null) return <LoadingScreen />;
  const appState: AppState = state;

  function startExam() {
    // 同じ挑戦中は設問順を固定し、再挑戦時だけ新しい構成にする。
    const seed = `${new Date().toISOString()}:${appState.answers.length}`;
    setExam(generateMockExam(appState, seed));
    setResult(null);
  }

  function handleComplete(answers: UserAnswer[]) {
    if (!exam) return;
    const now = new Date();
    const tagged = answers.map((answer) => {
      const topicId = exam.topicIdByQuestionId[answer.questionId] ?? answer.topicId;
      const topic = topicId ? getTopic(topicId) : undefined;
      return {
        ...answer,
        topicId,
        tag: topic?.tags[0] ?? topic?.field ?? answer.tag,
      };
    });
    const scored = scoreMockExam(exam, tagged);
    const next = recordMockExam(appState, tagged, scored, now);
    saveAppState(next);
    setState(next);
    setResult(scored);

    const userId = getUserId();
    if (userId) {
      saveProgressToDb(userId, next.progress);
      saveAnswersToDb(userId, appState.progress.currentDay, tagged);
      saveQuestionAttempts(
        userId,
        tagged.map((answer) => ({
          questionId: answer.questionId,
          questionType: "mock_exam" as const,
          topicId: answer.topicId ?? "mock-exam",
          selectedAnswer: answer.selectedChoice ?? null,
          isCorrect: answer.isCorrect,
          mistakeReason: answer.isCorrect ? null : "模試の誤答",
          answeredAt: answer.answeredAt,
        })),
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-brand-700 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/progress" className="text-xs font-semibold text-white/80 hover:text-white">
            ← 進捗へ戻る
          </Link>
          <h1 className="mt-2 text-2xl font-bold">本番形式 100問模試</h1>
          <p className="mt-1 text-sm text-white/85">
            3分野をバランスよく出題。結果は分野別の見直しに使えます。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-2xl">
        {!exam && !result && <RecordingLockNotice />}
        {!exam && !result && (
          <section className="rounded-xl bg-white p-5 border border-gray-200">
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden>🧪</span>
              <div>
                <h2 className="text-lg font-bold text-gray-800">実力をまとめて確認</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  {MOCK_EXAM_RULE.questionCount}問・{MOCK_EXAM_RULE.timeLimitSeconds / 60}分。途中で時間切れになった場合も、回答済みの結果を保存します。
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              {FIELDS.map((field) => (
                <div key={field} className="rounded-xl bg-brand-50 px-2 py-2 font-bold text-brand-700">
                  <p>{FIELD_LABELS[field]}</p>
                  <p className="mt-0.5 text-base">{MOCK_EXAM_RULE.fieldQuestionCounts[field]}問</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={startExam}
              className="mt-5 w-full rounded-xl bg-brand-600 px-5 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98]"
            >
              模試を始める
            </button>
          </section>
        )}

        {exam && !result && (
          <TopicQuiz
            topicId="mock-exam"
            topicIdForQuestion={(question) => exam.topicIdByQuestionId[question.id]}
            questions={exam.questions}
            onComplete={handleComplete}
            completeLabel="模試を採点する"
            timeLimitSeconds={MOCK_EXAM_RULE.timeLimitSeconds}
          />
        )}

        {result && (
          <section className="animate-pop-in rounded-xl bg-white p-5 text-center border border-gray-200">
            <p className="text-4xl" aria-hidden>📊</p>
            <h2 className="mt-2 text-xl font-bold text-gray-800">模試結果</h2>
            <p className="mt-1 text-3xl font-bold text-brand-600">
              {result.correct}<span className="text-base text-gray-500"> / {result.total}問正解</span>
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {FIELDS.map((field) => {
                const score = result.fieldScores[field];
                const rate = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);
                return (
                  <div key={field} className="rounded-xl bg-gray-50 px-2 py-3">
                    <p className="text-[11px] font-bold text-gray-500">{FIELD_LABELS[field]}</p>
                    <p className="mt-1 text-base font-bold text-gray-800">{score.correct}/{score.total}</p>
                    <p className="text-xs font-bold text-brand-600">{rate}%</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              間違えた {result.wrongTopicIds.length} トピックを「復習」に追加しました。まず苦手分野を1つ解き直しましょう。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href="/review" className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white">
                復習する
              </Link>
              <button type="button" onClick={startExam} className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700">
                もう一度挑戦
              </button>
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
