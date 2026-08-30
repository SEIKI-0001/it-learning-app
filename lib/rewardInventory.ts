// 欠片（たからもの）の可視化と、称号への交換（GF-P1-005・純関数）。
//
// 要件書 §11 の「出口」: 欠片を可視化し、コスメ・称号・記念品等へ交換可能にする。
//
// 絶対の境界:
//   - 交換先は称号（表示テキスト）だけ。合格準備度・必須バッジ・CP進行・
//     XP のいずれも欠片で購入できない。カタログにその種の効果を持たせない。
//   - ここは AppState を読み書きするが、触るのは checkpoint_progress.gameful.rewards と
//     badgeFragments だけ。学習評価に関わるフィールドには一切触れない。

import type { AppState } from "@/types";
import type { BadgeFragment, BadgeRarity, PendingChoiceOption } from "@/types/checkpoint";
import { getCheckpointProgress } from "@/lib/checkpoints";

/** 欠片の表示名。未知のIDはそのまま出さず「かけら」と総称する。 */
const FRAGMENT_LABELS: Record<string, string> = {
  "frag-common": "ノーマルのかけら",
  "frag-rare": "レアのかけら",
  "chest-rare": "宝箱のかけら",
};

export function fragmentLabel(fragmentId: string): string {
  return FRAGMENT_LABELS[fragmentId] ?? "かけら";
}

/**
 * 交換できる称号。効果は「名乗れる」ことだけで、学習評価には一切影響しない。
 * 追加するときも、ここに評価へ効くフィールドを持たせないこと。
 */
export type CosmeticTitle = {
  id: string;
  label: string;
  description: string;
  rarity: BadgeRarity;
  /** 交換に必要な欠片。 */
  cost: { fragmentId: string; count: number };
};

export const COSMETIC_TITLES: CosmeticTitle[] = [
  {
    id: "title-steady",
    label: "こつこつ研究員",
    description: "毎日の積み重ねを選んだ人の称号。",
    rarity: "common",
    cost: { fragmentId: "frag-common", count: 5 },
  },
  {
    id: "title-reviewer",
    label: "見直しの達人",
    description: "解き直しを厭わない人の称号。",
    rarity: "common",
    cost: { fragmentId: "frag-common", count: 12 },
  },
  {
    id: "title-explorer",
    label: "分野の探検家",
    description: "3分野を行き来してきた人の称号。",
    rarity: "rare",
    cost: { fragmentId: "frag-rare", count: 3 },
  },
  {
    id: "title-collector",
    label: "たからもの収集家",
    description: "宝箱を集めた人の称号。",
    rarity: "rare",
    cost: { fragmentId: "chest-rare", count: 3 },
  },
  {
    id: "title-lantern",
    label: "夜明けの案内人",
    description: "長く歩き続けた人の称号。",
    rarity: "epic",
    cost: { fragmentId: "frag-rare", count: 8 },
  },
];

export function getCosmeticTitle(id: string): CosmeticTitle | undefined {
  return COSMETIC_TITLES.find((title) => title.id === id);
}

/** 所持している欠片の一覧（0個は含めない）。 */
export function getFragments(state: AppState): BadgeFragment[] {
  return getCheckpointProgress(state)
    .badgeFragments.filter((fragment) => fragment.count > 0)
    .sort((a, b) => b.count - a.count || a.fragmentId.localeCompare(b.fragmentId));
}

function fragmentCount(state: AppState, fragmentId: string): number {
  return getCheckpointProgress(state).badgeFragments.find((f) => f.fragmentId === fragmentId)?.count ?? 0;
}

/** 交換済みの称号ID。 */
export function getUnlockedTitleIds(state: AppState): string[] {
  return getCheckpointProgress(state).gameful?.rewards?.unlockedCosmetics ?? [];
}

/** 表示中の称号。未設定なら undefined。 */
export function getEquippedTitle(state: AppState): CosmeticTitle | undefined {
  const id = getCheckpointProgress(state).gameful?.rewards?.equippedTitleId;
  return id ? getCosmeticTitle(id) : undefined;
}

export type TitleAvailability = {
  title: CosmeticTitle;
  unlocked: boolean;
  /** いま交換できるか（未交換かつ欠片が足りている）。 */
  affordable: boolean;
  /** あと何個必要か（交換済みなら0）。 */
  missing: number;
};

/** 称号の一覧と、それぞれの交換可否。 */
export function listTitleAvailability(state: AppState): TitleAvailability[] {
  const unlockedIds = new Set(getUnlockedTitleIds(state));
  return COSMETIC_TITLES.map((title) => {
    const held = fragmentCount(state, title.cost.fragmentId);
    const unlocked = unlockedIds.has(title.id);
    const missing = unlocked ? 0 : Math.max(0, title.cost.count - held);
    return { title, unlocked, affordable: !unlocked && missing === 0, missing };
  });
}

function withRewards(
  state: AppState,
  update: (rewards: NonNullable<ReturnType<typeof readRewards>>) => ReturnType<typeof readRewards>,
): AppState {
  const cp = getCheckpointProgress(state);
  const rewards = update(readRewards(state) ?? {});
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: {
        ...cp,
        gameful: { ...cp.gameful, rewards },
      },
    },
  };
}

function readRewards(state: AppState) {
  return getCheckpointProgress(state).gameful?.rewards;
}

/**
 * 欠片を支払って称号を交換する。
 * 交換済み・欠片不足なら state をそのまま返す（冪等）。
 */
export function exchangeTitle(state: AppState, titleId: string): AppState {
  const title = getCosmeticTitle(titleId);
  if (!title) return state;
  if (getUnlockedTitleIds(state).includes(titleId)) return state;
  if (fragmentCount(state, title.cost.fragmentId) < title.cost.count) return state;

  const cp = getCheckpointProgress(state);
  const badgeFragments = cp.badgeFragments
    .map((fragment) =>
      fragment.fragmentId === title.cost.fragmentId
        ? { ...fragment, count: fragment.count - title.cost.count }
        : fragment,
    )
    .filter((fragment) => fragment.count > 0);

  const rewards = readRewards(state) ?? {};
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: {
        ...cp,
        badgeFragments,
        gameful: {
          ...cp.gameful,
          rewards: {
            ...rewards,
            unlockedCosmetics: [...new Set([...(rewards.unlockedCosmetics ?? []), titleId])],
            // 初めて手に入れた称号は自動で表示する（すぐ効果が見えるように）。
            equippedTitleId: rewards.equippedTitleId ?? titleId,
          },
        },
      },
    },
  };
}

/** 表示する称号を切り替える。未交換の称号は装備できない。 */
export function equipTitle(state: AppState, titleId: string | null): AppState {
  if (titleId !== null && !getUnlockedTitleIds(state).includes(titleId)) return state;
  return withRewards(state, (rewards) => {
    const next = { ...rewards };
    if (titleId === null) delete next.equippedTitleId;
    else next.equippedTitleId = titleId;
    return next;
  });
}

/** 3択候補の表示に使う、選ぶと何が増えるかの説明。 */
export function describeChoiceOption(option: PendingChoiceOption): string {
  if (!option.fragment) return "飾りとして手に入ります";
  return `${fragmentLabel(option.fragment.fragmentId)} ×${option.fragment.count}`;
}
