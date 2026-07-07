// アバターの解放判定・装備変更（純粋関数）。
//
// 方針:
//   - 「解放済み装備」は保存しない。獲得バッジ・クリア済みCP・完了トピック数から
//     毎回導出する（バッジ進行と装備解放が常に一致し、二重管理にならない）。
//   - 装備変更は AppState を受け取り新しい AppState を返す純粋関数。保存
//     （saveAppState / saveProgressToDb）は呼び出し側の画面が既存の流儀で行う。
//   - 装備はすべて見た目だけ。問題の正解判定・ゲート判定には一切影響しない。

import type { AppState } from "@/types";
import type {
  AvatarEquipmentSlot,
  AvatarEquipped,
  AvatarItemDef,
  AvatarItemStatus,
  AvatarPresetId,
  AvatarProfile,
  AvatarUnlockCondition,
} from "@/types/avatar";
import type { CheckpointProgress } from "@/types/checkpoint";
import { AVATAR_ITEMS, getAvatarItem } from "@/lib/avatarItems";
import { getBadge } from "@/lib/badges";
import { getCheckpoint, getCheckpointProgress } from "@/lib/checkpoints";

// ---------------------------------------------------------------------------
// アバター状態の取得・更新
// ---------------------------------------------------------------------------

/** 保存済みのアバター設定。未作成なら null。 */
export function getAvatarProfile(state: AppState): AvatarProfile | null {
  return getCheckpointProgress(state).avatar ?? null;
}

/** 新規作成時の初期アバター（最初から使える装備を身につけた状態）。 */
export function createAvatarProfile(
  presetId: AvatarPresetId,
  now: Date = new Date(),
): AvatarProfile {
  return {
    presetId,
    equipped: {
      head: "headset-beginner",
      background: "bg-study-room",
    },
    updatedAt: now.toISOString(),
  };
}

/** アバター設定を書き込んだ新しい AppState を返す。 */
export function withAvatarProfile(
  state: AppState,
  avatar: AvatarProfile,
): AppState {
  const cp: CheckpointProgress = { ...getCheckpointProgress(state), avatar };
  return {
    ...state,
    progress: { ...state.progress, checkpointProgress: cp },
  };
}

/** プリセットを変更する（装備はそのまま）。未作成なら初期装備つきで作成する。 */
export function setAvatarPreset(
  state: AppState,
  presetId: AvatarPresetId,
  now: Date = new Date(),
): AppState {
  const current = getAvatarProfile(state);
  const avatar: AvatarProfile = current
    ? { ...current, presetId, updatedAt: now.toISOString() }
    : createAvatarProfile(presetId, now);
  return withAvatarProfile(state, avatar);
}

/**
 * 装備を付け替える（itemId=null で外す）。
 * 未解放・スロット不一致・未知のアイテムは無視して元の state を返す
 * （未解放装備は装備できない、を単一の窓口で保証する）。
 */
export function setEquippedItem(
  state: AppState,
  slot: AvatarEquipmentSlot,
  itemId: string | null,
  now: Date = new Date(),
): AppState {
  const avatar = getAvatarProfile(state);
  if (!avatar) return state;

  if (itemId !== null) {
    const def = getAvatarItem(itemId);
    if (!def || def.slot !== slot) return state;
    if (!getUnlockedItemIds(state).has(itemId)) return state;
  }

  const equipped: AvatarEquipped = { ...avatar.equipped, [slot]: itemId };
  return withAvatarProfile(state, {
    ...avatar,
    equipped,
    updatedAt: now.toISOString(),
  });
}

// ---------------------------------------------------------------------------
// 解放判定（既存の進行データから導出）
// ---------------------------------------------------------------------------

type UnlockContext = {
  earnedBadgeIds: Set<string>;
  clearedCheckpointIds: Set<string>;
  completedTopicCount: number;
};

function buildUnlockContext(state: AppState): UnlockContext {
  const cp = getCheckpointProgress(state);
  return {
    earnedBadgeIds: new Set(cp.earnedBadges.map((e) => e.badgeId)),
    clearedCheckpointIds: new Set(cp.clearedCheckpointIds),
    completedTopicCount: state.progress.completedTopics.length,
  };
}

