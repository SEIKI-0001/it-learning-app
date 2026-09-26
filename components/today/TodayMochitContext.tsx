"use client";

// Today の内容をモチット相談へ渡す（描画なし）。
// - 今日のルート・最優先は、Today が既存ロジックで決めたものをそのまま公開する（モチットは作り直さない）。
// - 今日の学習が終わったら（3ミッション達成、またはルートを全部終えたら）、その日1回だけ振り返りを差し出す。

import { useEffect } from "react";
import { offerMochitReflection, publishMochitToday } from "@/components/mochit/mochitConsultStore";
import type { MochitTodaySnapshot } from "@/lib/mochitAi/types";
import type { TodayPrimaryAction } from "@/types/gameful";
import type { TodaySlot } from "./todaySlots";

export function buildMochitTodaySnapshot(
  date: string,
  slots: TodaySlot[],
  primary: TodayPrimaryAction | null,
): MochitTodaySnapshot {
  return {
    date,
    tasks: slots.map((slot) => ({ title: slot.title, kind: slot.kind, minutes: slot.minutes, state: slot.state })),
    ...(primary ? { primary: { title: primary.title, reason: primary.reasonLabel } } : {}),
  };
}

export function isTodayComplete(slots: TodaySlot[], missionsComplete: boolean): boolean {
  return missionsComplete || (slots.length > 0 && slots.every((slot) => slot.state === "done"));
}

export default function TodayMochitContext({
  date,
  slots,
  primary,
  missionsComplete,
}: {
  date: string;
  slots: TodaySlot[];
  primary: TodayPrimaryAction | null;
  missionsComplete: boolean;
}) {
  const snapshot = buildMochitTodaySnapshot(date, slots, primary);
  const serialized = JSON.stringify(snapshot);
  useEffect(() => {
    publishMochitToday(JSON.parse(serialized) as MochitTodaySnapshot);
  }, [serialized]);

  const complete = isTodayComplete(slots, missionsComplete);
  useEffect(() => {
    if (complete) offerMochitReflection(date);
  }, [complete, date]);

  return null;
}
