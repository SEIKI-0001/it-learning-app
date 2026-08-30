// 成長確認（踊り場）の発火判定と成長エビデンスの抽出（GF-P0-003・純関数・保存なし）。
//
// 役割分担:
//   復習（reviewQueue / 期限切れ / 弱点） … 実力を上げる学習機能。常に優先する。
//   成長確認                              … 成長を実感させるフィードバック機能。
//
// したがってこのモジュールは原則「新しく問題を出す」ことをしない。既存の学習・
// 復習履歴から「以前 → 現在」を抽出して見せるだけで、比較材料が足りないときに
// 限り lib/growthChallenge の任意ミニチャレンジへ委ねる。
//
// 発火はCPの中間地点で最大1回。緊急の復習が溜まっているときは導線ごと延期する。

import type { AppState, UserAnswer } from "@/types";
import type { CheckpointGate, CheckpointId } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { getCheckpointProgress, getCheckpoint, CHECKPOINTS } from "@/lib/checkpoints";
import { getDueReviewTopics } from "@/lib/learningLoop";
import { MASTERED } from "@/lib/badges";

/** CPの折り返し地点とみなす必須バッジの充足率。 */
export const GROWTH_CHECK_MIDPOINT_RATIO = 0.5;

/** 期限切れ復習がこの件数を超えていたら成長確認を延期する。 */
export const GROWTH_CHECK_URGENT_REVIEW_LIMIT = 2;

/** これ以上のエビデンスが揃えば、出題せず可視化だけで完結させる。 */
export const GROWTH_EVIDENCE_SUFFICIENT = 2;

/** 正答率の比較に必要な最小標本数（前後それぞれ）。 */
const MIN_ACCURACY_SAMPLE = 3;

/** 正答率が「改善した」とみなす最小の伸び幅（パーセントポイント）。 */
const MIN_ACCURACY_GAIN = 20;

/** 「以前は苦手だった」とみなす正答率の上限。 */
const PAST_WEAK_ACCURACY = 60;

/** 成長確認を出さない理由。 */
export type GrowthCheckBlockedReason =
  | "before_midpoint" // まだCPの折り返しに達していない
  | "final_exam_ready" // 突破試験が解放済み＝踊り場ではない
  | "already_shown" // このCPでは表示済み
  | "urgent_reviews"; // 期限切れ復習が溜まっている（延期）

export type GrowthCheckGate =
  | { available: true; checkpointId: CheckpointId }
  | { available: false; reason: GrowthCheckBlockedReason };

/**
 * 成長確認を出してよいかを判定する。
 * 順に: CP中間到達 → そのCPで未表示 → 緊急復習が溜まっていない。
 */
export function evaluateGrowthCheckGate(input: {
  state: AppState;
  gate: CheckpointGate;
  now?: Date;
}): GrowthCheckGate {
  const { state, gate } = input;
  const now = input.now ?? new Date();
  const checkpointId = gate.checkpoint.id;

  // 突破試験が解放済みならゴール直前であって「踊り場」ではない。
  if (gate.finalExamUnlocked) return { available: false, reason: "final_exam_ready" };

  const ratio =
    gate.totalRequiredCount > 0 ? gate.earnedRequiredCount / gate.totalRequiredCount : 0;
  if (ratio < GROWTH_CHECK_MIDPOINT_RATIO) {
    return { available: false, reason: "before_midpoint" };
  }

  const shown = getShownCheckpointIds(state);
  if (shown.includes(checkpointId)) return { available: false, reason: "already_shown" };

  // 緊急の復習が溜まっているときは学習を優先し、成長確認は延期する
  // （状態は書き換えないので、復習が片付けば次回また出る）。
  if (getDueReviewTopics(state.progress.reviewQueue, now).length > GROWTH_CHECK_URGENT_REVIEW_LIMIT) {
    return { available: false, reason: "urgent_reviews" };
  }

  return { available: true, checkpointId };
}

/** 表示済みCPの一覧（旧データは空）。 */
export function getShownCheckpointIds(state: AppState): CheckpointId[] {
  return getCheckpointProgress(state).gameful?.growthCheck?.shownCheckpointIds ?? [];
}

