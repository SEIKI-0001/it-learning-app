// バッジ定義と獲得判定（純粋関数）。
//
// 方針:
//   - バッジ定義は静的データ。獲得条件（conditionLabel）は常に表示し、隠さない。
//   - 必須バッジ（requiredForGate=true）は「条件達成で必ず・確定で」獲得できる。
//     ランダム要素は一切入れない（ランダムは lib/badgeDrops.ts の追加報酬だけ）。
//   - 判定はまず既存データ（completedTopics / topicMastery / answers / reviewQueue /
//     weakTags）から行う。既存データだけで判定できないもの（単語帳・過去問レベル）は
//     外部シグナルを受け取り、無ければ「未達（0）」として安全に倒す（TODO で明示）。

import type { AppState, UserProgress } from "@/types";
import type {
  BadgeDef,
  BadgeStatus,
  CheckpointId,
  EarnedBadge,
} from "@/types/checkpoint";
import type { TopicField } from "@/types/content";
import { getAllTopics } from "@/lib/content";
import { fieldMastery, recentAccuracy } from "@/lib/study";
import { computeProgressSummary } from "@/lib/progressSummary";

// 習熟度のしきい値。confirm quiz で 3/4 正解 → mastery=75 になる前提で調整。
const QUIZ_CLEARED = 60; // 確認問題を「解ける」水準（過半）
const MASTERED = 75; // しっかり定着した水準

// ---------------------------------------------------------------------------
// バッジ定義（チェックポイント別）
// ---------------------------------------------------------------------------

/**
 * すべてのバッジ定義。requiredForGate=true のものが、その CP の最終問題解放に必要。
 * final カテゴリのバッジは「最終問題突破の証」で、最終問題クリア時に確定付与される。
 */
