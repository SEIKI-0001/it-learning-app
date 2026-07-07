// 突破試験（最終問題）画面でのアバター表示。
//   - challenge: 挑戦前。現在の装備・称号を見せて「装備を整えて挑む」気持ちを作る。
//   - victory: 合格後。突破エフェクトをまとった姿で達成感を演出する。
// 装備は見た目だけで、合否判定には一切影響しない。

import Link from "next/link";
import type { AppState } from "@/types";
import { getRankStatus } from "@/lib/rank";
import { getAvatarGrowthStage } from "@/lib/avatarGrowth";
import {
  equippedItemDefs,
  getAvatarProfile,
  sanitizedEquipped,
} from "@/lib/avatarUnlocks";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";

type Props = {
  state: AppState;
  mode?: "challenge" | "victory";
};

export default function CheckpointBattleAvatar({
  state,
  mode = "challenge",
}: Props) {
  const avatar = getAvatarProfile(state);

  if (!avatar) {
    if (mode === "victory") return null;
    return (
      <Link
        href="/avatar"
        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100"
      >
        <span className="text-sm font-bold text-gray-700">
          🧑‍🎓 分身を作って、装備を整えて挑戦しよう
        </span>
        <span className="shrink-0 text-xs font-bold text-indigo-600">作る →</span>
      </Link>
    );
  }

  const rank = getRankStatus(state.progress.exp);
  const equipped = equippedItemDefs(state);

  if (mode === "victory") {
    // 突破演出: 装備そのままに突破エフェクトを重ねる（演出専用の上書き）。
    return (
      <div className="flex justify-center">
        <AvatarRenderer
          presetId={avatar.presetId}
          equipped={{ ...sanitizedEquipped(state), effect: "effect-breakthrough" }}
          stage={getAvatarGrowthStage(state)}
          size={140}
          label="チェックポイントを突破したアバター"
        />
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-4">
        <AvatarRenderer
          presetId={avatar.presetId}
          equipped={sanitizedEquipped(state)}
          stage={getAvatarGrowthStage(state)}
          size={96}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-500">現在の称号</p>
          <p className="text-sm font-extrabold text-gray-800">
            {rank.current.emoji} {rank.current.name}
          </p>
          <p className="mt-1.5 text-xs font-bold text-gray-500">現在の装備</p>
          {equipped.length > 0 ? (
            <ul className="mt-0.5 flex flex-wrap gap-1">
              {equipped.map((d) => (
                <li
                  key={d.id}
                  className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700"
                >
                  {d.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-0.5 text-xs text-gray-400">なし</p>
          )}
        </div>
      </div>
      <Link
        href="/avatar"
        className="mt-3 block rounded-xl bg-gray-50 px-3 py-2 text-center text-xs font-bold text-indigo-600 ring-1 ring-gray-200"
      >
        装備を整えて、チェックポイント突破を目指しましょう →
      </Link>
    </section>
  );
}
