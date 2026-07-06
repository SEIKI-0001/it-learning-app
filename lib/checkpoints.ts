// チェックポイント定義とゲート／進行ロジック（純粋関数）。
//
// 方針:
//   - 既存 Phase 0〜6 を CP0〜CP6 として束ねる。進行は「必要バッジ → 最終問題解放 →
//     突破 → 次のCP」の順のみ。最終問題クリアによってのみ CP を進める。
//   - 既存ユーザーの移行時だけ、既存データから初期チェックポイントを推定してよい。
//   - 学習時間は進行の主条件にしない。

import type { AppState } from "@/types";
import type { PhaseProgress, StudyPhaseId } from "@/types/plan";
import type { TopicField } from "@/types/content";
import type {
  CheckpointDef,
  CheckpointGate,
  CheckpointId,
  CheckpointProgress,
  FinalExamAttempt,
  FinalExamState,
} from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { determineExpectedPhase } from "@/lib/studyPlanner";
import { grantExp } from "@/lib/game";
import { addTopicsToReview, recentAccuracy } from "@/lib/study";
import type { BadgeSignals } from "@/lib/badges";
import {
  evaluateBadgeAwards,
  getRequiredBadges,
  isBadgeConditionMet,
} from "@/lib/badges";

// ---------------------------------------------------------------------------
// チェックポイント定義（CP0〜CP6 = Phase0〜6）
// ---------------------------------------------------------------------------

export const CHECKPOINTS: CheckpointDef[] = [
  {
    id: "cp0",
    order: 0,
    phaseId: "phase0",
    emoji: "🧭",
    title: "初回設定",
    summary: "試験日・学習時間・苦手分野を設定して、旅の準備を整えます。",
    requiredBadgeCount: 0,
    requiredFieldCoverage: [],
    finalExam: null,
    winConditionLabel: "初回設定が完了していればクリアです。",
  },
  {
    id: "cp1",
    order: 1,
    phaseId: "phase1",
    emoji: "🗺️",
    title: "全体像把握",
    summary: "ITパスポート3分野の全体像をつかみます。",
    requiredBadgeCount: 3,
    requiredFieldCoverage: ["technology", "management", "strategy"],
    finalExam: { questionCount: 6, passThreshold: 4, weakRatio: 0 },
    winConditionLabel: "6問中4問以上の正解で突破です。",
  },
  {
    id: "cp2",
    order: 2,
    phaseId: "phase2",
    emoji: "📚",
    title: "基礎理解",
    summary: "主要トピックを図解と体験で理解します。",
    requiredBadgeCount: 4,
    requiredFieldCoverage: ["technology", "management", "strategy"],
    finalExam: { questionCount: 10, passThreshold: 7, weakRatio: 0 },
    winConditionLabel: "10問中7問以上の正解で突破です。",
  },
  {
    id: "cp3",
    order: 3,
    phaseId: "phase3",
    emoji: "✏️",
    title: "確認問題定着",
    summary: "各テーマの確認問題を安定して解ける状態にします。",
    requiredBadgeCount: 4,
    requiredFieldCoverage: ["technology", "management", "strategy"],
    recentAccuracyMin: 0.6,
    finalExam: { questionCount: 12, passThreshold: 8, weakRatio: 0.2 },
    winConditionLabel: "12問中8問以上の正解で突破です。",
  },
  {
    id: "cp4",
    order: 4,
    phaseId: "phase4",
    emoji: "🔁",
    title: "弱点克服",
    summary: "復習対象と苦手タグを減らして穴をふさぎます。",
    requiredBadgeCount: 3,
    requiredFieldCoverage: [],
    finalExam: { questionCount: 10, passThreshold: 7, weakRatio: 0.4 },
    winConditionLabel: "10問中7問以上の正解で突破です（苦手を多めに出題）。",
  },
  {
    id: "cp5",
    order: 5,
    phaseId: "phase5",
    emoji: "🎯",
    title: "過去問準備",
    summary: "過去問レベルに入れる状態を作ります。",
    requiredBadgeCount: 3,
    requiredFieldCoverage: ["technology", "management", "strategy"],
    recentAccuracyMin: 0.65,
    finalExam: { questionCount: 15, passThreshold: 11, weakRatio: 0.4 },
    winConditionLabel: "15問中11問以上の正解で突破です。",
  },
  {
    id: "cp6",
    order: 6,
    phaseId: "phase6",
    emoji: "🏁",
    title: "直前総仕上げ",
    summary: "頻出・誤答を総ざらいして本番に備えます。",
    requiredBadgeCount: 3,
    requiredFieldCoverage: [],
    finalExam: { questionCount: 20, passThreshold: 14, weakRatio: 0.5 },
    winConditionLabel: "20問中14問以上の正解で突破です。",
  },
];

