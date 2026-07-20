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
import Icon from "@/components/ui/Icon";

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
    <section className="relative">
      {justClaimed && <ConfettiBurst />}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500">今日の3ミッション</h3>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
            complete
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          {doneCount} / {quests.quests.length}
        </span>
      </div>

      <ul className="mt-2.5 space-y-2">
        {quests.quests.map((q) => {
          const def = getQuestDef(q.id);
          if (!def) return null;
          const done = q.progress >= q.goal;
          return (
            <li key={q.id} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                  done
                    ? "animate-pop-in bg-emerald-600 text-white"
                    : "border border-gray-300 bg-white"
                }`}
              >
                {done && <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />}
              </span>
              <span
                className={`flex-1 text-sm ${
                  done ? "text-gray-400 line-through" : "text-gray-700"
                }`}
              >
                {def.label}
              </span>
              {q.goal > 1 && !done && (
                <span className="shrink-0 text-xs tabular-nums text-gray-400">
                  {q.progress}/{q.goal}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {quests.claimed || justClaimed ? (
        <div className="mt-3 border-t border-gray-100 pt-2.5">
          <p className="text-sm text-emerald-700">今日の宝箱は受け取り済みです</p>
          {justClaimed && (
            <p className="mt-0.5 text-xs text-emerald-600">
              +{DAILY_QUEST_CLEAR_XP} XP・{justClaimed}
            </p>
          )}
        </div>
      ) : complete ? (
        <button
          type="button"
          onClick={handleClaim}
          className="mt-3 w-full rounded-lg bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-700 active:scale-[0.99]"
        >
          宝箱を開ける（+{DAILY_QUEST_CLEAR_XP} XP）
        </button>
      ) : (
        <p className="mt-3 text-xs text-gray-400">
          3つ達成すると宝箱がもらえます
        </p>
      )}
    </section>
  );
}
