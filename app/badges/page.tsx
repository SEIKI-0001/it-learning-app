"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { buildBadgeStatuses, selectNextBadges } from "@/lib/badges";
import type { BadgeStatus } from "@/types/checkpoint";
import {
  CHECKPOINTS,
  buildCheckpointGate,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import BadgeList, { badgeActionHref } from "@/components/badges/BadgeList";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

// /badges = バッジ一覧。チェックポイント別に、獲得済み／未獲得（ロック）を
// 必須／任意の区別・獲得条件つきで表示する。獲得条件は隠さない。

export default function BadgesPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  useBadgeSync(state, setState);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  // 単語帳の進捗は AppState 外（別 localStorage）なので毎レンダー読み直す。
  const signals = getClientBadgeSignals();
  const allStatuses = useMemo(
    () => (state ? buildBadgeStatuses(state, signals) : []),
    [state, signals],
  );

  if (state === undefined || state === null) {
    return <LoadingScreen />;
  }

  const earnedCount = allStatuses.filter((s) => s.earned).length;
  const totalCount = allStatuses.length;
  const cpProgress = getCheckpointProgress(state);
  const currentId = cpProgress.currentCheckpointId;

  // cp0 はバッジ無し。バッジを持つ CP のみ表示。
  const checkpoints = CHECKPOINTS.filter((c) => c.order >= 1);

  // 一覧の並び: 未獲得の必須（条件達成間近を先）→ 未獲得の任意 → 獲得済み。
  const sortStatuses = (list: BadgeStatus[]): BadgeStatus[] =>
    [...list].sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? 1 : -1;
      if (a.def.requiredForGate !== b.def.requiredForGate) {
        return a.def.requiredForGate ? -1 : 1;
      }
      return Number(b.conditionMet) - Number(a.conditionMet);
    });

  // 「次に狙うべきバッジ」= 現在CPの未獲得バッジの最優先（選定は共通ロジックに一本化）。
  const recommended = selectNextBadges(
    buildBadgeStatuses(state, signals, currentId),
    1,
  )[0];

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-brand-700 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-3xl">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">バッジ図鑑</span>
            <Link
              href="/plan"
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
            >
              🗺️ ロードマップ
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/80">獲得したバッジ</p>
          <p className="text-3xl font-bold">
            {earnedCount}
            <span className="text-lg font-bold text-white/70"> / {totalCount}</span>
          </p>
          <p className="mt-1 text-xs text-white/80">
            バッジを集めると最終問題が解放され、次のチェックポイントへ進めます。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-6 md:max-w-3xl">
        {/* 凡例: バッジの状態と種別の見分け方 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl bg-white px-4 py-3 text-[11px] font-semibold ring-1 ring-gray-100">
          <span className="text-emerald-600">● 獲得済み</span>
          <span className="text-amber-600">● あと一歩</span>
          <span className="text-gray-400">🔒 未獲得</span>
          <span className="text-rose-600">必須＝最終問題の解放に必要</span>
          <span className="text-gray-500">任意＝追加報酬</span>
        </div>

        {/* 次に狙うべきバッジ（現在CPの最優先の1件） */}
        {recommended && (
          <Link
            href={badgeActionHref(recommended.def)}
            className="block rounded-xl bg-brand-700 p-4 text-white shadow-sm transition active:scale-[0.99]"
          >
            <p className="text-[11px] font-bold text-white/80">
              🎯 次に狙うバッジ
            </p>
            <p className="mt-1 text-base font-bold">
              {recommended.def.emoji} {recommended.def.label}
              {recommended.def.requiredForGate && (
                <span className="ml-1.5 rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold">
                  必須
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-white/90">
              🎯 {recommended.def.conditionLabel}
            </p>
            <span className="mt-2 inline-block text-xs font-bold text-white/90">
              挑戦しにいく →
            </span>
          </Link>
        )}

        {checkpoints.map((cp) => {
          const statuses = sortStatuses(buildBadgeStatuses(state, signals, cp.id));
          const earned = statuses.filter((s) => s.earned).length;
          // 必須バッジの充足はゲート判定と同一ソースにする（GateCard と数値がズレない）。
          const gate = buildCheckpointGate(state, cp.id);
          const isCleared = cpProgress.clearedCheckpointIds.includes(cp.id);
          const isCurrent = currentId === cp.id;

          return (
            <section
              key={cp.id}
              className={isCleared ? "opacity-80" : undefined}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
                  <span aria-hidden>{cp.emoji}</span>
                  CP{cp.order} {cp.title}
                  {isCleared && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      ✓ クリア済み
                    </span>
                  )}
                  {isCurrent && !isCleared && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      いまここ
                    </span>
                  )}
                </h2>
                <span className="text-xs font-bold text-gray-400">
                  {earned}/{statuses.length}
                </span>
              </div>
              <p className="mb-3 text-xs font-semibold text-gray-500">
                必須バッジ {gate.earnedRequiredCount}/{gate.requiredBadgeCount}{" "}
                獲得（{gate.requiredBadgeCount} 個で最終問題が解放）
              </p>
              <BadgeList
                statuses={statuses}
                recommendedId={isCurrent ? recommended?.def.id : undefined}
              />
            </section>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
