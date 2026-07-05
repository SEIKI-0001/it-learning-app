// ランダム「追加報酬」システム（純粋関数）。
//
// 厳守する境界:
//   - 追加ドロップは「条件達成後（＝必須/任意バッジを確定獲得した後）」だけ発生させる。
//   - 扱うのは補助報酬のみ: 欠片 / 宝箱 / 3択報酬候補（＝任意の飾り・欠片）。
//   - ランダムで「必須バッジ・最終問題免除・合格準備度上昇・大量XP」は絶対に出さない。
//   - 5回連続でレアが出なければ、次回はレア候補を必ず1つ混ぜる（天井 = rarePityCount）。
//   - 学習進行（ロードマップ・ゲート・準備度）を一切動かさない。

import type { AppState } from "@/types";
import type {
  BadgeFragment,
  BadgeRarity,
  CheckpointProgress,
} from "@/types/checkpoint";
import { getCheckpointProgress } from "@/lib/checkpoints";
import { grantExp } from "@/lib/game";

const PITY_THRESHOLD = 5; // これ以上レアが出ていなければ次回レア確定
const SMALL_XP = 3; // 追加ドロップに乗せてよい「ごく少量」の XP 上限

/** 3択報酬の1候補（すべて補助＝進行を壊さない）。 */
export type DropChoiceOption = {
  id: string;
  label: string;
  rarity: BadgeRarity;
  emoji: string;
  /** 選ぶと付与される欠片（無ければ飾りのみ）。 */
  fragment?: { fragmentId: string; count: number };
};

/** 1回の追加ドロップ結果。 */
export type BadgeDrop =
  | { kind: "fragment"; rarity: BadgeRarity; fragmentId: string; count: number; bonusXp: number; label: string; emoji: string }
  | { kind: "chest"; rarity: BadgeRarity; fragmentId: string; count: number; bonusXp: number; label: string; emoji: string }
  | { kind: "choice"; rarity: BadgeRarity; options: DropChoiceOption[]; label: string; emoji: string };

export type DropRoll = {
  drop: BadgeDrop;
  /** 更新後の欠片一覧（重複は加算）。 */
  badgeFragments: BadgeFragment[];
  /** 更新後の天井カウンタ。 */
  rarePityCount: number;
  /** 追加で加算してよい少量 XP（進行に影響しない範囲）。 */
  bonusXp: number;
};

function addFragment(
  fragments: BadgeFragment[],
  fragmentId: string,
  count: number,
): BadgeFragment[] {
  const next = fragments.map((f) => ({ ...f }));
  const hit = next.find((f) => f.fragmentId === fragmentId);
  if (hit) hit.count += count;
  else next.push({ fragmentId, count });
  return next;
}

/**
 * 追加ドロップを1回抽選する。呼び出し側は「条件達成後」だけ呼ぶこと。
 * rng は 0〜1 を返す関数（テスト用に差し替え可能）。
 */
export function rollBadgeDrop(
  cp: CheckpointProgress,
  rng: () => number = Math.random,
): DropRoll {
  const forceRare = cp.rarePityCount >= PITY_THRESHOLD;
  const r = rng();

  // レア判定: 天井なら確定、そうでなければ約15%。
  const isRare = forceRare || r < 0.15;
  const rarity: BadgeRarity = isRare ? (r < 0.03 ? "epic" : "rare") : "common";

  let drop: BadgeDrop;
  let fragments = cp.badgeFragments;
  let bonusXp = 0;

  if (isRare) {
    // レア: 宝箱 or 3択（レア候補を1つ以上必ず含める）。
    if (rng() < 0.5) {
      const fragmentId = "chest-rare";
      fragments = addFragment(fragments, fragmentId, 1);
      bonusXp = SMALL_XP;
      drop = {
        kind: "chest",
        rarity,
        fragmentId,
        count: 1,
        bonusXp,
        label: rarity === "epic" ? "エピック宝箱を発見！" : "レア宝箱を発見！",
        emoji: rarity === "epic" ? "🎁" : "🧰",
      };
    } else {
      drop = {
        kind: "choice",
        rarity,
        label: "3択報酬（好きな1つを選べます）",
        emoji: "🎴",
        options: [
          {
            id: "opt-frag-rare",
            label: "レア欠片 ×2",
            rarity: "rare",
            emoji: "🔷",
            fragment: { fragmentId: "frag-rare", count: 2 },
          },
          {
            id: "opt-frag-common",
            label: "ノーマル欠片 ×3",
            rarity: "common",
            emoji: "🔹",
            fragment: { fragmentId: "frag-common", count: 3 },
          },
          {
            id: "opt-cosmetic",
            label: "称号フレーム（飾り）",
            rarity: "rare",
            emoji: "🏷️",
          },
        ],
      };
    }
  } else {
    // 通常: 欠片を少量。
    const fragmentId = "frag-common";
    const count = 1 + Math.floor(rng() * 2); // 1〜2
    fragments = addFragment(fragments, fragmentId, count);
    drop = {
      kind: "fragment",
      rarity,
      fragmentId,
      count,
      bonusXp: 0,
      label: `ノーマル欠片 ×${count}`,
      emoji: "🔹",
    };
  }

  return {
    drop,
    badgeFragments: fragments,
    rarePityCount: isRare ? 0 : cp.rarePityCount + 1,
    bonusXp,
  };
}

/**
 * 追加ドロップを AppState に反映する（欠片・天井カウンタ・少量XPを更新）。
 * choice ドロップは「候補提示」までで、選択の反映は applyDropChoice で行う。
 */
export function applyBadgeDrop(
  state: AppState,
  rng: () => number = Math.random,
): { state: AppState; drop: BadgeDrop } {
  const cp = getCheckpointProgress(state);
  const roll = rollBadgeDrop(cp, rng);
  const { exp, level } = grantExp(state.progress.exp, roll.bonusXp);
  return {
    state: {
      ...state,
      progress: {
        ...state.progress,
        exp,
        level,
        checkpointProgress: {
          ...cp,
          badgeFragments: roll.badgeFragments,
          rarePityCount: roll.rarePityCount,
        },
      },
    },
    drop: roll.drop,
  };
}

/** 3択報酬の選択を反映する。 */
export function applyDropChoice(
  state: AppState,
  option: DropChoiceOption,
): AppState {
  const cp = getCheckpointProgress(state);
  if (!option.fragment) return state;
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: {
        ...cp,
        badgeFragments: addFragment(
          cp.badgeFragments,
          option.fragment.fragmentId,
          option.fragment.count,
        ),
      },
    },
  };
}
