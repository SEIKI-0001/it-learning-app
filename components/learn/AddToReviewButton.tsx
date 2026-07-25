"use client";

import { useState } from "react";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { addTopicToReview } from "@/lib/study";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import Icon from "@/components/ui/Icon";

// トピック詳細の「復習対象に追加」導線(クライアントの小さな島)。
export default function AddToReviewButton({ topicId }: { topicId: string }) {
  const [state, setState] = useAppState();
  const [added, setAdded] = useState(false);

  const alreadyQueued =
    state?.progress.reviewQueue.some((r) => r.topicId === topicId) ?? false;
  const isAdded = added || alreadyQueued;

  function handleAdd() {
    if (!state || isAdded) return;
    const next = addTopicToReview(state, topicId);
    saveAppState(next);
    setState(next);
    setAdded(true);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, next.progress);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isAdded || state === null || state === undefined}
      className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-6 py-3.5 text-base font-semibold transition active:scale-[0.99] ${
        isAdded
          ? "border border-accent-200 bg-accent-50 text-accent-700"
          : "bg-accent-600 text-white hover:bg-accent-700"
      } disabled:opacity-70`}
    >
      <Icon name={isAdded ? "check" : "rotate"} className="h-4 w-4" />
      {isAdded ? "復習リストに追加済み" : "復習対象に追加する"}
    </button>
  );
}
