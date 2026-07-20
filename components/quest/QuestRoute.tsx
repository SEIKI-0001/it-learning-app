"use client";

// 今日のクエストルート(/todayのシグネチャ要素)。
// タスクを大きなカードの羅列ではなく、罫線レール+ノードの縦の進行ルートとして描く。
// - ノード状態: done(完了) / current(いま挑戦中) / up_next(次に挑戦できる) / locked(未到達)
// - 最終ノードは「今日の宝箱」(デイリーミッションの実報酬。架空の報酬は置かない)
// - モチットは現在挑戦中ノードの右に座り、完了後の再訪時に前回位置から
//   次のノードへ500msで滑走する(位置はlocalStorageに当日分だけ記録)。
// 演出はすべて300〜700ms以内・prefers-reduced-motionでは移動もpop-inも無効。

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import type { QuestRouteNode } from "@/lib/questRoute";
import { todayLocalDate } from "@/lib/userSession";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import StateMarker, { type StateMarkerTone } from "@/components/quest/StateMarker";
import Mochit from "@/components/mochit/Mochit";
import type { MochitGrowthStage } from "@/components/mochit/mochitTypes";
import type { IconName } from "@/components/ui/Icon";

const MOCHIT_POS_KEY = "fequest:todayRouteMochit:v1";

type StoredMochitPos = { date: string; index: number };

function readMochitPos(): StoredMochitPos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOCHIT_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMochitPos;
    if (typeof parsed?.date !== "string" || typeof parsed?.index !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeMochitPos(pos: StoredMochitPos): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOCHIT_POS_KEY, JSON.stringify(pos));
  } catch {
    // 保存できなくても表示は成立する(次回の滑走演出が出ないだけ)
  }
}

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
  /** 例: "ミッション 2/3" (デイリーミッションの実進捗) */
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
  growthStage: MochitGrowthStage;
  finalReward: QuestRouteFinalReward;
};

