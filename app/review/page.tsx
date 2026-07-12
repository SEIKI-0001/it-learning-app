"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { getReviewItemsForUser, getTopic } from "@/lib/content";
import { snoozeTopicReview } from "@/lib/study";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import { getLessonHref, getLessonLocation } from "@/lib/learningCatalog";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";

type ReviewGroup = "scheduled" | "incorrect" | "weakness";

const GROUP_LABELS: Record<ReviewGroup, string> = {
  scheduled: "今日が復習予定",
  incorrect: "間違えた問題",
  weakness: "理解度が低い・苦手な内容",
};

function groupForReason(reason: string): ReviewGroup {
  if (reason.includes("間違")) return "incorrect";
  if (reason.includes("苦手") || reason.includes("理解")) return "weakness";
  return "scheduled";
}

// 復習ページは対象を選ぶ一覧。解説・問題はレッスンページの同じUIに集約する。
export default function ReviewPage() {
  const router = useRouter();
  const [state, setState] = useAppState();

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  const reviewItems = useMemo(
    () =>
      state
        ? getReviewItemsForUser({
            progress: state.progress,
            weakFields: state.profile?.weakFields,
          })
        : [],
    [state],
  );

  const wrongByTopic = useMemo(() => {
    const map = new Map<string, number>();
    for (const answer of state?.answers ?? []) {
      if (!answer.isCorrect && answer.topicId) {
        map.set(answer.topicId, (map.get(answer.topicId) ?? 0) + 1);
      }
    }
    return map;
  }, [state?.answers]);

  const groupedItems = useMemo(
    () =>
      (Object.keys(GROUP_LABELS) as ReviewGroup[]).map((group) => ({
        group,
        items: reviewItems.filter((item) => groupForReason(item.reason) === group),
      })),
    [reviewItems],
  );

  if (state === undefined || state === null) return <LoadingScreen />;

  function handleSnooze(topicId: string) {
    if (!state) return;
    const next = snoozeTopicReview(state, topicId);
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) void saveProgressToDb(userId, next.progress);
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        eyebrow="学び直すレッスン"
        title="復習"
        description="復習対象を選ぶと、学ぶページの解説や確認問題へ移動します。"
        accessory={
          reviewItems.length > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
              {reviewItems.length}件
            </span>
          ) : undefined
        }
      />

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6">
        {reviewItems.length === 0 ? (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-3xl" aria-hidden>✨</p>
            <h2 className="mt-3 text-lg font-extrabold text-gray-900">いまは復習対象がありません</h2>
            <p className="mt-1 text-sm text-gray-500">学習後に、必要なレッスンをここへ自動で追加します。</p>
            <Link href="/learn" className={buttonClass("primary", "lg", "mt-5")}>
              テーマから学ぶ
            </Link>
          </section>
        ) : (
          groupedItems.map(({ group, items }) => {
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <h2 className="text-lg font-extrabold text-gray-900">{GROUP_LABELS[group]}</h2>
                <div className="mt-3 space-y-3">
                  {items.map((item) => {
                    const topic = getTopic(item.topicId);
                    const location = getLessonLocation(item.topicId);
                    if (!topic || !location) return null;
                    const wrong = wrongByTopic.get(topic.id) ?? 0;
                    return (
                      <article key={topic.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                        <p className="text-xs font-extrabold text-amber-700">
                          {item.reason}{wrong > 0 ? `・間違い${wrong}問` : ""}
                        </p>
                        <h3 className="mt-1 text-lg font-extrabold text-gray-900">{topic.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {location.theme.title} ＞ {location.section.title}
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <Link
                            href={getLessonHref(topic.id, { from: "review", activity: "review", anchor: "lesson-content" })}
                            className={buttonClass("soft")}
                          >
                            解説を読む
                          </Link>
                          <Link
                            href={getLessonHref(topic.id, { from: "review", activity: "quiz", anchor: "lesson-quiz" })}
                            className={buttonClass("primary")}
                          >
                            問題に挑戦
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleSnooze(topic.id)}
                            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-50 active:scale-[0.98]"
                          >
                            3日後に再表示
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}