export const BADGES: BadgeDef[] = [
  // ---- CP1 全体像把握 ------------------------------------------------------
  {
    id: "b-cp1-touch-tech",
    label: "テクノロジ探訪",
    description: "テクノロジ系のトピックに触れた証。",
    category: "field",
    rarity: "common",
    checkpointId: "cp1",
    requiredForGate: true,
    conditionLabel: "テクノロジ系トピックを1つ完了する",
    field: "technology",
    xp: 15,
    emoji: "💻",
  },
  {
    id: "b-cp1-touch-mgmt",
    label: "マネジメント探訪",
    description: "マネジメント系のトピックに触れた証。",
    category: "field",
    rarity: "common",
    checkpointId: "cp1",
    requiredForGate: true,
    conditionLabel: "マネジメント系トピックを1つ完了する",
    field: "management",
    xp: 15,
    emoji: "📋",
  },
  {
    id: "b-cp1-touch-strat",
    label: "ストラテジ探訪",
    description: "ストラテジ系のトピックに触れた証。",
    category: "field",
    rarity: "common",
    checkpointId: "cp1",
    requiredForGate: true,
    conditionLabel: "ストラテジ系トピックを1つ完了する",
    field: "strategy",
    xp: 15,
    emoji: "📈",
  },
  {
    id: "b-cp1-final",
    label: "全体像マスター",
    description: "CP1の最終問題を突破した証。",
    category: "final",
    rarity: "rare",
    checkpointId: "cp1",
    requiredForGate: false,
    conditionLabel: "CP1の最終問題に合格する",
    xp: 40,
    emoji: "🗺️",
  },

  // ---- CP2 基礎理解 --------------------------------------------------------
  {
    id: "b-cp2-basics-tech",
    label: "テクノロジ基礎",
    description: "テクノロジ系の主要テーマを一通り理解した証。",
    category: "field",
    rarity: "common",
    checkpointId: "cp2",
    requiredForGate: true,
    conditionLabel: "テクノロジ系トピックを6つ完了する",
    field: "technology",
    xp: 20,
    emoji: "🔧",
  },
  {
    id: "b-cp2-basics-mgmt",
    label: "マネジメント基礎",
    description: "マネジメント系の主要テーマを理解した証。",
    category: "field",
    rarity: "common",
    checkpointId: "cp2",
    requiredForGate: true,
    conditionLabel: "マネジメント系トピックを3つ完了する",
    field: "management",
    xp: 20,
    emoji: "🗂️",
  },
  {
    id: "b-cp2-basics-strat",
    label: "ストラテジ基礎",
    description: "ストラテジ系の主要テーマを理解した証。",
    category: "field",
    rarity: "common",
    checkpointId: "cp2",
    requiredForGate: true,
    conditionLabel: "ストラテジ系トピックを4つ完了する",
    field: "strategy",
    xp: 20,
    emoji: "📊",
  },
  {
    id: "b-cp2-topics-15",
    label: "15テーマ踏破",
    description: "15トピックを完了した積み上げの証。",
    category: "topic",
    rarity: "common",
    checkpointId: "cp2",
    requiredForGate: true,
    conditionLabel: "トピックを合計15個完了する",
    xp: 20,
    emoji: "📚",
  },
  {
    id: "b-cp2-topics-25",
    label: "25テーマ踏破",
    description: "25トピック完了。基礎の幅が広がった証（任意）。",
    category: "collection",
    rarity: "rare",
    checkpointId: "cp2",
    requiredForGate: false,
    conditionLabel: "トピックを合計25個完了する",
    xp: 25,
    emoji: "🏔️",
  },
  {
    id: "b-cp2-final",
    label: "基礎理解マスター",
    description: "CP2の最終問題を突破した証。",
    category: "final",
    rarity: "rare",
    checkpointId: "cp2",
    requiredForGate: false,
    conditionLabel: "CP2の最終問題に合格する",
    xp: 50,
    emoji: "📗",
  },

  // ---- CP3 確認問題定着 ----------------------------------------------------
  {
    id: "b-cp3-quiz-tech",
    label: "テクノロジ演習家",
    description: "テクノロジ系の確認問題を安定して解ける証。",
    category: "topic",
    rarity: "common",
    checkpointId: "cp3",
    requiredForGate: true,
    conditionLabel: "テクノロジ系の確認問題を8トピックでクリア",
    field: "technology",
    xp: 25,
    emoji: "✏️",
  },
  {
    id: "b-cp3-quiz-mgmt",
    label: "マネジメント演習家",
    description: "マネジメント系の確認問題を安定して解ける証。",
    category: "topic",
    rarity: "common",
    checkpointId: "cp3",
    requiredForGate: true,
    conditionLabel: "マネジメント系の確認問題を4トピックでクリア",
    field: "management",
    xp: 25,
    emoji: "🖊️",
  },
  {
    id: "b-cp3-quiz-strat",
    label: "ストラテジ演習家",
    description: "ストラテジ系の確認問題を安定して解ける証。",
    category: "topic",
    rarity: "common",
    checkpointId: "cp3",
    requiredForGate: true,
    conditionLabel: "ストラテジ系の確認問題を5トピックでクリア",
    field: "strategy",
    xp: 25,
    emoji: "🖋️",
  },
  {
    id: "b-cp3-quiz-20",
    label: "確認問題20突破",
    description: "20トピックの確認問題をクリアした証。",
    category: "topic",
    rarity: "common",
    checkpointId: "cp3",
    requiredForGate: true,
    conditionLabel: "確認問題を20トピックでクリア（過半正解）",
    xp: 25,
    emoji: "🎯",
  },
  {
    id: "b-cp3-perfect-5",
    label: "満点コレクター",
    description: "確認問題で満点を5トピック取った証（任意）。",
    category: "collection",
    rarity: "rare",
    checkpointId: "cp3",
    requiredForGate: false,
    conditionLabel: "確認問題を満点クリアしたトピックを5つ作る",
    xp: 30,
    emoji: "💯",
  },
  {
    id: "b-cp3-final",
    label: "定着マスター",
    description: "CP3の最終問題を突破した証。",
    category: "final",
    rarity: "epic",
    checkpointId: "cp3",
    requiredForGate: false,
    conditionLabel: "CP3の最終問題に合格する",
    xp: 60,
    emoji: "✅",
  },

  // ---- CP4 弱点克服 --------------------------------------------------------
  {
    id: "b-cp4-review-light",
    label: "復習お掃除",
    description: "復習対象をしっかり減らした証。",
    category: "revenge",
    rarity: "common",
    checkpointId: "cp4",
    requiredForGate: true,
    conditionLabel: "10トピック以上学んだ上で、復習対象を3件以下にする",
    xp: 25,
    emoji: "🧹",
  },
  {
    id: "b-cp4-weak-reduce",
    label: "弱点圧縮",
    description: "苦手タグを絞り込んだ証。",
    category: "revenge",
    rarity: "common",
    checkpointId: "cp4",
    requiredForGate: true,
    conditionLabel: "10トピック以上学んだ上で、苦手タグを2件以下にする",
    xp: 25,
    emoji: "🩹",
  },
  {
    id: "b-cp4-mastered-30",
    label: "定着30テーマ",
    description: "30トピックをしっかり定着させた証。",
    category: "topic",
    rarity: "common",
    checkpointId: "cp4",
    requiredForGate: true,
    conditionLabel: "習熟度75%以上のトピックを30個にする",
    xp: 30,
    emoji: "🛡️",
  },
  {
    id: "b-cp4-revenge-zero",
    label: "復習ゼロ達成",
    description: "復習対象をゼロにした証（任意）。",
    category: "revenge",
    rarity: "rare",
    checkpointId: "cp4",
    requiredForGate: false,
    conditionLabel: "10トピック以上学んだ上で、復習対象を0件にする",
    xp: 35,
    emoji: "🌟",
  },
  {
    id: "b-cp4-final",
    label: "弱点克服マスター",
    description: "CP4の最終問題を突破した証。",
    category: "final",
    rarity: "epic",
    checkpointId: "cp4",
    requiredForGate: false,
    conditionLabel: "CP4の最終問題に合格する",
    xp: 60,
    emoji: "🔁",
  },

  // ---- CP5 過去問準備 ------------------------------------------------------
  {
    id: "b-cp5-mastered-45",
    label: "定着45テーマ",
    description: "45トピックを定着させた証。",
    category: "topic",
    rarity: "common",
    checkpointId: "cp5",
    requiredForGate: true,
    conditionLabel: "習熟度75%以上のトピックを45個にする",
    xp: 35,
    emoji: "⚙️",
  },
  {
    id: "b-cp5-fields-solid",
    label: "3分野バランス",
    description: "3分野すべてを安定水準まで固めた証。",
    category: "field",
    rarity: "rare",
    checkpointId: "cp5",
    requiredForGate: true,
    conditionLabel: "3分野すべてで平均習熟度60%以上にする",
    xp: 35,
    emoji: "🌈",
  },
  {
    id: "b-cp5-kakomon-ready",
    label: "過去問レディ",
    description: "過去問レベルに挑戦できる状態になった証。",
    category: "kakomon",
    rarity: "rare",
    checkpointId: "cp5",
    requiredForGate: true,
    // TODO: question_attempts（過去問レベル）を集計して examLevelCleared で厳密判定する。
    //       現状は確認問題の正答率と学習量の代理指標＋シグナルで判定する。
    conditionLabel:
      "過去問レベル問題を8トピックでクリア（または40テーマ習得＋直近正答率70%）",
    xp: 35,
    emoji: "🎲",
  },
  {
    id: "b-cp5-word-50",
    label: "英略語ハーフ",
    description: "英略語を50語マスターした証（任意）。",
    category: "word",
    rarity: "rare",
    checkpointId: "cp5",
    requiredForGate: false,
    conditionLabel: "英略語・単語帳を50語マスターする",
    xp: 30,
    emoji: "📇",
  },
  {
    id: "b-cp5-final",
    label: "過去問準備マスター",
    description: "CP5の最終問題を突破した証。",
    category: "final",
    rarity: "epic",
    checkpointId: "cp5",
    requiredForGate: false,
    conditionLabel: "CP5の最終問題に合格する",
    xp: 70,
    emoji: "🎯",
  },

  // ---- CP6 直前総仕上げ ----------------------------------------------------
  {
    id: "b-cp6-mastered-60",
    label: "定着60テーマ",
    description: "60トピックを定着させた総仕上げの証。",
    category: "topic",
    rarity: "rare",
    checkpointId: "cp6",
    requiredForGate: true,
    conditionLabel: "習熟度75%以上のトピックを60個にする",
    xp: 40,
    emoji: "🏗️",
  },
  {
    id: "b-cp6-review-clean",
    label: "総ざらい完了",
    description: "直前期に復習対象をほぼ解消した証。",
    category: "revenge",
    rarity: "rare",
    checkpointId: "cp6",
    requiredForGate: true,
    conditionLabel: "30トピック以上学んだ上で、復習対象を2件以下にする",
    xp: 40,
    emoji: "🧽",
  },
  {
    id: "b-cp6-high-readiness",
    label: "合格圏突入",
    description: "合格準備度が高水準に達した証。",
    category: "collection",
    rarity: "epic",
    checkpointId: "cp6",
    requiredForGate: true,
    conditionLabel: "合格準備度（到達度）を80%以上にする",
    xp: 45,
    emoji: "🚀",
  },
  {
    id: "b-cp6-word-100",
    label: "英略語コンプ",
    description: "英略語を100語マスターした証（任意）。",
    category: "word",
    rarity: "epic",
    checkpointId: "cp6",
    requiredForGate: false,
    conditionLabel: "英略語・単語帳を100語マスターする",
    xp: 45,
    emoji: "📖",
  },
  {
    id: "b-cp6-perfect-20",
    label: "満点マイスター",
    description: "満点トピックを20個作った証（任意）。",
    category: "collection",
    rarity: "epic",
    checkpointId: "cp6",
    requiredForGate: false,
    conditionLabel: "確認問題を満点クリアしたトピックを20個作る",
    xp: 45,
    emoji: "👑",
  },
  {
    id: "b-cp6-final",
    label: "総仕上げマスター",
    description: "CP6の最終問題を突破した、合格への最終関門クリアの証。",
    category: "final",
    rarity: "epic",
    checkpointId: "cp6",
    requiredForGate: false,
    conditionLabel: "CP6の最終問題に合格する",
    xp: 80,
    emoji: "🏁",
  },

  // ---- 全体コレクション ----------------------------------------------------
  {
    id: "b-all-clear",
    label: "ロードマップ制覇",
    description: "すべてのチェックポイントを突破した証。",
    category: "collection",
    rarity: "epic",
    checkpointId: "cp6",
    requiredForGate: false,
    conditionLabel: "CP1〜CP6の最終問題をすべて突破する",
    xp: 100,
    emoji: "🎓",
  },
];

