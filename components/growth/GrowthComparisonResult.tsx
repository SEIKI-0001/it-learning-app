"use client";

// 成長確認チャレンジの結果（GF-P0-003）。
// 「前回 → 今回」を必ず明示する。過去の自分との比較が唯一の主役なので、
// XP・バッジ・宝箱といったゲーム報酬はここに置かない。

import type { GrowthComparison } from "@/lib/growthChallenge";
import Icon from "@/components/ui/Icon";

export default function GrowthComparisonResult({
  comparison,
}: {
  comparison: GrowthComparison;
}) {
  const { rows, total, previousCorrectCount, currentCorrectCount, improvedCount } = comparison;

  return (
    <section aria-labelledby="growth-result-heading">
      <h2 id="growth-result-heading" className="text-base font-semibold text-gray-900">
        前回とのくらべ
      </h2>

      <dl className="mt-3 grid grid-cols-2 divide-x divide-gray-200 border-y border-gray-200">
        <div className="py-3 pr-4">
          <dt className="text-xs text-gray-600">前回の正解</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-500">
            {previousCorrectCount}
            <span className="ml-0.5 text-sm font-normal text-gray-500">/{total}</span>
          </dd>
        </div>
        <div className="py-3 pl-4">
          <dt className="text-xs text-gray-600">今回の正解</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
            {currentCorrectCount}
            <span className="ml-0.5 text-sm font-normal text-gray-500">/{total}</span>
          </dd>
        </div>
      </dl>

      {improvedCount > 0 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
          <Icon name="check-double" className="h-4 w-4 shrink-0 text-emerald-700" />
          前回まちがえた問題のうち{improvedCount}問に正解できました
        </p>
      )}

      <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
        {rows.map((row) => (
          <li key={row.questionId} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 truncate text-sm text-gray-700">{row.topicTitle}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-sm">
              <ResultMark correct={row.previousCorrect} muted />
              <span className="text-gray-400" aria-hidden>
                →
              </span>
              <ResultMark correct={row.currentCorrect} />
              <span className="sr-only">
                前回{row.previousCorrect ? "正解" : "不正解"}、今回
                {row.currentCorrect ? "正解" : "不正解"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 正誤は色だけでなくアイコン形状でも区別する（色覚に依存させない）。 */
function ResultMark({ correct, muted = false }: { correct: boolean; muted?: boolean }) {
  return (
    <Icon
      name={correct ? "circle-check" : "x"}
      aria-hidden
      className={`h-4 w-4 ${
        muted ? "text-gray-400" : correct ? "text-emerald-600" : "text-gray-500"
      }`}
    />
  );
}
