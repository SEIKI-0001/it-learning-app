"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLatestPlanAdjustment, getUserId } from "@/lib/userSession";
import {
  acceptedOptionNote,
  OPTION_ID,
  type PlanAdjustmentProposal,
} from "@/types/planAdjustment";

// /today 上部の案内。承認済みの立て直し提案があるとき、いま何を優先しているかを一言で示す。
// postpone_exam の場合は /settings への導線を出す。
// 未ログイン・未設定・承認済み提案なしなら非表示。
export default function AcceptedAdjustmentNote() {
  const [proposal, setProposal] = useState<PlanAdjustmentProposal | null>(null);

  useEffect(() => {
    let alive = true;
    const userId = getUserId();
    if (!userId) return;
    void fetchLatestPlanAdjustment(userId).then((p) => {
      if (alive) setProposal(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!proposal || proposal.status !== "accepted") return null;

  const optionId = proposal.selectedOptionId ?? "";
  const note = acceptedOptionNote(optionId);
  const isPostpone = optionId === OPTION_ID.postponeExam;

  return (
    <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
      <p className="text-xs font-bold text-emerald-600">🛠️ 立て直しプラン</p>
      <p className="mt-0.5 text-sm font-semibold text-emerald-800">{note}</p>
      {isPostpone && (
        <Link
          href="/settings"
          className="mt-2 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
        >
          設定で試験日を登録する →
        </Link>
      )}
    </div>
  );
}
