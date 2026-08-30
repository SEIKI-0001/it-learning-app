"use client";

// たからもの（欠片の可視化と称号への交換・GF-P1-005）。
//
// 要件書 §11「出口」: 欠片を可視化し、コスメ・称号・記念品等へ交換可能にする。
// 交換先は称号（表示テキスト）だけで、合格準備度・必須バッジ・CP進行・XP は
// 欠片で買えない。この画面はそれを文言でも明示する。

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PendingChoiceOption } from "@/types/checkpoint";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { getPendingChoice, resolveDropChoice } from "@/lib/badgeDrops";
import {
  equipTitle,
  exchangeTitle,
  fragmentLabel,
  getEarnedCommemoratives,
  getEquippedTitle,
  getFragments,
  listTitleAvailability,
} from "@/lib/rewardInventory";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import RewardChoiceCard from "@/components/rewards/RewardChoiceCard";
import RarityMark, { RARITY_FRAME_CLASS } from "@/components/rewards/RarityMark";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import type { AppState } from "@/types";

export default function RewardsPage() {
  const router = useRouter();
  const [state, setState] = useAppState();

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  if (state === undefined || state === null) return <LoadingScreen />;

  function persist(next: AppState) {
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, next.progress);
  }

  const pending = getPendingChoice(state);
  const fragments = getFragments(state);
  const titles = listTitleAvailability(state);
  const commemoratives = getEarnedCommemoratives(state);
  const equipped = getEquippedTitle(state);

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/more", label: "その他へ" }}
        title="たからもの"
        description="学習の途中で見つけたかけらと、交換できる称号です。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {pending && (
          <RewardChoiceCard
            choice={pending}
            onSelect={(option: PendingChoiceOption) =>
              persist(resolveDropChoice(state, option.id))
            }
          />
        )}

        <section aria-labelledby="fragments-heading">
          <h2 id="fragments-heading" className="text-base font-semibold text-gray-900">
            持っているかけら
          </h2>
          {fragments.length === 0 ? (
            <p className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
              まだかけらはありません。バッジを獲得したときに、おまけとして見つかります。
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-200 border-y border-gray-200">
              {fragments.map((fragment) => (
                <li
                  key={fragment.fragmentId}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-gray-800">
                    <Icon name="gift" className="h-4 w-4 shrink-0 text-brand-600" />
                    {fragmentLabel(fragment.fragmentId)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    ×{fragment.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {commemoratives.length > 0 && (
          <section aria-labelledby="commemoratives-heading">
            <h2 id="commemoratives-heading" className="text-base font-semibold text-gray-900">
              突破の記念
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              チェックポイントを突破した記録です。かけらは使いません。
            </p>
            <ul className="mt-2 space-y-2">
              {commemoratives.map((title) => (
                <li
                  key={title.id}
                  className={`rounded-xl bg-white p-3.5 ${RARITY_FRAME_CLASS[title.rarity]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{title.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{title.description}</p>
                    </div>
                    <RarityMark rarity={title.rarity} />
                  </div>
                  <div className="mt-2.5 flex justify-end">
                    {equipped?.id === title.id ? (
                      <span className="text-xs font-semibold text-brand-700">表示中</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => persist(equipTitle(state, title.id))}
                        className={buttonClass("secondary", "sm")}
                      >
                        表示する
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="titles-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="titles-heading" className="text-base font-semibold text-gray-900">
              称号と交換する
            </h2>
            {equipped && (
              <p className="shrink-0 text-xs text-gray-600">表示中：{equipped.label}</p>
            )}
          </div>

          <ul className="mt-2 space-y-2">
            {titles.map(({ title, unlocked, affordable, missing }) => (
              <li
                key={title.id}
                className={`rounded-xl bg-white p-3.5 ${RARITY_FRAME_CLASS[title.rarity]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{title.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{title.description}</p>
                  </div>
                  <RarityMark rarity={title.rarity} />
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs tabular-nums text-gray-600">
                    {title.cost
                      ? `${fragmentLabel(title.cost.fragmentId)} ×${title.cost.count}`
                      : "記念称号"}
                    {!unlocked && missing > 0 && `（あと${missing}）`}
                  </p>
                  {unlocked ? (
                    equipped?.id === title.id ? (
                      <span className="shrink-0 text-xs font-semibold text-brand-700">表示中</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => persist(equipTitle(state, title.id))}
                        className={buttonClass("secondary", "sm")}
                      >
                        表示する
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={() => persist(exchangeTitle(state, title.id))}
                      className={buttonClass("primary", "sm", affordable ? "" : "opacity-40")}
                    >
                      交換する
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-center text-xs leading-relaxed text-gray-500">
          称号は名乗るための飾りです。かけらで合格準備度・必須バッジ・チェックポイントの
          進みを買うことはできません。
        </p>

        <Link href="/today" className={buttonClass("secondary", "lg", "w-full justify-center")}>
          今日の学習に戻る
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
