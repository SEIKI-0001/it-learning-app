// チェックポイントの「完了条件」を人が読める形にする表示用モデル（純粋関数）。
//
// 判定そのものは lib/checkpoints.ts の buildCheckpointGate / measureCheckpoint と
// lib/badges.ts の必須バッジ規則が唯一の正。ここは判定結果を言い換えるだけで、
// 独自の閾値・進捗計算を持たない（表示と実際の CP 判定がズレないようにするため）。

import type { AppState } from "@/types";
import type {
  BadgeDef,
  CheckpointDef,
  CheckpointGate,
  CheckpointId,
  FinalExamAttempt,
} from "@/types/checkpoint";
import { FIELD_LABELS } from "@/types/content";
import type { BadgeGap, BadgeSignals } from "@/lib/badges";
import { buildBadgeStatuses, getRequiredBadgeGaps } from "@/lib/badges";
import {
  buildCheckpointGate,
  CHECKPOINTS,
  getCheckpoint,
  getCheckpointProgress,
  getCheckpointStage,
  measureCheckpoint,
  type CheckpointMeasurements,
  type CheckpointStage,
} from "@/lib/checkpoints";

export type CheckpointConditionId =
  | "setup"
  | "badges"
  | "fieldCoverage"
  | "recentAccuracy"
  | "finalExam";

/** 完了条件1行。 */
export type CheckpointCondition = {
  id: CheckpointConditionId;
  label: string;
  met: boolean;
  /** 前の条件がそろうまで挑戦できない（突破試験）。 */
  locked: boolean;
  /** 数えられる条件の現在値と必要数。 */
  count?: { current: number; required: number };
  /** 補足（現在値・合格ライン・解放条件など）。 */
  detail?: string;
  /** 未達のときに「あと必要なこと」へ出す短い一文。 */
  todo: string;
};

/** CP達成条件（必須バッジ）1件の状況。 */
export type RequiredBadgeRow = {
  def: BadgeDef;
  earned: boolean;
  earnedAt?: string;
  /** 付与前だが条件は満たしている（次の学習のあとに反映される）。 */
  conditionMet: boolean;
  /** 未獲得のとき、条件のうちまだ届いていない数値（例: テクノロジの完了トピック 4 / 6）。 */
  gaps: string[];
};

export type CheckpointDetail = {
  checkpoint: CheckpointDef;
  stage: CheckpointStage;
  gate: CheckpointGate;
  conditions: CheckpointCondition[];
  /** 未達の条件（current のときの「あと必要なこと」）。 */
  remaining: string[];
  requiredBadges: RequiredBadgeRow[];
  /** このCPで獲得した、必須ではないバッジの数。 */
  extraEarnedCount: number;
  /** いま向かっている CP（next / locked の案内文に使う）。 */
  currentCheckpoint: CheckpointDef;
  /** 解放条件＝ひとつ前の CP の突破（CP0 は null）。 */
  unlockAfter: CheckpointDef | null;
  /** 突破試験の合格記録（突破済みのとき。移行推定などで記録が無ければ undefined）。 */
  passedAttempt?: FinalExamAttempt;
  /** 突破試験の挑戦回数。 */
  attemptCount: number;
};

/** CP の位置づけの表示名。 */
export const STAGE_LABELS: Record<CheckpointStage, string> = {
  cleared: "突破済み",
  current: "挑戦中",
  next: "次に挑戦",
  locked: "未解放",
};

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

/**
 * ゲート判定を完了条件の行に変換する。
 * 行の並び・有無は buildCheckpointGate の判定項目と1:1（存在しない条件を足さない）。
 */
export function buildGateConditions(
  gate: CheckpointGate,
  measured: CheckpointMeasurements,
  options: { setupDone?: boolean } = {},
): CheckpointCondition[] {
  const cp = gate.checkpoint;

  // CP0 は突破試験もバッジも無く、初回設定の完了だけが条件。
  if (!cp.finalExam) {
    return [
      {
        id: "setup",
        label: "初回設定を完了する",
        met: options.setupDone ?? false,
        locked: false,
        detail: "試験日・学習時間・苦手分野を設定します",
        todo: "初回設定を完了する",
      },
    ];
  }

  const rows: CheckpointCondition[] = [];
  const badgesMet =
    gate.missingBadges.length === 0 && gate.earnedRequiredCount >= gate.requiredBadgeCount;
  const badgeRest = Math.max(0, gate.requiredBadgeCount - gate.earnedRequiredCount);
  rows.push({
    id: "badges",
    label: `CP達成条件を ${gate.requiredBadgeCount} 件満たす`,
    met: badgesMet,
    locked: false,
    count: {
      current: Math.min(gate.earnedRequiredCount, gate.requiredBadgeCount),
      required: gate.requiredBadgeCount,
    },
    todo: `CP達成条件をあと${badgeRest}件満たす`,
  });

  if (cp.requiredFieldCoverage.length > 0) {
    const total = cp.requiredFieldCoverage.length;
    const missing = measured.missingFields.map((f) => FIELD_LABELS[f]);
    rows.push({
      id: "fieldCoverage",
      label: total === 3 ? "3分野すべてに手をつける" : `${cp.requiredFieldCoverage.map((f) => FIELD_LABELS[f]).join("・")}に手をつける`,
      met: gate.fieldCoverageMet,
      locked: false,
      count: { current: total - missing.length, required: total },
      detail: missing.length > 0 ? `まだ: ${missing.join("・")}` : undefined,
      todo: `${missing.join("・")}のトピックを${missing.length > 1 ? "それぞれ" : ""}1つ完了する`,
    });
  }

  if (cp.recentAccuracyMin !== undefined) {
    rows.push({
      id: "recentAccuracy",
      label: `直近の正答率 ${pct(cp.recentAccuracyMin)} 以上`,
      met: gate.accuracyMet,
      locked: false,
      detail: measured.recentAccuracy === null ? undefined : `いま ${pct(measured.recentAccuracy)}`,
      todo: `直近の正答率を${pct(cp.recentAccuracyMin)}以上にする`,
    });
  }

  const examLocked = !gate.finalExamUnlocked && !gate.finalExamPassed;
  rows.push({
    id: "finalExam",
    label: "突破試験に合格する",
    met: gate.finalExamPassed,
    locked: examLocked,
    detail: examLocked
      ? `上の条件を満たすと解放されます。${cp.winConditionLabel}`
      : cp.winConditionLabel,
    todo: "突破試験に合格する",
  });

  return rows;
}