const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export function getBadge(id: string): BadgeDef | undefined {
  return BADGE_BY_ID.get(id);
}

export function getBadgesForCheckpoint(cp: CheckpointId): BadgeDef[] {
  return BADGES.filter((b) => b.checkpointId === cp);
}

export function getRequiredBadges(cp: CheckpointId): BadgeDef[] {
  return BADGES.filter((b) => b.checkpointId === cp && b.requiredForGate);
}

// ---------------------------------------------------------------------------
// 判定に使う指標（AppState + 任意シグナルから一度だけ計算する）
// ---------------------------------------------------------------------------

/** 既存データだけで判定できない条件のための追加シグナル。 */
export type BadgeSignals = {
  /** 英略語・単語帳のマスター語数（lib/wordlistProgress から供給）。 */
  wordMasteredCount?: number;
  /** 過去問レベル問題をクリアしたトピック数（将来 question_attempts から供給）。 */
  examLevelClearedTopicCount?: number;
  /**
   * 統合進捗の合格準備度 readinessScore（0〜100）。サーバー値が取得できたときのみ供給。
   * 未供給ならローカル推定（progressSummary.readinessPct）で判定を継続する。
   */
  readinessScore?: number;
};

type BadgeMetrics = {
  completedTotal: number;
  completedByField: Record<TopicField, number>;
  quizClearedTotal: number;
  quizClearedByField: Record<TopicField, number>;
  masteredCount: number; // mastery>=MASTERED
  perfectCount: number; // mastery>=100
  reviewCount: number;
  weakTagCount: number;
  fieldMasteryAvg: Record<TopicField, number>;
  recentAccuracy: number; // 直近20問の正答率（回答不足なら0）
  readinessPct: number;
  wordMasteredCount: number;
  examLevelClearedTopicCount: number;
  finalPassedCheckpointIds: Set<CheckpointId>;
  clearedCheckpointIds: Set<CheckpointId>;
};

