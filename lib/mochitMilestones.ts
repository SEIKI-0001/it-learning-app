import type { AppState } from "@/types";
import type { MochitGrowthRecord } from "@/types/checkpoint";
import type { TopicField } from "@/types/content";
import { getCheckpointProgress } from "@/lib/checkpoints";
import {
  getMochitFieldGrowth,
  getMochitGrowthStage,
  getMochitPersonality,
  MOCHIT_FIELD_LABELS,
  MOCHIT_FIELDS,
  MOCHIT_GROWTH_STAGE_CHANGES,
  MOCHIT_GROWTH_STAGE_LABELS,
  type MochitGrowthStage,
} from "@/lib/mochit";

// モチットの成長アルバム。節目に「初めて届いた日時」だけを保存する。
// 到達しているかどうかは毎回学習状態から導出し（lib/mochit.ts）、ここは日付の記録に専念する。

export type MochitMilestoneId =
  | `stage-${2 | 3 | 4 | 5}`
  | `field-${TopicField}-lit`
  | `field-${TopicField}-full`
  | "personality";

export type MochitMilestoneDef = {
  id: MochitMilestoneId;
  title: string;
  description: string;
  reached: (state: AppState) => boolean;
};

const GROWN_STAGES: readonly MochitGrowthStage[] = [2, 3, 4, 5];

/** アルバムの並び順（おおむね到達しやすい順）。 */
export const MOCHIT_MILESTONES: readonly MochitMilestoneDef[] = [
  ...MOCHIT_FIELDS.map<MochitMilestoneDef>((field, index) => ({
    id: `field-${field}-lit`,
    title: `${MOCHIT_FIELD_LABELS[field]}のバーがともった`,
    description: `胸のコアの${["左", "まん中", "右"][index]}のバー。${MOCHIT_FIELD_LABELS[field]}系のトピックを初めて学んだ日`,
    reached: (state) => getMochitFieldGrowth(state)[index].level >= 1,
  })),
  ...GROWN_STAGES.slice(0, 2).map(stageMilestone),
  {
    id: "personality",
    title: "個性が見えてきた",
    description: "得意分野で回路と花の色が決まった日",
    reached: (state) => getMochitPersonality(getMochitFieldGrowth(state)) !== "undecided",
  },
  ...GROWN_STAGES.slice(2).map(stageMilestone),
  ...MOCHIT_FIELDS.map<MochitMilestoneDef>((field, index) => ({
    id: `field-${field}-full`,
    title: `${MOCHIT_FIELD_LABELS[field]}のバーが満タン`,
    description: `${MOCHIT_FIELD_LABELS[field]}系の習熟度が平均80に届いた日`,
    reached: (state) => getMochitFieldGrowth(state)[index].level >= 4,
  })),
];

function stageMilestone(stage: MochitGrowthStage): MochitMilestoneDef {
  return {
    id: `stage-${stage}` as MochitMilestoneId,
    title: `「${MOCHIT_GROWTH_STAGE_LABELS[stage]}」になった`,
    description: MOCHIT_GROWTH_STAGE_CHANGES[stage],
    reached: (state) => getMochitGrowthStage(state) >= stage,
  };
}

function getRecord(state: AppState): MochitGrowthRecord | undefined {
  return getCheckpointProgress(state).mochitGrowth;
}

function withRecord(state: AppState, record: MochitGrowthRecord): AppState {
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: { ...getCheckpointProgress(state), mochitGrowth: record },
    },
  };
}

/**
 * 記録を始める前の到達済みの節目を「以前から（null）」で埋める。記録済みなら何もしない。
 * 学習処理の前に呼んでおくと、その学習で届いた節目だけに日付が付く。
 */
export function ensureMochitMilestoneBaseline(state: AppState): AppState {
  if (getRecord(state)) return state;
  const milestones: Record<string, string | null> = {};
  for (const def of MOCHIT_MILESTONES) {
    if (def.reached(state)) milestones[def.id] = null;
  }
  return withRecord(state, { milestones });
}

/**
 * まだ記録していない到達済みの節目に now の日時を付ける。
 * 記録がまだ無い状態で呼ばれた場合は、日付を推測せず baseline（null）として扱う。
 * 返り値の newlyReached は今回日付を付けた節目（お祝いの文言などに使える）。
 */
export function recordMochitMilestones(
  state: AppState,
  now: Date = new Date(),
): { state: AppState; newlyReached: MochitMilestoneId[] } {
  if (!getRecord(state)) {
    const baselined = ensureMochitMilestoneBaseline(state);
    // まだ何も届いていなければ記録を作らない（保存を増やさない）。
    // 最初の学習は completeStudySession が空の記録を作ってから日付を付ける。
    if (Object.keys(getRecord(baselined)?.milestones ?? {}).length === 0) {
      return { state, newlyReached: [] };
    }
    return { state: baselined, newlyReached: [] };
  }
  const record = getRecord(state)!;
  const newlyReached: MochitMilestoneId[] = [];
  for (const def of MOCHIT_MILESTONES) {
    if (def.id in record.milestones) continue;
    if (def.reached(state)) newlyReached.push(def.id);
  }
  if (newlyReached.length === 0) return { state, newlyReached };
  const at = now.toISOString();
  const milestones = { ...record.milestones };
  for (const id of newlyReached) milestones[id] = at;
  return { state: withRecord(state, { milestones }), newlyReached };
}

/** 端末間マージ: キーは和集合、日付は早い方、日付と null が並んだら日付を採用。 */
export function mergeMochitGrowthRecord(
  a: MochitGrowthRecord | undefined,
  b: MochitGrowthRecord | undefined,
): MochitGrowthRecord | undefined {
  if (!a) return b;
  if (!b) return a;
  const milestones: Record<string, string | null> = { ...a.milestones };
  for (const [id, at] of Object.entries(b.milestones)) {
    const prev = milestones[id];
    if (!(id in milestones)) milestones[id] = at;
    else if (prev === null) milestones[id] = at;
    else if (at !== null && at < prev) milestones[id] = at;
  }
  return { milestones };
}

export type MochitAlbumEntry = {
  def: MochitMilestoneDef;
  /** 未到達＝undefined、以前から＝null、日付つき＝ISO文字列 */
  reachedAt: string | null | undefined;
};

/** アルバム表示用。記録済みの節目は記録を、未記録でも到達済みなら null（以前から）で返す。 */
export function getMochitAlbum(state: AppState): MochitAlbumEntry[] {
  const record = getRecord(state)?.milestones ?? {};
  return MOCHIT_MILESTONES.map((def) => ({
    def,
    reachedAt: def.id in record ? record[def.id] : def.reached(state) ? null : undefined,
  }));
}
