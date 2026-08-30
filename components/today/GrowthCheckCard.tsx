"use client";

// `/today` から成長確認（GF-P0-003）への導線。
//
// 成長確認は「実力を上げる学習」ではなく「成長を実感させるフィードバック」なので、
// 置き場所は Primary（今日の最優先）より下の Secondary に固定する。
// 出す・出さないの判定は lib/growthCheck の evaluateGrowthCheckGate が持ち、
// ここは受け取った可否をそのまま表示するだけにする。

import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default function GrowthCheckCard({ available }: { available: boolean }) {
  if (!available) return null;

  return (
    <Link
      href="/growth-check"
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
    >
      <Icon name="check-double" className="h-5 w-5 shrink-0 text-brand-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">
          ここまでの成長をふりかえる
        </span>
        <span className="mt-0.5 block text-xs text-gray-500">
          これまでの学習記録から「以前 → 現在」を見ます
        </span>
      </span>
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-400" />
    </Link>
  );
}
