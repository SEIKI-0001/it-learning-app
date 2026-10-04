"use client";

import { useEffect, useState } from "react";
import type { CheckPackResultStatus } from "@/types/checkPack";
import type { CheckPackHistoryEntry } from "@/lib/checkPackHistorySummary";
import {
  fetchCheckPackHistory,
  loadLocalCheckPackHistory,
} from "@/lib/checkPackHistory";

// 確認パックを「解き終えたことがあるか・前回どうだったか」を見返すための表示部品。
// 端末の記録で即時に出し、サーバの記録が取れたら合わせて差し替える。

const SHORT_STATUS: Record<CheckPackResultStatus, string> = {
  passed: "本番対応OK",
  review_needed: "要復習",
  weak: "重点復習",
  incomplete: "途中まで実施",
};

const STATUS_TONE: Record<CheckPackResultStatus, string> = {
  passed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  review_needed: "bg-accent-50 text-accent-700 ring-accent-200",
  weak: "bg-rose-50 text-rose-700 ring-rose-200",
  incomplete: "bg-gray-50 text-gray-700 ring-gray-200",
};

/** 「10月3日」形式（端末のタイムゾーン）。 */
export function formatCheckPackDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * トピックの確認パック履歴。
 * undefined = 読み込み前 / null = まだ解き終えたことがない。
 */
export function useCheckPackHistory(topicId: string): CheckPackHistoryEntry | null | undefined {
  const [entry, setEntry] = useState<CheckPackHistoryEntry | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    function init() {
      setEntry(loadLocalCheckPackHistory(topicId));
    }
    init();
    void fetchCheckPackHistory(topicId).then((merged) => {
      if (alive) setEntry(merged);
    });
    return () => {
      alive = false;
    };
  }, [topicId]);

  return entry;
}

/** 「前回 10月3日・本番対応OK（2回実施）」の1行。未実施なら「まだ受けていません」。 */
export function CheckPackHistoryLine({
  entry,
  className = "",
}: {
  entry: CheckPackHistoryEntry | null | undefined;
  className?: string;
}) {
  if (entry === undefined) return null;
  if (entry === null) {
    return <p className={`text-xs text-gray-500 ${className}`}>まだ受けていません</p>;
  }
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600 ${className}`}>
      <span>
        前回 {formatCheckPackDate(entry.lastCompletedAt)}に実施
        {entry.count > 1 && `（${entry.count}回目）`}
      </span>
      <StatusChip status={entry.lastResultStatus} />
    </p>
  );
}

function StatusChip({ status }: { status: CheckPackResultStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_TONE[status]}`}
    >
      {SHORT_STATUS[status]}
    </span>
  );
}

/** パックの開始画面に出す「前回の結果」。未実施なら何も出さない。 */
export function CheckPackPreviousResult({ entry }: { entry: CheckPackHistoryEntry }) {
  return (
    <section
      aria-label="前回の結果"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500">
          前回の結果（{formatCheckPackDate(entry.lastCompletedAt)}
          {entry.count > 1 ? `・これまで${entry.count}回` : ""}）
        </p>
        <StatusChip status={entry.lastResultStatus} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <PrevRate label="確認問題" rate={entry.quizRate} />
        <PrevRate label="関連用語" rate={entry.flashcardRate} />
        <PrevRate label="過去問レベル" rate={entry.examLevelRate} />
      </dl>
      {entry.everPassed && entry.lastResultStatus !== "passed" && (
        <p className="mt-3 text-xs text-gray-500">以前に本番対応OKを取ったことがあります。</p>
      )}
    </section>
  );
}

function PrevRate({ label, rate }: { label: string; rate: number | null }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-2">
      <dt className="text-[11px] font-semibold text-gray-500">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-gray-800">
        {rate == null ? "—" : `${rate}%`}
      </dd>
    </div>
  );
}
