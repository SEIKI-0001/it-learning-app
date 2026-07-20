"use client";

// 達成演出のグローバルホスト（root layout に常駐）。
// lib/celebration.ts のイベントを購読し、
//   - 全画面系（ランクアップ > CP突破 > レベルアップ）: 1件ずつオーバーレイで表示
//   - ミニ系（XP獲得・ストリーク節目・ミッション達成）: 画面下部に短時間スタック
// で表示する。UnlockNoticeHost（bottom-24）とは高さをずらして重ねない。

import { useEffect, useRef, useState } from "react";
import type { Celebration } from "@/lib/celebration";
import { subscribeCelebration } from "@/lib/celebration";
import { RANKS } from "@/lib/rank";
import { getCheckpoint } from "@/lib/checkpoints";
import ConfettiBurst from "@/components/celebration/ConfettiBurst";

// 全画面演出の優先度（同時発火時はランクアップを最初に見せる）。
const FULL_PRIORITY: Record<string, number> = {
  rankUp: 3,
  cpCleared: 2,
  levelUp: 1,
};
const FULL_AUTO_ADVANCE_MS = 4000;
const MINI_DISMISS_MS = 3200;

type MiniItem = { id: number; celebration: Celebration };

/** 全画面オーバーレイに出す見出し・本文を組み立てる。 */
function fullContent(
  c: Celebration,
): { emoji: string; heading: string; title: string; sub: string } | null {
  switch (c.kind) {
    case "levelUp":
      return {
        emoji: "🎖️",
        heading: "レベルアップ！",
        title: `Lv.${c.level} ${c.name}`,
        sub: "学習の積み重ねが実を結びました",
      };
    case "rankUp": {
      const rank = RANKS.find((r) => r.id === c.rankId);
      if (!rank) return null;
      return {
        emoji: rank.emoji,
        heading: "ランクアップ！",
        title: rank.name,
        sub: "称号が新しくなりました",
      };
    }
    case "cpCleared": {
      const cp = getCheckpoint(c.cpId);
      return {
        emoji: cp.emoji,
        heading: "チェックポイント突破！",
        title: `CP${cp.order} ${cp.title}`,
        sub: "ロードマップが先へ進みました",
      };
    }
    default:
      return null;
  }
}

/** ミニトーストの1行テキストを組み立てる。 */
function miniText(c: Celebration): string | null {
  switch (c.kind) {
    case "xpGain":
      return `⚡ +${c.amount} XP`;
    case "streakMilestone":
      return `🔥 ${c.days}日連続達成！ +${c.rewardXp} XP${
        c.shieldGranted ? "・🛡️ おまもり獲得" : ""
      }`;
    case "questClear":
      return `🎁 ${c.label}`;
    case "badgeEarned":
      return `🏅「${c.label}」バッジ獲得！`;
    default:
      return null;
  }
}

export default function CelebrationHost() {
  const [fullQueue, setFullQueue] = useState<Celebration[]>([]);
  const [minis, setMinis] = useState<MiniItem[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeCelebration((batch) => {
      const fulls = batch
        .filter((c) => c.kind in FULL_PRIORITY)
        .sort((a, b) => (FULL_PRIORITY[b.kind] ?? 0) - (FULL_PRIORITY[a.kind] ?? 0));
      const rest = batch.filter((c) => !(c.kind in FULL_PRIORITY));
      if (fulls.length > 0) setFullQueue((q) => [...q, ...fulls]);
      if (rest.length > 0) {
        setMinis((m) => [
          ...m,
          ...rest.map((celebration) => ({ id: ++nextIdRef.current, celebration })),
        ]);
      }
    });
    return unsubscribe;
  }, []);

  // ミニトーストは一定時間で自動的に消す（先頭から順に減らす）。
  useEffect(() => {
    if (minis.length === 0) return;
    const timer = setTimeout(
      () => setMinis((m) => m.slice(1)),
      MINI_DISMISS_MS,
    );
    return () => clearTimeout(timer);
  }, [minis]);

  // 全画面演出は1件ずつ。タップ or 一定時間で次へ進む。
  const currentFull = fullQueue[0] ?? null;
  useEffect(() => {
    if (!currentFull) return;
    const timer = setTimeout(
      () => setFullQueue((q) => q.slice(1)),
      FULL_AUTO_ADVANCE_MS,
    );
    return () => clearTimeout(timer);
  }, [currentFull]);

  const full = currentFull ? fullContent(currentFull) : null;

  return (
    <>
      {full && (
        <div
          role="status"
          aria-live="assertive"
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-6"
          onClick={() => setFullQueue((q) => q.slice(1))}
        >
          <div className="animate-pop-in relative w-full max-w-sm rounded-xl bg-white px-6 py-10 text-center shadow-2xl">
            <ConfettiBurst />
            <p className="text-5xl" aria-hidden>
              {full.emoji}
            </p>
            <p className="mt-3 text-sm font-bold tracking-widest text-brand-500">
              {full.heading}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {full.title}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-500">{full.sub}</p>
            <p className="mt-6 text-xs font-semibold text-gray-400">
              タップで閉じる
            </p>
          </div>
        </div>
      )}

      {minis.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-40 z-40 flex flex-col items-center gap-2"
        >
          {minis.map(({ id, celebration }) => {
            const text = miniText(celebration);
            if (!text) return null;
            return (
              <p
                key={id}
                className="animate-pop-in rounded-full bg-gray-900/85 px-4 py-2 text-sm font-bold text-white shadow-lg"
              >
                {text}
              </p>
            );
          })}
        </div>
      )}
    </>
  );
}