function isConditionMet(cond: AvatarUnlockCondition, ctx: UnlockContext): boolean {
  switch (cond.type) {
    case "initial":
      return true;
    case "badge":
      return ctx.earnedBadgeIds.has(cond.badgeId);
    case "anyBadge":
      return cond.badgeIds.some((id) => ctx.earnedBadgeIds.has(id));
    case "checkpointCleared":
      return ctx.clearedCheckpointIds.has(cond.checkpointId);
    case "topicsCompleted":
      return ctx.completedTopicCount >= cond.count;
  }
}

/** 解放済み装備の id 集合（保存せず毎回導出する）。 */
export function getUnlockedItemIds(state: AppState): Set<string> {
  const ctx = buildUnlockContext(state);
  return new Set(
    AVATAR_ITEMS.filter((i) => isConditionMet(i.unlock, ctx)).map((i) => i.id),
  );
}

/** 解放条件を人が読める形にする（未解放でも隠さず表示する）。 */
export function unlockConditionLabel(item: AvatarItemDef): string {
  const cond = item.unlock;
  switch (cond.type) {
    case "initial":
      return "最初から使えます";
    case "badge": {
      const badge = getBadge(cond.badgeId);
      return badge
        ? `バッジ「${badge.label}」を獲得する（${badge.conditionLabel}）`
        : "対象バッジを獲得する";
    }
    case "anyBadge": {
      const labels = cond.badgeIds
        .map((id) => getBadge(id)?.label)
        .filter((l): l is string => !!l);
      if (labels.length === 0) return "対象バッジを獲得する";
      if (labels.length > 2)
        return "いずれかの突破試験（最終問題）に合格する";
      return `バッジ「${labels.join("」または「")}」を獲得する`;
    }
    case "checkpointCleared": {
      const cp = getCheckpoint(cond.checkpointId);
      return `CP${cp.order}「${cp.title}」の突破試験に合格する`;
    }
    case "topicsCompleted":
      return `トピックを${cond.count}個学習完了する`;
  }
}

// ---------------------------------------------------------------------------
// UI表示用の派生データ
// ---------------------------------------------------------------------------

/** 全装備の状態（解放済みか・装備中か・条件表示）。管理画面用。 */
export function buildAvatarItemStatuses(state: AppState): AvatarItemStatus[] {
  const unlocked = getUnlockedItemIds(state);
  const avatar = getAvatarProfile(state);
  return AVATAR_ITEMS.map((def) => ({
    def,
    unlocked: unlocked.has(def.id),
    equipped: avatar?.equipped[def.slot] === def.id,
    conditionLabel: unlockConditionLabel(def),
  }));
}

/**
 * 装備中アイテムの定義（表示順）。解放済みのものだけ返す
 * （マージ・巻き戻り等で万一未解放の id が残っていても表示しない）。
 */
export function equippedItemDefs(state: AppState): AvatarItemDef[] {
  const avatar = getAvatarProfile(state);
  if (!avatar) return [];
  const unlocked = getUnlockedItemIds(state);
  const defs: AvatarItemDef[] = [];
  for (const item of AVATAR_ITEMS) {
    if (avatar.equipped[item.slot] === item.id && unlocked.has(item.id)) {
      defs.push(item);
    }
  }
  return defs;
}

/** 表示用に安全化した装備（未解放・未知の id を落とす）。レンダラーに渡す。 */
export function sanitizedEquipped(state: AppState): AvatarEquipped {
  const avatar = getAvatarProfile(state);
  if (!avatar) return {};
  const unlocked = getUnlockedItemIds(state);
  const result: AvatarEquipped = {};
  for (const [slot, itemId] of Object.entries(avatar.equipped)) {
    if (itemId && unlocked.has(itemId)) {
      result[slot as AvatarEquipmentSlot] = itemId;
    }
  }
  return result;
}

/** 次に解放できる装備（定義順＝進行順で先頭の未解放）。ホームのカード等に使う。 */
export function nextUnlockTargets(state: AppState, limit = 1): AvatarItemDef[] {
  const unlocked = getUnlockedItemIds(state);
  return AVATAR_ITEMS.filter((i) => !unlocked.has(i.id)).slice(0, limit);
}

/** 2つの状態の間で新たに解放された装備（突破演出用）。 */
export function newlyUnlockedItems(
  before: AppState,
  after: AppState,
): AvatarItemDef[] {
  const prev = getUnlockedItemIds(before);
  const next = getUnlockedItemIds(after);
  return AVATAR_ITEMS.filter((i) => next.has(i.id) && !prev.has(i.id));
}