const CP_BY_ID = new Map(CHECKPOINTS.map((c) => [c.id, c]));
const CP_ORDER: CheckpointId[] = CHECKPOINTS.map((c) => c.id);

export function getCheckpoint(id: CheckpointId): CheckpointDef {
  return CP_BY_ID.get(id) ?? CHECKPOINTS[0];
}

export function getCheckpointByPhase(phaseId: StudyPhaseId): CheckpointDef {
  return CHECKPOINTS.find((c) => c.phaseId === phaseId) ?? CHECKPOINTS[0];
}

export function phaseToCheckpointId(phaseId: StudyPhaseId): CheckpointId {
  return getCheckpointByPhase(phaseId).id;
}

export function getNextCheckpointId(id: CheckpointId): CheckpointId | null {
  const i = CP_ORDER.indexOf(id);
  return i >= 0 && i < CP_ORDER.length - 1 ? CP_ORDER[i + 1] : null;
}

/** UserProgress にチェックポイント進行が無ければ初期値を返す（安全な補完）。 */
export function getCheckpointProgress(state: AppState): CheckpointProgress {
  return state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
}

// ---------------------------------------------------------------------------
// 分野カバレッジ・正答率のヘルパー
// ---------------------------------------------------------------------------

function completedFieldSet(state: AppState): Set<TopicField> {
  const byId = new Map(getAllTopics().map((t) => [t.id, t]));
  const set = new Set<TopicField>();
  for (const id of state.progress.completedTopics) {
    const t = byId.get(id);
    if (t) set.add(t.field);
  }
  return set;
}

// 直近正答率は lib/study.ts の recentAccuracy に一本化（badges の条件判定と共通）。

// ---------------------------------------------------------------------------
// ゲート判定
// ---------------------------------------------------------------------------

/**
 * 最終問題が解放されているか。
 * 条件: 必要バッジ数を満たす AND 必須バッジをすべて獲得 AND 分野カバレッジ AND
 *       （指定があれば）直近正答率。
 */
export function isFinalExamUnlocked(
  state: AppState,
  checkpointId: CheckpointId,
): boolean {
  return buildCheckpointGate(state, checkpointId).finalExamUnlocked;
}

/**
 * 次のチェックポイントへ進めるか。
 * 条件: 最終問題が解放済み AND 最終問題の最新結果が合格 AND クリア済みに未登録。
 */
export function canAdvanceCheckpoint(
  state: AppState,
  checkpointId: CheckpointId,
): boolean {
  return buildCheckpointGate(state, checkpointId).canAdvance;
}

/** ゲート状況から最終問題の状態を1つに正規化する（表示の語彙統一に使う）。 */
export function finalExamState(gate: CheckpointGate): FinalExamState {
  if (gate.finalExamPassed) return "passed";
  if (gate.finalExamUnlocked) return "unlocked";
  return "locked";
}

/** 最終問題の最新結果（同一CPの最後の試行）。 */
export function latestFinalAttempt(
  progress: CheckpointProgress,
  checkpointId: CheckpointId,
): FinalExamAttempt | undefined {
  return [...progress.finalExamAttempts]
    .reverse()
    .find((a) => a.checkpointId === checkpointId);
}

