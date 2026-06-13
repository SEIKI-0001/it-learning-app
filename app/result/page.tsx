"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppState, QuestResult, UserAnswer } from "@/types";
import {
  loadAppState,
  saveAppState,
  PENDING_KEY,
  LAST_RESULT_KEY,
} from "@/lib/storage";
import {
  completeQuest,
  getLevelName,
  getWeakTags,
  isAllDaysCleared,
} from "@/lib/game";
import { LAST_DAY, getStage } from "@/data/stages";
import ResultSummary from "@/components/ResultSummary";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuestResult | null | undefined>(undefined);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const pendingRaw = window.sessionStorage.getItem(PENDING_KEY);

    // 通常フロー：クエストから渡された回答を1回だけ集計・保存する
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as {
          dayNo: number;
          answers: UserAnswer[];
        };
        const state = loadAppState();
        if (!state) {
          router.replace("/onboarding");
          return;
        }

        const prevExp = state.progress.exp;
        const prevLevel = state.progress.level;
        const newState: AppState = completeQuest(state, pending.answers);
        saveAppState(newState);

        const stage = getStage(Math.min(pending.dayNo, LAST_DAY));
        const summary: QuestResult = {
          dayNo: pending.dayNo,
          stageName: stage?.stageName ?? `Day ${pending.dayNo}`,
          correctCount: pending.answers.filter((a) => a.isCorrect).length,
          totalCount: pending.answers.length,
          expGained: newState.progress.exp - prevExp,
          level: newState.progress.level,
          levelName: getLevelName(newState.progress.level),
          leveledUp: newState.progress.level > prevLevel,
          weakTagsThisRound: getWeakTags(pending.answers),
          isBoss: pending.dayNo === LAST_DAY,
          allDaysCleared: isAllDaysCleared(newState.progress.completedDays),
        };

        window.sessionStorage.setItem(LAST_RESULT_KEY, JSON.stringify(summary));
        window.sessionStorage.removeItem(PENDING_KEY);
        // 直前のクエスト結果を1度だけ集計する処理（外部ストアとの同期）
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult(summary);
        return;
      } catch {
        // 解析に失敗した場合は下のフォールバックへ
      }
    }

    // リロード時など：直前の結果スナップショットを再表示する
    const lastRaw = window.sessionStorage.getItem(LAST_RESULT_KEY);
    if (lastRaw) {
      try {
        setResult(JSON.parse(lastRaw) as QuestResult);
        return;
      } catch {
        /* ignore */
      }
    }

    // 表示すべき結果がなければマップへ戻す
    router.replace("/map");
  }, [router]);

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        集計中…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <ResultSummary result={result} />

        <button
          type="button"
          onClick={() => router.push("/map")}
          className="mt-8 w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
        >
          🗺️ マップへ戻る
        </button>
      </div>
    </main>
  );
}
