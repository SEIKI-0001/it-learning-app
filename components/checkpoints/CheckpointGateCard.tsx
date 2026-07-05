"use client";

import Link from "next/link";
import type { AppState } from "@/types";
import {
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
  getNextCheckpointId,
} from "@/lib/checkpoints";
import { badgeActionHref } from "@/components/badges/BadgeList";

// /plan 用: 現在のチェックポイントのゲート状況を1枚で見せる。
//   現在CP / 次CP / 必要バッジ数 / 獲得済み / 残り / 不足バッジ /
//   最終問題の解放状態 / 勝利条件 / おすすめ行動。

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
        <p className="text-xs font-bold text-indigo-500">
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

  // おすすめ行動: 未解放なら不足バッジの獲得、解放済みなら最終問題へ。
  const recommend = gate.finalExamUnlocked
    ? gate.finalExamPassed
      ? next
        ? `最終問題は突破済み。次は「${next.title}」へ進みましょう。`
        : "最終問題は突破済み。合格に向けて総仕上げを続けましょう。"
      : "必要バッジが揃いました。最終問題に挑戦して次のチェックポイントへ！"
    : `あと${remaining}個の必須バッジを集めると最終問題が解放されます。`;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-indigo-500">
          いまのチェックポイント CP{checkpoint.order}
        </p>
        <Link
          href="/badges"
          className="text-xs font-bold text-indigo-600 underline underline-offset-2"
        >
          バッジ一覧
        </Link>
      </div>
      <p className="mt-1 text-lg font-extrabold text-gray-800">
        {checkpoint.emoji} {checkpoint.title}
      </p>
      <p className="mt-1 text-sm text-gray-600">{checkpoint.summary}</p>

      {/* 必要バッジの進捗 */}
      <div className="mt-4 rounded-xl bg-indigo-50 px-3 py-3">
        <div className="flex items-center justify-between text-sm font-bold text-indigo-700">
          <span>必要バッジ</span>
          <span>
            {gate.earnedRequiredCount} / {gate.requiredBadgeCount}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{
              width: `${
                gate.requiredBadgeCount > 0
                  ? Math.round(
                      (gate.earnedRequiredCount / gate.requiredBadgeCount) * 100,
                    )
                  : 100
              }%`,
            }}
          />
        </div>
        <p className="mt-1.5 text-xs font-semibold text-indigo-700">
          残り {remaining} 個で最終問題が解放
        </p>
      </div>

      {/* 不足バッジ一覧 */}
      {gate.missingBadges.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold text-gray-500">不足している必須バッジ</p>
          <ul className="mt-2 space-y-2">
            {gate.missingBadges.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <span aria-hidden className="text-base opacity-60 grayscale">
                  🔒
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-800">
                    {b.label}
                  </span>
                  <span className="block text-[11px] text-gray-500">
                    {b.conditionLabel}
                  </span>
                </span>
                <Link
                  href={badgeActionHref(b)}
                  className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white"
                >
                  挑戦
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 分野カバレッジ・正答率の未達を伝える（あれば） */}
      {(!gate.fieldCoverageMet || !gate.accuracyMet) && (
        <ul className="mt-3 space-y-1">
          {!gate.fieldCoverageMet && (
            <li className="text-xs font-semibold text-amber-700">
              ・3分野すべてに手をつけると解放条件を満たします
            </li>
          )}
          {!gate.accuracyMet && (
            <li className="text-xs font-semibold text-amber-700">
              ・直近の確認問題の正答率をもう少し上げましょう
            </li>
          )}
        </ul>
      )}

      {/* 最終問題ゲート */}
      <div
        className={`mt-4 rounded-xl px-3 py-3 ${
          gate.finalExamUnlocked ? "bg-emerald-50" : "bg-gray-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <p
            className={`text-sm font-bold ${
              gate.finalExamUnlocked ? "text-emerald-700" : "text-gray-500"
            }`}
          >
            {gate.finalExamUnlocked
              ? gate.finalExamPassed
                ? "🏆 最終問題：突破済み"
                : "🔓 最終問題：解放中"
              : "🔒 最終問題：ロック中"}
          </p>
          <Link
            href={`/checkpoint/${checkpoint.id}/final`}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              gate.finalExamUnlocked
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-500 ring-1 ring-gray-200"
            }`}
          >
            {gate.finalExamUnlocked ? "挑戦する →" : "詳細を見る"}
          </Link>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-gray-600">
          勝利条件：{checkpoint.winConditionLabel}
        </p>
      </div>

      {/* おすすめ行動 */}
      <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700">
        👉 {recommend}
      </p>
    </section>
  );
}
