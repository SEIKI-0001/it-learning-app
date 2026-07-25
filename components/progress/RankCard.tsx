// ランクカード。ランクの段階そのものが中身なので、はしご状の一覧を主役にする。
// 現在地の1行だけを強調ブロック(brand-50 + 左線)にし、到達済み・未到達は控えめに置く。
// 他人比較ではなく、本人の成長段階を確認するための表示。

import { getRankStatus, RANKS } from "@/lib/rank";
import Icon from "@/components/ui/Icon";

export default function RankCard({ exp }: { exp: number }) {
  const status = getRankStatus(exp);
  const { next, index, isMax, remaining, ratio } = status;
  const pct = Math.round(ratio * 100);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">ランク</h2>
        <span className="text-xs tabular-nums text-gray-500">
          累計 {Math.max(0, exp)} XP
        </span>
      </div>

      {/* 次ランクまでの進捗 */}
      <div className="mt-3">
        {isMax ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Icon name="award" className="h-4 w-4" />
            最高ランクに到達。ここまでの積み上げ、お見事です。
          </p>
        ) : (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="text-gray-600">次は {next!.name}</span>
              <span className="font-semibold tabular-nums text-brand-700">
                あと {remaining} XP
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label={`${next!.name}までの進捗`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* 全ランク一覧(最低→最高)。現在地だけを強調し、到達済みは達成色で示す。 */}
      <ul className="mt-4 space-y-1">
        {RANKS.map((r, i) => {
          const isCurrent = i === index;
          const reached = i < index;
          return (
            <li
              key={r.id}
              className={
                isCurrent
                  ? "flex items-center gap-2.5 rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 px-3 py-2.5"
                  : "flex items-center gap-2.5 px-3 py-1.5"
              }
              aria-current={isCurrent ? "step" : undefined}
            >
              <Icon
                name={r.icon}
                className={`h-4 w-4 shrink-0 ${
                  isCurrent
                    ? "text-brand-500"
                    : reached
                      ? "text-emerald-600"
                      : "text-gray-400"
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {isCurrent ? (
                  <>
                    <span className="block text-xs font-semibold text-brand-700">
                      いまのランク
                    </span>
                    <span className="block font-semibold text-gray-900">
                      {r.name}
                    </span>
                  </>
                ) : (
                  <span className={reached ? "text-gray-700" : "text-gray-500"}>
                    {r.name}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-gray-500">
                {r.minExp} XP
              </span>
              {reached && (
                <Icon
                  name="check"
                  label="到達済み"
                  className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
