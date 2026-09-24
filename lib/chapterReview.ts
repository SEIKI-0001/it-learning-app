import { getWrittenQuestionsForTopic } from "@/data/writtenQuestions";
import { getLessonsForTheme, getThemeBySlug } from "@/lib/learningCatalog";
import { LOW_MASTERY_THRESHOLD } from "@/lib/learningLoop";
import type { UserProgress } from "@/types";
import type { GradeResult, WrittenQuestion } from "@/types/aiGrading";
import type {
  ChapterReviewState,
  ThemeExamRecord,
  UnderstandingLevel,
  UnderstandingSignal,
} from "@/types/chapterReview";
import type { Topic } from "@/types/content";
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
 *   exam_miss        … 総まとめ試験で誤答したトピック
 *   low_mastery      … 理解度（Mastery）が低いトピック
 *   explain_correct  … 四択では正解したトピック（説明できるかを確かめる）
 *   representative   … 章を代表する重要トピック
 */
export type UnderstandingCheckReason =
  | "exam_miss"
  | "low_mastery"
  | "explain_correct"
  | "representative";

export type UnderstandingCheckPick = {
  question: WrittenQuestion;
  topicId: string;
  topicTitle: string;
  reason: UnderstandingCheckReason;
};

/** 章のトピックのうち、記述問題を持つものを章の並び順で返す。 */
export function getUnderstandingCheckTopics(themeSlug: string): Topic[] {
  const theme = getThemeBySlug(themeSlug);
  if (!theme) return [];
  return getLessonsForTheme(theme).filter(
    (topic) => getWrittenQuestionsForTopic(topic.id).length > 0,
  );
}

/**
 * AI理解チェックで出す1問を選ぶ。完全なランダムにはしない。
 *
 * 優先順位:
 *   1. 総まとめ試験で誤答した重要トピック（誤答数 → 重要度）
 *   2. Mastery が低いトピック
 *   3. 総まとめ試験では正解したトピック（重要度が高い順）
 *   4. 章を代表する重要トピック
 *
 * 各段で、直近のAI理解チェックで「理解できている」だったトピックは後ろへ回す
 * （同じ問題を繰り返し出さず、まだ確かめていない理解を見に行くため）。
 * 同じトピックに複数の設問があれば、前回と違う設問を選ぶ。
 */
export function pickUnderstandingCheck(input: {
  themeSlug: string;
  examQuestions: readonly { topicId: string; isCorrect: boolean }[];
  progress?: UserProgress | null;
}): UnderstandingCheckPick | null {
  const topics = getUnderstandingCheckTopics(input.themeSlug);
  if (topics.length === 0) return null;

  const signals = input.progress
    ? chapterReviewOf(input.progress).understandingSignals ?? {}
    : {};
  const stats = input.progress?.topicMasteryStats ?? {};
  const order = new Map(topics.map((topic, index) => [topic.id, index]));

  const missed = new Map<string, number>();
  const answeredCorrectly = new Set<string>();
  for (const q of input.examQuestions) {
    if (q.isCorrect) answeredCorrectly.add(q.topicId);
    else missed.set(q.topicId, (missed.get(q.topicId) ?? 0) + 1);
  }

  const alreadySolid = (topicId: string) => signals[topicId]?.level === "solid";
  const byPriority = (key: (topic: Topic) => number) => (a: Topic, b: Topic) =>
    Number(alreadySolid(a.id)) - Number(alreadySolid(b.id))
    || key(b) - key(a)
    || b.importance - a.importance
    || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);

  const tiers: [UnderstandingCheckReason, Topic[]][] = [
    [
      "exam_miss",
      topics
        .filter((topic) => missed.has(topic.id))
        .sort(byPriority((topic) => missed.get(topic.id) ?? 0)),
    ],
    [
      "low_mastery",
      topics
        .filter((topic) => {
          const s = stats[topic.id];
          return s !== undefined && s.lastEvaluatedAt !== "" && s.masteryScore < LOW_MASTERY_THRESHOLD;
        })
        .sort(byPriority((topic) => LOW_MASTERY_THRESHOLD - (stats[topic.id]?.masteryScore ?? 0))),
    ],
    [
      "explain_correct",
      topics.filter((topic) => answeredCorrectly.has(topic.id)).sort(byPriority(() => 0)),
    ],
    ["representative", [...topics].sort(byPriority(() => 0))],
  ];

  for (const [reason, candidates] of tiers) {
    const topic = candidates[0];
    if (!topic) continue;
    const questions = getWrittenQuestionsForTopic(topic.id);
    const previousQuestionId = signals[topic.id]?.questionId;
    const question = questions.find((q) => q.id !== previousQuestionId) ?? questions[0];
    return { question, topicId: topic.id, topicTitle: topic.title, reason };
  }
  return null;
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
