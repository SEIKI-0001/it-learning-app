import {
  confidenceLevelLabel,
  confidenceReasonLabel,
  primaryImprovementLabel,
  readinessBandLabel,
  readinessFieldLabel,
  readinessScoreLabel,
} from "@/lib/examReadiness/presentation";
import type {
  ExamReadinessResult,
  ReadinessComponents,
  WeakTopicReason,
} from "@/types/examReadiness";

const COMPONENTS: Array<{
  key: keyof ReadinessComponents;
  label: string;
}> = [
  { key: "firstPerformance", label: "初回回答" },
  { key: "summativePerformance", label: "本番形式" },
  { key: "topicMastery", label: "トピック習熟" },
  { key: "retention", label: "定着" },
  { key: "assessmentCoverage", label: "評価範囲" },
];

const WEAK_REASON_LABELS: Record<WeakTopicReason, string> = {
  low_mastery: "習熟が不足",
  repeated_incorrect: "連続して誤答",
  unresolved_summative_error: "本番形式の誤答が未解決",
  latest_review_failed: "直近の復習で誤答",
};

function metricLabel(value: number | null): string {
  return value === null ? "未測定" : `${value}/100`;
}

export default function ExamReadinessCard({
  result,
  loading = false,
}: {
  result: ExamReadinessResult | null;
  loading?: boolean;
}) {
  if (loading && !result) {
    return (
      <section aria-label="合格準備度の詳細" className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">合格準備度を読み込んでいます</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section aria-label="合格準備度の詳細" className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">合格準備度</h2>
          <p className="text-lg font-bold text-gray-700">測定中</p>
        </div>
        <p className="mt-2 text-sm text-gray-600">判定材料を集めています</p>
      </section>
    );
  }

  const improvement = primaryImprovementLabel(result.primaryImprovement, result);

  return (
    <section aria-label="合格準備度の詳細" className="rounded-xl border border-brand-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">合格準備度</h2>
          <p className="mt-1 text-xs text-gray-600">実際の回答と定着から判定</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {readinessScoreLabel(result.score)}
          </p>
          {result.score !== null && (
            <p className="mt-0.5 text-xs font-semibold text-brand-700">
              {readinessBandLabel(result.band)}
            </p>
          )}
        </div>
      </div>

      {result.score !== null && (
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-label="合格準備度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={result.score}
        >
          <div
            className="h-full rounded-full bg-brand-600"
            style={{ width: `${result.score}%` }}
          />
        </div>
      )}

      <dl
        className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5"
        role="group"
        aria-label="準備度の構成要素"
      >
        {COMPONENTS.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
              {metricLabel(result.components[key])}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <h3 className="text-xs font-semibold text-gray-700">分野別</h3>
        <dl className="mt-2 grid gap-2 sm:grid-cols-3">
          {result.fields.map((field) => (
            <div key={field.fieldId} className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs text-gray-600">{field.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                {metricLabel(field.score)}
                <p className="mt-0.5 text-xs font-normal text-gray-500">
                  根拠 {field.evidenceSufficiency}/100
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <h3 className="text-xs font-semibold text-gray-700">
          信頼度 {result.confidence.score}/100（{confidenceLevelLabel(result.confidence.level)}）
        </h3>
        {result.confidence.reasons.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {result.confidence.reasons.map((reason, index) => (
              <li key={`${reason.code}:${reason.fieldId ?? "all"}:${index}`}>
                {confidenceReasonLabel(reason)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.calculation.appliedCaps.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="text-xs font-semibold text-gray-700">適用されたゲート</h3>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {result.calculation.appliedCaps.map((cap, index) => {
              const fieldLabel = readinessFieldLabel(cap.fieldId, result);
              return (
                <li key={`${cap.type}:${cap.fieldId ?? "all"}:${cap.cap}:${index}`}>
                  {cap.type === "field"
                    ? `${fieldLabel}の分野ゲート：上限${cap.cap}/100`
                    : `信頼度ゲート：上限${cap.cap}/100`}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {result.weakTopics.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="text-xs font-semibold text-gray-700">Weak Topics</h3>
          <ul className="mt-2 space-y-2">
            {result.weakTopics.map((topic) => (
              <li key={topic.topicId} className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium text-gray-900">{topic.label}</span>
                <span className="text-xs text-gray-500">{WEAK_REASON_LABELS[topic.reason]}</span>
                <span className={`text-xs font-semibold ${topic.penaltyApplied ? "text-accent-700" : "text-gray-500"}`}>
                  {topic.penaltyApplied ? "減点対象（上位5件）" : "参考"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {improvement && (
        <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
          次の一歩：{improvement}
        </p>
      )}
    </section>
  );
}
