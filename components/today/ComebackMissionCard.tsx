"use client";

// 復帰ミッション（GF-P1-002）。
//
// 数日空いた人に、山積みの未完了ではなく短い再開点を出す。
// 空いた日数は事実として一度だけ触れ、遅れや失敗としては扱わない。
// やらなくても、途中でやめても失うものはない。

import Link from "next/link";
import type { ComebackMission } from "@/lib/comebackMission";
import { getLessonHref } from "@/lib/learningCatalog";
import Icon from "@/components/ui/Icon";

export default function ComebackMissionCard({ mission }: { mission: ComebackMission }) {
  const first = mission.items[0];
  const href = getLessonHref(first.topicId, {
    from: "today",
    activity: "review",
    anchor: "lesson-quiz",
  });

  return (
    <section
      aria-labelledby="comeback-heading"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex items-center gap-2">
        <Icon name="sprout" className="h-4 w-4 shrink-0 text-brand-600" />
        <h2 id="comeback-heading" className="text-sm font-semibold text-gray-900">
          おかえりなさい
        </h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">
        {mission.daysAway}日ぶりです。まずは前に学んだところを、
        約{mission.totalMinutes}分だけ思い出すところから戻りましょう。
      </p>

      <ul className="mt-2.5 divide-y divide-gray-100 border-y border-gray-100">
        {mission.items.map((item) => (
          <li key={item.topicId} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-sm text-gray-800">{item.title}</span>
            <span className="shrink-0 text-xs tabular-nums text-gray-500">
              約{item.estimatedMinutes}分
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-3 flex w-full items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
      >
        軽く思い出すところから始める
        <Icon name="arrow-right" className="ml-3 h-4 w-4 shrink-0" />
      </Link>
      <p className="mt-1.5 text-center text-[11px] text-gray-400">
        やらなくても大丈夫です。下の「今日のルート」からいつもどおり進めます。
      </p>
    </section>
  );
}
