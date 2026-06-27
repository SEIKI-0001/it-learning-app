"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics, getTopic } from "@/lib/content";
import { daysUntilExam } from "@/lib/aiPlanner";
import { fieldMastery } from "@/lib/study";
import { getLevelName } from "@/lib/game";
import type { ReviewItem } from "@/types";
import FieldMasteryBars from "@/components/FieldMasteryBars";
import ExpBar from "@/components/ExpBar";
import BottomNav from "@/components/BottomNav";

// 最後の学習からの経過日数(暦日ベース)。lastPlayedAtが無ければnull。
function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  ).getTime();
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const diff = Math.floor((startOfToday - startOfThen) / 86_400_000);
  return diff < 0 ? 0 : diff;
}

// 短い日付("M/D")。不正な値は空文字。
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type NextAction = {
  kind: "review" | "comeback" | "new";
  label: string;
  description: string;
  emoji: string;
  tone: string; // カードの配色
};

// 次に取るべき最小行動を決める。
function decideNextAction(
  reviewCount: number,
  gap: number | null,
): NextAction {
  if (reviewCount > 0) {
    return {
      kind: "review",
      label: "復習",
      description: `リベンジ対象が${reviewCount}件あります。まず1件やっつけましょう。`,
      emoji: "🔁",
      tone: "from-amber-500 to-orange-500",
    };
  }
  if (gap !== null && gap >= 2) {
    return {
      kind: "comeback",
      label: "復帰",
      description: "少し時間が空きました。1テーマだけ軽く戻りましょう。",
      emoji: "🌱",
      tone: "from-emerald-500 to-teal-500",
    };
  }
  return {
    kind: "new",
    label: "新規学習",
    description: "今日のテーマに進みましょう。1つだけでOKです。",
    emoji: "✨",
    tone: "from-indigo-500 to-violet-500",
  };
}

type ComebackState = {
  label: string;
  message: string;
};

// 最後の学習からの経過状態(ストリーク切れは強調しない)。
function decideComebackState(gap: number | null): ComebackState {
  if (gap === null) {
    return {
      label: "はじめまして",
      message: "ここがあなたの学習ホームです。気楽に始めましょう。",
    };
  }
  if (gap <= 1) {
    return {
      label: "継続中",
      message:
        gap === 0
          ? "今日も学習できています。いい調子です。"
          : "昨日も学習できています。今日も少しだけ進めましょう。",
    };
  }
  if (gap <= 6) {
    return {
      label: "おかえりなさい",
      message: "空いても大丈夫。ここから何度でも再開できます。",
    };
  }
  return {
    label: "ゆっくり再開しましょう",
    message: "久しぶりでも問題なし。まずは1テーマだけ戻ってみましょう。",
  };
}

