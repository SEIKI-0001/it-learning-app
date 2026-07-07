"use client";

// 装備の付け替えパネル。スロットごとに解放済み／未解放を一覧し、
// 未解放はグレーアウト＋解放条件を常に表示する（条件は隠さない）。
// 装備はすべて見た目だけの効果で、問題の正解判定には影響しない。

import type { AppState } from "@/types";
import type { AvatarEquipmentSlot, AvatarItemStatus } from "@/types/avatar";
import { AVATAR_SLOTS, AVATAR_SLOT_LABELS } from "@/types/avatar";
import { buildAvatarItemStatuses, getAvatarProfile } from "@/lib/avatarUnlocks";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";

type Props = {
  state: AppState;
  /** 装備変更（itemId=null で外す）。保存は呼び出し側の画面が行う。 */
  onEquip: (slot: AvatarEquipmentSlot, itemId: string | null) => void;
};

export default function AvatarEquipmentPanel({ state, onEquip }: Props) {
  const avatar = getAvatarProfile(state);
  if (!avatar) return null;

  const statuses = buildAvatarItemStatuses(state);
  const unlockedCount = statuses.filter((s) => s.unlocked).length;

  const bySlot = new Map<AvatarEquipmentSlot, AvatarItemStatus[]>();
  for (const s of statuses) {
    const list = bySlot.get(s.def.slot) ?? [];
    list.push(s);
    bySlot.set(s.def.slot, list);
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <p className="text-base font-extrabold text-gray-800">装備</p>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
          解放 {unlockedCount}/{statuses.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        バッジを集めて、チェックポイントに挑戦しよう。装備は見た目の成長で、問題が有利になることはありません。
      </p>

      <div className="mt-4 space-y-5">
        {AVATAR_SLOTS.map((slot) => {
          const items = bySlot.get(slot);
          if (!items || items.length === 0) return null;
          const equippedId = avatar.equipped[slot] ?? null;
          // 並び: 解放済み → 未解放（定義順は維持）。
          const sorted = [...items].sort(
            (a, b) => Number(b.unlocked) - Number(a.unlocked),
          );

          return (
            <div key={slot}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">
                  {AVATAR_SLOT_LABELS[slot]}
                </p>
                {equippedId && (
                  <button
                    type="button"
                    onClick={() => onEquip(slot, null)}
                    className="text-xs font-bold text-indigo-600 underline underline-offset-2"
                  >
                    外す
                  </button>
                )}
              </div>

              <ul className="mt-2 space-y-2">
                {sorted.map(({ def, unlocked, equipped, conditionLabel }) => (
                  <li key={def.id}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      aria-pressed={equipped}
                      onClick={() => onEquip(slot, equipped ? null : def.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                        equipped
                          ? "bg-indigo-50 ring-2 ring-indigo-500"
                          : unlocked
                            ? "bg-gray-50 ring-1 ring-gray-200 active:scale-[0.99]"
                            : "bg-gray-50 ring-1 ring-gray-200 opacity-60"
                      }`}
                    >
                      <span className={unlocked ? "" : "grayscale"}>
                        <AvatarRenderer
                          presetId={avatar.presetId}
                          equipped={{ [def.slot]: def.id }}
                          size={52}
                          label={def.name}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-extrabold text-gray-800">
                            {def.name}
                          </span>
                          {equipped && (
                            <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              装備中
                            </span>
                          )}
                          {!unlocked && (
                            <span className="shrink-0 text-xs" aria-hidden>
                              🔒
                            </span>
                          )}
                        </span>
                        {unlocked ? (
                          <span className="mt-0.5 block text-[11px] text-gray-500">
                            {def.description}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-[11px] font-semibold text-gray-500">
                            未解放・条件：{conditionLabel}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
