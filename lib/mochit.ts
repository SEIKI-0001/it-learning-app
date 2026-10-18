import type { AppState } from "@/types";
import type { TopicField } from "@/types/content";
import { getCheckpointProgress } from "@/lib/checkpoints";
import { learningThemes } from "@/data/learningCatalog";

// モチットの成長は「学習した事実」から毎回導出する（保存しない）。
// 見た目・セリフ・しぐさだけに使い、合否・ゲート判定には一切使わない。

export type MochitGrowthStage = 1 | 2 | 3 | 4 | 5;

export const MOCHIT_GROWTH_STAGES: readonly MochitGrowthStage[] = [1, 2, 3, 4, 5];

export const MOCHIT_GROWTH_STAGE_LABELS: Record<MochitGrowthStage, string> = {
  1: "はじまり",
  2: "めざめ",
  3: "成長期",
  4: "つながり",
  5: "満開",
};

/** 段階ごとに体のどこが変わったか（/avatar とお祝い演出で使う一言）。 */
export const MOCHIT_GROWTH_STAGE_CHANGES: Record<MochitGrowthStage, string> = {
  1: "頭の芽がひとつ",
  2: "芽の横に新しい葉が出た",
  3: "胸の回路が枝分かれして伸びた",
  4: "芽につぼみがついた",
  5: "つぼみが花ひらいた",
};

const STAGE_TWO_TOPICS = 5;
const STAGE_TWO_CLEARS = 1;
// 段階3・4は旧3段階の「CP2クリア／CP4クリア」と同じ条件。既存ユーザーの見た目は退化しない。
const STAGE_THREE_CLEARS = 2;
const STAGE_FOUR_CLEARS = 4;
const STAGE_FIVE_CLEARS = 6;

export function getMochitGrowthStage(state: AppState): MochitGrowthStage {
  const clearedCount = getCheckpointProgress(state).clearedCheckpointIds.length;
  if (clearedCount >= STAGE_FIVE_CLEARS) return 5;
  if (clearedCount >= STAGE_FOUR_CLEARS) return 4;
  if (clearedCount >= STAGE_THREE_CLEARS) return 3;
  if (
    clearedCount >= STAGE_TWO_CLEARS ||
    state.progress.completedTopics.length >= STAGE_TWO_TOPICS
  ) {
    return 2;
  }
  return 1;
}

export function nextMochitGrowthStageInfo(
  state: AppState,
): { stage: MochitGrowthStage; conditionLabel: string } | null {
  const stage = getMochitGrowthStage(state);
  switch (stage) {
    case 1:
      return {
        stage: 2,
        conditionLabel: `トピックを${STAGE_TWO_TOPICS}つ学ぶか、チェックポイントを${STAGE_TWO_CLEARS}回クリア`,
      };
    case 2:
      return { stage: 3, conditionLabel: `チェックポイントを${STAGE_THREE_CLEARS}回クリア` };
    case 3:
      return { stage: 4, conditionLabel: `チェックポイントを${STAGE_FOUR_CLEARS}回クリア` };
    case 4:
      return { stage: 5, conditionLabel: "すべてのチェックポイントをクリア" };
    default:
      return null;
  }
}

export function getMochitUnlockSummary(state: AppState): {
  clearedCheckpointCount: number;
  earnedBadgeCount: number;
} {
  const checkpointProgress = getCheckpointProgress(state);
  return {
    clearedCheckpointCount: checkpointProgress.clearedCheckpointIds.length,
    earnedBadgeCount: checkpointProgress.earnedBadges.length,
  };
}

/**
 * 学習前後でモチットの成長段階が上がったか（GF-P1-003）。
 * 上がっていなければ null。
 */
export function getMochitStageChange(
  before: AppState,
  after: AppState,
): { from: MochitGrowthStage; to: MochitGrowthStage } | null {
  const from = getMochitGrowthStage(before);
  const to = getMochitGrowthStage(after);
  return to > from ? { from, to } : null;
}

// ---------------------------------------------------------------------------
// 分野ごとの育ち（胸のコアの3本のバー＝左からストラテジ・マネジメント・テクノロジ）
// ---------------------------------------------------------------------------

