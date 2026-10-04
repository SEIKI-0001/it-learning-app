import type { CheckPackResultStatus } from "@/types/checkPack";

// 確認パックの「受けたことがあるか」を後から見返すための要約（純粋関数）。
// サーバ（topic_check_pack_attempts）と端末（localStorage）の両方から同じ形を作り、
// 新しいほうを採る。判定そのもの（stage・合格準備度）はここでは扱わない。

export type CheckPackHistoryEntry = {
  /** 最後に最後まで解き終えた時刻（ISO）。 */
  lastCompletedAt: string;
  lastResultStatus: CheckPackResultStatus;
  quizRate: number | null;
  flashcardRate: number | null;
  examLevelRate: number | null;
  /** 解き終えた回数。 */
  count: number;
  /** 一度でも本番対応OK（passed）になったことがあるか。 */
  everPassed: boolean;
};

export type CheckPackHistoryMap = Record<string, CheckPackHistoryEntry>;

export type CheckPackAttemptRow = {
  topic_id: string;
  completed_at: string | null;
  result_status: string;
  quiz_score_rate: number | null;
  flashcard_score_rate: number | null;
  exam_level_score_rate: number | null;
};

const STATUSES: readonly CheckPackResultStatus[] = [
  "passed",
  "review_needed",
  "weak",
  "incomplete",
];

function isStatus(v: unknown): v is CheckPackResultStatus {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

/** サーバ（+00:00）と端末（Z）で書式が違うので、時刻として比べる。 */
function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function rateOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** パック結果の行をトピックごとに「最新の結果＋回数」へまとめる。 */
export function summarizeCheckPackAttempts(rows: CheckPackAttemptRow[]): CheckPackHistoryMap {
  const map: CheckPackHistoryMap = {};
  for (const row of rows) {
    if (!row.topic_id || !row.completed_at || !isStatus(row.result_status)) continue;
    const prev = map[row.topic_id];
    const isNewer = !prev || timeOf(row.completed_at) > timeOf(prev.lastCompletedAt);
    const base: CheckPackHistoryEntry = isNewer
      ? {
          lastCompletedAt: row.completed_at,
          lastResultStatus: row.result_status,
          quizRate: rateOrNull(row.quiz_score_rate),
          flashcardRate: rateOrNull(row.flashcard_score_rate),
          examLevelRate: rateOrNull(row.exam_level_score_rate),
          count: 0,
          everPassed: false,
        }
      : prev;
    map[row.topic_id] = {
      ...base,
      count: (prev?.count ?? 0) + 1,
      everPassed: (prev?.everPassed ?? false) || row.result_status === "passed",
    };
  }
  return map;
}

/**
 * 端末の記録とサーバの記録を合わせる。
 * 最新の結果は新しいほうを採り、回数・本番対応OK経験は多いほう/どちらかを採る
 * （保存できなかった回は端末にしか無く、他端末の回はサーバにしか無いため）。
 */
export function mergeCheckPackHistoryEntry(
  a: CheckPackHistoryEntry | null | undefined,
  b: CheckPackHistoryEntry | null | undefined,
): CheckPackHistoryEntry | null {
  if (!a) return b ?? null;
  if (!b) return a;
  const latest = timeOf(a.lastCompletedAt) >= timeOf(b.lastCompletedAt) ? a : b;
  return {
    ...latest,
    count: Math.max(a.count, b.count),
    everPassed: a.everPassed || b.everPassed,
  };
}
