// 公式過去問の回答履歴を、AppState.answers から集計する（純粋関数・クライアント可）。
//
// 公式過去問の回答は recordPastExamLearningResult() が questionId = 問題バンクの ID
// （例: "ipa-it-passport-2026-q016"）で AppState.answers に積んでいる。問題バンク本体は
// クライアントへ載せないので、ここでは ID から年度・問番号を読み、公式出題区分は
// lib/questionBank/officialExamField（実行時 import を持たない小さな表）で引く。
//
// 集計結果は「過去問の段階（分野別→混合→ランダム→年度別）をどこまで進めたか」と
// 「まだ取り返していない誤答」を決めるのに使う。回答の保存方式・Exam Readiness には触れない。

import type { UserAnswer } from "@/types";
import type { TopicField } from "@/types/content";
import {
  getOfficialExamField,
  hasOfficialExamFieldRanges,
  OFFICIAL_EXAM_FIELDS,
} from "@/lib/questionBank/officialExamField";

const OFFICIAL_ID = /^ipa-it-passport-(\d{4})-q(\d{3})$/;

export type OfficialQuestionRef = {
  id: string;
  year: number;
  questionNumber: number;
  /** 公式問題冊子上の出題区分。 */
  field: TopicField;
};

/** 公式過去問の ID を読む。公式過去問でなければ null。 */
export function parseOfficialQuestionId(id: string): OfficialQuestionRef | null {
  const match = OFFICIAL_ID.exec(id);
  if (!match) return null;
  const year = Number(match[1]);
  const questionNumber = Number(match[2]);
  if (!hasOfficialExamFieldRanges(year)) return null;
  try {
    return { id, year, questionNumber, field: getOfficialExamField(questionNumber, year) };
  } catch {
    return null;
  }
}

export function isOfficialQuestionId(id: string): boolean {
  return parseOfficialQuestionId(id) !== null;
}

export type OfficialFieldStats = {
  /** 解いたことのある問題数（重複なし）。 */
  answered: number;
  /** 最新の回答が正解の問題数。 */
  correct: number;
  /** 最新回答ベースの正答率（0〜1）。未回答なら null。 */
  accuracy: number | null;
};

export type OfficialHistory = {
  byField: Record<TopicField, OfficialFieldStats>;
  /** 解いたことのある公式過去問の総数（重複なし）。 */
  totalAnswered: number;
  /** 年度ごとの回答済み問題数（重複なし）。 */
  answeredByYear: Record<number, number>;
  /**
   * まだ取り返していない誤答（最新の回答が不正解）で、今日より前に解いたもの。
   * 解いた当日はすぐ解き直させず、翌日以降の復習に回す。古い順。
   */
  pendingWrongIds: string[];
  /** 今日解いた公式過去問の数（重複なし）。 */
  answeredToday: number;
  /** 解いたことのある問題 ID（未出題優先の出題に使う）。 */
  answeredIds: Set<string>;
  /** 最新の回答が不正解の問題 ID（今日の分も含む）。 */
  latestWrongIds: Set<string>;
};

function startOfLocalDay(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** AppState.answers から公式過去問の履歴を集計する。 */
export function summarizeOfficialHistory(
  answers: UserAnswer[],
  now: Date = new Date(),
): OfficialHistory {
  const latest = new Map<string, { ref: OfficialQuestionRef; answer: UserAnswer; time: number }>();
  const todayStart = startOfLocalDay(now);
  const today = new Set<string>();

  for (const answer of answers) {
    const ref = parseOfficialQuestionId(answer.questionId);
    if (!ref) continue;
    const time = Date.parse(answer.answeredAt);
    const safeTime = Number.isFinite(time) ? time : 0;
    if (safeTime >= todayStart) today.add(ref.id);
    const prev = latest.get(ref.id);
    if (!prev || safeTime >= prev.time) latest.set(ref.id, { ref, answer, time: safeTime });
  }

  const byField = Object.fromEntries(
    OFFICIAL_EXAM_FIELDS.map((field) => [field, { answered: 0, correct: 0, accuracy: null }]),
  ) as Record<TopicField, OfficialFieldStats>;
  const answeredByYear: Record<number, number> = {};
  const wrong: { id: string; time: number }[] = [];
  const latestWrongIds = new Set<string>();

  for (const { ref, answer, time } of latest.values()) {
    const stats = byField[ref.field];
    stats.answered += 1;
    if (answer.isCorrect) stats.correct += 1;
    answeredByYear[ref.year] = (answeredByYear[ref.year] ?? 0) + 1;
    if (!answer.isCorrect) latestWrongIds.add(ref.id);
    if (!answer.isCorrect && time < todayStart) wrong.push({ id: ref.id, time });
  }
  for (const stats of Object.values(byField)) {
    stats.accuracy = stats.answered > 0 ? stats.correct / stats.answered : null;
  }

  return {
    byField,
    totalAnswered: latest.size,
    answeredByYear,
    pendingWrongIds: wrong.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id)).map((w) => w.id),
    answeredToday: today.size,
    answeredIds: new Set(latest.keys()),
    latestWrongIds,
  };
}
