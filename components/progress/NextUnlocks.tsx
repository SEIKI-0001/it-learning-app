// 「次の解放」。既存仕様に実在する解放だけを罫線行で示す:
// 次のランク(XP) / チェックポイント突破試験(必須バッジ) / モチットの次の成長段階。
// 架空の解放要素・ダミー報酬は置かない。

import Link from "next/link";
import type { AppState } from "@/types";
import { getRankStatus } from "@/lib/rank";
import {
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import { nextMochitGrowthStageInfo, MOCHIT_GROWTH_STAGE_LABELS } from "@/lib/mochit";
import Icon, { type IconName } from "@/components/ui/Icon";

function UnlockRow({
  icon,
  title,
  detail,
  href,
  ratio,
}: {
  icon: IconName;
  title: string;
  detail: string;
  href: string;
  ratio?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 py-3 transition hover:bg-gray-50 active:bg-gray-100"
    >
      <Icon name={icon} className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-gray-900">{title}</span>
        <span className="mt-0.5 block text-xs tabular-nums text-gray-500">{detail}</span>
        {ratio !== undefined && (
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-gray-100">
            <span
              className="block h-full rounded-full bg-brand-600"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
            />
          </span>
        )}
      </span>
      <Icon
        name="chevron-right"
        className="mt-1 h-4 w-4 shrink-0 text-gray-200 transition group-hover:text-gray-400"
      />
    </Link>
  );
}

export default function NextUnlocks({ state }: { state: AppState }) {
  const rank = getRankStatus(state.progress.exp);
  const checkpointProgress = getCheckpointProgress(state);
  const currentCheckpoint = getCheckpoint(checkpointProgress.currentCheckpointId);
  const gate = buildCheckpointGate(state, currentCheckpoint.id);
  const nextGrowth = nextMochitGrowthStageInfo(state);
  const clearedCount = checkpointProgress.clearedCheckpointIds.length;

  return (
    <section aria-labelledby="next-unlocks-heading">
      <h2 id="next-unlocks-heading" className="mb-1 text-sm font-semibold text-gray-900">
        次の解放
      </h2>
      <div className="divide-y divide-gray-100 border-y border-gray-200">
        {!rank.isMax && rank.next && (
          <UnlockRow
            icon="star"
            title={`次のランク「${rank.next.name}」`}
            detail={`あと ${rank.remaining} XP`}
            href="/rank"
            ratio={rank.ratio}
          />
        )}
        {gate.finalExamUnlocked && !gate.finalExamPassed ? (
          <UnlockRow
            icon="award"
            title={`CP${currentCheckpoint.order}「${currentCheckpoint.title}」の突破試験に挑戦できます`}
            detail="突破するとモチットの成長と次の地点が近づく"
            href="/plan"
          />
        ) : (
          !gate.finalExamPassed && (
            <UnlockRow
              icon="award"
              title={`必須バッジ あと${Math.max(gate.totalRequiredCount - gate.earnedRequiredCount, 0)}個でCP${currentCheckpoint.order}の突破試験が解放`}
              detail={`いま ${gate.earnedRequiredCount}/${gate.totalRequiredCount}`}
              href="/badges"
              ratio={
                gate.totalRequiredCount > 0
                  ? gate.earnedRequiredCount / gate.totalRequiredCount
                  : 0
              }
            />
          )
        )}
        {nextGrowth && (
          <UnlockRow
            icon="sprout"
            title={`モチットの成長段階${nextGrowth.stage}「${MOCHIT_GROWTH_STAGE_LABELS[nextGrowth.stage]}」`}
            detail={`${nextGrowth.conditionLabel}（現在 ${clearedCount}回）`}
            href="/avatar"
          />
        )}
      </div>
    </section>
  );
}