/** 成長確認を表示したCPを記録する（冪等）。 */
export function markGrowthCheckShown(state: AppState, checkpointId: CheckpointId): AppState {
  const cp = getCheckpointProgress(state);
  const shown = cp.gameful?.growthCheck?.shownCheckpointIds ?? [];
  if (shown.includes(checkpointId)) return state;

  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: {
        ...cp,
        gameful: {
          ...cp.gameful,
          growthCheck: { shownCheckpointIds: [...shown, checkpointId] },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// 成長エビデンスの抽出
// ---------------------------------------------------------------------------

export type GrowthEvidenceKind =
  | "question_recovered" // 以前まちがえた問題に、いまは正解できる
  | "topic_accuracy" // トピックの正答率が伸びた
  | "topic_mastered" // 以前は苦手だったトピックが定着水準に届いた
  | "checkpoint_span"; // CP開始時点と現在の到達度

export type GrowthEvidence = {
  kind: GrowthEvidenceKind;
  label: string;
  /** 「33% → 100%」のような実測の変化。数値で示せないときは null。 */
  detail: string | null;
};

/** 中央値で前半/後半に割るために最低限必要な解答数（前後それぞれ3件を確保する）。 */
const MIN_HISTORY_FOR_MEDIAN_SPLIT = MIN_ACCURACY_SAMPLE * 2;

/**
 * 「以前」と「現在」を分ける境界時刻。
 *
 * 直前CPに合格した時刻を境界に使う。まだ突破試験を1度も通っていない場合
 * （CP1など）は履歴の中央時点で前半/後半に割る。最初の解答日を境界にすると
 * 「以前」側が必ず空になるため使えない。
 * 十分な履歴が無ければ null（期間比較を行わない）。
 */
export function resolveCheckpointStartedAt(state: AppState, checkpointId: CheckpointId): string | null {
  const cp = getCheckpointProgress(state);
  const order = getCheckpoint(checkpointId).order;
  const previousIds = CHECKPOINTS.filter((item) => item.order < order).map((item) => item.id);

  const passed = cp.finalExamAttempts
    .filter((attempt) => attempt.passed && previousIds.includes(attempt.checkpointId))
    .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
  const latestPassed = passed[passed.length - 1];
  if (latestPassed) return latestPassed.attemptedAt;

  const sorted = [...state.answers]
    .map((answer) => answer.answeredAt)
    .sort((a, b) => a.localeCompare(b));
  if (sorted.length < MIN_HISTORY_FOR_MEDIAN_SPLIT) return null;
  return sorted[Math.floor(sorted.length / 2)];
}

function accuracyPct(answers: UserAnswer[]): number {
  if (answers.length === 0) return 0;
  return Math.round((answers.filter((a) => a.isCorrect).length / answers.length) * 100);
}

/**
 * 既存の学習・復習履歴から「以前 → 現在」の成長を抽出する。
 * 新しく問題を出さず、保存もしない。材料が無ければ空配列。
 */
export function buildGrowthEvidence(input: {
  state: AppState;
  gate: CheckpointGate;
  now?: Date;
}): GrowthEvidence[] {
  const { state, gate } = input;
  const startedAt = resolveCheckpointStartedAt(state, gate.checkpoint.id);
  if (!startedAt) return [];

  const before = state.answers.filter((a) => a.answeredAt < startedAt);
  const after = state.answers.filter((a) => a.answeredAt >= startedAt);
  if (before.length === 0 || after.length === 0) return [];

  const topicTitleById = new Map(getAllTopics().map((topic) => [topic.id, topic.title]));
  const evidence: GrowthEvidence[] = [];

  // 1. 以前まちがえた問題に、いまは正解できる
  const recovered = countRecoveredQuestions(before, after);
  if (recovered > 0) {
    evidence.push({
      kind: "question_recovered",
      label: "以前まちがえた問題に、いまは正解できます",
      detail: `${recovered}問`,
    });
  }

  // 2. トピックの正答率が伸びた（前後とも十分な標本があるものだけ）
  const byTopicBefore = groupByTopic(before);
  const byTopicAfter = groupByTopic(after);
  const accuracyGains: { topicId: string; from: number; to: number }[] = [];
  for (const [topicId, pastAnswers] of byTopicBefore) {
    const recentAnswers = byTopicAfter.get(topicId);
    if (!recentAnswers) continue;
    if (pastAnswers.length < MIN_ACCURACY_SAMPLE || recentAnswers.length < MIN_ACCURACY_SAMPLE) {
      continue;
    }
    const from = accuracyPct(pastAnswers);
    const to = accuracyPct(recentAnswers);
    if (to - from >= MIN_ACCURACY_GAIN) accuracyGains.push({ topicId, from, to });
  }
  accuracyGains.sort((a, b) => b.to - b.from - (a.to - a.from));
  const topGain = accuracyGains[0];
  if (topGain) {
    evidence.push({
      kind: "topic_accuracy",
      label: `${topicTitleById.get(topGain.topicId) ?? "トピック"}の正答率`,
      detail: `${topGain.from}% → ${topGain.to}%`,
    });
  }

  // 3. 以前は苦手だったトピックが定着水準に届いた
  const masteryStats = state.progress.topicMasteryStats ?? {};
  const mastered: string[] = [];
  for (const [topicId, pastAnswers] of byTopicBefore) {
    if (pastAnswers.length < MIN_ACCURACY_SAMPLE) continue;
    if (accuracyPct(pastAnswers) >= PAST_WEAK_ACCURACY) continue;
    const score = masteryStats[topicId]?.masteryScore;
    if (typeof score === "number" && score >= MASTERED) mastered.push(topicId);
  }
  if (mastered.length > 0) {
    evidence.push({
      kind: "topic_mastered",
      label:
        mastered.length === 1
          ? `${topicTitleById.get(mastered[0]) ?? "トピック"}が定着水準に届きました`
          : `${mastered.length}トピックが定着水準に届きました`,
      detail: null,
    });
  }

  // 4. CP開始時点と現在の到達度
  const completedNow = state.progress.completedTopics.length;
  const completedThen = countCompletedTopicsBefore(state, startedAt);
  if (completedNow > completedThen) {
    evidence.push({
      kind: "checkpoint_span",
      label: `CP${gate.checkpoint.order}を始めてから完了したトピック`,
      detail: `${completedThen} → ${completedNow}`,
    });
  }

  return evidence;
}

/** エビデンスだけで完結できるか（＝ミニチャレンジを出さなくてよいか）。 */
export function hasSufficientEvidence(evidence: GrowthEvidence[]): boolean {
  return evidence.length >= GROWTH_EVIDENCE_SUFFICIENT;
}

function groupByTopic(answers: UserAnswer[]): Map<string, UserAnswer[]> {
  const byTopic = new Map<string, UserAnswer[]>();
  for (const answer of answers) {
    if (!answer.topicId) continue;
    const list = byTopic.get(answer.topicId);
    if (list) list.push(answer);
    else byTopic.set(answer.topicId, [answer]);
  }
  return byTopic;
}

/** 以前期の最終解答が誤答で、現在期に正答した問題の数。 */
function countRecoveredQuestions(before: UserAnswer[], after: UserAnswer[]): number {
  const lastBefore = new Map<string, UserAnswer>();
  for (const answer of before) {
    const prev = lastBefore.get(answer.questionId);
    if (!prev || prev.answeredAt < answer.answeredAt) lastBefore.set(answer.questionId, answer);
  }

  const correctAfter = new Set(
    after.filter((answer) => answer.isCorrect).map((answer) => answer.questionId),
  );

  let count = 0;
  for (const [questionId, answer] of lastBefore) {
    if (!answer.isCorrect && correctAfter.has(questionId)) count += 1;
  }
  return count;
}

/**
 * CP開始時点で完了していたトピック数の近似。
 * 完了日時は保存していないため、そのトピックに対する最初の解答が開始前に
 * あったかどうかで数える（現在完了しているトピックのうち、以前から着手済みの数）。
 */
function countCompletedTopicsBefore(state: AppState, startedAt: string): number {
  const firstAnswerAt = new Map<string, string>();
  for (const answer of state.answers) {
    if (!answer.topicId) continue;
    const current = firstAnswerAt.get(answer.topicId);
    if (!current || answer.answeredAt < current) firstAnswerAt.set(answer.topicId, answer.answeredAt);
  }
  return state.progress.completedTopics.filter((topicId) => {
    const at = firstAnswerAt.get(topicId);
    return at !== undefined && at < startedAt;
  }).length;
}