const GAP_SUBJECT: Record<BadgeGap["metric"], string> = {
  completedTotal: "完了したトピック",
  completedByField: "完了したトピック",
  quizClearedTotal: "確認問題をクリアしたトピック",
  quizClearedByField: "確認問題をクリアしたトピック",
  masteredCount: "定着したトピック",
  reviewCount: "復習待ち",
  weakTagCount: "苦手タグ",
  fieldMasteryAvg: "平均習熟度",
  recentAccuracy: "直近の正答率",
  examLevelClearedTopicCount: "過去問レベルをクリアしたトピック",
  highReadiness: "合格準備度",
};

/**
 * 必須バッジ規則の未達1項目を「テクノロジ系の完了したトピック 4 / 6」のように言い換える。
 * short=true は、条件文（conditionLabel）の直下に出すときの「いま 4 / 6」だけの形。
 */
export function formatBadgeGap(gap: BadgeGap, short = false): string {
  const subject = short
    ? "いま"
    : `${gap.field ? `${FIELD_LABELS[gap.field]}の` : ""}${GAP_SUBJECT[gap.metric]}`;
  if (short && gap.metric !== "highReadiness") {
    if (gap.metric === "recentAccuracy") return `いま ${pct(gap.current)}`;
    if (gap.metric === "fieldMasteryAvg") return `いま ${Math.round(gap.current)}`;
    if (gap.direction === "decrease") return `いま ${gap.current}件`;
    return `いま ${gap.current} / ${gap.target}`;
  }
  if (gap.metric === "highReadiness") return "合格準備度が高い判定になる";
  if (gap.metric === "recentAccuracy") return `${subject} いま ${pct(gap.current)}（${pct(gap.target)}以上で達成）`;
  if (gap.metric === "fieldMasteryAvg") return `${subject} いま ${Math.round(gap.current)}（${gap.target}以上で達成）`;
  if (gap.direction === "decrease") return `${subject} いま ${gap.current}件（${gap.target}件以下で達成）`;
  return `${subject} ${gap.current} / ${gap.target}`;
}

/** 1つのCPの詳細表示モデルを組み立てる。 */
export function buildCheckpointDetail(
  state: AppState,
  checkpointId: CheckpointId,
  signals?: BadgeSignals,
  now: Date = new Date(),
): CheckpointDetail {
  const checkpoint = getCheckpoint(checkpointId);
  const progress = getCheckpointProgress(state);
  const stage = getCheckpointStage(progress, checkpointId);
  const gate = buildCheckpointGate(state, checkpointId);
  const conditions = buildGateConditions(gate, measureCheckpoint(state, checkpointId), {
    setupDone: !!state.profile,
  });

  const statuses = buildBadgeStatuses(state, signals, checkpointId);
  const requiredBadges: RequiredBadgeRow[] = statuses
    .filter((s) => s.def.requiredForGate)
    .map((s) => {
      if (s.earned || s.conditionMet) {
        return { def: s.def, earned: s.earned, earnedAt: s.earnedAt, conditionMet: s.conditionMet, gaps: [] };
      }
      // 別ルートで達成できるバッジは、残りがいちばん少ないルートを見せる。
      const paths = getRequiredBadgeGaps(s.def.id, state, signals, now);
      const closest = [...paths].sort((a, b) => a.length - b.length)[0] ?? [];
      return {
        def: s.def,
        earned: false,
        conditionMet: false,
        // 条件が1つだけなら条件文の直下に「いま 0 / 4」だけ、複数なら項目名つきで並べる。
        gaps: closest.map((gap) => formatBadgeGap(gap, closest.length === 1)),
      };
    });

  const attempts = progress.finalExamAttempts.filter((a) => a.checkpointId === checkpointId);
  const passedAttempt = [...attempts].reverse().find((a) => a.passed);
  const previous = CHECKPOINTS.find((c) => c.order === checkpoint.order - 1) ?? null;

  return {
    checkpoint,
    stage,
    gate,
    conditions,
    remaining: conditions.filter((c) => !c.met).map((c) => c.todo),
    requiredBadges,
    extraEarnedCount: statuses.filter((s) => s.earned && !s.def.requiredForGate).length,
    currentCheckpoint: getCheckpoint(progress.currentCheckpointId),
    unlockAfter: previous,
    passedAttempt,
    attemptCount: attempts.length,
  };
}