/**
 * チェックポイントのゲート状況を組み立てる（UI・判定共用）。
 * ゲートは「獲得済みバッジ（earnedBadges）」で判定する。単語帳・過去問レベルなどの
 * シグナル依存バッジは applyBadgeProgress（useBadgeSync）で先に確定付与されるため、
 * ここではシグナルを受け取らない。
 */
export function buildCheckpointGate(
  state: AppState,
  checkpointId: CheckpointId,
): CheckpointGate {
  const checkpoint = getCheckpoint(checkpointId);
  const cp = getCheckpointProgress(state);
  const earnedIds = new Set(cp.earnedBadges.map((e) => e.badgeId));

  const required = getRequiredBadges(checkpointId);
  const missingBadges = required.filter((b) => !earnedIds.has(b.id));
  const earnedRequiredCount = required.length - missingBadges.length;

  const fields = completedFieldSet(state);
  const fieldCoverageMet = checkpoint.requiredFieldCoverage.every((f) =>
    fields.has(f),
  );
  const accuracyMet =
    checkpoint.recentAccuracyMin === undefined
      ? true
      : recentAccuracy(state.answers) >= checkpoint.recentAccuracyMin;

  const hasFinal = checkpoint.finalExam !== null;
  const finalExamUnlocked =
    hasFinal &&
    missingBadges.length === 0 &&
    earnedRequiredCount >= checkpoint.requiredBadgeCount &&
    fieldCoverageMet &&
    accuracyMet;

  const latest = latestFinalAttempt(cp, checkpointId);
  const finalExamPassed = !!latest?.passed;

  const canAdvance =
    finalExamUnlocked &&
    finalExamPassed &&
    !cp.clearedCheckpointIds.includes(checkpointId);

  return {
    checkpoint,
    earnedRequiredCount,
    totalRequiredCount: required.length,
    requiredBadgeCount: checkpoint.requiredBadgeCount,
    missingBadges,
    fieldCoverageMet,
    accuracyMet,
    finalExamUnlocked,
    finalExamPassed,
    canAdvance,
  };
}

// ---------------------------------------------------------------------------
// ロードマップ表示用（RoadmapMap を CP 進行で駆動する）
// ---------------------------------------------------------------------------

/**
 * ロードマップ表示（RoadmapMap）を CP 進行から組み立てる。
 * フェーズ完了率ではなく「クリア済みCP・現在CP・必須バッジ充足」を唯一の真実とし、
 * CheckpointGateCard と現在地・進捗が一致するようにする（表示の二重管理を解消）。
 * CP↔Phase は 1:1 なので、既存の PhaseProgress[] 形状で返し RoadmapMap を無改造で使う。
 */
export function buildCheckpointRoadmap(state: AppState): PhaseProgress[] {
  const cp = getCheckpointProgress(state);
  const currentOrder = getCheckpoint(cp.currentCheckpointId).order;

  return CHECKPOINTS.map((c): PhaseProgress => {
    const status: PhaseProgress["status"] =
      c.order < currentOrder
        ? "done"
        : c.order === currentOrder
          ? "current"
          : "upcoming";

    if (status !== "current") {
      return {
        id: c.phaseId,
        status,
        progress: status === "done" ? 100 : 0,
        hint: "",
      };
    }

    // 現在CP: 必須バッジの充足度を達成度に、次の一手を hint にする。
    const gate = buildCheckpointGate(state, c.id);
    const progress =
      c.requiredBadgeCount > 0
        ? Math.round(
            (gate.earnedRequiredCount / c.requiredBadgeCount) * 100,
          )
        : gate.finalExamUnlocked || !c.finalExam
          ? 100
          : 0;
    const remaining = c.requiredBadgeCount - gate.earnedRequiredCount;
    const hint = gate.finalExamPassed
      ? "突破済み。次のチェックポイントへ進みましょう。"
      : gate.finalExamUnlocked
        ? "最終問題に挑戦できます。"
        : remaining > 0
          ? `必須バッジをあと${remaining}個集めると最終問題が解放されます。`
          : "3分野に手をつけると最終問題が解放されます。";

    return { id: c.phaseId, status, progress, hint };
  });
}

