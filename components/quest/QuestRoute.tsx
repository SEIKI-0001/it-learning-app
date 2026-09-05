"use client";

// 今日のクエストルート(/todayのシグネチャ要素)。
// タスクを大きなカードの羅列ではなく、罫線レール+ノードの縦の進行ルートとして描く。
// - ノード状態: done(完了) / current(いま挑戦中) / up_next(次に挑戦できる) / locked(未到達)
// - 最終ノードは「今日の宝箱」(デイリーミッションの実報酬。架空の報酬は置かない)
// - 現在地は発光する専用マーカーで示し、キャラクター表示とは役割を分ける。
// - 現在ノードが「今日の最優先」(TodayPrimaryCard)と同じ行動なら、ここに同じ
//   開始ボタンを重ねない(GF-P0-001「Primary CTAは原則1つ」)。ルート上では
//   現在地として示すだけにして、開始導線は上の Primary に一本化する。
// 演出はprefers-reduced-motion時にCSS側で無効化する。

import Link from "next/link";
import type { QuestRouteNode } from "@/lib/questRoute";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import StateMarker, { type StateMarkerTone } from "@/components/quest/StateMarker";
import type { IconName } from "@/components/ui/Icon";

const NODE_MARKER: Record<
  QuestRouteNode["state"],
  { icon: IconName; tone: StateMarkerTone }
> = {
  done: { icon: "circle-check", tone: "done" },
  current: { icon: "circle-dot", tone: "active" },
  up_next: { icon: "circle", tone: "muted" },
  locked: { icon: "circle", tone: "muted" },
};

const NODE_STATE_LABEL: Record<QuestRouteNode["state"], string | null> = {
  done: "完了",
  current: "いま挑戦中",
  up_next: "次に挑戦できる",
  locked: null,
};

export type QuestRouteFinalReward = {
  /** 例: "1/3 達成" (今日の3ミッションの実進捗) */
  progressLabel: string;
  xp: number;
  state: "locked" | "claimable" | "claimed";
  onClaim?: () => void;
};

type QuestRouteProps = {
  nodes: QuestRouteNode[];
  hrefFor: (node: QuestRouteNode) => string;
  /** 現在ノードにだけ出す「自分の言葉で説明する」導線(記述問題がある場合) */
  aiGradingHrefFor?: (node: QuestRouteNode) => string | null;
  /**
   * 「今日の最優先」が指しているリンク先。現在ノードがこれと同じなら、
   * ルート側は開始ボタンを持たない(同じ行動のボタンを2つ置かない)。
   */
  primaryHref?: string | null;
  finalReward: QuestRouteFinalReward;
};

