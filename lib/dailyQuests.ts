// 「今日の3ミッション」— セッションフック（今日やる明確な理由）を作るデイリーミッション。
//
// 設計方針:
//   - ミッションはすべて学習成果（確認問題の完了・正解・復習消化・コンボ）ベース。
//     開くだけ・押すだけで進む無意味なものは置かない。
//   - 3件は日付文字列のハッシュから決定的に選ぶ（保存不要・毎日自動で入れ替わる）。
//   - 報酬は3件コンプリートで一度きり: 固定XP + 宝箱（既存の追加ドロップを1回再利用）。
//     受け取りは claimed フラグで冪等。
// データは CheckpointProgress.dailyQuests（jsonb内・DBマイグレーション不要）に持つ。

import type { AppState, UserAnswer } from "@/types";
import type { DailyQuestState, QuestReroll } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { grantExp } from "@/lib/game";
import { applyBadgeDrop } from "@/lib/badgeDrops";

/** 3件コンプリート時の固定XP（宝箱ドロップとは別）。 */
export const DAILY_QUEST_CLEAR_XP = 10;
const QUEST_COUNT = 3;

/** 学習完了1回ぶんの成果。ミッション進捗はこのイベントだけから加算する。 */
export type DailyQuestEvent = {
  correct: number;
  total: number;
  /** 復習キューにあったトピックの学習だったか。 */
  isReview: boolean;
  /** 今回の回答での最長連続正解。 */
  maxCombo: number;
};

export type DailyQuestDef = {
  id: string;
  emoji: string;
  label: string;
  goal: number;
  /** その日の出題候補にできるか（復習が無い日に復習ミッションを出さない等）。 */
  isAvailable?: (state: AppState) => boolean;
  /** 完了イベントからの進捗増分。 */
  gain: (event: DailyQuestEvent) => number;
};

export const QUEST_DEFS: DailyQuestDef[] = [
  {
    id: "complete_topic",
    emoji: "✅",
    label: "確認問題を1トピック完了する",
    goal: 1,
    gain: () => 1,
  },
  {
    id: "accuracy_80",
    emoji: "🎯",
    label: "正答率80%以上を1回出す",
    goal: 1,
    gain: (e) => (e.total > 0 && e.correct / e.total >= 0.8 ? 1 : 0),
  },
  {
    id: "review_one",
    emoji: "🔁",
    label: "復習を1件消化する",
    goal: 1,
    isAvailable: (state) => state.progress.reviewQueue.length > 0,
    gain: (e) => (e.isReview ? 1 : 0),
  },
  {
    id: "combo_3",
    emoji: "🔥",
    label: "3コンボ（3連続正解）を出す",
    goal: 1,
    gain: (e) => (e.maxCombo >= 3 ? 1 : 0),
  },
  {
    id: "correct_8",
    emoji: "✏️",
    label: "合計8問正解する",
    goal: 8,
    gain: (e) => e.correct,
  },
];

export function getQuestDef(id: string): DailyQuestDef | undefined {
  return QUEST_DEFS.find((q) => q.id === id);
}

