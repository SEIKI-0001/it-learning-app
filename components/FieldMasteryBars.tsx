import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";

// 3分野（テクノロジ/マネジメント/ストラテジ）の習熟度バー。表示専用。
const FIELD_COLOR: Record<TopicField, string> = {
  technology: "from-sky-400 to-indigo-500",
  management: "from-emerald-400 to-teal-500",
  strategy: "from-amber-400 to-orange-500",
};

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
            <div className="mb-1 flex items-center justify-between text-sm font-semibold text-gray-700">
              <span>{FIELD_LABELS[field]}</span>
              <span className="text-gray-400">{value}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${FIELD_COLOR[field]} transition-all duration-500`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
