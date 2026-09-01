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
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { checkpointIcon } from "@/lib/badgeIcons";

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
      <section className="rounded-xl bg-white p-5 border border-gray-200">
        <CheckpointStepper
          currentId={currentId}
          clearedIds={cpProgress.clearedCheckpointIds}
        />
        <p className="mt-4 text-xs font-semibold text-brand-700">
          チェックポイント {checkpoint.order}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-gray-900">
          <Icon
            name={checkpointIcon(checkpoint.id)}
            className="h-5 w-5 shrink-0 text-brand-500"
          />
          {checkpoint.title}
        </p>
        <p className="mt-1 text-sm text-gray-600">{checkpoint.summary}</p>
        <Link
          href="/settings"
          className={buttonClass("primary", "sm", "mt-3")}
        >
          初回設定を確認する
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

  // おすすめ行動: 未解放なら残っている解放条件、解放済みなら突破試験へ。
  // 文言は lib/checkpoints.ts のロードマップ hint と同じ場合分けにそろえる
  // （必須バッジが揃っていても未解放＝残りは分野の広がり側なので「あと0個」と出さない）。
  const recommend = gate.finalExamUnlocked
    ? gate.finalExamPassed
      ? next
        ? `突破試験は合格済み。次は「${next.title}」へ進みましょう。`
        : "突破試験は合格済み。合格に向けて総仕上げを続けましょう。"
      : "必要バッジが揃いました。突破試験に挑戦して次のチェックポイントへ！"
    : remaining > 0
      ? `あと${remaining}個の必須バッジを集めると突破試験が解放されます。`
      : "3分野に手をつけると突破試験が解放されます。";

  return (
    <section className="overflow-hidden rounded-xl bg-white border border-gray-200">
      {/* クエストヘッダ: 旅の俯瞰と現在→次。現在地なので唯一の強調ブロックにする */}
      <div className="border-l-4 border-l-brand-500 bg-brand-50 px-5 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-brand-700">いま挑戦中のチェックポイント</p>
          <Link
            href="/badges"
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-700 transition hover:text-brand-800"
          >
            <Icon name="award" className="h-3.5 w-3.5" />
            バッジ一覧
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
            <Icon
              name={checkpointIcon(checkpoint.id)}
              className="h-4 w-4 shrink-0 text-brand-500"
            />
            CP{checkpoint.order} {checkpoint.title}
          </p>
          {next && (
            <p className="text-xs text-gray-600">
              次は CP{next.order} {next.title}
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-600">{checkpoint.summary}</p>
      </div>

      <div className="p-5">
        {/* 旅全体の俯瞰 */}
        <CheckpointStepper
          currentId={currentId}
          clearedIds={cpProgress.clearedCheckpointIds}
        />

        {/* 次に進むための条件（達成/未達を一目で） */}
        <div className="mt-5 rounded-lg border border-gray-200 px-3.5 py-3">
          <p className="text-xs font-semibold text-gray-600">
            次のチェックポイントに進む条件
          </p>
          <div className="mt-2">
            <GateRequirementList gate={gate} />
          </div>
        </div>

        {/* 必要バッジの進捗 */}
        <div className="mt-3 rounded-lg border border-gray-200 px-3 py-3">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
            <span>必須バッジ</span>
            <span>
              {gate.earnedRequiredCount} / {gate.requiredBadgeCount}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${badgePct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            {remaining > 0
              ? `残り ${remaining} 個で突破試験が解放`
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
                : "animate-sheen bg-accent-600 text-white"
              : "bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-sm font-bold ${
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
                    : "bg-white text-accent-700"
                  : "bg-white text-gray-500 ring-1 ring-gray-200"
              }`}
            >
              {gate.finalExamUnlocked && !gate.finalExamPassed
                ? "挑む"
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
            {checkpoint.finalExam.passThreshold}問正解で合格 → CP
            {checkpoint.order}をクリア
          </p>
        </div>

        {/* おすすめ行動 */}
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-800">
          {recommend}
        </p>
      </div>
    </section>
  );
}
