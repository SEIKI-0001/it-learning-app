"use client";

// 「今日の3ミッション」カード（/today）。
// 学習成果ベースの3件をチェックリストで見せ、コンプリートで宝箱（固定XP+ドロップ）を
// 受け取れる。受け取りは claimed で冪等。保存は既存の saveAppState + saveProgressToDb。

import { useState } from "react";
import type { AppState } from "@/types";
import {
  allQuestsDone,
  claimDailyQuestReward,
  getQuestDef,
  resolveDailyQuests,
  DAILY_QUEST_CLEAR_XP,
} from "@/lib/dailyQuests";
import { emitCelebration } from "@/lib/celebration";
import { saveAppState } from "@/lib/storage";
import { getUserId, saveProgressToDb, todayLocalDate } from "@/lib/userSession";
import ConfettiBurst from "@/components/celebration/ConfettiBurst";

export default function DailyQuestCard({
  state,
  setState,
}: {
  state: AppState;
  setState: (s: AppState) => void;
}) {
  const [justClaimed, setJustClaimed] = useState<string | null>(null); // ドロップ表示
  const quests = resolveDailyQuests(state, todayLocalDate());
  const doneCount = quests.quests.filter((q) => q.progress >= q.goal).length;
  const complete = allQuestsDone(quests);

  function handleClaim() {
    const claimed = claimDailyQuestReward(state);
    if (!claimed) return;
    saveAppState(claimed.state);
    setState(claimed.state);
    setJustClaimed(claimed.dropLabel);
    emitCelebration(state, claimed.state, [
      { kind: "questClear", label: "今日の3ミッション コンプリート！" },
    ]);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, claimed.state.progress);
  }

  return (
    <section className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      {justClaimed && <ConfettiBurst />}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-gray-800">
          📋 今日の3ミッション
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            complete
              ? "bg-emerald-100 text-emerald-700"
              : "bg-indigo-50 text-indigo-600"
          }`}
        >
          {doneCount} / {quests.quests.length}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {quests.quests.map((q) => {
          const def = getQuestDef(q.id);
          if (!def) return null;
          const done = q.progress >= q.goal;
          return (
            <li key={q.id} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done
                    ? "animate-pop-in bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : def.emoji}
              </span>
              <span
                className={`flex-1 text-sm font-semibold ${
                  done ? "text-gray-400 line-through" : "text-gray-700"
                }`}
              >
                {def.label}
              </span>
              {q.goal > 1 && !done && (
                <span className="shrink-0 text-xs font-bold text-gray-400">
                  {q.progress}/{q.goal}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {quests.claimed || justClaimed ? (
        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
          <p className="text-sm font-bold text-emerald-700">
            🎁 今日の宝箱は受け取り済み
          </p>
          {justClaimed && (
            <p className="mt-0.5 text-xs font-semibold text-emerald-600">
              +{DAILY_QUEST_CLEAR_XP} XP・{justClaimed}
            </p>
          )}
        </div>
      ) : complete ? (
        <button
          type="button"
          onClick={handleClaim}
          className="animate-sheen mt-3 w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-[0.98]"
        >
          🎁 宝箱を開ける（+{DAILY_QUEST_CLEAR_XP} XP）
        </button>
      ) : (
        <p className="mt-3 text-xs font-semibold text-gray-400">
          3つ達成すると宝箱がもらえます
        </p>
      )}
    </section>
  );
}
