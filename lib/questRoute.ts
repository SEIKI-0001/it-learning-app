import { getTopic } from "@/lib/content";
import { getLessonLocation } from "@/lib/learningCatalog";
import {
  COMBO_BONUS_CAP,
  studyXpReward,
  XP_NEW_TOPIC_BONUS,
  XP_PER_COMBO,
  XP_PER_COMPLETION,
  XP_PER_CORRECT,
} from "@/lib/study";
import type { AppState } from "@/types";

// ============================================================================
// /today の「今日のルート」表示向けヘルパー。今日のタスク一覧（アプリ側で毎回
// 再計算される TodayTask[]）と、その日固定で見せたい順序（localStorage に保存
// した stored route）をマージし、ゲーム風の「済み/現在地/次/ロック中」ノード
// 列を組み立てる。学習ロジック本体（lib/study.ts）には手を加えない。
// ============================================================================

export type QuestNodeState = "done" | "current" | "up_next" | "locked";

export type QuestRouteNode = {
  topicId: string;
  title: string;
  estimatedMinutes: number;
  activity: "learn" | "review";
  state: QuestNodeState;
};

export type TodayRouteTask = {
  topicId: string;
  title: string;
  estimatedMinutes: number;
  activity: "learn" | "review";
};

/** ローカル日付（年/月/日）が一致するか。UTC/ISOスライスでは日本時間の日境界とずれるため使わない。 */
function sameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 今日すでにそのトピックへ解答したか（=今日のルート上で「済み」扱いにできるか）。 */
export function isTaskDoneToday(state: AppState, topicId: string, now: Date = new Date()): boolean {
  return state.answers.some(
    (answer) => answer.topicId === topicId && sameLocalDate(new Date(answer.answeredAt), now),
  );
}

/**
 * 今日のタスク一覧（毎回再計算される tasks）と、保存済みの固定順序（storedTopicIds）
 * をマージし、表示用ノード列を組み立てる。
 *
 * 順序: storedTopicIds を先頭に置く（今日一度見せた順序を途中で入れ替えない）。
 *   - stored の id が tasks に残っていれば、その tasks 側の情報（最新のタイトル・
 *     所要時間・activity）を使う。
 *   - tasks に無くなっていても、今日すでに解答済み（done）なら「済みノード」として
 *     そのままの位置に残す（達成感を消さない）。
 *   - tasks に無く、かつ未解答なら、getTopic/getLessonLocation で解決できる限り
 *     フォールバック情報（activity="learn"）で残し、解決できなければ落とす。
 * その後、stored に含まれていない tasks を末尾に追加する。
 * 最後に topicId で重複排除し、非doneの先頭2件を current/up_next、残りを locked とする。
 */
export function buildQuestRoute(
  state: AppState,
  tasks: TodayRouteTask[],
  storedTopicIds: string[] | null,
  now: Date = new Date(),
): QuestRouteNode[] {
  const taskById = new Map(tasks.map((task) => [task.topicId, task]));
  const seen = new Set<string>();
  const ordered: Omit<QuestRouteNode, "state">[] = [];

  for (const topicId of storedTopicIds ?? []) {
    if (seen.has(topicId)) continue;
    const task = taskById.get(topicId);
    if (task) {
      seen.add(topicId);
      ordered.push({ ...task });
      continue;
    }
    // tasks に無くなった id（今日の解答で完了しタスク一覧から外れた、など）。
    // 済みノードとして残したい場合も含め、getTopic/getLessonLocation で解決できる
    // 限りフォールバック情報で残す。解決できないid（不正な値など）だけ落とす。
    const topic = getTopic(topicId);
    const location = getLessonLocation(topicId);
    if (!topic || !location) continue;
    seen.add(topicId);
    ordered.push({
      topicId,
      title: topic.title,
      estimatedMinutes: topic.estimatedMinutes,
      activity: "learn",
    });
  }

  for (const task of tasks) {
    if (seen.has(task.topicId)) continue;
    seen.add(task.topicId);
    ordered.push({ ...task });
  }

  let nonDoneSeen = 0;
  return ordered.map((node) => {
    const done = isTaskDoneToday(state, node.topicId, now);
    let nodeState: QuestNodeState;
    if (done) {
      nodeState = "done";
    } else {
      nonDoneSeen += 1;
      nodeState = nonDoneSeen === 1 ? "current" : nonDoneSeen === 2 ? "up_next" : "locked";
    }
    return { ...node, state: nodeState };
  });
}

/**
 * そのトピックを全問正解で完了した場合に得られる最大XPの見積もり。
 * completeTopicStudy（lib/study.ts）の全問正解ケースと同じ式を使う
 * （correctCount=問題数、comboBonus は全問正解なら最長連続=問題数になるため
 *  n>=3 の場合 min((n-2)*XP_PER_COMBO, COMBO_BONUS_CAP) と一致する）。
 * ルート上での「このタスクは最大+n XP」表示に使う、参考値。
 */
export function estimateTaskXpMax(
  state: AppState,
  topicId: string,
  now: Date = new Date(),
): number | null {
  const topic = getTopic(topicId);
  const n = topic?.checkQuestions.length ?? 0;
  if (n === 0) return null;

  const reward = studyXpReward(state, topicId, now);
  if (reward.multiplier === 0) return null;

  const combo = n >= 3 ? Math.min((n - 2) * XP_PER_COMBO, COMBO_BONUS_CAP) : 0;
  const base = n * XP_PER_CORRECT + XP_PER_COMPLETION + combo;
  const rounded = Math.round(base * reward.multiplier);
  const newTopicBonus = state.progress.completedTopics.includes(topicId) ? 0 : XP_NEW_TOPIC_BONUS;
  return rounded + newTopicBonus;
}

// ---------------------------------------------------------------------------
// 今日のルート順序の保存（当日中はページ再訪問しても同じ並びで見せるため）。
// ---------------------------------------------------------------------------

export const TODAY_ROUTE_STORAGE_KEY = "fequest:todayRoute:v1";

type StoredRoute = {
  date: string;
  topicIds: string[];
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** 保存済みの今日のルート順序を読み込む。日付が一致しない・読み込み失敗なら null。 */
export function loadStoredRoute(date: string): string[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(TODAY_ROUTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRoute;
    if (parsed.date !== date) return null;
    return parsed.topicIds;
  } catch {
    return null;
  }
}

/** 今日のルート順序を保存する。容量超過などの失敗は握りつぶす（表示に必須ではないため）。 */
export function saveStoredRoute(date: string, topicIds: string[]): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredRoute = { date, topicIds };
    window.localStorage.setItem(TODAY_ROUTE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 保存できなくても致命的ではない（毎回 tasks から組み立て直せる）
  }
}
