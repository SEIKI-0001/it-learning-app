"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics, getTopic } from "@/lib/content";
import { daysUntilExam } from "@/lib/aiPlanner";
import { fieldMastery } from "@/lib/study";
import { getLevelName } from "@/lib/game";
import FieldMasteryBars from "@/components/FieldMasteryBars";
import ExpBar from "@/components/ExpBar";
import BottomNav from "@/components/BottomNav";

// 進捗画面。全体進捗・試験日まで・学習済みTopic数・3分野習熟度・ストリーク・XP/レベル・最近の履歴。
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
        {/* 数値サマリ */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="学習済み" value={`${completedCount}/${topics.length}`} />
          <StatCard label="復習待ち" value={`${progress.reviewQueue.length}`} />
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

        <Link
          href="/today"
          className="block rounded-2xl bg-indigo-600 px-6 py-4 text-center text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
        >
          今日の学習へ
        </Link>
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
