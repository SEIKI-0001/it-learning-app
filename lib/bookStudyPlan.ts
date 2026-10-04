import type { Topic } from "@/types/content";
import type { UserProfile } from "@/types";
import type { ReferenceStudyPlan } from "@/types/referenceBook";
import {
  currentBookUnit,
  type BookStudyOrder,
  type BookUnit,
} from "@/lib/bookStudyOrder";

// ============================================================================
// 参考書順（Book mode）の計画: 予定日・先行／遅れ・学習量の配分（純粋関数）。
//
// 順番は本から毎回導出する（lib/bookStudyOrder）。ここで保存用に作るのは
// 「どのユニットをいつ頃までに学ぶ予定か」のスナップショットだけ。
// 進み具合の判定は Topic 完了（completedTopics）だけで行い、読了チェックは使わない
// （端末差・押し忘れで計画の位置がぶれないように）。
// ============================================================================

/**
 * Book mode で新規学習に必ず残す、1日の学習量の割合。
 * 期限切れの復習・苦手補強が溜まっていても、新規が無期限に止まらないようにする。
 * 予定日の計算も同じ割合で見積もる（学習時間のすべてを新規に使える前提にしない）。
 */
export const BOOK_NEW_SHARE = 0.4;

/** 新規学習（インプット）を終える目安 = 試験日までの残り日数のこの割合の時点（以後は過去問・総復習）。 */
const INPUT_PHASE_RATIO = 0.6;

/** 補足の安全弁: インプット終了のこの日数前を過ぎたら、残っている重要な補足を先に出す。 */
const SUPPLEMENT_SAFETY_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 今日のキューに渡す Book mode の入力。 */
export type BookQueueOptions = {
  order: BookStudyOrder;
  /**
   * この日（YYYY-MM-DD、ローカル）以降は、本に無い重要テーマ（補足・重要度3）を
   * 本の残りより先に出す。無ければ安全弁なし。
   */
  supplementDeadline?: string;
};

export function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / DAY_MS);
}

function dailyStudyMinutes(profile: UserProfile | undefined): number {
  const weekday =
    typeof profile?.weekdayMinutes === "number" && profile.weekdayMinutes > 0
      ? profile.weekdayMinutes
      : Number.parseInt(profile?.dailyMinutes ?? "", 10) > 0
        ? Number.parseInt(profile!.dailyMinutes, 10)
        : 10;
  const holiday =
    typeof profile?.holidayMinutes === "number" && profile.holidayMinutes > 0
      ? profile.holidayMinutes
      : weekday;
  return (weekday * 5 + holiday * 2) / 7;
}

/**
 * 予定日を作る。
 *   - 1日に新規へ使える時間 = 平均学習時間 × BOOK_NEW_SHARE
 *   - 試験日があれば、インプットを残り日数の60%の時点（inputEndDate）までに終える。
 *     そのペースで間に合わないときは、全体を均等に詰めて inputEndDate に収める
 *   - 学習済みのトピックは時間に数えない（今日から残りを並べ直す）
 *   - 読むだけのユニットは直前のユニットと同じ日
 */
