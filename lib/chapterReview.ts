import { getChapterUnderstandingChecks } from "@/data/chapterUnderstandingChecks";
import { getWrittenQuestion } from "@/data/writtenQuestions";
import { getTopic } from "@/lib/content";
import type { UserProgress } from "@/types";
import type { GradeResult, WrittenQuestion } from "@/types/aiGrading";
import type {
  ChapterReviewState,
  ThemeExamRecord,
  UnderstandingCheckRecord,
  UnderstandingLevel,
  UnderstandingSignal,
} from "@/types/chapterReview";
import type { ThemeExamResult } from "@/types/themeExam";

// ============================================================================
// 章の仕上げ（総まとめ試験の記録＋AI理解チェック）の純関数。
// ----------------------------------------------------------------------------
// 総まとめ試験の合否は四択の採点（lib/themeExam.ts gradeThemeExam）だけが決める。
// AI理解チェックは「四択では正解できたが説明できない」を本人に気づかせる補助で、
// ここで記録するシグナルは合否・章クリア・Mastery を動かさない。
// ============================================================================

// --- 総まとめ試験の記録 -------------------------------------------------------

function chapterReviewOf(progress: UserProgress): ChapterReviewState {
  return progress.checkpointProgress?.chapterReview ?? {};
}

function withChapterReview(progress: UserProgress, next: ChapterReviewState): UserProgress {
  if (!progress.checkpointProgress) return progress;
  return {
    ...progress,
    checkpointProgress: { ...progress.checkpointProgress, chapterReview: next },
  };
}

/** 章の総まとめ試験の記録を返す。未受験なら undefined。 */
export function getThemeExamRecord(
  progress: UserProgress | null | undefined,
  themeSlug: string,
): ThemeExamRecord | undefined {
  if (!progress) return undefined;
  return chapterReviewOf(progress).themeExams?.[themeSlug];
}

/**
 * 総まとめ試験1回ぶんの結果を記録する。
 * 同じ結果を二度適用しても変わらない（保存の再試行で呼ばれ直しても安全）。
 * checkpointProgress の無い古い状態には何もしない（normalizeAppState が補完する前提）。
 */
export function recordThemeExamAttempt(
  progress: UserProgress,
  result: Pick<ThemeExamResult, "themeSlug" | "rate" | "correct" | "total" | "passed">,
  attemptedAt: string,
): UserProgress {
  const review = chapterReviewOf(progress);
  const previous = review.themeExams?.[result.themeSlug];
  const isNewer = !previous || attemptedAt >= previous.lastAttemptAt;
  const latest = isNewer
    ? { latestRate: result.rate, latestCorrect: result.correct, latestTotal: result.total, lastAttemptAt: attemptedAt }
    : {
      latestRate: previous.latestRate,
      latestCorrect: previous.latestCorrect,
      latestTotal: previous.latestTotal,
      lastAttemptAt: previous.lastAttemptAt,
    };
  const passedAts = [previous?.firstPassedAt, result.passed ? attemptedAt : undefined]
    .filter((value): value is string => value !== undefined)
    .sort();
  const record: ThemeExamRecord = {
    ...latest,
    bestRate: Math.max(previous?.bestRate ?? 0, result.rate),
    passed: (previous?.passed ?? false) || result.passed,
    ...(passedAts[0] ? { firstPassedAt: passedAts[0] } : {}),
  };
  return withChapterReview(progress, {
    ...review,
    themeExams: { ...review.themeExams, [result.themeSlug]: record },
  });
}

// --- AI理解チェックの出題選び --------------------------------------------------

/**
 * なぜこの問題を選んだか。画面の一言説明にも使う。
 *   first_time … この章でまだ確かめていない問題
 *   revisit    … 前に「あと一歩」「ここを確認しよう」だった問題（一巡後）
 *   refresh    … すべて「理解できている」だったので、確かめてから最も時間が経った問題
 *
 * 総まとめ試験の正誤や Mastery は理由にしない。章末チェックは弱点の復習ではなく、
 * 「四択では解けるが説明できない」分かったつもりを見つけるためのもの。
 */
export type UnderstandingCheckReason = "first_time" | "revisit" | "refresh";