export default function QuestRoute({
  nodes,
  hrefFor,
  aiGradingHrefFor,
  growthStage,
  finalReward,
}: QuestRouteProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [mochitY, setMochitY] = useState<number | null>(null);
  const [arrivedFromIndex, setArrivedFromIndex] = useState<number | null>(null);

  const currentIndex = nodes.findIndex((node) => node.state === "current");
  const allDone = currentIndex === -1;
  // 全タスク完了時は最終ノード(宝箱)の隣に座る
  const mochitIndex = allDone ? nodes.length : currentIndex;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const rowTop = (index: number): number | null => {
      const items = list.querySelectorAll<HTMLLIElement>("[data-route-node]");
      const li = items[index];
      return li ? li.offsetTop : null;
    };

    const target = rowTop(mochitIndex);
    if (target === null) return;

    const today = todayLocalDate();
    const stored = readMochitPos();
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 当日中に位置が進んでいたら、前回位置から新しい現在地へ滑走して見せる
    const from =
      !reduced && stored && stored.date === today && stored.index < mochitIndex
        ? rowTop(stored.index)
        : null;
    if (from !== null && stored) {
      setMochitY(from);
      setArrivedFromIndex(stored.index);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setMochitY(target));
      });
      writeMochitPos({ date: today, index: mochitIndex });
      const observer = new ResizeObserver(() => {
        const top = rowTop(mochitIndex);
        if (top !== null) setMochitY(top);
      });
      // 滑走が終わってからレイアウト変化に追従する(600ms > transition 500ms)
      const settle = window.setTimeout(() => observer.observe(list), 600);
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        window.clearTimeout(settle);
        observer.disconnect();
      };
    }

    setMochitY(target);
    writeMochitPos({ date: today, index: mochitIndex });
    const observer = new ResizeObserver(() => {
      const top = rowTop(mochitIndex);
      if (top !== null) setMochitY(top);
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [mochitIndex, nodes.length]);

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white px-4 py-2">
      <ol ref={listRef} className="relative">
        {nodes.map((node, index) => {
          const marker = NODE_MARKER[node.state];
          const stateLabel = NODE_STATE_LABEL[node.state];
          const isCurrent = node.state === "current";
          const isMochitRow = index === mochitIndex;
          const aiHref = isCurrent ? aiGradingHrefFor?.(node) : null;
          // 直前の完了ノードから移動してきた場合、そのチェック印をpop-inで見せる
          const justChanged = arrivedFromIndex === index && node.state === "done";
          const meta = `約${node.estimatedMinutes}分・${node.activity === "review" ? "復習" : "新規学習"}`;

          const body = (
            <>
              <p
                className={`text-[15px] leading-snug ${
                  isCurrent
                    ? "font-semibold text-gray-900"
                    : node.state === "done"
                      ? "text-gray-600"
                      : node.state === "up_next"
                        ? "text-gray-800"
                        : "text-gray-400"
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
                          ? "font-medium text-brand-700"
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
                      nodes[index - 1].state === "done" ? "bg-brand-300" : "bg-gray-200"
                    }`}
                  />
                )}
                <span
                  aria-hidden
                  className={`absolute bottom-0 top-8 w-px ${
                    node.state === "done" ? "bg-brand-300" : "bg-gray-200"
                  }`}
                />
                <StateMarker
                  icon={marker.icon}
                  tone={marker.tone}
                  justChanged={justChanged}
                  className="relative z-10 mt-3 h-5 w-5 bg-white"
                />
              </div>

              {isCurrent ? (
                <div className={`min-w-0 flex-1 py-3 ${isMochitRow ? "pr-14" : ""}`}>
                  {body}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link href={hrefFor(node)} className={buttonClass("primary", "sm")}>
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
                </div>
              ) : (
                <Link
                  href={hrefFor(node)}
                  className={`group min-w-0 flex-1 py-3 transition hover:bg-gray-50 active:bg-gray-100 ${
                    isMochitRow ? "pr-14" : "pr-1"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1">{body}</span>
                    <Icon
                      name="chevron-right"
                      className="h-4 w-4 shrink-0 text-gray-200 transition group-hover:text-gray-400"
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
                  nodes[nodes.length - 1].state === "done" ? "bg-brand-300" : "bg-gray-200"
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
          <div className={`min-w-0 flex-1 py-3 ${allDone ? "pr-14" : ""}`}>
            {finalReward.state === "claimed" ? (
              <p className="text-sm text-emerald-700">今日の宝箱は受け取り済みです</p>
            ) : finalReward.state === "claimable" ? (
              <>
                <p className="text-[15px] font-semibold text-gray-900">今日の宝箱</p>
                <button
                  type="button"
                  onClick={finalReward.onClaim}
                  className={buttonClass("warn", "sm", "mt-2")}
                >
                  宝箱を開ける（+{finalReward.xp} XP）
                </button>
              </>
            ) : (
              <>
                <p className="text-[15px] text-gray-500">今日の宝箱</p>
                <p className="mt-0.5 text-xs tabular-nums text-gray-500">
                  3ミッション達成で開けられる（+{finalReward.xp} XP）・{finalReward.progressLabel}
                </p>
              </>
            )}
          </div>
        </li>
      </ol>

      {/* モチット: 現在挑戦中ノードの右に座る。位置が進んだ日は前回位置から滑走 */}
      {nodes.length > 0 && (
        <div
          aria-hidden
          className={`pointer-events-none absolute right-3 top-2 transition-transform duration-500 ease-out motion-reduce:transition-none ${
            mochitY === null ? "opacity-0" : "opacity-100"
          }`}
          style={{ transform: `translate3d(0, ${mochitY ?? 0}px, 0)` }}
        >
          <Mochit
            size="xs"
            state={allDone ? "happy" : "normal"}
            animation="idle"
            growthStage={growthStage}
          />
        </div>
      )}
    </div>
  );
}
