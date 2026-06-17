"use client";

import { useEffect } from "react";

export function StudySessionMarker({ topicId, userId }: { topicId: string; userId: string }) {
  useEffect(() => {
    const key = `study-session:${userId}:${topicId}:${new Date().toISOString().slice(0, 10)}`;
    if (window.sessionStorage.getItem(key)) {
      return;
    }

    window.sessionStorage.setItem(key, "1");
    void fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, userId })
    });
  }, [topicId, userId]);

  return null;
}
