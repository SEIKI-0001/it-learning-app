"use client";

import { useAppState } from "@/lib/useAppState";
import { getLessonStatus } from "@/lib/learningCatalog";
import type { LessonStatus } from "@/types/learningCatalog";

// レッスン見出しの1行目に出す学習状態。進捗は localStorage / DB 由来で
// クライアントにしか無いため、サーバーで描く見出しから小さく切り出している。
// 読み取り専用で、完了判定（getLessonStatus）そのものには手を入れない。
const STATUS_LABEL: Partial<
  Record<LessonStatus, { label: string; className: string }>
> = {
  completed: { label: "完了済み", className: "text-emerald-700" },
  review_due: { label: "復習対象", className: "text-accent-700" },
  in_progress: { label: "学習中", className: "text-brand-700" },
};

export default function LessonStatusBadge({ lessonId }: { lessonId: string }) {
  const [state] = useAppState();
  if (!state) return null;

  const status = STATUS_LABEL[getLessonStatus(lessonId, state.progress)];
  if (!status) return null;

  return (
    <span className={`ml-auto shrink-0 pl-2 font-medium ${status.className}`}>
      {status.label}
    </span>
  );
}
