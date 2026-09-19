// /today の進行表と分の定規で共有する「1行ぶん」の形。
// lib/questRoute の QuestRouteNode（済み/現在地/次/ロック中）を、表示用に
// 「開始からの経過分」と「新規/復習」を足した形へ変換する。

import { getLessonLocation } from "@/lib/learningCatalog";
import type { QuestRouteNode } from "@/lib/questRoute";

export type TodaySlotState = "done" | "now" | "next";

export type TodaySlot = {
  id: string;
  topicId: string;
  title: string;
  /** 章（テーマ）名。解決できなければ空文字。 */
  field: string;
  /** 章番号（章アイコンの絵柄に使う）。解決できなければ null。 */
  chapterNumber: number | null;
  kind: "new" | "review";
  activity: QuestRouteNode["activity"];
  minutes: number;
  /** 今日の開始からの経過分。 */
  start: number;
  state: TodaySlotState;
};

export function buildTodaySlots(nodes: QuestRouteNode[]): TodaySlot[] {
  let cursor = 0;
  return nodes.map((node) => {
    const minutes = Math.max(0, node.estimatedMinutes);
    const theme = getLessonLocation(node.topicId)?.theme;
    const slot: TodaySlot = {
      id: node.topicId,
      topicId: node.topicId,
      title: node.title,
      field: theme?.title ?? "",
      chapterNumber: theme?.chapterNumber ?? null,
      kind: node.activity === "review" ? "review" : "new",
      activity: node.activity,
      minutes,
      start: cursor,
      state: node.state === "done" ? "done" : node.state === "current" ? "now" : "next",
    };
    cursor += minutes;
    return slot;
  });
}

export function formatOffset(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