// ---------------------------------------------------------------------------
// 期待CP（予定に対する現在地の比較）
// ---------------------------------------------------------------------------

export type CheckpointComparison = {
  /** 学習開始日〜試験日の経過割合から見た「予定ではこのあたり」のCP。 */
  expectedId: CheckpointId;
  /** 実際の現在CP。 */
  currentId: CheckpointId;
  /** 現在 - 期待（負=遅れ / 0=予定どおり / 正=先行）。 */
  delta: number;
  /** 前向きな一言（ユーザーを責めない）。 */
  message: string;
};

/**
 * 予定（時間軸）と現在地（CP進行）を比較する。
 * 期待位置は studyPlanner.determineExpectedPhase（経過割合→フェーズ）を
 * CP に読み替えて使う。試験日・学習開始日が未設定なら null（比較を出さない）。
 */
export function buildCheckpointComparison(
  state: AppState,
  now: Date = new Date(),
): CheckpointComparison | null {
  const expectedPhase = determineExpectedPhase(state.profile, now);
  if (!expectedPhase) return null;

  const expected = getCheckpointByPhase(expectedPhase);
  const current = getCheckpoint(getCheckpointProgress(state).currentCheckpointId);
  const delta = current.order - expected.order;

  let message: string;
  if (delta <= -2) {
    message = `予定では「${expected.title}」のあたりです。今週のゴールを1つずつ進めて追いつきましょう。`;
  } else if (delta === -1) {
    message = "予定より少しだけ後ろにいます。数日で追いつける範囲です。";
  } else if (delta === 0) {
    message = "ほぼ予定どおりのペースです。この調子で進めましょう。";
  } else {
    message = "予定より先へ進んでいます。この調子で！";
  }

  return { expectedId: expected.id, currentId: current.id, delta, message };
}

// ---------------------------------------------------------------------------
// バッジ確定付与を AppState に適用する
// ---------------------------------------------------------------------------

/**
 * 条件を満たしたバッジを確定付与し、XP を加算した新しい AppState を返す。
 * チェックポイントの前進はここでは行わない（最終問題クリアのみ）。
 * 変化がなければ元の state をそのまま返す（不要な再描画・保存を避ける）。
 */
export function applyBadgeProgress(
  state: AppState,
  signals?: BadgeSignals,
  now: Date = new Date(),
): { state: AppState; newlyEarnedIds: string[] } {
  const cpProgress = getCheckpointProgress(state);
  const result = evaluateBadgeAwards(
    { ...state, progress: { ...state.progress, checkpointProgress: cpProgress } },
    signals,
    now,
  );
  if (result.newlyEarned.length === 0 && state.progress.checkpointProgress) {
    return { state, newlyEarnedIds: [] };
  }
  const { exp, level } = grantExp(state.progress.exp, result.gainedXp);
  const nextState: AppState = {
    ...state,
    progress: {
      ...state.progress,
      exp,
      level,
      checkpointProgress: {
        ...cpProgress,
        earnedBadges: result.earnedBadges,
      },
    },
  };
  return {
    state: nextState,
    newlyEarnedIds: result.newlyEarned.map((b) => b.id),
  };
}

// ---------------------------------------------------------------------------
// 最終問題の結果を記録し、合格ならチェックポイントを前進させる
// ---------------------------------------------------------------------------

/**
 * 最終問題1回ぶんの結果を記録する。
 * - 合格: そのCPを clearedCheckpointIds に追加し、currentCheckpointId を次へ進める。
 *   さらに final バッジなどの確定付与を反映する。
 * - 不合格: 間違えたトピックを復習キューへ追加する（ユーザーを責めない導線）。
 */
