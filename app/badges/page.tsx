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
import { badgeIcon, checkpointIcon } from "@/lib/badgeIcons";
import BadgeList, { badgeActionHref } from "@/components/badges/BadgeList";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
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
    <main className="min-h-screen pb-24">
      <PageHeader
        title="バッジ図鑑"
        description="バッジを集めると突破試験が解放され、次のチェックポイントへ進めます。"
        accessory={
          <Link
            href="/plan"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition hover:text-brand-800"
          >
            <Icon name="map" className="h-3.5 w-3.5" />
            ロードマップ
          </Link>
        }
      >
        <div className="mt-4 border-y border-gray-200 py-3">
          <p className="text-xs text-gray-600">獲得したバッジ</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
            {earnedCount}
            <span className="ml-0.5 text-sm font-normal text-gray-500">
              {" "}/ {totalCount}
            </span>
          </p>
        </div>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6">
        {/* 凡例: バッジの状態と種別の見分け方 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-700">
            <Icon name="circle-check" className="h-3.5 w-3.5" />
            獲得済み
          </span>
          <span className="flex items-center gap-1 text-accent-700">
            <Icon name="circle-dot" className="h-3.5 w-3.5" />
            あと一歩
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <Icon name="lock" className="h-3.5 w-3.5" />
            未獲得
          </span>
          <span className="font-semibold text-brand-700">
            必須＝突破試験の解放に必要
          </span>
          <span className="text-gray-500">任意＝追加報酬</span>
        </div>

        {/* 次に狙うべきバッジ（現在CPの最優先の1件）＝この画面で唯一の強調ブロック */}
        {recommended && (
          <Link
            href={badgeActionHref(recommended.def)}
            className="group block rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-4 transition hover:bg-brand-100 active:scale-[0.99]"
          >
            <p className="text-xs font-semibold text-brand-700">次に狙うバッジ</p>
            <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold leading-snug text-gray-900">
              <Icon
                name={badgeIcon(recommended.def.id)}
                className="h-5 w-5 shrink-0 text-brand-500"
              />
              {recommended.def.label}
              {recommended.def.requiredForGate && (
                <span className="rounded-full border border-brand-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                  必須
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {recommended.def.conditionLabel}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
              挑戦しにいく
              <Icon
                name="arrow-right"
                className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
              />
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
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Icon
                    name={checkpointIcon(cp.id)}
                    className={`h-4 w-4 shrink-0 ${
                      isCleared
                        ? "text-emerald-600"
                        : isCurrent
                          ? "text-brand-500"
                          : "text-gray-500"
                    }`}
                  />
                  CP{cp.order} {cp.title}
                  {isCleared && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <Icon name="check" className="h-3 w-3" />
                      クリア済み
                    </span>
                  )}
                  {isCurrent && !isCleared && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      いまここ
                    </span>
                  )}
                </h2>
                <span className="shrink-0 text-xs tabular-nums text-gray-500">
                  {earned}/{statuses.length}
                </span>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                必須バッジ {gate.earnedRequiredCount}/{gate.requiredBadgeCount}{" "}
                獲得（{gate.requiredBadgeCount} 個で突破試験が解放）
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
