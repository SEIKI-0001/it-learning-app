// 成長確認チャレンジ（踊り場）の出題選定と前後比較（GF-P0-003・純関数・保存なし）。
//
// 目的は「過去に難しかった問題をいま解ける」体験で、過去の自分との比較から
// 成長を実感させること。学習評価の器ではないので、次の境界を厳守する。
//
//   - 既出問題しか出さない。したがって question exposure は必ず `seen` のままで、
//     初見証拠には決してならない（判定自体は既存の
//     saveQuestionAttemptsForCurrentSession / is_first_attempt が原子的に行う。
//     ここは独自の exposure 判定を持たない）。
//   - CP ゲート・必須バッジ・合格準備度へのボーナス加点を一切行わない。
//     このモジュールは AppState を読むだけで、進行状態を作らない。
//   - 前回学習の直後は「丸暗記の確認」にしかならないため、一定期間が空いた
//     対象だけを候補にする。
//
// 用語について: 要件書は比較対象の同一性を `canonicalQuestionId` と呼ぶが、
// 本リポジトリにその名前の識別子は無く、実体は question_attempts.question_id
// （＝CheckQuestion.id）である。ここでは questionId 単位で同一性を担保する。

import type { AppState, UserAnswer } from "@/types";
import type { CheckQuestion } from "@/types/content";
import { getAllTopics } from "@/lib/content";

/** 前回解いてからこの日数が経つまでは出題しない（直後の丸暗記確認を避ける）。 */
export const GROWTH_CHALLENGE_COOLDOWN_DAYS = 3;

/** 1回のチャレンジで出す最大問数（3〜5分で終わる分量）。 */
export const GROWTH_CHALLENGE_SIZE = 5;

const DAY_MS = 86_400_000;

/** なぜこの問題が選ばれたか。 */
export type GrowthChallengeReason = "past_miss" | "low_mastery";

/** 出題1件と、その問題の「前回」。 */
export type GrowthChallengeItem = {
  questionId: string;
  topicId: string;
  topicTitle: string;
  question: CheckQuestion;
  reason: GrowthChallengeReason;
  previous: {
    isCorrect: boolean;
    answeredAt: string;
    /** これまでの解答回数。 */
    attemptCount: number;
  };
};

/** 前回 → 今回の比較1行。 */
export type GrowthComparisonRow = {
  questionId: string;
  topicId: string;
  topicTitle: string;
  previousCorrect: boolean;
  currentCorrect: boolean;
  /** 前回誤答 → 今回正答。 */
  improved: boolean;
};

export type GrowthComparison = {
  rows: GrowthComparisonRow[];
  total: number;
  previousCorrectCount: number;
  currentCorrectCount: number;
  improvedCount: number;
};

/** questionId から出題と所属トピックを引くための索引。 */
function buildQuestionIndex(): Map<string, { topicId: string; topicTitle: string; question: CheckQuestion }> {
  const index = new Map<string, { topicId: string; topicTitle: string; question: CheckQuestion }>();
  for (const topic of getAllTopics()) {
    for (const question of topic.checkQuestions) {
      if (!index.has(question.id)) {
        index.set(question.id, { topicId: topic.id, topicTitle: topic.title, question });
      }
    }
  }
  return index;
}

/** questionId ごとの解答履歴（古い順）。 */
function groupAnswersByQuestion(answers: UserAnswer[]): Map<string, UserAnswer[]> {
  const byQuestion = new Map<string, UserAnswer[]>();
  for (const answer of answers) {
    const list = byQuestion.get(answer.questionId);
    if (list) list.push(answer);
    else byQuestion.set(answer.questionId, [answer]);
  }
  for (const list of byQuestion.values()) {
    list.sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
  }
  return byQuestion;
}

/** 低習熟とみなすトピックの習熟度上限。lib/learningLoop の弱点判定より緩く取る。 */
const LOW_MASTERY_MAX = 60;

