// `/today` の「今日の最優先」1件を決める（GF-P0-001・純関数・保存データなし）。
//
// 設計上の境界（要件書 §6 GF-P0-001 Acceptance Criteria）:
//   - 候補を新しく作らない。既存の推奨ロジック（lib/learningLoop の
//     buildTodaysLearningQueue → lib/aiPlanner の generateTodayMenu →
//     lib/questRoute の buildQuestRoute）が既に選んだ候補だけを扱う。
//   - CP ゲート・バッジ・学習計画の判定ロジックには一切手を入れない。
//     ここがするのは「どれを Primary として強調するか」の表示上の決定だけ。
//   - 推奨理由は既存キュー・復習キューの文言をそのまま運ぶ。新しい理由を発明しない。
//
// 「今日のルート」の並び順は変えない。Primary は原則そのルートの現在地と同じ
// トピックを指し、画面間で「次にやること」がズレないようにする。

import type { AppState, ReviewItem, TodaysLearningQueueItem } from "@/types";
import type { CheckpointGate } from "@/types/checkpoint";
import type { QuestRouteNode } from "@/lib/questRoute";
import type { TodayPrimaryAction, TodayPrimaryKind } from "@/types/gameful";
import { getLessonHref } from "@/lib/learningCatalog";

/**
 * キュー由来の理由が引けないノード向けのフォールバック。
 * 文言は既存コード（lib/learningLoop の addTopic 呼び出し・/today の復習行）と
 * 同じものを使う。ここで新しい表現を作らない。
 */
const FALLBACK_REASON: Record<TodayPrimaryKind, string> = {
  final_exam: "必須バッジが揃いました",
  review: "復習予定日です。",
  weak: "理解度が低い重要Topic",
  new_topic: "次の新規Topic",
};

/** キューの種別を Primary の種別へ寄せる。 */
function kindFromQueue(kind: TodaysLearningQueueItem["kind"]): TodayPrimaryKind | null {
  if (kind === "overdue_review") return "review";
  if (kind === "summary_weak" || kind === "low_mastery") return "weak";
  if (kind === "new_topic") return "new_topic";
  return null; // flashcard / extra_practice はトピック学習ではない
}

function lessonHref(node: QuestRouteNode): string {
  return getLessonHref(node.topicId, {
    from: "today",
    activity: node.activity,
    anchor: node.activity === "review" ? "lesson-quiz" : "lesson-content",
  });
}

/**
 * 今日の最優先1件を決める。候補が無ければ null（呼び出し側は既存の
 * 「復習を見る / テーマを探す」フォールバックを出す）。
 *
 * 優先順位:
 *   1. 期限切れの復習 … 時間依存で忘却が進むため最優先（既存キューでも最上位）
 *   2. 解放済みの突破試験 … CP 進行条件が揃った状態。待てるので復習の次
 *   3. 弱点トピック
 *   4. 新規トピック
 */
export function buildTodayPrimaryAction(input: {
  state: AppState;
  nodes: QuestRouteNode[];
  gate: CheckpointGate;
  queue: TodaysLearningQueueItem[];
  reviewItems: ReviewItem[];
}): TodayPrimaryAction | null {
  const { nodes, gate, queue, reviewItems } = input;

  const queueByTopic = new Map(
    queue.flatMap((item) => (item.topicId ? [[item.topicId, item] as const] : [])),
  );
  const reviewReasonByTopic = new Map(reviewItems.map((item) => [item.topicId, item.reason]));

  const current = nodes.find((node) => node.state === "current") ?? null;

  const currentAction = current ? toTopicAction(current) : null;

  // 1. 期限切れ復習を最優先にする。
  if (currentAction?.kind === "review") return currentAction;

  // 2. CP 進行条件が揃っている（＝突破試験が解放済みで未突破）なら、それを Primary にする。
  const finalExam = gate.checkpoint.finalExam;
  if (finalExam && gate.finalExamUnlocked && !gate.finalExamPassed) {
    return {
      kind: "final_exam",
      topicId: null,
      title: `CP${gate.checkpoint.order}「${gate.checkpoint.title}」の突破試験`,
      estimatedMinutes: null,
      questionCount: finalExam.questionCount,
      reasonLabel:
        gate.totalRequiredCount > 0
          ? `必須バッジ ${gate.earnedRequiredCount}/${gate.totalRequiredCount} が揃いました`
          : FALLBACK_REASON.final_exam,
      href: `/checkpoint/${gate.checkpoint.id}/final`,
      activity: "learn",
    };
  }

  // 3〜4. 弱点・新規はルートの現在地をそのまま使う。
  return currentAction;

  function toTopicAction(node: QuestRouteNode): TodayPrimaryAction {
    const queued = queueByTopic.get(node.topicId);
    const kind =
      (queued ? kindFromQueue(queued.kind) : null) ??
      (node.activity === "review" ? "review" : "new_topic");
    const reasonLabel =
      queued?.reason ?? reviewReasonByTopic.get(node.topicId) ?? FALLBACK_REASON[kind];

    return {
      kind,
      topicId: node.topicId,
      title: node.title,
      estimatedMinutes: node.estimatedMinutes,
      questionCount: null,
      reasonLabel,
      href: lessonHref(node),
      activity: node.activity,
    };
  }
}