export function buildReferenceStudyPlan(input: {
  order: BookStudyOrder;
  bookId: string;
  topics: Topic[];
  profile: UserProfile | undefined;
  completedTopicIds: Iterable<string>;
  now: Date;
  previous?: ReferenceStudyPlan | null;
}): ReferenceStudyPlan {
  const { order, topics, profile, now } = input;
  const completed = new Set(input.completedTopicIds);
  const minutesById = new Map(topics.map((t) => [t.id, t.estimatedMinutes]));
  const startDate = localDateKey(now);
  const perDay = Math.max(1, dailyStudyMinutes(profile) * BOOK_NEW_SHARE);

  const remainingMinutes = order.units.map((unit) =>
    unit.topicIds
      .filter((id) => !completed.has(id))
      .reduce((sum, id) => sum + (minutesById.get(id) ?? 10), 0),
  );
  const totalMinutes = remainingMinutes.reduce((a, b) => a + b, 0);
  const paceDays = Math.ceil(totalMinutes / perDay);

  let inputDays = paceDays;
  if (profile?.examDate) {
    const daysToExam = daysBetween(startDate, profile.examDate);
    if (daysToExam > 0) inputDays = Math.min(paceDays, Math.max(1, Math.floor(daysToExam * INPUT_PHASE_RATIO)));
  }
  const scale = paceDays > 0 ? inputDays / paceDays : 0;

  let cumulative = 0;
  let lastDate = startDate;
  const units = order.units.map((unit, i) => {
    if (unit.topicIds.length === 0) return { unitId: unit.unitId, plannedDate: lastDate };
    cumulative += remainingMinutes[i];
    const day = remainingMinutes[i] === 0 ? 0 : Math.max(0, Math.ceil((cumulative / perDay) * scale) - 1);
    lastDate = remainingMinutes[i] === 0 ? lastDate : addDays(startDate, day);
    return { unitId: unit.unitId, plannedDate: lastDate };
  });

  const previous = input.previous && input.previous.bookId === input.bookId ? input.previous : null;
  return {
    bookId: input.bookId,
    structureHash: order.structureHash,
    revision: previous ? previous.revision + 1 : 1,
    revisedAt: now.toISOString(),
    startDate,
    inputEndDate: addDays(startDate, Math.max(0, inputDays - 1)),
    ...(profile?.examDate ? { examDate: profile.examDate } : {}),
    dailyMinutes: Math.round(dailyStudyMinutes(profile)),
    units,
  };
}

/**
 * 保存済みの計画をそのまま使えるか。別の本・本の構造が変わった・試験日や学習時間が
 * 変わったときは作り直す（完了済みは保ったまま、残りの予定日だけ引き直す）。
 */
export function isReferenceStudyPlanCurrent(
  plan: ReferenceStudyPlan | null | undefined,
  input: { bookId: string; order: BookStudyOrder; profile: UserProfile | undefined },
): plan is ReferenceStudyPlan {
  if (!plan) return false;
  return (
    plan.bookId === input.bookId &&
    plan.structureHash === input.order.structureHash &&
    (plan.examDate ?? null) === (input.profile?.examDate ?? null) &&
    (plan.dailyMinutes ?? null) === Math.round(dailyStudyMinutes(input.profile))
  );
}

/** 補足の安全弁の日付（インプット終了の7日前。開始日より前にはしない）。 */
export function supplementDeadlineFor(plan: ReferenceStudyPlan | null | undefined): string | undefined {
  if (!plan) return undefined;
  const deadline = addDays(plan.inputEndDate, -SUPPLEMENT_SAFETY_DAYS);
  return daysBetween(plan.startDate, deadline) >= 0 ? deadline : plan.startDate;
}

export type ReferenceStudyPlanProgress = {
  /** いま進めているユニット（全部学習済みなら null） */
  current: BookUnit | null;
  /** 予定では今日までに学び終えているはずの最後のユニット（まだ無ければ null） */
  expected: BookUnit | null;
  /** 予定より何ユニット先行しているか（負なら遅れ） */
  deltaUnits: number;
  learnedUnits: number;
  totalUnits: number;
};

/** 予定と実績（Topic 完了）を比べる。読むだけのユニットは数えない。 */
export function referenceStudyPlanProgress(
  plan: ReferenceStudyPlan,
  order: BookStudyOrder,
  completedTopicIds: Iterable<string>,
  now: Date,
): ReferenceStudyPlanProgress {
  const completed = new Set(completedTopicIds);
  const today = localDateKey(now);
  const planned = new Map(plan.units.map((u) => [u.unitId, u.plannedDate]));
  const units = order.units.filter((u) => u.topicIds.length > 0);
  const learned = units.filter((u) => u.topicIds.every((id) => completed.has(id))).length;
  const current = currentBookUnit(order, completed);
  // 予定日が今日より前のユニット数 = 今日の時点で終えているはずの数
  const dueCount = units.filter((u) => {
    const date = planned.get(u.unitId);
    return date !== undefined && date < today;
  }).length;
  const expected = dueCount > 0 ? units[dueCount - 1] : null;
  return {
    current,
    expected,
    deltaUnits: learned - dueCount,
    learnedUnits: learned,
    totalUnits: units.length,
  };
}
