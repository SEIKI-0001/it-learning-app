"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { UserAnswer } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { useAppState } from "@/lib/useAppState";
import { useBadgeSync } from "@/lib/useBadgeSync";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { saveAppState } from "@/lib/storage";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import { getTopic } from "@/lib/content";
import {
  CHECKPOINTS,
  buildCheckpointGate,
  getCheckpoint,
  getCheckpointProgress,
  getNextCheckpointId,
  recordFinalExamAttempt,
} from "@/lib/checkpoints";
import {
  buildFinalExamAttempt,
  generateFinalExam,
  scoreFinalExam,
  type FinalExam,
  type FinalExamResult,
} from "@/lib/finalExam";
import { badgeActionHref } from "@/components/badges/BadgeList";
import FinalExamCard from "@/components/checkpoints/FinalExamCard";
import GateRequirementList from "@/components/checkpoints/GateRequirementList";
import TopicQuiz from "@/components/learn/TopicQuiz";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

const VALID_IDS = new Set(CHECKPOINTS.map((c) => c.id));

export default function FinalExamPage() {
  const router = useRouter();
  const params = useParams<{ checkpointId: string }>();
  const rawId = params?.checkpointId ?? "";
  const checkpointId = (VALID_IDS.has(rawId as CheckpointId)
    ? rawId
    : "cp1") as CheckpointId;

  const [state, setState] = useAppState();
  useBadgeSync(state, setState);
  const [exam, setExam] = useState<FinalExam | null>(null);
  const [result, setResult] = useState<FinalExamResult | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  // 単語帳の進捗は AppState 外なので毎レンダー読み直す（軽量）。
  const signals = getClientBadgeSignals();

  const checkpoint = getCheckpoint(checkpointId);
  const rangeLabel =
    checkpoint.finalExam && checkpoint.finalExam.weakRatio > 0
      ? "3分野の重要トピック＋あなたの苦手・誤答から出題"
      : "3分野の重要トピックから出題";

  if (state === undefined || state === null) {
    return <LoadingScreen />;
  }

  // cp0 など最終問題を持たないチェックポイント。
  if (!checkpoint.finalExam) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="mx-auto max-w-md px-4 py-10 text-center">
          <p className="text-3xl">🧭</p>
          <p className="mt-2 text-base font-extrabold text-gray-800">
            このチェックポイントに最終問題はありません
          </p>
          <Link
            href="/plan"
            className="mt-4 inline-block rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white"
          >
            ロードマップへ
          </Link>
        </div>
        <BottomNav />
      </main>
    );
  }

  const gate = buildCheckpointGate(state, checkpointId);
  const cpProgress = getCheckpointProgress(state);
  const alreadyPassed =
    gate.finalExamPassed || cpProgress.clearedCheckpointIds.includes(checkpointId);
  const nextId = getNextCheckpointId(checkpointId);
  const next = nextId ? getCheckpoint(nextId) : null;

  function startExam() {
    if (!state) return;
    setResult(null);
    setExam(generateFinalExam(state, checkpointId));
  }

  function handleComplete(answers: UserAnswer[]) {
    if (!state || !exam) return;
    const scored = scoreFinalExam(exam, answers);
    const attempt = buildFinalExamAttempt(exam, scored);
    const updated = recordFinalExamAttempt(state, attempt, signals);
    saveAppState(updated);
    setState(updated);
    setResult(scored);
    const uid = getUserId();
    if (uid) saveProgressToDb(uid, updated.progress);
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-rose-500 to-orange-500 px-4 pb-4 pt-4 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/plan" className="text-xs font-semibold text-white/80">
            ← ロードマップ
          </Link>
          <p className="mt-1 text-[11px] font-semibold text-white/80">
            突破試験（最終問題）
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-2xl">
        <FinalExamCard checkpoint={checkpoint} gate={gate} rangeLabel={rangeLabel} />

        {/* --- 採点結果 --- */}
        {result ? (
          result.passed ? (
            <section className="animate-pop-in overflow-hidden rounded-2xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
              <p className="text-4xl">🏆</p>
              <p className="mt-2 text-lg font-extrabold text-emerald-700">
                CP{checkpoint.order} を突破しました！
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-600">
                {result.total}問中 {result.correct}問正解
              </p>

              {/* CP突破の達成感: いまのCP → 次のCP へ進んだことを見せる */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {checkpoint.emoji} CP{checkpoint.order}
                  <span className="ml-1 text-[10px] text-emerald-500">突破</span>
                </span>
                <span aria-hidden className="text-lg text-emerald-500">
                  →
                </span>
                {next ? (
                  <span className="animate-sheen rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-3 py-2 text-sm font-bold text-white">
                    {next.emoji} CP{next.order}
                    <span className="ml-1 text-[10px] text-white/80">
                      {next.finalExam ? "解禁" : "ゴール"}
                    </span>
                  </span>
                ) : (
                  <span className="rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 px-3 py-2 text-sm font-bold text-white">
                    🎓 合格へ
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-emerald-700">
                {next
                  ? `次のチェックポイント「${next.title}」へ進みます。`
                  : "すべてのチェックポイントを突破しました！合格へ向けて総仕上げを。"}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {next && next.finalExam && (
                  <Link
                    href={`/checkpoint/${next.id}/final`}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white"
                  >
                    次のチェックポイントへ →
                  </Link>
                )}
                <Link
                  href="/plan"
                  className="rounded-2xl bg-white px-6 py-3 font-bold text-emerald-700 ring-1 ring-emerald-200"
                >
                  ロードマップを見る
                </Link>
                <Link
                  href="/badges"
                  className="rounded-2xl bg-white px-6 py-3 font-bold text-indigo-600 ring-1 ring-indigo-200"
                >
                  獲得バッジを見る
                </Link>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-amber-200">
              <p className="text-center text-4xl">💪</p>
              <p className="mt-2 text-center text-lg font-extrabold text-gray-800">
                あと少し！次で突破できます
              </p>
              <p className="mt-1 text-center text-sm font-semibold text-gray-600">
                {result.total}問中 {result.correct}問正解（合格まであと
                {Math.max(0, exam!.rule.passThreshold - result.correct)}問）
              </p>

              {result.wrongTopicIds.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-500">
                    間違えたテーマ（復習対象に追加しました）
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {result.wrongTopicIds.map((id) => {
                      const t = getTopic(id);
                      return (
                        <li key={id}>
                          <Link
                            href={`/topics/${id}`}
                            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700"
                          >
                            <span className="truncate">{t?.title ?? id}</span>
                            <span className="shrink-0 text-xs text-indigo-600">
                              復習する →
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700">
                再挑戦条件：間違えたテーマを復習すれば、いつでも何度でも再挑戦できます。ペナルティはありません。
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={startExam}
                  className="rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white active:scale-[0.99]"
                >
                  もう一度挑戦する
                </button>
                <Link
                  href="/review"
                  className="rounded-2xl bg-white px-6 py-3 text-center font-bold text-indigo-600 ring-1 ring-indigo-200"
                >
                  先に復習する
                </Link>
              </div>
            </section>
          )
        ) : exam ? (
          /* --- 出題中 --- */
          <section>
            <h2 className="mb-3 text-base font-extrabold text-gray-800">
              ⚔️ 突破試験（全{exam.questions.length}問）
            </h2>
            <TopicQuiz
              topicId={`final-${checkpointId}`}
              questions={exam.questions}
              onComplete={handleComplete}
              completeLabel="採点する"
              dense
            />
          </section>
        ) : gate.finalExamUnlocked ? (
          /* --- 解放済み・未開始 --- */
          <section className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100">
            {alreadyPassed && (
              <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                このチェックポイントは突破済みです。実力確認にもう一度挑戦できます。
              </p>
            )}
            <p className="text-3xl">⚔️</p>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              必要な条件は揃いました。突破すれば次のチェックポイントへ進めます。
            </p>
            <button
              type="button"
              onClick={startExam}
              className="animate-glow-ring mt-4 w-full rounded-2xl bg-rose-500 px-6 py-3 font-bold text-white active:scale-[0.99]"
            >
              突破試験に挑む
            </button>
          </section>
        ) : (
          /* --- ロック中 --- */
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-bold text-gray-700">
              🔒 まだ解放されていません
            </p>
            <p className="mt-1 text-xs text-gray-500">
              下の条件を満たすと突破試験に挑戦できます。獲得条件は各バッジに表示しています。
            </p>

            {/* 解放条件チェックリスト（達成/未達を一目で） */}
            <div className="mt-3 rounded-xl bg-gray-50 px-3.5 py-3">
              <GateRequirementList gate={gate} />
            </div>

            {gate.missingBadges.length > 0 && (
              <p className="mt-3 text-xs font-bold text-gray-500">
                あと少しの必須バッジ
              </p>
            )}
            {gate.missingBadges.length > 0 && (
              <ul className="mt-3 space-y-2">
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
            )}

            <Link
              href="/badges"
              className="mt-4 inline-block rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 ring-1 ring-indigo-200"
            >
              バッジ一覧で条件を見る
            </Link>
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
