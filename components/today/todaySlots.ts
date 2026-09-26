// /today の進行表と分の定規で共有する「1行ぶん」の形。
// lib/questRoute の QuestRouteNode（済み/現在地/次/ロック中）を、表示用に
// 「開始からの経過分」と「新規/復習」を足した形へ変換する。

import { getLessonLocation } from "@/lib/learningCatalog";
import type { QuestRouteNode } from "@/lib/questRoute";
import type { TodayActivity } from "@/types";

export type TodaySlotState = "done" | "now" | "next";

export type TodaySlot = {
  id: string;
  topicId: string;
  title: string;
  /** 章（テーマ）名。解決できなければ空文字。 */
  field: string;
  /** 新規/復習のトピック学習、関連用語（vocab）、公式過去問（exam）。 */
  kind: "new" | "review" | "vocab" | "exam";
  activity: QuestRouteNode["activity"];
  minutes: number;
  /** 今日の開始からの経過分。 */
  start: number;
  state: TodaySlotState;
  /** トピック学習以外のタスクのときだけ入る。 */
  task?: TodayActivity;
};

function slotKind(node: QuestRouteNode): TodaySlot["kind"] {
  if (node.task) return node.task.kind === "vocab" ? "vocab" : "exam";
  return node.activity === "review" ? "review" : "new";
}

export function buildTodaySlots(nodes: QuestRouteNode[]): TodaySlot[] {
  let cursor = 0;
  return nodes.map((node) => {
    const minutes = Math.max(0, node.estimatedMinutes);
    const slot: TodaySlot = {
      id: node.topicId,
      topicId: node.topicId,
      title: node.title,
      field: node.task ? node.task.countLabel : getLessonLocation(node.topicId)?.theme.title ?? "",
      kind: slotKind(node),
      activity: node.activity,
      minutes,
      start: cursor,
      state: node.state === "done" ? "done" : node.state === "current" ? "now" : "next",
      ...(node.task ? { task: node.task } : {}),
    };
    cursor += minutes;
    return slot;
  });
}

export function formatOffset(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
