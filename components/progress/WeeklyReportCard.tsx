// 週間レポート。直近7日間の積み上げをコンパクトに表示する。
// データが少なくても自然に出し、責めない・「今週も少し進んだ」が伝わる文面にする。

import type { AppState } from "@/types";
import { weeklyReport } from "@/lib/weeklyReport";

export default function WeeklyReportCard({ state }: { state: AppState }) {
  const r = weeklyReport(state);

  // 先週比のやさしい一言(マイナスでも責めない)。
  let deltaText: string | null = null;
  if (r.deltaAnswered !== null) {
    if (r.deltaAnswered > 0) deltaText = `先週より +${r.deltaAnswered}問 ⬆️`;
    else if (r.deltaAnswered === 0) deltaText = "先週とおなじペース";
    else deltaText = "先週よりゆっくり。でも続いています";
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-gray-800">今週のふりかえり</h2>
        <span className="text-xs font-semibold text-gray-400">直近7日間</span>
      </div>

      {!r.hasData ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          今週はまだ記録がありません。1問からでOK。今日の小さな1歩がここに積み上がります。
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="解答" value={`${r.answered}`} />
            <MiniStat label="正解" value={`${r.correct}`} />
            <MiniStat
              label="正答率"
              value={r.accuracy === null ? "—" : `${r.accuracy}%`}
            />
            <MiniStat label="学習日" value={`${r.daysStudied}日`} />
            <MiniStat label="トピック" value={`${r.topicsTouched}`} />
            <MiniStat label="復習待ち" value={`${r.reviewWaiting}`} />
          </div>

          {r.topMissedTag && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              よく間違えた：<span className="font-bold">{r.topMissedTag.tag}</span>（
              {r.topMissedTag.count}回）。ここを復習すると伸びしろ大。
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm font-bold text-emerald-600">
              今週も少し進みました 🎉
            </p>
            {deltaText && (
              <span className="text-xs font-semibold text-gray-500">{deltaText}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2.5 text-center ring-1 ring-gray-100">
      <p className="text-lg font-extrabold text-gray-800">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