const FIELDS: TopicField[] = ["technology", "management", "strategy"];

function computeMetrics(state: AppState, signals?: BadgeSignals): BadgeMetrics {
  const topics = getAllTopics();
  const progress = state.progress;
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const completedByField: Record<TopicField, number> = {
    technology: 0,
    management: 0,
    strategy: 0,
  };
  for (const id of progress.completedTopics) {
    const t = topicById.get(id);
    if (t) completedByField[t.field] += 1;
  }

  const quizClearedByField: Record<TopicField, number> = {
    technology: 0,
    management: 0,
    strategy: 0,
  };
  let quizClearedTotal = 0;
  let masteredCount = 0;
  let perfectCount = 0;
  for (const [id, m] of Object.entries(progress.topicMastery ?? {})) {
    const t = topicById.get(id);
    if (m >= QUIZ_CLEARED) {
      quizClearedTotal += 1;
      if (t) quizClearedByField[t.field] += 1;
    }
    if (m >= MASTERED) masteredCount += 1;
    if (m >= 100) perfectCount += 1;
  }

  const summary = computeProgressSummary(topics, progress);
  const cp = progress.checkpointProgress;

  return {
    completedTotal: progress.completedTopics.length,
    completedByField,
    quizClearedTotal,
    quizClearedByField,
    masteredCount,
    perfectCount,
    reviewCount: (progress.reviewQueue ?? []).length,
    weakTagCount: (progress.weakTags ?? []).length,
    fieldMasteryAvg: fieldMastery(progress, topics),
    recentAccuracy: recentAccuracy(state.answers),
    // 合格準備度: サーバーの統合進捗(readinessScore)を優先し、無ければローカル推定。
    readinessPct: signals?.readinessScore ?? summary.readinessPct,
    wordMasteredCount: signals?.wordMasteredCount ?? 0,
    examLevelClearedTopicCount: signals?.examLevelClearedTopicCount ?? 0,
    finalPassedCheckpointIds: new Set(
      (cp?.finalExamAttempts ?? [])
        .filter((a) => a.passed)
        .map((a) => a.checkpointId),
    ),
    clearedCheckpointIds: new Set(cp?.clearedCheckpointIds ?? []),
  };
}

