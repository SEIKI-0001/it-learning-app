"use client";

import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics } from "@/lib/content";
import { daysUntilExam, generateTodayMenu } from "@/lib/aiPlanner";
import { generateLearningPlan, getPhaseDef } from "@/lib/studyPlanner";
import { fieldMastery } from "@/lib/study";
import { getRankStatus } from "@/lib/rank";
import BottomNav from "@/components/BottomNav";
import FieldMasteryBars from "@/components/FieldMasteryBars";

function formatMonthDay(iso: string | null): string {
  if (!iso) return "未定";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "未定";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ホーム = 学習ダッシュボード。
// 未設定(初回)なら ITパスポート学習コーチの紹介＋設定導線を表示し、
// 設定済みなら「今日やること・試験日まで・進捗・3分野習熟度」を表示する。

export default function Home() {
  const [state] = useAppState();

  if (state === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  // --- 未設定: サービス紹介 ---
  if (state === null || !state.profile) {
    const points = [
      { emoji: "📅", text: "試験日から逆算した学習プラン" },
      { emoji: "📖", text: "今日やることが毎日わかる" },
      { emoji: "🔁", text: "苦手と間違いを自動で復習" },
      { emoji: "📱", text: "LINEで続けられる" },
    ];
    return (
      <main className="min-h-screen bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-10 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <span className="mb-6 inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide">
            ITパスポート合格支援
          </span>
          <div className="mb-4 text-6xl" aria-hidden>
            🎓
          </div>
          <h1 className="text-3xl font-extrabold leading-tight">
            ITパスポート学習コーチ
          </h1>
          <p className="mt-3 text-lg font-bold text-amber-200">
            あなたの試験日に合わせて、今日やることを案内します
          </p>
          <p className="mt-4 text-sm leading-relaxed text-indigo-100">
            IT未経験でも大丈夫。ストラテジ・マネジメント・テクノロジの3分野を、
            <br />
            やさしい言葉と図解で少しずつ進めましょう。
          </p>

          <ul className="mt-8 w-full space-y-2.5">
            {points.map((p) => (
              <li
                key={p.text}
                className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-sm font-semibold backdrop-blur-sm"
              >
                <span className="text-xl" aria-hidden>
                  {p.emoji}
                </span>
                {p.text}
              </li>
            ))}
          </ul>

          <Link
            href="/onboarding"
            className="mt-9 w-full rounded-2xl bg-amber-300 px-6 py-4 text-center text-lg font-extrabold text-amber-900 shadow-lg transition active:scale-[0.98]"
          >
            🚀 学習をはじめる
          </Link>
          <Link
            href="/topics"
            className="mt-3 text-sm font-medium text-indigo-100 underline underline-offset-4"
          >
            まずはトピックを見てみる
          </Link>
        </div>
      </main>
    );
  }

  // --- 設定済み: ダッシュボード ---
  const { profile, progress } = state;
  const topics = getAllTopics();
  const remaining = daysUntilExam(profile);
  const menu = generateTodayMenu(profile, progress, topics, state.answers);
  const mastery = fieldMastery(progress, topics);
  const completedCount = progress.completedTopics.length;
  const rank = getRankStatus(progress.exp);
  const plan = generateLearningPlan(state, topics);
  const phaseDef = getPhaseDef(plan.currentPhase);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-3xl">
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold">ITパスポート学習コーチ</span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                🔥 {progress.streakCount}日連続
              </span>
              <Link
                href="/settings"
                aria-label="設定"
                className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
              >
                ⚙️
              </Link>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-4">
            <Link
              href="/settings"
              className="text-left transition active:scale-[0.98]"
            >
              <p className="text-xs text-white/80">
                試験日まで<span aria-hidden className="ml-1">✎</span>
              </p>
              <p className="text-3xl font-extrabold">
                {remaining === null ? "未設定" : `あと${remaining}日`}
              </p>
            </Link>
            <div className="ml-auto text-right">
              <p className="text-xs text-white/80">
                {rank.current.emoji} {rank.current.name}
              </p>
              <p className="text-xl font-extrabold">{progress.exp} XP</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-3xl">
        {/* 合格ロードマップ */}
        <Link
          href="/plan"
          className="block rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm ring-1 ring-indigo-100 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-500">合格ロードマップ</p>
            <span className="text-xs font-bold text-indigo-600">
              詳しく見る →
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold text-gray-800">
            {phaseDef.emoji} {phaseDef.title}
            {remaining !== null && (
              <span className="ml-2 text-sm font-bold text-indigo-600">
                試験まであと{remaining}日
              </span>
            )}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-gray-700">
            🎯 今週のゴール：{plan.weeklyGoal.headline}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            過去問開始目安：
            {plan.kakomonReady
              ? "今から始めてOK"
              : plan.kakomonStartDate
                ? `${formatMonthDay(plan.kakomonStartDate)}ごろ`
                : "主要テーマ完了後"}
          </p>
        </Link>

        <div className="grid gap-5 md:grid-cols-2">
        {/* 今日やること */}
        <Link
          href="/today"
          className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
        >
          <p className="text-xs font-bold text-indigo-500">今日やること</p>
          <p className="mt-1 text-lg font-extrabold text-gray-800">{menu.theme}</p>
          <p className="mt-1 text-sm text-gray-500">
            目安 {menu.totalMinutes}分・確認問題と復習つき
          </p>
          <span className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
            今日の学習をはじめる →
          </span>
        </Link>

        {/* 進捗サマリ */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-800">3分野の習熟度</h2>
            <Link
              href="/progress"
              className="text-xs font-bold text-indigo-600 underline underline-offset-2"
            >
              詳しく見る
            </Link>
          </div>
          <FieldMasteryBars mastery={mastery} />
          <p className="mt-4 text-sm text-gray-500">
            学習済みトピック {completedCount} / {topics.length}
            {progress.reviewQueue.length > 0 &&
              `・復習待ち ${progress.reviewQueue.length}`}
          </p>
        </section>
        </div>

        {/* LINE導線 */}
        <p className="px-1 text-center text-xs text-gray-400">
          LINEで「今日」「進捗」「復習」と送ると、続きをすぐに開けます。
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