// 進捗画面。次の1アクション/復帰/リベンジ対象を中心に、既存の成績表示を下部に残す。
export default function ProgressPage() {
  const router = useRouter();
  const [state] = useAppState();

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  if (state === undefined || state === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  const { profile, progress } = state;
  const topics = getAllTopics();
  const remaining = daysUntilExam(profile);
  const mastery = fieldMastery(progress, topics);
  const completedCount = progress.completedTopics.length;
  const overall =
    topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  const reviewQueue = progress.reviewQueue ?? [];
  const reviewCount = reviewQueue.length;
  const gap = daysSince(progress.lastPlayedAt);

  const nextAction = decideNextAction(reviewCount, gap);
  const comeback = decideComebackState(gap);

  // リベンジ対象: dueAtが近い順に最大3件。
  const revengeItems: ReviewItem[] = [...reviewQueue]
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0))
    .slice(0, 3);

  // 最近の学習履歴(新しい順に5件)
  const recent = [...state.answers]
    .sort((a, b) => (a.answeredAt < b.answeredAt ? 1 : -1))
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-extrabold">進捗</h1>
          <div className="mt-4 flex items-center gap-5">
            {/* 達成リング */}
            <div
              className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#fbbf24 ${overall * 3.6}deg, rgba(255,255,255,0.2) 0deg)`,
              }}
            >
              <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-indigo-600">
                <span className="text-xl font-extrabold">{overall}%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm">
                <span className="text-white/70">試験日まで </span>
                <span className="font-extrabold">
                  {remaining === null ? "未設定" : `あと${remaining}日`}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-white/70">連続学習 </span>
                <span className="font-extrabold">🔥 {progress.streakCount}日</span>
              </p>
              <p className="text-sm">
                <span className="text-white/70">Lv.{progress.level} </span>
                <span className="font-extrabold">{getLevelName(progress.level)}</span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ExpBar exp={progress.exp} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6">
        {/* ① 次の1アクションカード */}
        <section
          className={`rounded-2xl bg-gradient-to-r ${nextAction.tone} p-5 text-white shadow-md`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-white/80">
            次の1アクション
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl">{nextAction.emoji}</span>
            <div>
              <p className="text-lg font-extrabold">{nextAction.label}</p>
              <p className="text-xs text-white/80">所要時間の目安 2〜5分</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-white/90">{nextAction.description}</p>
          <Link
            href="/today"
            className="mt-4 block rounded-xl bg-white px-6 py-3 text-center text-base font-extrabold text-gray-900 shadow transition active:scale-[0.98]"
          >
            今すぐ始める →
          </Link>
        </section>

        {/* ② 復帰カード */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-800">
              {comeback.label}
            </h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {gap === null
                ? "学習はこれから"
                : gap === 0
                  ? "今日学習しました"
                  : `最後の学習から${gap}日`}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{comeback.message}</p>
          <Link
            href="/today"
            className="mt-4 block rounded-xl bg-emerald-600 px-6 py-3 text-center text-base font-extrabold text-white shadow transition active:scale-[0.98]"
          >
            学習を再開する
          </Link>
        </section>

        {/* ③ リベンジ対象カード */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-800">
              リベンジ対象
            </h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {reviewCount}件
            </span>
          </div>

          {reviewCount === 0 ? (
            <p className="mt-3 text-sm text-gray-400">
              いまリベンジ対象はありません。間違えた問題はここに集まります。
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {revengeItems.map((item, i) => {
                const topic = getTopic(item.topicId);
                const due = shortDate(item.dueAt);
                return (
                  <li
                    key={`${item.topicId}-${i}`}
                    className="rounded-xl bg-amber-50/60 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-gray-800">
                        {topic?.title ?? "確認問題"}
                      </span>
                      {due && (
                        <span className="shrink-0 text-xs text-amber-700">
                          期限 {due}
                        </span>
                      )}
                    </div>
                    {item.reason && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/today"
            className="mt-4 block rounded-xl bg-amber-500 px-6 py-3 text-center text-base font-extrabold text-white shadow transition active:scale-[0.98]"
          >
            {reviewCount === 0 ? "今日の学習へ" : "リベンジする"}
          </Link>
        </section>

        {/* 数値サマリ */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="学習済み" value={`${completedCount}/${topics.length}`} />
          <StatCard label="復習待ち" value={`${reviewCount}`} />
          <StatCard label="累計XP" value={`${progress.exp}`} />
        </div>

        {/* 3分野習熟度 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-extrabold text-gray-800">
            3分野別の習熟度
          </h2>
          <FieldMasteryBars mastery={mastery} />
        </section>

        {/* 最近の学習履歴 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-base font-extrabold text-gray-800">
            最近の学習
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">
              まだ記録がありません。今日の学習から始めましょう。
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((a, i) => {
                const topic = a.topicId ? getTopic(a.topicId) : undefined;
                return (
                  <li
                    key={`${a.questionId}-${i}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">
                      {topic?.title ?? a.tag ?? "確認問題"}
                    </span>
                    <span>{a.isCorrect ? "⭕️" : "❌"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100">
      <p className="text-xl font-extrabold text-gray-800">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}
