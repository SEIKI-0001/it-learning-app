"use client";

import { useMemo, useState } from "react";
import type { AppState } from "@/types";
import type { ReferenceBook } from "@/types/referenceBook";
import { getAllTopics, getTopic } from "@/lib/content";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import { currentBookUnit, nextBookTopicIds } from "@/lib/bookStudyOrder";
import { BOOK_QUALITY_FAILURE_LABELS } from "@/lib/bookQuality";
import { bookOrderFlag } from "@/lib/bookOrderFlag";
import { resolveStudyContext } from "@/lib/studyContext";
import { buttonClass } from "@/components/ui/Button";

// 「新しく学ぶ順番」を参考書の順にするかの設定（/settings/reference-book）。
// 切り替える前に「次に学ぶ順番がこう変わる」を見せてから確定させる（いきなり今日の内容を変えない）。
// 機能フラグが off のあいだは表示しない。

const PREVIEW_COUNT = 5;

export default function StudyOrderCard({
  book,
  state,
  onPreferenceChange,
}: {
  book: ReferenceBook;
  state: AppState;
  onPreferenceChange: (preference: "app" | "book") => void;
}) {
  const topics = useMemo(() => getAllTopics(), []);
  const flag = bookOrderFlag();
  const preference = state.profile?.studyOrderPreference ?? null;
  const [previewing, setPreviewing] = useState(false);

  // 判定は希望を「book」と仮定して求める（品質と順序のプレビューのため）。
  const candidate = useMemo(
    () =>
      resolveStudyContext({
        preference: "book",
        book,
        topics,
        flag,
        examDate: state.profile?.examDate,
        weekdayMinutes: state.profile?.weekdayMinutes,
        holidayMinutes: state.profile?.holidayMinutes,
      }),
    [book, flag, state.profile?.examDate, state.profile?.holidayMinutes, state.profile?.weekdayMinutes, topics],
  );

  const preview = useMemo(() => {
    if (!candidate.order) return null;
    const completed = state.progress.completedTopics;
    const appNext = buildTodaysLearningQueue({ progress: state.progress, topics, state })
      .filter((item) => item.kind === "new_topic" && item.topicId)
      .slice(0, PREVIEW_COUNT)
      .map((item) => item.topicId!);
    return {
      appNext,
      bookNext: nextBookTopicIds(candidate.order, completed, PREVIEW_COUNT),
      resumeAt: currentBookUnit(candidate.order, completed)?.label ?? null,
    };
  }, [candidate.order, state, topics]);

  if (flag === "off" || book.chapters.length === 0) return null;

  const order = candidate.order;
  const sectionUnits = order?.units.filter((u) => u.level === "section").length ?? 0;
  const chapterUnits = order?.units.filter((u) => u.level === "chapter").length ?? 0;
  const granularity =
    sectionUnits > 0 && chapterUnits > 0
      ? "節のある章は節ごと、節のない章は章ごと"
      : sectionUnits > 0
        ? "節ごと"
        : "章ごと";
  const eligible = candidate.quality?.eligible ?? false;
  const usingBook = preference === "book";

  return (
    <section aria-labelledby="study-order-heading">
      <h2 id="study-order-heading" className="mb-1 text-base font-semibold text-gray-900">
        学ぶ順番
      </h2>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="text-sm text-gray-900">
          {usingBook ? "参考書の順に進めています" : "アプリのおすすめ順に進めています"}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          参考書の順にすると、新しく学ぶテーマをこの本の章・節の順に出します（{granularity}）。
          復習や苦手の見直し、本に無い試験範囲の補足は、これまでどおりアプリが組み込みます。
        </p>

        {!eligible && candidate.quality && (
          <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">この本ではまだ参考書の順にできません</p>
            <ul className="mt-1 list-disc pl-4">
              {candidate.quality.failures.map((failure) => (
                <li key={failure}>{BOOK_QUALITY_FAILURE_LABELS[failure]}</li>
              ))}
            </ul>
            <p className="mt-1">下の「詳細設定」で章・節とレッスンを結びつけるか、目次のスクショを読み取ってください。</p>
          </div>
        )}

        {usingBook && (
          <button
            type="button"
            onClick={() => onPreferenceChange("app")}
            className={buttonClass("secondary", "sm", "mt-3")}
          >
            アプリのおすすめ順に戻す
          </button>
        )}

        {!usingBook && eligible && !previewing && (
          <button
            type="button"
            onClick={() => setPreviewing(true)}
            className={buttonClass("primary", "sm", "mt-3")}
          >
            参考書の順にした場合を見る
          </button>
        )}

        {!usingBook && eligible && previewing && preview && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            {preview.resumeAt && (
              <p className="text-xs text-gray-700">
                本の中でまだ学んでいない最初のところ（{preview.resumeAt}）から始めます。
              </p>
            )}
            <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <p className="font-medium text-gray-500">いまの順番</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-gray-700">
                  {preview.appNext.map((id) => (
                    <li key={id}>{getTopic(id)?.title ?? id}</li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="font-medium text-brand-700">参考書の順</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-gray-900">
                  {preview.bookNext.map((id) => (
                    <li key={id}>{getTopic(id)?.title ?? id}</li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onPreferenceChange("book");
                  setPreviewing(false);
                }}
                className={buttonClass("primary", "sm")}
              >
                参考書の順にする
              </button>
              <button
                type="button"
                onClick={() => setPreviewing(false)}
                className="px-2 text-sm text-gray-600 underline underline-offset-2"
              >
                やめる
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              獲得したバッジや突破したチェックポイントはそのままです。いつでも元の順番に戻せます。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
