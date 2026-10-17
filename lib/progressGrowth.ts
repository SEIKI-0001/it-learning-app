// /progress の「成長」表示に使う集計。DB・React に依存しない純粋関数。
//   - 週ごとの回答数・正答率（端末の回答履歴から。週は月曜はじまり・端末の時刻）
//   - 合格準備度・理解したトピックの推移（integrated_learning_status の日次スナップショットから）
// 推移は「その日以前で最も新しい点」と比べる。比べる点が無ければ差は null（表示しない）。

import type { UserAnswer } from "@/types";
import type { ProgressHistoryPoint } from "@/types/integratedStatus";

export type WeekBucket = {
  /** 週の初日（月曜）の "YYYY-MM-DD" */
  start: string;
  answers: number;
  correct: number;
  /** 正答率（回答0なら null） */
  accuracy: number | null;
};

const DAY_MS = 24 * 60 * 60_000;

function localKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function mondayOf(date: Date): Date {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() - ((base.getDay() + 6) % 7));
}

/** 直近 weeks 週の回答を週ごとに数える（古い順・最後が今週）。 */
export function weeklyAnswerBuckets(answers: UserAnswer[], today: Date, weeks = 8): WeekBucket[] {
  const thisMonday = mondayOf(today);
  const starts = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    return d;
  });
  const buckets = starts.map((start) => ({ start: localKey(start), answers: 0, correct: 0 }));
  const first = starts[0].getTime();
  for (const answer of answers) {
    const at = new Date(answer.answeredAt);
    if (Number.isNaN(at.getTime()) || at.getTime() < first) continue;
    const index = Math.floor((mondayOf(at).getTime() - first) / (7 * DAY_MS) + 0.01);
    if (index < 0 || index >= weeks) continue;
    buckets[index].answers += 1;
    if (answer.isCorrect) buckets[index].correct += 1;
  }
  return buckets.map((b) => ({
    ...b,
    accuracy: b.answers > 0 ? Math.round((b.correct / b.answers) * 100) : null,
  }));
}

/** date 以前で最も新しい点。無ければ null。 */
function pointOnOrBefore(history: ProgressHistoryPoint[], date: string): ProgressHistoryPoint | null {
  let found: ProgressHistoryPoint | null = null;
  for (const point of history) {
    if (point.date <= date) found = point;
    else break;
  }
  return found;
}

export type ProgressTrend = {
  /** 合格準備度の推移（判定済みの点だけ・古い順） */
  readinessSeries: { date: string; value: number }[];
  /** 7日前と比べた合格準備度の差。比べられなければ null */
  readinessWeekDelta: number | null;
  /** 理解したトピック数の、比べられる最古の点（最大8週前）からの増加。比べられなければ null */
  understoodGrowth: { delta: number; since: string } | null;
};

export function progressTrend(
  history: ProgressHistoryPoint[],
  today: Date,
  current: { readiness: number | null; understood: number | null },
): ProgressTrend {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const todayKey = localKey(today);
  const readinessSeries = sorted
    .filter((p): p is ProgressHistoryPoint & { readiness: number } => p.readiness !== null)
    .map((p) => ({ date: p.date, value: p.readiness }));

  const weekAgo = pointOnOrBefore(sorted, localKey(new Date(today.getTime() - 7 * DAY_MS)));
  const readinessWeekDelta =
    current.readiness !== null && weekAgo?.readiness != null
      ? current.readiness - weekAgo.readiness
      : null;

  const oldest = sorted.find((p) => p.date < todayKey) ?? null;
  const understoodGrowth =
    current.understood !== null && oldest
      ? { delta: current.understood - oldest.understood, since: oldest.date }
      : null;

  return { readinessSeries, readinessWeekDelta, understoodGrowth };
}

/** 次の区切り（10刻み）。到達済みの数と次の目標を返す。 */
export function nextMilestone(count: number, step = 10): { target: number; remaining: number } {
  const target = (Math.floor(count / step) + 1) * step;
  return { target, remaining: target - count };
}
