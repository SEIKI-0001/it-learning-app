// 「次の解放」。既存仕様に実在する解放だけを示す:
// 次のランク(XP) / チェックポイント突破試験(必須バッジ) / モチットの次の成長段階。
// 架空の解放要素・ダミー報酬は置かない。
// 最も近い(挑戦可能ならそれ、なければ進捗率が最も高い)解放1件だけをPrimaryの面で強調し、
// 残りは通常の罫線行にとどめる。挑戦可能な解放はaccentで「いま動ける」ことを示す。

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

type Unlock = {
  icon: IconName;
  title: string;
  detail: string;
  href: string;
  ratio?: number;
  /** いますぐ挑戦できる解放(突破試験の解放済み等)。Primary時にaccentで示す */
  challengeable?: boolean;
};

function PrimaryUnlock({ unlock }: { unlock: Unlock }) {
  const tone = unlock.challengeable
    ? {
        box: "border-accent-200 border-l-accent-500 bg-accent-50 hover:bg-accent-100",
        label: "text-accent-700",
        detail: "text-accent-700",
        icon: "text-accent-600",
        fill: "bg-accent-500",
      }
    : {
        box: "border-brand-200 border-l-brand-500 bg-brand-50 hover:bg-brand-100",
        label: "text-brand-700",
        detail: "text-brand-700",
        icon: "text-brand-600",
        fill: "bg-brand-600",
      };
  return (
    <Link
      href={unlock.href}
      className={`group flex items-start gap-3 rounded-lg border border-l-4 p-3 transition active:scale-[0.99] ${tone.box}`}
    >
      <Icon name={unlock.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
      <span className="min-w-0 flex-1">
        <span className={`block text-xs font-semibold ${tone.label}`}>
          {unlock.challengeable ? "いま挑戦できる" : "いちばん近い解放"}
        </span>
        <span className="mt-0.5 block text-[15px] font-semibold leading-snug text-gray-900">
          {unlock.title}
        </span>
        <span className={`mt-0.5 block text-xs font-semibold tabular-nums ${tone.detail}`}>
          {unlock.detail}
        </span>
        {unlock.ratio !== undefined && (
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-200">
            <span
              className={`block h-full rounded-full ${tone.fill}`}
              style={{
                width: `${Math.round(Math.min(1, Math.max(0, unlock.ratio)) * 100)}%`,
              }}
            />
          </span>
        )}
      </span>
      <Icon
        name="chevron-right"
        className="mt-1 h-4 w-4 shrink-0 text-gray-500 transition group-hover:text-brand-600"
      />
    </Link>
  );
}

function UnlockRow({ unlock }: { unlock: Unlock }) {
  return (
    <Link
      href={unlock.href}
      className="group flex items-start gap-3 py-3 transition hover:bg-gray-50 active:bg-gray-100"
    >
      <Icon name={unlock.icon} className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gray-500" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-gray-800">{unlock.title}</span>
        <span className="mt-0.5 block text-xs tabular-nums text-gray-500">{unlock.detail}</span>
        {unlock.ratio !== undefined && (
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-200">
            <span
              className="block h-full rounded-full bg-brand-500"
              style={{
                width: `${Math.round(Math.min(1, Math.max(0, unlock.ratio)) * 100)}%`,
              }}
            />
          </span>
        )}
      </span>
      <Icon
        name="chevron-right"
        className="mt-1 h-4 w-4 shrink-0 text-gray-500 transition group-hover:text-brand-600"
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

  const unlocks: Unlock[] = [];
  if (!rank.isMax && rank.next) {
    unlocks.push({
      icon: "star",
      title: `次のランク「${rank.next.name}」`,
      detail: `あと ${rank.remaining} XP`,
      href: "/rank",
      ratio: rank.ratio,
    });
  }
  if (gate.finalExamUnlocked && !gate.finalExamPassed) {
    unlocks.push({
      icon: "award",
      title: `CP${currentCheckpoint.order}「${currentCheckpoint.title}」の突破試験に挑戦できます`,
      detail: "合格するとモチットの成長と次の地点が近づく",
      href: "/plan",
      challengeable: true,
    });
  } else if (!gate.finalExamPassed) {
    unlocks.push({
      icon: "award",
      title: `必須バッジ あと${Math.max(gate.totalRequiredCount - gate.earnedRequiredCount, 0)}個でCP${currentCheckpoint.order}の突破試験が解放`,
      detail: `いま ${gate.earnedRequiredCount}/${gate.totalRequiredCount}`,
      href: "/badges",
      ratio:
        gate.totalRequiredCount > 0
          ? gate.earnedRequiredCount / gate.totalRequiredCount
          : 0,
    });
  }
  if (nextGrowth) {
    unlocks.push({
      icon: "sprout",
      title: `モチットの成長段階${nextGrowth.stage}「${MOCHIT_GROWTH_STAGE_LABELS[nextGrowth.stage]}」`,
      detail: `${nextGrowth.conditionLabel}（現在 ${clearedCount}回）`,
      href: "/avatar",
    });
  }

  if (unlocks.length === 0) return null;

  // Primary対象: 挑戦可能なもの > 進捗率が最も高いもの > 先頭
  const challengeableIndex = unlocks.findIndex((u) => u.challengeable);
  const primaryIndex =
    challengeableIndex >= 0
      ? challengeableIndex
      : unlocks.reduce(
          (best, u, i) =>
            (u.ratio ?? -1) > (unlocks[best].ratio ?? -1) ? i : best,
          0,
        );
  const primary = unlocks[primaryIndex];
  const rest = unlocks.filter((_, i) => i !== primaryIndex);

  return (
    <section aria-labelledby="next-unlocks-heading">
      <h2 id="next-unlocks-heading" className="mb-2 text-base font-bold text-gray-900">
        次の解放
      </h2>
      <PrimaryUnlock unlock={primary} />
      {rest.length > 0 && (
        <div className="mt-2 divide-y divide-gray-100 border-y border-gray-200">
          {rest.map((unlock) => (
            <UnlockRow key={unlock.href} unlock={unlock} />
          ))}
        </div>
      )}
    </section>
  );
}
