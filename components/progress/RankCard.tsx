// ランクカード。現在のランクを強調し、最高ランクまでの一覧と次ランクまでの必要EXPを見せる。
// 他人比較ではなく、本人の成長段階を確認するための表示。

import { getRankStatus, RANKS } from "@/lib/rank";

export default function RankCard({ exp }: { exp: number }) {
  const status = getRankStatus(exp);
  const { current, next, index, isMax, remaining, ratio } = status;

  return (
    <section className="rounded-xl bg-white p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">ランク</h2>
        <span className="text-xs font-bold text-gray-400">累計 {Math.max(0, exp)} XP</span>
      </div>

      {/* 現在のランクを強調 */}
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
        <span className="text-3xl" aria-hidden>
          {current.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-400">
            いまのランク
          </p>
          <p className="text-lg font-bold leading-tight text-brand-700">
            {current.name}
          </p>
        </div>
      </div>

      {/* 次ランクまでの進捗 */}
      <div className="mt-3">
        {isMax ? (
          <p className="text-center text-sm font-bold text-amber-600">
            👑 最高ランクに到達！ここまでの積み上げ、お見事です。
          </p>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-500">
                次は {next!.emoji} {next!.name}
              </span>
              <span className="font-bold text-brand-600">あと {remaining} XP</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* 全ランク一覧(最低→最高)。現在を強調、到達済みは通常、未到達は控えめ。 */}
      <ul className="mt-4 space-y-1.5">
        {RANKS.map((r, i) => {
          const isCurrent = i === index;
          const reached = i <= index;
          return (
            <li
              key={r.id}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${
                isCurrent
                  ? "bg-brand-600 font-bold text-white"
                  : reached
                    ? "text-gray-700"
                    : "text-gray-400"
              }`}
            >
              <span aria-hidden>{r.emoji}</span>
              <span className="flex-1 truncate">{r.name}</span>
              <span
                className={`text-xs ${isCurrent ? "text-white/80" : "text-gray-400"}`}
              >
                {r.minExp} XP
                {reached && !isCurrent && " ✓"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
