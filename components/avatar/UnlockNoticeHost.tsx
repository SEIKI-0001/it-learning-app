"use client";

// バッジ獲得・装備解放のグローバルトースト（root layout に常駐）。
// lib/unlockNotice.ts のイベントを購読し、どの画面でも画面下部
// （BottomNav の上）に AvatarUnlockToast を数秒間だけ浮かせて表示する。

import { useEffect, useRef, useState } from "react";
import type { UnlockNotice } from "@/lib/unlockNotice";
import { subscribeUnlockNotice } from "@/lib/unlockNotice";
import { getAvatarItem } from "@/lib/avatarItems";
import type { AvatarItemDef } from "@/types/avatar";
import AvatarUnlockToast from "@/components/avatar/AvatarUnlockToast";

const AUTO_DISMISS_MS = 8000;

export default function UnlockNoticeHost() {
  const [notice, setNotice] = useState<UnlockNotice | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUnlockNotice((next) => {
      // 連続発火時は最新の通知で置き換え、表示時間を仕切り直す。
      setNotice(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setNotice(null), AUTO_DISMISS_MS);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!notice) return null;

  const items = notice.itemIds
    .map((id) => getAvatarItem(id))
    .filter((i): i is AvatarItemDef => !!i);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md"
    >
      <div className="relative rounded-2xl shadow-lg">
        <AvatarUnlockToast items={items} badgeLabels={notice.badgeLabels} />
        <button
          type="button"
          aria-label="通知を閉じる"
          onClick={() => setNotice(null)}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-amber-700/70 hover:bg-amber-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
