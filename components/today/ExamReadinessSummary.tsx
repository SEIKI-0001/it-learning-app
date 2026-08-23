import {
  primaryImprovementLabel,
  readinessBandLabel,
  readinessScoreLabel,
} from "@/lib/examReadiness/presentation";
import type { ExamReadinessResult } from "@/types/examReadiness";

export default function ExamReadinessSummary({
  result,
}: {
  result: ExamReadinessResult | null;
}) {
  if (!result) {
    return (
      <section aria-label="今日の合格準備度" className="py-3 pl-4">
        <h2 className="text-xs text-gray-600">合格準備度</h2>
        <p className="mt-1 text-xl font-semibold text-gray-700">測定中</p>
        <p className="mt-1 text-xs text-gray-500">判定材料を集めています</p>
      </section>
    );
  }

  const improvement = primaryImprovementLabel(result.primaryImprovement, result);

  return (
    <section aria-label="今日の合格準備度" className="py-3 pl-4">
      <h2 className="text-xs text-gray-600">合格準備度</h2>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums text-gray-900">
          {readinessScoreLabel(result.score)}
        </p>
        {result.score !== null && (
          <p className="text-xs font-semibold text-brand-700">
            {readinessBandLabel(result.band)}
          </p>
        )}
      </div>
      {improvement && (
        <p className="mt-1 text-xs text-gray-600">次の一歩：{improvement}</p>
      )}
    </section>
  );
}
