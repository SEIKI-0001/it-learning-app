"use client";

import Link from "next/link";
import type { AppState } from "@/types";
import type { BadgeSignals } from "@/lib/badges";
import { buildBadgeStatuses } from "@/lib/badges";
import {
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
} from "@/lib/checkpoints";

// /today 用: 「今日取れるバッジ」「ロードマップへの効果」「最終問題の解放通知」
//   「欠片」を1枚にまとめて見せる。学習の“なぜ”を今日の画面から見えるようにする。

export default function BadgeProgressCard({
  state,
  signals,
}: {
  state: AppState;
  signals?: BadgeSignals;
}) {
  const cpProgress = getCheckpointProgress(state);
  const currentId = cpProgress.currentCheckpointId;
  const checkpoint = getCheckpoint(currentId);
  const gate = buildCheckpointGate(state, currentId);

  // 現在CPの未獲得バッジ（必須優先）。条件に近いものから見せる。
  const statuses = buildBadgeStatuses(state, signals, currentId).filter(
    (s) => !s.earned && s.def.category !== "final",
  );
  const earnable = statuses
    .sort((a, b) => {
      // 必須優先 → 条件達成間近（conditionMet）優先。
      if (a.def.requiredForGate !== b.def.requiredForGate) {
        return a.def.requiredForGate ? -1 : 1;
      }
      return Number(b.conditionMet) - Number(a.conditionMet);
    })
    .slice(0, 3);

  const remaining = Math.max(
    0,
    gate.requiredBadgeCount - gate.earnedRequiredCount,
  );
  const fragmentTotal = cpProgress.badgeFragments.reduce(
    (s, f) => s + f.count,
    0,
  );

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
          <span aria-hidden>🏅</span>
          今日取れるバッジ
        </p>
        <Link
          href="/badges"
          className="text-xs font-bold text-indigo-600 underline underline-offset-2"
        >
          バッジ一覧
        </Link>
      </div>

      {/* 最終問題の解放通知 */}
      {gate.finalExamUnlocked && !gate.finalExamPassed && (
        <Link
          href={`/checkpoint/${checkpoint.id}/final`}
          className="mt-3 block rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200"
        >
          <p className="text-sm font-extrabold text-emerald-700">
            🔓 最終問題が解放されました！
          </p>
          <p className="mt-0.5 text-xs font-semibold text-emerald-600">
            {checkpoint.title}の最終問題に挑戦 → {checkpoint.winConditionLabel}
          </p>
        </Link>
      )}

      {earnable.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {earnable.map((s) => (
            <li
              key={s.def.id}
              className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-800">
                  {s.def.emoji} {s.def.label}
                </span>
                {s.def.requiredForGate ? (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                    必須
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                    任意
                  </span>
                )}
                {s.conditionMet && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    あと一歩
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold text-gray-600">
                🎯 {s.def.conditionLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-indigo-600">
                {s.def.requiredForGate
                  ? "→ 最終問題の解放に前進します"
                  : `→ +${s.def.xp} XP の追加報酬`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
          このチェックポイントの必須バッジは獲得済みです。最終問題へ進みましょう。
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          次のCPまで 必須バッジ残り {remaining}
        </span>
        {fragmentTotal > 0 && (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            🔹 欠片 {fragmentTotal}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        確認問題をクリアすると条件を満たしたバッジを獲得し、まれに追加ドロップ（欠片・宝箱）も発生します。
      </p>
    </section>
  );
}
