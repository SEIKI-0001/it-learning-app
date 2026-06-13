"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChoiceKey, UserAnswer } from "@/types";
import { PENDING_KEY } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import { getQuestionsByDay } from "@/lib/game";
import { LAST_DAY, getStage } from "@/data/stages";
import QuestCard from "@/components/QuestCard";

export default function TodayQuestPage() {
  const router = useRouter();
  const [state] = useAppState();
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, ChoiceKey>>({});

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  const dayNo = state?.progress.currentDay ?? 1;
  const stage = getStage(Math.min(dayNo, LAST_DAY));
  const questionList = useMemo(
    () => (state ? getQuestionsByDay(dayNo) : []),
    [state, dayNo],
  );

  if (state === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  // 全クリア後（currentDay が最終日を越えている）
  if (dayNo > LAST_DAY || questionList.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
        <p className="text-4xl">🏆</p>
        <p className="text-lg font-bold text-gray-700">
          今日のクエストはありません。
        </p>
        <p className="text-sm text-gray-500">7日間の冒険、おつかれさまでした！</p>
        <Link
          href="/map"
          className="mt-2 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
        >
          マップへ戻る
        </Link>
      </main>
    );
  }

  const current = questionList[index];
  const total = questionList.length;
  const answeredCurrent = selections[current.id] !== undefined;
  const isLast = index === total - 1;
  const allAnswered = questionList.every((q) => selections[q.id] !== undefined);

  function handleSelect(choice: ChoiceKey) {
    if (selections[current.id] !== undefined) return; // 二重回答防止
    setSelections((s) => ({ ...s, [current.id]: choice }));
  }

  function handleNext() {
    if (!isLast) {
      setIndex((i) => i + 1);
    }
  }

  function handleFinish() {
    const now = new Date().toISOString();
    const answers: UserAnswer[] = questionList.map((q) => {
      const sel = selections[q.id];
      return {
        questionId: q.id,
        selectedChoice: sel,
        isCorrect: sel === q.correctChoice,
        answeredAt: now,
        tag: q.tag,
      };
    });
    // クエスト→結果画面への一時受け渡し（EXP計算と保存は /result 側で1回だけ実行）
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ dayNo, answers }),
    );
    router.push("/result");
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      {/* 簡易ヘッダー */}
      <div
        className={`bg-gradient-to-r ${stage?.accent ?? "from-indigo-500 to-violet-600"} px-4 pb-5 pt-5 text-white`}
      >
        <div className="mx-auto w-full max-w-md">
          <Link href="/map" className="text-sm font-medium text-white/80">
            ← マップ
          </Link>
          <h1 className="mt-1 text-xl font-extrabold">
            {stage?.emoji} Day {dayNo}・{stage?.stageName}
            {dayNo === LAST_DAY && " 👑"}
          </h1>
          <p className="mt-0.5 text-xs text-white/80">
            {dayNo === LAST_DAY ? "ボス戦：これまでの総復習だよ" : "今日のクエスト"}
          </p>
          {/* 進捗ドット */}
          <div className="mt-3 flex gap-1.5">
            {questionList.map((q, i) => (
              <span
                key={q.id}
                className={`h-1.5 flex-1 rounded-full ${
                  selections[q.id] !== undefined
                    ? "bg-white"
                    : i === index
                      ? "bg-white/60"
                      : "bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-6">
        <QuestCard
          question={current}
          questionNumber={index + 1}
          totalQuestions={total}
          selectedChoice={selections[current.id] ?? null}
          onSelect={handleSelect}
        />
      </div>

      {/* 下部アクション */}
      {answeredCurrent && (
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            {isLast ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={!allAnswered}
                className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:bg-gray-300"
              >
                🎁 結果を見る
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
              >
                次の問題へ →
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
