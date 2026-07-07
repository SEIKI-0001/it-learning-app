// ホーム用のアバターカード。分身・称号（ランク名）・装備中・次の目標を
// コンパクトに見せる。未作成のときは作成導線を出す。

import Link from "next/link";
import type { AppState } from "@/types";
import { getRankStatus } from "@/lib/rank";
import { getAvatarGrowthStage } from "@/lib/avatarGrowth";
import {
  equippedItemDefs,
  getAvatarProfile,
  nextUnlockTargets,
  sanitizedEquipped,
  unlockConditionLabel,
} from "@/lib/avatarUnlocks";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";

type Props = {
  state: AppState;
};

export default function AvatarProgressCard({ state }: Props) {
  const avatar = getAvatarProfile(state);

  // 未作成: 作成導線
  if (!avatar) {
    return (
      <Link
        href="/avatar"
        className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
      >
        <span className="opacity-50 grayscale">
          <AvatarRenderer presetId="majime" size={72} label="未作成のアバター" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold text-gray-800">
            あなたの分身を作ろう
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            学習を進めるほど成長します。バッジを集めると装備が増えます。
          </span>
        </span>
        <span className="shrink-0 text-lg font-extrabold text-indigo-500">→</span>
      </Link>
    );
  }

  const rank = getRankStatus(state.progress.exp);
  const equipped = equippedItemDefs(state);
  const next = nextUnlockTargets(state, 1)[0];

  return (
    <Link
      href="/avatar"
      className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-indigo-500">あなたの分身</p>
        <span className="text-xs font-bold text-indigo-600">装備をみる →</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <AvatarRenderer
          presetId={avatar.presetId}
          equipped={sanitizedEquipped(state)}
          stage={getAvatarGrowthStage(state)}
          size={88}
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold text-gray-800">
            {rank.current.emoji} {rank.current.name}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-gray-500">
            ランク{rank.index + 1}・{state.progress.exp} XP
          </p>
          <p className="mt-1.5 truncate text-xs text-gray-500">
            {equipped.length > 0
              ? `装備中：${equipped
                  .slice(0, 3)
                  .map((d) => d.name)
                  .join("・")}${equipped.length > 3 ? ` ほか${equipped.length - 3}点` : ""}`
              : "装備なし（バッジを集めて解放しよう）"}
          </p>
        </div>
      </div>
      {next && (
        <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
          🎁 次の解放：{next.name}（{unlockConditionLabel(next)}）
        </p>
      )}
    </Link>
  );
}
