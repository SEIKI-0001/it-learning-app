"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import { isAllDaysCleared } from "@/lib/game";
import { LAST_DAY, getStage } from "@/data/stages";
import AppHeader from "@/components/AppHeader";
import ProgressMap from "@/components/ProgressMap";

export default function MapPage() {
  const router = useRouter();
  const [state] = useAppState();

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  if (state === undefined || state === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  const { progress } = state;
  const allCleared = isAllDaysCleared(progress.completedDays);
  const todayStage = getStage(Math.min(progress.currentDay, LAST_DAY));

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      <AppHeader progress={progress} />

      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-extrabold text-gray-800">冒険マップ</h1>
          <p className="mt-1 text-sm text-gray-500">
            {allCleared
              ? "全ステージ制覇！いつでも復習に戻れます。"
              : `今日は Day ${progress.currentDay}「${todayStage?.stageName}」に挑戦できます。`}
          </p>
        </div>

        <ProgressMap progress={progress} />
      </div>

      {/* 下部固定の行動ボタン */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          {allCleared ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-700">
              🏆 7日間体験クリア！おつかれさまでした
            </div>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/quest/today")}
              className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
            >
              ▶ 今日のクエストへ
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