export default function QuestRoute({
  nodes,
  hrefFor,
  aiGradingHrefFor,
  primaryHref = null,
  finalReward,
}: QuestRouteProps) {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white px-4 py-2">
      <ol className="relative">
        {nodes.map((node, index) => {
          const marker = NODE_MARKER[node.state];
          const stateLabel = NODE_STATE_LABEL[node.state];
          const isCurrent = node.state === "current";
          const href = hrefFor(node);
          // Primary と同じ行動なら、開始ボタンはここに置かない。
          const isPrimaryDuplicate = isCurrent && primaryHref !== null && href === primaryHref;
          const aiHref = isCurrent ? aiGradingHrefFor?.(node) : null;
          const meta = `約${node.estimatedMinutes}分・${node.activity === "review" ? "復習" : "新規学習"}`;

          const body = (
            <>
              <p
                className={`leading-snug ${
                  isCurrent
                    ? "text-base font-bold text-gray-900"
                    : node.state === "done"
                      ? "text-[15px] text-gray-600"
                      : node.state === "up_next"
                        ? "text-[15px] text-gray-800"
                        : "text-[15px] text-gray-500"
                }`}
              >
                {node.title}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs tabular-nums text-gray-500">
                <span>{meta}</span>
                {stateLabel && (
                  <span
                    className={
                      node.state === "done"
                        ? "text-emerald-700"
                        : isCurrent
                          ? "font-semibold text-brand-700"
                          : "text-gray-500"
                    }
                  >
                    {stateLabel}
                  </span>
                )}
              </p>
            </>
          );

          return (
            <li key={node.topicId} data-route-node className="relative flex gap-3">
              {/* レール: マーカーの上下を接続線でつなぐ。通過済み区間だけ藍にする */}
              <div className="relative flex w-5 shrink-0 flex-col items-center">
                {index > 0 && (
                  <span
                    aria-hidden
                    className={`absolute top-0 h-3 w-px ${
                      nodes[index - 1].state === "done" ? "bg-brand-400" : "bg-gray-200"
                    }`}
                  />
                )}
                <span
                  aria-hidden
                  className={`absolute bottom-0 top-8 w-px ${
                    node.state === "done" ? "bg-brand-400" : "bg-gray-200"
                  }`}
                />
                {isCurrent ? (
                  <span
                    role="img"
                    aria-label="現在地"
                    className="relative z-10 mt-3 flex h-5 w-5 items-center justify-center rounded-full bg-white"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-[-4px] rounded-full bg-brand-200/70 animate-pulse motion-reduce:animate-none"
                    />
                    <StateMarker
                      icon="circle-dot"
                      tone="active"
                      className="relative h-5 w-5"
                    />
                  </span>
                ) : (
                  <StateMarker
                    icon={marker.icon}
                    tone={marker.tone}
                    className="relative z-10 mt-3 h-5 w-5 bg-white"
                  />
                )}
              </div>

              {isCurrent ? (
                /* いま挑戦中のノード。brand-50面+brand-200境界で現在地を示す */
                <div
                  className="my-2 min-w-0 flex-1 rounded-lg border border-brand-200 bg-brand-50 p-3"
                >
                  {body}
                  {isPrimaryDuplicate ? (
                    /* 開始導線は上の「今日の最優先」に一本化する。ここでは在り処だけ示す */
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <p className="text-xs text-gray-600">
                        上の「今日の最優先」から始められます
                      </p>
                      {aiHref && (
                        <Link
                          href={aiHref}
                          className="inline-flex items-center gap-1 text-sm text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                        >
                          <Icon name="pen" className="h-3.5 w-3.5" />
                          自分の言葉で説明する
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <Link href={href} className={buttonClass("primary", "sm")}>
                        {node.activity === "review" ? "復習を始める" : "学習を始める"}
                      </Link>
                      {aiHref && (
                        <Link
                          href={aiHref}
                          className="inline-flex items-center gap-1 text-sm text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                        >
                          <Icon name="pen" className="h-3.5 w-3.5" />
                          自分の言葉で説明する
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={href}
                  className="group min-w-0 flex-1 py-3 pr-1 transition hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1">{body}</span>
                    <Icon
                      name="chevron-right"
                      className="h-4 w-4 shrink-0 text-gray-500 transition group-hover:text-brand-600"
                    />
                  </span>
                </Link>
              )}
            </li>
          );
        })}

        {/* 最終ノード: 今日の宝箱(デイリーミッションの実報酬) */}
        <li data-route-node className="relative flex gap-3">
          <div className="relative flex w-5 shrink-0 flex-col items-center">
            {nodes.length > 0 && (
              <span
                aria-hidden
                className={`absolute top-0 h-3 w-px ${
                  nodes[nodes.length - 1].state === "done" ? "bg-brand-400" : "bg-gray-200"
                }`}
              />
            )}
            <StateMarker
              icon="gift"
              tone={
                finalReward.state === "claimed"
                  ? "done"
                  : finalReward.state === "claimable"
                    ? "accent"
                    : "muted"
              }
              className="relative z-10 mt-3 h-5 w-5 bg-white"
            />
          </div>
          <div className="min-w-0 flex-1 py-3">
            {finalReward.state === "claimed" ? (
              <p className="text-sm text-emerald-700">今日の宝箱は受け取り済みです</p>
            ) : finalReward.state === "claimable" ? (
              /* 受取可能なときだけaccentで注意を引く(通常時は無彩色のまま) */
              <div className="rounded-lg border border-accent-200 bg-accent-50 p-3">
                <p className="text-[15px] font-semibold text-gray-900">今日の宝箱</p>
                <button
                  type="button"
                  onClick={finalReward.onClaim}
                  className={buttonClass("warn", "sm", "mt-2")}
                >
                  宝箱を開ける（+{finalReward.xp} XP）
                </button>
              </div>
            ) : (
              <>
                <p className="text-[15px] text-gray-500">今日の宝箱</p>
                <p className="mt-0.5 text-xs tabular-nums text-gray-500">
                  今日の3ミッション達成で開けられる（+{finalReward.xp} XP）・
                  {finalReward.progressLabel}
                </p>
              </>
            )}
          </div>
        </li>
      </ol>

    </div>
  );
}
