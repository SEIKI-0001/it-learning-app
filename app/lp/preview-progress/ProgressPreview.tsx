"use client";

import { useState } from "react";
import ProgressPage from "@/app/progress/page";
import { seedPreviewData } from "@/app/lp/preview/_lib/seed";

// テスト環境での確認用（main へ入れる前に削除）。/lp/preview/progress と同じ表示。
export default function ProgressPreview() {
  // 子（/progress）の effect が localStorage を読む前に、最初の描画で一度だけ書き込む。
  useState(() => {
    if (typeof window !== "undefined") seedPreviewData();
    return true;
  });
  return <ProgressPage />;
}
