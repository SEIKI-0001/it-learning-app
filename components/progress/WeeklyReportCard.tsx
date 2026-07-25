// 週間レポート。直近7日間の積み上げをコンパクトに表示する。
// データが少なくても自然に出し、責めない・「今週も少し進んだ」が伝わる文面にする。

import type { AppState } from "@/types";
import { weeklyReport } from "@/lib/weeklyReport";
import Icon from "@/components/ui/Icon";

export default function WeeklyReportCard({ state }: { state: AppState }) {
  const r = weeklyReport(state);

  // 先週比のやさしい一言(マイナスでも責めない)。
  let deltaText: string | null = null;
  if (r.deltaAnswered !== null) {
    if (r.deltaAnswered > 0) deltaText = `先週より +${r.deltaAnswered}問`;
    else if (r.deltaAnswered === 0) deltaText = "先週とおなじペース";
    else deltaText = "先週よりゆっくり。でも続いています";
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">今週のふりかえり</h2>
        <span className="text-xs text-gray-500">直近7日間</span>
      </div>

      {!r.hasData ? (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-800">
          今週はまだ記録がありません。1問からでOK。今日の小さな1歩がここに積み上がります。
        </p>
      ) : (
        <>
          <div className="mt-3 border-y border-gray-200">
            <div className="grid grid-cols-3 divide-x divide-gray-200">
              <MiniStat label="解答" value={`${r.answered}`} />
              <MiniStat label="正解" value={`${r.correct}`} />
              <MiniStat
                label="正答率"
                value={r.accuracy === null ? "—" : `${r.accuracy}%`}
              />
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-200">
              <MiniStat label="学習日" value={`${r.daysStudied}日`} />
              <MiniStat label="トピック" value={`${r.topicsTouched}`} />
              <MiniStat label="復習待ち" value={`${r.reviewWaiting}`} />
            </div>
          </div>

          {r.topMissedTag && (
            <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-800">
              よく間違えた：
              <span className="font-semibold">{r.topMissedTag.tag}</span>（
              {r.topMissedTag.count}回）。ここを復習すると伸びしろ大。
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <Icon name="circle-check" className="h-4 w-4" />
              今週も少し進みました
            </p>
            {deltaText && (
              <span className="text-xs tabular-nums text-gray-500">{deltaText}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="text-lg font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-600">{label}</p>
    </div>
  );
}
