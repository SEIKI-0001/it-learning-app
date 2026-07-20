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
import Mochit from "@/components/mochit/Mochit";
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
  return <main className="min-h-screen bg-gray-50 pb-24">
    <header className="bg-brand-600 px-4 pb-4 pt-4 text-white"><div className="mx-auto w-full max-w-md md:max-w-2xl"><Link href="/today" className="text-xs font-semibold text-white/80">← 今日の学習</Link><p className="mt-1 text-lg font-bold">モチット</p><p className="text-xs font-semibold text-white/80">学びをそっと案内する相棒</p></div></header>
    <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-2xl">
      <section className="rounded-xl bg-white p-5 text-center border border-gray-200"><div className="flex justify-center"><Mochit state="normal" size="large" animation="idle" growthStage={stage} /></div><p className="mt-2 text-base font-bold text-gray-800">成長段階：{MOCHIT_GROWTH_STAGE_LABELS[stage]}</p><p className="mt-1 text-xs font-semibold text-gray-500">チェックポイント {summary.clearedCheckpointCount}回クリア・バッジ {summary.earnedBadgeCount}個</p>{nextStage ? <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">次の成長条件：{nextStage.conditionLabel}</p> : <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">すべての成長段階を解放済み</p>}</section>
      <section className="rounded-xl bg-white p-5 border border-gray-200"><h2 className="text-base font-bold text-gray-800">解放済みの記録</h2><p className="mt-1 text-sm text-gray-500">知識コアの点灯と成長は、クリア済みチェックポイントで保たれます。</p><p className="mt-3 text-sm font-bold text-sky-700">現在地：{cp.currentCheckpointId.toUpperCase()}</p></section>
      <section className="rounded-xl bg-white p-5 border border-gray-200"><h2 className="text-base font-bold text-gray-800">獲得済みバッジ</h2>{badges.length ? <ul className="mt-3 flex flex-wrap gap-2">{badges.map(({ def }) => <li key={def.id} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">{def.emoji} {def.label}</li>)}</ul> : <p className="mt-2 text-sm text-gray-500">最初のバッジを目指して、今日の学習から始めよう。</p>}<Link href="/badges" className="mt-4 block text-center text-sm font-bold text-brand-600 underline underline-offset-2">バッジ一覧を見る →</Link></section>
    </div><BottomNav />
  </main>;
}