// ---------------------------------------------------------------------------
// バッジごとの条件（id → 判定関数）。定義とロジックを分離しておく。
// ---------------------------------------------------------------------------

const BADGE_CONDITIONS: Record<string, (m: BadgeMetrics) => boolean> = {
  // CP1
  "b-cp1-touch-tech": (m) => m.completedByField.technology >= 1,
  "b-cp1-touch-mgmt": (m) => m.completedByField.management >= 1,
  "b-cp1-touch-strat": (m) => m.completedByField.strategy >= 1,
  "b-cp1-final": (m) => m.finalPassedCheckpointIds.has("cp1"),
  // CP2
  "b-cp2-basics-tech": (m) => m.completedByField.technology >= 6,
  "b-cp2-basics-mgmt": (m) => m.completedByField.management >= 3,
  "b-cp2-basics-strat": (m) => m.completedByField.strategy >= 4,
  "b-cp2-topics-15": (m) => m.completedTotal >= 15,
  "b-cp2-topics-25": (m) => m.completedTotal >= 25,
  "b-cp2-final": (m) => m.finalPassedCheckpointIds.has("cp2"),
  // CP3
  "b-cp3-quiz-tech": (m) => m.quizClearedByField.technology >= 8,
  "b-cp3-quiz-mgmt": (m) => m.quizClearedByField.management >= 4,
  "b-cp3-quiz-strat": (m) => m.quizClearedByField.strategy >= 5,
  "b-cp3-quiz-20": (m) => m.quizClearedTotal >= 20,
  "b-cp3-perfect-5": (m) => m.perfectCount >= 5,
  "b-cp3-final": (m) => m.finalPassedCheckpointIds.has("cp3"),
  // CP4
  "b-cp4-review-light": (m) => m.completedTotal >= 10 && m.reviewCount <= 3,
  "b-cp4-weak-reduce": (m) => m.completedTotal >= 10 && m.weakTagCount <= 2,
  "b-cp4-mastered-30": (m) => m.masteredCount >= 30,
  "b-cp4-revenge-zero": (m) => m.completedTotal >= 10 && m.reviewCount === 0,
  "b-cp4-final": (m) => m.finalPassedCheckpointIds.has("cp4"),
  // CP5
  "b-cp5-mastered-45": (m) => m.masteredCount >= 45,
  "b-cp5-fields-solid": (m) => FIELDS.every((f) => m.fieldMasteryAvg[f] >= 60),
  "b-cp5-kakomon-ready": (m) =>
    m.examLevelClearedTopicCount >= 8 ||
    (m.completedTotal >= 40 && m.recentAccuracy >= 0.7),
  "b-cp5-word-50": (m) => m.wordMasteredCount >= 50,
  "b-cp5-final": (m) => m.finalPassedCheckpointIds.has("cp5"),
  // CP6
  "b-cp6-mastered-60": (m) => m.masteredCount >= 60,
  "b-cp6-review-clean": (m) => m.completedTotal >= 30 && m.reviewCount <= 2,
  "b-cp6-high-readiness": (m) => m.readinessPct >= 80,
  "b-cp6-word-100": (m) => m.wordMasteredCount >= 100,
  "b-cp6-perfect-20": (m) => m.perfectCount >= 20,
  "b-cp6-final": (m) => m.finalPassedCheckpointIds.has("cp6"),
  // 全体
  "b-all-clear": (m) =>
    (["cp1", "cp2", "cp3", "cp4", "cp5", "cp6"] as CheckpointId[]).every((id) =>
      m.clearedCheckpointIds.has(id),
    ),
};

