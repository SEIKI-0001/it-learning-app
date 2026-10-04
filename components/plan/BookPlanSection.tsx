import type { ReferenceStudyPlan } from "@/types/referenceBook";
import type { BookStudyOrder, BookUnit } from "@/lib/bookStudyOrder";
import { isBookUnitLearned } from "@/lib/bookStudyOrder";
import { referenceStudyPlanProgress } from "@/lib/bookStudyPlan";
import { cardClass } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";

// /plan の「参考書の計画」。参考書順（Book mode）のときだけ出す。
// 進み具合は Topic の完了だけで判定する（読了チェックは表示だけ）。

const VISIBLE_AROUND = 2;

function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d}`;
}

export default function BookPlanSection({
  order,
  plan,
  completedTopicIds,
  onReplan,
  now = new Date(),
}: {
  order: BookStudyOrder;
  plan: ReferenceStudyPlan;
  completedTopicIds: string[];
  onReplan: () => void;
  now?: Date;
}) {
  const completed = new Set(completedTopicIds);
  const progress = referenceStudyPlanProgress(plan, order, completedTopicIds, now);
  const planned = new Map(plan.units.map((u) => [u.unitId, u.plannedDate]));
  const currentIndex = progress.current ? order.units.indexOf(progress.current) : order.units.length;

  const status =
    progress.current === null
      ? "参考書の範囲はすべて学び終えました。"
      : progress.deltaUnits > 0
        ? `予定より${progress.deltaUnits}単位先行しています。`
        : progress.deltaUnits < 0
          ? `予定より${-progress.deltaUnits}単位遅れています。復習を挟みつつ、少しずつ取り戻しましょう。`
          : "予定どおり進んでいます。";

  const unitRow = (unit: BookUnit, index: number) => {
    const learned = isBookUnitLearned(unit, completed);
    const isCurrent = index === currentIndex;
    const tag = unit.readingOnly
      ? "読むだけ"
      : learned
        ? "学習済み"
        : isCurrent
          ? "いまここ"
          : `${shortDate(planned.get(unit.unitId) ?? plan.startDate)}頃`;
    return (
      <li
        key={unit.unitId}
        className={`flex items-baseline justify-between gap-3 px-3 py-2 text-xs ${
          isCurrent ? "bg-brand-50" : ""
        }`}
      >
        <span className={`min-w-0 ${learned ? "text-gray-500" : "text-gray-900"} ${unit.level === "supplement" ? "italic" : ""}`}>
          {unit.label}
          {unit.topicIds.length > 0 && (
            <span className="ml-1 text-gray-400">（{unit.topicIds.length}テーマ）</span>
          )}
        </span>
        <span
          className={`shrink-0 tabular-nums ${
            isCurrent ? "font-semibold text-brand-700" : learned ? "text-emerald-700" : "text-gray-500"
          }`}
        >
          {tag}
        </span>
      </li>
    );
  };

  const near = order.units
    .map((unit, index) => ({ unit, index }))
    .filter(({ index }) => index >= currentIndex - VISIBLE_AROUND && index <= currentIndex + VISIBLE_AROUND * 2);

  return (
    <section aria-labelledby="book-plan-heading" className={cardClass("p-4")}>
      <h2 id="book-plan-heading" className="text-base font-semibold text-gray-900">
        参考書の計画
      </h2>
      <p className="mt-1 text-sm text-gray-700">{status}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        学習済み {progress.learnedUnits} / {progress.totalUnits} 単位・新しく学ぶのは {shortDate(plan.inputEndDate)} 頃までの予定（以後は過去問と総復習）
      </p>

      <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200">
        {near.map(({ unit, index }) => unitRow(unit, index))}
      </ul>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-gray-600">すべての章・節を見る</summary>
        <ul className="mt-2 max-h-96 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {order.units.map((unit, index) => unitRow(unit, index))}
        </ul>
      </details>

      <button type="button" onClick={onReplan} className={buttonClass("secondary", "sm", "mt-3")}>
        今日から予定を引き直す
      </button>
    </section>
  );
}
