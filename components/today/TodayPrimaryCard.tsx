"use client";

// `/today` ファーストビューの「今日の最優先」カード（GF-P0-001 / GF-P0-002）。
//
// 視覚階層は要件書 §9.2 のフィードバック優先順位に合わせる。上から順に
//   1. 種別 + タイトル + 所要時間 …「今やること」「何分」
//   2. 推奨理由              …「なぜ」
//   3. 進むもの（ActionImpact）…「何が進む」= 学習成果
//   4. 開始CTA（この画面で唯一の Primary ボタン）
//   5. XP                    … 補助報酬。学習成果より下に置く
// XP を 3 より上へ動かさないこと（AC「学習効果情報が XP/宝箱より上位の視覚階層」）。

import Link from "next/link";
import type { ActionImpact, TodayPrimaryAction } from "@/types/gameful";
import { TODAY_PRIMARY_KIND_LABELS } from "@/types/gameful";
import Icon, { type IconName } from "@/components/ui/Icon";

const KIND_ICONS: Record<TodayPrimaryAction["kind"], IconName> = {
  final_exam: "target",
  review: "rotate",
  weak: "alert",
  new_topic: "book-open",
};

const IMPACT_ICONS: Record<ActionImpact["kind"], IconName> = {
  review_queue: "rotate",
  weak_remeasure: "target",
  required_badge: "award",
  checkpoint: "map",
  evidence: "chart",
};

const CTA_LABELS: Record<TodayPrimaryAction["kind"], string> = {
  final_exam: "突破試験に挑戦する",
  review: "復習を始める",
  weak: "弱点の克服を始める",
  new_topic: "学習を始める",
};

export default function TodayPrimaryCard({
  action,
  impacts,
  maxXp,
}: {
  action: TodayPrimaryAction;
  impacts: ActionImpact[];
  /** 全問正解時の最大XP。算出できないときは null（表示しない）。 */
  maxXp: number | null;
}) {
  const sizeLabel =
    action.estimatedMinutes !== null
      ? `約${action.estimatedMinutes}分`
      : action.questionCount !== null
        ? `全${action.questionCount}問`
        : null;

  return (
    <section
      aria-labelledby="today-primary-heading"
      className="mt-4 rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p id="today-primary-heading" className="text-xs font-semibold text-brand-700">
          今日の最優先
        </p>
        <p className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700">
          <Icon name={KIND_ICONS[action.kind]} className="h-3.5 w-3.5" />
          {TODAY_PRIMARY_KIND_LABELS[action.kind]}
        </p>
      </div>

      {/* 1. 何をやるか・どれくらいか */}
      <h2 className="mt-1 text-[17px] font-bold leading-snug text-gray-900">{action.title}</h2>
      {sizeLabel && (
        <p className="mt-0.5 flex items-center gap-1 text-sm tabular-nums text-gray-600">
          <Icon name="clock" className="h-3.5 w-3.5 text-gray-500" />
          {sizeLabel}
        </p>
      )}

      {/* 2. なぜこれなのか */}
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{action.reasonLabel}</p>

      {/* 3. 完了すると何が進むか（学習成果。XPより上位に置く） */}
      {impacts.length > 0 && (
        <div className="mt-3 rounded-md border border-brand-200/70 bg-white/70 px-3 py-2.5">
          <p className="text-xs font-semibold text-gray-600">これが進みます</p>
          <ul className="mt-1.5 space-y-1">
            {impacts.map((impact) => (
              <li key={impact.kind} className="flex items-start gap-1.5 text-sm text-gray-800">
                <Icon
                  name={IMPACT_ICONS[impact.kind]}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600"
                />
                <span className="leading-snug">{impact.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. この画面で唯一の Primary CTA */}
      <Link
        href={action.href}
        className="mt-3 flex w-full items-center justify-between rounded-lg bg-brand-600 px-5 py-3 text-white transition hover:bg-brand-700 active:scale-[0.99]"
      >
        <span className="text-base font-semibold">{CTA_LABELS[action.kind]}</span>
        <Icon name="arrow-right" className="ml-3 h-5 w-5 shrink-0" />
      </Link>

      {/* 5. 補助報酬。学習成果の後に、小さく。 */}
      {maxXp !== null && (
        <p className="mt-2 text-center text-xs tabular-nums text-gray-500">
          全問正解で +{maxXp} XP
        </p>
      )}
    </section>
  );
}
