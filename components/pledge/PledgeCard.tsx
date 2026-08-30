"use client";

// 合格宣言（GF-P1-010）。
//
// 任意。宣言してもしなくても、合格準備度・報酬・機能アクセスは一切変わらない。
// 未達を責める表現を使わず、いつでも取り消せることを画面に明示する。

import type { AppState, UserProfile } from "@/types";
import { buildPledgeSummary, makePledge, releasePledge } from "@/lib/pledge";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

function formatDate(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export default function PledgeCard({
  state,
  profile,
  onChange,
}: {
  state: AppState;
  profile: UserProfile | undefined;
  onChange: (next: AppState) => void;
}) {
  const summary = buildPledgeSummary(state, profile);

  if (!summary) {
    return (
      <section
        aria-labelledby="pledge-heading"
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <h2 id="pledge-heading" className="text-sm font-semibold text-gray-900">
          合格を宣言する（任意）
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          自分に向けた意思表示です。宣言してもしなくても、学習の進みも受け取れるものも
          変わりません。いつでも取り消せます。
        </p>
        <button
          type="button"
          onClick={() => onChange(makePledge(state, new Date(), profile?.examDate))}
          className={buttonClass("secondary", "md", "mt-3")}
        >
          合格すると宣言する
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="pledge-heading"
      className="rounded-xl border border-brand-200 bg-brand-50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="pledge-heading" className="flex items-center gap-1.5 text-sm font-semibold text-brand-800">
            <Icon name="target" className="h-4 w-4 shrink-0" />
            合格を宣言しています
          </h2>
          <p className="mt-1 text-xs tabular-nums text-brand-700">
            {formatDate(summary.pledgedAt)} に宣言・{summary.daysSincePledge}日経過
            {summary.daysUntilExam !== null && `・試験まであと${summary.daysUntilExam}日`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(releasePledge(state))}
        className="mt-3 text-xs text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
      >
        宣言を取り消す
      </button>
    </section>
  );
}
