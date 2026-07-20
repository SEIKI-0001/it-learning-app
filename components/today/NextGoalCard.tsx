"use client";

// 「あと少し」ネクストゴールカード。上位2件をプログレスバーで見せて
// 目標勾配（ゴールが近いほど頑張れる）を作る。/today と /progress に置く。

import Link from "next/link";
import type { AppState } from "@/types";
import { buildNextGoals } from "@/lib/nextGoals";

export default function NextGoalCard({ state }: { state: AppState }) {
  const goals = buildNextGoals(state).slice(0, 2);
  if (goals.length === 0) return null;

  return (
    <section>
      <h3 className="text-xs font-semibold text-gray-500">あと少しのゴール</h3>
      <ul className="mt-2.5 space-y-3">
        {goals.map((g) => {
          const pct = Math.round(Math.min(1, Math.max(0, g.ratio)) * 100);
          return (
            <li key={`${g.kind}-${g.label}`}>
              <Link href={g.href} className="block">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-gray-700">{g.label}</p>
                  <p className="shrink-0 text-xs font-semibold tabular-nums text-brand-700">
                    {g.detail}
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
