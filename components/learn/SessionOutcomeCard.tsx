"use client";

// 学習完了直後の成果差分（GF-P0-005）。
//
// 完了パネルの中で、XP・ストリークより「上」に置く。要件書 §9.2 の順位は
//   1. 学習成果 → 2. 合格への意味 → 3. 進行 → 4. ゲーム報酬
// で、並び自体は lib/sessionOutcome.ts が保証している。ここは表示だけを担う。

import type { SessionOutcome } from "@/types/gameful";
import Icon, { type IconName } from "@/components/ui/Icon";

const OUTCOME_ICONS: Record<SessionOutcome["kind"], IconName> = {
  revenge: "check-double",
  mastery: "chart",
  review_cleared: "rotate",
  weak_resolved: "target",
  readiness: "chart",
  checkpoint: "award",
  measurement: "chart",
};

export default function SessionOutcomeCard({ outcomes }: { outcomes: SessionOutcome[] }) {
  if (outcomes.length === 0) return null;

  return (
    <section aria-labelledby="session-outcome-heading" className="mt-4 text-left">
      <h3 id="session-outcome-heading" className="text-xs font-semibold text-emerald-800">
        今回の変化
      </h3>
      <ul className="mt-1.5 divide-y divide-emerald-200/70 border-y border-emerald-200/70">
        {outcomes.map((outcome) => (
          <li key={outcome.kind} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-emerald-900">
              <Icon
                name={OUTCOME_ICONS[outcome.kind]}
                className="h-3.5 w-3.5 shrink-0 text-emerald-700"
              />
              <span className="truncate">{outcome.label}</span>
            </span>
            {outcome.detail && (
              <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-800">
                {outcome.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
