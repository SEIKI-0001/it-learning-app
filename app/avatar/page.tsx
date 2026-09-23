"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppState } from "@/types";
import type { PendingChoiceOption } from "@/types/checkpoint";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { getMochitGrowthStage, MOCHIT_GROWTH_STAGE_LABELS, nextMochitGrowthStageInfo } from "@/lib/mochit";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { buildBadgeStatuses } from "@/lib/badges";
import { badgeIcon } from "@/lib/badgeIcons";
import { getRankStatus } from "@/lib/rank";
import { getPendingChoice, resolveDropChoice } from "@/lib/badgeDrops";
import {
  ALL_TITLES, equipTitle, exchangeTitle, fragmentLabel, getEquippedTitle,
  getFragments, getUnlockedTitleIds, listTitleAvailability,
} from "@/lib/rewardInventory";
import Mochit from "@/components/mochit/Mochit";
import MochitNameForm from "@/components/mochit/MochitNameForm";
import { getMochitDisplayName } from "@/lib/mochitName";
import { saveAppState } from "@/lib/storage";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import FloatingMochitVisibilityControl from "@/components/mochit/FloatingMochitVisibilityControl";
import RewardChoiceCard from "@/components/rewards/RewardChoiceCard";
import RankCard from "@/components/progress/RankCard";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

export default function AvatarPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  useBadgeSync(state, setState);
  useEffect(() => { if (state === null) router.replace("/onboarding"); }, [router, state]);
  const collection = useMemo(
    () => state ? buildBadgeStatuses(state, getClientBadgeSignals()).filter((badge) => !badge.def.requiredForGate) : [],
    [state],
  );
  if (!state) return <LoadingScreen />;

  const stage = getMochitGrowthStage(state);
  const nextStage = nextMochitGrowthStageInfo(state);
  const rank = getRankStatus(state.progress.exp);
  const equipped = getEquippedTitle(state);
  const unlocked = new Set(getUnlockedTitleIds(state));
  const availability = new Map(listTitleAvailability(state).map((entry) => [entry.title.id, entry]));
  const fragments = getFragments(state);
  const pending = getPendingChoice(state);
  const earnedCollection = collection.filter((badge) => badge.earned);
  const displayName = getMochitDisplayName(state);
  const persist = (next: AppState) => {
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) void saveProgressToDb(userId, next.progress);
  };

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/today", label: "今日の学習" }}
        title={`${displayName}のプロフィール`}
        description="学習を続けると、相棒のモチットも育ちます。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <p className="rounded-xl border border-brand-200 bg-white p-3 text-sm text-gray-700">
          合格に向けた実力は<Link href="/progress" className="ml-1 font-semibold text-brand-700 underline">合格準備度</Link>で確認できます。ここはモチットの成長と思い出の記録です。
        </p>
        <MochitNameForm state={state} onChange={persist} />

        <section id="growth" className="rounded-xl bg-brand-50 p-5 text-center">
          <div className="flex justify-center">
            <Mochit state="normal" size="large" animation="idle" growthStage={stage} />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">{displayName} Lv.{rank.level}</p>
          <p className="mt-1 text-sm font-semibold text-brand-700">モチットランク：{rank.current.name}</p>
          <p className="mt-1 text-sm text-gray-700">装備中の称号：{equipped?.label ?? "なし"}</p>
          <p className="mt-3 text-xs text-gray-600">見た目：{MOCHIT_GROWTH_STAGE_LABELS[stage]}{nextStage ? ` · 次は${nextStage.conditionLabel}` : " · すべて解放済み"}</p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">次のランクまで</h2>
          {rank.next ? (
            <>
              <p className="mt-2 text-sm text-gray-700">Lv.{rank.next.minLevel}で「{rank.next.name}」 · あと{rank.remaining} XP</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label="次のモチットランクまで" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rank.ratio * 100)}>
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.round(rank.ratio * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">Lvが上がるとランクも節目で変わります。</p>
            </>
          ) : <p className="mt-2 text-sm text-gray-700">最高ランクに到達しました。Lvはこれからも上がります。</p>}
          <details className="mt-4 text-sm text-brand-700">
            <summary className="cursor-pointer font-semibold">すべてのランクを見る</summary>
            <div className="mt-3"><RankCard exp={state.progress.exp} /></div>
          </details>
        </section>

        {pending && <RewardChoiceCard choice={pending} onSelect={(option: PendingChoiceOption) => persist(resolveDropChoice(state, option.id))} />}

        <section id="titles" className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">モチットの称号</h2>
          <p className="mt-1 text-sm text-gray-600">アンロックした称号を選んでモチットに装備できます。学習評価には影響しません。</p>
          <p className="mt-3 text-sm font-semibold text-brand-700">装備中：{equipped?.label ?? "なし"}</p>
          {equipped && <button type="button" className="mt-2 text-xs text-gray-600 underline" onClick={() => persist(equipTitle(state, null))}>称号を外す</button>}
          <h3 className="mt-5 text-sm font-semibold text-gray-900">称号一覧</h3>
          <ul className="mt-2 space-y-2">
            {ALL_TITLES.map((title) => {
              const owned = unlocked.has(title.id);
              const entry = availability.get(title.id);
              return (
                <li key={title.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{title.label}</p>
                    <p className="mt-0.5 text-xs text-gray-600">{title.description}</p>
                    {!owned && <p className="mt-1 text-xs text-gray-500">{title.milestoneCheckpointId ? "チェックポイント突破でアンロック" : title.cost ? `${fragmentLabel(title.cost.fragmentId)} ×${title.cost.count}${entry?.missing ? `（あと${entry.missing}）` : ""}` : "未アンロック"}</p>}
                  </div>
                  {owned ? equipped?.id === title.id ? (
                    <span className="text-xs font-semibold text-brand-700">装備中</span>
                  ) : (
                    <button type="button" className={buttonClass("secondary", "sm")} onClick={() => persist(equipTitle(state, title.id))}>装備する</button>
                  ) : title.cost ? (
                    <button type="button" disabled={!entry?.affordable} className={buttonClass("secondary", "sm", entry?.affordable ? "" : "opacity-40")} onClick={() => persist(exchangeTitle(state, title.id))}>交換する</button>
                  ) : <span className="text-xs text-gray-500">未解放</span>}
                </li>
              );
            })}
          </ul>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-gray-700">持っているかけら</summary>
            {fragments.length ? <ul className="mt-2 space-y-1 text-gray-600">{fragments.map((fragment) => <li key={fragment.fragmentId}>{fragmentLabel(fragment.fragmentId)} ×{fragment.count}</li>)}</ul> : <p className="mt-2 text-gray-500">まだかけらはありません。</p>}
          </details>
        </section>

        <section id="collection" className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">モチットのバッジコレクション</h2>
          <p className="mt-1 text-sm text-gray-600">獲得バッジ {earnedCollection.length} / {collection.length}。学習の思い出として集まります。CPの突破条件は<Link href="/badges" className="ml-1 text-brand-700 underline">CP達成条件</Link>で確認できます。</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {collection.map(({ def, earned }) => (
              <li key={def.id} className={`rounded-lg border p-3 ${earned ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Icon name={earned ? badgeIcon(def.id) : "lock"} className="h-4 w-4 shrink-0" />{def.label}</p>
                <p className="mt-1 text-xs text-gray-600">{earned ? "獲得済み" : `獲得条件：${def.conditionLabel}`}</p>
              </li>
            ))}
          </ul>
        </section>

        <FloatingMochitVisibilityControl />
      </div>
      <BottomNav />
    </main>
  );
}
