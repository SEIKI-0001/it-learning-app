"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AppState } from "@/types";
import type { AvatarEquipmentSlot, AvatarPresetId } from "@/types/avatar";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { saveAppState } from "@/lib/storage";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import { getRankStatus } from "@/lib/rank";
import {
  GROWTH_STAGE_LABELS,
  getAvatarGrowthStage,
  nextGrowthStageInfo,
} from "@/lib/avatarGrowth";
import { AVATAR_PRESETS } from "@/lib/avatarPresets";
import {
  getAvatarProfile,
  nextUnlockTargets,
  sanitizedEquipped,
  setAvatarPreset,
  setEquippedItem,
  unlockConditionLabel,
} from "@/lib/avatarUnlocks";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import AvatarCreator from "@/components/avatar/AvatarCreator";
import AvatarEquipmentPanel from "@/components/avatar/AvatarEquipmentPanel";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

// /avatar = アバター管理画面。
//   - 未作成: プリセット選択（AvatarCreator）
//   - 作成済み: 現在の姿・称号（ランク）・次の解放目標・装備の付け替え
// 状態は AppState（checkpointProgress.avatar）に保存し、既存の流儀どおり
// localStorage 即時保存＋ログイン済みなら DB へも書く。

export default function AvatarPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  useBadgeSync(state, setState);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  if (state === undefined || state === null) {
    return <LoadingScreen />;
  }

  function persist(next: AppState) {
    saveAppState(next);
    setState(next);
    const uid = getUserId();
    if (uid) saveProgressToDb(uid, next.progress);
  }

  function handleCreate(presetId: AvatarPresetId) {
    if (!state) return;
    persist(setAvatarPreset(state, presetId));
  }

  function handleEquip(slot: AvatarEquipmentSlot, itemId: string | null) {
    if (!state) return;
    persist(setEquippedItem(state, slot, itemId));
  }

  const avatar = getAvatarProfile(state);
  const rank = getRankStatus(state.progress.exp);
  const stage = getAvatarGrowthStage(state);
  const nextStage = nextGrowthStageInfo(state);
  const nextTargets = nextUnlockTargets(state, 2);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-4 pt-4 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/" className="text-xs font-semibold text-white/80">
            ← ホーム
          </Link>
          <p className="mt-1 text-lg font-extrabold">あなたの分身</p>
          <p className="text-[11px] font-semibold text-white/80">
            学習を進めるほど成長します
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-2xl">
        {!avatar ? (
          <AvatarCreator onCreate={handleCreate} />
        ) : (
          <>
            {/* 現在の姿 */}
            <section className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100">
              <div className="flex justify-center">
                <AvatarRenderer
                  presetId={avatar.presetId}
                  equipped={sanitizedEquipped(state)}
                  stage={stage}
                  size={176}
                />
              </div>
              <p className="mt-3 text-base font-extrabold text-gray-800">
                {rank.current.emoji} 称号：{rank.current.name}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-gray-500">
                ランク{rank.index + 1}・{state.progress.exp} XP
                {!rank.isMax && `・次のランクまであと${rank.remaining} XP`}
              </p>
              <p className="mt-1 text-xs font-semibold text-amber-600">
                成長段階：{GROWTH_STAGE_LABELS[stage]}（{stage}/3）
              </p>
              {nextStage && (
                <p className="mt-0.5 text-[11px] text-gray-400">
                  次の段階「{GROWTH_STAGE_LABELS[nextStage.stage]}」：
                  {nextStage.conditionLabel}
                </p>
              )}

              {/* タイプ変更 */}
              <div
                className="mt-4 grid grid-cols-4 gap-2"
                role="radiogroup"
                aria-label="アバターのタイプ変更"
              >
                {AVATAR_PRESETS.map((preset) => {
                  const active = preset.id === avatar.presetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleCreate(preset.id)}
                      className={`flex flex-col items-center rounded-xl p-1.5 transition active:scale-[0.97] ${
                        active
                          ? "bg-indigo-50 ring-2 ring-indigo-500"
                          : "bg-gray-50 ring-1 ring-gray-200"
                      }`}
                    >
                      <AvatarRenderer presetId={preset.id} size={52} />
                      <span className="mt-1 text-[10px] font-bold text-gray-600">
                        {preset.name.replace("タイプ", "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 次の解放目標 */}
            {nextTargets.length > 0 && (
              <section className="rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
                <p className="text-xs font-bold text-indigo-600">
                  🎁 次に解放できる装備
                </p>
                <ul className="mt-2 space-y-2">
                  {nextTargets.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-indigo-100"
                    >
                      <p className="text-sm font-extrabold text-gray-800">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-gray-500">
                        条件：{unlockConditionLabel(item)}
                      </p>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/badges"
                  className="mt-2 block text-center text-xs font-bold text-indigo-600 underline underline-offset-2"
                >
                  バッジ一覧で進み具合を見る →
                </Link>
              </section>
            )}

            {/* 装備の付け替え */}
            <AvatarEquipmentPanel state={state} onEquip={handleEquip} />
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