export const MOCHIT_FIELDS: readonly TopicField[] = ["strategy", "management", "technology"];

export const MOCHIT_FIELD_LABELS: Record<TopicField, string> = {
  strategy: "ストラテジ",
  management: "マネジメント",
  technology: "テクノロジ",
};

export type MochitFieldLevel = 0 | 1 | 2 | 3 | 4;

export type MochitFieldGrowth = {
  field: TopicField;
  /** 分野内トピックの習熟度（0〜100）の平均。未着手は0として数える。 */
  average: number;
  level: MochitFieldLevel;
  /** 分野内で習熟度が1以上のトピック数。 */
  startedTopics: number;
  totalTopics: number;
};

/** Lv2〜4に必要な平均習熟度。Lv1は分野のトピックを1つでも始めたら。 */
const FIELD_LEVEL_AVERAGES = [25, 50, 80] as const;

const FIELD_LESSON_IDS: Record<TopicField, readonly string[]> = (() => {
  const map: Record<TopicField, string[]> = { strategy: [], management: [], technology: [] };
  for (const theme of learningThemes) {
    for (const section of theme.sections) {
      for (const id of section.lessonIds) {
        if (!map[theme.field].includes(id)) map[theme.field].push(id);
      }
    }
  }
  return map;
})();

export function getMochitFieldGrowth(state: AppState): MochitFieldGrowth[] {
  const mastery = state.progress.topicMastery ?? {};
  const completed = new Set(state.progress.completedTopics);
  return MOCHIT_FIELDS.map((field) => {
    const ids = FIELD_LESSON_IDS[field];
    let sum = 0;
    let started = 0;
    for (const id of ids) {
      const value = Math.max(0, Math.min(100, Number(mastery[id]) || 0));
      sum += value;
      if (value > 0 || completed.has(id)) started += 1;
    }
    const average = ids.length ? Math.round(sum / ids.length) : 0;
    let level: MochitFieldLevel = started > 0 ? 1 : 0;
    FIELD_LEVEL_AVERAGES.forEach((threshold, i) => {
      if (started > 0 && average >= threshold) level = (i + 2) as MochitFieldLevel;
    });
    return { field, average, level, startedTopics: started, totalTopics: ids.length };
  });
}

// ---------------------------------------------------------------------------
// 個性（得意分野で回路と花の色が変わる）
// ---------------------------------------------------------------------------

export type MochitPersonality = "undecided" | "balanced" | TopicField;

export const MOCHIT_PERSONALITY_LABELS: Record<MochitPersonality, string> = {
  undecided: "まだ決まっていない",
  balanced: "バランス型",
  strategy: "戦略家タイプ",
  management: "まとめ役タイプ",
  technology: "技術者タイプ",
};

/** 個性が決まるのに必要な、いちばん育った分野の平均習熟度。 */
const PERSONALITY_MIN_AVERAGE = 20;
/** 得意分野と言えるのに必要な、2番目との差。 */
const PERSONALITY_LEAD = 12;

export function getMochitPersonality(fields: MochitFieldGrowth[]): MochitPersonality {
  const sorted = [...fields].sort((a, b) => b.average - a.average);
  const top = sorted[0];
  const second = sorted[1];
  if (!top || top.average < PERSONALITY_MIN_AVERAGE) return "undecided";
  if (!second || top.average - second.average >= PERSONALITY_LEAD) return top.field;
  return "balanced";
}

/** 描画に渡す成長の見た目一式。 */
export type MochitGrowthLook = {
  stage: MochitGrowthStage;
  fieldLevels: [MochitFieldLevel, MochitFieldLevel, MochitFieldLevel];
  personality: MochitPersonality;
};

export function getMochitGrowthLook(state: AppState): MochitGrowthLook {
  const fields = getMochitFieldGrowth(state);
  return {
    stage: getMochitGrowthStage(state),
    fieldLevels: [fields[0].level, fields[1].level, fields[2].level],
    personality: getMochitPersonality(fields),
  };
}