export type UnderstandingCheckPick = {
  question: WrittenQuestion;
  topicId: string;
  topicTitle: string;
  /** この問題で確かめる「曖昧になりやすい理解」。 */
  focus: string;
  reason: UnderstandingCheckReason;
};

type CheckHistory = Pick<UnderstandingCheckRecord, "questionId" | "level" | "checkedAt">;

/**
 * 章の候補問題ごとの最新の確認記録を返す。
 * understandingChecks（問題単位）を正とし、それ以前の記録（understandingSignals の questionId）も
 * 実施済みとして数える。
 */
function checkHistoryForTheme(
  progress: UserProgress | null | undefined,
  themeSlug: string,
  candidateIds: ReadonlySet<string>,
): Map<string, CheckHistory> {
  const history = new Map<string, CheckHistory>();
  if (!progress) return history;
  const review = chapterReviewOf(progress);
  const entries: CheckHistory[] = [
    ...Object.values(review.understandingChecks ?? {}),
    ...Object.values(review.understandingSignals ?? {}).filter((signal) => signal.themeSlug === themeSlug),
  ];
  for (const entry of entries) {
    if (!candidateIds.has(entry.questionId)) continue;
    const previous = history.get(entry.questionId);
    if (!previous || entry.checkedAt > previous.checkedAt) history.set(entry.questionId, entry);
  }
  return history;
}

/** 章の候補問題を、問題本文とトピックに解決して返す（定義順）。 */
export function getUnderstandingCheckCandidates(themeSlug: string) {
  return getChapterUnderstandingChecks(themeSlug).flatMap((entry) => {
    const question = getWrittenQuestion(entry.questionId);
    const topic = getTopic(entry.topicId);
    return question && topic ? [{ ...entry, question, topicTitle: topic.title }] : [];
  });
}

/**
 * AI理解チェックで出す1問を、章の専用候補（data/chapterUnderstandingChecks.ts）から選ぶ。
 *
 *   1. まだ確かめていない問題を、定義順に
 *   2. 一巡したら、前回「あと一歩」「ここを確認しよう」だった問題（ここを確認しよう → 古い順）
 *   3. すべて「理解できている」なら、確かめてから最も時間が経った問題
 *
 * どの段でも、この章で直前に出した問題は避ける（候補が1問しかない場合を除く）。
 * 総まとめ試験の正誤・Mastery には依存しない。
 */
export function pickUnderstandingCheck(input: {
  themeSlug: string;
  progress?: UserProgress | null;
}): UnderstandingCheckPick | null {
  const candidates = getUnderstandingCheckCandidates(input.themeSlug);
  if (candidates.length === 0) return null;

  const history = checkHistoryForTheme(
    input.progress,
    input.themeSlug,
    new Set(candidates.map((c) => c.questionId)),
  );
  const lastQuestionId = [...history.values()]
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0]?.questionId;
  const pool = candidates.length > 1
    ? candidates.filter((c) => c.questionId !== lastQuestionId)
    : candidates;

  const toPick = (candidate: (typeof candidates)[number], reason: UnderstandingCheckReason): UnderstandingCheckPick => ({
    question: candidate.question,
    topicId: candidate.topicId,
    topicTitle: candidate.topicTitle,
    focus: candidate.focus,
    reason,
  });

  const unchecked = pool.find((c) => !history.has(c.questionId));
  if (unchecked) return toPick(unchecked, "first_time");

  const checkedAt = (c: (typeof candidates)[number]) => history.get(c.questionId)?.checkedAt ?? "";
  const oldestFirst = (a: (typeof candidates)[number], b: (typeof candidates)[number]) =>
    checkedAt(a).localeCompare(checkedAt(b));
  const levelOf = (c: (typeof candidates)[number]) => history.get(c.questionId)?.level;

  const revisit = pool
    .filter((c) => levelOf(c) !== "solid")
    .sort((a, b) => Number(levelOf(b) === "review") - Number(levelOf(a) === "review") || oldestFirst(a, b))[0];
  if (revisit) return toPick(revisit, "revisit");

  return toPick([...pool].sort(oldestFirst)[0], "refresh");
}

/**
 * AI理解チェック1回ぶんの出題履歴を記録する（章末の出題選びに使う）。
 * 補助シグナル（recordUnderstandingSignal）と同じく、合否・Mastery・復習キューは触らない。
 */
