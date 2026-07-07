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
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <h2 className="text-sm font-extrabold text-gray-800">🎯 あと少しのゴール</h2>
      <ul className="mt-3 space-y-3">
        {goals.map((g) => {
          const pct = Math.round(Math.min(1, Math.max(0, g.ratio)) * 100);
          return (
            <li key={`${g.kind}-${g.label}`}>
              <Link href={g.href} className="block">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-gray-700">
                    <span aria-hidden>{g.emoji}</span> {g.label}
                  </p>
                  <p className="shrink-0 text-xs font-extrabold text-indigo-600">
                    {g.detail}
                  </p>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-700"
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
