"use client";

// 「今日のミッション」（/today の右列）。学習成果ベースの3件の達成状況と、
// そろったときの宝箱の受け取り。差し替え（1日1回）と受け取りのロジックは
// 旧「今日の3ミッション」カードと同じ lib/dailyQuests を使い、見た目だけを進行表に合わせる。

import { useState } from "react";
import type { AppState } from "@/types";
import {
  allQuestsDone,
  applyQuestReroll,
  canRerollQuest,
  claimDailyQuestReward,
  getQuestDef,
  resolveDailyQuests,
  DAILY_QUEST_CLEAR_XP,
  type DailyQuestContext,
} from "@/lib/dailyQuests";
import { emitCelebration } from "@/lib/celebration";
import { saveAppState } from "@/lib/storage";
import { getUserId, saveProgressToDb, todayLocalDate } from "@/lib/userSession";
import ConfettiBurst from "@/components/celebration/ConfettiBurst";
import s from "./todayView.module.css";

export default function TodayMissions({
  state,
  setState,
  context,
}: {
  state: AppState;
  setState: (next: AppState) => void;
  /** 今日のルートにあるタスク（用語ミッションを出すかの判断に使う）。 */
  context: DailyQuestContext;
}) {
  const [dropLabel, setDropLabel] = useState<string | null>(null);
  const today = todayLocalDate();
  const quests = resolveDailyQuests(state, today, context);
  const doneCount = quests.quests.filter((q) => q.progress >= q.goal).length;
  const complete = allQuestsDone(quests);
  const rerollAvailable = canRerollQuest(state, today);

  const persist = (next: AppState) => {
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, next.progress);
  };

  const handleReroll = (questId: string) => {
    const next = applyQuestReroll(state, questId, new Date(), context);
    if (next !== state) persist(next);
  };

  const handleClaim = () => {
    const claimed = claimDailyQuestReward(state);
    if (!claimed) return;
    persist(claimed.state);
    setDropLabel(claimed.dropLabel);
    emitCelebration(state, claimed.state, [
      { kind: "questClear", label: "今日の3ミッション コンプリート！" },
    ]);
  };

  const rewardState = quests.claimed || dropLabel ? "claimed" : complete ? "claimable" : "locked";

  return (
    <section className={`${s.missions} relative`} aria-labelledby="mission-heading">
      {dropLabel && <ConfettiBurst />}
      <div className={s.sheetHead}>
        <h2 id="mission-heading" className={s.sectionTitle}>
          今日のミッション
        </h2>
        <span className={s.sectionMeta}>
          <span className={s.mono}>{doneCount}</span> / {quests.quests.length} 達成
        </span>
      </div>

      <ul className={s.missionList}>
        {quests.quests.map((quest) => {
          const def = getQuestDef(quest.id);
          if (!def) return null;
          const done = quest.progress >= quest.goal;
          const canReroll = rerollAvailable && !done && quest.progress === 0;
          return (
            <li key={quest.id} className={s.mission} data-complete={done}>
              <span className={s.missionLabel}>{def.label}</span>
              <span className={s.missionCount}>
                {canReroll && (
                  <button
                    type="button"
                    className={s.missionReroll}
                    onClick={() => handleReroll(quest.id)}
                    aria-label={`「${def.label}」を別のミッションに変える`}
                  >
                    変える
                  </button>
                )}
                {quest.progress}/{quest.goal}
              </span>
              <span className={s.missionBar} aria-hidden>
                <span
                  className={s.missionBarFill}
                  style={{ width: `${Math.min(1, quest.progress / quest.goal) * 100}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <div className={s.reward} data-state={rewardState}>
        {rewardState === "claimed" ? (
          <p>
            宝箱を受け取りました
            {dropLabel && (
              <>
                （<span className={s.mono}>+{DAILY_QUEST_CLEAR_XP}</span> XP・{dropLabel}）
              </>
            )}
          </p>
        ) : rewardState === "claimable" ? (
          <>
            <p>3つそろいました</p>
            <button type="button" className={s.claim} onClick={handleClaim}>
              宝箱を開ける（<span className={s.mono}>+{DAILY_QUEST_CLEAR_XP}</span> XP）
            </button>
          </>
        ) : (
          <p>
            3つそろうと宝箱（<span className={s.mono}>+{DAILY_QUEST_CLEAR_XP}</span> XP）
          </p>
        )}
      </div>
    </section>
  );
}
