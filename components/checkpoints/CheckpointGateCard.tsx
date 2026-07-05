"use client";

import Link from "next/link";
import type { AppState } from "@/types";
import { FINAL_EXAM_STATE_LABELS } from "@/types/checkpoint";
import {
  buildCheckpointGate,
  finalExamState,
  getCheckpoint,
  getCheckpointProgress,
  getNextCheckpointId,
} from "@/lib/checkpoints";
import CheckpointStepper from "@/components/checkpoints/CheckpointStepper";
import GateRequirementList from "@/components/checkpoints/GateRequirementList";
import MissingBadgeList from "@/components/checkpoints/MissingBadgeList";

// /plan 用: 現在のチェックポイントのゲート状況を1枚で見せる。
//   旅の俯瞰（CP0〜6ステッパー）/ 現在CP→次CP / 次に進むための条件チェックリスト /
//   必要バッジの進捗 / 不足バッジ / 最終問題の解放状態 / おすすめ行動。

export default function CheckpointGateCard({ state }: { state: AppState }) {
  const cpProgress = getCheckpointProgress(state);
  const currentId = cpProgress.currentCheckpointId;
  const checkpoint = getCheckpoint(currentId);
  const nextId = getNextCheckpointId(currentId);
  const next = nextId ? getCheckpoint(nextId) : null;
  const gate = buildCheckpointGate(state, currentId);

  // cp0（初回設定）は最終問題が無い。設定導線だけ見せる。
  if (!checkpoint.finalExam) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <CheckpointStepper
          currentId={currentId}
          clearedIds={cpProgress.clearedCheckpointIds}
        />
        <p className="mt-4 text-xs font-bold text-indigo-500">
          チェックポイント {checkpoint.order}
        </p>
        <p className="mt-1 text-lg font-extrabold text-gray-800">
          {checkpoint.emoji} {checkpoint.title}
        </p>
        <p className="mt-1 text-sm text-gray-600">{checkpoint.summary}</p>
        <Link
          href="/settings"
          className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
        >
          初回設定を確認する →
        </Link>
      </section>
    );
  }

  const remaining = Math.max(
    0,
    gate.requiredBadgeCount - gate.earnedRequiredCount,
  );
  const badgePct =
    gate.requiredBadgeCount > 0
      ? Math.round((gate.earnedRequiredCount / gate.requiredBadgeCount) * 100)
      : 100;

  // おすすめ行動: 未解放なら不足バッジの獲得、解放済みなら最終問題へ。
  const recommend = gate.finalExamUnlocked
    ? gate.finalExamPassed
      ? next
        ? `最終問題は突破済み。次は「${next.title}」へ進みましょう。`
        : "最終問題は突破済み。合格に向けて総仕上げを続けましょう。"
      : "必要バッジが揃いました。最終問題に挑戦して次のチェックポイントへ！"
    : `あと${remaining}個の必須バッジを集めると最終問題が解放されます。`;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      {/* クエストヘッダ: 旅の俯瞰と現在→次 */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pb-4 pt-4 text-white">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-white/80">
            クエスト進行中
          </p>
          <Link
            href="/badges"
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold transition active:scale-95"
          >
            🏅 バッジ一覧
          </Link>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-lg font-extrabold">
            {checkpoint.emoji} CP{checkpoint.order} {checkpoint.title}
          </p>
          {next && (
            <p className="text-xs font-semibold text-white/70">
              → 次は CP{next.order} {next.title}
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-white/80">{checkpoint.summary}</p>
      </div>

      <div className="p-5">
        {/* 旅全体の俯瞰 */}
        <CheckpointStepper
          currentId={currentId}
          clearedIds={cpProgress.clearedCheckpointIds}
        />

        {/* 次に進むための条件（達成/未達を一目で） */}
        <div className="mt-5 rounded-xl bg-gray-50 px-3.5 py-3">
          <p className="text-xs font-bold text-gray-500">
            🚩 次のチェックポイントに進む条件
          </p>
          <div className="mt-2">
            <GateRequirementList gate={gate} />
          </div>
        </div>

        {/* 必要バッジの進捗 */}
        <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-3">
          <div className="flex items-center justify-between text-sm font-bold text-indigo-700">
            <span>必須バッジ</span>
            <span>
              {gate.earnedRequiredCount} / {gate.requiredBadgeCount}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${badgePct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-indigo-700">
            {remaining > 0
              ? `残り ${remaining} 個で最終問題が解放`
              : "必須バッジは全てそろいました"}
          </p>
        </div>

        {/* 不足バッジ一覧（最終問題ロック画面と共通部品） */}
        {gate.missingBadges.length > 0 && (
          <div className="mt-3">
            <MissingBadgeList badges={gate.missingBadges} />
          </div>
        )}

        {/* 最終問題ゲート（到達ポイント突破試験） */}
        <div
          className={`mt-4 rounded-xl px-4 py-3.5 ${
            gate.finalExamUnlocked
              ? gate.finalExamPassed
                ? "bg-emerald-50 ring-1 ring-emerald-200"
                : "animate-sheen bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm"
              : "bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-sm font-extrabold ${
                gate.finalExamUnlocked
                  ? gate.finalExamPassed
                    ? "text-emerald-700"
                    : "text-white"
                  : "text-gray-500"
              }`}
            >
              {FINAL_EXAM_STATE_LABELS[finalExamState(gate)]}
            </p>
            <Link
              href={`/checkpoint/${checkpoint.id}/final`}
              className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
                gate.finalExamUnlocked
                  ? gate.finalExamPassed
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-rose-600"
                  : "bg-white text-gray-500 ring-1 ring-gray-200"
              }`}
            >
              {gate.finalExamUnlocked && !gate.finalExamPassed
                ? "挑む →"
                : gate.finalExamPassed
                  ? "再挑戦"
                  : "詳細を見る"}
            </Link>
          </div>
          <p
            className={`mt-1.5 text-xs font-semibold ${
              gate.finalExamUnlocked && !gate.finalExamPassed
                ? "text-white/90"
                : "text-gray-600"
            }`}
          >
            {checkpoint.finalExam.questionCount}問中
            {checkpoint.finalExam.passThreshold}問正解で突破 → CP
            {checkpoint.order}をクリア
          </p>
        </div>

        {/* おすすめ行動 */}
        <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700">
          👉 {recommend}
        </p>
      </div>
    </section>
  );
}
