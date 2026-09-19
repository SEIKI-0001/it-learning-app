"use client";

import Link from "next/link";
import { referenceBookProgress } from "@/lib/referenceBook";
import { useReferenceBook } from "@/lib/useReferenceBook";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

// /settings の「使用参考書」。現在の本と進捗を見せ、変更・読了の修正は /settings/reference-book へ。
// 参考書が未設定の既存ユーザーにとって、いつでも辿れる常設の設定導線でもある。
export default function ReferenceBookSummary() {
  const { book } = useReferenceBook();
  const progress = referenceBookProgress(book ?? null);
  const title = book?.title?.trim();

  return (
    <section aria-labelledby="reference-book-summary-heading">
      <h2
        id="reference-book-summary-heading"
        className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900"
      >
        <Icon name="book-open" className="h-4 w-4 text-gray-500" />使用参考書
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          {book === undefined ? (
            <p className="text-sm text-gray-500">読み込んでいます</p>
          ) : title ? (
            <>
              <p className="text-sm font-medium text-gray-900">{title}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {progress ? (
                  <>
                    参考書進捗{" "}
                    <span className="tabular-nums">{Math.round(progress.ratio * 100)}%</span>
                  </>
                ) : (
                  "章立てが未登録です"
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              未設定です。設定すると、毎日読む場所を案内できます。
            </p>
          )}
        </div>
        <Link href="/settings/reference-book" className={buttonClass("secondary", "sm")}>
          {title ? "変更する" : "設定する"}
        </Link>
      </div>
    </section>
  );
}
