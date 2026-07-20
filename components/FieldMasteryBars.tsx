import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";

// 3分野（テクノロジ/マネジメント/ストラテジ）の習熟度バー。表示専用。
// 分野の区別はラベルで示し、バーの色は揃える(装飾目的の多色使いをしない)。
const ORDER: TopicField[] = ["strategy", "management", "technology"];

export default function FieldMasteryBars({
  mastery,
}: {
  mastery: Record<TopicField, number>;
}) {
  return (
    <div className="space-y-3">
      {ORDER.map((field) => {
        const value = Math.min(100, Math.max(0, mastery[field] ?? 0));
        return (
          <div key={field}>
            <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
              <span>{FIELD_LABELS[field]}</span>
              <span className="tabular-nums text-gray-500">{value}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
