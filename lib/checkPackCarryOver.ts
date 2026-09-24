import type { ReviewItem, UserAnswer } from "@/types";
import type { CheckQuestion } from "@/types/content";

// ============================================================================
// 確認パック「基礎確認問題」の重複スキップ（純粋関数）。
// ----------------------------------------------------------------------------
// 確認パックのステップ1は、レッスン末尾の確認問題と同じ topic.checkQuestions を出す。
// 同じ学習フローで確認問題に正解した直後に、同じ問題をもう一度解かせない。
//
// 方針:
//   - 同一性は CheckQuestion.id（= question_attempts.question_id / 合格準備度の
//     canonicalQuestionId）で判定する。表示テキストは使わない。
//   - 正解済みの問題は「確認パック相当の理解確認をすでに満たした」とみなし、
//     確認問題の回答記録そのものを根拠として再利用する。新しい回答は作らない。
//   - 再利用するのは「同じ日（ローカル日付）の、その問題の最新回答が正解」のときだけ。
//     一度でも正解した問題を永久に省くわけではない。
//   - トピックの復習期限が来ているときは省略しない（既存の復習ロジックを優先する）。
// ============================================================================

/** 確認問題の回答から引き継いだ、ステップ1の省略分。 */
export type CarriedQuizAnswer = {
  questionId: string;
  answeredAt: string;
};

export type PackQuizPlan = {
  /** 確認パックで実際に出題する問題（元の順序を保つ）。 */
  toAsk: CheckQuestion[];
  /** 確認問題で正解済みのため出題しない問題。 */
  carried: CarriedQuizAnswer[];
};

function localDateOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 確認パックのステップ1で出題する問題と、確認問題の正解を引き継ぐ問題に分ける。
 * answers / reviewQueue が無い（未初期化・未ログインの初回など）ときは全問出題する。
 */
export function planPackQuizQuestions(
  questions: CheckQuestion[],
  topicId: string,
  answers: UserAnswer[] | undefined,
  reviewQueue: ReviewItem[] | undefined,
  now: Date = new Date(),
): PackQuizPlan {
  const all: PackQuizPlan = { toAsk: questions, carried: [] };
  if (!answers || answers.length === 0) return all;

  const reviewDue = (reviewQueue ?? []).some(
    (item) => item.topicId === topicId && Date.parse(item.dueAt) <= now.getTime(),
  );
  if (reviewDue) return all;

  const today = localDateOf(now);
  const latestById = new Map<string, UserAnswer>();
  for (const answer of answers) {
    if (answer.topicId !== undefined && answer.topicId !== topicId) continue;
    const answeredMs = Date.parse(answer.answeredAt);
    if (!Number.isFinite(answeredMs)) continue;
    const prev = latestById.get(answer.questionId);
    if (!prev || Date.parse(prev.answeredAt) <= answeredMs) {
      latestById.set(answer.questionId, answer);
    }
  }

  const toAsk: CheckQuestion[] = [];
  const carried: CarriedQuizAnswer[] = [];
  for (const question of questions) {
    const latest = latestById.get(question.id);
    const answeredAt = latest ? new Date(latest.answeredAt) : null;
    if (
      latest?.isCorrect
      && answeredAt
      && answeredAt.getTime() <= now.getTime()
      && localDateOf(answeredAt) === today
    ) {
      carried.push({ questionId: question.id, answeredAt: latest.answeredAt });
    } else {
      toAsk.push(question);
    }
  }
  return { toAsk, carried };
}

/**
 * ステップ1の正答率。引き継いだ正解（確認問題の記録）と、パックで解いた回答を合わせて
 * パック全体の設問数に対する割合にする。問題数が減っても率は下がらない。
 */
export function combinedQuizRate(
  carriedCount: number,
  askedCorrect: number,
  askedTotal: number,
): number | null {
  const total = carriedCount + askedTotal;
  if (total <= 0) return null;
  return Math.round(((carriedCount + askedCorrect) / total) * 100);
}