/** そのバッジの条件を満たしているか。 */
export function isBadgeConditionMet(
  badgeId: string,
  state: AppState,
  signals?: BadgeSignals,
): boolean {
  const cond = BADGE_CONDITIONS[badgeId];
  if (!cond) return false;
  return cond(computeMetrics(state, signals));
}

// ---------------------------------------------------------------------------
// バッジ獲得判定（確定付与）
// ---------------------------------------------------------------------------

export type BadgeAwardResult = {
  earnedBadges: EarnedBadge[]; // 更新後の全獲得バッジ
  newlyEarned: BadgeDef[]; // 今回新たに獲得したバッジ
  gainedXp: number; // 加算する XP 合計
};

/**
 * 条件を満たしたバッジを確定で付与する（既獲得は重複付与しない）。
 * ランダム要素なし。必須・任意・最終いずれも「条件達成＝確定獲得」。
 */
export function evaluateBadgeAwards(
  state: AppState,
  signals?: BadgeSignals,
  now: Date = new Date(),
): BadgeAwardResult {
  const cp = state.progress.checkpointProgress;
  const already = new Set((cp?.earnedBadges ?? []).map((e) => e.badgeId));
  const metrics = computeMetrics(state, signals);

  const newlyEarned: BadgeDef[] = [];
  const added: EarnedBadge[] = [];
  let gainedXp = 0;

  for (const def of BADGES) {
    if (already.has(def.id)) continue;
    const cond = BADGE_CONDITIONS[def.id];
    if (cond && cond(metrics)) {
      newlyEarned.push(def);
      added.push({ badgeId: def.id, earnedAt: now.toISOString(), fromDrop: false });
      gainedXp += def.xp;
    }
  }

  return {
    earnedBadges: [...(cp?.earnedBadges ?? []), ...added],
    newlyEarned,
    gainedXp,
  };
}

/** UI 表示用に、全バッジ（または CP 指定）の獲得状況を組み立てる。 */
export function buildBadgeStatuses(
  state: AppState,
  signals?: BadgeSignals,
  checkpointId?: CheckpointId,
): BadgeStatus[] {
  const metrics = computeMetrics(state, signals);
  const earnedMap = new Map(
    (state.progress.checkpointProgress?.earnedBadges ?? []).map((e) => [
      e.badgeId,
      e,
    ]),
  );
  const defs = checkpointId
    ? getBadgesForCheckpoint(checkpointId)
    : BADGES;
  return defs.map((def) => {
    const earned = earnedMap.get(def.id);
    const cond = BADGE_CONDITIONS[def.id];
    return {
      def,
      earned: !!earned,
      conditionMet: cond ? cond(metrics) : false,
      earnedAt: earned?.earnedAt,
      fromDrop: earned?.fromDrop,
    };
  });
}

/**
 * 「次に狙うバッジ」を優先度順に選ぶ共通ロジック。
 * 未獲得のうち、必須（requiredForGate）→ 条件達成間近（conditionMet）を優先する。
 * /badges のヒーロー・BadgeList のハイライト・/today のカードで同じ並びを使う。
 * カテゴリ絞り込み（例: final を除く）は呼び出し側で事前に filter しておく。
 */
export function selectNextBadges(
  statuses: BadgeStatus[],
  limit = 1,
): BadgeStatus[] {
  return statuses
    .filter((s) => !s.earned)
    .sort((a, b) => {
      if (a.def.requiredForGate !== b.def.requiredForGate) {
        return a.def.requiredForGate ? -1 : 1;
      }
      return Number(b.conditionMet) - Number(a.conditionMet);
    })
    .slice(0, limit);
}

/** 進捗から wordlist マスター数など「既存データで足りるぶん」だけ数える補助。 */
export function countMasteredTopics(progress: UserProgress): number {
  return Object.values(progress.topicMastery ?? {}).filter((m) => m >= MASTERED)
    .length;
}
