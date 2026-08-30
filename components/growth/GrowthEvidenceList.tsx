"use client";

// 「ここまでの成長」（GF-P0-003）。
//
// 成長確認の主役。既存の学習・復習履歴から導出した「以前 → 現在」を並べる。
// 新しく問題を出さずに成長を実感させるのが目的なので、XP・バッジ・宝箱といった
// ゲーム報酬はここに置かない。

import type { GrowthEvidence } from "@/lib/growthCheck";
import Icon, { type IconName } from "@/components/ui/Icon";

const EVIDENCE_ICONS: Record<GrowthEvidence["kind"], IconName> = {
  question_recovered: "check-double",
  topic_accuracy: "chart",
  topic_mastered: "target",
  checkpoint_span: "map",
};

export default function GrowthEvidenceList({ evidence }: { evidence: GrowthEvidence[] }) {
  if (evidence.length === 0) return null;

  return (
    <section aria-labelledby="growth-evidence-heading">
      <h2 id="growth-evidence-heading" className="text-base font-semibold text-gray-900">
        学習記録からの変化
      </h2>
      <ul className="mt-3 divide-y divide-gray-200 border-y border-gray-200">
        {evidence.map((item) => (
          <li key={item.kind} className="flex items-center justify-between gap-3 py-3">
            <span className="flex min-w-0 items-center gap-2 text-sm text-gray-800">
              <Icon
                name={EVIDENCE_ICONS[item.kind]}
                className="h-4 w-4 shrink-0 text-brand-600"
              />
              <span className="leading-snug">{item.label}</span>
            </span>
            {item.detail && (
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                {item.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