export function recordFinalExamAttempt(
  state: AppState,
  attempt: FinalExamAttempt,
  signals?: BadgeSignals,
  now: Date = new Date(),
): AppState {
  const cp = getCheckpointProgress(state);
  const finalExamAttempts = [...cp.finalExamAttempts, attempt];

  let currentCheckpointId = cp.currentCheckpointId;
  let clearedCheckpointIds = cp.clearedCheckpointIds;

  if (attempt.passed) {
    if (!clearedCheckpointIds.includes(attempt.checkpointId)) {
      clearedCheckpointIds = [...clearedCheckpointIds, attempt.checkpointId];
    }
    const next = getNextCheckpointId(attempt.checkpointId);
    // 現在地がクリアしたCP以下なら次へ進める（先に進んでいる場合は動かさない）。
    if (
      next &&
      CP_ORDER.indexOf(currentCheckpointId) <=
        CP_ORDER.indexOf(attempt.checkpointId)
    ) {
      currentCheckpointId = next;
    }
  }

  // 復習キュー: 不合格時のみ、間違えたトピックを追加（dedup は addTopicsToReview に集約）。
  const base =
    !attempt.passed && attempt.wrongTopicIds.length > 0
      ? addTopicsToReview(state, attempt.wrongTopicIds, "最終問題で間違えた", now)
      : state;

  const withAttempt: AppState = {
    ...base,
    progress: {
      ...base.progress,
      checkpointProgress: {
        ...cp,
        currentCheckpointId,
        clearedCheckpointIds,
        finalExamAttempts,
      },
    },
  };

  // final バッジ・全体制覇バッジなどを確定付与する。
  return applyBadgeProgress(withAttempt, signals, now).state;
}

// ---------------------------------------------------------------------------
// 既存ユーザーの移行推定（初回のみ・normalizeAppState から呼ぶ）
// ---------------------------------------------------------------------------

/** そのチェックポイントの必須バッジ条件が「いま」すべて満たされているか。 */
function requiredConditionsMet(
  state: AppState,
  checkpointId: CheckpointId,
): boolean {
  const required = getRequiredBadges(checkpointId);
  if (required.length === 0) return true;
  return required.every((b) => isBadgeConditionMet(b.id, state));
}

/**
 * 既存の学習データから初期チェックポイント進行を推定する。
 * - profile が無ければ cp0 のまま。
 * - cp1 から順に、必須バッジ条件を満たしている CP を「クリア済み」とみなし、
 *   最初に満たさない CP を現在地にする（cp6 まで満たすなら現在地は cp6）。
 * - 現時点で条件を満たすバッジは確定付与しておく（最終問題の証だけは付かない）。
 * 進行そのものは最終問題クリアで進める前提を崩さないよう、cp6 はクリア扱いにしない。
 */
export function migrateCheckpointProgress(state: AppState): CheckpointProgress {
  const base: CheckpointProgress = { ...INITIAL_CHECKPOINT_PROGRESS };
  if (!state.profile) return base;

  base.currentCheckpointId = "cp1";
  const cleared: CheckpointId[] = [];
  const targets: CheckpointId[] = ["cp1", "cp2", "cp3", "cp4", "cp5", "cp6"];

  for (const cp of targets) {
    if (requiredConditionsMet(state, cp)) {
      if (cp === "cp6") {
        base.currentCheckpointId = "cp6";
        break;
      }
      cleared.push(cp);
      base.currentCheckpointId = getNextCheckpointId(cp) ?? cp;
    } else {
      base.currentCheckpointId = cp;
      break;
    }
  }
  base.clearedCheckpointIds = cleared;

  // 現時点で満たしているバッジを確定付与する（final 系は最終問題未実施なので付かない）。
  const seeded: AppState = {
    ...state,
    progress: { ...state.progress, checkpointProgress: base },
  };
  const awarded = evaluateBadgeAwards(seeded);
  base.earnedBadges = awarded.earnedBadges;
  return base;
}

/** バッジ・チェックポイント関連のまとめ再エクスポート（UI からの import 簡略化）。 */
export {
  getBadgesForCheckpoint,
  getRequiredBadges,
} from "@/lib/badges";
