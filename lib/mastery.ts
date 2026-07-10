import type { UserAnswer, UserProgress } from "@/types";

// 習熟度は「今回の4問」ではなく、回答履歴・間隔・直近性をまとめて評価する。
// 1回の満点だけで100には到達せず、日を空けた再確認で定着度が上がる設計にする。
const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function ageInDays(answeredAt: string, now: Date): number {
  const time = Date.parse(answeredAt);
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, (now.getTime() - time) / DAY_MS);
}

/**
 * トピックの全回答履歴から習熟度を算出する。
 *
 * - 直近の回答ほど正答率へ強く反映する
 * - 回答数と、日を空けた確認回数が十分になるまで上限を抑える
 * - 古い履歴も捨てず、最低限の重みで継続して反映する
 */
export function calculateTopicMastery(
  answers: UserAnswer[],
  now: Date = new Date(),
): number {
  if (answers.length === 0) return 0;

  let weightedCorrect = 0;
  let weightTotal = 0;
  const studyDays = new Set<string>();

  for (const answer of answers) {
    // 90日で直近性の重みは半分程度になり、その後も過去の実績は残す。
    const recencyWeight = 0.35 + 0.65 * Math.exp(-ageInDays(answer.answeredAt, now) / 90);
    weightTotal += recencyWeight;
    if (answer.isCorrect) weightedCorrect += recencyWeight;
    studyDays.add(dayKey(answer.answeredAt));
  }

  const accuracy = weightTotal === 0 ? 0 : weightedCorrect / weightTotal;
  // 4問満点の初回はおよそ72。12問・3日以上の確認で満点に到達する。
  const evidence =
    50 +
    30 * Math.min(1, answers.length / 8) +
    20 * Math.min(1, studyDays.size / 3);

  return Math.round(clamp(accuracy * evidence, 0, 100));
}

/** 最終確認から時間がたつほど、画面・判定用の定着度を緩やかに下げる。 */
export function effectiveTopicMastery(
  storedMastery: number | undefined,
  answers: UserAnswer[],
  now: Date = new Date(),
): number {
  const mastery = storedMastery ?? 0;
  if (mastery <= 0 || answers.length === 0) return mastery;

  const latest = answers.reduce((latestAt, answer) =>
    answer.answeredAt > latestAt ? answer.answeredAt : latestAt,
  answers[0].answeredAt);
  const days = ageInDays(latest, now);
  // 1週間は維持。その後は2週間ごとに2ポイント、最大20ポイントだけ減衰させる。
  const decay = days <= 7 ? 0 : Math.min(20, Math.floor((days - 7) / 14) * 2);
  return Math.max(0, Math.round(mastery - decay));
}

/** Progress と全回答履歴から、トピック1件の現在の定着度を返す。 */
export function masteryForTopic(
  progress: UserProgress,
  answers: UserAnswer[],
  topicId: string,
  now: Date = new Date(),
): number {
  return effectiveTopicMastery(
    progress.topicMastery[topicId],
    answers.filter((answer) => answer.topicId === topicId),
    now,
  );
}
