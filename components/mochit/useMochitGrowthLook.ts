"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getMochitGrowthLook, type MochitGrowthLook } from "@/lib/mochit";
import { subscribeCelebration } from "@/lib/celebration";
import { loadAppState } from "@/lib/storage";

function readLook(): MochitGrowthLook | null {
  const state = loadAppState();
  return state ? getMochitGrowthLook(state) : null;
}

function lookKey(look: MochitGrowthLook | null): string {
  return look ? `${look.stage}|${look.fieldLevels.join(",")}|${look.personality}` : "";
}

/**
 * 保存済みの学習状態から、常駐モチットの成長の見た目を読む。
 * 学習の保存は各画面が行うので、画面遷移・お祝い演出・タブ復帰のたびに読み直す
 * （保存より先に通知が来ることがあるので、次のタスクで読む）。
 */
export function useMochitGrowthLook(): MochitGrowthLook | null {
  const pathname = usePathname();
  const [look, setLook] = useState<MochitGrowthLook | null>(readLook);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const next = readLook();
        setLook((prev) => (lookKey(prev) === lookKey(next) ? prev : next));
      }, 0);
    };
    refresh();
    const unsubscribe = subscribeCelebration(refresh);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer !== null) clearTimeout(timer);
      unsubscribe();
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return look;
}
