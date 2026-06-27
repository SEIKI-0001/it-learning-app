"use client";

// バナー(進捗ヘッダー)用のコンパクトな実績バッジ表示。
// 全バッジを小さな丸で横1列に並べ、獲得=絵文字/未獲得=🔒(淡色)で区別。
// 獲得数カウントで「あと何個」も分かる。インディゴ背景に載るので白基調。

import type { AppState } from "@/types";
import { evaluateAchievements } from "@/lib/achievements";

export default function AchievementStrip({ state }: { state: AppState }) {
  const achievements = evaluateAchievements(state);
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-white/80">実績バッジ</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold">
          🏅 {earnedCount}/{achievements.length}
        </span>
      </div>
      <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {achievements.map((a) => (
          <span
            key={a.id}
            title={
              a.earned
                ? `${a.label}：獲得済み`
                : `${a.label}：${a.description}`
            }
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
              a.earned ? "bg-white/20" : "bg-white/5 opacity-40"
            }`}
          >
            {a.earned ? a.emoji : "🔒"}
          </span>
        ))}
      </div>
    </div>
  );
}
