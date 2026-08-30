"use client";

// `/today` から成長確認チャレンジ（GF-P0-003）への導線。
//
// 置き場所は Primary（今日の最優先）より下の Secondary。今日やるべき学習の
// 導線を上書きしない。比較材料が無いユーザーには何も出さない。

import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default function GrowthCheckCard({ questionCount }: { questionCount: number }) {
  if (questionCount <= 0) return null;

  return (
    <Link
      href="/growth-check"
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
    >
      <Icon name="check-double" className="h-5 w-5 shrink-0 text-brand-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">
          成長確認：以前つまずいた{questionCount}問
        </span>
        <span className="mt-0.5 block text-xs text-gray-500">
          当時むずかしかった問題を解き直して、前回とくらべます
        </span>
      </span>
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-400" />
    </Link>
  );
}