export function recordUnderstandingCheck(
  progress: UserProgress,
  record: UnderstandingCheckRecord,
): UserProgress {
  const review = chapterReviewOf(progress);
  const previous = review.understandingChecks?.[record.questionId];
  if (previous && previous.checkedAt > record.checkedAt) return progress;
  return withChapterReview(progress, {
    ...review,
    understandingChecks: { ...review.understandingChecks, [record.questionId]: record },
  });
}

// --- AI理解チェックの結果 ------------------------------------------------------

/**
 * AI採点の点数を3段階へ丸める。章末の画面では点数を主役にしない。
 * 80点以上は既存AI採点の isCorrect と同じ境界に合わせる。
 */
export function understandingLevelFor(result: Pick<GradeResult, "score">): UnderstandingLevel {
  if (result.score >= 80) return "solid";
  if (result.score >= 60) return "almost";
  return "review";
}

export const UNDERSTANDING_LEVEL_LABEL: Record<UnderstandingLevel, string> = {
  solid: "理解できている",
  almost: "あと一歩",
  review: "ここを確認しよう",
};

const MAX_MISSING_POINTS = 3;

/**
 * AI理解チェックの結果を、トピックの補助シグナルとして記録する。
 *
 * 記録するのはシグナルだけで、topicMastery / topicMasteryStats / reviewQueue は触らない。
 * LLMの1回の判定で苦手確定・Mastery低下・強制復習をさせないため。
 */
export function recordUnderstandingSignal(
  progress: UserProgress,
  signal: Omit<UnderstandingSignal, "missingPoints"> & { missingPoints: readonly string[] },
): UserProgress {
  const review = chapterReviewOf(progress);
  const previous = review.understandingSignals?.[signal.topicId];
  if (previous && previous.checkedAt > signal.checkedAt) return progress;
  const next: UnderstandingSignal = {
    ...signal,
    missingPoints: signal.missingPoints
      .map((point) => point.trim())
      .filter(Boolean)
      .slice(0, MAX_MISSING_POINTS),
  };
  return withChapterReview(progress, {
    ...review,
    understandingSignals: { ...review.understandingSignals, [signal.topicId]: next },
  });
}

/** 要確認Topic1件。AIの指摘に加え、その後の通常問題でも誤答したかを持つ。 */
export type UnderstandingFollowUp = UnderstandingSignal & {
  /**
   * AI理解チェックの後に、同じトピックの通常問題・復習・試験で誤答があるか。
   * AIの指摘が四択の結果でも裏づけられた＝強い弱点候補として扱ってよい。
   */
  corroborated: boolean;
};

/**
 * 「あと一歩」「ここを確認しよう」だったトピックを、要確認Topic（復習候補）として返す。
 *
 * AIの指摘だけでは弱点と確定しない。その後の四択でも誤答したものを corroborated とし、
 * 裏づけのあるものを先に並べる。後から「理解できている」になったトピックは自然に外れる
 * （トピックごとに最新の1件しか持たないため）。
 */
export function getUnderstandingFollowUps(
  progress: UserProgress | null | undefined,
  options: { topicIds?: readonly string[] } = {},
): UnderstandingFollowUp[] {
  if (!progress) return [];
  const signals = Object.values(chapterReviewOf(progress).understandingSignals ?? {});
  const allowed = options.topicIds ? new Set(options.topicIds) : null;
  const stats = progress.topicMasteryStats ?? {};
  const after = (at: string, since: string) => Date.parse(at) > Date.parse(since);
  return signals
    .filter((signal) => signal.level !== "solid")
    .filter((signal) => !allowed || allowed.has(signal.topicId))
    .map((signal) => ({
      ...signal,
      corroborated: (stats[signal.topicId]?.recentEvidence ?? []).some(
        (evidence) => !evidence.isCorrect && after(evidence.answeredAt, signal.checkedAt),
      ),
    }))
    .sort(
      (a, b) =>
        Number(b.corroborated) - Number(a.corroborated)
        || Number(b.level === "review") - Number(a.level === "review")
        || b.checkedAt.localeCompare(a.checkedAt),
    );
}
