"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OnTrackLevel } from "@/types/plan";
import { ON_TRACK_LABELS } from "@/types/plan";
import type { ReferenceBook } from "@/types/referenceBook";
import { useAppState } from "@/lib/useAppState";
import { getAllTopics } from "@/lib/content";
import { generateLearningPlan, getPhaseDef, STUDY_PHASES } from "@/lib/studyPlanner";
import { loadReferenceBook, referenceBookProgress } from "@/lib/referenceBook";
import BottomNav from "@/components/BottomNav";

// /plan = 合格までの全体ロードマップ。
// 計画ロジックは lib/studyPlanner.ts（純粋関数）に閉じ込め、ここは表示だけを担う。
// 3層（全体ロードマップ → 今週のゴール → 今日やること）で見せる。

const ON_TRACK_STYLE: Record<OnTrackLevel, string> = {
  comfortable: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  tight: "bg-amber-100 text-amber-700 ring-amber-200",
  sprint: "bg-rose-100 text-rose-700 ring-rose-200",
  "no-exam": "bg-gray-100 text-gray-600 ring-gray-200",
};

function formatDate(iso: string | null): string {
  if (!iso) return "未定";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "未定";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PlanPage() {
  const router = useRouter();
  const [state] = useAppState();
  const [book, setBook] = useState<ReferenceBook | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  useEffect(() => {
    let cancelled = false;
    function init() {
      const b = loadReferenceBook();
      if (!cancelled) setBook(b);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const topics = getAllTopics();
  const plan = useMemo(
    () => (state ? generateLearningPlan(state, topics) : null),
    [state, topics],
  );

  if (state === undefined || state === null || !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  const phaseDef = getPhaseDef(plan.currentPhase);
  const bookProgress = referenceBookProgress(book);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-3xl">
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold">合格ロードマップ</span>
            <Link
              href="/settings"
              aria-label="設定"
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
            >
              ⚙️ 設定
            </Link>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-white/80">試験日まで</p>
              <p className="text-3xl font-extrabold">
                {plan.daysUntilExam === null
                  ? "未設定"
                  : `あと${plan.daysUntilExam}日`}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${ON_TRACK_STYLE[plan.onTrack]}`}
            >
              {ON_TRACK_LABELS[plan.onTrack]}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 md:max-w-3xl">
        {/* 現在フェーズ */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-bold text-indigo-500">いまのフェーズ</p>
          <p className="mt-1 text-xl font-extrabold text-gray-800">
            {phaseDef.emoji} {phaseDef.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {phaseDef.summary}
          </p>
          <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700">
            {plan.message}
          </p>
        </section>

        {/* 全体ロードマップ */}
        <section>
          <h2 className="mb-3 text-base font-extrabold text-gray-800">
            合格までのロードマップ
          </h2>
          <ol className="space-y-2.5">
            {plan.phases.map((p) => {
              const def = STUDY_PHASES.find((d) => d.id === p.id)!;
              const isCurrent = p.status === "current";
              const isDone = p.status === "done";
              return (
                <li
                  key={p.id}
                  className={`rounded-2xl p-4 shadow-sm ring-1 ${
                    isCurrent
                      ? "bg-indigo-50 ring-indigo-300"
                      : isDone
                        ? "bg-white ring-gray-100"
                        : "bg-white ring-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`flex items-center gap-2 text-sm font-extrabold ${
                        isCurrent ? "text-indigo-700" : "text-gray-800"
                      }`}
                    >
                      <span className="text-lg" aria-hidden>
                        {def.emoji}
                      </span>
                      {def.title}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isDone
                          ? "bg-emerald-100 text-emerald-700"
                          : isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isDone ? "完了" : isCurrent ? "進行中" : "これから"}
                    </span>
                  </div>
                  {!isDone && (
                    <p className="mt-1.5 text-xs text-gray-500">{def.summary}</p>
                  )}
                  {(isCurrent || isDone) && (
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${isDone ? "bg-emerald-400" : "bg-indigo-500"}`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  )}
                  {isCurrent && (
                    <p className="mt-2 text-xs font-semibold text-indigo-600">
                      👉 {p.hint}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* 今週のゴール */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-bold text-emerald-600">今週のゴール</p>
          <p className="mt-1 text-lg font-extrabold text-gray-800">
            {plan.weeklyGoal.headline}
          </p>
          <p className="mt-1 text-sm text-gray-600">{plan.weeklyGoal.detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.weeklyGoal.targetTopicCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                🎯 テーマ {plan.weeklyGoal.targetTopicCount}件
              </span>
            )}
            {plan.weeklyGoal.reviewCount > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                🔁 復習 {plan.weeklyGoal.reviewCount}件
              </span>
            )}
          </div>
        </section>

        {/* 今日やること導線 */}
        <Link
          href="/today"
          className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
        >
          <p className="text-xs font-bold text-indigo-500">今日やること</p>
          <p className="mt-1 text-lg font-extrabold text-gray-800">
            {plan.todayMenu.theme}
          </p>
          {plan.todayReasons[0] && (
            <p className="mt-1 text-sm text-gray-600">💡 {plan.todayReasons[0]}</p>
          )}
          <span className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
            今日の学習へ →
          </span>
        </Link>

        {/* 過去問開始予定 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-bold text-rose-500">過去問演習</p>
          <p className="mt-1 text-base font-extrabold text-gray-800">
            {plan.kakomonReady
              ? "今から過去問を始めてOK 🎯"
              : plan.kakomonStartDate
                ? `開始目安：${formatDate(plan.kakomonStartDate)}ごろ`
                : "主要テーマが進んだら始めましょう"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            参考書を全部読み終えてからではなく、頻出テーマに一通り触れたら
            少しずつ過去問道場で解き始めます。
          </p>
        </section>

        {/* 参考書1周の進捗 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-500">参考書の進捗</p>
            <Link
              href="/settings/reference-book"
              className="text-xs font-bold text-indigo-600 underline underline-offset-2"
            >
              {book && book.chapters.length > 0 ? "編集" : "登録する"}
            </Link>
          </div>
          {bookProgress ? (
            <>
              <p className="mt-1 text-base font-extrabold text-gray-800">
                {book?.title || "参考書"}：{bookProgress.done} / {bookProgress.total} 章
              </p>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.round(bookProgress.ratio * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              参考書を登録すると、章ごとの進捗と「今日読む場所」を表示できます。
              未登録でも、各トピックの「探すキーワード」で学習できます。
            </p>
          )}
        </section>

        {/* 遅れの調整方針 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-bold text-violet-500">学習ペースの調整</p>
          <p className="mt-1 text-base font-extrabold text-gray-800">
            {plan.reschedule.headline}
          </p>
          <ul className="mt-2 space-y-1.5">
            {plan.reschedule.actions.map((a, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm font-semibold text-gray-700"
              >
                <span aria-hidden className="text-violet-500">
                  ・
                </span>
                {a}
              </li>
            ))}
          </ul>
        </section>

        {/* 設定変更への導線 */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings"
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-indigo-600 ring-1 ring-indigo-200"
          >
            ⚙️ 試験日・学習時間を変更
          </Link>
          <Link
            href="/settings/reference-book"
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-indigo-600 ring-1 ring-indigo-200"
          >
            📚 参考書の設定
          </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
