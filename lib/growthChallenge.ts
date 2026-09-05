// 成長確認の「任意ミニチャレンジ」の出題選定と前後比較（GF-P0-003・純関数・保存なし）。
//
// 成長確認の本体は lib/growthCheck の可視化であり、ここは既存履歴からの比較材料が
// 足りないときだけ使うフォールバックである。
//
// 復習との役割分担が最優先:
//   復習（reviewQueue / 期限切れ / 高severity弱点） … 実力を上げる学習機能。常に優先。
//   このチャレンジ                                   … 復習系がすでに手を離した
//                                                      「かつてのつまずき」だけを扱う。
// 除外は条件分岐ではなく母集団の定義として効かせる。同じ問題を復習と成長確認の
// 両方で解かせない。
//
// さらに次の境界を厳守する。
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
import { getDueReviewTopics, getWeakTopics } from "@/lib/learningLoop";

/** 前回解いてからこの日数が経つまでは出題しない（直後の丸暗記確認を避ける）。 */
export const GROWTH_CHALLENGE_COOLDOWN_DAYS = 3;

/** 1回のチャレンジで出す最大問数。可視化の補助なので短く抑える。 */
export const GROWTH_CHALLENGE_SIZE = 3;

/** これ以上の severity の弱点トピックは復習が担当する（チャレンジから外す）。 */
export const REVIEW_OWNED_SEVERITY = 80;

const DAY_MS = 86_400_000;

/** 出題1件と、その問題の「前回」。 */
export type GrowthChallengeItem = {
  questionId: string;
  topicId: string;
  topicTitle: string;
  question: CheckQuestion;
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

/**
 * いま復習が担当しているトピック。ここに入るものはチャレンジから外し、
 * 通常の復習を優先する（同じ問題を両方で解かせない）。
 *   - 復習キューに載っている
 *   - 期限切れの復習
 *   - severity が高い弱点
 */
function buildReviewOwnedTopicIds(state: AppState, now: Date): Set<string> {
  const owned = new Set<string>();
  for (const item of state.progress.reviewQueue) owned.add(item.topicId);
  for (const item of getDueReviewTopics(state.progress.reviewQueue, now)) owned.add(item.topicId);
  for (const weak of getWeakTopics(state.progress.topicMasteryStats ?? {})) {
    if (weak.severity >= REVIEW_OWNED_SEVERITY) owned.add(weak.topicId);
  }
  return owned;
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

/**
 * 任意ミニチャレンジを組み立てる。材料が無ければ空配列。
 *
 * 対象は「直近の解答が誤答だった既出問題」だけに絞る。いま習熟度が低いトピックは
 * 復習が担当すべきで、成長を示す材料にもならないため扱わない。
 * さらに復習が担当中のトピック（キュー・期限切れ・高severity弱点）を母集団から
 * 外し、前回からクールダウン日数が経過したものだけを、古い順に取る。
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
  const reviewOwned = buildReviewOwnedTopicIds(input.state, now);

  const candidates: GrowthChallengeItem[] = [];

  for (const [questionId, history] of byQuestion) {
    const entry = index.get(questionId);
    if (!entry) continue; // アプリ内の確認問題として解決できないものは扱わない
    if (reviewOwned.has(entry.topicId)) continue; // 復習が担当中のトピックは出さない

    const last = history[history.length - 1];
    const lastAt = Date.parse(last.answeredAt);
    if (!Number.isFinite(lastAt) || lastAt > cutoff) continue; // クールダウン中

    // かつてつまずいた問題だけを扱う（いま解けない問題は復習の担当）。
    if (last.isCorrect) continue;

    candidates.push({
      questionId,
      topicId: entry.topicId,
      topicTitle: entry.topicTitle,
      question: entry.question,
      previous: {
        isCorrect: last.isCorrect,
        answeredAt: last.answeredAt,
        attemptCount: history.length,
      },
    });
  }

  return candidates
    .sort(
      (a, b) =>
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
