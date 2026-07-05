"use client";

import { useEffect, useState } from "react";
import { getUserId, refreshIntegratedStatus } from "@/lib/userSession";
import {
  focusHintMessage,
  type IntegratedLearningStatus,
} from "@/types/integratedStatus";

// /today 上部の短い案内。統合進捗の推奨配分から「今日は何を優先すればよいか」を一言で示す。
// 日次メニュー生成には手を入れず、あくまで表示補助（未ログイン・未設定・失敗なら非表示）。
export default function TodayFocusHint() {
  const [status, setStatus] = useState<IntegratedLearningStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const userId = getUserId();
    if (!userId) return;
    void refreshIntegratedStatus(userId).then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!status) return null;

  const hint = focusHintMessage(status.recommendedFocus);

  return (
    <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
      <p className="text-xs font-bold text-amber-600">🧭 今日のおすすめ</p>
      <p className="mt-0.5 text-sm font-semibold text-amber-800">{hint}</p>
    </div>
  );
}
