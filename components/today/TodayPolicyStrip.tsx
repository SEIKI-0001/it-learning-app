"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AppState } from "@/types";
import type { BadgeSignals } from "@/lib/badges";
import { buildBadgeStatuses, selectNextBadges } from "@/lib/badges";
import {
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import {
  fetchLatestPlanAdjustment,
  getUserId,
  refreshIntegratedStatus,
} from "@/lib/userSession";
import {
  focusHintMessage,
  type IntegratedLearningStatus,
} from "@/types/integratedStatus";
import {
  acceptedOptionNote,
  OPTION_ID,
  type PlanAdjustmentProposal,
} from "@/types/planAdjustment";

// /today 上部の「今日の方針」ストリップ。
// 旧 AcceptedAdjustmentNote（承認済み立て直し）・TodayFocusHint（推奨配分の一言）・
// BadgeProgressCard（次のバッジ・突破試験通知）を1枚に統合し、クイズ前の助言カードを減らす。
// 統合進捗の当日リフレッシュ（旧 TodayFocusHint の副作用）もここが担う。
// 各行は独立にフェイルセーフ：未ログイン・未設定・取得失敗ならその行だけ出さない。
export default function TodayPolicyStrip({
  state,
  signals,
}: {
  state: AppState;
  signals?: BadgeSignals;
}) {
  const [status, setStatus] = useState<IntegratedLearningStatus | null>(null);
  const [proposal, setProposal] = useState<PlanAdjustmentProposal | null>(null);

  useEffect(() => {
    let alive = true;
    const userId = getUserId();
    if (!userId) return;
    void refreshIntegratedStatus(userId).then((s) => {
      if (alive) setStatus(s);
    });
    void fetchLatestPlanAdjustment(userId).then((p) => {
      if (alive) setProposal(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const cpProgress = getCheckpointProgress(state);
  const checkpoint = getCheckpoint(cpProgress.currentCheckpointId);
  const gate = buildCheckpointGate(state, cpProgress.currentCheckpointId);
  const finalReady = gate.finalExamUnlocked && !gate.finalExamPassed;

  // 次に狙うバッジ（最終問題バッジ除く・共通ロジックで1件）。
  const nextBadge = selectNextBadges(
    buildBadgeStatuses(state, signals, checkpoint.id).filter(
      (s) => s.def.category !== "final",
    ),
    1,
  )[0];

  const accepted = proposal?.status === "accepted" ? proposal : null;
  const acceptedNote = accepted
    ? acceptedOptionNote(accepted.selectedOptionId ?? "")
    : null;
  const isPostpone = accepted?.selectedOptionId === OPTION_ID.postponeExam;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
          <span aria-hidden>🧭</span>
          今日の方針
        </p>
        <Link
          href="/plan"
          className="text-xs font-bold text-indigo-600 underline underline-offset-2"
        >
          ロードマップ
        </Link>
      </div>

      <ul className="mt-2.5 space-y-2">
        {/* 承認済みの立て直しプラン */}
        {acceptedNote && (
          <li className="rounded-xl bg-emerald-50 px-3 py-2">
            <p className="text-sm font-semibold text-emerald-800">
              🛠️ {acceptedNote}
            </p>
            {isPostpone && (
              <Link
                href="/settings"
                className="mt-1.5 inline-block rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                設定で試験日を登録する →
              </Link>
            )}
          </li>
        )}

        {/* 統合進捗の推奨配分からの一言 */}
        {status && (
          <li className="rounded-xl bg-amber-50 px-3 py-2">
            <p className="text-sm font-semibold text-amber-800">
              {focusHintMessage(status.recommendedFocus)}
            </p>
          </li>
        )}

        {/* 次に狙うバッジ（CP進行の次の一手） */}
        {nextBadge && (
          <li className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-sm font-semibold text-gray-800">
              🏅 次のバッジ：{nextBadge.def.emoji} {nextBadge.def.label}
              {nextBadge.def.requiredForGate && (
                <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                  必須
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-gray-600">
              🎯 {nextBadge.def.conditionLabel}
            </p>
          </li>
        )}

        {/* 突破試験の解放通知 */}
        {finalReady && (
          <li>
            <Link
              href={`/checkpoint/${checkpoint.id}/final`}
              className="block rounded-xl bg-rose-50 px-3 py-2 ring-1 ring-rose-200"
            >
              <p className="text-sm font-extrabold text-rose-700">
                ⚔️ 突破試験に挑戦できます →
              </p>
              <p className="mt-0.5 text-xs font-semibold text-rose-600">
                {checkpoint.title}の最終問題。{checkpoint.winConditionLabel}
              </p>
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
