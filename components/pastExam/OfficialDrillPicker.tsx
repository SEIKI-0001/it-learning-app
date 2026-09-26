"use client";

// 公式過去問の部分演習で出す問題を、この端末の回答履歴から選んで URL に載せ直す。
// 選び方は lib/pastExam/drillSelection（未出題優先・弱点トピック優先）。
// URL に問題 ID が載るので、再読み込みしても同じ問題で続けられる。

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TopicField } from "@/types/content";
import { loadAppState } from "@/lib/storage";
import { getWeakTopics } from "@/lib/learningLoop";
import { summarizeOfficialHistory } from "@/lib/pastExam/officialHistory";
import {
  selectDrillQuestionIds,
  type DrillIndexEntry,
  type DrillSelectionStage,
} from "@/lib/pastExam/drillSelection";
import { buttonClass } from "@/components/ui/Button";
import { attachDrillQuestions } from "@/lib/todayActivitySync";
import { rememberDrillQuestions } from "@/lib/todayActivityLog";
import { ACTIVITY_KEYS } from "@/lib/todayActivitySpec";
import { todayLocalDate } from "@/lib/userSession";

export default function OfficialDrillPicker({
  stage,
  field,
  count,
  index,
  query,
}: {
  stage: DrillSelectionStage;
  field?: TopicField;
  count: number;
  index: DrillIndexEntry[];
  /** いまの URL のクエリ（from・task などを引き継ぐ）。 */
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const state = loadAppState();
    const history = summarizeOfficialHistory(state?.answers ?? []);
    const weakTopicIds = new Set(
      getWeakTopics(state?.progress.topicMasteryStats ?? {}).map((weak) => weak.topicId),
    );
    const ids = selectDrillQuestionIds({
      stage,
      field,
      count,
      index,
      ids: stage === "retry-wrong" ? history.pendingWrongIds : undefined,
      answeredIds: history.answeredIds,
      wrongIds: history.latestWrongIds,
      weakTopicIds,
      seed: String(Date.now()),
    });
    if (ids.length === 0) {
      // 外部（localStorage）の状態を読んだ結果を表示へ反映する。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmpty(true);
      return;
    }
    let cancelled = false;
    const open = (chosen: string[]) => {
      if (cancelled) return;
      const next = new URLSearchParams(query);
      next.set("ids", chosen.join(","));
      router.replace(`/past-exams/drill?${next.toString()}`);
    };
    // Today の演習タスクなら、選んだ問題をその日のタスクに固定する。別端末で先に
    // 開いていれば、その端末が選んだ問題が返ってくるので、そちらで開く。
    const taskId = query.task === ACTIVITY_KEYS.past_exam_drill ? query.task : null;
    if (!taskId) {
      open(ids);
      return;
    }
    void attachDrillQuestions(todayLocalDate(), ids).then((fixed) => {
      const chosen = fixed ?? ids;
      rememberDrillQuestions(taskId, chosen);
      open(chosen);
    });
    return () => {
      cancelled = true;
    };
  }, [count, field, index, query, router, stage]);

  if (empty) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm leading-relaxed text-gray-600">
          {stage === "retry-wrong"
            ? "解き直す誤答はありません。間違えた公式過去問は、翌日以降にここへ集まります。"
            : "出題できる問題がありませんでした。"}
        </p>
        <Link href="/past-exams" className={buttonClass("secondary", "md", "mt-4")}>
          公式過去問トップへ
        </Link>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
    >
      <span
        aria-hidden
        className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600 motion-reduce:animate-none"
      />
      問題を選んでいます…
    </div>
  );
}