/**
 * 成長確認チャレンジを組み立てる。
 * 比較材料が無ければ空配列（呼び出し側は導線ごと出さない）。
 *
 * 選定:
 *   1. 直近の解答が誤答だった既出問題（past_miss）を最優先
 *   2. 次に、習熟度が低いトピックの既出問題（low_mastery）
 *   いずれも「前回からクールダウン日数が経過している」ものだけ。
 *   同区分内では前回解答が古い順（久しく触れていないものを優先）。
 */
export function buildGrowthChallenge(input: {
  state: AppState;
  now?: Date;
  limit?: number;
  cooldownDays?: number;
}): GrowthChallengeItem[] {
  const now = input.now ?? new Date();
  const limit = input.limit ?? GROWTH_CHALLENGE_SIZE;
  const cooldownDays = input.cooldownDays ?? GROWTH_CHALLENGE_COOLDOWN_DAYS;
  const cutoff = now.getTime() - cooldownDays * DAY_MS;

  const index = buildQuestionIndex();
  const byQuestion = groupAnswersByQuestion(input.state.answers);
  const masteryStats = input.state.progress.topicMasteryStats ?? {};

  const candidates: GrowthChallengeItem[] = [];

  for (const [questionId, history] of byQuestion) {
    const entry = index.get(questionId);
    if (!entry) continue; // アプリ内の確認問題として解決できないものは扱わない

    const last = history[history.length - 1];
    const lastAt = Date.parse(last.answeredAt);
    if (!Number.isFinite(lastAt) || lastAt > cutoff) continue; // クールダウン中

    const mastery = masteryStats[entry.topicId]?.masteryScore;
    const lowMastery = typeof mastery === "number" && mastery <= LOW_MASTERY_MAX;

    let reason: GrowthChallengeReason | null = null;
    if (!last.isCorrect) reason = "past_miss";
    else if (lowMastery) reason = "low_mastery";
    if (!reason) continue;

    candidates.push({
      questionId,
      topicId: entry.topicId,
      topicTitle: entry.topicTitle,
      question: entry.question,
      reason,
      previous: {
        isCorrect: last.isCorrect,
        answeredAt: last.answeredAt,
        attemptCount: history.length,
      },
    });
  }

  const rank = (item: GrowthChallengeItem) => (item.reason === "past_miss" ? 0 : 1);
  return candidates
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.previous.answeredAt.localeCompare(b.previous.answeredAt) ||
        a.questionId.localeCompare(b.questionId),
    )
    .slice(0, limit);
}

/** 出題があるか（導線を出すかどうかの判定に使う）。 */
export function hasGrowthChallenge(input: {
  state: AppState;
  now?: Date;
  cooldownDays?: number;
}): boolean {
  return buildGrowthChallenge({ ...input, limit: 1 }).length > 0;
}

/**
 * 今回の解答を出題と突き合わせ、「前回 → 今回」の比較を作る。
 * 出題に無い解答は無視し、解答が無い出題も行に含めない
 * （比較対象が同一 questionId であることを保つ）。
 */
export function buildGrowthComparison(
  challenge: GrowthChallengeItem[],
  answers: UserAnswer[],
): GrowthComparison {
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const rows: GrowthComparisonRow[] = [];

  for (const item of challenge) {
    const answer = answerByQuestion.get(item.questionId);
    if (!answer) continue;
    rows.push({
      questionId: item.questionId,
      topicId: item.topicId,
      topicTitle: item.topicTitle,
      previousCorrect: item.previous.isCorrect,
      currentCorrect: answer.isCorrect,
      improved: !item.previous.isCorrect && answer.isCorrect,
    });
  }

  return {
    rows,
    total: rows.length,
    previousCorrectCount: rows.filter((row) => row.previousCorrect).length,
    currentCorrectCount: rows.filter((row) => row.currentCorrect).length,
    improvedCount: rows.filter((row) => row.improved).length,
  };
}
