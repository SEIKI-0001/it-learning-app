"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { getMochitGrowthStage, getMochitUnlockSummary, MOCHIT_GROWTH_STAGE_LABELS, nextMochitGrowthStageInfo } from "@/lib/mochit";
import { getCheckpointProgress } from "@/lib/checkpoints";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { buildBadgeStatuses } from "@/lib/badges";
import { badgeIcon } from "@/lib/badgeIcons";
import Mochit from "@/components/mochit/Mochit";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

export default function AvatarPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  useBadgeSync(state, setState);
  useEffect(() => { if (state === null) router.replace("/onboarding"); }, [router, state]);
  const badges = useMemo(() => state ? buildBadgeStatuses(state, getClientBadgeSignals()).filter((badge) => badge.earned) : [], [state]);
  if (!state) return <LoadingScreen />;
  const stage = getMochitGrowthStage(state);
  const nextStage = nextMochitGrowthStageInfo(state);
  const summary = getMochitUnlockSummary(state);
  const cp = getCheckpointProgress(state);
  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/today", label: "今日の学習" }}
        title="モチット"
        description="学びをそっと案内する相棒"
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {/* 成長段階＝この画面で唯一の強調ブロック */}
        <section className="rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-4 text-center">
          <div className="flex justify-center">
            <Mochit state="normal" size="large" animation="idle" growthStage={stage} />
          </div>
          <p className="mt-2 text-xs font-semibold text-brand-700">成長段階</p>
          <p className="mt-0.5 text-[15px] font-semibold text-gray-900">
            {MOCHIT_GROWTH_STAGE_LABELS[stage]}
          </p>
          <p className="mt-1 text-xs tabular-nums text-gray-600">
            チェックポイント {summary.clearedCheckpointCount}回クリア・バッジ{" "}
            {summary.earnedBadgeCount}個
          </p>
          <p className="mt-3 text-sm text-gray-700">
            {nextStage
              ? `次の成長条件：${nextStage.conditionLabel}`
              : "すべての成長段階を解放済み"}
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">解放済みの記録</h2>
          <p className="mt-1 text-sm text-gray-600">
            知識コアの点灯と成長は、クリア済みチェックポイントで保たれます。
          </p>
          <p className="mt-3 text-sm font-semibold text-brand-700">
            現在地：{cp.currentCheckpointId.toUpperCase()}
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">獲得済みバッジ</h2>
          {badges.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {badges.map(({ def }) => (
                <li
                  key={def.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                >
                  <Icon name={badgeIcon(def.id)} className="h-3.5 w-3.5" />
                  {def.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              最初のバッジを目指して、今日の学習から始めよう。
            </p>
          )}
          <Link
            href="/badges"
            className="mt-4 inline-flex items-center gap-1 text-sm text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
          >
            バッジ一覧を見る
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
