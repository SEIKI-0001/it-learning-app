"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { buildBadgeStatuses } from "@/lib/badges";
import { CHECKPOINTS, buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import { badgeActionHref } from "@/components/badges/BadgeList";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

// URLは既存の導線との互換で /badges を維持する。画面上はCPの学習条件として扱う。
export default function CheckpointConditionsPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  useBadgeSync(state, setState);
  useEffect(() => { if (state === null) router.replace("/onboarding"); }, [state, router]);
  if (!state) return <LoadingScreen />;

  const currentId = getCheckpointProgress(state).currentCheckpointId;
  const signals = getClientBadgeSignals();
  const checkpoints = CHECKPOINTS.filter((cp) => cp.order > 0).sort((a, b) =>
    Number(b.id === currentId) - Number(a.id === currentId) || a.order - b.order,
  );

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/plan", label: "学習計画" }}
        title="CP達成条件"
        description="各チェックポイントの突破試験に向けた学習条件です。"
      />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <p className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-600">
          ここで示す条件はCP進行に必要な学習内容です。モチットの<Link href="/avatar#collection" className="ml-1 text-brand-700 underline">バッジコレクション</Link>とは別に表示しています。
        </p>
        {checkpoints.map((cp) => {
          const gate = buildCheckpointGate(state, cp.id);
          const statuses = buildBadgeStatuses(state, signals, cp.id).filter((status) => status.def.requiredForGate);
          return (
            <section key={cp.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">CP{cp.order} {cp.title}{cp.id === currentId && <span className="ml-2 text-xs text-brand-700">いまここ</span>}</h2>
                <span className="text-sm tabular-nums text-gray-600">{gate.earnedRequiredCount}/{gate.requiredBadgeCount} 達成</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">すべての条件と分野の広がりなどを満たすと、突破試験が解放されます。</p>
              <ul className="mt-3 space-y-2">
                {statuses.map(({ def, earned, conditionMet }) => (
                  <li key={def.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <Icon name={earned ? "circle-check" : conditionMet ? "circle-dot" : "lock"} className={`mt-0.5 h-4 w-4 shrink-0 ${earned ? "text-emerald-600" : "text-gray-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                      <p className="mt-0.5 text-xs text-gray-600">{def.conditionLabel}</p>
                      <p className="mt-1 text-xs text-gray-500">{earned ? "達成済み" : conditionMet ? "条件達成 · 次の学習後に反映" : "未達成"}</p>
                    </div>
                    {!earned && <Link href={badgeActionHref(def)} className="shrink-0 text-xs font-semibold text-brand-700 underline">取り組む</Link>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <BottomNav />
    </main>
  );
}
