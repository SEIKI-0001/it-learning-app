// /rank ページ用のアバターカード。「ランク＝分身の成長段階」を目で見せる。
// 未作成なら作成導線を出す。

import Link from "next/link";
import type { AppState } from "@/types";
import {
  GROWTH_STAGE_LABELS,
  getAvatarGrowthStage,
  nextGrowthStageInfo,
} from "@/lib/avatarGrowth";
import { getAvatarProfile, sanitizedEquipped } from "@/lib/avatarUnlocks";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";

type Props = {
  state: AppState;
};

export default function RankAvatarCard({ state }: Props) {
  const avatar = getAvatarProfile(state);

  if (!avatar) {
    return (
      <Link
        href="/avatar"
        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
      >
        <span className="text-sm font-bold text-gray-700">
          🧑‍🎓 分身を作ると、ランクと一緒に成長します
        </span>
        <span className="shrink-0 text-xs font-bold text-indigo-600">作る →</span>
      </Link>
    );
  }

  const stage = getAvatarGrowthStage(state);
  const nextStage = nextGrowthStageInfo(state);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-4">
        <AvatarRenderer
          presetId={avatar.presetId}
          equipped={sanitizedEquipped(state)}
          stage={stage}
          size={104}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-500">あなたの分身</p>
          <p className="mt-0.5 text-base font-extrabold text-gray-800">
            成長段階：{GROWTH_STAGE_LABELS[stage]}（{stage}/3）
          </p>
          {nextStage ? (
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              次の段階「{GROWTH_STAGE_LABELS[nextStage.stage]}」：
              {nextStage.conditionLabel}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              最終段階に到達しました。おめでとうございます！
            </p>
          )}
        </div>
      </div>
      <Link
        href="/avatar"
        className="mt-3 block rounded-xl bg-gray-50 px-3 py-2 text-center text-xs font-bold text-indigo-600 ring-1 ring-gray-200"
      >
        分身と装備をみる →
      </Link>
    </section>
  );
}
