"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReferenceBook } from "@/types/referenceBook";

// 参考書が未設定（または章立てが未登録）の既存ユーザーへの設定導線。
// オンボーディングを通らない既存ユーザー向け。「あとで」で一定期間出さない。
// /settings と /plan には常設の導線があるので、ここは控えめな1回きりの案内でよい。

const DISMISS_KEY = "fequest:referenceBookNudgeDismissedAt";
/** 「あとで」を押してから再表示するまでの日数。 */
export const NUDGE_SNOOZE_DAYS = 30;

export function isNudgeSnoozed(now: Date = new Date()): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Date.parse(raw);
    if (Number.isNaN(at)) return false;
    return now.getTime() - at < NUDGE_SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function snoozeNudge(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  } catch {
    /* 保存できなくても今回は閉じる */
  }
}

export default function ReferenceBookNudge({
  book,
}: {
  /** undefined = 読み込み中（出さない） */
  book: ReferenceBook | null | undefined;
}) {
  const [visible, setVisible] = useState(false);
  const needsSetup =
    book !== undefined && (!book || book.chapters.length === 0);

  useEffect(() => {
    function init() {
      setVisible(needsSetup && !isNudgeSnoozed());
    }
    init();
  }, [needsSetup]);

  if (!visible) return null;

  const title = book?.title?.trim();
  return (
    <div
      data-testid="reference-book-nudge"
      className="mt-3 border-t border-gray-100 pt-3"
    >
      <p className="text-xs leading-relaxed text-gray-700">
        {title
          ? `「${title}」の章立てを登録すると、毎日読む場所を案内できます。`
          : "使っている参考書を設定すると、毎日読む場所を案内できます。"}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Link
          href="/settings/reference-book"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
        >
          参考書を設定する
        </Link>
        <button
          type="button"
          onClick={() => {
            snoozeNudge();
            setVisible(false);
          }}
          className="text-xs text-gray-600 underline underline-offset-2"
        >
          あとで
        </button>
      </div>
    </div>
  );
}