/** Date からローカル日付 "YYYY-MM-DD" を作る（lib/userSession todayLocalDate と同じ形式）。 */
export function localDateOf(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 決定的なハッシュ（同じ入力なら常に同じ値）。日替わりの選出シードに使う。 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** その日の3ミッションを決定的に選ぶ（保存不要・毎日入れ替わる）。 */
export function buildTodayQuests(state: AppState, date: string): DailyQuestState {
  const candidates = QUEST_DEFS.filter((q) => q.isAvailable?.(state) ?? true);
  const picked = [...candidates]
    .sort((a, b) => hashString(`${date}:${a.id}`) - hashString(`${date}:${b.id}`))
    .slice(0, QUEST_COUNT);
  return {
    date,
    quests: picked.map((q) => ({ id: q.id, goal: q.goal, progress: 0 })),
    claimed: false,
  };
}

/**
 * その日の差し替え記録をミッション一覧へ適用する（GF-P1-009）。
 *
 * 差し替え済みのIDが一覧に無ければ何もしない。つまり進捗保存によって
 * 差し替え後の状態が既に永続化されていても、二重に適用されない（冪等）。
 */
function applyReroll(quests: DailyQuestState, reroll: QuestReroll | undefined): DailyQuestState {
  if (!reroll || reroll.date !== quests.date) return quests;
  const index = quests.quests.findIndex((quest) => quest.id === reroll.replacedQuestId);
  if (index < 0) return quests;
  const def = getQuestDef(reroll.newQuestId);
  if (!def) return quests;

  const next = [...quests.quests];
  next[index] = { id: def.id, goal: def.goal, progress: 0 };
  return { ...quests, quests: next };
}

/** 保存済み状態を今日の分に解決する（日付が変わっていたら作り直す）。 */
export function resolveDailyQuests(state: AppState, date: string): DailyQuestState {
  const reroll = state.progress.checkpointProgress?.gameful?.questReroll;
  const saved = state.progress.checkpointProgress?.dailyQuests;
  const base = saved && saved.date === date ? saved : buildTodayQuests(state, date);
  return applyReroll(base, reroll);
}

/** その日にまだ差し替えられるか（1日1回）。 */
export function canRerollQuest(state: AppState, date: string): boolean {
  const reroll = state.progress.checkpointProgress?.gameful?.questReroll;
  return !reroll || reroll.date !== date;
}

/**
 * 差し替え候補。今日の3件に入っていない、その日に出題可能なミッションから
 * 日付ハッシュで決定的に1件選ぶ（render 中の乱数を増やさない）。
 */
export function pickRerollCandidate(state: AppState, date: string): DailyQuestDef | null {
  const current = new Set(resolveDailyQuests(state, date).quests.map((quest) => quest.id));
  const candidates = QUEST_DEFS.filter(
    (def) => !current.has(def.id) && (def.isAvailable?.(state) ?? true),
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => hashString(`${date}:reroll:${a.id}`) - hashString(`${date}:reroll:${b.id}`),
  )[0];
}

/**
 * ミッションを1件だけ差し替える（GF-P1-009）。
 *
 * 差し替えられるのは「まだ手をつけていない」ミッションだけ。着手済みや完了済みを
 * 差し替えると、そこまでの進捗や達成が消えてしまうため許可しない
 * （要件「完了済みミッションを不利益にしない」「既に獲得した進捗を失わせない」）。
 * 条件を満たさない場合は state をそのまま返す。
 */
export function applyQuestReroll(
  state: AppState,
  questId: string,
  now: Date = new Date(),
): AppState {
  const date = localDateOf(now);
  if (!canRerollQuest(state, date)) return state;

  const resolved = resolveDailyQuests(state, date);
  const target = resolved.quests.find((quest) => quest.id === questId);
  if (!target || target.progress > 0) return state;

  const replacement = pickRerollCandidate(state, date);
  if (!replacement) return state;

  const cp = state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  const reroll: QuestReroll = {
    date,
    replacedQuestId: questId,
    newQuestId: replacement.id,
  };
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: {
        ...cp,
        // 差し替え後の一覧をそのまま保存し、再読込でも同じ結果になるようにする。
        dailyQuests: applyReroll(resolved, reroll),
        gameful: { ...cp.gameful, questReroll: reroll },
      },
    },
  };
}

export function allQuestsDone(quests: DailyQuestState): boolean {
  return quests.quests.every((q) => q.progress >= q.goal);
}

/** 回答列の最長連続正解（コンボミッションの判定用）。 */
export function maxComboOf(answers: UserAnswer[]): number {
  let longest = 0;
  let run = 0;
  for (const a of answers) {
    run = a.isCorrect ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

/** 学習完了イベントをその日のミッション進捗へ反映する（上限は goal で頭打ち）。 */
export function applyDailyQuestProgress(
  state: AppState,
  event: DailyQuestEvent,
  now: Date = new Date(),
): AppState {
  const resolved = resolveDailyQuests(state, localDateOf(now));
  const quests = resolved.quests.map((q) => {
    const def = getQuestDef(q.id);
    if (!def) return q;
    return {
      ...q,
      progress: Math.min(q.goal, q.progress + def.gain(event)),
    };
  });
  const changed =
    resolved !== state.progress.checkpointProgress?.dailyQuests ||
    quests.some((q, i) => q.progress !== resolved.quests[i].progress);
  if (!changed) return state;

  const cp = state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: { ...cp, dailyQuests: { ...resolved, quests } },
    },
  };
}

export type DailyQuestClaimResult = {
  state: AppState;
  rewardXp: number;
  /** 宝箱の中身の表示ラベル（例: "✨ きらめきの欠片"）。 */
  dropLabel: string;
};

/**
 * 3件コンプリートの報酬（固定XP + 宝箱ドロップ1回）を受け取る。
 * 未達成・受け取り済みなら null（冪等）。
 */
export function claimDailyQuestReward(
  state: AppState,
  now: Date = new Date(),
): DailyQuestClaimResult | null {
  const resolved = resolveDailyQuests(state, localDateOf(now));
  if (resolved.claimed || !allQuestsDone(resolved)) return null;

  const { exp, level } = grantExp(state.progress.exp, DAILY_QUEST_CLEAR_XP);
  const cp = state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  const claimedState: AppState = {
    ...state,
    progress: {
      ...state.progress,
      exp,
      level,
      checkpointProgress: {
        ...cp,
        dailyQuests: { ...resolved, claimed: true },
      },
    },
  };
  // 宝箱 = 既存の追加ドロップを1回（欠片・レア天井カウンタもそのまま活きる）。
  const dropped = applyBadgeDrop(claimedState);
  return {
    state: dropped.state,
    rewardXp: DAILY_QUEST_CLEAR_XP,
    dropLabel: `${dropped.drop.emoji} ${dropped.drop.label}`,
  };
}
