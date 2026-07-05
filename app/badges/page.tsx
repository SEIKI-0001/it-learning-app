"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { buildBadgeStatuses } from "@/lib/badges";
import {
  CHECKPOINTS,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import BadgeList from "@/components/badges/BadgeList";
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

  // cp0 はバッジ無し。バッジを持つ CP のみ表示。
  const checkpoints = CHECKPOINTS.filter((c) => c.order >= 1);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-3xl">
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold">バッジ図鑑</span>
            <Link
              href="/plan"
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
            >
              🗺️ ロードマップ
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/80">獲得したバッジ</p>
          <p className="text-3xl font-extrabold">
            {earnedCount}
            <span className="text-lg font-bold text-white/70"> / {totalCount}</span>
          </p>
          <p className="mt-1 text-xs text-white/80">
            バッジを集めると最終問題が解放され、次のチェックポイントへ進めます。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-6 md:max-w-3xl">
        {checkpoints.map((cp) => {
          const statuses = buildBadgeStatuses(state, signals, cp.id);
          const earned = statuses.filter((s) => s.earned).length;
          const requiredTotal = statuses.filter(
            (s) => s.def.requiredForGate,
          ).length;
          const requiredEarned = statuses.filter(
            (s) => s.def.requiredForGate && s.earned,
          ).length;
          const isCleared = cpProgress.clearedCheckpointIds.includes(cp.id);
          const isCurrent = cpProgress.currentCheckpointId === cp.id;

          return (
            <section key={cp.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-800">
                  <span aria-hidden>{cp.emoji}</span>
                  CP{cp.order} {cp.title}
                  {isCleared && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      クリア済み
                    </span>
                  )}
                  {isCurrent && !isCleared && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      いまここ
                    </span>
                  )}
                </h2>
                <span className="text-xs font-bold text-gray-400">
                  {earned}/{statuses.length}
                </span>
              </div>
              <p className="mb-3 text-xs font-semibold text-gray-500">
                必須バッジ {requiredEarned}/{requiredTotal} 獲得（
                {cp.requiredBadgeCount} 個で最終問題が解放）
              </p>
              <BadgeList statuses={statuses} />
            </section>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
